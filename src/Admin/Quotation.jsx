import { useState, useEffect } from "react"
import axios from "axios"
import Select from "react-select"
import Modal from "react-modal"
import { API_BASE_URL } from "../../Config"
import Sidebar from "./Sidebar/Sidebar"
import Logout from "./Logout"

Modal.setAppElement("#root") // Important for accessibility

export default function Quotation() {
  const [state, setState] = useState({
    customers: [],
    products: [],
    quotations: [],
    cart: [],
    editCart: [],
    selectedCustomer: "",
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
  })

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setState((s) => ({ ...s, loading: true }))
        const [customers, products] = await Promise.all([
          axios.get(`${API_BASE_URL}/api/direct/customers`).then((res) => (Array.isArray(res.data) ? res.data : [])),
          axios.get(`${API_BASE_URL}/api/direct/products`).then((res) => (Array.isArray(res.data) ? res.data : [])),
        ])
        setState((s) => ({ ...s, customers, products }))
      } catch (err) {
        console.error("Initial fetch error:", err)
        setState((s) => ({ ...s, error: "Failed to fetch initial data", loading: false }))
      }
    }

    const fetchQuotations = async () => {
      try {
        const quotations = await axios.get(`${API_BASE_URL}/api/quotations`).then((res) => {
          const data = Array.isArray(res.data) ? res.data : []
          return data
        })
        setState((s) => ({ ...s, quotations, loading: false }))
      } catch (err) {
        console.error("Quotations fetch error:", err)
        setState((s) => ({ ...s, error: "Failed to fetch quotations", loading: false }))
      }
    }

    fetchInitialData()
    fetchQuotations()
    const intervalId = setInterval(fetchQuotations, 10000)
    return () => clearInterval(intervalId)
  }, [])

  const downloadFile = (url, filename) => {
    const link = document.createElement("a")
    link.href = url
    link.setAttribute("download", filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const addToCart = () => {
    if (!state.selectedProduct) return setState((s) => ({ ...s, error: "Select a product" }))
    const [id, type] = state.selectedProduct.value.split("-")
    const product = state.products.find((p) => p.id.toString() === id && p.product_type === type)
    if (!product) return

    setState((s) => ({
      ...s,
      cart: s.cart.some((item) => item.id === product.id && item.product_type === type)
        ? s.cart.map((item) =>
            item.id === product.id && item.product_type === type ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...s.cart, { ...product, quantity: 1 }],
      selectedProduct: null,
      error: "",
    }))
  }

  const addToEditCart = () => {
    if (!state.selectedProduct) return setState((s) => ({ ...s, error: "Select a product" }))
    const [id, type] = state.selectedProduct.value.split("-")
    const product = state.products.find((p) => p.id.toString() === id && p.product_type === type)
    if (!product) return

    setState((s) => ({
      ...s,
      editCart: s.editCart.some((item) => item.id === product.id && item.product_type === type)
        ? s.editCart.map((item) =>
            item.id === product.id && item.product_type === type ? { ...item, quantity: item.quantity + 1 } : item,
          )
        : [...s.editCart, { ...product, quantity: 1 }],
      selectedProduct: null,
      error: "",
    }))
  }

  const updateQuantityOrDiscount = (id, type, field, value, isEdit = false) => {
    const newValue = Math.max(0, Number(value) || 0)
    const validatedValue = field === "discount" ? Math.min(newValue, 100) : newValue // Cap discount at 100
    setState((s) => ({
      ...s,
      [isEdit ? "editCart" : "cart"]: s[isEdit ? "editCart" : "cart"].map((item) =>
        item.id === id && item.product_type === type ? { ...item, [field]: validatedValue } : item
      ),
    }))
  }

  const removeFromCart = (id, type, isEdit = false) =>
    setState((s) => ({
      ...s,
      [isEdit ? "editCart" : "cart"]: s[isEdit ? "editCart" : "cart"].filter(
        (item) => !(item.id === id && item.product_type === type),
      ),
    }))

  const updateExtraCharges = (field, value) => {
    setState((s) => ({
      ...s,
      extraCharges: { ...s.extraCharges, [field]: Math.max(0, Number(value) || 0) },
    }))
  }

  const calculateTotal = (items, extraCharges = state.extraCharges) => {
    let total = items.reduce((sum, item) => sum + item.price * (1 - item.discount / 100) * item.quantity, 0)
    total += Number(extraCharges.tax || 0)
    total += Number(extraCharges.pf || 0)
    total -= Number(extraCharges.minus || 0)
    return total.toFixed(2)
  }

  const handleCreateQuotation = async () => {
    if (!state.selectedCustomer) return setState((s) => ({ ...s, error: "Select a customer" }))
    if (!state.cart.length) return setState((s) => ({ ...s, error: "Cart is empty" }))

    try {
      const customer = state.customers.find((c) => c.id.toString() === state.selectedCustomer)
      const response = await axios.post(`${API_BASE_URL}/api/quotations`, {
        customer_id: Number(state.selectedCustomer),
        products: state.cart,
        total: calculateTotal(state.cart),
        customer_type: customer?.customer_type || "User",
        extra_charges: state.extraCharges,
      })

      const { est_id } = response.data
      const customerNameForPdf = customer?.customer_name || "unknown"
      downloadFile(
        `${API_BASE_URL}/api/quotations/${est_id}.pdf`,
        `${customerNameForPdf.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${est_id}.pdf`,
      )

      setState((s) => ({
        ...s,
        cart: [],
        selectedCustomer: "",
        selectedProduct: null,
        extraCharges: { tax: 0, pf: 0, minus: 0 },
        quotations: [response.data, ...s.quotations],
        success: "Quotation created and downloaded!",
        error: "",
      }))
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000)
    } catch (err) {
      console.error("Create quotation error:", err)
      setState((s) => ({ ...s, error: err.response?.data?.message || "Failed to create quotation" }))
    }
  }

  const handleEditQuotation = async () => {
    if (!state.editCart.length) return setState((s) => ({ ...s, error: "Cart is empty" }))
    const total = calculateTotal(state.editCart)
    if (isNaN(total) || Number.parseFloat(total) <= 0) {
      return setState((s) => ({ ...s, error: "Invalid total amount" }))
    }

    try {
      const response = await axios.patch(`${API_BASE_URL}/api/quotations/${state.selectedQuotation.est_id}/edit`, {
        products: state.editCart,
        total: Number.parseFloat(total),
        extra_charges: state.extraCharges,
      })

      const { est_id } = response.data
      const customerNameForPdf = state.selectedQuotation.customer_name || "unknown"
      downloadFile(
        `${API_BASE_URL}/api/quotations/${est_id}.pdf`,
        `${customerNameForPdf.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${est_id}.pdf`,
      )

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
            : q,
        ),
        editModal: false,
        selectedQuotation: null,
        editCart: [],
        extraCharges: { tax: 0, pf: 0, minus: 0 },
        success: "Quotation updated and downloaded!",
        error: "",
      }))
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000)
    } catch (err) {
      console.error("Edit quotation error:", err)
      setState((s) => ({ ...s, error: err.response?.data?.message || "Failed to edit quotation" }))
    }
  }

  const handleBookQuotation = async () => {
    if (!state.editCart.length) return setState((s) => ({ ...s, error: "Cart is empty" }))
    const total = calculateTotal(state.editCart)
    if (isNaN(total) || Number.parseFloat(total) <= 0) {
      return setState((s) => ({ ...s, error: "Invalid total amount" }))
    }

    try {
      const customer = state.customers.find((c) => c.id.toString() === state.selectedQuotation.customer_id)
      const response = await axios.post(`${API_BASE_URL}/api/quotations/book`, {
        est_id: state.selectedQuotation.est_id,
        customer_id: Number(state.selectedQuotation.customer_id),
        customer_name: customer?.customer_name || state.selectedQuotation.customer_name,
        address: customer?.address,
        mobile_number: customer?.mobile_number,
        email: customer?.email,
        district: customer?.district,
        state: customer?.state,
        customer_type: customer?.customer_type || state.selectedQuotation.customer_type || "User",
        products: state.editCart,
        total: Number.parseFloat(total),
        extra_charges: state.extraCharges,
      })

      const { order_id } = response.data
      const customerNameForPdf = state.selectedQuotation.customer_name || "unknown"
      downloadFile(
        `${API_BASE_URL}/api/dbooking/invoice/${order_id}.pdf`,
        `${customerNameForPdf.toLowerCase().replace(/[^a-z0-9]+/g, "_")}-${order_id}.pdf`,
      )

      setState((s) => ({
        ...s,
        quotations: s.quotations.map((q) =>
          q.est_id === state.selectedQuotation.est_id ? { ...q, status: "booked" } : q,
        ),
        bookModal: false,
        selectedQuotation: null,
        editCart: [],
        extraCharges: { tax: 0, pf: 0, minus: 0 },
        success: "Booking created and invoice downloaded!",
        error: "",
      }))
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000)
    } catch (err) {
      console.error("Book quotation error:", err)
      setState((s) => ({ ...s, error: err.response?.data?.message || "Failed to book quotation" }))
    }
  }

  const handleCancelQuotation = async (est_id) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/quotations/${est_id}/cancel`)
      setState((s) => ({
        ...s,
        quotations: s.quotations.map((q) => (q.est_id === est_id ? { ...q, status: "canceled" } : q)),
        success: "Quotation canceled!",
        error: "",
      }))
      setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000)
    } catch (err) {
      console.error("Cancel quotation error:", err)
      setState((s) => ({ ...s, error: err.response?.data?.message || "Failed to cancel quotation" }))
    }
  }

  const openModal = async (q, modalType = "view") => {
    if (modalType === "view") {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/quotations/${q.est_id}`, { responseType: "blob" })
        const url = window.URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }))
        setState((s) => ({ ...s, selectedQuotation: q, viewModal: true, pdfUrl: url, pdfError: "" }))
      } catch (err) {
        console.error("PDF fetch error:", err)
        setState((s) => ({ ...s, pdfError: "Failed to load PDF" }))
      }
    } else {
      let parsedProducts = []
      try {
        if (q.products && typeof q.products === "string") {
          parsedProducts = JSON.parse(q.products)
        } else if (Array.isArray(q.products)) {
          parsedProducts = q.products
        }
        if (
          !parsedProducts.every((p) => p.id && p.product_type && p.price && p.discount !== undefined && p.quantity >= 0)
        ) {
          console.error("Invalid product data in parsedProducts")
          setState((s) => ({
            ...s,
            error: "Invalid product data in quotation",
            [modalType === "book" ? "bookModal" : "editModal"]: false,
          }))
          return
        }
      } catch (e) {
        console.error("Failed to parse products:", e)
        setState((s) => ({
          ...s,
          error: "Failed to parse quotation products",
          [modalType === "book" ? "bookModal" : "editModal"]: false,
        }))
        return
      }
      const extraCharges =
        typeof q.extra_charges === "string"
          ? JSON.parse(q.extra_charges)
          : q.extra_charges || { tax: 0, pf: 0, minus: 0 }
      setState((s) => ({
        ...s,
        selectedQuotation: q,
        [modalType === "book" ? "bookModal" : "editModal"]: true,
        editCart: parsedProducts.map((p) => ({ ...p, quantity: p.quantity || 0 })),
        extraCharges,
      }))
    }
  }
