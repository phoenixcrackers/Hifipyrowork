import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function PendingPayments() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 12; // Updated to 12 cards per page

  const fetchPendingBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
      const pending = response.data.filter(
        (booking) =>
          booking.status !== 'delivered' &&
          (booking.status === 'booked' ||
            (parseFloat(booking.total) || 0) > (parseFloat(booking.amount_paid) || 0))
      );
      setPendingBookings(pending);
      setFilteredBookings(pending);
    } catch (err) {
      setError('Failed to fetch pending bookings');
    }
  };

  const fetchPaymentHistory = async (bookingId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/transactions/${bookingId}`);
      setPaymentHistory(response.data);
      setIsHistoryModalOpen(true);
    } catch (err) {
      setError('Failed to fetch payment history');
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

  const fetchBankAccounts = async (username) => {
    try {
      if (username) {
        const response = await axios.get(`${API_BASE_URL}/api/admins/${username}/bank-accounts`);
        setBankAccounts(response.data || []);
      } else {
        setBankAccounts([]);
      }
    } catch (err) {
      setError('Failed to fetch bank accounts');
      setBankAccounts([]);
    }
  };

  useEffect(() => {
    fetchPendingBookings();
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (selectedAdmin) {
      const admin = admins.find((a) => a.id === parseInt(selectedAdmin));
      if (admin) {
        fetchBankAccounts(admin.username);
      }
    } else {
      setBankAccounts([]);
      setSelectedBankAccount('');
    }
  }, [selectedAdmin]);

  useEffect(() => {
    const filtered = pendingBookings.filter(
      (booking) =>
        booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        booking.order_id.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBookings(filtered);
    setCurrentPage(1);
  }, [searchQuery, pendingBookings]);

  const handlePayment = (bookingId) => {
    const booking = pendingBookings.find((b) => b.id === bookingId);
    setSelectedBooking(booking);
    setPaymentMethod('');
    setAmountPaid('');
    setSelectedAdmin('');
    setSelectedBankAccount('');
    setBankAccounts([]);
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
        payment_method: paymentMethod,
        amount_paid: newAmountPaid,
        admin_id: selectedAdmin,
        bank_account: paymentMethod === 'bank' ? selectedBankAccount : null,
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
    setSelectedBankAccount('');
    setBankAccounts([]);
    setIsModalOpen(false);
  };

  const getBalance = (booking) => {
    const total = parseFloat(booking.total) || 0;
    const paid = parseFloat(booking.amount_paid) || 0;
    return total - paid >= 0 ? total - paid : 0;
  };

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[0%] hundred:ml-[1%]">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100 mobile:text-2xl hundred:text-3xl">
            Pending Transactions
          </h1>
          <div className="mb-6">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Customer Name or Order ID"
              className="p-2 border border-gray-300 dark:border-gray-600 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg mobile:text-sm hundred:text-base"
            />
          </div>
          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300 mobile:text-sm hundred:text-base">
              {error}
            </div>
          )}
          {filteredBookings.length === 0 && searchQuery && (
            <p className="text-gray-700 dark:text-gray-300 text-center">No bookings found matching your search.</p>
          )}
          <div className="grid grid-cols-1 gap-4 hundred:gap-x-50 mobile:grid-cols-1 tab:grid-cols-2 hundred:grid-cols-4">
            {currentBookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow hover:shadow-lg transition-shadow hundred:w-70 mobile:p-2 hundred:p-3"
              >
                <p className="text-gray-900 dark:text-gray-100 mobile:text-sm hundred:text-base">
                  <strong>Order ID:</strong> {booking.order_id}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mobile:text-sm hundred:text-base">
                  <strong>Customer:</strong> {booking.customer_name}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mobile:text-sm hundred:text-base">
                  <strong>Total:</strong> Rs.{booking.total || '0.00'}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mobile:text-sm hundred:text-base">
                  <strong>Paid:</strong> Rs.{booking.amount_paid || '0.00'}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mobile:text-sm hundred:text-base">
                  <strong>Balance:</strong> Rs.{getBalance(booking).toFixed(2)}
                </p>
                <p className="text-gray-900 dark:text-gray-100 mobile:text-sm hundred:text-base">
                  <strong>Status:</strong> {booking.status}
                </p>
                <div className="mt-2 flex justify-center gap-2 mobile:gap-1 hundred:gap-2">
                  <button
                    onClick={() => handlePayment(booking.id)}
                    className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded hover:bg-blue-700 dark:hover:bg-blue-600 mobile:text-xs hundred:text-sm mobile:p-1 hundred:p-2"
                  >
                    Make Payment
                  </button>
                  <button
                    onClick={() => fetchPaymentHistory(booking.id)}
                    className="bg-green-600 dark:bg-green-500 text-white p-2 rounded hover:bg-green-700 dark:hover:bg-green-600 mobile:text-xs hundred:text-sm mobile:p-1 hundred:p-2"
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => paginate(page)}
                  className={`mx-1 px-3 py-1 rounded ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  } hover:bg-blue-700 mobile:text-xs hundred:text-sm mobile:px-2 mobile:py-1 hundred:px-3 hundred:py-1`}
                >
                  {page}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
              Make Payment - Order {selectedBooking.order_id}
            </h2>
            {error && (
              <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300">
                {error}
              </div>
            )}
            <p className="text-gray-900 dark:text-gray-100">
              Remaining Balance: Rs.{getBalance(selectedBooking).toFixed(2)}
            </p>
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
              onChange={(e) => {
                setSelectedAdmin(e.target.value);
                setSelectedBankAccount('');
              }}
              className="p-2 border border-gray-300 dark:border-gray-600 mb-4 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select Admin</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.username}
                </option>
              ))}
            </select>
            {paymentMethod === 'bank' && selectedAdmin && bankAccounts.length > 0 && (
              <select
                value={selectedBankAccount}
                onChange={(e) => setSelectedBankAccount(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 mb-4 w-full bg-white dark:bg-gray-800 text.gray-900 dark:text-gray-100"
                required
              >
                <option value="">Select Bank Account</option>
                {bankAccounts.map((account, index) => (
                  <option key={index} value={account}>
                    {account}
                  </option>
                ))}
              </select>
            )}
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

      {isHistoryModalOpen && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/40 flex items-center justify-center z-50">
          <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Payment History</h2>
            <button
              onClick={() => setIsHistoryModalOpen(false)}
              className="absolute top-2 right-4 text-gray-700 dark:text-gray-300 text-lg"
            >
              ✕
            </button>
            {paymentHistory.length === 0 ? (
              <p className="text-gray-700 dark:text-gray-300">No transactions found.</p>
            ) : (
              <table className="w-full border-collapse text-sm mt-4">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="p-2 text-left text-gray-900 dark:text-gray-100">Date</th>
                    <th className="p-2 text-left text-gray-900 dark:text-gray-100">Amount</th>
                    <th className="p-2 text-left text-gray-900 dark:text-gray-100">Method</th>
                    <th className="p-2 text-left text-gray-900 dark:text-gray-100">Bank Account</th>
                  </tr>
                </thead>
                <tbody>
                  {paymentHistory.map((txn, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2 text-gray-900 dark:text-gray-100">
                        {new Date(txn.transaction_date).toLocaleString()}
                      </td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">Rs.{txn.amount_paid}</td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">{txn.payment_method}</td>
                      <td className="p-2 text-gray-900 dark:text-gray-100">{txn.bank_account || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}