# Interview Notes — Network Service Health Monitor

These notes explain the key technical decisions in this project in plain, interview-ready language. Every answer is grounded in what was actually built.

---

## 1. Why React?

React is the right choice here because the dashboard has a lot of **state that changes over time** — service statuses update, new check results come in, incidents open and resolve. React's component model makes it natural to break the UI into small, reusable pieces (`StatusBadge`, `ServiceTable`, `MonitoringHistory`) and re-render only what changed, rather than rebuilding the whole page.

React Router handles navigation between Dashboard, Services, Service Details, and Incidents without a full page reload, which gives a faster user experience.

Alternative considered: plain HTML + fetch. That would work for a simpler app, but as soon as you have shared state (the current user, live service data) you end up reinventing what React already provides.

---

## 2. Why Node.js?

The backend is mostly I/O-bound: it makes HTTP requests to external services, reads and writes to MongoDB, and handles API calls from the frontend. Node.js is well-suited for this because its **event loop handles many concurrent I/O operations efficiently without spawning new threads for each one**.

It also lets me write JavaScript on both sides of the stack, which reduces context-switching and makes sharing validation logic easier.

Alternative considered: Python/Flask. Equally valid — Flask is clean and readable. I chose Node because the job description emphasizes JavaScript/Node, and using one language across the stack is a real practical advantage.

---

## 3. Why Express?

Express is a minimal, unopinionated HTTP framework. For this project I needed:
- Routing
- Middleware (auth, rate limiting, error handling, validation)
- JSON body parsing

Express does all of that with almost no boilerplate. I didn't need the structure of a full framework like NestJS because this is a small application. Adding NestJS decorators and modules would be over-engineering for this scope.

---

## 4. Why MongoDB?

The monitoring data is naturally document-shaped:
- Each `MonitoringResult` is a snapshot: status, response time, HTTP code, timestamp
- Services have nested statistics that are updated on every check
- The schema evolves easily — I added `consecutiveFailures` without a migration

MongoDB fits well because monitoring results are **written frequently and read in time-ordered ranges**. I can query "the last 50 results for service X" with a simple sort + limit, and MongoDB's document model stores the full result as one unit.

Mongoose adds schema validation and type casting on top of the raw driver.

Alternative considered: PostgreSQL. Perfectly valid — relational works fine here too. The schema is simple enough that SQL wouldn't be painful. MongoDB was chosen because the document model is intuitive for the monitoring result shape and requires less ceremony for a project at this scale.

---

## 5. Why JWT?

JWTs are **stateless** — the server doesn't need to store session data anywhere. The token carries the user ID and role, and the server verifies the signature on every request using the secret. For this application that's ideal because:

- No session store needed (no Redis, no DB session table)
- The frontend just stores the token in `localStorage` and sends it as a header
- It scales horizontally without shared session state

The token payload contains `{ id }` only — never the password, never sensitive fields.

Alternative considered: express-session with a cookie. That's simpler to reason about in some ways, but requires server-side session storage and is more complex to handle across origins.

---

## 6. Authentication vs Authorization

**Authentication** answers: *Who are you?* — verified by the JWT in the `protect` middleware.

**Authorization** answers: *Are you allowed to do this?* — verified by ownership checks in each controller and the `adminOnly` middleware.

Example:
- `protect` middleware reads the JWT, finds the user → **authentication**
- `serviceController.getService` checks `service.userId === req.user._id` → **authorization**
- `adminOnly` middleware checks `req.user.role === 'admin'` → **authorization**

These are always separate steps. A valid JWT proves who you are; it does not automatically grant access to any resource.

---

## 7. How does a health check work?