const handleDeleteQuotation = async (est_id) => {
  if (!window.confirm("Are you sure you want to delete this quotation?")) return;

  try {
    await axios.delete(`${API_BASE_URL}/api/quotations/${est_id}`);
    setState((s) => ({
      ...s,
      quotations: s.quotations.filter((q) => q.est_id !== est_id),
      success: "Quotation deleted successfully!",
      error: "",
    }));
    setTimeout(() => setState((s) => ({ ...s, success: "" })), 3000);
  } catch (err) {
    console.error("Delete quotation error:", err);
    setState((s) => ({ ...s, error: err.response?.data?.message || "Failed to delete quotation" }));
  }
};

  const closeModal = () => {
    if (state.pdfUrl) {
      window.URL.revokeObjectURL(state.pdfUrl)
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
    }))
  }

  const productOptions = state.products
    .sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true }))
    .map((p) => ({
      value: `${p.id}-${p.product_type}`,
      label: `${p.serial_number} - ${p.productname} (${p.product_type})`,
    }))

  const selectStyles = {
    control: (base) => ({
      ...base,
      padding: "0.25rem",
      fontSize: "1rem",
      borderRadius: "0.5rem",
      borderColor: "#d1d5db",
      backgroundColor: "#fff",
      color: "#1f2937",
      "&:hover": { borderColor: "#3b82f6" },
      "@media (max-width: 640px)": { fontSize: "0.875rem" },
      ".dark &": { backgroundColor: "#1f2937", color: "#fff", borderColor: "#4b5563" },
    }),
    menu: (base) => ({
      ...base,
      zIndex: 20,
      fontSize: "1rem",
      backgroundColor: "#fff",
      color: "#1f2937",
      "@media (max-width: 640px)": { fontSize: "0.875rem" },
      ".dark &": { backgroundColor: "#1f2937", color: "#fff" },
    }),
    option: (base, { isFocused, isSelected }) => ({
      ...base,
      backgroundColor: isSelected ? "#3b82f6" : isFocused ? "#e5e7eb" : "#fff",
      color: isSelected ? "#fff" : "#1f2937",
      ".dark &": { backgroundColor: isSelected ? "#2563eb" : isFocused ? "#374151" : "#1f2937", color: "#fff" },
    }),
    singleValue: (base) => ({ ...base, color: "#1f2937", ".dark &": { color: "#fff" } }),
    placeholder: (base) => ({ ...base, color: "#6b7280", ".dark &": { color: "#9ca3af" } }),
    input: (base) => ({ ...base, color: "#1f2937", ".dark &": { color: "#fff" } }),
  }

  const renderTable = (items, isEdit = false) => (
    <table className="w-full bg-white dark:bg-gray-800 shadow rounded-lg mobile:text-xs">
      <thead className="bg-gray-200 dark:bg-gray-700">
        <tr className="text-lg mobile:text-sm">
          {["Sl No.", "Product", "Type", "Price", "Discount", "Qty", "Per", "Total", isEdit && "Actions"]
            .filter(Boolean)
            .map((h) => (
              <th key={h} className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">
                {h}
              </th>
            ))}
        </tr>
      </thead>
      <tbody>
        {items.length ? (
          [...items]
            .sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true }))
            .map((item) => (
              <tr
                key={`${item.id}-${item.product_type}`}
                className="border-t border-gray-200 dark:border-gray-700 mobile:text-sm"
              >
                <td className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">{item.serial_number}</td>
                <td className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">{item.productname}</td>
                <td className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">{item.product_type}</td>
                <td className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">₹{item.price}</td>
                <td className="text-center mobile:p-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={item.discount}
                    onChange={(e) =>
                      updateQuantityOrDiscount(item.id, item.product_type, "discount", e.target.value, isEdit)
                    }
                    className="w-16 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                  />
                </td>
                <td className="text-center mobile:p-1">
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) =>
                      updateQuantityOrDiscount(item.id, item.product_type, "quantity", e.target.value, isEdit)
                    }
                    className="w-16 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                  />
                </td>
                <td className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">{item.per}</td>
                <td className="text-center mobile:p-1 text-gray-800 dark:text-gray-100">
                  ₹{(item.price * (1 - item.discount / 100) * item.quantity).toFixed(2)}
                </td>
                {isEdit && (
                  <td className="text-center mobile:p-1">
                    <button
                      onClick={() => removeFromCart(item.id, item.product_type, true)}
                      className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold mobile:text-xs"
                    >
                      Remove
                    </button>
                  </td>
                )}
              </tr>
            ))
        ) : (
          <tr>
            <td
              colSpan={isEdit ? 9 : 8}
              className="p-4 text-center text-gray-500 dark:text-gray-400 mobile:p-2 mobile:text-xs"
            >
              No products
            </td>
          </tr>
        )}
      </tbody>
    </table>
  )

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-white mobile:flex-col">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex justify-center mobile:p-2">
        <div className="w-full max-w-5xl p-6 mobile:p-4">
          <h1 className="text-4xl font-bold mb-8 text-center mobile:text-2xl">Create Quotation</h1>
          {state.error && (
            <div className="bg-red-100 dark:bg-red-800 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-100 px-6 py-3 rounded-lg mb-6 text-center mobile:text-sm">
              {state.error}
            </div>
          )}
          {state.success && (
            <div className="bg-green-100 dark:bg-green-800 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-100 px-6 py-3 rounded-lg mb-6 text-center mobile:text-sm">
              {state.success}
            </div>
          )}
          <div className="flex flex-wrap gap-6 justify-center mb-8 mobile:flex-col mobile:gap-3">
            <div className="flex flex-col items-center mobile:w-full">
              <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 mobile:text-base">
                Customer
              </label>
              <select
                value={state.selectedCustomer}
                onChange={(e) => setState((s) => ({ ...s, selectedCustomer: e.target.value }))}
                className="w-96 p-3 border rounded-lg bg-white dark:bg-gray-800 mobile:w-full mobile:p-2 mobile:text-sm"
              >
                <option value="">Select a customer</option>
                {state.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customer_type || "User"})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center mobile:w-full">
              <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2 mobile:text-base">
                Product
              </label>
              <Select
                value={state.selectedProduct}
                onChange={(val) => setState((s) => ({ ...s, selectedProduct: val }))}
                options={productOptions}
                placeholder="Search for a product..."
                isClearable
                className="w-96 mobile:w-full"
                styles={selectStyles}
              />
            </div>
            <button
              onClick={addToCart}
              disabled={!state.selectedProduct}
              className="mt-8 w-50 h-10 bg-blue-600 dark:bg-blue-700 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 dark:hover:bg-blue-800 mobile:mt-4 mobile:w-full mobile:py-1 mobile:px-4 mobile:text-sm"
            >
              Add to Cart
            </button>
          </div>
          <div className="flex flex-col items-center mb-4">
            <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Extra Charges</label>
            <div className="flex gap-4">
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Tax (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={state.extraCharges.tax}
                  onChange={(e) => updateExtraCharges("tax", e.target.value)}
                  className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">P&F (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={state.extraCharges.pf}
                  onChange={(e) => updateExtraCharges("pf", e.target.value)}
                  className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 dark:text-gray-400">Deduction (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={state.extraCharges.minus}
                  onChange={(e) => updateExtraCharges("minus", e.target.value)}
                  className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto onefifty:ml-32">{renderTable(state.cart)}</div>
          <div className="text-xl text-center mt-4 font-bold mobile:text-base mobile:mt-2">
            Total: ₹{calculateTotal(state.cart)}
          </div>
          <div className="flex justify-center mt-8 mobile:mt-4">
            <button
              onClick={handleCreateQuotation}
              className="bg-green-600 dark:bg-green-700 w-50 h-10 text-white px-8 py-4 rounded-lg font-bold hover:bg-green-700 dark:hover:bg-green-800 mobile:w-full mobile:py-2 mobile:px-6 mobile:text-sm"
            >
              Create Quotation
            </button>
          </div>
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4 text-center mobile:text-xl">Quotations</h2>
            {!state.quotations.length ? (
              <p className="text-center text-gray-500 dark:text-gray-400 mobile:text-sm">No quotations found</p>
            ) : (
              <div className="grid mobile:grid-cols-1 onefifty:grid-cols-3 gap-6">
                {state.quotations.map((q) => (
                  <div key={q.est_id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{q.customer_name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quotation ID: {q.est_id}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Customer: {q.customer_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Status: {q.status}</p>
                    <div className="mt-4 flex justify-between gap-2">
                      <button
                        onClick={() => openModal(q, "view")}
                        className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-600"
                      >
                        View
                      </button>
                      <button
                        onClick={() => openModal(q, "edit")}
                        disabled={q.status !== "pending"}
                        className={`flex-1 px-2 py-1 rounded-md text-sm text-white ${q.status !== "pending" ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" : "bg-yellow-600 dark:bg-yellow-500 hover:bg-yellow-700 dark:hover:bg-yellow-600"}`}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => openModal(q, "book")}
                        disabled={q.status !== "pending"}
                        className={`flex-1 px-2 py-1 rounded-md text-sm text-white ${q.status !== "pending" ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" : "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"}`}
                      >
                        Book
                      </button>
                      <button
                        onClick={() => handleCancelQuotation(q.est_id)}
                        disabled={q.status !== "pending"}
                        className={`flex-1 px-2 py-1 rounded-md text-sm text-white ${q.status !== "pending" ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" : "bg-red-600 dark:bg-red-500 hover:bg-red-700 dark:hover:bg-red-600"}`}
                      >
                        Cancel
                      </button>
<button
  onClick={() => handleDeleteQuotation(q.est_id)}
  className="flex-1 bg-red-700 dark:bg-red-600 text-white px-2 py-1 rounded-md text-sm hover:bg-red-800 dark:hover:bg-red-700"
>
  Delete
</button>



                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Modal
            isOpen={state.viewModal}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
          >
            {state.selectedQuotation && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full">
                <div className="flex justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Quotation Details</h2>
                </div>
                {state.pdfError ? (
                  <div className="text-red-600 dark:text-red-400 text-center p-4">{state.pdfError}</div>
                ) : state.pdfUrl ? (
                  <iframe
                    src={state.pdfUrl}
                    title="Quotation PDF"
                    width="100%"
                    height="600"
                    style={{ border: "none" }}
                  />
                ) : (
                  <div className="text-gray-600 dark:text-gray-400 text-center p-4">Loading PDF...</div>
                )}
                {["Customer Name", "EST ID", "Total", "Status"].map((label) => (
                  <div key={label} className="flex mt-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300 w-32">{label}:</span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {label === "Total"
                        ? `₹${state.selectedQuotation.total}`
                        : state.selectedQuotation[label.toLowerCase().replace(" ", "_")]}
                    </span>
                  </div>
                ))}
                <button
                  onClick={closeModal}
                  className="mt-6 bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            )}
          </Modal>
          <Modal
            isOpen={state.editModal}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
          >
            {state.selectedQuotation && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Edit Quotation</h2>
                <div className="flex flex-col items-center mb-4">
                  <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Add Product</label>
                  <Select
                    value={state.selectedProduct}
                    onChange={(val) => setState((s) => ({ ...s, selectedProduct: val }))}
                    options={productOptions}
                    placeholder="Search for a product..."
                    isClearable
                    className="w-96 mobile:w-full"
                    styles={selectStyles}
                  />
                  <button
                    onClick={addToEditCart}
                    disabled={!state.selectedProduct}
                    className="mt-4 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    Add to Cart
                  </button>
                </div>
                <div className="flex flex-col items-center mb-4">
                  <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Extra Charges</label>
                  <div className="flex gap-4">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Tax (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={state.extraCharges.tax}
                        onChange={(e) => updateExtraCharges("tax", e.target.value)}
                        className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">P&F (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={state.extraCharges.pf}
                        onChange={(e) => updateExtraCharges("pf", e.target.value)}
                        className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Deduction (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={state.extraCharges.minus}
                        onChange={(e) => updateExtraCharges("minus", e.target.value)}
                        className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
                {renderTable(state.editCart, true)}
                <div className="text-xl text-center mt-4 font-bold dark:text-gray-100 mobile:text-base mobile:mt-2">
                  Total: ₹{calculateTotal(state.editCart)}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEditQuotation}
                    className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 dark:hover:bg-green-800"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </Modal>
          <Modal
            isOpen={state.bookModal}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
          >
            {state.selectedQuotation && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-3xl w-full">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Book Quotation</h2>
                <div className="flex flex-col items-center mb-4">
                  <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Add Product</label>
                  <Select
                    value={state.selectedProduct}
                    onChange={(val) => setState((s) => ({ ...s, selectedProduct: val }))}
                    options={productOptions}
                    placeholder="Search for a product..."
                    isClearable
                    className="w-96 mobile:w-full"
                    styles={selectStyles}
                  />
                  <button
                    onClick={addToEditCart}
                    disabled={!state.selectedProduct}
                    className="mt-4 bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-800"
                  >
                    Add to Cart
                  </button>
                </div>
                <div className="flex flex-col items-center mb-4">
                  <label className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">Extra Charges</label>
                  <div className="flex gap-4">
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Tax (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={state.extraCharges.tax}
                        onChange={(e) => updateExtraCharges("tax", e.target.value)}
                        className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">P&F (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={state.extraCharges.pf}
                        onChange={(e) => updateExtraCharges("pf", e.target.value)}
                        className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-600 dark:text-gray-400">Deduction (₹)</label>
                      <input
                        type="number"
                        min="0"
                        value={state.extraCharges.minus}
                        onChange={(e) => updateExtraCharges("minus", e.target.value)}
                        className="w-20 p-1 border rounded text-center text-gray-800 dark:text-gray-100 dark:bg-gray-700"
                      />
                    </div>
                  </div>
                </div>
                {renderTable(state.editCart, true)}
                <div className="text-xl text-center mt-4 font-bold dark:text-gray-100 mobile:text-base mobile:mt-2">
                  Total: ₹{calculateTotal(state.editCart)}
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={closeModal}
                    className="bg-gray-600 dark:bg-gray-500 text-white px-4 py-2 rounded-md text-sm hover:bg-gray-700 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBookQuotation}
                    className="bg-green-600 dark:bg-green-700 text-white px-4 py-2 rounded-md text-sm hover:bg-green-700 dark:hover:bg-green-800"
                  >
                    Book
                  </button>

                </div>
              </div>
            )}
          </Modal>
        </div>
      </div>
    </div>
  )
}