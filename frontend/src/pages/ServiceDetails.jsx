import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  getService,
  checkService,
  deleteService,
  getMonitoringHistory,
} from '../services/serviceService';
import StatusBadge from '../components/StatusBadge';
import MonitoringHistory from '../components/MonitoringHistory';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';
import ResponseTimeChart from '../components/ResponseTimeChart';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-800">
    <span className="text-gray-400 text-sm">{label}</span>
    <span className="text-gray-100 text-sm font-medium">{value}</span>
  </div>
);

const ServiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [svcRes, histRes] = await Promise.all([
        getService(id),
        getMonitoringHistory(id, 50),
      ]);
      setData(svcRes.data.data);
      setHistory(histRes.data.data.results);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load service');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      await checkService(id);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Health check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${data.service.name}"? This cannot be undone.`)) return;
    try {
      await deleteService(id);
      navigate('/services');
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  if (loading) return <LoadingSpinner message="Loading service details…" />;
  if (error) return <div className="p-6"><ErrorMessage message={error} /></div>;

  const { service, activeIncidents } = data;
  const uptimeStr =
    service.totalChecks > 0
      ? `${((service.successfulChecks / service.totalChecks) * 100).toFixed(1)}%`
      : '—';

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{service.name}</h1>
            <StatusBadge status={service.currentStatus} size="md" />
          </div>
          <a
            href={service.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 mt-1 block"
          >
            {service.url}
          </a>
          {service.description && (
            <p className="text-gray-400 text-sm mt-1">{service.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCheckNow}
            disabled={checking}
            className="btn-primary"
          >
            {checking ? 'Checking…' : 'Check Now'}
          </button>
          <Link to={`/services/${id}/edit`} className="btn-secondary">
            Edit
          </Link>
          <button onClick={handleDelete} className="btn-danger">
            Delete
          </button>
        </div>
      </div>

      {/* Active Incidents */}
      {activeIncidents.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
          <h3 className="text-red-300 font-semibold mb-2">
            {activeIncidents.length} Active Incident(s)
          </h3>
          {activeIncidents.map((inc) => (
            <div key={inc._id} className="text-sm text-red-400">
              {inc.title} — started {fmtDate(inc.startedAt)}
              <Link
                to="/incidents"
                className="ml-2 underline text-red-300 hover:text-red-200"
              >
                Resolve →
              </Link>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Current Health */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-3">Current Health</h2>
          <InfoRow label="Status" value={<StatusBadge status={service.currentStatus} />} />
          <InfoRow label="HTTP Status" value={service.httpStatusCode ?? '—'} />
          <InfoRow
            label="Response Time"
            value={service.responseTime != null ? `${service.responseTime} ms` : '—'}
          />
          <InfoRow label="Last Checked" value={fmtDate(service.lastCheckedAt)} />
          <InfoRow label="Last Successful" value={fmtDate(service.lastSuccessfulAt)} />
          <InfoRow label="Last Failed" value={fmtDate(service.lastFailedAt)} />
          <InfoRow label="Consecutive Failures" value={service.consecutiveFailures} />
        </div>

        {/* Statistics */}
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-3">Statistics</h2>
          <InfoRow label="Total Checks" value={service.totalChecks} />
          <InfoRow label="Successful Checks" value={service.successfulChecks} />
          <InfoRow label="Failed Checks" value={service.failedChecks} />
          <InfoRow label="Uptime" value={uptimeStr} />
        </div>
      </div>

      {/* Response Time Chart */}
      {history.length > 1 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-white mb-4">Response Time (last {history.length} checks)</h2>
          <ResponseTimeChart data={[...history].reverse()} />
        </div>
      )}

      {/* Monitoring History */}
      <div className="card">
        <h2 className="text-lg font-semibold text-white mb-4">Monitoring History</h2>
        <MonitoringHistory results={history} />
      </div>
    </div>
  );
};

export default ServiceDetails;
