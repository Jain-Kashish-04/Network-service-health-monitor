import api from './api';

export const getIncidents = (params = {}) => api.get('/incidents', { params });
export const getIncident = (id) => api.get(`/incidents/${id}`);
export const resolveIncident = (id) => api.patch(`/incidents/${id}/resolve`);
