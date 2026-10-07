import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getServices, checkService, deleteService } from '../services/serviceService';
import ServiceTable from '../components/ServiceTable';
import LoadingSpinner from '../components/LoadingSpinner';
import ErrorMessage from '../components/ErrorMessage';

const Services = () => {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [checkingId, setCheckingId] = useState(null);

  const fetchServices = useCallback(async () => {
    try {
      const res = await getServices();
      setServices(res.data.data.services);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load services');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchServices(); }, [fetchServices]);

  const handleCheckNow = async (serviceId) => {
    setCheckingId(serviceId);
    try {
      await checkService(serviceId);
      await fetchServices();
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

  if (loading) return <LoadingSpinner message="Loading services…" />;
  if (error) return <div className="p-6"><ErrorMessage message={error} onRetry={fetchServices} /></div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p className="text-gray-400 text-sm mt-1">{services.length} service(s) monitored</p>
        </div>
        <Link to="/services/new" className="btn-primary">
          + Add Service
        </Link>
      </div>

      <div className="card">
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

export default Services;
