import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function Dispatch() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [transportType, setTransportType] = useState('');
  const [transportName, setTransportName] = useState('');
  const [transportContact, setTransportContact] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 9;

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings?status=paid`);
      setBookings(response.data);
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDispatch = async () => {
    try {
      const payload = { status: 'dispatched' };
      if (transportType) {
        payload.transport_type = transportType;
        if (transportType === 'transport') {
          payload.transport_name = transportName;
          payload.transport_contact = transportContact;
          payload.lr_number = lrNumber;
        }
      }

      await axios.patch(`${API_BASE_URL}/api/tracking/bookings/${selectedBooking.id}/status`, payload);
      fetchBookings();
      setSelectedBooking(null);
      setTransportType('');
      setTransportName('');
      setTransportContact('');
      setLrNumber('');
      setError('');
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const getBalance = (booking) => {
    const total = parseFloat(booking.total) || 0;
    const paid = parseFloat(booking.amount_paid) || 0;
    return total - paid >= 0 ? total - paid : 0;
  };

  // Pagination logic
  const totalPages = Math.ceil(bookings.length / cardsPerPage);
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentBookings = bookings.slice(indexOfFirstCard, indexOfLastCard);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%] p-6">
        <div className="w-full max-w-5xl">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Dispatch</h1>
          {error && <div className="bg-red-100 p-2 mb-4 text-red-700 rounded">{error}</div>}
          {bookings.length === 0 ? (
            <p className="text-center text-gray-600">No paid bookings available</p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-800">Order {booking.order_id}</h3>
                    <div className="space-y-2 mt-2">
                      <p className="text-gray-600">
                        <span className="font-medium">Customer:</span> {booking.customer_name}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Total:</span> Rs.{(parseFloat(booking.total) || 0).toFixed(2)}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Amount Paid:</span> Rs.{(parseFloat(booking.amount_paid) || 0).toFixed(2)}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Balance:</span> Rs.{getBalance(booking).toFixed(2)}
                      </p>
                      <button
                        onClick={() => setSelectedBooking(booking)}
                        className="bg-blue-600 text-white p-2 rounded mt-2 w-full hover:bg-blue-700 transition-colors"
                      >
                        Dispatch
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-center items-center gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded text-white ${currentPage === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded text-white ${currentPage === totalPages ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {selectedBooking && (
            <div className="mt-4 p-4 bg-gray-100 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4">Dispatch Order: {selectedBooking.order_id}</h2>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                className="p-2 border rounded mb-2 w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Transport Type</option>
                <option value="own">Own</option>
                <option value="transport">Transport</option>
              </select>
              {transportType === 'transport' && (
                <>
                  <input
                    type="text"
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    placeholder="Transport Name"
                    className="p-2 border rounded mb-2 w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={transportContact}
                    onChange={(e) => setTransportContact(e.target.value)}
                    placeholder="Contact Number"
                    className="p-2 border rounded mb-2 w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    placeholder="LR Number"
                    className="p-2 border rounded mb-2 w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </>
              )}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="bg-gray-500 text-white p-2 rounded hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatch}
                  className="bg-green-600 text-white p-2 rounded hover:bg-green-700 transition-colors"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}