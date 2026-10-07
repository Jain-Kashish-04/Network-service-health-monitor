import api from './api';

export const getServices = () => api.get('/services');
export const getService = (id) => api.get(`/services/${id}`);
export const createService = (data) => api.post('/services', data);
export const updateService = (id, data) => api.put(`/services/${id}`, data);
export const deleteService = (id) => api.delete(`/services/${id}`);
export const checkService = (id) => api.post(`/services/${id}/check`);
export const getMonitoringHistory = (id, limit = 50) =>
  api.get(`/services/${id}/monitoring?limit=${limit}`);
