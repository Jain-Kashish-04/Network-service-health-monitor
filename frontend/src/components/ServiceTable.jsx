import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

const fmt = (ms) => (ms != null ? `${ms} ms` : '—');
const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' }) : '—';

const ServiceTable = ({ services, onCheckNow, onDelete, checkingId }) => {
  if (!services || services.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <p className="text-lg">No services monitored yet.</p>
        <p className="text-sm mt-1">Add your first service to get started.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-left text-gray-400">
            <th className="pb-3 pr-4 font-medium">Service</th>
            <th className="pb-3 pr-4 font-medium">Status</th>
            <th className="pb-3 pr-4 font-medium">Response</th>
            <th className="pb-3 pr-4 font-medium">HTTP</th>
            <th className="pb-3 pr-4 font-medium">Last Checked</th>
            <th className="pb-3 pr-4 font-medium">Failures</th>
            <th className="pb-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {services.map((service) => (
            <tr key={service._id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
              <td className="py-3 pr-4">
                <div>
                  <Link
                    to={`/services/${service._id}`}
                    className="font-medium text-white hover:text-blue-400 transition-colors"
                  >
                    {service.name}
                  </Link>
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{service.url}</p>
                </div>
              </td>
              <td className="py-3 pr-4">
                <StatusBadge status={service.currentStatus} />
              </td>
              <td className="py-3 pr-4 text-gray-300">{fmt(service.responseTime)}</td>
              <td className="py-3 pr-4 text-gray-300">{service.httpStatusCode ?? '—'}</td>
              <td className="py-3 pr-4 text-gray-400 text-xs">{fmtDate(service.lastCheckedAt)}</td>
              <td className="py-3 pr-4">
                {service.consecutiveFailures > 0 ? (
                  <span className="text-red-400 font-medium">{service.consecutiveFailures}</span>
                ) : (
                  <span className="text-gray-500">0</span>
                )}
              </td>
              <td className="py-3">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/services/${service._id}`}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    View
                  </Link>
                  <button
                    onClick={() => onCheckNow(service._id)}
                    disabled={checkingId === service._id}
                    className="text-xs text-green-400 hover:text-green-300 disabled:opacity-50"
                  >
                    {checkingId === service._id ? 'Checking…' : 'Check'}
                  </button>
                  <Link
                    to={`/services/${service._id}/edit`}
                    className="text-xs text-yellow-400 hover:text-yellow-300"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => onDelete(service._id, service.name)}
                    className="text-xs text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ServiceTable;
