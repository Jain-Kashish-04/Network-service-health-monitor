import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Services from './pages/Services';
import AddService from './pages/AddService';
import EditService from './pages/EditService';
import ServiceDetails from './pages/ServiceDetails';
import Incidents from './pages/Incidents';
import Profile from './pages/Profile';

const App = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950">
      {user && <Navbar />}

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/dashboard" replace /> : <Register />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
        <Route path="/services/new" element={<ProtectedRoute><AddService /></ProtectedRoute>} />
        <Route path="/services/:id" element={<ProtectedRoute><ServiceDetails /></ProtectedRoute>} />
        <Route path="/services/:id/edit" element={<ProtectedRoute><EditService /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />

        {/* Default redirect */}
        <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
