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

  const generatePDF = (booking) => {
    const doc = new jsPDF();
    const formatDate = (dateStr) => (dateStr ? new Date(dateStr).toLocaleDateString('en-GB') : 'N/A');

    doc.setFontSize(22).text('Fun with Crackers Report', 10, 20);
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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%]">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 mobile:text-2xl">Report</h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg mb-6 text-center shadow-md">
              {error}
            </div>
          )}

          <div className="flex justify-end mb-4">
            <button
              onClick={exportToExcel}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md mr-2"
            >
              Export to Excel
            </button>
            <button
              onClick={generatePDF}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md"
            >
              <FaDownload className="mr-2" /> Download PDF
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="text-center text-gray-700 font-semibold">Sl. No</th>
                  <th className="text-center text-gray-700 font-semibold">Order ID</th>
                  <th className="text-center text-gray-700 font-semibold">Customer Name</th>
                  <th className="text-center text-gray-700 font-semibold">Total</th>
                  <th className="text-center text-gray-700 font-semibold">Admin</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length > 0 ? (
                  bookings.map((booking, index) => (
                    <tr key={booking.id} className="border-b border-gray-300 hover:bg-gray-50">
                      <td className="p-2 text-center text-gray-800">{index + 1}</td>
                      <td className="p-2 text-center text-gray-800">{booking.order_id}</td>
                      <td className="p-2 text-center text-gray-800">{booking.customer_name}</td>
                      <td className="p-2 text-center text-gray-800">Rs.{booking.total}</td>
                      <td className="p-2 text-center text-gray-800">{booking.admin_username || 'N/A'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-600">
                      No bookings found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}