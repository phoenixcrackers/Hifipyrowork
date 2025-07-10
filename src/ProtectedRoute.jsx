import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const ProtectedRoute = () => {
  const username = localStorage.getItem('username');
  return username ? <Outlet /> : <Navigate to="/" replace />;
};

export default ProtectedRoute;