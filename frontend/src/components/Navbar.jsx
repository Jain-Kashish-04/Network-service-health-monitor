import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const navLink = (to, label) => {
    const active = location.pathname.startsWith(to);
    return (
      <Link
        to={to}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active ? 'bg-gray-800 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-blue-400 font-bold text-lg">⬡</span>
        <Link to="/dashboard" className="font-semibold text-white text-sm">
          Health Monitor
        </Link>
      </div>

      {user && (
        <div className="flex items-center gap-1">
          {navLink('/dashboard', 'Dashboard')}
          {navLink('/services', 'Services')}
          {navLink('/incidents', 'Incidents')}
          {user.role === 'admin' && navLink('/admin', 'Admin')}
        </div>
      )}

      {user && (
        <div className="flex items-center gap-3">
          <Link to="/profile" className="text-sm text-gray-400 hover:text-white">
            {user.name}
          </Link>
          <button
            onClick={logout}
            className="text-sm text-gray-500 hover:text-red-400 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