1. The URL is validated against the SSRF block list
2. A timer starts: `const startTime = Date.now()`
3. Axios sends a `GET` request with a 5-second timeout and `validateStatus: () => true` (so Axios doesn't throw on 4xx/5xx — we want to record those)
4. The timer stops when the response arrives: `responseTime = Date.now() - startTime`
5. The HTTP status and response time are passed to `classifyStatus()` which returns `HEALTHY`, `DEGRADED`, or `DOWN`
6. A `MonitoringResult` document is saved to MongoDB
7. The `Service` document is updated: `totalChecks++`, `lastCheckedAt`, `consecutiveFailures`
8. `incidentService.handleCheckResult()` is called to create or resolve incidents

The whole thing is `async/await` — no callbacks, no callback hell.

---

## 8. How do you measure response time?

```js
const startTime = Date.now();
const response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
const responseTime = Date.now() - startTime;
```

`Date.now()` returns milliseconds since the Unix epoch. The difference is the wall-clock time from when the request was sent to when the response was fully received.

This is a practical measurement, not a network-layer ping. It includes DNS resolution, TCP handshake, TLS handshake, server processing time, and data transfer. That's intentional — it reflects what the end user would experience.

---

## 9. How does timeout handling work?

Axios accepts a `timeout` option in milliseconds. If the server doesn't respond within that time, Axios rejects the promise with an error where `err.code === 'ECONNABORTED'`.

```js
try {
  const response = await axios.get(url, { timeout: 5000, validateStatus: () => true });
} catch (err) {
  if (err.code === 'ECONNABORTED') {
    errorMessage = `Request timed out after 5000ms`;
    status = 'DOWN';
  }
}
```

The timeout is configurable via `HEALTH_CHECK_TIMEOUT_MS` in the environment. This is important because a check that hangs forever would block the scheduler from checking other services.

---

## 10. What happens when a service returns HTTP 500?

- The check **succeeds at the network level** — TCP connected, HTTP response received
- `httpStatusCode = 500`
- `classifyStatus(500, responseTime)` returns `'DOWN'`
- `consecutiveFailures` increments
- A `MonitoringResult` is saved with `status: 'DOWN'` and `httpStatusCode: 500`
- After 3 consecutive failures, an incident is created

The distinction matters: we received a response, so the server is running. It returned 500, which means the application layer has a bug or is in an error state.

---

## 11. What happens when a service returns HTTP 404?

- `httpStatusCode = 404`
- `classifyStatus(404, responseTime)` returns `'HEALTHY'` (or `'DEGRADED'` if slow)
- `consecutiveFailures` resets to 0
- `successfulChecks` increments

The service is **reachable**. 404 means "connected successfully but the resource doesn't exist at that path." That's an application-level issue, not a network failure. The server is up and responding. We store the 404 so the user can see it, but we don't treat it as the service being down.

---

## 12. Why isn't every 4xx considered a network failure?

HTTP status codes have two layers:
- **Network layer** — did we connect and get a response? If yes, the server is running.
- **Application layer** — was the request semantically correct?

4xx codes are **application-layer errors** — they mean the request was received and understood, but the server rejected it (bad request, unauthorized, not found, etc.). The network was fine.

5xx codes are **server-side errors** — the server received the request but failed to process it. The service itself is broken.

If we treated 401 or 403 as DOWN, a monitoring endpoint protected by auth would always show as DOWN even though the server is perfectly healthy.

---

## 13. How does consecutive failure detection work?

The `consecutiveFailures` counter on the `Service` document:

```js
if (status === 'HEALTHY' || status === 'DEGRADED') {
  service.consecutiveFailures = 0;   // reset on any success
} else {
  service.consecutiveFailures += 1;  // increment on failure
}
```

After saving the service, `incidentService.handleCheckResult()` checks:

```js
if (service.consecutiveFailures >= 3) {
  // create incident if none already open
}
```

The threshold of 3 prevents a single transient blip from creating an incident. A service needs to fail three checks in a row to trigger an alert.

---

## 14. How are duplicate incidents prevented?

Before creating an incident, the service queries for an existing open one:

```js
const existingOpen = await Incident.findOne({
  serviceId: service._id,
  status: 'OPEN',
});

if (!existingOpen) {
  await Incident.create({ ... });
} else {
  existingOpen.failureCount = service.consecutiveFailures;
  await existingOpen.save();
}
```

This is a **check-then-act** pattern. There's an implicit race condition if two health checks ran simultaneously for the same service, but since the scheduler runs checks with `Promise.allSettled` and each service is checked once per run, this is not a real issue at this scale. In a high-scale system you'd use a database transaction or an atomic upsert.

---

## 15. How does the monitoring scheduler work?

`node-cron` accepts a standard cron expression and calls a function on that schedule:

```js
cron.schedule('*/5 * * * *', async () => {
  await runAllHealthChecks();
});
```

`runAllHealthChecks()` fetches all services from MongoDB and calls `runHealthCheck()` for each one using `Promise.allSettled()`. `allSettled` is used instead of `Promise.all()` so that a failure on one service doesn't cancel the checks for all others.

The interval is configured via `MONITOR_INTERVAL_MINUTES`. On startup, `server.js` calls `startScheduler()` after the database connects.

---

## 16. How is SSRF prevented?

SSRF (Server-Side Request Forgery) is when an attacker tricks the server into making requests to internal systems by entering a URL like `http://localhost:27017` or `http://192.168.1.1/admin`.

The `urlValidator.js` module blocks:
- Protocols other than HTTP/HTTPS
- `localhost` hostname
- IPv4 loopback `127.x.x.x`
- Private ranges `10.x`, `172.16-31.x`, `192.168.x`
- Link-local `169.254.x.x` (AWS metadata endpoint lives here)
- `0.0.0.0`
- IPv6 loopback, private, and link-local ranges

Every URL is validated before the HTTP request is made. Invalid URLs return a 400 with `errorCode: 'INVALID_URL'`.

**Known limitation documented in README:** We validate the hostname as written, but we do not resolve DNS. A DNS rebinding attack could register `evil.com` pointing to `192.168.1.1`. Full protection requires resolving the hostname and re-validating the resulting IP address.

---

## 17. How do you protect APIs?

Multiple layers:

1. **Authentication** — `protect` middleware on every route that requires login
2. **Authorization** — ownership checks in each controller (`service.userId === req.user._id`)
3. **Input validation** — `express-validator` chains on every endpoint; invalid input returns 422 with details
4. **Rate limiting** — prevents brute-force on login and abuse of the check-now endpoint
5. **Helmet** — HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, etc.)
6. **Error handling** — stack traces and internal details never sent to clients
7. **SSRF protection** — URL validation before any outgoing HTTP request

