import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaMinus, FaShoppingCart, FaSignOutAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../Config";
import { API_BASE_URL_loc } from "../Config";
import './App.css';

const BigFireworkAnimation = ({ delay = 0 }) => {
  const { innerWidth: w = 1920, innerHeight: h = 1080 } = typeof window !== "undefined" ? window : {};
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      <motion.div className="absolute" style={{ left: w * 0.5, top: h * 0.5, transform: "translate(-50%, -50%)" }}>
        {Array.from({ length: 32 }).map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-4 h-4 rounded-full"
            style={{ background: `hsl(${(i * 15) % 360}, 80%, 65%)`, boxShadow: `0 0 20px hsl(${(i * 15) % 360}, 80%, 65%)` }}
            animate={{ x: Math.cos(i * 11.25 * (Math.PI / 180)) * w * 0.4, y: Math.sin(i * 11.25 * (Math.PI / 180)) * w * 0.4, opacity: [1, 0.8, 0], scale: [1, 1.2, 0] }}
            transition={{ duration: 4, delay, ease: "easeOut" }}
          />
        ))}
        <motion.div
          className="absolute w-48 h-48 rounded-full"
          style={{ background: "radial-gradient(circle, #ffd93d 0%, #ff6b6b66 30%, transparent 70%)", transform: "translate(-50%, -50%)", boxShadow: "0 0 100px #ffd93d" }}
          animate={{ scale: [0, 4, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 4, delay, ease: "easeOut" }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full border-4"
          style={{ margin: "-192px 0 0 -192px", borderColor: "#ffd93d", boxShadow: "0 0 60px #ffd93d" }}
          animate={{ scale: [0, 3, 4], opacity: [0, 0.8, 0] }}
          transition={{ duration: 4, delay: delay + 0.2, ease: "easeOut" }}
        />
      </motion.div>
    </div>
  );
};

