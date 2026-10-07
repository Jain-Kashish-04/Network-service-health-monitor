import React from 'react';

const ErrorMessage = ({ message, onRetry }) => (
  <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
    <p className="font-medium">Something went wrong</p>
    <p className="text-sm mt-1 text-red-400">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-3 text-sm underline text-red-300 hover:text-red-200"
      >
        Try again
      </button>
    )}
  </div>
);

export default ErrorMessage;
