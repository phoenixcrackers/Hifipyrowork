import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

const Protected = () => {
  const username = localStorage.getItem('username');
  const role = localStorage.getItem('role');
  return username && role === 'admin' ? <Outlet /> : <Navigate to="/admin" replace />;
};

export default Protected;