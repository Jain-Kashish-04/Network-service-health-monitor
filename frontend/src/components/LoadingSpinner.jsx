import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center py-16 text-gray-400">
    <div className="w-10 h-10 border-4 border-gray-700 border-t-blue-500 rounded-full animate-spin mb-4" />
    <p className="text-sm">{message}</p>
  </div>
);

export default LoadingSpinner;
