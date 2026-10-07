import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';

const IncidentTable = ({ incidents, onResolve, resolvingId }) => {
  if (!incidents || incidents.length === 0) {
    return <p className="text-gray-500 text-sm py-4">No incidents found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-2 pr-4 font-medium">Service</th>
            <th className="pb-2 pr-4 font-medium">Title</th>
            <th className="pb-2 pr-4 font-medium">Severity</th>
            <th className="pb-2 pr-4 font-medium">Status</th>
            <th className="pb-2 pr-4 font-medium">Started</th>
            <th className="pb-2 pr-4 font-medium">Resolved</th>
            <th className="pb-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((inc) => (
            <tr key={inc._id} className="border-b border-gray-800/30 hover:bg-gray-800/20">
              <td className="py-2 pr-4">
                <Link
                  to={`/services/${inc.serviceId?._id}`}
                  className="text-blue-400 hover:text-blue-300 text-xs"
                >
                  {inc.serviceId?.name || '—'}
                </Link>
              </td>
              <td className="py-2 pr-4 text-gray-200">{inc.title}</td>
              <td className="py-2 pr-4">
                <StatusBadge status={inc.severity} />
              </td>
              <td className="py-2 pr-4">
                <StatusBadge status={inc.status} />
              </td>
              <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">
                {fmtDate(inc.startedAt)}
              </td>
              <td className="py-2 pr-4 text-gray-400 text-xs whitespace-nowrap">
                {fmtDate(inc.resolvedAt)}
              </td>
              <td className="py-2">
                {inc.status === 'OPEN' && (
                  <button
                    onClick={() => onResolve(inc._id)}
                    disabled={resolvingId === inc._id}
                    className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                  >
                    {resolvingId === inc._id ? 'Resolving…' : 'Resolve'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default IncidentTable;