---

## 18. How would you improve reliability?

With more time I'd add:

- **Retry logic** — retry a failed check once before counting it as a failure (reduces false positives from transient issues)
- **DNS resolution in SSRF check** — resolve the hostname and re-validate the IP
- **Notification system** — email or webhook when an incident is created
- **Dead-man switch** — alert if the monitoring scheduler itself stops running
- **Monitoring history TTL index** — auto-expire old results (e.g., keep only 30 days) so the DB doesn't grow unbounded
- **Circuit breaker** — stop checking a service that has been DOWN for hours, to avoid hammering it; resume with exponential backoff

---

## 19. How would you scale this system?

The current design is a single-server monolith. For higher scale:

- Move the scheduler to a separate worker process so health checks don't block API requests
- Add a job queue (Bull + Redis) to distribute health checks across multiple workers
- Add read replicas for MongoDB to separate write-heavy check results from dashboard reads
- Cache the dashboard summary in Redis with a short TTL (5–10 seconds) so every page refresh doesn't hit MongoDB
- Put the API behind a load balancer with horizontal scaling — JWT is stateless so any instance can verify any token

For this project's scope (a portfolio demo), none of that is needed. The scheduler uses `Promise.allSettled` to run all checks in parallel, which handles tens of services comfortably on a single server.

---

## 20. What happens if MongoDB becomes unavailable?

- The Express API will return 500 errors on any endpoint that requires a database call
- The scheduler will log an error but will not crash — the `runAllHealthChecks()` error is caught in the scheduler's try/catch
- On reconnect, Mongoose automatically reconnects (it manages an internal connection pool)
- Check results during the outage are lost — there is no offline buffer

For production I'd add health check output to a local file or a separate lightweight store as a buffer, and replay it when the DB recovers. That level of durability is out of scope for this project.

---

## 21. What happens if the monitored service is slow?

