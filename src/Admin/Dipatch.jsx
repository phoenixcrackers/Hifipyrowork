import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function Dispatch() {
  const [bookings, setBookings] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [transportType, setTransportType] = useState('');
  const [transportName, setTransportName] = useState('');
  const [transportContact, setTransportContact] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [error, setError] = useState('');

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings?status=paid`);
      setBookings(response.data);
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleDispatch = async () => {
    try {
      const payload = { status: 'dispatched' };
      if (transportType) {
        payload.transport_type = transportType;
        if (transportType === 'transport') {
          payload.transport_name = transportName;
          payload.transport_contact = transportContact;
          payload.lr_number = lrNumber;
        }
      }

      await axios.patch(`${API_BASE_URL}/api/tracking/bookings/${selectedBooking.id}/status`, payload);
      fetchBookings();
      setSelectedBooking(null);
      setError('');
    } catch (err) {
      setError('Failed to update status');
    }
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
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800">Dispatch</h1>
          {error && <div className="bg-red-100 p-2 mb-4 text-red-700">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white p-4 rounded shadow">
                <h3>Order ID: {booking.order_id}</h3>
                <p>Customer: {booking.customer_name}</p>
                <p>Total: Rs.{booking.total || '0.00'}</p>
                <p>Amount Paid: Rs.{booking.amount_paid || '0.00'}</p>
                <p>Balance: Rs.{getBalance(booking).toFixed(2)}</p>
                <button
                  onClick={() => setSelectedBooking(booking)}
                  className="bg-blue-600 text-white p-2 rounded mt-2"
                >
                  Dispatch
                </button>
              </div>
            ))}
          </div>
          {selectedBooking && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h2>Dispatch Order: {selectedBooking.order_id}</h2>
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                className="p-1 border mb-2"
              >
                <option value="">Select Transport Type</option>
                <option value="own">Own</option>
                <option value="transport">Transport</option>
              </select>
              {transportType === 'transport' && (
                <>
                  <input
                    type="text"
                    value={transportName}
                    onChange={(e) => setTransportName(e.target.value)}
                    placeholder="Transport Name"
                    className="p-1 border mb-2 w-full"
                  />
                  <input
                    type="text"
                    value={transportContact}
                    onChange={(e) => setTransportContact(e.target.value)}
                    placeholder="Contact Number"
                    className="p-1 border mb-2 w-full"
                  />
                  <input
                    type="text"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    placeholder="LR Number"
                    className="p-1 border mb-2 w-full"
                  />
                </>
              )}
              <button
                onClick={handleDispatch}
                className="bg-green-600 text-white p-2 rounded"
              >
                Confirm Dispatch
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}