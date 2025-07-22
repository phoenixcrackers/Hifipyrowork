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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [productDispatches, setProductDispatches] = useState({});

  const cardsPerPage = 9;

  const getParsedProducts = (booking) => {
    let products = booking.products;
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch {
        products = [];
      }
    }
    return products;
  };

  const getTotalQty = (booking) => {
    const products = getParsedProducts(booking);
    return products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
      const filtered = response.data.filter((b) => {
        const totalQty = getTotalQty(b);
        const dispatched = b.dispatched_qty || 0;
        return b.status === 'booked' || (b.status === 'dispatched' && dispatched < totalQty) || b.status === 'paid';
      });
      setBookings(filtered);
    } catch (err) {
      setError('Failed to fetch bookings');
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

const handleDispatch = async () => {
  const products = getParsedProducts(selectedBooking);

  const toDispatch = products.map((product, index) => {
    const already = parseInt(product.dispatched || 0);
    const qty = parseInt(productDispatches[index]) || 0;
    const remaining = parseInt(product.quantity) - already;
    const price = parseFloat(product.price) || 0;
    const discount = parseFloat(product.discount || 0);
    const dispatchQty = Math.min(qty, remaining);
    const productTotal = (price - (price * discount / 100)) * dispatchQty;
    return {
      index,
      dispatch_qty: dispatchQty,
      total: productTotal.toFixed(2),
    };
  }).filter(p => p.dispatch_qty > 0);

  if (toDispatch.length === 0) {
    setError('Please enter valid dispatch quantities for at least one product');
    return;
  }

  try {
    const payload = {
      status: 'dispatched',
      products: toDispatch,
    };

    if (transportType) {
      payload.transport_type = transportType;
      if (transportType === 'transport') {
        payload.transport_name = transportName;
        payload.transport_contact = transportContact;
        payload.lr_number = lrNumber;
      }
    }

    console.log('Dispatch Payload:', payload); // Add for debugging

    await axios.patch(
      `${API_BASE_URL}/api/tracking/bookings/order/${selectedBooking.order_id}/status`,
      payload
    );

    await fetchBookings();
    setSelectedBooking(null);
    setTransportType('');
    setTransportName('');
    setTransportContact('');
    setLrNumber('');
    setProductDispatches({});
    setError('');
  } catch (err) {
    setError(`Failed to update dispatch status: ${err.response?.data?.error || err.message}`);
  }
};

  const handleProductDispatchChange = (index, value, maxQty) => {
    const qty = parseInt(value) || 0;
    if (qty <= maxQty) {
      setProductDispatches((prev) => ({ ...prev, [index]: qty }));
    }
  };

  const getBalance = (booking) => {
    const total = parseFloat(booking.total) || 0;
    const paid = parseFloat(booking.amount_paid) || 0;
    return total - paid >= 0 ? total - paid : 0;
  };

  const filteredBookings = bookings.filter((booking) => {
    const search = searchTerm.toLowerCase();
    const total = (parseFloat(booking.total) || 0).toFixed(2);
    const paid = (parseFloat(booking.amount_paid) || 0).toFixed(2);
    const balance = getBalance(booking).toFixed(2);
    const dispatched = (booking.dispatched_qty || 0).toString();
    const remaining = (getTotalQty(booking) - parseInt(dispatched)).toString();

    return (
      booking.order_id?.toLowerCase().includes(search) ||
      booking.customer_name?.toLowerCase().includes(search) ||
      total.includes(search) ||
      paid.includes(search) ||
      balance.includes(search) ||
      dispatched.includes(search) ||
      remaining.includes(search)
    );
  });

  const totalPages = Math.ceil(filteredBookings.length / cardsPerPage);
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstCard, indexOfLastCard);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%] p-6">
        <div className="w-full max-w-5xl">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Dispatch</h1>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search by Order ID, Customer, Total, etc."
            className="mb-6 w-full p-3 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />

          {error && (
            <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300 rounded">{error}</div>
          )}

          {filteredBookings.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No paid bookings available</p>
          ) : (
            <>
              <div className="grid grid-cols-3 mobile:grid-cols-1 onefifty:grid-cols-3 gap-4">
                {currentBookings.map((booking) => {
                  const totalQty = getTotalQty(booking);
                  const dispatched = parseInt(booking.dispatched_qty || 0);
                  const remaining = totalQty - dispatched;

                  return (
                    <div
                      key={booking.id}
                      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200 dark:border-gray-600"
                    >
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">Order {booking.order_id}</h3>
                      <div className="space-y-2 mt-2">
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Customer:</span> {booking.customer_name}</p>
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Total:</span> Rs.{(parseFloat(booking.total) || 0).toFixed(2)}</p>
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Amount Paid:</span> Rs.{(parseFloat(booking.amount_paid) || 0).toFixed(2)}</p>
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Balance:</span> Rs.{getBalance(booking).toFixed(2)}</p>
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Dispatched:</span> {dispatched}</p>
                        <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Remaining:</span> {remaining}</p>

                        <button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setProductDispatches({}); // Reset product dispatches
                          }}
                          className="bg-blue-600 dark:bg-blue-500 text-white p-2 rounded mt-2 w-full hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                        >
                          Dispatch
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center items-center gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded text-white ${currentPage === 1 ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'}`}
                >
                  Previous
                </button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 dark:bg-blue-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={handleNext}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded text-white ${currentPage === totalPages ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'}`}
                >
                  Next
                </button>
              </div>
            </>
          )}
          {selectedBooking && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-900 rounded-lg shadow-md">
              <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">
                Dispatch Order: {selectedBooking.order_id}
              </h2>

              {/* Per-product dispatch fields */}
              <div className="space-y-4 mb-4">
                {getParsedProducts(selectedBooking).map((product, index) => {
                  const already = parseInt(product.dispatched || 0);
                  const totalQty = parseInt(product.quantity || 0);
                  const remaining = totalQty - already;
                  const price = parseFloat(product.price) || 0;
                  const discount = parseFloat(product.discount || 0);
                  const dispatchQty = parseInt(productDispatches[index]) || 0;
                  const productTotal = (price - (price * discount / 100)) * dispatchQty;

                  return (
                    <div key={index} className="p-3 border rounded bg-white dark:bg-gray-800">
                      <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                        {product.productname || `Product ${index + 1}`}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total: Rs.{(price * totalQty).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Discount: {discount}%</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Dispatched: {already}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Remaining: {remaining}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                        Dispatch Total: Rs.{productTotal.toFixed(2)}
                      </p>
                      {remaining === 0 ? (
                        <div className="text-green-600 font-medium">Fully Dispatched</div>
                      ) : (
                        <input
                          type="number"
                          min="0"
                          max={remaining}
                          value={productDispatches[index] || ''}
                          onChange={(e) => handleProductDispatchChange(index, e.target.value, remaining)}
                          placeholder="Dispatch Qty"
                          className="p-2 w-full border rounded bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100"
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Transport selection */}
              <select
                value={transportType}
                onChange={(e) => setTransportType(e.target.value)}
                className="p-2 border border-gray-300 dark:border-gray-600 rounded mb-2 w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
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
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded mb-2 w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    value={transportContact}
                    onChange={(e) => setTransportContact(e.target.value)}
                    placeholder="Contact Number"
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded mb-2 w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                  />
                  <input
                    type="text"
                    value={lrNumber}
                    onChange={(e) => setLrNumber(e.target.value)}
                    placeholder="LR Number"
                    className="p-2 border border-gray-300 dark:border-gray-600 rounded mb-2 w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                  />
                </>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="bg-gray-500 dark:bg-gray-400 text-white p-2 rounded hover:bg-gray-600 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatch}
                  className="bg-green-600 dark:bg-green-500 text-white p-2 rounded hover:bg-green-700 dark:hover:bg-green-600"
                >
                  Confirm Dispatch
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}