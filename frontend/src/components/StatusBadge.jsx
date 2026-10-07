import React from 'react';

const STATUS_CONFIG = {
  HEALTHY:  { label: 'Healthy',  classes: 'bg-green-900 text-green-300 border border-green-700' },
  DEGRADED: { label: 'Degraded', classes: 'bg-orange-900 text-orange-300 border border-orange-700' },
  DOWN:     { label: 'Down',     classes: 'bg-red-900 text-red-300 border border-red-700' },
  UNKNOWN:  { label: 'Unknown',  classes: 'bg-gray-800 text-gray-400 border border-gray-600' },
  OPEN:     { label: 'Open',     classes: 'bg-red-900 text-red-300 border border-red-700' },
  RESOLVED: { label: 'Resolved', classes: 'bg-green-900 text-green-300 border border-green-700' },
  HIGH:     { label: 'High',     classes: 'bg-red-900 text-red-300 border border-red-700' },
  MEDIUM:   { label: 'Medium',   classes: 'bg-yellow-900 text-yellow-300 border border-yellow-700' },
  LOW:      { label: 'Low',      classes: 'bg-blue-900 text-blue-300 border border-blue-700' },
};

const StatusBadge = ({ status, size = 'sm' }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.UNKNOWN;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
