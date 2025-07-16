import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function PendingPayments() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchPendingBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
      const pending = response.data.filter(booking => 
        booking.status !== 'delivered' && 
        (booking.status === 'booked' || (parseFloat(booking.total) || 0) > (parseFloat(booking.amount_paid) || 0))
      );
      setPendingBookings(pending);
    } catch (err) {
      setError('Failed to fetch pending bookings');
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
    fetchPendingBookings();
    fetchAdmins();
  }, []);

  const handlePayment = (bookingId) => {
    const booking = pendingBookings.find(b => b.id === bookingId);
    setSelectedBooking(booking);
    setPaymentMethod('');
    setAmountPaid('');
    setSelectedAdmin('');
    setIsModalOpen(true);
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
      fetchPendingBookings();
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

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%]">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Pending Transactions</h1>
          {error && <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200 dark:bg-gray-700">
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Order ID</th>
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Customer Name</th>
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Total</th>
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Amount Paid</th>
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Balance</th>
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Status</th>
                  <th className="p-2 text-center text-gray-900 dark:text-gray-100">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingBookings.map(booking => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-2 text-center text-gray-900 dark:text-gray-100">{booking.order_id}</td>
                    <td className="p-2 text-center text-gray-900 dark:text-gray-100">{booking.customer_name}</td>
                    <td className="p-2 text-center text-gray-900 dark:text-gray-100">Rs.{booking.total || '0.00'}</td>
                    <td className="p-2 text-center text-gray-900 dark:text-gray-100">Rs.{booking.amount_paid || '0.00'}</td>
                    <td className="p-2 text-center text-gray-900 dark:text-gray-100">Rs.{getBalance(booking).toFixed(2)}</td>
                    <td className="p-2 text-center text-gray-900 dark:text-gray-100">{booking.status}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handlePayment(booking.id)}
                        className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        Make Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Make Payment - Order {selectedBooking.order_id}</h2>
            {error && <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300">{error}</div>}
            <p className="text-gray-900 dark:text-gray-100">Remaining Balance: Rs.{getBalance(selectedBooking).toFixed(2)}</p>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 mb-4 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              className="p-2 border border-gray-300 dark:border-gray-600 mb-4 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
              min="0"
              max={getBalance(selectedBooking)}
            />
            <select
              value={selectedAdmin}
              onChange={(e) => setSelectedAdmin(e.target.value)}
              className="p-2 border border-gray-300 dark:border-gray-600 mb-4 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Admin</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.username} ({admin.bank_name})</option>
              ))}
            </select>
            <div className="flex justify-end gap-4">
              <button
                onClick={closeModal}
                className="bg-gray-500 dark:bg-gray-400 text-white p-2 rounded hover:bg-gray-600 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600"
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