import React from 'react';
import StatusBadge from './StatusBadge';

const fmtDate = (d) =>
  d
    ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' })
    : '—';

const MonitoringHistory = ({ results }) => {
  if (!results || results.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No monitoring history yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-2 pr-4 font-medium">Timestamp</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">HTTP</th>
            <th className="pb-2 pr-4 font-medium">Response Time</th>
            <th className="pb-2 font-medium">Error</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r._id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
              <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">
                {fmtDate(r.checkedAt)}
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={r.status} />
              </td>
              <td className="py-2 pr-4 text-gray-300">{r.httpStatusCode ?? '—'}</td>
              <td className="py-2 pr-4 text-gray-300">
                {r.responseTime != null ? `${r.responseTime} ms` : '—'}
              </td>
              <td className="py-2 text-red-400 text-xs max-w-xs truncate">
                {r.errorMessage || '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MonitoringHistory;
