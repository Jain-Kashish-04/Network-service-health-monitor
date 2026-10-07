import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createService } from '../services/serviceService';
import ServiceForm from '../components/ServiceForm';

const AddService = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData) => {
    setLoading(true);
    setError('');
    try {
      const res = await createService(formData);
      navigate(`/services/${res.data.data.service._id}`);
    } catch (err) {
      const apiError = err.response?.data;
      if (apiError?.errors) {
        setError(apiError.errors.map((e) => e.message).join(', '));
      } else {
        setError(apiError?.message || 'Failed to create service');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Add New Service</h1>

      {error && (
        <div className="bg-red-900/30 border border-red-700 rounded-lg p-3 text-sm text-red-300 mb-4">
          {error}
        </div>
      )}

      <div className="card">
        <ServiceForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/services')}
          submitLabel="Add Service"
          loading={loading}
        />
      </div>
    </div>
  );
};

export default AddService;