- Response time exceeds `SLOW_RESPONSE_THRESHOLD_MS` (default 2000ms)
- `classifyStatus()` returns `'DEGRADED'`
- `successfulChecks` increments (it still responded)
- `consecutiveFailures` resets to 0 (DEGRADED is treated as a successful response)
- A DEGRADED status is shown in orange in the dashboard
- No incident is created for DEGRADED — it's a warning, not a failure

If the service is so slow that it exceeds `HEALTH_CHECK_TIMEOUT_MS` (5000ms), the request times out and the status becomes `DOWN`.

---

## 22. What security vulnerabilities could exist?

**Known and accepted for this scope:**

- **DNS rebinding** — SSRF validation doesn't resolve DNS (documented)
- **localStorage JWT** — susceptible to XSS. `httpOnly` cookie would be more secure, but adds CSRF complexity. For a portfolio project, localStorage is a reasonable tradeoff.
- **No HTTPS in dev** — the dev server runs on HTTP. In production you'd terminate TLS at a reverse proxy (nginx/Caddy)

**Mitigated:**

- SQL/NoSQL injection — Mongoose parameterizes queries; express-validator sanitizes input
- Brute force — rate limiting on auth endpoints
- Clickjacking — Helmet sets `X-Frame-Options`
- MIME sniffing — Helmet sets `X-Content-Type-Options: nosniff`
- Password exposure — bcrypt hashing, `select: false` on the password field, never in JWT

---

## 23. How would you test the system?

**Automated (already in the project):**
- Unit tests for `classifyStatus()` — pure function, easy to test all branches
- Unit tests for `validateUrl()` — covers all SSRF block rules
- Integration tests with Supertest — test full HTTP request/response cycle against a real in-memory test DB
- Incident logic tests — directly test the service functions against a test DB

**Manual testing:**
- Add `https://www.google.com` — expect HEALTHY, HTTP 200
- Add `https://httpstat.us/500` — expect DOWN, HTTP 500
- Add `https://httpstat.us/404` — expect HEALTHY, HTTP 404 (server is up)
- Add `https://httpstat.us/200?sleep=3000` — expect DEGRADED (3000ms > 2000ms threshold)
- Try adding `http://localhost:3000` — expect 400 INVALID_URL
- Trigger 3 consecutive failures manually — expect incident created
- Trigger a successful check on a failed service — expect incident auto-resolved

**Tools mentioned in spec:**
- Postman for manual API testing (import the endpoints list)

---

## 24. What was the most difficult bug?

The rate limiter interfering with tests. The test suite runs many authentication requests in a tight loop. The `authLimiter` (20 requests per 15 minutes) was triggering 429 responses during `beforeEach` setup across multiple test groups, causing `res.body.data` to be undefined and tests to fail with `TypeError: Cannot read properties of undefined`.

The fix was to **bypass rate limiters in the test environment**:

```js
const authLimiter = process.env.NODE_ENV === 'test'
  ? (req, res, next) => next()
  : rateLimit({ ... });
```

This is a standard pattern: rate limiting is an operational concern, not business logic, so you disable it in tests while keeping it active in production. `NODE_ENV=test` is set automatically by Jest.

---

## 25. What would you improve with another month?

1. **Email notifications** — send an alert when a HIGH incident is created and when it's resolved
2. **Per-service check interval** — some services are critical and should be checked every minute; others every 30 minutes
3. **Status page** — a public-facing, unauthenticated page showing current status of selected services (like statuspage.io)
4. **Custom HTTP method** — allow HEAD requests for lighter checks (no response body)
5. **Response body assertions** — check that the response body contains a specific string (e.g., `"status":"ok"`)
6. **Better SSRF protection** — DNS resolution before request, re-validate resolved IP
7. **Monitoring data retention policy** — TTL index on `MonitoringResult` to automatically delete results older than 30 days
8. **Admin UI** — a proper admin dashboard with user management, system-wide health view, and the ability to promote users to admin
9. **Graceful shutdown** — handle `SIGTERM` by stopping the scheduler and closing the DB connection cleanly before the process exits
10. **CI/CD pipeline** — GitHub Actions to run tests on every push and block merges if tests fail
