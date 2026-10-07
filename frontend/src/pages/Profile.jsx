import React from 'react';
import { useAuth } from '../context/AuthContext';

const Profile = () => {
  const { user, logout } = useAuth();

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Profile</h1>

      <div className="card space-y-4">
        <div>
          <p className="label">Name</p>
          <p className="text-white">{user?.name}</p>
        </div>
        <div>
          <p className="label">Email</p>
          <p className="text-white">{user?.email}</p>
        </div>
        <div>
          <p className="label">Role</p>
          <p className="text-white capitalize">{user?.role}</p>
        </div>
        <div className="pt-4 border-t border-gray-800">
          <button onClick={logout} className="btn-danger">
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
};

export default Profile;
