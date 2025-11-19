
import React from 'react';

export const Spinner: React.FC = () => (
  <div className="w-12 h-12 border-4 border-t-purple-500 border-r-purple-500 border-b-purple-500 border-l-transparent rounded-full animate-spin" role="status">
    <span className="sr-only">Loading...</span>
  </div>
);
