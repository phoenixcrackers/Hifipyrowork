import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function Tracking() {
  const [bookings, setBookings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 9;

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
      setBookings(response.data);
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admins`);
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to fetch admins');
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchAdmins();
  }, []);

  const handleStatusChange = (bookingId, newStatus) => {
    const booking = bookings.find(b => b.id === bookingId);
    setSelectedBooking(booking);
    if (newStatus === 'paid') {
      setPaymentMethod('');
      setAmountPaid('');
      setSelectedAdmin('');
      setIsModalOpen(true);
    }
  };

  const confirmPayment = async () => {
    if (!paymentMethod || !amountPaid || !selectedAdmin) {
      setError('Please fill all required fields, including admin selection');
      return;
    }

    const balance = getBalance(selectedBooking);
    const newAmountPaid = parseFloat(amountPaid);
    if (newAmountPaid > balance) {
      setError('Amount paid cannot exceed remaining balance');
      return;
    }

    try {
      const payload = {
        status: 'paid',
        payment_method: paymentMethod,
        amount_paid: newAmountPaid,
        admin_id: selectedAdmin,
      };
      await axios.patch(`${API_BASE_URL}/api/tracking/bookings/${selectedBooking.id}/status`, payload);
      fetchBookings();
      setSelectedBooking(null);
      setIsModalOpen(false);
      setError('');
    } catch (err) {
      setError('Failed to update status');
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setPaymentMethod('');
    setAmountPaid('');
    setSelectedAdmin('');
    setIsModalOpen(false);
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
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Tracking</h1>
          {error && <div className="bg-red-100 p-2 mb-4 text-red-700 rounded">{error}</div>}
          {bookings.length === 0 ? (
            <p className="text-center text-gray-600">No bookings available</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBookings.map(booking => (
                  <div
                    key={booking.id}
                    className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
                  >
                    <h2 className="text-xl font-semibold text-gray-800 mb-4">Order {booking.order_id}</h2>
                    <div className="space-y-2">
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
                      <p className="text-gray-600">
                        <span className="font-medium">Status:</span> {booking.status}
                      </p>
                      <div className="mt-4">
                        <select
                          onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                          className="p-2 border rounded w-full text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          value={selectedBooking?.id === booking.id ? 'paid' : ''}
                        >
                          <option value="">Change Status</option>
                          {['paid', 'dispatched', 'delivered'].map(status => (
                            <option key={status} value={status} disabled={booking.status === 'delivered'}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
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
        </div>
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Update Payment - Order {selectedBooking.order_id}</h2>
            {error && <div className="bg-red-100 p-2 mb-4 text-red-700">{error}</div>}
            <p>Total: Rs.{(parseFloat(selectedBooking.total) || 0).toFixed(2)}</p>
            <p>Remaining Balance: Rs.{getBalance(selectedBooking).toFixed(2)}</p>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="p-2 border mb-4 w-full"
            >
              <option value="">Select Payment Method</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
            <input
              type="number"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              placeholder="Amount Paid"
              className="p-2 border mb-4 w-full"
              required
              min="0"
              max={getBalance(selectedBooking)}
            />
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="p-2 border mb-4 w-full"
            >
              <option value="">Select Admin</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.username} ({admin.bank_name})</option>
              ))}
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="bg-gray-500 text-white p-2 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="bg-blue-600 text-white p-2 rounded"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}