import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function Ledger() {
  const [admins, setAdmins] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [error, setError] = useState('');

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admins`);
      setAdmins(response.data);
    } catch (err) {
      setError('Failed to fetch admins');
    }
  };

  const fetchTransactions = async (adminId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/admins/${adminId}/transactions`);
      setTransactions(response.data);
    } catch (err) {
      setError('Failed to fetch transactions');
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%]">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Ledger</h1>
          {error && <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
            {admins.map(admin => (
              <div key={admin.id} className="bg-white dark:bg-gray-800 p-4 rounded shadow border border-gray-300 dark:border-gray-600">
                <h3 className="text-gray-900 dark:text-gray-100">Name: {admin.username}</h3>
                <p className="text-gray-900 dark:text-gray-100">Total: Rs.{admin.total || '0.00'}</p>
                <button
                  onClick={() => { setSelectedAdmin(admin); fetchTransactions(admin.id); }}
                  className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded mt-2 hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  View Transactions
                </button>
              </div>
            ))}
          </div>
          {selectedAdmin && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded">
              <h2 className="text-gray-900 dark:text-gray-100">Transactions for {selectedAdmin.username}</h2>
              <table className="w-full border-collapse mt-2">
                <thead>
                  <tr className="bg-gray-200 dark:bg-gray-700">
                    <th className="p-2 text-center text-gray-900 dark:text-gray-100">Customer Name</th>
                    <th className="p-2 text-center text-gray-900 dark:text-gray-100">Amount Paid</th>
                    <th className="p-2 text-center text-gray-900 dark:text-gray-100">Transaction Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600">
                      <td className="p-2 text-center text-gray-900 dark:text-gray-100">{tx.customer_name}</td>
                      <td className="p-2 text-center text-gray-900 dark:text-gray-100">Rs.{tx.amount_paid}</td>
                      <td className="p-2 text-center text-gray-900 dark:text-gray-100">{new Date(tx.transaction_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}