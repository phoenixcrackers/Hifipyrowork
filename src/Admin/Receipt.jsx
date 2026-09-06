import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../Config";
import Sidebar from "./Sidebar/Sidebar";
import Logout from "./Logout";
import { FaUserShield, FaUniversity, FaMoneyBillWave, FaPlus, FaTimes, FaExchangeAlt, FaCalendarAlt } from "react-icons/fa";

export default function Receipt() {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState("");
  const [loadingAdmins, setLoadingAdmins] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [newBankName, setNewBankName] = useState("");
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransactionType, setSelectedTransactionType] = useState("");
  const loggedInUsername = localStorage.getItem("username");

  const fetchAdmins = async () => {
    setLoadingAdmins(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/admins`);
      const transformedAdmins = response.data.map((admin) => ({
        ...admin,
        bank_name: Array.isArray(admin.bank_name) ? admin.bank_name : admin.bank_name ? [admin.bank_name] : [],
      }));
      setAdmins(transformedAdmins);
    } catch (err) {
      setError("Failed to fetch admins. Please try again later.");
      console.error("Error fetching admins:", err.message);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchTransactions = async (adminId) => {
    setLoadingTransactions(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/admins/${adminId}/transactions`);
      setTransactions(response.data);
    } catch (err) {
      setError("Failed to fetch transactions.");
      console.error("Error fetching transactions:", err.message);
    } finally {
      setLoadingTransactions(false);
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
      setError("Failed to fetch bank accounts.");
      console.error("Error fetching bank accounts:", err.message);
    }
  };

  const addBankAccount = async (e) => {
    e.preventDefault();
    if (!loggedInUsername || !newBankName.trim()) return;
    try {
      await axios.post(`${API_BASE_URL}/api/hifi/admins/bank-accounts`, { username: loggedInUsername, bank_name: newBankName.trim() });
      setNewBankName("");
      setShowAddBankForm(false);
      if (selectedAdmin?.username === loggedInUsername) {
        fetchBankAccounts(loggedInUsername);
      }
      fetchAdmins();
    } catch (err) {
      setError("Failed to add bank account.");
      console.error("Error adding bank account:", err.message);
    }
  };

  useEffect(() => {
    fetchAdmins();
    if (loggedInUsername && selectedAdmin?.username === loggedInUsername) {
      fetchBankAccounts(loggedInUsername);
    }
  }, [selectedAdmin, loggedInUsername]);

  const handleAdminSelect = (admin) => {
    setSelectedAdmin(admin);
    fetchTransactions(admin.id);
    if (admin.username === loggedInUsername) {
      fetchBankAccounts(admin.username);
    }
    setSelectedTransactionType("");
    setIsTransactionModalOpen(false);
  };

  const handleTransactionTypeSelect = (type) => {
    setSelectedTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setSelectedTransactionType("");
  };

  const filteredTransactions = selectedTransactionType === "cash"
    ? transactions.filter((tx) => tx.payment_method === "cash")
    : selectedTransactionType
    ? transactions.filter((tx) => tx.bank_name === selectedTransactionType)
    : transactions;

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
                  Admin Collections & Bank Accounts
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage administrator bank accounts, view payment transactions received by each admin, and monitor cash receipts
                </p>
              </div>
              {loggedInUsername && (
                <button
                  onClick={() => setShowAddBankForm(true)}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition"
                >
                  <FaPlus className="text-xs" /> Link Bank Account
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200 flex justify-between items-center">
                <span>{error}</span>
                <button onClick={fetchAdmins} className="text-xs font-bold underline ml-4">Retry</button>
              </div>
            )}
          </div>

          {/* Admins Card Grid */}
          {loadingAdmins ? (
            <div className="text-center py-12 text-gray-500">Loading administrators...</div>
          ) : admins.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No admins found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {admins.map((admin) => {
                const isSelected = selectedAdmin?.id === admin.id;
                const isMe = admin.username === loggedInUsername;

                return (
                  <div
                    key={admin.id}
                    className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border transition-all flex flex-col justify-between shadow-sm ${
                      isSelected
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                        : 'border-gray-200/80 dark:border-gray-700/80 hover:shadow-md'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center font-bold">
                            <FaUserShield />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-1.5">
                              {admin.username}
                              {isMe && <span className="text-[10px] bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-bold px-1.5 py-0.5 rounded">You</span>}
                            </h3>
                            <span className="text-xs text-gray-400">Admin Account</span>
                          </div>
                        </div>
                        <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-gray-600 dark:text-gray-300">
                          ID: #{admin.id}
                        </span>
                      </div>

                      {/* Collection total */}
                      <div className="bg-gray-50 dark:bg-gray-900/60 p-3.5 rounded-xl border border-gray-100 dark:border-gray-800 mb-3">
                        <span className="text-xs text-gray-500 font-medium">Recorded Collections</span>
                        <div className="text-2xl font-extrabold text-emerald-600 mt-0.5">
                          ₹{Number(admin.total || 0).toFixed(2)}
                        </div>
                      </div>

                      {/* Bank accounts */}
                      <div className="mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 block mb-1.5">
                          Linked Accounts:
                        </span>
                        {admin.bank_name && admin.bank_name.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {admin.bank_name.map((b, idx) => (
                              <span key={idx} className="text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                                {b}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No bank account linked</span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700 flex gap-2">
                      <button
                        onClick={() => handleAdminSelect(admin)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200'
                        }`}
                      >
                        <FaExchangeAlt className="text-xs" />
                        {isSelected ? 'Viewing Logs' : 'View Transactions'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Bank Account Modal */}
          {showAddBankForm && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[9999]">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FaUniversity className="text-emerald-600" /> Link New Bank Account
                  </h2>
                  <button onClick={() => setShowAddBankForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                <form onSubmit={addBankAccount} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                      Bank Name / Account Alias
                    </label>
                    <input
                      type="text"
                      value={newBankName}
                      onChange={(e) => setNewBankName(e.target.value)}
                      placeholder="e.g. HDFC Bank - 1234 or GPay / PhonePe"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setShowAddBankForm(false)}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                    >
                      Save Account
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Selected Admin Transactions Section */}
          {selectedAdmin && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-700">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Collection History for {selectedAdmin.username}
                  </h2>
                  <p className="text-xs text-gray-500">
                    Total Transactions: {transactions.length}
                  </p>
                </div>

                {/* Filter Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Filter Mode:</span>
                  <select
                    value={selectedTransactionType}
                    onChange={(e) => setSelectedTransactionType(e.target.value)}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-xs font-semibold focus:outline-none"
                  >
                    <option value="">All Transactions</option>
                    <option value="cash">Cash Only</option>
                    {bankAccounts.map((bank, index) => (
                      <option key={index} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Transactions Table */}
              {loadingTransactions ? (
                <div className="text-center py-8 text-gray-400">Loading records...</div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">No transaction records found for this selection.</div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-900/60 text-gray-600 dark:text-gray-400 font-bold border-b border-gray-200 dark:border-gray-700">
                        <th className="p-3">Customer</th>
                        <th className="p-3">Amount Received</th>
                        <th className="p-3">Method</th>
                        <th className="p-3">Bank / Account</th>
                        <th className="p-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {filteredTransactions.map((tx, idx) => (
                        <tr key={tx.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                          <td className="p-3 font-semibold text-gray-900 dark:text-white">
                            {tx.customer_name || "Direct Customer"}
                          </td>
                          <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">
                            ₹{Number(tx.amount_paid || 0).toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              tx.payment_method === 'cash'
                                ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                                : 'bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300'
                            }`}>
                              {tx.payment_method}
                            </span>
                          </td>
                          <td className="p-3 font-mono text-gray-500">
                            {tx.bank_name || "-"}
                          </td>
                          <td className="p-3 text-gray-500">
                            {tx.transaction_date
                              ? new Date(tx.transaction_date).toLocaleDateString("en-GB", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })
                              : "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}