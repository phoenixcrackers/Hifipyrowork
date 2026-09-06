import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  FaBox, 
  FaChartBar, 
  FaBars, 
  FaTimes, 
  FaStackExchange, 
  FaUsers, 
  FaLocationArrow, 
  FaTruck, 
  FaDollarSign, 
  FaMoneyCheck, 
  FaCoins, 
  FaMoneyBill,
  FaFire
} from 'react-icons/fa';

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: 'Inventory', path: '/dealers', icon: <FaBox className="text-base" /> },
    { name: 'Stock In', path: '/stock', icon: <FaStackExchange className="text-base" /> },
    { name: 'Direct Customer', path: '/direct-customer', icon: <FaUsers className="text-base" /> },
    { name: 'Quotation', path: '/quotation', icon: <FaCoins className="text-base" /> },
    { name: 'Order Tracking', path: '/tracking', icon: <FaLocationArrow className="text-base" /> },
    { name: 'Pending Payments', path: '/pending', icon: <FaMoneyCheck className="text-base" /> },
    { name: 'Dispatch', path: '/dispatch', icon: <FaTruck className="text-base" /> },
    { name: 'Ledger', path: '/ledger', icon: <FaMoneyBill className="text-base" /> },
    { name: 'Receipts', path: '/receipt', icon: <FaDollarSign className="text-base" /> },
    { name: 'Reports', path: '/report', icon: <FaChartBar className="text-base" /> },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {!isOpen && (
        <button
          className="hundred:hidden fixed top-3.5 left-3.5 z-50 text-white bg-slate-800/95 backdrop-blur-md p-2 rounded-xl shadow-lg border border-slate-700/60 transition hover:scale-105"
          onClick={toggleSidebar}
          aria-label="Toggle menu"
        >
          <FaBars size={18} />
        </button>
      )}

      {isOpen && (
        <div
          className="hundred:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-35 transition-opacity"
          onClick={toggleSidebar}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen bg-slate-900/95 backdrop-blur-xl text-slate-100 flex flex-col transition-all duration-300 ease-in-out border-r border-slate-800/80 shadow-2xl z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } hundred:translate-x-0 hundred:w-64 w-64`}
      >
        {/* Brand Header */}
        <div className="px-5 py-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-600 flex items-center justify-center shadow-md shadow-orange-500/20">
              <FaFire className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wide uppercase text-white">
                Hifi Pyro Park
              </h1>
              <p className="text-[11px] text-slate-400 font-medium">
                Admin Control Panel
              </p>
            </div>
          </div>
          <button 
            className="hundred:hidden text-slate-400 hover:text-white p-1 rounded-lg" 
            onClick={toggleSidebar}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1 scrollbar-thin scrollbar-thumb-slate-700">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Main Menu
          </div>
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.name}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`
                  }
                  onClick={() => setIsOpen(false)}
                >
                  <span className="transition-transform group-hover:scale-110">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80">
          <div className="bg-slate-800/60 rounded-xl p-2.5 text-center">
            <p className="text-[10px] text-slate-400">System Status</p>
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-400">Online & Synchronized</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Backdrop overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 hundred:hidden transition-opacity"
          onClick={toggleSidebar}
        ></div>
      )}
    </>
  );
}