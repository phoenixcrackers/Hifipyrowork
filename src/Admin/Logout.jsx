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
      className="fixed top-4 right-4 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors flex items-center gap-2 z-50"
      title="Logout"
    >
      <FiLogOut size={20} />
      <span className="hidden sm:inline">Logout</span>
    </button>
  );
};

export default Logout;