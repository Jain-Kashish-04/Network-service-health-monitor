import React, { useEffect, useState, useCallback } from 'react';
import { getIncidents, resolveIncident } from '../services/incidentService';
import IncidentTable from '../components/IncidentTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const STATUSES = ['ALL', 'OPEN', 'RESOLVED'];
const SEVERITIES = ['ALL', 'HIGH', 'MEDIUM', 'LOW'];

const Incidents = () => {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resolvingId, setResolvingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const fetchIncidents = useCallback(async () => {
    const params = {};
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (severityFilter !== 'ALL') params.severity = severityFilter;
    try {
      const res = await getIncidents(params);
      setIncidents(res.data.data.incidents);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load incidents');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter]);

  useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

  const handleResolve = async (incidentId) => {
    setResolvingId(incidentId);
    try {
      await resolveIncident(incidentId);
      setIncidents((prev) =>
        prev.map((inc) =>
          inc._id === incidentId
            ? { ...inc, status: 'RESOLVED', resolvedAt: new Date().toISOString() }
            : inc
        )
      );
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resolve incident');
    } finally {
      setResolvingId(null);
    }
  };

  if (loading) return <LoadingSpinner message="Loading incidents…" />;
  if (error) return <div className="p-6"><ErrorMessage message={error} onRetry={fetchIncidents} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Incidents</h1>
        <p className="text-gray-400 text-sm mt-1">{incidents.length} incident(s) found</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Status:</span>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                statusFilter === s
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Severity:</span>
          {SEVERITIES.map((s) => (
            <button
              key={s}
              onClick={() => setSeverityFilter(s)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                severityFilter === s
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'border-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <IncidentTable
          incidents={incidents}
          onResolve={handleResolve}
          resolvingId={resolvingId}
        />
      </div>
    </div>
  );
};

export default Incidents;
