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
  const [transactions, setTransactions] = useState([]);

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

  const fetchTransactions = async (bookingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/transactions/${bookingId}`);
      setTransactions(response.data);
    } catch (err) {
      setError('Failed to fetch transactions');
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
    fetchTransactions(bookingId);
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
      fetchTransactions(selectedBooking.id);
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
    setTransactions([]);
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
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Pending Transactions</h1>
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
                {pendingBookings.map(booking => (
                  <tr key={booking.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-center">{booking.order_id}</td>
                    <td className="p-2 text-center">{booking.customer_name}</td>
                    <td className="p-2 text-center">Rs.{booking.total || '0.00'}</td>
                    <td className="p-2 text-center">Rs.{booking.amount_paid || '0.00'}</td>
                    <td className="p-2 text-center">Rs.{getBalance(booking).toFixed(2)}</td>
                    <td className="p-2 text-center">{booking.status}</td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handlePayment(booking.id)}
                        className="bg-blue-600 text-white p-2 rounded"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Make Payment - Order {selectedBooking.order_id}</h2>
            {error && <div className="bg-red-100 p-2 mb-4 text-red-700">{error}</div>}
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
            <h3 className="text-lg font-semibold mt-4">Transaction History</h3>
            <div className="max-h-40 overflow-y-auto mb-4">
              {transactions.length > 0 ? (
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="p-2 text-center">Amount</th>
                      <th className="p-2 text-center">Method</th>
                      <th className="p-2 text-center">Admin</th>
                      <th className="p-2 text-center">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2 text-center">Rs.{tx.amount_paid.toFixed(2)}</td>
                        <td className="p-2 text-center">{tx.payment_method}</td>
                        <td className="p-2 text-center">{tx.admin_id ? admins.find(a => a.id === tx.admin_id)?.username || 'N/A' : 'N/A'}</td>
                        <td className="p-2 text-center">{new Date(tx.transaction_date).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p>No transactions yet.</p>
              )}
            </div>
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