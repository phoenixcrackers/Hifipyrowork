import React, { useEffect, useState } from "react";
import Sidebar from "./Sidebar/Sidebar";
import Modal from "react-modal";
import { API_BASE_URL } from "../../Config";
import { ArrowRight, X } from "lucide-react";
import Logout from "./Logout";
import { jsPDF } from "jspdf";

Modal.setAppElement("#root");

const PAGE_SIZE = 10;

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const generateReceiptId = () => {
  const randomNum = Math.floor(100000000 + Math.random() * 900000000); // 9-digit random number
  return `rcp${randomNum}`;
};

export default function Ledger() {
  const [bookings, setBookings] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [dispatchLogs, setDispatchLogs] = useState([]);
  const [payments, setPayments] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [showDetailedView, setShowDetailedView] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [receiptError, setReceiptError] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/tracking/bookings`)
      .then((res) => res.json())
      .then((data) => {
        setBookings(data);
        setFiltered(data);
      })
      .catch((err) => console.error("Failed to fetch bookings:", err));
  }, []);

  const openModal = async (booking) => {
    setSelectedBooking(booking);
    setModalIsOpen(true);
    setShowDetailedView(false);
    setReceiptError(null);
    document.body.classList.add("overflow-hidden");

    try {
      const res = await fetch(`${API_BASE_URL}/api/dispatch_logs/${booking.order_id}`);
      const { dispatch_logs, payments } = await res.json();
      setDispatchLogs(dispatch_logs);
      setPayments(payments);
    } catch (err) {
      console.error("Failed to fetch dispatch logs:", err);
      setDispatchLogs([]);
      setPayments([]);
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setDispatchLogs([]);
    setPayments([]);
    setModalIsOpen(false);
    setShowDetailedView(false);
    setReceiptError(null);
    document.body.classList.remove("overflow-hidden");
  };

  const calculateDebit = (dispatchLogs, products, extraCharges) => {
    let total = 0;
    dispatchLogs.forEach((log) => {
      const prod = products[log.product_index];
      if (prod) {
        const price = parseFloat(prod.price) || 0;
        const discount = parseFloat(prod.discount || 0);
        const effectivePrice = price - (price * discount / 100);
        total += effectivePrice * (log.dispatched_qty || 0);
      }
    });
    const extraTotal = (parseFloat(extraCharges.tax || 0) + parseFloat(extraCharges.pf || 0) + parseFloat(extraCharges.minus || 0));
    return total + extraTotal;
  };

  const getStatusBadge = (status) => {
    const base = "inline-block text-xs font-semibold px-2 py-1 rounded-full";
    switch (status.toLowerCase()) {
      case "completed":
        return `${base} bg-green-100 text-green-700`;
      case "pending":
        return `${base} bg-yellow-100 text-yellow-800`;
      case "cancelled":
        return `${base} bg-red-100 text-red-700`;
      default:
        return `${base} bg-gray-200 text-gray-800`;
    }
  };

  const handleSearch = (e) => {
    const val = e.target.value.toLowerCase();
    setSearchQuery(val);
    setCurrentPage(1);
    const filtered = bookings.filter(
      (b) =>
        b.customer_name.toLowerCase().includes(val) ||
        b.order_id.toLowerCase().includes(val)
    );
    setFiltered(filtered);
  };

  const downloadReceipt = (booking) => {
    setReceiptError(null)
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" })
      const pageWidth = doc.internal.pageSize.width
      const pageHeight = doc.internal.pageSize.height
      const margin = 40
      const receiptId = generateReceiptId()

      const safeName = booking.customer_name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")

      let yPosition = 60

      // Header Section
      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")
      doc.text(`Receipt ID: ${receiptId}`, pageWidth - margin, yPosition, { align: "right" })

      yPosition += 30
      doc.setFontSize(18)
      doc.setFont("helvetica", "bold")
      doc.text("RECEIPT", pageWidth / 2, yPosition, { align: "center" })

      yPosition += 40
      doc.setFontSize(10)
      doc.setFont("helvetica", "bold")
      doc.text("Hifi Pyro Park", margin, yPosition)

      yPosition += 15
      doc.setFont("helvetica", "normal")
      doc.text("Anil Kumar Eye Hospital Opp, Sattur Road, Sivakasi", margin, yPosition)

      yPosition += 15
      doc.text("Mobile: +91 63836 59214", margin, yPosition)

      yPosition += 15
      doc.text("Email: nivasramasamy27@gmail.com", margin, yPosition)

      // Customer Details (Right side)
      let rightYPosition = yPosition - 45
      doc.text(`Customer: ${booking.customer_name || "N/A"}`, pageWidth - margin, rightYPosition, { align: "right" })

      rightYPosition += 15
      doc.text(`Contact: ${booking.mobile_number || "N/A"}`, pageWidth - margin, rightYPosition, { align: "right" })

      rightYPosition += 15
      doc.text(`City: ${booking.district || "N/A"}`, pageWidth - margin, rightYPosition, { align: "right" })

      rightYPosition += 15
      doc.text(`Order Date: ${formatDate(booking.created_at || new Date())}`, pageWidth - margin, rightYPosition, {
        align: "right",
      })

      yPosition += 60

      // Table Setup - 5 columns for payments only
      const tableStartY = yPosition
      const tableWidth = pageWidth - 2 * margin
      const colWidths = [40, 120, 120, 80, 120] // Adjusted: Sl.No, Payment Type, Paid to Admin, Date, Amount (increased Amount column)
      const colPositions = [margin]

      for (let i = 0; i < colWidths.length - 1; i++) {
        colPositions.push(colPositions[i] + colWidths[i])
      }

      // Table Headers
      doc.setFontSize(9)
      doc.setFont("helvetica", "bold")

      const headers = ["Sl.No", "Payment Type", "Paid to", "Date", "Amount"]

      // Draw header background
      doc.setFillColor(240, 240, 240)
      doc.rect(margin, yPosition - 5, tableWidth, 20, "F")

      // Draw header borders
      doc.setLineWidth(0.5)
      doc.rect(margin, yPosition - 5, tableWidth, 20)

      // Vertical lines for headers
      for (let i = 1; i < colPositions.length; i++) {
        doc.line(colPositions[i], yPosition - 5, colPositions[i], yPosition + 15)
      }

      // Header text
      headers.forEach((header, i) => {
        const textX = colPositions[i] + colWidths[i] / 2
        doc.text(header, textX, yPosition + 8, { align: "center" })
      })

      yPosition += 20

      // Table Data - ONLY PAYMENTS
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)

      // Only payment data, sorted by date
      const tableData = payments
        .map((payment, index) => ({
          slNo: (index + 1).toString(),
          paymentType: payment.payment_method || "N/A",
          paidToAdmin: payment.admin_username || "N/A",
          date: formatDate(payment.created_at),
          amount: Number.parseFloat(payment.amount_paid || "0").toFixed(2),
          dateSort: new Date(payment.created_at).getTime(),
        }))
        .sort((a, b) => a.dateSort - b.dateSort)

      // Draw table rows
      tableData.forEach((row) => {
        if (yPosition > pageHeight - 100) {
          doc.addPage()
          yPosition = 60

          // Redraw headers on new page
          doc.setFontSize(9)
          doc.setFont("helvetica", "bold")
          doc.setFillColor(240, 240, 240)
          doc.rect(margin, yPosition - 5, tableWidth, 20, "F")
          doc.rect(margin, yPosition - 5, tableWidth, 20)

          for (let i = 1; i < colPositions.length; i++) {
            doc.line(colPositions[i], yPosition - 5, colPositions[i], yPosition + 15)
          }

          headers.forEach((header, i) => {
            const textX = colPositions[i] + colWidths[i] / 2
            doc.text(header, textX, yPosition + 8, { align: "center" })
          })

          yPosition += 20
          doc.setFont("helvetica", "normal")
          doc.setFontSize(8)
        }

        // Draw row border
        doc.rect(margin, yPosition, tableWidth, 15)

        // Draw vertical lines
        for (let i = 1; i < colPositions.length; i++) {
          doc.line(colPositions[i], yPosition, colPositions[i], yPosition + 15)
        }

        // Row data - only payment information
        const rowData = [row.slNo, row.paymentType, row.paidToAdmin, row.date, `Rs.${row.amount}`]

        rowData.forEach((data, i) => {
          if (data) {
            const textX = colPositions[i] + colWidths[i] / 2
            const maxWidth = colWidths[i] - 4

            if (i === 1 || i === 2) {
              // Payment Type and Admin columns - center align
              doc.text(data, textX, yPosition + 10, { align: "center", maxWidth })
            } else {
              // Other columns - center align
              doc.text(data, textX, yPosition + 10, { align: "center", maxWidth })
            }
          }
        })

        yPosition += 15
      })

      // Extra charges section
      const extraCharges = booking.extra_charges || {}
      const tax = Number.parseFloat(extraCharges.tax?.toString() || "0")
      const pf = Number.parseFloat(extraCharges.pf?.toString() || "0")
      const minus = Number.parseFloat(extraCharges.minus?.toString() || "0")

      if (tax || pf || minus) {
        yPosition += 10
        doc.setFontSize(8)
        doc.setFont("helvetica", "normal")

        if (tax) {
          doc.text(`Tax: ₹${tax.toFixed(2)}`, pageWidth - margin, yPosition, { align: "right" })
          yPosition += 12
        }
        if (pf) {
          doc.text(`Packaging & Forwarding: ₹${pf.toFixed(2)}`, pageWidth - margin, yPosition, { align: "right" })
          yPosition += 12
        }
        if (minus) {
          doc.text(`Deduction: ₹${minus.toFixed(2)}`, pageWidth - margin, yPosition, { align: "right" })
          yPosition += 12
        }
      }

      // Total row - WITH proper table structure
      yPosition += 5
      const totalAmount = payments.reduce((sum, p) => sum + Number.parseFloat(p.amount_paid || "0"), 0)

      doc.setFont("helvetica", "bold")
      doc.setFontSize(9)

      // Total label - positioned in the Date column
      doc.text("TOTAL", colPositions[3] + colWidths[3] / 2, yPosition + 10, { align: "center" })

      // Total amount - positioned properly in the Amount column
      doc.text(`Rs.${totalAmount.toFixed(2)}`, colPositions[4] + colWidths[4] / 2, yPosition + 10, { align: "center" })

      yPosition += 20

      // Footer
      yPosition += 40
      doc.setFont("helvetica", "normal")
      doc.setFontSize(8)
      doc.text("Thank you for your business!", pageWidth / 2, yPosition, { align: "center" })

      // Download PDF
      doc.save(`receipt-${safeName}-${receiptId}.pdf`)
    } catch (error) {
      console.error("Failed to generate PDF:", error)
      setReceiptError("Unable to generate receipt PDF. Please try again or contact support.")
    }
  }

  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 p-10 ml-60">
        <h1 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-6">
          📒 Ledger Overview
        </h1>

        {/* Search */}
        <div className="flex justify-end mb-6">
          <input
            type="text"
            placeholder="Search by customer or order ID..."
            value={searchQuery}
            onChange={handleSearch}
            className="w-full md:w-1/3 p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-300 dark:bg-gray-800 dark:text-white dark:border-gray-600"
          />
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {paginated.map((booking) => (
            <div
              key={booking.id}
              className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md transition hover:scale-[1.02]"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                #{booking.order_id}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">Customer: {booking.customer_name}</p>
              <p className="text-gray-600 dark:text-gray-300">Phone: {booking.mobile_number}</p>
              <p className="mt-2">
                <span className={getStatusBadge(booking.status)}>{booking.status}</span>
              </p>
              <p className="text-gray-600 dark:text-gray-300">
                <span className="font-semibold">Admin:</span> {booking.admin_username || "N/A"}
              </p>
              <p className="mt-1 text-gray-600 dark:text-gray-300">Total: ₹{booking.total}</p>
              <button
                onClick={() => openModal(booking)}
                className="mt-4 w-full flex justify-center items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 rounded-lg hover:brightness-110"
              >
                View Details <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="flex justify-center mt-10 space-x-2">
            {Array.from({ length: pageCount }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-4 py-2 rounded-full border font-medium transition ${
                  currentPage === i + 1
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}

        {/* Modal */}
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={closeModal}
          className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-auto bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl mt-10 z-[9999] outline-none"
          overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-10 z-[9998]"
        >
          {selectedBooking && (() => {
            const parsedProducts = Array.isArray(selectedBooking.products)
              ? selectedBooking.products
              : JSON.parse(selectedBooking.products || "[]");
            const totalQty = parsedProducts.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
            const totalOrderValue = Number(selectedBooking.total || 0);
            const dispatchedQty = dispatchLogs.reduce((sum, log) => sum + Number(log.dispatched_qty || 0), 0);
            const extraCharges = selectedBooking.extra_charges || {};
            const extraTotal = (parseFloat(extraCharges.tax || 0) + parseFloat(extraCharges.pf || 0) + parseFloat(extraCharges.minus || 0));
            const debit = calculateDebit(dispatchLogs, parsedProducts, extraCharges);
            const credit = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
            const netBalance = credit - debit;

            const tableData = [
              ...dispatchLogs.map((log, index) => {
                const prod = parsedProducts[log.product_index];
                const price = prod ? parseFloat(prod.price) || 0 : 0;
                const discount = prod ? parseFloat(prod.discount || 0) : 0;
                const effectivePrice = price - (price * discount / 100);
                const amount = effectivePrice * (log.dispatched_qty || 0);
                return {
                  slNo: index + 1,
                  productName: log.product_name,
                  quantity: log.dispatched_qty,
                  ratePerBox: effectivePrice.toFixed(2),
                  debit: amount.toFixed(2),
                  credit: "",
                  date: new Date(log.dispatched_at).getTime(),
                };
              }),
              ...payments.map((payment, index) => ({
                slNo: dispatchLogs.length + index + 1,
                productName: `Payment (${payment.payment_method || "N/A"})`,
                quantity: "",
                ratePerBox: "",
                debit: "",
                credit: Number(payment.amount_paid).toFixed(2),
                date: new Date(payment.created_at).getTime(),
              })),
            ].sort((a, b) => a.date - b.date);

            return showDetailedView ? (
              <div className="space-y-6 text-gray-800 dark:text-gray-200">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-2xl font-bold">Order #{selectedBooking.order_id}</h2>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowDetailedView(false)}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:brightness-110"
                    >
                      View Receipt
                    </button>
                    <button
                      onClick={() => downloadReceipt(selectedBooking)}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 px-4 rounded-lg hover:brightness-110"
                    >
                      Download Receipt
                    </button>
                    <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                {receiptError && (
                  <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                    {receiptError}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <strong>Customer:</strong> {selectedBooking.customer_name}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedBooking.mobile_number}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedBooking.email}
                  </div>
                  <div>
                    <strong>Order Date:</strong> {formatDate(selectedBooking.created_at)}
                  </div>
                  <div className="md:col-span-2">
                    <strong>Address:</strong> {selectedBooking.address}, {selectedBooking.district},{" "}
                    {selectedBooking.state}
                  </div>
                  <div>
                    <strong>Amount Paid:</strong> ₹{credit.toFixed(2)}
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    <span className={getStatusBadge(selectedBooking.status)}>{selectedBooking.status}</span>
                  </div>
                </div>
                <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-xl shadow-sm border dark:border-gray-700 mb-6">
                  <h3 className="text-lg font-semibold mb-3">📋 Invoice Summary</h3>
                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <strong>💰 Credit (Paid):</strong> ₹{credit.toFixed(2)}
                    </div>
                    <div>
                      <strong>📦 Debit (Dispatched):</strong> ₹{debit.toFixed(2)}
                    </div>
                    <div>
                      <strong>🧾 Order Value:</strong> ₹{totalOrderValue.toFixed(2)}
                    </div>
                    <div>
                      <strong>📦 Qty Ordered:</strong> {totalQty}
                    </div>
                    <div>
                      <strong>🚚 Dispatched Qty:</strong> {dispatchedQty}
                    </div>
                    <div>
                      <strong>📦 Remaining Qty:</strong> {totalQty - dispatchedQty}
                    </div>
                    <div
                      className={`md:col-span-3 text-sm font-semibold mt-2 ${
                        netBalance < 0 ? "text-red-600" : "text-green-600"
                      }`}
                    >
                      🔁 Net Balance: ₹{netBalance.toFixed(2)} {netBalance < 0 ? "(Outstanding)" : "(Advance)"}
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">🛍️ Products</h3>
                  <div className="space-y-3">
                    {parsedProducts.map((prod, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
                      >
                        <div className="font-semibold">{prod.productname}</div>
                        <div className="text-sm">
                          Qty: {prod.quantity} {prod.per}
                        </div>
                        <div className="text-sm">
                          Price: ₹{prod.price} | Discount: {prod.discount || 0}%
                        </div>
                        <div className="text-sm">Dispatched: {prod.dispatched || 0}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">🚚 Dispatch Logs</h3>
                  {dispatchLogs.length > 0 ? (
                    <div className="space-y-3">
                      {dispatchLogs.map((log, idx) => (
                        <div
                          key={idx}
                          className="bg-green-50 dark:bg-green-900 p-4 rounded-lg border border-green-200 dark:border-green-800"
                        >
                          <div className="text-sm">
                            <strong>Product:</strong> {log.product_name}
                          </div>
                          <div className="text-sm">
                            <strong>Dispatched Qty:</strong> {log.dispatched_qty}
                          </div>
                          <div className="text-sm">
                            <strong>Date & Time:</strong> {formatDate(log.dispatched_at)}
                          </div>
                          <div className="text-sm">
                            <strong>Transport:</strong> {log.transport_type || "N/A"} - {log.transport_name || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>LR No:</strong> {log.lr_number || "N/A"}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No dispatch logs found.</p>
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-lg mb-2">💳 Payments</h3>
                  {payments.length > 0 ? (
                    <>
                      <div className="font-medium text-gray-700 dark:text-gray-200 mb-2">
                        Total Received: ₹{credit.toFixed(2)}
                      </div>
                      <div className="space-y-3">
                        {payments.map((payment, idx) => (
                          <div
                            key={idx}
                            className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700"
                          >
                            <div className="text-sm">
                              <strong>Amount:</strong> ₹{payment.amount_paid}
                            </div>
                            <div className="text-sm">
                              <strong>Method:</strong> {payment.payment_method || "N/A"}
                            </div>
                            <div className="text-sm">
                              <strong>Date:</strong> {formatDate(payment.created_at)}
                            </div>
                            <div className="text-sm">
                              <strong>Admin:</strong> {payment.admin_username || "N/A"}
                            </div>
                            <div className="text-sm">
                              <strong>Note:</strong> {payment.note || "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No payments found.</p>
                  )}
                </div>
                <div className="flex justify-between mt-4 border-t pt-4 text-sm font-semibold">
                  <div className="text-green-600">💰 Credit (Total Paid): ₹{credit.toFixed(2)}</div>
                  <div className="text-red-600">📦 Debit (Value of Dispatched Goods): ₹{debit.toFixed(2)}</div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-gray-800 dark:text-gray-200">
                <div className="flex justify-between items-center border-b pb-4">
                  <h2 className="text-2xl font-bold">Receipt #{selectedBooking.order_id}</h2>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowDetailedView(true)}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2 px-4 rounded-lg hover:brightness-110"
                    >
                      View Details
                    </button>
                    <button
                      onClick={() => downloadReceipt(selectedBooking)}
                      className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-teal-600 text-white py-2 px-4 rounded-lg hover:brightness-110"
                    >
                      Download Receipt
                    </button>
                    <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>
                {receiptError && (
                  <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
                    {receiptError}
                  </div>
                )}
                <div className="grid md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                  <div>
                    <strong>Customer:</strong> {selectedBooking.customer_name}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedBooking.mobile_number}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedBooking.email}
                  </div>
                  <div>
                    <strong>Order Date:</strong> {formatDate(selectedBooking.created_at)}
                  </div>
                  <div className="md:col-span-2">
                    <strong>Address:</strong> {selectedBooking.address}, {selectedBooking.district},{" "}
                    {selectedBooking.state}
                  </div>
                </div>
                <div className="mt-4">
                  <h3 className="font-semibold text-lg mb-2">📄 Receipt Summary</h3>
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Sl.No</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Description</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Quantity</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Rate/Box (₹)</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Date</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Debit (₹)</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Credit (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableData.map((row, index) => (
                        <tr key={index}>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{row.slNo}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{row.productName}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{row.quantity}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{row.ratePerBox}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">
                            {formatDate(row.date)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600">
                            {row.debit}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-green-600">
                            {row.credit}
                          </td>
                        </tr>
                      ))}
                      {extraTotal > 0 && (
                        <tr className="font-semibold">
                          <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">Extra Charges</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right"></td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right"></td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right"></td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600">
                            ₹{extraTotal.toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-green-600"></td>
                        </tr>
                      )}
                      <tr className="font-semibold">
                        <td className="border border-gray-300 dark:border-gray-600 p-2" colSpan={2}>
                          Total
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">{totalQty}</td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right"></td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right"></td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600">
                          {debit.toFixed(2)}
                        </td>
                        <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-green-600">
                          {credit.toFixed(2)}
                        </td>
                      </tr>
                      <tr className="font-semibold">
                        <td className="border border-gray-300 dark:border-gray-600 p-2" colSpan={5}>
                          Net Balance
                        </td>
                        <td
                          className={`border border-gray-300 dark:border-gray-600 p-2 text-right ${
                            netBalance < 0 ? "text-red-600" : "text-green-600"
                          }`}
                          colSpan={2}
                        >
                          {netBalance.toFixed(2)} {netBalance < 0 ? "(Outstanding)" : "(Advance)"}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <p className="text-sm">
                    <strong>Status:</strong>{" "}
                    <span className={getStatusBadge(selectedBooking.status)}>{selectedBooking.status}</span>
                  </p>
                </div>
              </div>
            );
          })()}
        </Modal>
      </div>
    </div>
  );
}