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
  const cardsPerPage = 9;

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
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

  const generatePDF = () => {
    const doc = new jsPDF();
    const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : 'N/A');

    doc.setFontSize(22).text('Hifi Pyro Park Report', 10, 20);
    doc.setFontSize(12);

    const tableData = bookings.map((b, index) => [
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
    const data = bookings.map((b, i) => ({
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
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentCards = bookings.slice(indexOfFirstCard, indexOfLastCard);
  const totalPages = Math.ceil(bookings.length / cardsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center hundred:ml-64 onefifty:ml-1">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100 mobile:text-2xl">Report</h1>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-6 py-3 rounded-lg mb-6 text-center shadow-md">
              {error}
            </div>
          )}

          <div className="flex justify-center mb-4">
            <button
              onClick={exportToExcel}
              className="bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md mr-2"
            >
              Export to Excel
            </button>
            <button
              onClick={generatePDF}
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
            >
              <FaDownload className="mr-2 inline" /> Download PDF
            </button>
          </div>

          {bookings.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentCards.map((booking, index) => (
                  <div
                    key={booking.id}
                    className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-300 dark:border-gray-600"
                  >
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-2">
                      Order ID: {booking.order_id || 'N/A'}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Sl. No:</span> {indexOfFirstCard + index + 1}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Customer Name:</span> {booking.customer_name || 'N/A'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Total:</span> Rs.{booking.total || '0.00'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">
                      <span className="font-medium">Admin:</span> {booking.admin_username || 'N/A'}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6">
                  <div className="flex gap-2">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => handlePageChange(i + 1)}
                        className={`px-4 py-2 rounded-lg ${
                          currentPage === i + 1
                            ? 'bg-blue-600 dark:bg-blue-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-600 dark:text-gray-400 p-4">
              No bookings found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}