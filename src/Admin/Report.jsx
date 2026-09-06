import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FaDownload } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function Report() {
  const [bookings, setBookings] = useState([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const cardsPerPage = 9;

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/tracking/bookings`);
      setBookings(response.data);
      setError('');
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
    const interval = setInterval(fetchBookings, 10000);
    return () => clearInterval(interval);
  }, []);

  const uniqueCustomers = Array.from(new Set(bookings.map(b => b.customer_name).filter(Boolean))).sort();

  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (b.order_id && b.order_id.toLowerCase().includes(q)) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
      (b.admin_username && b.admin_username.toLowerCase().includes(q));
    const matchesCustomer = customerFilter === 'all' || b.customer_name === customerFilter;
    return matchesSearch && matchesCustomer;
  });

  const generatePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(22).text('Hifi Pyro Park Report', 10, 20);
    doc.setFontSize(12);

    const tableData = filteredBookings.map((b, index) => [
      index + 1,
      b.order_id || 'N/A',
      b.customer_name || 'N/A',
      `Rs.${b.total || '0.00'}`,
      b.admin_username || 'N/A',
    ]);

    autoTable(doc, {
      head: [['Sl. No', 'Order ID', 'Customer Name', 'Total', 'Admin']],
      body: tableData,
      startY: 30,
    });

    doc.save('report.pdf');
  };

  const exportToExcel = () => {
    const data = filteredBookings.map((b, i) => ({
      'Sl. No': i + 1,
      'Order ID': b.order_id || '',
      'Customer Name': b.customer_name || '',
      'Total': b.total || '',
      'Admin': b.admin_username || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
    XLSX.writeFile(workbook, 'Report.xlsx');
  };

  // Pagination logic
  const totalPages = Math.ceil(filteredBookings.length / cardsPerPage) || 1;
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = filteredBookings.slice(indexOfFirstCard, indexOfLastCard);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 hundred:ml-64 onefifty:ml-1 p-3 sm:p-6 md:p-8 pt-16 sm:pt-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6 min-w-0 w-full">

          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  Sales & Order Reports
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Filter orders by customer or order ID, analyze booking volumes, and export to Excel or PDF
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={exportToExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs transition"
                >
                  Export ({filteredBookings.length}) to Excel
                </button>
                <button
                  onClick={generatePDF}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md text-xs transition inline-flex items-center gap-1.5"
                >
                  <FaDownload className="text-xs" /> Export PDF
                </button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200 text-center">
                {error}
              </div>
            )}
          </div>

          {/* Search and Customer Filter */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by order ID (e.g. 2026ORD1), customer, or admin..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-8 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            <div className="w-full sm:w-72">
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2.5 px-3 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="all">All Customers / Users ({uniqueCustomers.length})</option>
                {uniqueCustomers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredBookings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {currentCards.map((booking, index) => {
                  const isCancelled = booking.status === 'cancelled' || booking.status === 'canceled';
                  return (
                    <div
                      key={booking.id}
                      className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm hover:shadow-md border border-gray-200/80 dark:border-gray-700/80 transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h2 className="text-base font-bold font-mono text-gray-900 dark:text-white">
                            {booking.order_id || 'N/A'}
                          </h2>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : booking.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {booking.status || 'booked'}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                          <p><span className="font-semibold text-gray-500">Record #:</span> {indexOfFirstCard + index + 1}</p>
                          <p><span className="font-semibold text-gray-500">Customer:</span> <strong className="text-gray-900 dark:text-white">{booking.customer_name || 'N/A'}</strong></p>
                          <p><span className="font-semibold text-gray-500">Handled By Admin:</span> <span className="text-blue-600 dark:text-blue-400 font-semibold">{booking.admin_username || 'Direct'}</span></p>
                          <div className="pt-2 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center text-sm font-bold">
                            <span className="text-gray-500 text-xs">Total Bill Value:</span>
                            <span className="text-gray-900 dark:text-white">₹{Number(booking.total || 0).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-8 gap-2">
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i + 1}
                      onClick={() => handlePageChange(i + 1)}
                      className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                        currentPage === i + 1
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 p-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              No matching bookings found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}