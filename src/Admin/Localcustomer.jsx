import React, { useState, useEffect } from "react";
import "../App.css";
import Sidebar from "./Sidebar/Sidebar";
import { API_BASE_URL, API_BASE_URL_loc } from "../../Config";
import Logout from "./Logout";

export default function Localcustomer() {
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

  useEffect(() => { fetchStates(); }, []);

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
      setError("Failed to load states. Ensure backend is running.");
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
      setError(`Failed to load districts for ${stateName}.`);
    }
  };

  const fetchAgents = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/directcust/agents`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      setAgents(await response.json());
    } catch (error) {
      console.error("Error fetching agents:", error);
      setError("Failed to load agents.");
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

  const adjustBoxCount = (delta) => {
    setFormData((prev) => ({ ...prev, boxCount: Math.max(1, prev.boxCount + delta) }));
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const requiredCheck = () => {
      if (formData.customerType === "Customer") {
        if (!formData.customerName.trim() || !formData.state.trim() || !formData.district.trim() ||
            !formData.mobileNumber.trim() || !formData.address.trim() || formData.boxCount < 1) {
          return "Please fill all required fields for Customer.";
        }
      } else if (formData.customerType === "Agent") {
        if (!formData.agentName.trim() || !formData.agentContact.trim() || !formData.agentState.trim() ||
            !formData.agentDistrict.trim() || !formData.agentAddress.trim() || formData.boxCount < 1) {
          return "Please fill all required fields for Agent.";
        }
      } else if (formData.customerType === "Customer of Selected Agent") {
        if (!selectedAgent || !formData.custAgentName.trim() || !formData.custAgentContact.trim() ||
            !formData.custAgentState.trim() || !formData.custAgentDistrict.trim() ||
            !formData.custAgentAddress.trim() || formData.boxCount < 1) {
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
      setDistricts([]);
    } catch (error) {
      console.error("Error saving customer:", error);
      setError(error.message || "Failed to save customer.");
      setSuccess(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 p-6 hundred:ml-64 onefifty:ml-1 pt-10">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100 text-center">Add Customer</h1>
          {error && <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 rounded-lg text-center">{error}</div>}
          {success && <div className="mb-4 p-4 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg text-center">Data entered successfully</div>}
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label htmlFor="customerType" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Type</label>
              <select
                id="customerType"
                name="customerType"
                value={formData.customerType}
                onChange={handleChange}
                className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                required
              >
                <option value="Customer">Customer</option>
                <option value="Agent">Agent</option>
                <option value="Customer of Selected Agent">Customer of Selected Agent</option>
              </select>
            </div>

            {formData.customerType === "Customer" && (
              <div className="grid grid-cols-1 gap-6 mobile:grid-cols-6">
                <div className="mobile:col-span-4">
                  <label htmlFor="customerName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Name</label>
                  <input
                    type="text"
                    name="customerName"
                    id="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="Jane Smith"
                    required
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="state" className="block text-sm font-medium text-gray-900 dark:text-gray-100">State</label>
                  <select
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select a state</option>
                    {states.map((state) => <option key={state.name} value={state.name}>{state.name}</option>)}
                  </select>
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="district" className="block text-sm font-medium text-gray-900 dark:text-gray-100">District</label>
                  <select
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    disabled={!formData.state}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select a district</option>
                    {districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                  </select>
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="mobileNumber" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Mobile Number</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    id="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    pattern="\d{10}"
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="1234567890"
                    required
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Email (Optional)</label>
                  <input
                    type="email"
                    name="email"
                    id="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="jane@example.com"
                  />
                </div>
                <div className="col-span-full">
                  <label htmlFor="address" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Address</label>
                  <textarea
                    name="address"
                    id="address"
                    rows="3"
                    value={formData.address}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="123 Main St, Apt 4B"
                    required
                  />
                </div>
              </div>
            )}

            {formData.customerType === "Agent" && (
              <div className="grid grid-cols-1 gap-6 mobile:grid-cols-6">
                <div className="mobile:col-span-4">
                  <label htmlFor="agentName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Agent Name</label>
                  <input
                    type="text"
                    name="agentName"
                    id="agentName"
                    value={formData.agentName}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="Agent Name"
                    required
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="agentContact" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Agent Contact</label>
                  <input
                    type="text"
                    name="agentContact"
                    id="agentContact"
                    value={formData.agentContact}
                    onChange={handleChange}
                    pattern="\d{10}"
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="1234567890"
                    required
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="agentEmail" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Agent Email (Optional)</label>
                  <input
                    type="email"
                    name="agentEmail"
                    id="agentEmail"
                    value={formData.agentEmail}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="agent@example.com"
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="agentState" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Agent State</label>
                  <select
                    id="agentState"
                    name="agentState"
                    value={formData.agentState}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select a state</option>
                    {states.map((state) => <option key={state.name} value={state.name}>{state.name}</option>)}
                  </select>
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="agentDistrict" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Agent District</label>
                  <select
                    id="agentDistrict"
                    name="agentDistrict"
                    value={formData.agentDistrict}
                    onChange={handleChange}
                    disabled={!formData.agentState}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select a district</option>
                    {districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                  </select>
                </div>
                <div className="col-span-full">
                  <label htmlFor="agentAddress" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Agent Address</label>
                  <textarea
                    name="agentAddress"
                    id="agentAddress"
                    rows="3"
                    value={formData.agentAddress}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="123 Main St, Apt 4B"
                    required
                  />
                </div>
              </div>
            )}

            {formData.customerType === "Customer of Selected Agent" && (
              <div className="grid grid-cols-1 gap-6 mobile:grid-cols-6">
                <div className="mobile:col-span-3">
                  <label htmlFor="selectedAgent" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Select Agent</label>
                  <select
                    id="selectedAgent"
                    name="selectedAgent"
                    value={selectedAgent}
                    onChange={(e) => { setSelectedAgent(e.target.value); setError(null); }}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select an agent</option>
                    {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.customer_name}</option>)}
                  </select>
                </div>
                <div className="mobile:col-span-4">
                  <label htmlFor="custAgentName" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Agent Name</label>
                  <input
                    type="text"
                    name="custAgentName"
                    id="custAgentName"
                    value={formData.custAgentName}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="Customer Agent Name"
                    required
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="custAgentContact" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Agent Contact</label>
                  <input
                    type="text"
                    name="custAgentContact"
                    id="custAgentContact"
                    value={formData.custAgentContact}
                    onChange={handleChange}
                    pattern="\d{10}"
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="1234567890"
                    required
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="custAgentEmail" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Agent Email (Optional)</label>
                  <input
                    type="email"
                    name="custAgentEmail"
                    id="custAgentEmail"
                    value={formData.custAgentEmail}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="custagent@example.com"
                  />
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="custAgentState" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Agent State</label>
                  <select
                    id="custAgentState"
                    name="custAgentState"
                    value={formData.custAgentState}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select a state</option>
                    {states.map((state) => <option key={state.name} value={state.name}>{state.name}</option>)}
                  </select>
                </div>
                <div className="mobile:col-span-3">
                  <label htmlFor="custAgentDistrict" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Agent District</label>
                  <select
                    id="custAgentDistrict"
                    name="custAgentDistrict"
                    value={formData.custAgentDistrict}
                    onChange={handleChange}
                    disabled={!formData.custAgentState}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    required
                  >
                    <option value="">Select a district</option>
                    {districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                  </select>
                </div>
                <div className="col-span-full">
                  <label htmlFor="custAgentAddress" className="block text-sm font-medium text-gray-900 dark:text-gray-100">Customer Agent Address</label>
                  <textarea
                    name="custAgentAddress"
                    id="custAgentAddress"
                    rows="3"
                    value={formData.custAgentAddress}
                    onChange={handleChange}
                    className="mt-2 w-full rounded-md bg-white dark:bg-gray-800 py-1.5 px-3 text-base text-gray-900 dark:text-gray-100 outline-1 outline-gray-300 dark:outline-gray-600 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400 sm:text-sm"
                    placeholder="123 Main St, Apt 4B"
                    required
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-6">
              <button
                type="button"
                className="text-sm font-semibold text-gray-900 dark:text-gray-100"
                onClick={() => {
                  setFormData({
                    customerName: "", state: "", district: "", mobileNumber: "", email: "", address: "",
                    customerType: "Customer", agentName: "", agentContact: "", agentEmail: "",
                    agentState: "", agentDistrict: "", agentAddress: "", custAgentName: "",
                    custAgentContact: "", custAgentEmail: "", custAgentAddress: "",
                    custAgentDistrict: "", custAgentState: "", boxCount: 1
                  });
                  setSelectedAgent("");
                  setError(null);
                  setSuccess(false);
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-md bg-black/50 dark:bg-black/60 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:hover:bg-gray-700 focus:outline-2 focus:outline-indigo-600 dark:focus:outline-indigo-400"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}