const Book = () => {
  const navigate = useNavigate();
  const [state, setState] = useState({
    products: [],
    cart: JSON.parse(localStorage.getItem("gift-box-cart") || "{}"),
    isCartOpen: false,
    showSuccess: false,
    error: "",
    showError: false,
    search: "",
    showForm: false,
    invoiceUrl: null,
    states: [],
    districts: [],
    customer: { customer_name: "", company_name: "", license_number: "", address: "", district: "", state: "", mobile_number: "", email: "" },
    isEditing: false
  });

  const styles = {
    card: { background: "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(224,242,254,0.3), rgba(186,230,253,0.2))", backdropFilter: "blur(20px)", border: "1px solid rgba(2,132,199,0.3)", boxShadow: "0 25px 45px rgba(2,132,199,0.1), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(2,132,199,0.1)" },
    button: { background: "linear-gradient(135deg, rgba(2,132,199,0.9), rgba(14,165,233,0.95))", backdropFilter: "blur(15px)", border: "1px solid rgba(125,211,252,0.4)", boxShadow: "0 15px 35px rgba(2,132,199,0.3), inset 0 1px 0 rgba(255,255,255,0.2)" },
    input: { background: "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(240,249,255,0.6))", backdropFilter: "blur(10px)", border: "1px solid rgba(2,132,199,0.3)" },
    modal: { background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,249,255,0.9))", backdropFilter: "blur(20px)", border: "1px solid rgba(2,132,199,0.3)", boxShadow: "0 25px 45px rgba(2,132,199,0.2)" }
  };

  const formatPrice = price => {
    const num = parseFloat(price);
    return Number.isInteger(num) ? num.toString() : num.toFixed(2);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const username = localStorage.getItem('username');
        if (!username) {
          navigate('/login');
          return;
        }

        const [prodRes, statesRes, userRes] = await Promise.all([
          fetch(`${API_BASE_URL}/api/gift-box-products`),
          fetch(`${API_BASE_URL_loc}/api/locations/states`),
          fetch(`${API_BASE_URL}/api/auth/user/${encodeURIComponent(username)}`)
        ]);

        const [products, states, user] = await Promise.all([prodRes.json(), statesRes.json(), userRes.json()]);

        if (!prodRes.ok) throw new Error(products.message || "Failed to fetch products");
        if (!statesRes.ok) throw new Error(states.message || "Failed to fetch states");
        if (!userRes.ok) throw new Error(user.message || "Failed to fetch user details");

        setState(s => ({
          ...s,
          products,
          states,
          customer: {
            customer_name: user.username,
            company_name: user.companyname, // Fixed typo here
            license_number: user.licencenumber || "",
            address: user.address,
            district: user.district,
            state: user.state,
            mobile_number: user.mobile_number,
            email: user.email || ""
          }
        }));
      } catch (err) {
        setState(s => ({ ...s, error: err.message || "Failed to fetch data", showError: true }));
        setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
      }
    };
    fetchData();
  }, [navigate]);

  useEffect(() => {
    localStorage.setItem("gift-box-cart", JSON.stringify(state.cart));
  }, [state.cart]);

  useEffect(() => {
    if (state.customer.state) {
      fetch(`${API_BASE_URL_loc}/api/locations/states/${encodeURIComponent(state.customer.state)}/districts`)
        .then(res => res.json())
        .then(districts => setState(s => ({ ...s, districts })))
        .catch(err => {
          setState(s => ({ ...s, error: err.message || "Failed to fetch districts", showError: true }));
          setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
        });
    } else {
      setState(s => ({ ...s, districts: [] }));
    }
  }, [state.customer.state]);

  const addToCart = useCallback(product => {
    if (!product?.serial_number) return;
    if ((state.cart[product.serial_number] || 0) >= product.stock) {
      setState(s => ({ ...s, error: `Cannot add more than stock (${product.stock}) for ${product.productname}`, showError: true }));
      setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
      return;
    }
    setState(s => ({ ...s, cart: { ...s.cart, [product.serial_number]: (s.cart[product.serial_number] || 0) + 1 } }));
  }, [state.cart]);

  const removeFromCart = useCallback(product => {
    if (!product?.serial_number) return;
    setState(s => {
      const count = (s.cart[product.serial_number] || 1) - 1;
      const updated = { ...s.cart };
      if (count <= 0) delete updated[product.serial_number];
      else updated[product.serial_number] = count;
      return { ...s, cart: updated };
    });
  }, []);

  const handleFormSubmit = async e => {
    e.preventDefault();
    if (!Object.keys(state.cart).length) {
      setState(s => ({ ...s, error: "Your cart is empty.", showError: true }));
      setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
      return;
    }
    const { customer_name, company_name, address, district, state: st, mobile_number, email } = state.customer;
    if (!customer_name || !company_name || !address || !district || !st || !mobile_number || !email) {
      setState(s => ({ ...s, error: "Please fill all required details.", showError: true }));
      setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
      return;
    }
    const bookingProducts = Object.entries(state.cart).map(([serial, qty]) => {
      const p = state.products.find(p => p.serial_number === serial);
      return { id: p.id, product_type: 'gift_box_dealers', productname: p.productname, quantity: qty, price: parseFloat(p.price), discount: parseFloat(p.discount || 0) };
    });
    try {
      const res = await fetch(`${API_BASE_URL}/api/dbooking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...state.customer, products: bookingProducts, total: totals.total })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create booking");
      const prodRes = await fetch(`${API_BASE_URL}/api/gift-box-products`);
      const products = await prodRes.json();
      if (!prodRes.ok) throw new Error("Failed to refresh products");
      setState(s => ({
        ...s,
        showSuccess: true,
        cart: {},
        isCartOpen: false,
        showForm: false,
        invoiceUrl: `${API_BASE_URL}/api/dbooking/invoice/${data.order_id}`,
        products,
        customer: { ...s.customer },
        isEditing: false
      }));
      setTimeout(() => setState(s => ({ ...s, showSuccess: false })), 5000);
    } catch (err) {
      setState(s => ({ ...s, error: err.message || "Failed to create booking", showError: true }));
      setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
    }
  };

  const handleEditSubmit = async e => {
    e.preventDefault();
    try {
      const { customer_name, company_name, license_number, address, state: st, district, mobile_number } = state.customer;
      if (!customer_name || !company_name || !address || !st || !district || !mobile_number) {
        setState(s => ({ ...s, error: "Please fill all required fields", showError: true }));
        setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/auth/user/${encodeURIComponent(customer_name)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyname: company_name,
          licencenumber: license_number,
          address,
          state: st,
          district,
          mobile_number
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update user details");
      setState(s => ({
        ...s,
        isEditing: false,
        showSuccess: true
      }));
      setTimeout(() => setState(s => ({ ...s, showSuccess: false })), 5000);
    } catch (err) {
      setState(s => ({ ...s, error: err.message || "Failed to update user details", showError: true }));
      setTimeout(() => setState(s => ({ ...s, showError: false })), 5000);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('username');
    localStorage.removeItem('gift-box-cart');
    navigate('/');
  };

  const handleInputChange = (key, value) => setState(s => ({ ...s, customer: { ...s.customer, [key]: value, ...(key === "state" ? { district: "" } : {}) } }));

  const totals = useMemo(() => {
    let net = 0, save = 0, total = 0;
    for (const serial in state.cart) {
      const qty = state.cart[serial], p = state.products.find(p => p.serial_number === serial);
      if (!p) continue;
      const price = parseFloat(p.price), disc = price * (p.discount / 100);
      net += price * qty;
      save += disc * qty;
      total += (price - disc) * qty;
    }
    return { net: formatPrice(net), save: formatPrice(save), total: formatPrice(total) };
  }, [state.cart, state.products]);

  const filteredProducts = useMemo(() => state.products.filter(p => !state.search || p.productname.toLowerCase().includes(state.search.toLowerCase()) || p.serial_number.toLowerCase().includes(state.search.toLowerCase())), [state.products, state.search]);

  return (
    <div className="min-h-screen bg-gray-100">
      <motion.div className="fixed left-4 top-4">
        <p className="text-4xl font-bold text-sky-600">Hifi Pyro Work</p>
      </motion.div>
      <motion.button
        onClick={handleLogout}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 right-4 z-50 text-white rounded-full shadow-xl w-12 h-12 flex items-center justify-center text-xl"
        style={styles.button}
      >
        <FaSignOutAlt />
      </motion.button>
      {(state.isCartOpen || state.showForm) && <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setState(s => ({ ...s, isCartOpen: false, showForm: false, isEditing: false }))} />}
      {state.showSuccess && (
        <motion.div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <BigFireworkAnimation />
          <motion.div className="flex flex-col items-center gap-4 z-10" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <motion.h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-700 bg-clip-text text-transparent text-center" style={{ textShadow: "0 0 20px rgba(34,197,94,0.8)" }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: 1, delay: 0.5 }}>
              {state.isEditing ? 'Updated' : 'Booked'}
            </motion.h2>
          </motion.div>
        </motion.div>
      )}
      {state.showError && <motion.div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5 }}><div className="bg-red-500 text-white text-lg font-semibold rounded-xl py-6 px-4 max-w-md mx-auto text-center shadow-lg">{state.error}</div></motion.div>}
      <main className="relative pt-5 mobile:px-5 mobile:pt-20 max-w-7xl mx-auto">
        <section className="rounded-xl px-4 py-3 shadow-inner flex justify-between flex-wrap gap-4 text-sm sm:text-base border border-sky-300 bg-gradient-to-br from-sky-400/80 to-sky-600/90 text-white font-semibold">
          <div>Net: ₹{totals.net}</div><div>Save: ₹{totals.save}</div><div className="font-bold">Total: ₹{totals.total}</div>
        </section>
        <div className="flex justify-center gap-4 mb-8 mt-8">
          <input type="text" placeholder="Search by name or serial number" value={state.search} onChange={e => setState(s => ({ ...s, search: e.target.value }))} className="rounded-xl px-4 w-80 h-12 text-lg text-slate-800 font-medium focus:ring-2 focus:ring-blue-400 focus:border-transparent" style={styles.input} />
        </div>
        <div className="mt-12 mb-10">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-3xl text-sky-500 font-semibold capitalize border-b-4 border-sky-500 pb-2">Gift Box Dealers</h2>
            <button
              onClick={() => setState(s => ({ ...s, showForm: true, isEditing: true }))}
              className="text-sm text-white font-semibold py-2 px-4 rounded-xl"
              style={styles.button}
            >
              Edit Profile
            </button>
          </div>
          {filteredProducts.length === 0 ? (
            <p className="text-lg text-center text-gray-600 font-medium">No products available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map(p => {
                const price = parseFloat(p.price), disc = price * (p.discount / 100), finalPrice = p.discount > 0 ? formatPrice(price - disc) : formatPrice(price), count = state.cart[p.serial_number] || 0;
                return (
                  <motion.div key={p.serial_number} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -8, scale: 1.02 }} className="group relative rounded-3xl p-6 overflow-hidden cursor-pointer" style={styles.card}>
                    {p.discount > 0 && <div className="absolute left-2 top-2 bg-red-500 text-white text-md font-bold px-2 py-1 rounded-br-xl rounded-tl-xl mobile:text-xs mobile:px-1.5 mobile:py-0.5">{p.discount}%</div>}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(2,132,199,0.3), transparent 50%, rgba(14,165,233,0.2))" }} />
                    <div className="relative z-10 mobile:mt-2">
                      <p className="text-lg mobile:text-sm sm:text-base font-bold text-slate-800 group-hover:text-slate-900 line-clamp-2 mb-2">{p.productname}</p>
                      <div className="space-y-1 mb-4">
                        {p.discount > 0 ? (
                          <><p className="text-sm text-gray-500 line-through">MRP: ₹{formatPrice(price)}</p><p className="text-xl sm:text-lg font-bold text-sky-500 group-hover:text-sky-700">₹{finalPrice} / {p.per}</p></>
                        ) : (
                          <p className="text-xl sm:text-lg font-bold text-sky-500 group-hover:text-sky-700">₹{finalPrice} / {p.per}</p>
                        )}
                      </div>
                      {p.image && (
                        <div className="w-full h-30 rounded-2xl mb-4 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(240,249,255,0.4))", backdropFilter: "blur(10px)", border: "1px solid rgba(2,132,199,0.2)" }}>
                          <img src={p.image || "/placeholder.svg"} alt={p.productname} className="w-full h-full object-contain p-2" />
                        </div>
                      )}
                      <div className="relative min-h-[3rem] flex items-end justify-end">
                        <AnimatePresence mode="wait">
                          {count > 0 ? (
                            <motion.div key="qty-controls" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ duration: 0.3, ease: "easeOut" }} className="flex items-center justify-between w-full rounded-full p-2" style={styles.button}>
                              <motion.button onClick={() => removeFromCart(p)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-lg flex items-center justify-center"><FaMinus /></motion.button>
                              <motion.span key={count} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }} className="text-white font-bold text-lg px-4">{count}</motion.span>
                              <motion.button onClick={() => addToCart(p)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-full bg-white/20 text-white font-bold text-lg flex items-center justify-center"><FaPlus /></motion.button>
                            </motion.div>
                          ) : (
                            <motion.button key="add-btn" onClick={() => addToCart(p)} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.3 }} className="w-12 h-12 rounded-full text-white font-bold text-xl flex items-center justify-center relative overflow-hidden" style={styles.button}>
                              <motion.div className="absolute inset-0 rounded-full" initial={{ scale: 0, opacity: 0.5 }} whileTap={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4 }} style={{ background: "rgba(255,255,255,0.3)" }} />
                              <FaPlus />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-px opacity-60" style={{ background: "linear-gradient(90deg, transparent, rgba(2,132,199,0.6), transparent)" }} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <motion.button onClick={() => setState(s => ({ ...s, isCartOpen: true }))} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }} className={`fixed bottom-6 right-6 z-50 text-white rounded-full shadow-xl w-16 h-16 flex items-center justify-center text-2xl ${state.isCartOpen || state.showForm ? "hidden" : ""}`} style={styles.button}>
        <FaShoppingCart />
        {Object.keys(state.cart).length > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold">{Object.values(state.cart).reduce((a, b) => a + b, 0)}</motion.span>}
      </motion.button>
      <motion.aside initial={false} animate={{ x: state.isCartOpen ? 0 : 320 }} transition={{ duration: 0.4, ease: "easeInOut" }} className="fixed top-0 right-0 w-80 h-full shadow-xl border-l z-50" style={styles.modal}>
        <div className="flex justify-between items-center p-4 border-b border-sky-200">
          <h3 className="text-lg font-bold text-sky-800">Your Cart</h3>
          <button onClick={() => setState(s => ({ ...s, isCartOpen: false }))} className="text-gray-600 hover:text-red-500 text-xl cursor-pointer">×</button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-120px)] space-y-4">
          {Object.keys(state.cart).length === 0 ? (
            <p className="text-gray-500 text-sm">Your cart is empty.</p>
          ) : (
            Object.entries(state.cart).map(([serial, qty]) => {
              const p = state.products.find(p => p.serial_number === serial);
              if (!p) return null;
              const disc = (p.price * p.discount) / 100, priceAfterDisc = formatPrice(p.price - disc);
              return (
                <motion.div key={serial} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 border-b pb-3 border-sky-100">
                  {p.image && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.6), rgba(240,249,255,0.4))", backdropFilter: "blur(10px)", border: "1px solid rgba(2,132,199,0.2)" }}>
                      <img src={p.image || "/placeholder.svg"} alt={p.productname} className="w-full h-full object-contain p-1" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800">{p.productname}</p>
                    <p className="text-sm text-sky-700 font-bold">₹{priceAfterDisc} x {qty}</p>
                    <p className="text-xs text-slate-600">Stock: {p.stock}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => removeFromCart(p)} className="w-7 h-7 text-sm text-white rounded-full flex items-center justify-center" style={{ background: styles.button.background }}><FaMinus /></button>
                      <span className="text-sm font-medium px-2">{qty}</span>
                      <button onClick={() => addToCart(p)} className="w-7 h-7 text-sm text-white rounded-full flex items-center justify-center" style={{ background: styles.button.background }}><FaPlus /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-sky-200 sticky bottom-0 space-y-4" style={styles.modal}>
          <div className="text-sm text-slate-700 space-y-1"><p>Net: ₹{totals.net}</p><p>Save: ₹{totals.save}</p><p className="font-bold text-sky-800 text-lg">Total: ₹{totals.total}</p></div>
          <div className="flex gap-2">
            <button onClick={() => setState(s => ({ ...s, cart: {} }))} className="flex-1 text-white text-sm font-semibold py-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))", boxShadow: "0 5px 15px rgba(239,68,68,0.3)" }}>Clear Cart</button>
            <button onClick={() => setState(s => ({ ...s, isCartOpen: false, showForm: true }))} className="flex-1 text-white text-sm font-semibold py-3 rounded-xl" style={{ background: styles.button.background, boxShadow: "0 5px 15px rgba(2,132,199,0.3)" }}>Proceed to Details</button>
          </div>
        </div>
      </motion.aside>
      {state.showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }} className="fixed inset-0 flex items-center justify-center z-50">
          <div className="w-full max-w-md mx-4 p-6 rounded-xl" style={styles.modal}>
            <h2 className="text-lg font-bold text-sky-800 mb-4">{state.isEditing ? 'Edit Profile' : 'Customer Details'}</h2>
            <form onSubmit={state.isEditing ? handleEditSubmit : handleFormSubmit} className="space-y-4">
              {[
                { label: "Customer Name", key: "customer_name", type: "text", placeholder: "Enter name", required: true, disabled: true },
                { label: "Company Name", key: "company_name", type: "text", placeholder: "Enter company name", required: true, disabled: !state.isEditing },
                { label: "License Number", key: "license_number", type: "text", placeholder: "Enter license number (optional)", disabled: !state.isEditing },
                { label: "Address", key: "address", type: "textarea", placeholder: "Enter address", required: true, disabled: !state.isEditing },
                { label: "State", key: "state", type: "select", options: state.states, required: true, disabled: !state.isEditing },
                { label: "District", key: "district", type: "select", options: state.districts, required: true, disabled: !state.isEditing || !state.customer.state },
                { label: "Mobile Number", key: "mobile_number", type: "text", placeholder: "Enter mobile number", required: true, disabled: !state.isEditing },
                { label: "Email", key: "email", type: "email", placeholder: "Enter email", required: true, disabled: !state.isEditing }
              ].map(({ label, key, type, placeholder, required, options, disabled }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label} {required && '*'}</label>
                  {type === "select" ? (
                    <select value={state.customer[key]} onChange={e => handleInputChange(key, e.target.value)} className="w-full p-2 rounded-md mt-1" style={styles.input} required={required} disabled={disabled}>
                      <option value="">Select {label}</option>
                      {options.map(opt => <option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>)}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea value={state.customer[key]} onChange={e => handleInputChange(key, e.target.value)} placeholder={placeholder} className="w-full p-2 rounded-md mt-1" style={styles.input} required={required} disabled={disabled} />
                  ) : (
                    <input type={type} value={state.customer[key]} onChange={e => handleInputChange(key, e.target.value)} placeholder={placeholder} className="w-full p-2 rounded-md mt-1" style={styles.input} required={required} disabled={disabled} />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button type="button" onClick={() => setState(s => ({ ...s, showForm: false, isEditing: false }))} className="flex-1 text-white text-sm font-semibold py-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))", boxShadow: "0 5px 15px rgba(239,68,68,0.3)" }}>Cancel</button>
                <button type="submit" className="flex-1 text-white text-sm font-semibold py-3 rounded-xl" style={styles.button}>{state.isEditing ? 'Update Profile' : 'Confirm Booking'}</button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
      <style>{`.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }`}</style>
    </div>
  );
};

export default Book;