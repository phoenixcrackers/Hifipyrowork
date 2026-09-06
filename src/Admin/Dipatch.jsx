import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Modal from 'react-modal';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';
import { API_BASE_URL } from '../../Config';
import { FaTruck, FaBan, FaCheckCircle, FaSearch, FaBoxOpen, FaClipboardList } from 'react-icons/fa';

pdfMake.vfs = pdfFonts.pdfMake ? pdfFonts.pdfMake.vfs : pdfFonts.vfs;

Modal.setAppElement('#root');

export default function Dispatch() {
  const [bookings, setBookings] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [transportType, setTransportType] = useState('');
  const [transportName, setTransportName] = useState('');
  const [transportContact, setTransportContact] = useState('');
  const [lrNumber, setLrNumber] = useState('');
  const [productDispatches, setProductDispatches] = useState({});
  const [taxPercent, setTaxPercent] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const cardsPerPage = 9;

  const getParsedProducts = (booking) => {
    let products = booking?.products;
    if (typeof products === 'string') {
      try {
        products = JSON.parse(products);
      } catch {
        products = [];
      }
    }
    return Array.isArray(products) ? products : [];
  };

  const getTotalQty = (booking) => {
    const products = getParsedProducts(booking);
    return products.reduce((sum, p) => sum + (parseInt(p.quantity) || 0), 0);
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/tracking/bookings`);
      const filtered = response.data.filter((b) => {
        if (b.status === 'cancelled' || b.status === 'canceled') return false;
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

  const handleCancelBooking = async (booking) => {
    const totalQty = getTotalQty(booking);
    if (!window.confirm(`Are you sure you want to cancel bill ${booking.order_id}? All ${totalQty} units will be restocked immediately.`)) {
      return;
    }
    try {
      setError('');
      setSuccess('');
      const response = await axios.patch(`${API_BASE_URL}/api/dbooking/${booking.order_id}/cancel`);
      setSuccess(response.data.message || `Order ${booking.order_id} cancelled and products restocked successfully!`);
      await fetchBookings();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to cancel order: ${err.response?.data?.message || err.message}`);
    }
  };

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

    if (transportType === 'transport') {
      if (!transportName.trim() || !lrNumber.trim()) {
        setError('Transport Name and LR Number are required when using transport.');
        return;
      }
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

      await axios.patch(
        `${API_BASE_URL}/api/tracking/bookings/order/${selectedBooking.order_id}/status`,
        payload
      );

      generatePDF(selectedBooking, toDispatch);

      await fetchBookings();
      setSelectedBooking(null);
      setTransportType('');
      setTransportName('');
      setTransportContact('');
      setLrNumber('');
      setProductDispatches({});
      setTaxPercent('');
      setError('');
      setSuccess('Dispatch recorded successfully!');
      setIsModalOpen(false);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(`Failed to update dispatch status: ${err.response?.data?.error || err.message}`);
    }
  };

  const generatePDF = (booking, toDispatch) => {
    const products = getParsedProducts(booking);

    let pfAmount = 0;
    try {
      const extras = typeof booking.extra_charges === 'string'
        ? JSON.parse(booking.extra_charges)
        : booking.extra_charges;
      pfAmount = parseFloat(extras?.pf) || 0;
    } catch {
      pfAmount = 0;
    }

    const dispatchProducts = products
      .map((p, i) => {
        const dispatchQty = toDispatch.find(d => d.index === i)?.dispatch_qty || 0;
        if (dispatchQty === 0) return null;
        const originalRate = parseFloat(p.price) || 0;
        const discount = parseFloat(p.discount || 0);
        const finalRate = originalRate - (originalRate * discount / 100);
        return {
          name: p.productname || `Product ${i + 1}`,
          qty: dispatchQty,
          originalRate: originalRate.toFixed(2),
          discount: `${discount}%`,
          finalRate: finalRate.toFixed(2),
          amount: (dispatchQty * finalRate).toFixed(2),
        };
      })
      .filter(p => p !== null);

    const subtotal = dispatchProducts.reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const taxRate = parseFloat(taxPercent);
    const hasTax = !isNaN(taxRate) && taxRate > 0;
    const taxAmount = hasTax ? subtotal * (taxRate / 100) : 0;
    const total = subtotal + taxAmount + pfAmount;

    const docDefinition = {
      content: [
        { text: 'HIFI PYRO PARK', style: 'companyName' },
        { text: 'Sattur Road, Sivakasi\nPhone: +91 97865 08621, +91 97868 60010\n\n', style: 'companyDetails' },
        { text: 'DISPATCH SLIP', style: 'invoiceTitle' },
        {
          columns: [
            {
              width: '48%',
              stack: [
                { text: 'Customer Details', style: 'sectionHeader' },
                { text: `Name: ${booking.customer_name || '-'}`, margin: [0, 2] },
                { text: `Order ID: ${booking.order_id || '-'}`, margin: [0, 2] },
                { text: `Mobile: ${booking.mobile_number || '-'}`, margin: [0, 2] },
                { text: `Address: ${booking.address || '-'}`, margin: [0, 2] }
              ],
              margin: [0, 10, 0, 10],
            },
            {
              width: '48%',
              stack: [
                { text: 'Transport Details', style: 'sectionHeader' },
                { text: `Type: ${booking.transport_type || transportType || '-'}`, margin: [0, 2] },
                { text: `Transport: ${booking.transport_name || transportName || '-'}`, margin: [0, 2] },
                { text: `LR Number: ${booking.lr_number || lrNumber || '-'}`, margin: [0, 2] },
              ],
              margin: [0, 10, 0, 10],
            }
          ],
          columnGap: 20
        },
        {
          table: {
            headerRows: 1,
            widths: ['auto', '*', 'auto', 'auto', 'auto'],
            body: [
              [
                { text: 'S.No', style: 'tableHeader' },
                { text: 'Product', style: 'tableHeader' },
                { text: 'Dispatched Qty', style: 'tableHeader', alignment: 'right' },
                { text: 'Rate (₹)', style: 'tableHeader', alignment: 'right' },
                { text: 'Total (₹)', style: 'tableHeader', alignment: 'right' },
              ],
              ...dispatchProducts.map((p, index) => [
                (index + 1).toString(),
                p.name,
                { text: p.qty.toString(), alignment: 'right' },
                { text: `₹${p.finalRate}`, alignment: 'right' },
                { text: `₹${p.amount}`, alignment: 'right' },
              ]),
              [
                { text: 'Total Dispatched Value:', colSpan: 4, alignment: 'right', bold: true },
                {}, {}, {},
                { text: `₹${total.toFixed(2)}`, alignment: 'right', bold: true }
              ]
            ]
          },
          layout: 'lightHorizontalLines'
        }
      ],
      styles: {
        companyName: { fontSize: 18, bold: true, color: '#0f172a' },
        companyDetails: { fontSize: 10, color: '#475569' },
        invoiceTitle: { fontSize: 14, bold: true, color: '#1d4ed8', margin: [0, 5, 0, 10] },
        sectionHeader: { fontSize: 11, bold: true, color: '#0f172a' },
        tableHeader: { bold: true, fillColor: '#f1f5f9', color: '#0f172a' }
      }
    };

    pdfMake.createPdf(docDefinition).download(`Dispatch_${booking.order_id}.pdf`);
  };

  const handleProductDispatchChange = (index, value, remaining) => {
    const qty = parseInt(value) || 0;
    if (qty > remaining) {
      setError(`Cannot dispatch more than remaining quantity (${remaining})`);
      return;
    }
    setError('');
    setProductDispatches(prev => ({ ...prev, [index]: Math.max(0, qty) }));
  };

  const getBalance = (booking) => {
    const total = parseFloat(booking.total) || 0;
    const paid = parseFloat(booking.amount_paid) || 0;
    return Math.max(0, total - paid);
  };

  const filteredBookings = bookings.filter((b) => {
    const search = searchTerm.toLowerCase();
    return (
      (b.order_id && b.order_id.toLowerCase().includes(search)) ||
      (b.customer_name && b.customer_name.toLowerCase().includes(search)) ||
      (b.mobile_number && b.mobile_number.includes(search))
    );
  });

  const totalPages = Math.ceil(filteredBookings.length / cardsPerPage) || 1;
  const indexOfLastCard = currentPage * cardsPerPage;
  const indexOfFirstCard = indexOfLastCard - cardsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstCard, indexOfLastCard);

  const openModal = (booking) => {
    setSelectedBooking(booking);
    setProductDispatches({});
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setTransportType('');
    setTransportName('');
    setTransportContact('');
    setLrNumber('');
    setProductDispatches({});
    setTaxPercent('');
    setError('');
    setIsModalOpen(false);
  };

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
                  Dispatch & Shipping Desk
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage parcels, assign transport partners, partial dispatches, generate dispatch slips, or cancel bills with instant stock restoration.
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100 dark:border-blue-900">
                {bookings.length} Orders Awaiting Dispatch
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
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by Order ID (e.g. 2026ORD1), Customer Name, Mobile..."
              className="w-full pl-10 pr-9 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm shadow-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <FaSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-4" />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ×
              </button>
            )}
          </div>

          {/* Bookings Card Grid */}
          {filteredBookings.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FaTruck className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No pending orders to dispatch</p>
              {searchTerm && (
                <button onClick={() => setSearchTerm('')} className="mt-2 text-sm text-blue-600 font-bold underline">
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentBookings.map((booking) => {
                const totalQty = getTotalQty(booking);
                const dispatched = parseInt(booking.dispatched_qty || 0);
                const remaining = Math.max(0, totalQty - dispatched);
                const progressPct = totalQty > 0 ? Math.round((dispatched / totalQty) * 100) : 0;

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
                          dispatched === 0
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {dispatched === 0 ? 'Not Dispatched' : `Partial (${progressPct}%)`}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">
                        {booking.customer_name}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">{booking.district || ''} {booking.state || ''}</p>

                      {/* Progress Bar */}
                      <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 mb-3">
                        <div className="flex justify-between text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                          <span>Dispatched: <strong className="text-blue-600">{dispatched}</strong></span>
                          <span>Remaining: <strong className="text-amber-600">{remaining}</strong> / {totalQty}</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progressPct}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs py-1">
                        <div className="text-gray-500">
                          Total: <strong className="text-gray-900 dark:text-white">₹{Number(booking.total || 0).toFixed(2)}</strong>
                        </div>
                        <div className="text-gray-500 text-right">
                          Balance: <strong className="text-rose-600">₹{getBalance(booking).toFixed(2)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openModal(booking)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <FaTruck className="text-xs" /> Dispatch
                      </button>
                      <button
                        onClick={() => handleCancelBooking(booking)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-rose-200 dark:border-rose-900"
                      >
                        <FaBan className="text-xs" /> Cancel & Restock
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

          {/* Dispatch Modal */}
          <Modal
            isOpen={isModalOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {selectedBooking && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Dispatch Order: {selectedBooking.order_id}
                    </h2>
                    <p className="text-xs text-gray-500">Customer: {selectedBooking.customer_name}</p>
                  </div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-xs font-medium rounded-xl border border-red-200">{error}</div>}

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {getParsedProducts(selectedBooking).map((product, index) => {
                    const already = parseInt(product.dispatched || 0);
                    const totalQty = parseInt(product.quantity || 0);
                    const remaining = totalQty - already;
                    const price = parseFloat(product.price) || 0;
                    const discount = parseFloat(product.discount || 0);
                    const dispatchQty = parseInt(productDispatches[index]) || 0;
                    const productTotal = (price - (price * discount / 100)) * dispatchQty;

                    return (
                      <div key={index} className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-bold text-sm text-gray-900 dark:text-white">{product.productname || `Product ${index + 1}`}</h4>
                            <p className="text-xs text-gray-500">Rate: ₹{price.toFixed(2)} &bull; Disc: {discount}% &bull; Total Ordered: {totalQty}</p>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            {remaining === 0 ? 'Completed' : `${remaining} Remaining`}
                          </span>
                        </div>

                        {remaining === 0 ? (
                          <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                            <FaCheckCircle /> Fully Dispatched
                          </div>
                        ) : (
                          <div className="flex items-center gap-3 mt-2">
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={productDispatches[index] || ''}
                              onChange={(e) => handleProductDispatchChange(index, e.target.value, remaining)}
                              placeholder={`Qty to dispatch (max ${remaining})`}
                              className="w-48 px-3 py-1.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            {dispatchQty > 0 && (
                              <span className="text-xs font-bold text-emerald-600">
                                Value: ₹{productTotal.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="pt-3 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Transport & Shipping Details</h3>
                    <select
                      value={transportType}
                      onChange={(e) => setTransportType(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="">Select Transport Type</option>
                      <option value="own">Self / Own Vehicle</option>
                      <option value="transport">Transport Service / Parcel</option>
                    </select>

                    {transportType === 'transport' && (
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="text"
                          value={transportName}
                          onChange={(e) => setTransportName(e.target.value)}
                          placeholder="Transport Agency Name *"
                          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        />
                        <input
                          type="text"
                          value={lrNumber}
                          onChange={(e) => setLrNumber(e.target.value)}
                          placeholder="LR / Bilty Number *"
                          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        />
                        <input
                          type="text"
                          value={transportContact}
                          onChange={(e) => setTransportContact(e.target.value)}
                          placeholder="Transport Contact No. (Optional)"
                          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        />
                        <input
                          type="number"
                          value={taxPercent}
                          onChange={(e) => setTaxPercent(e.target.value)}
                          placeholder="Tax % (Optional)"
                          className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDispatch}
                    className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                  >
                    Confirm & Download Dispatch Slip
                  </button>
                </div>
              </div>
            )}
          </Modal>

        </div>
      </div>
    </div>
  );
}