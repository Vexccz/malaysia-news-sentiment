import React from 'react';

const LoadingSpinner = ({ message = 'Loading...' }) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
    <div className="w-8 h-8 border-[3px] border-blue-600 border-t-transparent rounded-full animate-spin" />
    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{message}</p>
  </div>
);

export default LoadingSpinner;
