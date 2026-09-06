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
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedBooking, setEditedBooking] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState('all');
  const cardsPerPage = 9;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [success, setSuccess] = useState('');

  const handleCancelOrder = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel order ${booking.order_id}? All items will be automatically restocked.`)) {
      return;
    }
    try {
      const res = await axios.patch(`${API_BASE_URL}/api/dbooking/${booking.order_id}/cancel`);
      setSuccess(res.data.message || `Order ${booking.order_id} cancelled and stock restored!`);
      await fetchBookings();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to cancel: ${err.response?.data?.message || err.message}`);
    }
  };

  const handleDeleteBooking = async (bookingId) => {
    if (!window.confirm("Are you sure you want to delete this booking? Associated stock will be restored.")) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/api/dbooking/${bookingId}`);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      setSuccess("Booking deleted successfully and stock restored!");
      setTimeout(() => setSuccess(''), 4000);
      setError(""); 
    } catch (err) {
      console.error("Delete booking error:", err);
      setError("Failed to delete booking");
    }
  };


  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
      const parsedData = response.data.map(b => ({
        ...b,
        products: typeof b.products === 'string' ? JSON.parse(b.products) : b.products,
      }));
      setBookings(parsedData);
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

  const handleView = (booking) => {
    const parsedProducts = typeof booking.products === 'string'
      ? JSON.parse(booking.products)
      : booking.products;
    setEditedBooking({ ...booking, products: parsedProducts });
    setIsViewModalOpen(true);
  };

  const handleEdit = (booking) => {
    const parsedProducts = typeof booking.products === 'string'
      ? JSON.parse(booking.products)
      : booking.products;
    setEditedBooking({ ...booking, products: parsedProducts });
    setIsEditModalOpen(true);
  };

  const saveEditedBooking = async () => {
    try {
      const payload = { products: editedBooking.products };
      await axios.patch(`${API_BASE_URL}/api/dbookings/${editedBooking.id}/edit-products`, payload);
      setIsEditModalOpen(false);
      fetchBookings();
    } catch (err) {
      setError('Failed to update product quantities');
    }
  };

  const uniqueCustomers = Array.from(new Set(bookings.map(b => b.customer_name).filter(Boolean))).sort();

  const filteredBookings = bookings.filter(b => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch = !q ||
      (b.order_id && b.order_id.toLowerCase().includes(q)) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(q));
    const matchesCustomer = customerFilter === 'all' || b.customer_name === customerFilter;
    return matchesSearch && matchesCustomer;
  });

  const totalPages = Math.ceil(filteredBookings.length / cardsPerPage) || 1;
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstCard, indexOfLastCard);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center hundred:ml-64 onefifty:ml-1 p-3 sm:p-6 pt-16 sm:pt-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="w-full max-w-5xl min-w-0">
          <h1 className="text-4xl font-bold mb-4 text-center text-gray-800 dark:text-gray-100">Order Tracking</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            Track orders, view products, update payment status, and download modern invoices
          </p>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by order ID (e.g. 2026ORD1) or customer name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-8 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              />
              <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            <div className="w-full sm:w-64">
              <select
                value={customerFilter}
                onChange={(e) => {
                  setCustomerFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full py-2 px-3 border rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Customers / Users ({uniqueCustomers.length})</option>
                {uniqueCustomers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
          </div>

          {error && <div className="bg-red-100 dark:bg-red-900 p-3 mb-4 text-red-700 dark:text-red-300 rounded-xl text-sm border border-red-300">{error}</div>}
          {success && <div className="bg-green-100 dark:bg-green-900 p-3 mb-4 text-green-700 dark:text-green-300 rounded-xl text-sm border border-green-300">{success}</div>}
          {filteredBookings.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400 py-12">No matching bookings found</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBookings.map(booking => {
                  const isCancelled = booking.status === 'cancelled' || booking.status === 'canceled';
                  return (
                    <div key={booking.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 font-mono">
                            {booking.order_id}
                          </h2>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                            isCancelled
                              ? 'bg-rose-50 text-rose-600 border-rose-300'
                              : booking.status === 'paid'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-300'
                              : 'bg-amber-50 text-amber-600 border-amber-300'
                          }`}>
                            {booking.status}
                          </span>
                        </div>
                        <div className="space-y-2 text-sm">
                          <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Customer:</span> {booking.customer_name}</p>
                          <p className="text-gray-600 dark:text-gray-400">
                            <span className="font-medium">Total Quantity:</span>{' '}
                            {Array.isArray(booking.products) ? booking.products.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0) : 0}
                          </p>
                          <div className="mt-2">
                            <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Products:</p>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                              {Array.isArray(booking.products) && booking.products.map((product, idx) => (
                                <span
                                  key={idx}
                                  className="bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200 px-2 py-0.5 rounded-md text-xs font-medium border border-blue-200 dark:border-blue-900"
                                >
                                  {product.productname} × {product.quantity}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-2">
                        <button 
                          onClick={() => handleView(booking)} 
                          className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-gray-200">
                          View
                        </button>
                        <button 
                          onClick={() => handleEdit(booking)} 
                          className="bg-amber-500 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-amber-600">
                          Edit
                        </button>
                        <a
                          href={`${API_BASE_URL}/api/dbooking/invoice/${booking.order_id}.pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-blue-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-blue-700 inline-flex items-center"
                        >
                          Invoice PDF
                        </a>
                        {!isCancelled && (
                          <button
                            onClick={() => handleCancelOrder(booking)}
                            className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-rose-100"
                          >
                            Cancel & Restock
                          </button>
                        )}
                        <button 
                          onClick={() => handleDeleteBooking(booking.id)} 
                          className="bg-red-600 text-white px-2.5 py-1.5 rounded-xl text-xs font-semibold hover:bg-red-700">
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-center items-center gap-4">
                <button onClick={handlePrevious} disabled={currentPage === 1} className={`px-4 py-2 rounded text-white ${currentPage === 1 ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>Previous</button>
                <div className="flex gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button key={page} onClick={() => handlePageChange(page)} className={`px-3 py-1 rounded ${currentPage === page ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}>{page}</button>
                  ))}
                </div>
                <button onClick={handleNext} disabled={currentPage === totalPages} className={`px-4 py-2 rounded text-white ${currentPage === totalPages ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>Next</button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {isModalOpen && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Update Payment - Order {selectedBooking.order_id}</h2>
            {error && <div className="bg-red-100 p-2 mb-4 text-red-700">{error}</div>}
            <p>Total: Rs.{(parseFloat(selectedBooking.total) || 0).toFixed(2)}</p>
            <p>Remaining Balance: Rs.{getBalance(selectedBooking).toFixed(2)}</p>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="p-2 border mb-4 w-full">
              <option value="">Select Payment Method</option>
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
            </select>
            <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="Amount Paid" className="p-2 border mb-4 w-full" />
            <select value={selectedAdmin} onChange={(e) => setSelectedAdmin(e.target.value)} className="p-2 border mb-4 w-full">
              <option value="">Select Admin</option>
              {admins.map(admin => (
                <option key={admin.id} value={admin.id}>{admin.username} ({admin.bank_name})</option>
              ))}
            </select>
            <div className="flex justify-end gap-4">
              <button onClick={closeModal} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={confirmPayment} className="bg-blue-600 text-white px-4 py-2 rounded">Confirm Payment</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">Edit Booking - Order {editedBooking.order_id}</h2>
            {editedBooking.products.map((product, index) => (
              <div key={index} className="mb-4">
                <p className="mb-1">{product.productname}</p>
                <input
                  type="number"
                  value={product.quantity}
                  min={1}
                  className="w-full p-2 border rounded"
                  onChange={(e) => {
                    const updatedProducts = [...editedBooking.products];
                    updatedProducts[index].quantity = parseInt(e.target.value) || 1;
                    setEditedBooking(prev => ({ ...prev, products: updatedProducts }));
                  }}
                />
              </div>
            ))}
            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setIsEditModalOpen(false)} className="bg-gray-500 text-white px-4 py-2 rounded">Cancel</button>
              <button onClick={saveEditedBooking} className="bg-green-600 text-white px-4 py-2 rounded">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && editedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4 text-center">Booking Details - Order {editedBooking.order_id}</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Customer:</strong> {editedBooking.customer_name}</p>
              <p><strong>Phone:</strong> {editedBooking.mobile_number}</p>
              <p><strong>Address:</strong> {editedBooking.address}</p>
              <p><strong>Status:</strong> {editedBooking.status}</p>
              <p><strong>Total Amount:</strong> Rs.{(parseFloat(editedBooking.total) || 0).toFixed(2)}</p>
              <p><strong>Amount Paid:</strong> Rs.{(parseFloat(editedBooking.amount_paid) || 0).toFixed(2)}</p>
              <p><strong>Balance:</strong> Rs.{getBalance(editedBooking).toFixed(2)}</p>
              {editedBooking.payment_method && (
                <p><strong>Payment Method:</strong> {editedBooking.payment_method}</p>
              )}
              {editedBooking.admin_username && (
                <p><strong>Admin:</strong> {editedBooking.admin_username}</p>
              )}

              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Products:</h3>
                <table className="w-full text-left border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="p-2 border">Name</th>
                      <th className="p-2 border">Qty</th>
                      <th className="p-2 border">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editedBooking.products.map((product, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2 border">{product.productname}</td>
                        <td className="p-2 border">{product.quantity}</td>
                        <td className="p-2 border">Rs.{parseFloat(product.price || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button onClick={() => setIsViewModalOpen(false)} className="bg-blue-600 text-white px-4 py-2 rounded">Close</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
