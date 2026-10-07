import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getServices, checkService, deleteService } from '../services/serviceService';
import { getIncidents } from '../services/incidentService';
import ServiceTable from '../components/ServiceTable';
import LoadingSpinner from '../components/LoadingSpinner';

import ErrorMessage from '../components/ErrorMessage';
  <div className="card">
    <p className="text-sm text-gray-400">{label}</p>
    <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
  </div>
);

const Dashboard = () => {
  const [services, setServices] = useState([]);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingId, setCheckingId] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const [svcRes, incRes] = await Promise.all([
        getServices(),
        getIncidents({ status: 'OPEN' }),
      ]);
      setServices(svcRes.data.data.services);
      setOpenIncidentsCount(incRes.data.count);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckNow = async (serviceId) => {
    setCheckingId(serviceId);
    try {
      await checkService(serviceId);
      await fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Health check failed');
    } finally {
      setCheckingId(null);
    }
  };

  const handleDelete = async (serviceId, serviceName) => {
    if (!confirm(`Delete "${serviceName}"? This cannot be undone.`)) return;
    try {
      await deleteService(serviceId);
      setServices((prev) => prev.filter((s) => s._id !== serviceId));
    } catch (err) {
      alert(err.response?.data?.message || 'Delete failed');
    }
  };

  const counts = {
    total: services.length,
    healthy: services.filter((s) => s.currentStatus === 'HEALTHY').length,
    degraded: services.filter((s) => s.currentStatus === 'DEGRADED').length,
    down: services.filter((s) => s.currentStatus === 'DOWN').length,
  };

  if (loading) return <LoadingSpinner message="Loading dashboard…" />;
  if (error) return <div className="p-6"><ErrorMessage message={error} onRetry={fetchData} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-1">Overview of all monitored services</p>
        </div>
        <Link to="/services/new" className="btn-primary">
          + Add Service
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Services" value={counts.total} color="text-white" />
        <StatCard label="Healthy" value={counts.healthy} color="text-green-400" />
        <StatCard label="Degraded" value={counts.degraded} color="text-orange-400" />
        <StatCard label="Down" value={counts.down} color="text-red-400" />
        <StatCard label="Open Incidents" value={openIncidentsCount} color="text-yellow-400" />
      </div>

      {/* Service Table */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Services</h2>
          <Link to="/services" className="text-sm text-blue-400 hover:text-blue-300">
            View all →
          </Link>
        </div>
        <ServiceTable
          services={services}
          onCheckNow={handleCheckNow}
          onDelete={handleDelete}
          checkingId={checkingId}
        />
      </div>
    </div>
  );
};

export default Dashboard;
