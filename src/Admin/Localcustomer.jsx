import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./Sidebar/Sidebar";
import { API_BASE_URL, API_BASE_URL_loc } from "../../Config";
import Logout from "./Logout";
import { 
  FaUserPlus, 
  FaUsers, 
  FaUserTie, 
  FaSearch, 
  FaMapMarkerAlt, 
  FaPhoneAlt, 
  FaEnvelope, 
  FaBuilding,
  FaEdit,
  FaTrash,
  FaEye,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
  FaSpinner,
  FaIdCard,
  FaFileInvoice,
  FaFilePdf,
  FaSyncAlt,
  FaDownload
} from "react-icons/fa";

export default function Localcustomer() {
  const [activeTab, setActiveTab] = useState("add"); // 'add' | 'list'
  const [customersList, setCustomersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState({
    customerName: "", state: "", district: "", mobileNumber: "", email: "", address: "",
    customerType: "Customer", agentName: "", agentContact: "", agentEmail: "", agentState: "",
    agentDistrict: "", agentAddress: "", custAgentName: "", custAgentContact: "",
    custAgentEmail: "", custAgentAddress: "", custAgentDistrict: "", custAgentState: "",
    boxCount: 1
  });
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  // Edit Name states
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [editingNameValue, setEditingNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Full Edit Customer Details Modal state
  const [editModalCustomer, setEditModalCustomer] = useState(null);
  const [editModalForm, setEditModalForm] = useState({
    customer_name: "",
    mobile_number: "",
    email: "",
    address: "",
    district: "",
    state: "",
  });
  const [isSavingFullEdit, setIsSavingFullEdit] = useState(false);

  // View Customer Details Modal & Bills state
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [customerBookings, setCustomerBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [regeneratingOrderId, setRegeneratingOrderId] = useState(null);

  // Delete Customer states
  const [deletingCustomer, setDeletingCustomer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Action status message
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchStates();
    fetchCustomersList();
  }, []);

  const fetchStates = async () => {
    try {
      const response = await fetch(`${API_BASE_URL_loc}/api/locations/states`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setStates(data);
      if (data.length > 0 && formData.customerType !== "Customer of Selected Agent") {
        setFormData((prev) => ({ ...prev, state: data[0].name }));
        await fetchDistricts(data[0].name);
      }
    } catch (error) {
      console.error("Error fetching states:", error);
    }
  };

  const fetchDistricts = async (stateName, isAgent = false) => {
    if (!stateName) return setDistricts([]);
    try {
      const response = await fetch(`${API_BASE_URL_loc}/api/locations/states/${stateName}/districts`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setDistricts(data);
      if (data.length > 0) {
        setFormData((prev) => ({ ...prev, [isAgent ? "agentDistrict" : "district"]: data[0].name }));
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hifi/directcust/agents`);
      if (response.ok) {
        setAgents(await response.json());
      }
    } catch (error) {
      console.error("Error fetching agents:", error);
    }
  };

  const fetchCustomersList = async () => {
    setLoadingList(true);
    try {
      let response = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers`);
      if (!response.ok) {
        response = await fetch(`${API_BASE_URL}/api/directcust/customers`);
      }
      if (response.ok) {
        const data = await response.json();
        setCustomersList(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error fetching customers list:", err);
    } finally {
      setLoadingList(false);
    }
  };

  const triggerActionMessage = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage({ type: "", text: "" });
    }, 4500);
  };

  const handleStartEditName = (cust) => {
    setEditingCustomerId(cust.id);
    setEditingNameValue(cust.customer_name || "");
  };

  const handleCancelEditName = () => {
    setEditingCustomerId(null);
    setEditingNameValue("");
  };

  const handleSaveName = async (customerId) => {
    const trimmed = editingNameValue.trim();
    if (!trimmed) {
      triggerActionMessage("error", "Customer name cannot be empty.");
      return;
    }

    setIsSavingName(true);
    try {
      let res = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers/${customerId}/name`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customer_name: trimmed }),
      });

      if (!res.ok) {
        // Fallback to /api/directcust/customers/:id/name
        res = await fetch(`${API_BASE_URL}/api/directcust/customers/${customerId}/name`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customer_name: trimmed }),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update customer name.");
      }

      setCustomersList((prev) =>
        prev.map((c) => (c.id === customerId ? { ...c, customer_name: trimmed } : c))
      );
      if (viewingCustomer && viewingCustomer.id === customerId) {
        setViewingCustomer((prev) => ({ ...prev, customer_name: trimmed }));
        fetchCustomerBookings(customerId);
      }
      setEditingCustomerId(null);
      triggerActionMessage("success", "Customer name updated! Associated bills have been refreshed with new name.");
    } catch (err) {
      console.error("Error updating customer name:", err);
      triggerActionMessage("error", err.message || "Failed to update customer name.");
    } finally {
      setIsSavingName(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingCustomer) return;
    setIsDeleting(true);
    try {
      let res = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers/${deletingCustomer.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        // Fallback to /api/directcust/customers/:id
        res = await fetch(`${API_BASE_URL}/api/directcust/customers/${deletingCustomer.id}`, {
          method: "DELETE",
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete customer.");
      }

      setCustomersList((prev) => prev.filter((c) => c.id !== deletingCustomer.id));
      if (viewingCustomer && viewingCustomer.id === deletingCustomer.id) {
        setViewingCustomer(null);
      }
      triggerActionMessage(
        "success",
        `Customer "${deletingCustomer.customer_name}" and all entered details deleted successfully.`
      );
      setDeletingCustomer(null);
    } catch (err) {
      console.error("Error deleting customer:", err);
      triggerActionMessage("error", err.message || "Failed to delete customer.");
    } finally {
      setIsDeleting(false);
    }
  };

  const fetchCustomerBookings = async (customerId) => {
    setLoadingBookings(true);
    try {
      let res = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers/${customerId}/bookings`);
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/directcust/customers/${customerId}/bookings`);
      }
      if (res.ok) {
        const data = await res.json();
        setCustomerBookings(Array.isArray(data) ? data : []);
      } else {
        setCustomerBookings([]);
      }
    } catch (e) {
      console.error("Error fetching bookings for customer:", e);
      setCustomerBookings([]);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleOpenViewModal = (cust) => {
    setViewingCustomer(cust);
    fetchCustomerBookings(cust.id);
  };

  const handleOpenFullEdit = (cust) => {
    setEditModalCustomer(cust);
    setEditModalForm({
      customer_name: cust.customer_name || cust.name || "",
      mobile_number: cust.mobile_number || "",
      email: cust.email || "",
      address: cust.address || "",
      district: cust.district || "",
      state: cust.state || "",
    });
  };

  const handleSaveFullEdit = async (e) => {
    e.preventDefault();
    if (!editModalCustomer) return;
    if (!editModalForm.customer_name.trim()) {
      triggerActionMessage("error", "Customer name is required.");
      return;
    }
    if (!editModalForm.mobile_number.trim()) {
      triggerActionMessage("error", "Mobile number is required.");
      return;
    }

    setIsSavingFullEdit(true);
    try {
      let res = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers/${editModalCustomer.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editModalForm),
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/directcust/customers/${editModalCustomer.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editModalForm),
        });
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update customer details.");
      }

      const updated = {
        ...editModalCustomer,
        ...editModalForm,
      };

      setCustomersList((prev) =>
        prev.map((c) => (c.id === editModalCustomer.id ? updated : c))
      );

      if (viewingCustomer && viewingCustomer.id === editModalCustomer.id) {
        setViewingCustomer(updated);
        fetchCustomerBookings(editModalCustomer.id);
      }

      setEditModalCustomer(null);
      triggerActionMessage(
        "success",
        `Customer "${updated.customer_name}" updated! Associated bills have been refreshed with new details.`
      );
    } catch (err) {
      console.error("Error saving customer details:", err);
      triggerActionMessage("error", err.message || "Failed to save customer details.");
    } finally {
      setIsSavingFullEdit(false);
    }
  };

  const handleRegenerateBill = async (orderId) => {
    if (!viewingCustomer) return;
    setRegeneratingOrderId(orderId);
    try {
      let res = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers/${viewingCustomer.id}/bills/${orderId}/regenerate`, {
        method: "POST",
      });
      if (!res.ok) {
        res = await fetch(`${API_BASE_URL}/api/directcust/customers/${viewingCustomer.id}/bills/${orderId}/regenerate`, {
          method: "POST",
        });
      }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to regenerate bill.");
      }
      triggerActionMessage("success", `Fresh bill for Order #${orderId} generated successfully!`);
      fetchCustomerBookings(viewingCustomer.id);
    } catch (err) {
      console.error("Error regenerating bill:", err);
      triggerActionMessage("error", err.message || "Could not regenerate bill.");
    } finally {
      setRegeneratingOrderId(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "boxCount" ? Math.max(1, parseInt(value) || 1) : value || "" }));
    setError(null);

    if (name === "state") {
      fetchDistricts(value);
      setFormData((prev) => ({ ...prev, district: "" }));
    } else if (name === "agentState") {
      fetchDistricts(value, true);
      setFormData((prev) => ({ ...prev, agentDistrict: "" }));
    } else if (name === "custAgentState") {
      fetchDistricts(value, true);
      setFormData((prev) => ({ ...prev, custAgentDistrict: "" }));
    } else if (name === "customerType") {
      setFormData({
        customerName: "", state: "", district: "", mobileNumber: "", email: "", address: "",
        customerType: value.trim(), agentName: "", agentContact: "", agentEmail: "",
        agentState: "", agentDistrict: "", agentAddress: "", custAgentName: "",
        custAgentContact: "", custAgentEmail: "", custAgentAddress: "",
        custAgentDistrict: "", custAgentState: "", boxCount: 1
      });
      setSelectedAgent("");
      if (value.trim() === "Customer of Selected Agent") fetchAgents();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredCheck = () => {
      if (formData.customerType === "Customer") {
        if (!formData.customerName.trim() || !formData.state.trim() || !formData.district.trim() ||
            !formData.mobileNumber.trim() || !formData.address.trim()) {
          return "Please fill all required fields for Customer.";
        }
      } else if (formData.customerType === "Agent") {
        if (!formData.agentName.trim() || !formData.agentContact.trim() || !formData.agentState.trim() ||
            !formData.agentDistrict.trim() || !formData.agentAddress.trim()) {
          return "Please fill all required fields for Agent.";
        }
      } else if (formData.customerType === "Customer of Selected Agent") {
        if (!selectedAgent || !formData.custAgentName.trim() || !formData.custAgentContact.trim() ||
            !formData.custAgentState.trim() || !formData.custAgentDistrict.trim() ||
            !formData.custAgentAddress.trim()) {
          return "Please fill all required fields for Customer of Selected Agent.";
        }
      }
      return null;
    };

    const validationError = requiredCheck();
    if (validationError) return setError(validationError);

    try {
      const payload = {
        customer_name: formData.customerName?.trim() || "",
        state: formData.state?.trim() || "",
        district: formData.district?.trim() || "",
        mobile_number: formData.mobileNumber?.trim() || "",
        email: formData.email?.trim() || null,
        address: formData.customerType === "Agent" ? formData.agentAddress?.trim() || "" : formData.address?.trim() || "",
        customer_type: formData.customerType?.trim() || "",
        agent_id: selectedAgent || null,
        agent_name: formData.agentName?.trim() || null,
        agent_contact: formData.agentContact?.trim() || null,
        agent_email: formData.agentEmail?.trim() || null,
        agent_state: formData.agentState?.trim() || null,
        agent_district: formData.agentDistrict?.trim() || null,
        cust_agent_name: formData.custAgentName?.trim() || null,
        cust_agent_contact: formData.custAgentContact?.trim() || null,
        cust_agent_email: formData.custAgentEmail?.trim() || null,
        cust_agent_address: formData.custAgentAddress?.trim() || null,
        cust_agent_district: formData.custAgentDistrict?.trim() || null,
        cust_agent_state: formData.custAgentState?.trim() || null,
        box_count: formData.boxCount
      };

      const response = await fetch(`${API_BASE_URL}/api/hifi/directcust/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! Status: ${response.status}`);
      }
      setSuccess(true);
      setError(null);
      setFormData({
        customerName: "", state: "", district: "", mobileNumber: "", email: "", address: "",
        customerType: "Customer", agentName: "", agentContact: "", agentEmail: "",
        agentState: "", agentDistrict: "", agentAddress: "", custAgentName: "",
        custAgentContact: "", custAgentEmail: "", custAgentAddress: "",
        custAgentDistrict: "", custAgentState: "", boxCount: 1
      });
      setSelectedAgent("");
      fetchCustomersList();
      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error("Error saving customer:", error);
      setError(error.message || "Failed to save customer.");
      setSuccess(false);
    }
  };

  const filteredCustomers = useMemo(() => {
    return customersList.filter((c) => {
      const q = searchQuery.toLowerCase().trim();
      return (
        !q ||
        (c.customer_name && c.customer_name.toLowerCase().includes(q)) ||
        (c.mobile_number && c.mobile_number.includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q)) ||
        (c.customer_type && c.customer_type.toLowerCase().includes(q))
      );
    });
  }, [customersList, searchQuery]);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 hundred:ml-64 onefifty:ml-1 p-3 sm:p-6 md:p-8 pt-16 sm:pt-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="max-w-5xl mx-auto space-y-6 min-w-0 w-full">

          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  Direct Customer & Agent Desk
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Onboard direct walk-in customers, commission agents, and view registered directory
                </p>
              </div>

              {/* Tab toggles */}
              <div className="flex p-1 bg-gray-100 dark:bg-gray-700/60 rounded-xl">
                <button
                  onClick={() => setActiveTab("add")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "add"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                  }`}
                >
                  <FaUserPlus /> New Registration
                </button>
                <button
                  onClick={() => setActiveTab("list")}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === "list"
                      ? "bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-600 dark:text-gray-300 hover:text-gray-900"
                  }`}
                >
                  <FaUsers /> Customer Directory ({customersList.length})
                </button>
              </div>
            </div>

            {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200">{error}</div>}
            {success && <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-200">Customer registered successfully!</div>}
            {actionMessage.text && (
              <div
                className={`mt-4 p-3.5 text-sm font-medium rounded-xl border flex items-center gap-2.5 shadow-sm transition ${
                  actionMessage.type === "error"
                    ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
                    : "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                }`}
              >
                {actionMessage.type === "error" ? (
                  <FaExclamationTriangle className="shrink-0 text-base" />
                ) : (
                  <FaCheck className="shrink-0 text-base" />
                )}
                <span>{actionMessage.text}</span>
              </div>
            )}
          </div>

          {activeTab === "add" ? (
            /* Registration Form */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6 md:p-8">
              {/* Customer Type Pills */}
              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                  Select Account Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "Customer", label: "Direct Customer", icon: <FaUsers /> },
                    { id: "Agent", label: "Agent / Broker", icon: <FaUserTie /> },
                    { id: "Customer of Selected Agent", label: "Agent's Client", icon: <FaBuilding /> },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleChange({ target: { name: "customerType", value: t.id } })}
                      className={`p-3.5 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition ${
                        formData.customerType === t.id
                          ? "border-blue-600 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 ring-2 ring-blue-600/20"
                          : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Regular Customer fields */}
                {formData.customerType === "Customer" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Customer Full Name *
                      </label>
                      <input
                        type="text"
                        name="customerName"
                        value={formData.customerName}
                        onChange={handleChange}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Mobile Number *
                      </label>
                      <input
                        type="tel"
                        name="mobileNumber"
                        value={formData.mobileNumber}
                        onChange={handleChange}
                        placeholder="10-digit mobile number"
                        pattern="\d{10}"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        State *
                      </label>
                      <select
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        District *
                      </label>
                      <select
                        name="district"
                        value={formData.district}
                        onChange={handleChange}
                        disabled={!formData.state}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      >
                        <option value="">Select District</option>
                        {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="customer@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Delivery Address *
                      </label>
                      <textarea
                        name="address"
                        rows="3"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="House / Shop No., Street, Landmark, Pincode"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Agent fields */}
                {formData.customerType === "Agent" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Agent Name *
                      </label>
                      <input
                        type="text"
                        name="agentName"
                        value={formData.agentName}
                        onChange={handleChange}
                        placeholder="Agent Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Contact Number *
                      </label>
                      <input
                        type="tel"
                        name="agentContact"
                        value={formData.agentContact}
                        onChange={handleChange}
                        pattern="\d{10}"
                        placeholder="10-digit mobile"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Agent State *
                      </label>
                      <select
                        name="agentState"
                        value={formData.agentState}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Agent District *
                      </label>
                      <select
                        name="agentDistrict"
                        value={formData.agentDistrict}
                        onChange={handleChange}
                        disabled={!formData.agentState}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      >
                        <option value="">Select District</option>
                        {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Office Address *
                      </label>
                      <textarea
                        name="agentAddress"
                        rows="3"
                        value={formData.agentAddress}
                        onChange={handleChange}
                        placeholder="Office Address"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* Agent's Customer fields */}
                {formData.customerType === "Customer of Selected Agent" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Select Associated Agent *
                      </label>
                      <select
                        value={selectedAgent}
                        onChange={(e) => setSelectedAgent(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold"
                        required
                      >
                        <option value="">Choose Agent</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>{a.customer_name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Client Name *
                      </label>
                      <input
                        type="text"
                        name="custAgentName"
                        value={formData.custAgentName}
                        onChange={handleChange}
                        placeholder="Client Name"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Client Contact *
                      </label>
                      <input
                        type="tel"
                        name="custAgentContact"
                        value={formData.custAgentContact}
                        onChange={handleChange}
                        pattern="\d{10}"
                        placeholder="10-digit mobile"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Client State *
                      </label>
                      <select
                        name="custAgentState"
                        value={formData.custAgentState}
                        onChange={handleChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      >
                        <option value="">Select State</option>
                        {states.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Client District *
                      </label>
                      <select
                        name="custAgentDistrict"
                        value={formData.custAgentDistrict}
                        onChange={handleChange}
                        disabled={!formData.custAgentState}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      >
                        <option value="">Select District</option>
                        {districts.map((d) => <option key={d.id} value={d.name}>{d.name}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                        Client Address *
                      </label>
                      <textarea
                        name="custAgentAddress"
                        rows="3"
                        value={formData.custAgentAddress}
                        onChange={handleChange}
                        placeholder="Delivery Address"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition hover:scale-102"
                  >
                    Save & Register Account
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Registered Directory */
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search registered customers by name, phone, district, or type..."
                  className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <FaSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                {searchQuery && (
                  <button onClick={() => setSearchQuery("")} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-lg">×</button>
                )}
              </div>

              {loadingList ? (
                <div className="text-center py-12 text-gray-400">Loading directory...</div>
              ) : filteredCustomers.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">No registered customers found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCustomers.map((cust) => {
                    const isEditing = editingCustomerId === cust.id;
                    const displayName = cust.customer_name || cust.name || cust.cust_name || "Unnamed Customer";
                    return (
                      <div
                        key={cust.id}
                        className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition duration-200 flex flex-col justify-between"
                      >
                        <div>
                          {/* Card Header */}
                          <div className="flex justify-between items-start gap-2 mb-3">
                            {isEditing ? (
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <input
                                  type="text"
                                  value={editingNameValue}
                                  onChange={(e) => setEditingNameValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSaveName(cust.id);
                                    if (e.key === "Escape") handleCancelEditName();
                                  }}
                                  autoFocus
                                  placeholder="Enter new name"
                                  className="w-full text-sm font-semibold px-2.5 py-1.5 rounded-lg border-2 border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                                <button
                                  onClick={() => handleSaveName(cust.id)}
                                  disabled={isSavingName}
                                  title="Save Name"
                                  className="p-2 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                                >
                                  {isSavingName ? <FaSpinner className="animate-spin text-xs" /> : <FaCheck className="text-xs" />}
                                </button>
                                <button
                                  onClick={handleCancelEditName}
                                  disabled={isSavingName}
                                  title="Cancel"
                                  className="p-2 text-xs rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition shrink-0 flex items-center justify-center cursor-pointer"
                                >
                                  <FaTimes className="text-xs" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <h4
                                  className="font-extrabold text-base text-gray-900 dark:text-white truncate"
                                  title={displayName}
                                >
                                  {displayName}
                                </h4>
                                <button
                                  onClick={() => handleStartEditName(cust)}
                                  title="Edit Name"
                                  className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 transition p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-xs shrink-0 cursor-pointer"
                                >
                                  <FaEdit />
                                </button>
                              </div>
                            )}

                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border uppercase shrink-0 ${
                                cust.customer_type === "Agent"
                                  ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800"
                                  : cust.customer_type === "Customer of Selected Agent"
                                  ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                                  : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800"
                              }`}
                            >
                              {cust.customer_type || "Customer"}
                            </span>
                          </div>

                          {/* Card Details */}
                          <div className="space-y-1.5 text-xs text-gray-700 dark:text-gray-300">
                            <p className="flex items-center gap-2">
                              <FaPhoneAlt className="text-blue-500 dark:text-blue-400 text-[10px] shrink-0" />
                              <span className="font-semibold text-gray-900 dark:text-gray-200">{cust.mobile_number || "No contact"}</span>
                            </p>
                            {cust.email && (
                              <p className="flex items-center gap-2">
                                <FaEnvelope className="text-gray-400 text-[10px] shrink-0" />
                                <span className="truncate text-gray-600 dark:text-gray-300" title={cust.email}>{cust.email}</span>
                              </p>
                            )}
                            <p className="flex items-center gap-2">
                              <FaMapMarkerAlt className="text-gray-400 text-[10px] shrink-0" />
                              <span className="text-gray-600 dark:text-gray-300">{cust.district ? `${cust.district}, ` : ""}{cust.state || "Location unassigned"}</span>
                            </p>
                            {cust.address && (
                              <p className="text-gray-500 dark:text-gray-400 text-[11px] line-clamp-2 pl-3 border-l-2 border-gray-200 dark:border-gray-700 my-1">
                                {cust.address}
                              </p>
                            )}
                            {cust.agent_name && (
                              <p className="flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-400 pt-1 font-medium">
                                <FaUserTie className="text-[10px] shrink-0" />
                                <span>Agent: <strong className="text-gray-900 dark:text-white">{cust.agent_name}</strong></span>
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Card Action Buttons: Edit Details, View & Bills, Delete */}
                        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-2">
                          <button
                            onClick={() => handleOpenFullEdit(cust)}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/40 dark:hover:text-blue-300 hover:border-blue-300 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <FaEdit className="text-[10px]" /> Edit Details
                          </button>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleOpenViewModal(cust)}
                              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition flex items-center gap-1.5 cursor-pointer"
                              title="View details and fresh bills"
                            >
                              <FaEye className="text-[10px]" /> View & Bills
                            </button>

                            <button
                              onClick={() => setDeletingCustomer(cust)}
                              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1.5 cursor-pointer"
                              title="Delete customer and all details"
                            >
                              <FaTrash className="text-[10px]" /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* View Customer Details & Associated Bills Modal */}
              {viewingCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                          <FaIdCard className="text-xl" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Customer Profile & Bills</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">All entered records & synchronized billing history</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewingCustomer(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <FaTimes className="text-base" />
                      </button>
                    </div>

                    {/* Modal Content */}
                    <div className="p-6 space-y-4 overflow-y-auto">
                      {/* Name & Type header banner */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-200/70 dark:border-gray-800">
                        <div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-bold block">
                            Customer Name
                          </span>
                          <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                            {viewingCustomer.customer_name || viewingCustomer.name || viewingCustomer.cust_name || "Unnamed Customer"}
                          </span>
                        </div>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border uppercase ${
                            viewingCustomer.customer_type === "Agent"
                              ? "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                              : viewingCustomer.customer_type === "Customer of Selected Agent"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800"
                              : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800"
                          }`}
                        >
                          {viewingCustomer.customer_type || "Customer"}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-gray-50/50 dark:bg-gray-900/40">
                          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
                            <FaPhoneAlt className="text-blue-500 text-[10px]" /> Mobile Number
                          </span>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {viewingCustomer.mobile_number || "Not provided"}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-gray-50/50 dark:bg-gray-900/40">
                          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
                            <FaEnvelope className="text-blue-500 text-[10px]" /> Email Address
                          </span>
                          <p className="text-sm font-bold text-gray-900 dark:text-white truncate" title={viewingCustomer.email}>
                            {viewingCustomer.email || "Not provided"}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-gray-50/50 dark:bg-gray-900/40">
                          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
                            <FaMapMarkerAlt className="text-blue-500 text-[10px]" /> District
                          </span>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {viewingCustomer.district || "Not specified"}
                          </p>
                        </div>

                        <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-gray-50/50 dark:bg-gray-900/40">
                          <span className="text-[11px] font-semibold text-gray-400 flex items-center gap-1.5 mb-1">
                            <FaBuilding className="text-blue-500 text-[10px]" /> State
                          </span>
                          <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {viewingCustomer.state || "Not specified"}
                          </p>
                        </div>
                      </div>

                      {/* Full Address */}
                      <div className="p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/70 bg-gray-50/50 dark:bg-gray-900/40">
                        <span className="text-[11px] font-semibold text-gray-400 block mb-1">
                          Full Delivery / Office Address
                        </span>
                        <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                          {viewingCustomer.address || "No address provided"}
                        </p>
                      </div>

                      {/* Associated Agent Info */}
                      {(viewingCustomer.agent_name || viewingCustomer.agent_id) && (
                        <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/30">
                          <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                            <FaUserTie /> Associated Agent Information
                          </span>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-gray-500 dark:text-gray-400 block">Agent Name</span>
                              <span className="font-bold text-gray-900 dark:text-white">
                                {viewingCustomer.agent_name || `Agent ID: #${viewingCustomer.agent_id}`}
                              </span>
                            </div>
                            {viewingCustomer.agent_mobile && (
                              <div>
                                <span className="text-gray-500 dark:text-gray-400 block">Agent Contact</span>
                                <span className="font-bold text-gray-900 dark:text-white">
                                  {viewingCustomer.agent_mobile}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Associated Billed Orders & Fresh Invoices Section */}
                      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-900/50 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                            <FaFileInvoice className="text-blue-500" /> Billed Orders & Invoices ({customerBookings.length})
                          </span>
                          <button
                            onClick={() => fetchCustomerBookings(viewingCustomer.id)}
                            title="Refresh bills"
                            className="text-xs text-gray-400 hover:text-blue-500 transition p-1"
                          >
                            <FaSyncAlt className={loadingBookings ? "animate-spin" : ""} />
                          </button>
                        </div>

                        {loadingBookings ? (
                          <div className="text-center py-4 text-xs text-gray-400">Loading bills...</div>
                        ) : customerBookings.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No bills created for this customer yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {customerBookings.map((b) => (
                              <div
                                key={b.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border border-gray-200/80 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs shadow-2xs"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white">Order #{b.order_id}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                      {b.status || 'Booked'}
                                    </span>
                                  </div>
                                  <div className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">
                                    Total: ₹{Number(b.total || 0).toLocaleString()} • Billed To: {b.customer_name} ({b.mobile_number})
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                  <button
                                    onClick={() => handleRegenerateBill(b.order_id)}
                                    disabled={regeneratingOrderId === b.order_id}
                                    title="Regenerate bill with new details"
                                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition flex items-center gap-1 cursor-pointer"
                                  >
                                    <FaSyncAlt className={`text-[9px] ${regeneratingOrderId === b.order_id ? "animate-spin text-blue-500" : ""}`} />
                                    {regeneratingOrderId === b.order_id ? "Regenerating..." : "Regenerate"}
                                  </button>
                                  <a
                                    href={`${API_BASE_URL}/api/hifi/dbooking/invoice/${b.order_id}.pdf?fresh=true&customer_id=${viewingCustomer.id}&t=${Date.now()}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-lg text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center gap-1 shadow-xs cursor-pointer"
                                  >
                                    <FaDownload className="text-[9px]" /> Fresh Bill (PDF)
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/70 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3">
                      <button
                        onClick={() => {
                          const c = viewingCustomer;
                          setViewingCustomer(null);
                          setDeletingCustomer(c);
                        }}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 border border-rose-200 dark:border-rose-800 transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <FaTrash /> Delete Customer
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const c = viewingCustomer;
                            setViewingCustomer(null);
                            handleOpenFullEdit(c);
                          }}
                          className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <FaEdit /> Edit Details & Numbers
                        </button>
                        <button
                          onClick={() => setViewingCustomer(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-800 dark:bg-gray-700 hover:bg-gray-900 text-white transition cursor-pointer"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Full Edit Customer Details Modal */}
              {editModalCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                    {/* Modal Header */}
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                          <FaEdit className="text-xl" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Edit Customer Details</h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Updates will automatically refresh associated bills with the new number and name
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setEditModalCustomer(null)}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <FaTimes className="text-base" />
                      </button>
                    </div>

                    {/* Modal Form */}
                    <form onSubmit={handleSaveFullEdit} className="p-6 space-y-4 overflow-y-auto">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                          Customer / Business Name *
                        </label>
                        <input
                          type="text"
                          value={editModalForm.customer_name}
                          onChange={(e) => setEditModalForm({ ...editModalForm, customer_name: e.target.value })}
                          required
                          placeholder="Customer Name"
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                            Mobile Number *
                          </label>
                          <input
                            type="tel"
                            value={editModalForm.mobile_number}
                            onChange={(e) => setEditModalForm({ ...editModalForm, mobile_number: e.target.value })}
                            required
                            placeholder="10-digit mobile"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            value={editModalForm.email}
                            onChange={(e) => setEditModalForm({ ...editModalForm, email: e.target.value })}
                            placeholder="Email (optional)"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={editModalForm.state}
                            onChange={(e) => setEditModalForm({ ...editModalForm, state: e.target.value })}
                            placeholder="State"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                            District
                          </label>
                          <input
                            type="text"
                            value={editModalForm.district}
                            onChange={(e) => setEditModalForm({ ...editModalForm, district: e.target.value })}
                            placeholder="District"
                            className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                          Full Delivery / Office Address
                        </label>
                        <textarea
                          rows="3"
                          value={editModalForm.address}
                          onChange={(e) => setEditModalForm({ ...editModalForm, address: e.target.value })}
                          placeholder="Full Address"
                          className="w-full px-3.5 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <FaFileInvoice className="shrink-0 text-sm" />
                        <span>All existing bills, invoices, and orders for this customer will automatically update with these new details.</span>
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => setEditModalCustomer(null)}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingFullEdit}
                          className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingFullEdit ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                          {isSavingFullEdit ? "Saving & Syncing Bills..." : "Save & Sync Bills"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Delete Confirmation Modal */}
              {deletingCustomer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md overflow-hidden p-6 space-y-4">
                    <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
                      <div className="p-3 bg-rose-100 dark:bg-rose-900/40 rounded-2xl">
                        <FaExclamationTriangle className="text-2xl" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete Customer Details</h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Permanent deletion confirmation</p>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                      Are you sure you want to permanently delete{" "}
                      <span className="font-bold text-gray-900 dark:text-white">
                        {deletingCustomer.customer_name || deletingCustomer.name || deletingCustomer.cust_name || "this customer"}
                      </span>{" "}
                      and all their entered details? This action cannot be undone.
                    </p>

                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-gray-900/60 border border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      <p><strong className="text-gray-800 dark:text-gray-200">Account Type:</strong> {deletingCustomer.customer_type || "Customer"}</p>
                      <p><strong className="text-gray-800 dark:text-gray-200">Contact:</strong> {deletingCustomer.mobile_number || "None"}</p>
                      <p><strong className="text-gray-800 dark:text-gray-200">Location:</strong> {deletingCustomer.district ? `${deletingCustomer.district}, ` : ""}{deletingCustomer.state || "None"}</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                      <button
                        onClick={() => setDeletingCustomer(null)}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        disabled={isDeleting}
                        className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                      >
                        {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                        {isDeleting ? "Deleting..." : "Delete All Details"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}