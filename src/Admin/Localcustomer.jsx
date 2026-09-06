import React, { useState, useEffect, useMemo } from "react";
import Sidebar from "./Sidebar/Sidebar";
import { API_BASE_URL, API_BASE_URL_loc } from "../../Config";
import Logout from "./Logout";
import { FaUserPlus, FaUsers, FaUserTie, FaSearch, FaMapMarkerAlt, FaPhoneAlt, FaEnvelope, FaBuilding } from "react-icons/fa";

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
      const response = await fetch(`${API_BASE_URL}/api/directcust/agents`);
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
      const response = await fetch(`${API_BASE_URL}/api/directcust/customers`);
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

      const response = await fetch(`${API_BASE_URL}/api/directcust/customers`, {
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
                  {filteredCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      className="p-4 rounded-xl border border-gray-100 dark:border-gray-700/80 bg-gray-50/50 dark:bg-gray-900/40 hover:bg-white dark:hover:bg-gray-800 transition shadow-2xs"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">{cust.customer_name}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          cust.customer_type === "Agent"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {cust.customer_type || "Customer"}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-gray-500">
                        <p className="flex items-center gap-1.5"><FaPhoneAlt className="text-gray-400 text-[10px]" /> {cust.mobile_number || "No contact"}</p>
                        <p className="flex items-center gap-1.5"><FaMapMarkerAlt className="text-gray-400 text-[10px]" /> {cust.district || ""}, {cust.state || ""}</p>
                        {cust.address && <p className="text-gray-400 line-clamp-1">{cust.address}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}