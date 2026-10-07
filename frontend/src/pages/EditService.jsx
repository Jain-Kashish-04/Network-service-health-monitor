import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getService, updateService } from '../services/serviceService';
import ServiceForm from '../components/ServiceForm';
import LoadingSpinner from '../components/LoadingSpinner';

const EditService = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getService(id)
      .then((res) => setService(res.data.data.service))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load service'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async (formData) => {
    setSaving(true);
    setError('');
    try {
      await updateService(id, formData);
      navigate(`/services/${id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update service');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner message="Loading service…" />;

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Edit Service</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      <div className="card">
        {service && (
          <ServiceForm
            initialValues={service}
            onSubmit={handleSubmit}
            onCancel={() => navigate(`/services/${id}`)}
            submitLabel="Save Changes"
            loading={saving}
          />
        )}
      </div>
    </div>
  );
};

export default EditService;
