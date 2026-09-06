import React, { useEffect, useState, useMemo } from "react";
import Sidebar from "./Sidebar/Sidebar";
import Modal from "react-modal";
import { API_BASE_URL } from "../../Config";
import { ArrowRight, X, Eye, Download, FileText, Search, ShieldCheck } from "lucide-react";
import Logout from "./Logout";
import { jsPDF } from "jspdf";
import axios from "axios";

Modal.setAppElement("#root");

const PAGE_SIZE = 9;

const getAvatarColor = (name) => {
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/60 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800",
  ];
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
};

const formatDate = (date) => {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

const parseExtraCharges = (charges) => {
  if (!charges) return { pf: 0, tax: 0, minus: 0 };
  if (typeof charges === "string") {
    try {
      return JSON.parse(charges);
    } catch {
      return { pf: 0, tax: 0, minus: 0 };
    }
  }
  return charges;
};

const generateReceiptId = () => {
  const randomNum = Math.floor(100000000 + Math.random() * 900000000); // 9-digit random number
  return `rcp${randomNum}`;
};

const calculateSubtotal = (products) => {
  if (!Array.isArray(products)) return 0;
  return products.reduce((total, product) => {
    const price = parseFloat(product.price) || 0;
    const qty = parseFloat(product.quantity) || 0;
    const discount = parseFloat(product.discount) || 0;
    const lineTotal = price * qty;
    const discounted = lineTotal - (lineTotal * discount) / 100;
    return total + discounted;
  }, 0);
};

const getStatusBadge = (status) => {
  const s = (status || "").toLowerCase();
  if (s === "paid") return "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase";
  if (s === "dispatched") return "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase";
  if (s === "delivered") return "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 uppercase";
  if (s === "cancelled" || s === "canceled") return "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-200 dark:border-rose-800 uppercase";
  return "px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800 uppercase";
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
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [receiptError, setReceiptError] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedTransactionType, setSelectedTransactionType] = useState("");
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [receiptModalData, setReceiptModalData] = useState({
    isOpen: false,
    url: null,
    booking: null,
    receiptId: "",
    safeName: "",
    doc: null,
  });

  const handleCancelBooking = async (booking) => {
    if (!window.confirm(`Are you sure you want to cancel order ${booking.order_id}? All products in this order will be automatically restocked.`)) {
      return;
    }
    try {
      await axios.patch(`${API_BASE_URL}/api/hifi/dbooking/${booking.order_id}/cancel`);
      alert(`Order ${booking.order_id} cancelled and products restocked successfully!`);
      closeModal();
      const res = await fetch(`${API_BASE_URL}/api/hifi/tracking/bookings`);
      const data = await res.json();
      setBookings(data);
      setFiltered(data);
    } catch (err) {
      alert(`Failed to cancel order: ${err.response?.data?.message || err.message}`);
    }
  };

  const fetchAdmins = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/hifi/admins`);
      setAdmins(response.data);
    } catch (err) {
      console.error("Failed to fetch admins:", err);
    }
  };

  const fetchBankAccounts = async (adminId) => {
    try {
      const admin = admins.find((a) => a.id === adminId);
      if (admin) {
        const response = await axios.get(`${API_BASE_URL}/api/hifi/admins/${admin.username}/bank-accounts`);
        setBankAccounts(response.data || []);
      } else {
        setBankAccounts([]);
      }
    } catch (err) {
      console.error("Failed to fetch bank accounts:", err);
      setBankAccounts([]);
    }
  };

  useEffect(() => {
    fetchAdmins();
    fetch(`${API_BASE_URL}/api/hifi/tracking/bookings`)
      .then((res) => res.json())
      .then((data) => {
        setBookings(data);
        setFiltered(data);
      })
      .catch((err) => console.error("Failed to fetch bookings:", err));
  }, []);

  const openModal = async (booking) => {
    if (!booking) return;
    setSelectedBooking(booking);
    setModalIsOpen(true);
    setShowDetailedView(false);
    setReceiptError(null);
    setSelectedTransactionType("");
    setIsTransactionModalOpen(false);
    document.body.classList.add("overflow-hidden");

    try {
      const [dispatchRes, paymentRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/hifi/dispatch_logs/${booking.order_id}`),
        axios.get(`${API_BASE_URL}/api/hifi/transactions/${booking.id}`),
      ]);
      const { dispatch_logs } = await dispatchRes.json();
      setDispatchLogs(dispatch_logs || []);
      setPayments(paymentRes.data || []);
      const adminId = paymentRes.data[0]?.admin_id;
      if (adminId) {
        await fetchBankAccounts(adminId);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setDispatchLogs([]);
      setPayments([]);
      setBankAccounts([]);
      setReceiptError("Failed to fetch transaction or dispatch data.");
    }
  };

  const closeModal = () => {
    setSelectedBooking(null);
    setDispatchLogs([]);
    setPayments([]);
    setModalIsOpen(false);
    setShowDetailedView(false);
    setReceiptError(null);
    setSelectedTransactionType("");
    setIsTransactionModalOpen(false);
    setBankAccounts([]);
    document.body.classList.remove("overflow-hidden");
  };

  const handleTransactionTypeSelect = (type) => {
    setSelectedTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  const closeTransactionModal = () => {
    setIsTransactionModalOpen(false);
    setSelectedTransactionType("");
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
    const extraTotal = parseFloat(extraCharges.tax || 0) + parseFloat(extraCharges.pf || 0) - parseFloat(extraCharges.minus || 0);
    return total + extraTotal;
  };

const buildReceiptDoc = async (booking) => {
  if (!booking) {
    setReceiptError("No booking data available.");
    return null;
  }
  setReceiptError(null);
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 40;
    const receiptId = generateReceiptId();
    const safeName = booking.customer_name?.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "customer";
    let yPosition = 60;

    // Fetch all bookings for the same customer name
    const customerBookings = bookings.filter((b) => b.customer_name?.toLowerCase() === booking.customer_name?.toLowerCase());
    if (customerBookings.length === 0) {
      setReceiptError("No bookings found for this customer.");
      return;
    }

    // Aggregate data
    let allParsedProducts = [];
    let allDispatchLogs = [];
    let allPayments = [];
    let allExtraCharges = { pf: 0, tax: 0, minus: 0 };

    for (const b of customerBookings) {
      // Parse products
      const parsedProducts = Array.isArray(b.products)
        ? b.products
        : JSON.parse(b.products || "[]").length > 0
        ? JSON.parse(b.products)
        : [];
      allParsedProducts = [...allParsedProducts, ...parsedProducts.map((p, idx) => ({ ...p, order_id: b.order_id, product_index: idx }))];

      // Fetch dispatch logs
      try {
        const dispatchRes = await fetch(`${API_BASE_URL}/api/hifi/dispatch_logs/${b.order_id}`);
        const { dispatch_logs } = await dispatchRes.json();
        allDispatchLogs = [...allDispatchLogs, ...(dispatch_logs || []).map((log) => ({ ...log, order_id: b.order_id }))];
      } catch (err) {
        console.error(`Failed to fetch dispatch logs for order ${b.order_id}:`, err);
      }

      // Fetch payments
      try {
        const paymentRes = await axios.get(`${API_BASE_URL}/api/hifi/transactions/${b.id}`);
        allPayments = [...allPayments, ...(paymentRes.data || []).map((p) => ({ ...p, order_id: b.order_id }))];
      } catch (err) {
        console.error(`Failed to fetch payments for order ${b.order_id}:`, err);
      }

      // Aggregate extra charges
      const extraCharges = parseExtraCharges(b.extra_charges);
      allExtraCharges.pf += Number.parseFloat(extraCharges.pf || 0);
      allExtraCharges.tax += Number.parseFloat(extraCharges.tax || 0);
      allExtraCharges.minus += Number.parseFloat(extraCharges.minus || 0);
    }

    // Calculate totals
    const totalDispatchedQty = allDispatchLogs.reduce((sum, log) => sum + Number(log.dispatched_qty || 0), 0);
    const totalPurchase = allParsedProducts.reduce((total, product) => {
      const price = parseFloat(product.price) || 0;
      const qty = parseFloat(product.quantity) || 0;
      const discount = parseFloat(product.discount) || 0;
      const lineTotal = price * qty;
      const discounted = lineTotal - (lineTotal * discount / 100);
      return total + discounted;
    }, 0) + allExtraCharges.tax + allExtraCharges.pf - allExtraCharges.minus;
    const dispatchedDebit = calculateDebit(allDispatchLogs, allParsedProducts, allExtraCharges);
    const credit = allPayments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
    const netBalance = credit - totalPurchase;

    // Header Section
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Receipt ID: ${receiptId}`, pageWidth - margin, yPosition, { align: "right" });
    yPosition += 30;
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RECEIPT", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 40;
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("Hifi Pyro Park", margin, yPosition);
    yPosition += 15;
    doc.setFont("helvetica", "normal");
    doc.text("Anil Kumar Eye Hospital Opp, Sattur Road, Sivakasi", margin, yPosition);
    yPosition += 15;
    doc.text("Mobile: +91 97865 08621, +91 97868 60010", margin, yPosition);

    // Customer Details
    let rightYPosition = yPosition - 45;
    doc.text(`Customer: ${booking.customer_name || "N/A"}`, pageWidth - margin, rightYPosition, { align: "right" });
    rightYPosition += 15;
    doc.text(`Contact: ${booking.mobile_number || "N/A"}`, pageWidth - margin, rightYPosition, { align: "right" });
    rightYPosition += 15;
    doc.text(`City: ${booking.district || "N/A"}`, pageWidth - margin, rightYPosition, { align: "right" });
    rightYPosition += 15;
    doc.text(`Order Date: ${formatDate(booking.created_at || new Date())}`, pageWidth - margin, rightYPosition, { align: "right" });
    yPosition += 60;

    // Summary Section
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Ledger Summary (Balance Based on All Bookings)", margin, yPosition);
    yPosition += 20;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total Purchase (All Bookings): Rs${totalPurchase.toFixed(2)}`, margin, yPosition);
    yPosition += 15;
    doc.text(`Amount Paid: Rs${credit.toFixed(2)}`, margin, yPosition);
    yPosition += 15;
    doc.setTextColor(netBalance < 0 ? 255 : 0, netBalance < 0 ? 0 : 128, 0);
    doc.text(`Balance Amount: Rs${Math.abs(netBalance).toFixed(2)} ${netBalance < 0 ? "(Outstanding)" : "(Advance)"}`, margin, yPosition);
    doc.setTextColor(0, 0, 0);
    yPosition += 30;

    // Ledger Table Setup
    const tableWidth = pageWidth - 2 * margin;
    const ledgerColWidths = [40, 110, 60, 60, 80, 60, 60];
    const ledgerColPositions = [margin];
    for (let i = 0; i < ledgerColWidths.length - 1; i++) {
      ledgerColPositions.push(ledgerColPositions[i] + ledgerColWidths[i]);
    }

    // Ledger Table Headers
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const ledgerHeaders = ["Sl.No", "Description", "Dispatch", "Rate", "Date", "Debit", "Credit"];
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, yPosition - 5, tableWidth, 20, "F");
    doc.rect(margin, yPosition - 5, tableWidth, 20);
    for (let i = 1; i < ledgerColPositions.length; i++) {
      doc.line(ledgerColPositions[i], yPosition - 5, ledgerColPositions[i], yPosition + 15);
    }
    ledgerHeaders.forEach((header, i) => {
      const textX = ledgerColPositions[i] + ledgerColWidths[i] / 2;
      doc.text(header, textX, yPosition + 8, { align: "center" });
    });
    yPosition += 20;

    // Ledger Table Data
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const tableData = [
      ...allDispatchLogs.map((log, index) => {
        const prod = allParsedProducts.find((p) => p.order_id === log.order_id && p.product_index === log.product_index);
        const price = prod ? parseFloat(prod.price) || 0 : 0;
        const discount = prod ? parseFloat(prod.discount || 0) : 0;
        const effectivePrice = price - (price * discount / 100);
        const amount = effectivePrice * (log.dispatched_qty || 0);
        return {
          slNo: index + 1,
          productName: `${log.product_name || "N/A"}`,
          quantity: log.dispatched_qty || 0,
          ratePerBox: effectivePrice.toFixed(2),
          debit: amount.toFixed(2),
          credit: "",
          date: new Date(log.dispatched_at).getTime(),
        };
      }),
      ...allPayments.map((payment, index) => ({
        slNo: allDispatchLogs.length + index + 1,
        productName: `Payment (${payment.payment_method || "N/A"})`,
        quantity: "",
        ratePerBox: "",
        debit: "",
        credit: Number(payment.amount_paid || 0).toFixed(2),
        date: new Date(payment.transaction_date || payment.created_at).getTime(),
      })),
    ].sort((a, b) => a.date - b.date);

    tableData.forEach((row) => {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 60;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, yPosition - 5, tableWidth, 20, "F");
        doc.rect(margin, yPosition - 5, tableWidth, 20);
        for (let i = 1; i < ledgerColPositions.length; i++) {
          doc.line(ledgerColPositions[i], yPosition - 5, ledgerColPositions[i], yPosition + 15);
        }
        ledgerHeaders.forEach((header, i) => {
          const textX = ledgerColPositions[i] + ledgerColWidths[i] / 2;
          doc.text(header, textX, yPosition + 8, { align: "center" });
        });
        yPosition += 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
      doc.rect(margin, yPosition, tableWidth, 15);
      for (let i = 1; i < ledgerColPositions.length; i++) {
        doc.line(ledgerColPositions[i], yPosition, ledgerColPositions[i], yPosition + 15);
      }
      const rowData = [
        row.slNo,
        row.productName,
        row.quantity,
        row.ratePerBox,
        formatDate(row.date),
        row.debit,
        row.credit,
      ];
      rowData.forEach((data, i) => {
        if (data) {
          const textX = ledgerColPositions[i] + ledgerColWidths[i] / 2;
          const maxWidth = ledgerColWidths[i] - 4;
          const align = i === 0 || i === 2 || i >= 4 ? "center" : "center";
          if (i === 5 && data) doc.setTextColor(255, 0, 0);
          if (i === 6 && data) doc.setTextColor(0, 128, 0);
          doc.text(data.toString(), textX, yPosition + 10, { align, maxWidth });
          doc.setTextColor(0, 0, 0);
        }
      });
      yPosition += 15;
    });

    // Extra Charges
    const { tax, pf, minus } = allExtraCharges;
    if (tax || pf || minus) {
      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      if (tax) {
        doc.rect(margin, yPosition, tableWidth, 15);
        for (let i = 1; i < ledgerColPositions.length; i++) {
          doc.line(ledgerColPositions[i], yPosition, ledgerColPositions[i], yPosition + 15);
        }
        doc.text("Tax", ledgerColPositions[1] + 4, yPosition + 10, { align: "left" });
        doc.setTextColor(255, 0, 0);
        doc.text(`Rs${tax.toFixed(2)}`, ledgerColPositions[5] + ledgerColWidths[5] / 2, yPosition + 10, { align: "center" });
        doc.setTextColor(0, 0, 0);
        yPosition += 15;
      }
      if (pf) {
        doc.rect(margin, yPosition, tableWidth, 15);
        for (let i = 1; i < ledgerColPositions.length; i++) {
          doc.line(ledgerColPositions[i], yPosition, ledgerColPositions[i], yPosition + 15);
        }
        doc.text("P&F Charges", ledgerColPositions[1] + 4, yPosition + 10, { align: "left" });
        doc.setTextColor(255, 0, 0);
        doc.text(`Rs${pf.toFixed(2)}`, ledgerColPositions[5] + ledgerColWidths[5] / 2, yPosition + 10, { align: "center" });
        doc.setTextColor(0, 0, 0);
        yPosition += 15;
      }
      if (minus) {
        doc.rect(margin, yPosition, tableWidth, 15);
        for (let i = 1; i < ledgerColPositions.length; i++) {
          doc.line(ledgerColPositions[i], yPosition, ledgerColPositions[i], yPosition + 15);
        }
        doc.text("Discount (Minus)", ledgerColPositions[1] + 4, yPosition + 10, { align: "left" });
        doc.setTextColor(0, 128, 0);
        doc.text(`-Rs${minus.toFixed(2)}`, ledgerColPositions[5] + ledgerColWidths[5] / 2, yPosition + 10, { align: "center" });
        doc.setTextColor(0, 0, 0);
        yPosition += 15;
      }
    }

    // Total Row
    yPosition += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, tableWidth, 20, "F");
    doc.rect(margin, yPosition, tableWidth, 20);
    for (let i = 1; i < ledgerColPositions.length; i++) {
      doc.line(ledgerColPositions[i], yPosition, ledgerColPositions[i], yPosition + 20);
    }
    doc.text("Total (Dispatched)", ledgerColPositions[1] + 4, yPosition + 14, { align: "left" });
    doc.text(totalDispatchedQty.toString(), ledgerColPositions[2] + ledgerColWidths[2] / 2, yPosition + 14, { align: "center" });
    doc.setTextColor(255, 0, 0);
    doc.text(`Rs${dispatchedDebit.toFixed(2)}`, ledgerColPositions[5] + ledgerColWidths[5] / 2, yPosition + 14, { align: "center" });
    doc.setTextColor(0, 128, 0);
    doc.text(`Rs${credit.toFixed(2)}`, ledgerColPositions[6] + ledgerColWidths[6] / 2, yPosition + 14, { align: "center" });
    doc.setTextColor(0, 0, 0);
    yPosition += 20;

    // Net Balance Row
    doc.setFontSize(10);
    doc.setFillColor(200, 200, 200);
    doc.rect(margin, yPosition, tableWidth, 20, "F");
    doc.rect(margin, yPosition, tableWidth, 20);
    for (let i = 1; i < ledgerColPositions.length; i++) {
      doc.line(ledgerColPositions[i], yPosition, ledgerColPositions[i], yPosition + 20);
    }
    doc.text("Balance Amount", ledgerColPositions[1] + 4, yPosition + 14, { align: "left" });
    doc.setTextColor(netBalance < 0 ? 255 : 0, netBalance < 0 ? 0 : 128, 0);
    doc.text(
      `Rs${Math.abs(netBalance).toFixed(2)} ${netBalance < 0 ? "(Outstanding)" : "(Advance)"}`,
      ledgerColPositions[5] + (ledgerColWidths[5] + ledgerColWidths[6]) / 2,
      yPosition + 14,
      { align: "center" }
    );
    doc.setTextColor(0, 0, 0);
    yPosition += 30;

    // Transaction Details Table Setup
    const paymentColWidths = [40, 100, 100, 100, 80, 100];
    const paymentColPositions = [margin];
    for (let i = 0; i < paymentColWidths.length - 1; i++) {
      paymentColPositions.push(paymentColPositions[i] + paymentColWidths[i]);
    }

    // Transaction Table Headers
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    const paymentHeaders = ["Sl.No", "Payment Type", "Bank Name", "Paid to", "Date", "Amount"];
    doc.setFillColor(220, 220, 220);
    doc.rect(margin, yPosition - 5, tableWidth, 20, "F");
    doc.rect(margin, yPosition - 5, tableWidth, 20);
    for (let i = 1; i < paymentColPositions.length; i++) {
      doc.line(paymentColPositions[i], yPosition - 5, paymentColPositions[i], yPosition + 15);
    }
    paymentHeaders.forEach((header, i) => {
      const textX = paymentColPositions[i] + paymentColWidths[i] / 2;
      doc.text(header, textX, yPosition + 8, { align: "center" });
    });
    yPosition += 20;

    // Transaction Table Data
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const paymentTableData = allPayments
      .map((payment, index) => ({
        slNo: (index + 1).toString(),
        paymentType: `${payment.payment_method || "N/A"}`,
        bankName: payment.bank_name || "N/A",
        paidToAdmin: payment.admin_username || "N/A",
        date: formatDate(payment.transaction_date || payment.created_at),
        amount: Number.parseFloat(payment.amount_paid || "0").toFixed(2),
        dateSort: new Date(payment.transaction_date || payment.created_at).getTime(),
      }))
      .sort((a, b) => a.dateSort - b.dateSort);

    paymentTableData.forEach((row) => {
      if (yPosition > pageHeight - 100) {
        doc.addPage();
        yPosition = 60;
        doc.setFontSize(9);
        doc.setFont("helvetica", "bold");
        doc.setFillColor(220, 220, 220);
        doc.rect(margin, yPosition - 5, tableWidth, 20, "F");
        doc.rect(margin, yPosition - 5, tableWidth, 20);
        for (let i = 1; i < paymentColPositions.length; i++) {
          doc.line(paymentColPositions[i], yPosition - 5, paymentColPositions[i], yPosition + 15);
        }
        paymentHeaders.forEach((header, i) => {
          const textX = paymentColPositions[i] + paymentColWidths[i] / 2;
          doc.text(header, textX, yPosition + 8, { align: "center" });
        });
        yPosition += 20;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }
      doc.rect(margin, yPosition, tableWidth, 15);
      for (let i = 1; i < paymentColPositions.length; i++) {
        doc.line(paymentColPositions[i], yPosition, paymentColPositions[i], yPosition + 15);
      }
      const rowData = [row.slNo, row.paymentType, row.bankName, row.paidToAdmin, row.date, `Rs${row.amount}`];
      rowData.forEach((data, i) => {
        if (data) {
          const textX = paymentColPositions[i] + paymentColWidths[i] / 2;
          const maxWidth = paymentColWidths[i] - 4;
          doc.text(data, textX, yPosition + 10, { align: "center", maxWidth });
        }
      });
      yPosition += 15;
    });

    // Extra Charges for Transaction Table
    if (tax || pf || minus) {
      yPosition += 30;
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      const amountX = paymentColPositions[5] + paymentColWidths[5] / 2;
      if (tax) {
        doc.text(`Tax:`, paymentColPositions[4] + paymentColWidths[4] / 2, yPosition, { align: "center" });
        doc.text(`Rs${tax.toFixed(2)}`, amountX, yPosition, { align: "center" });
        yPosition += 12;
      }
      if (pf) {
        doc.text(`P&F:`, paymentColPositions[4] + paymentColWidths[4] / 2, yPosition, { align: "center" });
        doc.text(`Rs${pf.toFixed(2)}`, amountX, yPosition, { align: "center" });
        yPosition += 12;
      }
      if (minus) {
        doc.text(`Deduction:`, paymentColPositions[4] + paymentColWidths[4] / 2, yPosition, { align: "center" });
        doc.text(`-Rs${minus.toFixed(2)}`, amountX, yPosition, { align: "center" });
        yPosition += 12;
      }
    }

    // Total Row for Transaction Table
    const totalAmount = allPayments.reduce((sum, p) => sum + Number.parseFloat(p.amount_paid || "0"), 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("TOTAL", paymentColPositions[4] + paymentColWidths[4] / 2, yPosition + 10, { align: "center" });
    doc.text(`Rs${totalAmount.toFixed(2)}`, paymentColPositions[5] + paymentColWidths[5] / 2, yPosition + 10, { align: "center" });
    yPosition += 20;

    // Footer
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your business!", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;
    doc.text("Terms: Payment due within 30 days.", pageWidth / 2, yPosition, { align: "center" });

    // Return generated document
    return { doc, receiptId, safeName };
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    setReceiptError(`Unable to generate receipt PDF: ${error.message}. Please try again or contact support.`);
    return null;
  }
};

  const downloadReceipt = async (booking) => {
    try {
      const res = await buildReceiptDoc(booking);
      if (res && res.doc) {
        res.doc.save(`receipt-${res.safeName}-${res.receiptId}.pdf`);
      }
    } catch (err) {
      console.error("Failed to download receipt:", err);
      alert(`Download failed: ${err.message}`);
    }
  };

  const viewReceipt = async (booking) => {
    try {
      const res = await buildReceiptDoc(booking);
      if (res && res.doc) {
        const blob = res.doc.output("blob");
        const url = URL.createObjectURL(blob);
        setReceiptModalData({
          isOpen: true,
          url,
          booking,
          receiptId: res.receiptId,
          safeName: res.safeName,
          doc: res.doc,
        });
      }
    } catch (err) {
      console.error("Failed to view receipt:", err);
      alert(`Failed to load receipt: ${err.message}`);
    }
  };

  const closeReceiptModal = () => {
    if (receiptModalData.url) {
      URL.revokeObjectURL(receiptModalData.url);
    }
    setReceiptModalData({
      isOpen: false,
      url: null,
      booking: null,
      receiptId: "",
      safeName: "",
      doc: null,
    });
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setCurrentPage(1);
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        (b.customer_name && b.customer_name.toLowerCase().includes(q)) ||
        (b.order_id && b.order_id.toLowerCase().includes(q)) ||
        (b.mobile_number && b.mobile_number.includes(q)) ||
        (b.admin_username && b.admin_username.toLowerCase().includes(q)) ||
        (b.district && b.district.toLowerCase().includes(q));

      const status = (b.status || "booked").toLowerCase();
      let matchesStatus = true;
      if (statusFilter === "paid") matchesStatus = status === "paid";
      else if (statusFilter === "booked") matchesStatus = status === "booked" || status === "pending";
      else if (statusFilter === "dispatched") matchesStatus = status === "dispatched" || status === "delivered";
      else if (statusFilter === "cancelled") matchesStatus = status === "cancelled" || status === "canceled";

      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchQuery, statusFilter]);

  const totalBookingsCount = bookings.length;
  const totalBilledValue = bookings.reduce((sum, b) => sum + Number(b.total || 0), 0);
  const totalPaidValue = bookings.reduce((sum, b) => sum + Number(b.amount_paid || 0), 0);
  const totalOutstanding = Math.max(0, totalBilledValue - totalPaidValue);

  const paginated = filteredBookings.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pageCount = Math.ceil(filteredBookings.length / PAGE_SIZE);

  const filteredTransactions = selectedTransactionType === "cash"
    ? payments.filter((tx) => tx.payment_method === "cash")
    : payments.filter((tx) => tx.bank_name === selectedTransactionType);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 hundred:ml-64 onefifty:ml-1 p-3 sm:p-6 md:p-8 pt-16 sm:pt-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="max-w-7xl mx-auto space-y-6 min-w-0 w-full">

          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  Customer Ledger & Receipts
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  View and download consolidated customer receipts, monitor dispatch debits, and balance statements
                </p>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Orders</span>
                <p className="text-2xl font-extrabold text-blue-900 dark:text-blue-100 mt-1">{totalBookingsCount}</p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Total Billed</span>
                <p className="text-2xl font-extrabold text-indigo-900 dark:text-indigo-100 mt-1">
                  ₹{totalBilledValue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Collected So Far</span>
                <p className="text-2xl font-extrabold text-emerald-900 dark:text-emerald-100 mt-1">
                  ₹{totalPaidValue.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/60">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Net Outstanding</span>
                <p className="text-2xl font-extrabold text-amber-900 dark:text-amber-100 mt-1">
                  ₹{totalOutstanding.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
              </div>
            </div>
          </div>

          {/* Search and Status Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search by customer name, order ID (e.g. 2026ORD1), phone, or admin..."
                value={searchQuery}
                onChange={handleSearch}
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 overflow-x-auto p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl w-full sm:w-auto">
              {[
                { id: "all", label: "All" },
                { id: "booked", label: "Booked" },
                { id: "paid", label: "Paid" },
                { id: "dispatched", label: "Dispatched" },
                { id: "cancelled", label: "Cancelled" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setStatusFilter(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                    statusFilter === tab.id
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          {!paginated.length ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-gray-500 font-medium">No customer orders match your search or filter.</p>
              {(searchQuery || statusFilter !== "all") && (
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  }}
                  className="mt-3 text-sm text-blue-600 dark:text-blue-400 underline font-semibold"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((booking) => {
                const status = (booking.status || "booked").toLowerCase();
                const isCancelled = status === "cancelled" || status === "canceled";
                const isPaid = status === "paid";
                const isDispatched = status === "dispatched" || status === "delivered";

                const borderAccent = isPaid
                  ? "border-l-4 border-l-emerald-500"
                  : isCancelled
                  ? "border-l-4 border-l-rose-500"
                  : isDispatched
                  ? "border-l-4 border-l-blue-500"
                  : "border-l-4 border-l-amber-500";

                return (
                  <div
                    key={booking.id}
                    className={`bg-white dark:bg-gray-800/95 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-700/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${borderAccent}`}
                  >
                    <div>
                      {/* Top row: Avatar + Customer Name + Order ID */}
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl font-bold flex items-center justify-center text-sm border shadow-xs ${getAvatarColor(booking.customer_name)}`}>
                            {(booking.customer_name || "C")[0].toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">
                              {booking.customer_name || "Customer"}
                            </h3>
                            <p className="text-xs text-gray-500">
                              {booking.mobile_number || "No contact"}
                            </p>
                          </div>
                        </div>
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-900 whitespace-nowrap">
                          #{booking.order_id}
                        </span>
                      </div>

                      {/* Info Box */}
                      <div className="space-y-2 text-xs bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Status:</span>
                          <span className={getStatusBadge(booking.status)}>{booking.status || "booked"}</span>
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Managed By:</span>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                            {booking.admin_username || "Admin"}
                          </span>
                        </div>

                        <div className="flex justify-between items-center pt-1.5 border-t border-gray-200/60 dark:border-gray-700/60">
                          <span className="text-gray-500">Total Billed:</span>
                          <span className="font-bold text-gray-900 dark:text-white text-sm">
                            ₹{Number(booking.total || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* 3 Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/80 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => viewReceipt(booking)}
                        className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2 px-1.5 rounded-xl text-xs font-bold transition shadow-xs"
                        title="View Customer Receipt PDF"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button
                        onClick={() => downloadReceipt(booking)}
                        className="flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-1.5 rounded-xl text-xs font-bold transition shadow-xs"
                        title="Direct Download Receipt PDF"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </button>
                      <button
                        onClick={() => openModal(booking)}
                        className="flex items-center justify-center gap-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-1.5 rounded-xl text-xs font-bold transition"
                        title="View Detailed Logs & Restock"
                      >
                        Details <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
      </div>

        {/* Main Modal */}
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
            const extraCharges = parseExtraCharges(selectedBooking.extra_charges);
            const totalQty = parsedProducts.reduce((sum, p) => sum + Number(p.quantity || 0), 0);
            const totalOrderValue = Number(selectedBooking.total || 0);
            const dispatchedQty = dispatchLogs.reduce((sum, log) => sum + Number(log.dispatched_qty || 0), 0);
            const debit = calculateDebit(dispatchLogs, parsedProducts, extraCharges);
            const credit = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);
            const netBalance = credit - debit;
            const subtotal = calculateSubtotal(parsedProducts);
            const grandTotal = subtotal + extraCharges.pf + extraCharges.tax - extraCharges.minus;

            const tableData = [
              ...dispatchLogs.map((log, index) => {
                const prod = parsedProducts[log.product_index];
                const price = prod ? parseFloat(prod.price) || 0 : 0;
                const discount = prod ? parseFloat(prod.discount || 0) : 0;
                const effectivePrice = price - (price * discount / 100);
                const amount = effectivePrice * (log.dispatched_qty || 0);
                return {
                  slNo: index + 1,
                  productName: log.product_name || "N/A",
                  quantity: log.dispatched_qty || 0,
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
                credit: Number(payment.amount_paid || 0).toFixed(2),
                date: new Date(payment.transaction_date || payment.created_at).getTime(),
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
                    <strong>Customer:</strong> {selectedBooking.customer_name || "N/A"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedBooking.mobile_number || "N/A"}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedBooking.email || "N/A"}
                  </div>
                  <div>
                    <strong>Order Date:</strong> {formatDate(selectedBooking.created_at || new Date())}
                  </div>
                  <div className="md:col-span-2">
                    <strong>Address:</strong> {selectedBooking.address || "N/A"}, {selectedBooking.district || "N/A"},{" "}
                    {selectedBooking.state || "N/A"}
                  </div>
                  <div>
                    <strong>Amount Paid:</strong> ₹{credit.toFixed(2)}
                  </div>
                  <div>
                    <strong>Status:</strong>{" "}
                    <span className={getStatusBadge(selectedBooking.status)}>{selectedBooking.status || "N/A"}</span>
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
                        <div className="font-semibold">{prod.productname || "N/A"}</div>
                        <div className="text-sm">
                          Qty: {prod.quantity || 0} {prod.per || ""}
                        </div>
                        <div className="text-sm">
                          Price: ₹{prod.price || 0} | Discount: {prod.discount || 0}%
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
                            <strong>Product:</strong> {log.product_name || "N/A"}
                          </div>
                          <div className="text-sm">
                            <strong>Dispatched Qty:</strong> {log.dispatched_qty || 0}
                          </div>
                          <div className="text-sm">
                            <strong>Date & Time:</strong> {formatDate(log.dispatched_at || new Date())}
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
                              <strong>Amount:</strong> ₹{payment.amount_paid || 0}
                            </div>
                            <div className="text-sm">
                              <strong>Method:</strong> {payment.payment_method || "N/A"}
                            </div>
                            <div className="text-sm">
                              <strong>Bank Name:</strong> {payment.bank_name || "N/A"}
                            </div>
                            <div className="text-sm">
                              <strong>Date:</strong> {formatDate(payment.transaction_date || payment.created_at)}
                            </div>
                            <div className="text-sm">
                              <strong>Admin:</strong> {payment.admin_username || "N/A"}
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
                  <h2 className="text-2xl font-bold font-mono">Receipt #{selectedBooking.order_id}</h2>
                  <div className="flex flex-wrap gap-2 items-center">
                    {selectedBooking.status !== 'cancelled' && selectedBooking.status !== 'canceled' && (
                      <button
                        onClick={() => handleCancelBooking(selectedBooking)}
                        className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900 py-2 px-3 rounded-xl text-xs font-bold hover:bg-rose-100 transition"
                      >
                        Cancel & Restock
                      </button>
                    )}
                    <button
                      onClick={() => viewReceipt(selectedBooking)}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white py-2 px-3 rounded-xl hover:brightness-110 text-xs font-bold transition shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Receipt
                    </button>
                    <button
                      onClick={() => downloadReceipt(selectedBooking)}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white py-2 px-3 rounded-xl hover:brightness-110 text-xs font-bold transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                    <button
                      onClick={() => setShowDetailedView(true)}
                      className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 py-2 px-3 rounded-xl text-xs font-bold transition"
                    >
                      Dispatches & Txns
                    </button>
                    <button onClick={closeModal} className="text-gray-400 hover:text-red-500 transition p-1">
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
                    <strong>Customer:</strong> {selectedBooking.customer_name || "N/A"}
                  </div>
                  <div>
                    <strong>Phone:</strong> {selectedBooking.mobile_number || "N/A"}
                  </div>
                  <div>
                    <strong>Email:</strong> {selectedBooking.email || "N/A"}
                  </div>
                  <div>
                    <strong>Order Date:</strong> {formatDate(selectedBooking.created_at || new Date())}
                  </div>
                  <div className="md:col-span-2">
                    <strong>Address:</strong> {selectedBooking.address || "N/A"}, {selectedBooking.district || "N/A"},{" "}
                    {selectedBooking.state || "N/A"}
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
                      {extraCharges && (
                        <>
                          {extraCharges.pf > 0 && (
                            <tr className="font-semibold">
                              <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2">PF Charges</td>
                              <td colSpan={3} className="border border-gray-300 dark:border-gray-600 p-2"></td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600">
                                ₹{extraCharges.pf.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                            </tr>
                          )}
                          {extraCharges.tax > 0 && (
                            <tr className="font-semibold">
                              <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2">Tax</td>
                              <td colSpan={3} className="border border-gray-300 dark:border-gray-600 p-2"></td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600">
                                ₹{extraCharges.tax.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                            </tr>
                          )}
                          {extraCharges.minus > 0 && (
                            <tr className="font-semibold">
                              <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2">Discount (Minus)</td>
                              <td colSpan={3} className="border border-gray-300 dark:border-gray-600 p-2"></td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2 text-right text-red-600">
                                -₹{extraCharges.minus.toFixed(2)}
                              </td>
                              <td className="border border-gray-300 dark:border-gray-600 p-2"></td>
                            </tr>
                          )}
                        </>
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
              </div>
            );
          })()}
        </Modal>

        {/* Transaction Modal */}
        {isTransactionModalOpen && (
          <Modal
            isOpen={isTransactionModalOpen}
            onRequestClose={closeTransactionModal}
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-auto bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-2xl mt-10 z-[9999] outline-none"
            overlayClassName="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-start pt-10 z-[9998]"
          >
            <div className="space-y-6 text-gray-800 dark:text-gray-200">
              <div className="flex justify-between items-center border-b pb-4">
                <h2 className="text-2xl font-bold">
                  {selectedTransactionType === "cash"
                    ? "Cash Transactions"
                    : `${selectedTransactionType} Transactions`} for Order #{selectedBooking.order_id}
                </h2>
                <button onClick={closeTransactionModal} className="text-gray-400 hover:text-red-500 transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
              {filteredTransactions.length === 0 ? (
                <div className="text-center text-gray-600 dark:text-gray-300">
                  No {selectedTransactionType === "cash" ? "cash" : "bank"} transactions found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-gray-800">
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Sl.No</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Customer Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-right">Amount Paid (₹)</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Payment Method</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Bank Name</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Date</th>
                        <th className="border border-gray-300 dark:border-gray-600 p-2 text-left">Admin</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTransactions.map((tx, index) => (
                        <tr
                          key={tx.id || `${tx.transaction_date}_${tx.amount_paid}`}
                          className="border-b border-gray-300 dark:border-gray-600"
                        >
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{index + 1}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">
                            {selectedBooking.customer_name || "N/A"}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2 text-right">
                            ₹{Number.parseFloat(tx.amount_paid || 0).toFixed(2)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{tx.payment_method || "N/A"}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{tx.bank_name || "N/A"}</td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">
                            {formatDate(tx.transaction_date || tx.created_at)}
                          </td>
                          <td className="border border-gray-300 dark:border-gray-600 p-2">{tx.admin_username || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Modal>
        )}

        {/* View Receipt PDF Modal */}
        <Modal
          isOpen={receiptModalData.isOpen}
          onRequestClose={closeReceiptModal}
          className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
          overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
        >
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-5xl w-full shadow-2xl flex flex-col h-[92vh] border border-gray-200 dark:border-gray-800">
            <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>Customer Receipt:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    {receiptModalData.receiptId}
                  </span>
                </h2>
                {receiptModalData.booking && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full text-gray-600 dark:text-gray-300 font-semibold">
                    {receiptModalData.booking.customer_name}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (receiptModalData.doc) {
                      receiptModalData.doc.save(
                        `receipt-${receiptModalData.safeName}-${receiptModalData.receiptId}.pdf`
                      );
                    }
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF
                </button>
                <button
                  onClick={closeReceiptModal}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold p-1 leading-none ml-2"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="w-full flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
              {receiptModalData.url && (
                <iframe
                  src={receiptModalData.url}
                  title="Customer Receipt"
                  className="w-full h-full min-h-[580px] border-0"
                />
              )}
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}