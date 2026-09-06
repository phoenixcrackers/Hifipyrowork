import React, { useEffect } from 'react';
import { FiLogOut } from 'react-icons/fi';

const Logout = () => {
  const handleLogout = () => {
    localStorage.removeItem('username');
    window.location.reload();
  };

  useEffect(() => {
    const clearStorageInterval = setInterval(() => {
      localStorage.removeItem('username');
      window.location.reload();
    }, 3600000);
    return () => clearInterval(clearStorageInterval);
  }, []);

  return (
    <button
      onClick={handleLogout}
      className="fixed top-3.5 right-3.5 bg-rose-600 hover:bg-rose-700 text-white p-2 sm:px-3.5 sm:py-2 rounded-xl shadow-lg flex items-center gap-1.5 z-50 transition hover:scale-105 border border-rose-500/60 text-xs font-bold"
      title="Logout"
    >
      <FiLogOut size={16} />
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
};

export default Logout;