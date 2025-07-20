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
  const cardsPerPage = 9;
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

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

  const totalPages = Math.ceil(bookings.length / cardsPerPage);
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentBookings = bookings.slice(indexOfFirstCard, indexOfLastCard);

  const handlePageChange = (pageNumber) => setCurrentPage(pageNumber);
  const handlePrevious = () => currentPage > 1 && setCurrentPage(currentPage - 1);
  const handleNext = () => currentPage < totalPages && setCurrentPage(currentPage + 1);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex items-top justify-center onefifty:ml-[20%] hundred:ml-[15%] p-6">
        <div className="w-full max-w-5xl">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 dark:text-gray-100">Tracking</h1>
          {error && <div className="bg-red-100 dark:bg-red-900 p-2 mb-4 text-red-700 dark:text-red-300 rounded">{error}</div>}
          {bookings.length === 0 ? (
            <p className="text-center text-gray-600 dark:text-gray-400">No bookings available</p>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBookings.map(booking => (
                  <div key={booking.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-600">
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Order {booking.order_id}</h2>
                    <div className="space-y-2">
                      <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Customer:</span> {booking.customer_name}</p>
                      <p className="text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Quantity:</span>{' '}
                        {booking.products.reduce((acc, item) => acc + (parseInt(item.quantity) || 0), 0)}
                      </p>
            <div className="mt-2">
  <p className="font-medium text-gray-700 dark:text-gray-200 mb-1">Products:</p>
  <div className="flex flex-wrap gap-2">
    {booking.products.map((product, idx) => (
      <span
        key={idx}
        className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-3 py-1 rounded-full text-sm font-medium shadow-sm"
      >
        {product.productname} × {product.quantity}
      </span>
    ))}
  </div>
</div>


                    <p className="text-gray-600 dark:text-gray-400"><span className="font-medium">Status:</span> {booking.status}</p>
                      <div className="mt-3 flex gap-3">
                        <button onClick={() => handleView(booking)} className="bg-gray-300 text-gray-800 px-3 py-1 rounded hover:bg-gray-400">View</button>
                        <button onClick={() => handleEdit(booking)} className="bg-yellow-400 text-gray-900 px-3 py-1 rounded hover:bg-yellow-500">Edit</button>
                      </div>
                      <div className="mt-3">
                        <select
                          onChange={(e) => handleStatusChange(booking.id, e.target.value)}
                          className="p-2 border border-gray-300 dark:border-gray-600 rounded w-full bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100"
                          value={selectedBooking?.id === booking.id ? 'paid' : ''}
                        >
                          <option value="">Change Status</option>
                          {['paid', 'dispatched', 'delivered'].map(status => (
                            <option key={status} value={status} disabled={booking.status === 'delivered'}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
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
