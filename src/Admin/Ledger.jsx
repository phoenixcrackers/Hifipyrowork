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
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%]">
        <div className="w-full max-w-5xl p-6">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Ledger</h1>
          {error && <div className="bg-red-100 p-2 mb-4 text-red-700">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {admins.map(admin => (
              <div key={admin.id} className="bg-white p-4 rounded shadow">
                <h3>{admin.username}</h3>
                <p>Total: Rs.{admin.total || '0.00'}</p>
                <button
                  onClick={() => { setSelectedAdmin(admin); fetchTransactions(admin.id); }}
                  className="bg-blue-600 text-white p-2 rounded mt-2"
                >
                  View Transactions
                </button>
              </div>
            ))}
          </div>
          {selectedAdmin && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h2>Transactions for {selectedAdmin.username}</h2>
              <table className="w-full border-collapse mt-2">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="p-2 text-center">Customer Name</th>
                    <th className="p-2 text-center">Amount Paid</th>
                    <th className="p-2 text-center">Transaction Date</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(tx => (
                    <tr key={tx.id} className="border-b hover:bg-gray-50">
                      <td className="p-2 text-center">{tx.customer_name}</td>
                      <td className="p-2 text-center">Rs.{tx.amount_paid}</td>
                      <td className="p-2 text-center">{new Date(tx.transaction_date).toLocaleDateString()}</td>
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