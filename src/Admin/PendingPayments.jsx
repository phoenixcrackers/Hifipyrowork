import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';
import { FaMoneyBillWave, FaHistory, FaSearch, FaCreditCard, FaBan, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

export default function PendingPayments() {
  const [pendingBookings, setPendingBookings] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [selectedAdmin, setSelectedAdmin] = useState('');
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [bankAccounts, setBankAccounts] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const itemsPerPage = 9;

  const fetchPendingBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/tracking/bookings`);
      const pending = response.data.filter(
        (booking) =>
          booking.status !== 'delivered' &&
          booking.status !== 'cancelled' &&
          booking.status !== 'canceled' &&
          (booking.status === 'booked' ||
            (parseFloat(booking.total) || 0) > (parseFloat(booking.amount_paid) || 0))
      );
      setPendingBookings(pending);
    } catch (err) {
      setError('Failed to fetch pending bookings');
    }
  };

  const fetchPaymentHistory = async (booking) => {
    setSelectedBooking(booking);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/transactions/${booking.id}`);
      setPaymentHistory(response.data);
      setIsHistoryModalOpen(true);
    } catch (err) {
      setError('Failed to fetch payment history');
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/admins`);
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to fetch admins');
    }
  };

  const fetchBankAccounts = async (username) => {
    try {
      if (username) {
        const response = await axios.get(`${API_BASE_URL}/api/hifi/admins/${username}/bank-accounts`);
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

  const handlePayment = (booking) => {
    setSelectedBooking(booking);
    setPaymentMethod('');
    setAmountPaid('');
    setSelectedAdmin('');
    setSelectedBankAccount('');
    setBankAccounts([]);
    setError('');
    setIsModalOpen(true);
  };

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Cancel order ${booking.order_id} for ${booking.customer_name}? All items in this bill will be immediately restocked.`)) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      const response = await axios.patch(`${API_BASE_URL}/api/hifi/dbooking/${booking.order_id}/cancel`);
      setSuccess(response.data.message || `Order ${booking.order_id} cancelled and stock restored!`);
      await fetchPendingBookings();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to cancel: ${err.response?.data?.message || err.message}`);
    }
  };

  const confirmPayment = async () => {
    if (!paymentMethod || !amountPaid || !selectedAdmin) {
      setError('Please fill all required fields, including admin selection');
      return;
    }

    const balance = getBalance(selectedBooking);
    const newAmountPaid = parseFloat(amountPaid);
    if (isNaN(newAmountPaid) || newAmountPaid <= 0) {
      setError('Please enter a valid positive payment amount');
      return;
    }
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
      await axios.patch(`${API_BASE_URL}/api/hifi/tracking/bookings/${selectedBooking.id}/status`, payload);
      setSuccess(`Payment of ₹${newAmountPaid.toFixed(2)} recorded successfully!`);
      fetchPendingBookings();
      setSelectedBooking(null);
      setIsModalOpen(false);
      setError('');
      setTimeout(() => setSuccess(''), 5000);
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
    setIsHistoryModalOpen(false);
  };

  const getBalance = (booking) => {
    if (!booking) return 0;
    const total = parseFloat(booking.total) || 0;
    const paid = parseFloat(booking.amount_paid) || 0;
    return total - paid >= 0 ? total - paid : 0;
  };

  const filteredBookings = useMemo(() => {
    return pendingBookings.filter(
      (booking) =>
        (booking.customer_name && booking.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (booking.order_id && booking.order_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (booking.mobile_number && booking.mobile_number.includes(searchQuery))
    );
  }, [pendingBookings, searchQuery]);

  const metrics = useMemo(() => {
    let totalExpected = 0;
    let totalReceived = 0;
    pendingBookings.forEach((b) => {
      totalExpected += parseFloat(b.total) || 0;
      totalReceived += parseFloat(b.amount_paid) || 0;
    });
    const totalOutstanding = Math.max(0, totalExpected - totalReceived);
    return { totalExpected, totalReceived, totalOutstanding, count: pendingBookings.length };
  }, [pendingBookings]);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage) || 1;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 hundred:ml-64 onefifty:ml-1 p-3 sm:p-6 md:p-8 pt-16 sm:pt-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6 min-w-0 w-full">

          {/* Header & Metrics */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  Outstanding Balances & Collections
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Track unpaid orders, record cash/bank receipts, view transaction history, or cancel bills with automatic restocking
                </p>
              </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl">
                <span className="text-xs text-gray-500 font-medium">Pending Orders</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{metrics.count}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800/40">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Total Outstanding</span>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300">₹{metrics.totalOutstanding.toFixed(2)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Collected So Far</span>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">₹{metrics.totalReceived.toFixed(2)}</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-800/40">
                <span className="text-xs text-blue-700 dark:text-blue-400 font-medium">Total Bill Volume</span>
                <p className="text-xl font-bold text-blue-700 dark:text-blue-300">₹{metrics.totalExpected.toFixed(2)}</p>
              </div>
            </div>

            {error && !isModalOpen && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200">{error}</div>
            )}
            {success && (
              <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-200">{success}</div>
            )}
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Order ID (e.g. 2026ORD1), Customer Name, Mobile..."
              className="w-full pl-10 pr-9 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <FaSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-4" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Card Grid */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FaCheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3 opacity-60" />
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">All pending payments cleared or no matching orders!</p>
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="mt-2 text-sm text-blue-600 font-bold underline">
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentBookings.map((booking) => {
                const total = parseFloat(booking.total) || 0;
                const paid = parseFloat(booking.amount_paid) || 0;
                const balance = getBalance(booking);
                const progressPct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

                return (
                  <div
                    key={booking.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-200/80 dark:border-gray-700/80 p-5 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                          {booking.order_id}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          paid === 0
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {paid === 0 ? 'Unpaid' : `Partially Paid (${progressPct}%)`}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">
                        {booking.customer_name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">{booking.district || ''} {booking.state || ''}</p>

                      {/* Payment progress visual */}
                      <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-3">
                        <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          <span>Paid: <strong className="text-emerald-600">₹{paid.toFixed(2)}</strong></span>
                          <span>Balance: <strong className="text-rose-600">₹{balance.toFixed(2)}</strong></span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                        <div className="text-[11px] text-gray-400 text-right mt-1 font-medium">
                          Total Bill: ₹{total.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handlePayment(booking)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                        >
                          <FaCreditCard className="text-xs" /> Record Payment
                        </button>
                        <button
                          onClick={() => fetchPaymentHistory(booking)}
                          className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                        >
                          <FaHistory className="text-xs" /> History
                        </button>
                      </div>
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-rose-200 dark:border-rose-900"
                      >
                        <FaBan className="text-xs" /> Cancel Bill & Restock Products
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              {[...Array(totalPages).keys()].map((page) => (
                <button
                  key={page + 1}
                  onClick={() => setCurrentPage(page + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                    currentPage === page + 1
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {page + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {/* Record Payment Modal */}
          {isModalOpen && selectedBooking && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Record Payment</h2>
                    <p className="text-xs text-gray-500">Order: {selectedBooking.order_id} &bull; {selectedBooking.customer_name}</p>
                  </div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">{error}</div>}

                <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-4 text-xs">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Total Order Amount:</span>
                    <span className="font-bold">₹{Number(selectedBooking.total || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-500">Already Paid:</span>
                    <span className="font-bold text-emerald-600">₹{Number(selectedBooking.amount_paid || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-700 font-bold">
                    <span className="text-gray-700 dark:text-gray-300">Remaining Balance:</span>
                    <span className="text-rose-600 text-sm">₹{getBalance(selectedBooking).toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="">Select Payment Method</option>
                      <option value="cash">Cash in Hand</option>
                      <option value="bank">Bank Transfer / UPI / Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Collecting Admin
                    </label>
                    <select
                      value={selectedAdmin}
                      onChange={(e) => setSelectedAdmin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    >
                      <option value="">Select Receiving Admin</option>
                      {admins.map((admin) => (
                        <option key={admin.id} value={admin.id}>{admin.username}</option>
                      ))}
                    </select>
                  </div>

                  {paymentMethod === 'bank' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                        Deposit Bank Account
                      </label>
                      <select
                        value={selectedBankAccount}
                        onChange={(e) => setSelectedBankAccount(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                      >
                        <option value="">Select Account</option>
                        {bankAccounts.map((acc, idx) => (
                          <option key={idx} value={acc}>{acc}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1">
                      Amount Paid (₹)
                    </label>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      placeholder={`Max: ₹${getBalance(selectedBooking).toFixed(2)}`}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                    />
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmPayment}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                  >
                    Confirm Payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Payment History Modal */}
          {isHistoryModalOpen && selectedBooking && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Transaction Logs</h2>
                    <p className="text-xs text-gray-500">Order: {selectedBooking.order_id} &bull; {selectedBooking.customer_name}</p>
                  </div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {paymentHistory.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-sm">No transaction entries found for this order.</p>
                  ) : (
                    paymentHistory.map((tx) => (
                      <div key={tx.id} className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            ₹{Number(tx.amount_paid).toFixed(2)}
                          </span>
                          <span className="ml-2 uppercase text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                            {tx.payment_method}
                          </span>
                          <p className="text-gray-400 text-[11px] mt-1">
                            Date: {new Date(tx.transaction_date).toLocaleString('en-GB')}
                          </p>
                        </div>
                        {tx.bank_name && (
                          <span className="text-[11px] font-mono text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                            {tx.bank_name}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}