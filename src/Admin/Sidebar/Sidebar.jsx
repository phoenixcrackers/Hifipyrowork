import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { FaBox, FaChartBar, FaBars, FaTimes,  FaStackExchange, FaUsers, FaShoppingCart, FaLocationArrow, FaTruck, FaDollarSign, FaMoneyCheck} from 'react-icons/fa';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Inventory', path: '/dealers', icon: <FaBox className="mr-2" /> },
    { name: 'Stock', path: '/stock', icon: <FaStackExchange className="mr-2" /> },
    { name: 'Direct Customer', path: '/direct-customer', icon: <FaUsers className="mr-2" /> },
    { name: 'Direct Enquiry', path: '/direct-enquiry', icon: <FaShoppingCart className="mr-2" /> },
    { name: 'Tracking', path: '/tracking', icon: <FaLocationArrow className="mr-2" /> },
    { name: 'Pending Payments', path: '/pending', icon: <FaMoneyCheck className="mr-2" /> },
    { name: 'Dispatch', path: '/dispatch', icon: <FaTruck className="mr-2" /> },
    { name: 'Ledger', path: '/ledger', icon: <FaDollarSign className="mr-2" /> },
    { name: 'Report', path: '/report', icon: <FaChartBar className="mr-2" /> },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {!isOpen && (
        <button
          className="md:hidden fixed top-4 left-4 z-50 text-white bg-gray-800 p-2 rounded-md"
          onClick={toggleSidebar}
        >
          <FaBars size={24} />
        </button>
      )}

      <div
        className={`fixed top-0 left-0 h-screen bg-black/70 text-white flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:w-64 w-64 z-40`}
      >
        <div className="p-4 text-xl font-bold border-b border-gray-700 flex items-center justify-between">
          Admin
          <button className="md:hidden text-white" onClick={toggleSidebar}>
            <FaTimes size={20} />
          </button>
        </div>
        <nav className="flex-1 mt-4">
          <ul>
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center py-3 px-6 text-sm font-medium hover:bg-black/50 transition-colors ${
                      isActive ? 'bg-gray-900 text-white' : ''
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon}
                  {item.name}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 bg-opacity-30 z-30 md:hidden"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
}