import { useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../../Config";
import Sidebar from "./Sidebar/Sidebar";
import Logout from "./Logout";

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
      const response = await axios.get(`${API_BASE_URL}/api/admins`);
      const transformedAdmins = response.data.map((admin) => ({
        ...admin,
        bank_name: Array.isArray(admin.bank_name) ? admin.bank_name : admin.bank_name ? [admin.bank_name] : [],
      }));
      setAdmins(transformedAdmins);
    } catch (err) {
      setError("Failed to fetch admins. Please try again later.");
      console.error("Error fetching admins:", err.message, err.response?.data);
    } finally {
      setLoadingAdmins(false);
    }
  };

  const fetchTransactions = async (adminId) => {
    setLoadingTransactions(true);
    setError("");
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admins/${adminId}/transactions`);
      console.log("Transactions response:", response.data);
      setTransactions(response.data);
    } catch (err) {
      setError("Failed to fetch transactions. Please try again later.");
      console.error("Error fetching transactions:", err.message, err.response?.data);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const fetchBankAccounts = async (username) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admins/${username}/bank-accounts`);
      setBankAccounts(response.data || []);
    } catch (err) {
      setError("Failed to fetch bank accounts. Please try again later.");
      console.error("Error fetching bank accounts:", err.message);
    }
  };

  const addBankAccount = async (e) => {
    e.preventDefault();
    if (!loggedInUsername || !newBankName) return;
    try {
      await axios.post(`${API_BASE_URL}/api/admins/bank-accounts`, { username: loggedInUsername, bank_name: newBankName });
      setNewBankName("");
      setShowAddBankForm(false);
      if (selectedAdmin?.username === loggedInUsername) {
        fetchBankAccounts(loggedInUsername);
      }
    } catch (err) {
      setError("Failed to add bank account. Please try again later.");
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
    console.log("Selected admin:", admin);
    setSelectedAdmin(admin);
    fetchTransactions(admin.id);
    if (admin.username === loggedInUsername) {
      fetchBankAccounts(admin.username);
    }
    setSelectedTransactionType("");
    setIsTransactionModalOpen(false);
  };

  const handleRetry = () => {
    if (selectedAdmin) {
      fetchTransactions(selectedAdmin.id);
      if (selectedAdmin.username === loggedInUsername) {
        fetchBankAccounts(selectedAdmin.username);
      }
    } else {
      fetchAdmins();
    }
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
    : transactions.filter((tx) => tx.bank_name === selectedTransactionType);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center hundred:ml-64">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Receipt</h1>
          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300 rounded flex justify-between items-center">
              <span>{error}</span>
              <button onClick={handleRetry} className="text-blue-600 dark:text-blue-400 hover:underline ml-4">
                Retry
              </button>
            </div>
          )}
          {loadingAdmins ? (
            <div className="text-center text-gray-600 dark:text-gray-300">Loading admins...</div>
          ) : admins.length === 0 ? (
            <div className="text-center text-gray-600 dark:text-gray-300">No admins found.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
              {admins.map((admin) => (
                <div
                  key={admin.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                >
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Name: {admin.username}</h3>
                  <p className="text-gray-900 dark:text-gray-100">
                    Bank: {Array.isArray(admin.bank_name) ? admin.bank_name.join(", ") : admin.bank_name || "N/A"}
                  </p>
                  <p className="text-gray-900 dark:text-gray-100">
                    Total: Rs.{Number.parseFloat(admin.total || 0).toFixed(2)}
                  </p>
                  {admin.username === loggedInUsername && (
                    <button
                      onClick={() => setShowAddBankForm(true)}
                      className="bg-green-600 text-white p-2 rounded mt-2 hover:bg-green-700 transition"
                    >
                      Add Bank Account
                    </button>
                  )}
                  <button
                    onClick={() => handleAdminSelect(admin)}
                    className={`bg-blue-600 dark:bg-blue-500 text-white p-2 rounded mt-2 hover:bg-blue-700 dark:hover:bg-blue-600 transition ${
                      selectedAdmin?.id === admin.id ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={selectedAdmin?.id === admin.id}
                  >
                    {selectedAdmin?.id === admin.id ? "Selected" : "View Transactions"}
                  </button>
                </div>
              ))}
            </div>
          )}
          {loggedInUsername && showAddBankForm && (
            <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded shadow border border-gray-300 dark:border-gray-100">
              <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Add Bank Account</h2>
              <form onSubmit={addBankAccount} className="space-y-4">
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="Enter bank name"
                  className="w-full p-2 rounded border border-gray-300 dark:border-gray-600 dark:text-gray-100"
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddBankForm(false)}
                    className="bg-red-600 text-white p-2 rounded hover:bg-red-700 transition"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
          {selectedAdmin && (
            <div className="mt-8 p-6 bg-white dark:bg-gray-800 rounded shadow border border-gray-300 dark:border-gray-600">
              <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
                Transactions for {selectedAdmin.username}
              </h2>
              <select
                value={selectedTransactionType}
                onChange={(e) => handleTransactionTypeSelect(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 mb-4 w-full bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              >
                <option value="">Select Transaction Type</option>
                <option value="cash">Cash</option>
                {bankAccounts.map((bank, index) => (
                  <option key={index} value={bank}>{bank}</option>
                ))}
              </select>
            </div>
          )}
          {isTransactionModalOpen && (
            <div className="fixed inset-0 bg-black/50 dark:bg-black/40 flex items-center justify-center z-50">
              <div className="relative bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-4xl">
                <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
                  {selectedTransactionType === "cash" ? "Cash Transactions" : `${selectedTransactionType} Transactions`} for {selectedAdmin.username}
                </h2>
                <button
                  onClick={closeTransactionModal}
                  className="absolute top-2 right-4 text-gray-700 dark:text-gray-300 text-lg"
                >
                  ✕
                </button>
                {loadingTransactions ? (
                  <div className="text-center text-gray-600 dark:text-gray-300">Loading transactions...</div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="text-center text-gray-600 dark:text-gray-300">
                    No {selectedTransactionType === "cash" ? "cash" : "bank"} transactions found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-200 dark:bg-gray-700">
                          <th className="p-3 text-center text-gray-900 dark:text-gray-100">Customer Name</th>
                          <th className="p-3 text-center text-gray-900 dark:text-gray-100">Amount Paid</th>
                          <th className="p-3 text-center text-gray-900 dark:text-gray-100">Payment Method</th>
                          <th className="p-3 text-center text-gray-900 dark:text-gray-100">Bank Name</th>
                          <th className="p-3 text-center text-gray-900 dark:text-gray-100">Transaction Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((tx) => (
                          <tr
                            key={tx.id || `${tx.transaction_date}_${tx.amount_paid}`}
                            className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition"
                          >
                            <td className="p-3 text-center text-gray-900 dark:text-gray-100">{tx.customer_name || "N/A"}</td>
                            <td className="p-3 text-center text-gray-900 dark:text-gray-100">
                              Rs.{Number.parseFloat(tx.amount_paid || 0).toFixed(2)}
                            </td>
                            <td className="p-3 text-center text-gray-900 dark:text-gray-100">{tx.payment_method || "N/A"}</td>
                            <td className="p-3 text-center text-gray-900 dark:text-gray-100">{tx.bank_name || "N/A"}</td>
                            <td className="p-3 text-center text-gray-900 dark:text-gray-100">
                              {tx.transaction_date
                                ? new Date(tx.transaction_date).toLocaleDateString("en-GB", {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}