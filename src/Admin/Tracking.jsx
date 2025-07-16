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

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%]">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Tracking</h1>
          {error && <div className="bg-red-100 p-2 mb-4 text-red-700">{error}</div>}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-200">
                  <th className="p-2 text-center">Order ID</th>
                  <th className="p-2 text-center">Customer Name</th>
                  <th className="p-2 text-center">Total</th>
                  <th className="p-2 text-center">Amount Paid</th>
                  <th className="p-2 text-center">Balance</th>
                  <th className="p-2 text-center">Status</th>
                  <th className="p-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map(booking => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-center">{booking.order_id}</td>
                    <td className="p-2 text-center">{booking.customer_name}</td>
                    <td className="p-2 text-center">Rs.{(parseFloat(booking.total) || 0).toFixed(2)}</td>
                    <td className="p-2 text-center">Rs.{(parseFloat(booking.amount_paid) || 0).toFixed(2)}</td>
                    <td className="p-2 text-center">Rs.{getBalance(booking).toFixed(2)}</td>
                    <td className="p-2 text-center">{booking.status}</td>
                    <td className="p-2 text-center">
                      <select
                        onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                        className="p-1 border"
                        value={selectedBooking?.id === booking.id ? 'paid' : ''}
                      >
                        <option value="">Change Status</option>
                        {['paid', 'dispatched', 'delivered'].map(status => (
                          <option key={status} value={status} disabled={booking.status === 'delivered'}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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