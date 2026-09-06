import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import Select from "react-select";
import Modal from "react-modal";
import { API_BASE_URL } from "../../Config";
import Sidebar from "./Sidebar/Sidebar";
import Logout from "./Logout";

Modal.setAppElement("#root");

const selectStyles = {
  control: (base) => ({
    ...base,
    padding: "0.25rem",
    fontSize: "0.95rem",
    borderRadius: "0.5rem",
    background: "#fff",
    borderColor: "#d1d5db",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    color: "#1f2937",
    "&:hover": { borderColor: "#3b82f6" },
  }),
  menu: (base) => ({
    ...base,
    zIndex: 30,
    background: "#fff",
  }),
  singleValue: (base) => ({
    ...base,
    color: "#1f2937",
  }),
  option: (base, { isFocused, isSelected }) => ({
    ...base,
    background: isSelected ? "#3b82f6" : isFocused ? "#eff6ff" : "#fff",
    color: isSelected ? "#fff" : "#1f2937",
  }),
  placeholder: (base) => ({
    ...base,
    color: "#9ca3af",
  }),
};

export default function Quotation() {
  const [state, setState] = useState({
    customers: [],
    products: [],
    quotations: [],
    cart: [],
    editCart: [],
    selectedCustomer: null,
    selectedProduct: null,
    selectedQuotation: null,
    error: "",
    success: "",
    loading: true,
    viewModal: false,
    bookModal: false,
    editModal: false,
    pdfError: "",
    pdfUrl: "",
    extraCharges: { tax: 0, pf: 0, minus: 0 },
    searchQuery: "",
    statusFilter: "all",
  });

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setState((s) => ({ ...s, loading: true }));
        const [customers, products] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/direct/customers`).then((res) => (Array.isArray(res.data) ? res.data : [])),
          axios.get(`${API_BASE_URL}/api/direct/products`).then((res) => (Array.isArray(res.data) ? res.data : [])),
        ]);
        setState((s) => ({ ...s, customers, products }));
      } catch (err) {
        console.error("Initial fetch error:", err);
        setState((s) => ({ ...s, error: "Failed to fetch customers/products", loading: false }));
      }
    };

    const fetchQuotations = async () => {
      try {
        const quotations = await axios.get(`${API_BASE_URL}/api/quotations`).then((res) => {
          return Array.isArray(res.data) ? res.data : [];
        });
        setState((s) => ({ ...s, quotations, loading: false }));
      } catch (err) {
        console.error("Quotations fetch error:", err);
        setState((s) => ({ ...s, error: "Failed to fetch quotations", loading: false }));
      }
    };

    fetchInitialData();
    fetchQuotations();
    const intervalId = setInterval(fetchQuotations, 10000);
    return () => clearInterval(intervalId);
  }, []);

  const downloadFile = (url, filename) => {
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    link.setAttribute("target", "_blank");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const addToCart = () => {
    if (!state.selectedProduct) return setState((s) => ({ ...s, error: "Select a product" }));
    const [id, type] = state.selectedProduct.value.split("-");
    const product = state.products.find((p) => p.id.toString() === id && p.product_type === type);
    if (!product) return;

    setState((s) => ({
      ...s,
      cart: s.cart.some((item) => item.id === product.id && item.product_type === type)
        ? s.cart.map((item) =>
            item.id === product.id && item.product_type === type ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...s.cart, { ...product, quantity: 1 }],
      selectedProduct: null,
      error: "",
    }));
  };

  const addToEditCart = () => {
    if (!state.selectedProduct) return setState((s) => ({ ...s, error: "Select a product" }));
    const [id, type] = state.selectedProduct.value.split("-");
    const product = state.products.find((p) => p.id.toString() === id && p.product_type === type);
    if (!product) return;

    setState((s) => ({
      ...s,
      editCart: s.editCart.some((item) => item.id === product.id && item.product_type === type)
        ? s.editCart.map((item) =>
            item.id === product.id && item.product_type === type ? { ...item, quantity: item.quantity + 1 } : item
          )
        : [...s.editCart, { ...product, quantity: 1 }],
      selectedProduct: null,
      error: "",
    }));
  };

  const updateQuantityOrDiscount = (id, type, field, value, isEdit = false) => {
    const newValue = Math.max(0, Number(value) || 0);
    const cartKey = isEdit ? "editCart" : "cart";
    setState((s) => ({
      ...s,
      [cartKey]: s[cartKey].map((item) =>
        item.id === id && item.product_type === type ? { ...item, [field]: newValue } : item
      ),
    }));
  };

  const removeFromCart = (id, type, isEdit = false) => {
    const cartKey = isEdit ? "editCart" : "cart";
    setState((s) => ({
      ...s,
      [cartKey]: s[cartKey].filter((item) => !(item.id === id && item.product_type === type)),
    }));
  };

  const calculateTotal = (cart) => {
    const subtotal = cart.reduce((sum, item) => {
      const price = Number(item.price) || 0;
      const discount = Number(item.discount) || 0;
      const quantity = Number(item.quantity) || 0;
      return sum + (price - (price * discount) / 100) * quantity;
    }, 0);
    const tax = Number(state.extraCharges.tax) || 0;
    const pf = Number(state.extraCharges.pf) || 0;
    const minus = Number(state.extraCharges.minus) || 0;
    return Math.max(0, subtotal + tax + pf - minus).toFixed(2);
  };

  const updateExtraCharges = (field, value) => {
    const numValue = Math.max(0, Number(value) || 0);
    setState((s) => ({
      ...s,
      extraCharges: { ...s.extraCharges, [field]: numValue },
    }));
  };

  const handleCreateQuotation = async () => {
    if (!state.selectedCustomer) return setState((s) => ({ ...s, error: "Please select a customer" }));
    if (!state.cart.length) return setState((s) => ({ ...s, error: "Cart is empty. Please add products" }));
    const total = calculateTotal(state.cart);
    if (isNaN(total) || Number.parseFloat(total) <= 0) {
      return setState((s) => ({ ...s, error: "Total must be greater than zero" }));
    }

    try {
      const c = state.selectedCustomer.customerData || {};
      const response = await axios.post(`${API_BASE_URL}/api/quotations`, {
        customer_id: c.id ? Number(c.id) : null,
        customer_name: c.customer_name || c.name || "Customer",
        company_name: c.companyname || c.company_name || "",
        address: c.address || "",
        mobile_number: c.mobile_number || "",
        email: c.email || "",
        district: c.district || "",
        state: c.state || "",
        products: state.cart,
        total: Number.parseFloat(total),
        customer_type: c.customer_type || "User",
        extra_charges: state.extraCharges,
      });

      const { est_id } = response.data;
      const customerNameForPdf = c.customer_name || c.name || "customer";
      downloadFile(
        `${API_BASE_URL}/api/quotations/${est_id}.pdf`,
        `${customerNameForPdf.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${est_id}.pdf`
      );

      setState((s) => ({
        ...s,
        cart: [],
        selectedCustomer: null,
        selectedProduct: null,
        extraCharges: { tax: 0, pf: 0, minus: 0 },
        quotations: [response.data, ...s.quotations],
        success: `Quotation ${est_id} created successfully!`,
        error: "",
      }));
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 4000);
    } catch (err) {
      console.error("Create quotation error:", err);
      setState((s) => ({
        ...s,
        error: err.response?.data?.message || "Failed to create quotation",
      }));
    }
  };

  const handleEditQuotation = async () => {
    if (!state.editCart.length) return setState((s) => ({ ...s, error: "Cart is empty" }));
    const total = calculateTotal(state.editCart);
    if (isNaN(total) || Number.parseFloat(total) <= 0) {
      return setState((s) => ({ ...s, error: "Invalid total amount" }));
    }

    try {
      const response = await axios.patch(`${API_BASE_URL}/api/quotations/${state.selectedQuotation.est_id}/edit`, {
        products: state.editCart,
        total: Number.parseFloat(total),
        extra_charges: state.extraCharges,
      });

      const { est_id } = response.data;
      const customerNameForPdf = state.selectedQuotation.customer_name || "customer";
      downloadFile(
        `${API_BASE_URL}/api/quotations/${est_id}.pdf`,
        `${customerNameForPdf.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${est_id}.pdf`
      );

      setState((s) => ({
        ...s,
        quotations: s.quotations.map((q) =>
          q.est_id === state.selectedQuotation.est_id
            ? {
                ...q,
                products: JSON.stringify(state.editCart),
                total: Number.parseFloat(total),
                extra_charges: state.extraCharges,
              }
            : q
        ),
        editModal: false,
        selectedQuotation: null,
        editCart: [],
        extraCharges: { tax: 0, pf: 0, minus: 0 },
        success: `Quotation ${est_id} updated and downloaded!`,
        error: "",
      }));
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000);
    } catch (err) {
      console.error("Edit quotation error:", err);
      setState((s) => ({
        ...s,
        error: err.response?.data?.message || "Failed to edit quotation",
      }));
    }
  };

  const handleBookQuotation = async () => {
    if (!state.editCart.length) return setState((s) => ({ ...s, error: "Cart is empty" }));
    const total = calculateTotal(state.editCart);
    if (isNaN(total) || Number.parseFloat(total) <= 0) {
      return setState((s) => ({ ...s, error: "Invalid total amount" }));
    }

    try {
      const q = state.selectedQuotation;
      const response = await axios.post(`${API_BASE_URL}/api/quotations/book`, {
        est_id: q.est_id,
        customer_id: q.customer_id ? Number(q.customer_id) : null,
        customer_name: q.customer_name,
        address: q.address,
        mobile_number: q.mobile_number,
        email: q.email,
        district: q.district,
        state: q.state,
        customer_type: q.customer_type || "User",
        products: state.editCart,
        total: Number.parseFloat(total),
        extra_charges: state.extraCharges,
      });

      const { order_id } = response.data;
      const customerNameForPdf = q.customer_name || "customer";
      downloadFile(
        `${API_BASE_URL}/api/dbooking/invoice/${order_id}.pdf`,
        `${customerNameForPdf.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${order_id}.pdf`
      );

      setState((s) => ({
        ...s,
        quotations: s.quotations.map((item) =>
          item.est_id === q.est_id ? { ...item, status: "booked" } : item
        ),
        bookModal: false,
        selectedQuotation: null,
        editCart: [],
        extraCharges: { tax: 0, pf: 0, minus: 0 },
        success: `Booking ${order_id} created successfully! Invoice downloaded.`,
        error: "",
      }));
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 4000);
    } catch (err) {
      console.error("Book quotation error:", err);
      setState((s) => ({
        ...s,
        error: err.response?.data?.message || "Failed to book quotation",
      }));
    }
  };

  const handleCancelQuotation = async (q) => {
    const isBooked = q.status === "booked";
    const msg = isBooked
      ? `Are you sure you want to cancel booked quotation ${q.est_id}? All items in the booked order will be automatically restocked.`
      : `Are you sure you want to cancel quotation ${q.est_id}?`;
    if (!window.confirm(msg)) return;

    try {
      const res = await axios.patch(`${API_BASE_URL}/api/quotations/${q.est_id}/cancel`);
      setState((s) => ({
        ...s,
        quotations: s.quotations.map((item) => (item.est_id === q.est_id ? { ...item, status: "canceled" } : item)),
        success: res.data.message || (isBooked ? "Quotation canceled & stock restored!" : "Quotation canceled!"),
        error: "",
      }));
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 4000);
    } catch (err) {
      console.error("Cancel quotation error:", err);
      setState((s) => ({
        ...s,
        error: err.response?.data?.message || "Failed to cancel quotation",
      }));
    }
  };

  const handleDeleteQuotation = async (est_id) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${est_id}? This will restore any reserved stock if booked.`)) return;

    try {
      await axios.delete(`${API_BASE_URL}/api/quotations/${est_id}`);
      setState((s) => ({
        ...s,
        quotations: s.quotations.filter((q) => q.est_id !== est_id),
        success: `Quotation ${est_id} deleted successfully!`,
        error: "",
      }));
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000);
    } catch (err) {
      console.error("Delete quotation error:", err);
      setState((s) => ({
        ...s,
        error: err.response?.data?.message || "Failed to delete quotation",
      }));
    }
  };

  const openModal = async (q, modalType = "view") => {
    if (modalType === "view") {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/quotations/${q.est_id}`, { responseType: "blob" });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
        setState((s) => ({ ...s, selectedQuotation: q, viewModal: true, pdfUrl: url, pdfError: "" }));
      } catch (err) {
        console.error("PDF fetch error:", err);
        setState((s) => ({ ...s, pdfError: "Failed to load Quotation PDF" }));
      }
    } else {
      let parsedProducts = [];
      try {
        if (q.products && typeof q.products === "string") {
          parsedProducts = JSON.parse(q.products);
        } else if (Array.isArray(q.products)) {
          parsedProducts = q.products;
        }
      } catch (e) {
        console.error("Failed to parse products:", e);
        setState((s) => ({
          ...s,
          error: "Failed to parse quotation products",
          [modalType === "book" ? "bookModal" : "editModal"]: false,
        }));
        return;
      }
      const extraCharges =
        typeof q.extra_charges === "string"
          ? JSON.parse(q.extra_charges)
          : q.extra_charges || { tax: 0, pf: 0, minus: 0 };

      setState((s) => ({
        ...s,
        selectedQuotation: q,
        [modalType === "book" ? "bookModal" : "editModal"]: true,
        editCart: parsedProducts.map((p) => ({ ...p, quantity: p.quantity || 0 })),
        extraCharges,
      }));
    }
  };

  const closeModal = () => {
    if (state.pdfUrl) {
      window.URL.revokeObjectURL(state.pdfUrl);
    }
    setState((s) => ({
      ...s,
      viewModal: false,
      bookModal: false,
      editModal: false,
      selectedQuotation: null,
      editCart: [],
      extraCharges: { tax: 0, pf: 0, minus: 0 },
      error: "",
      pdfError: "",
      pdfUrl: "",
    }));
  };

  const productOptions = useMemo(() => {
    return state.products
      .sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true }))
      .map((p) => ({
        value: `${p.id}-${p.product_type}`,
        label: `${p.serial_number || ""} - ${p.productname} (₹${p.price} / ${p.per || "box"})`,
      }));
  }, [state.products]);

  const customerOptions = useMemo(() => {
    return state.customers
      .sort((a, b) => (a.customer_name || a.name || "").localeCompare(b.customer_name || b.name || ""))
      .map((c) => {
        const isDealer = c.source === "users" || c.customer_type === "User";
        const prefix = isDealer ? "[Dealer] " : "[Direct] ";
        const name = c.customer_name || c.name || "Unknown";
        const district = c.district ? ` (${c.district})` : "";
        return {
          value: `${c.id}-${c.source || "gbcustomers"}`,
          customerData: c,
          label: `${prefix}${name}${district}`,
        };
      });
  }, [state.customers]);

  // Real-time Search and Status Filter for Quotations
  const filteredQuotations = useMemo(() => {
    return state.quotations.filter((q) => {
      const qId = (q.est_id || "").toLowerCase();
      const qCust = (q.customer_name || "").toLowerCase();
      const qDist = (q.district || "").toLowerCase();
      const search = state.searchQuery.trim().toLowerCase();

      const matchesSearch = !search || qId.includes(search) || qCust.includes(search) || qDist.includes(search);
      const matchesStatus = state.statusFilter === "all" || (q.status || "").toLowerCase() === state.statusFilter.toLowerCase();

      return matchesSearch && matchesStatus;
    });
  }, [state.quotations, state.searchQuery, state.statusFilter]);

  const counts = useMemo(() => {
    const all = state.quotations.length;
    const pending = state.quotations.filter((q) => q.status === "pending").length;
    const booked = state.quotations.filter((q) => q.status === "booked").length;
    const canceled = state.quotations.filter((q) => q.status === "canceled").length;
    return { all, pending, booked, canceled };
  }, [state.quotations]);

  const renderTable = (cart, isEdit = false) => (
    <div className="w-full max-w-full overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm mt-4">
      <table className="w-full min-w-[540px] divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800 text-xs sm:text-sm">
        <thead className="bg-slate-800 text-white text-[11px] sm:text-xs font-semibold uppercase tracking-wider">
          <tr>
            <th className="py-2.5 px-3 text-left">Sl.No</th>
            <th className="py-2.5 px-3 text-left">Product</th>
            <th className="py-2.5 px-2 text-center">Qty</th>
            <th className="py-2.5 px-2 text-right">Price (₹)</th>
            <th className="py-2.5 px-2 text-center">Disc (%)</th>
            <th className="py-2.5 px-2 text-center">Per</th>
            <th className="py-2.5 px-2 text-right">Total (₹)</th>
            <th className="py-2.5 px-2 text-center">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {cart.length > 0 ? (
            cart.map((item, index) => (
              <tr key={`${item.id}-${item.product_type}`} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition">
                <td className="py-2 px-3 text-gray-500 dark:text-gray-400">{index + 1}</td>
                <td className="py-2 px-3 font-medium text-gray-900 dark:text-gray-100">{item.productname}</td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateQuantityOrDiscount(item.id, item.product_type, "quantity", e.target.value, isEdit)}
                    className="w-14 sm:w-16 py-1 px-1 border border-gray-300 dark:border-gray-600 rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-2 text-right text-gray-700 dark:text-gray-200">₹{Number(item.price).toFixed(2)}</td>
                <td className="py-2 px-2 text-center">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) => updateQuantityOrDiscount(item.id, item.product_type, "discount", e.target.value, isEdit)}
                    className="w-14 sm:w-16 py-1 px-1 border border-gray-300 dark:border-gray-600 rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700 focus:ring-1 focus:ring-blue-500"
                  />
                </td>
                <td className="py-2 px-2 text-center text-gray-600 dark:text-gray-300">{item.per}</td>
                <td className="py-2 px-2 text-right font-semibold text-gray-900 dark:text-gray-100">
                  ₹{(item.price * (1 - item.discount / 100) * item.quantity).toFixed(2)}
                </td>
                <td className="py-2 px-2 text-center">
                  <button
                    onClick={() => removeFromCart(item.id, item.product_type, isEdit)}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-semibold text-xs"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={8} className="py-8 text-center text-gray-400 dark:text-gray-500">
                No products in cart yet. Select a product above.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex justify-center p-3 sm:p-6 md:p-8 pt-16 sm:pt-6 hundred:ml-64 min-w-0 max-w-full overflow-x-hidden">
        <div className="w-full max-w-6xl min-w-0">
          
          {/* Top Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-4 sm:p-6 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white text-center">
              Quotation Management
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
              Create instant quotations for registered dealers & direct customers with modern PDF generation
            </p>

            {state.error && (
              <div className="bg-red-50 dark:bg-red-950/60 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-2.5 rounded-xl mt-4 text-center text-sm font-medium">
                {state.error}
              </div>
            )}
            {state.success && (
              <div className="bg-green-50 dark:bg-green-950/60 border border-green-300 dark:border-green-700 text-green-700 dark:text-green-200 px-4 py-2.5 rounded-xl mt-4 text-center text-sm font-medium">
                {state.success}
              </div>
            )}

            {/* Selection row */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 mt-6 items-end">
              <div className="md:col-span-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Customer / Dealer
                </label>
                <Select
                  value={state.selectedCustomer}
                  onChange={(val) => setState((s) => ({ ...s, selectedCustomer: val }))}
                  options={customerOptions}
                  placeholder="Search registered dealer or direct customer..."
                  isClearable
                  styles={selectStyles}
                />
              </div>
              <div className="md:col-span-5">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Select Product
                </label>
                <Select
                  value={state.selectedProduct}
                  onChange={(val) => setState((s) => ({ ...s, selectedProduct: val }))}
                  options={productOptions}
                  placeholder="Search products..."
                  isClearable
                  styles={selectStyles}
                />
              </div>
              <div className="md:col-span-2">
                <button
                  onClick={addToCart}
                  disabled={!state.selectedProduct}
                  className="w-full h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-lg text-sm transition shadow-sm"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Extra Charges */}
            <div className="bg-gray-50 dark:bg-gray-900/60 p-3 sm:p-4 rounded-xl mt-6 border border-gray-200 dark:border-gray-700">
              <span className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                Additional Charges:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800/80 p-2 sm:p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">P&F (₹):</label>
                  <input
                    type="number"
                    min="0"
                    value={state.extraCharges.pf}
                    onChange={(e) => updateExtraCharges("pf", e.target.value)}
                    className="w-20 sm:w-24 py-1 px-2 border rounded-lg text-sm text-center bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800/80 p-2 sm:p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Tax/GST (₹):</label>
                  <input
                    type="number"
                    min="0"
                    value={state.extraCharges.tax}
                    onChange={(e) => updateExtraCharges("tax", e.target.value)}
                    className="w-20 sm:w-24 py-1 px-2 border rounded-lg text-sm text-center bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 bg-white dark:bg-gray-800/80 p-2 sm:p-2.5 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Deduction (₹):</label>
                  <input
                    type="number"
                    min="0"
                    value={state.extraCharges.minus}
                    onChange={(e) => updateExtraCharges("minus", e.target.value)}
                    className="w-20 sm:w-24 py-1 px-2 border rounded-lg text-sm text-center bg-gray-50 dark:bg-gray-900 dark:border-gray-600"
                  />
                </div>
              </div>
            </div>

            {/* Cart Table */}
            {renderTable(state.cart)}

            {/* Summary & Create CTA */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                Total Quotation Value: <span className="text-blue-600 dark:text-blue-400">₹{calculateTotal(state.cart)}</span>
              </div>
              <button
                onClick={handleCreateQuotation}
                disabled={!state.cart.length || !state.selectedCustomer}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-bold px-8 py-3 rounded-xl transition shadow-md flex items-center gap-2"
              >
                <span>Generate Quotation</span>
              </button>
            </div>
          </div>

          {/* Quotations List with Real-time Search and Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            
            {/* Header with Search */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                    Quotations
                  </h2>
                  <span className="bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-bold text-xs px-2.5 py-1 rounded-full">
                    {filteredQuotations.length} {filteredQuotations.length === 1 ? 'Quotation' : 'Quotations'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Sequential Year-Based IDs: e.g. <span className="font-mono text-blue-600 dark:text-blue-400">2026QUO1</span> → converts to <span className="font-mono text-emerald-600 dark:text-emerald-400">2026ORD1</span>
                </p>
              </div>

              {/* Search Filter Input */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder="Search customer, ID (e.g. 2026QUO1)..."
                  value={state.searchQuery}
                  onChange={(e) => setState((s) => ({ ...s, searchQuery: e.target.value }))}
                  className="w-full pl-9 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                />
                <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {state.searchQuery && (
                  <button
                    onClick={() => setState((s) => ({ ...s, searchQuery: "" }))}
                    className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                    title="Clear search"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 py-4">
              {[
                { id: "all", label: "All", count: counts.all },
                { id: "pending", label: "Pending", count: counts.pending, color: "text-amber-500" },
                { id: "booked", label: "Booked", count: counts.booked, color: "text-emerald-500" },
                { id: "canceled", label: "Canceled", count: counts.canceled, color: "text-rose-500" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setState((s) => ({ ...s, statusFilter: tab.id }))}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                    state.statusFilter === tab.id
                      ? "bg-blue-600 text-white shadow"
                      : "bg-gray-100 dark:bg-gray-700/60 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      state.statusFilter === tab.id ? "bg-white/25 text-white" : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Quotation Cards Grid */}
            {!filteredQuotations.length ? (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-900/40 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 my-4">
                <p className="text-gray-500 dark:text-gray-400 font-medium">No quotations match your search or filter.</p>
                {(state.searchQuery || state.statusFilter !== "all") && (
                  <button
                    onClick={() => setState((s) => ({ ...s, searchQuery: "", statusFilter: "all" }))}
                    className="mt-3 text-sm text-blue-600 dark:text-blue-400 underline font-semibold"
                  >
                    Clear Search & Filter
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-2">
                {filteredQuotations.map((q) => {
                  const status = (q.status || "pending").toLowerCase();
                  const badgeStyles = {
                    pending: "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800",
                    booked: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
                    canceled: "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800",
                  };
                  const badgeClass = badgeStyles[status] || "bg-gray-100 text-gray-700 border-gray-200";

                  return (
                    <div
                      key={q.est_id}
                      className="bg-white dark:bg-gray-800/90 rounded-2xl p-5 border border-gray-200 dark:border-gray-700/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        {/* Top card row */}
                        <div className="flex justify-between items-start gap-2 mb-2">
                          <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 line-clamp-1">
                            {q.customer_name || "Customer"}
                          </h3>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeClass}`}>
                            {q.status}
                          </span>
                        </div>

                        {/* Metadata Box */}
                        <div className="space-y-1.5 text-xs bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-500">Quotation ID:</span>
                            <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{q.est_id}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="font-medium text-gray-500">Customer:</span>
                            <span className="font-semibold text-gray-800 dark:text-gray-200 line-clamp-1">{q.customer_name}</span>
                          </div>
                          {q.total !== undefined && (
                            <div className="flex justify-between">
                              <span className="font-medium text-gray-500">Total:</span>
                              <span className="font-bold text-gray-900 dark:text-gray-100">
                                ₹{Number(q.total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                              </span>
                            </div>
                          )}
                          {q.created_at && (
                            <div className="flex justify-between text-[11px]">
                              <span className="font-medium text-gray-400">Date:</span>
                              <span>{new Date(q.created_at).toLocaleDateString("en-GB")}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700/80 grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                        <button
                          onClick={() => openModal(q, "view")}
                          className="bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded-lg text-xs font-bold transition text-center shadow-xs"
                          title="View PDF"
                        >
                          View
                        </button>
                        <button
                          onClick={() => openModal(q, "edit")}
                          disabled={q.status !== "pending"}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center ${
                            q.status !== "pending"
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                              : "bg-amber-500 hover:bg-amber-600 text-white shadow-xs"
                          }`}
                          title="Edit Line Items"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openModal(q, "book")}
                          disabled={q.status !== "pending"}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center ${
                            q.status !== "pending"
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          }`}
                          title="Book / Convert to Order"
                        >
                          Book
                        </button>
                        <button
                          onClick={() => handleCancelQuotation(q)}
                          disabled={q.status === "canceled"}
                          className={`py-1.5 rounded-lg text-xs font-bold transition text-center ${
                            q.status === "canceled"
                              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed"
                              : "bg-rose-500 hover:bg-rose-600 text-white shadow-xs"
                          }`}
                          title={q.status === "booked" ? "Cancel Booked Order & Restock Products" : "Cancel Quotation"}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDeleteQuotation(q.est_id)}
                          className="bg-red-700 hover:bg-red-800 text-white py-1.5 rounded-lg text-xs font-bold transition text-center shadow-xs"
                          title="Delete Quotation & Restore Stock"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* View PDF Modal */}
          <Modal
            isOpen={state.viewModal}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {state.selectedQuotation && (
              <div className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-5xl w-full shadow-2xl flex flex-col h-[92vh] border border-gray-200 dark:border-gray-800">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200 dark:border-gray-700 mb-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span>Quotation:</span>
                    <span className="font-mono text-blue-600 dark:text-blue-400">{state.selectedQuotation.est_id}</span>
                  </h2>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold p-1 leading-none"
                  >
                    ×
                  </button>
                </div>
                <div className="w-full flex-1 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                  {state.pdfError ? (
                    <div className="text-red-600 dark:text-red-400 text-center p-8 font-medium">{state.pdfError}</div>
                  ) : state.pdfUrl ? (
                    <iframe
                      src={state.pdfUrl}
                      title="Quotation PDF"
                      className="w-full h-full min-h-[580px] border-0"
                    />
                  ) : (
                    <div className="text-gray-500 text-center p-8">Loading PDF...</div>
                  )}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    Customer: <strong className="text-gray-800 dark:text-gray-200">{state.selectedQuotation.customer_name}</strong>
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const safeCustomer = (state.selectedQuotation.customer_name || "quotation").toLowerCase().replace(/[^a-z0-9]+/g, "_");
                        downloadFile(
                          `${API_BASE_URL}/api/quotations/${state.selectedQuotation.est_id}.pdf`,
                          `${safeCustomer}-${state.selectedQuotation.est_id}.pdf`
                        );
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Download PDF
                    </button>
                    <button
                      onClick={closeModal}
                      className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold transition"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Edit Modal */}
          <Modal
            isOpen={state.editModal}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {state.selectedQuotation && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                  Edit Quotation: <span className="font-mono text-blue-600">{state.selectedQuotation.est_id}</span>
                </h2>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <Select
                      value={state.selectedProduct}
                      onChange={(val) => setState((s) => ({ ...s, selectedProduct: val }))}
                      options={productOptions}
                      placeholder="Add another product to quotation..."
                      isClearable
                      styles={selectStyles}
                    />
                  </div>
                  <button
                    onClick={addToEditCart}
                    disabled={!state.selectedProduct}
                    className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl text-sm font-semibold"
                  >
                    Add
                  </button>
                </div>

                {renderTable(state.editCart, true)}

                <div className="text-xl text-right mt-4 font-extrabold text-gray-900 dark:text-white">
                  Total: ₹{calculateTotal(state.editCart)}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditQuotation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl text-sm font-semibold"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </Modal>

          {/* Book Modal */}
          <Modal
            isOpen={state.bookModal}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {state.selectedQuotation && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Confirm Booking for <span className="text-blue-600">{state.selectedQuotation.customer_name}</span>
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Quotation <span className="font-mono font-bold text-blue-600">{state.selectedQuotation.est_id}</span> will be converted to matching Order ID{" "}
                  <span className="font-mono font-bold text-emerald-600">
                    {state.selectedQuotation.est_id?.replace("QUO", "ORD")}
                  </span>
                </p>

                {renderTable(state.editCart, true)}

                <div className="text-xl text-right mt-4 font-extrabold text-gray-900 dark:text-white">
                  Order Total: <span className="text-emerald-600">₹{calculateTotal(state.editCart)}</span>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-4 py-2 rounded-xl text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookQuotation}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-md"
                  >
                    Confirm & Generate Invoice
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