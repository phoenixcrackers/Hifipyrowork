import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaPlus, FaMinus, FaShoppingCart, FaSignOutAlt, FaTimes } from "react-icons/fa";
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
    isEditing: false,
    showImageModal: false,
    selectedImages: [],
    selectedImageIndex: 0,
    cardImageIndexes: {}
  });

  const styles = {
    card: { 
      background: "linear-gradient(135deg, rgba(255,255,255,0.4), rgba(224,242,254,0.3), rgba(186,230,253,0.2))", 
      backgroundDark: "linear-gradient(135deg, rgba(31,41,55,0.6), rgba(55,65,81,0.5), rgba(75,85,99,0.4))",
      backdropFilter: "blur(20px)", 
      border: "1px solid rgba(2,132,199,0.3)", 
      borderDark: "1px solid rgba(59,130,246,0.4)",
      boxShadow: "0 25px 45px rgba(2,132,199,0.1), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(2,132,199,0.1)",
      boxShadowDark: "0 25px 45px rgba(59,130,246,0.2), inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(59,130,246,0.2)"
    },
    button: { 
      background: "linear-gradient(135deg, rgba(2,132,199,0.9), rgba(14,165,233,0.95))", 
      backgroundDark: "linear-gradient(135deg, rgba(59,130,246,0.9), rgba(37,99,235,0.95))",
      backdropFilter: "blur(15px)", 
      border: "1px solid rgba(125,211,252,0.4)", 
      borderDark: "1px solid rgba(147,197,253,0.4)",
      boxShadow: "0 15px 35px rgba(2,132,199,0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
      boxShadowDark: "0 15px 35px rgba(59,130,246,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
    },
    input: { 
      background: "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(240,249,255,0.6))", 
      backgroundDark: "linear-gradient(135deg, rgba(55,65,81,0.8), rgba(75,85,99,0.6))",
      backdropFilter: "blur(10px)", 
      border: "1px solid rgba(2,132,199,0.3)", 
      borderDark: "1px solid rgba(59,130,246,0.4)"
    },
    modal: { 
      background: "linear-gradient(135deg, rgba(255,255,255,0.95), rgba(240,249,255,0.9))", 
      backgroundDark: "linear-gradient(135deg, rgba(31,41,55,0.95), rgba(55,65,81,0.9))",
      backdropFilter: "blur(20px)", 
      border: "1px solid rgba(2,132,199,0.3)", 
      borderDark: "1px solid rgba(59,130,246,0.4)",
      boxShadow: "0 25px 45px rgba(2,132,199,0.2)",
      boxShadowDark: "0 25px 45px rgba(59,130,246,0.3)"
    }
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

        if (!prodRes.ok) {
          const errorData = await prodRes.json();
          throw new Error(errorData.message || "Failed to fetch products");
        }
        if (!statesRes.ok) {
          const errorData = await statesRes.json();
          throw new Error(errorData.message || "Failed to fetch states");
        }
        if (!userRes.ok) {
          const errorData = await userRes.json();
          throw new Error(errorData.message || "Failed to fetch user details");
        }

        const [products, states, user] = await Promise.all([prodRes.json(), statesRes.json(), userRes.json()]);

        const parsedProducts = products.map(product => ({
          ...product,
          image: product.image ? JSON.parse(product.image) : []
        })).sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true }));

        const initialImageIndexes = parsedProducts.reduce((acc, p) => ({
          ...acc,
          [p.serial_number]: 0
        }), {});

        setState(s => ({
          ...s,
          products: parsedProducts,
          states,
          customer: {
            customer_name: user.username,
            company_name: user.companyname,
            license_number: user.licencenumber || "",
            address: user.address,
            district: user.district,
            state: user.state,
            mobile_number: user.mobile_number,
            email: user.email || ""
          },
          cardImageIndexes: initialImageIndexes
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
        .then(res => {
          if (!res.ok) throw new Error("Failed to fetch districts");
          return res.json();
        })
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
      return { 
        id: p.id, 
        product_type: 'gift_box_dealers',
        productname: p.productname, 
        quantity: qty, 
        price: parseFloat(p.price), 
        discount: parseFloat(p.discount || 0) 
      };
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
      if (!prodRes.ok) {
        const errorData = await prodRes.json();
        throw new Error(errorData.message || "Failed to refresh products");
      }
      const products = await prodRes.json();
      const parsedProducts = products.map(product => ({
        ...product,
        image: product.image ? JSON.parse(product.image) : []
      })).sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true }));
      const updatedImageIndexes = parsedProducts.reduce((acc, p) => ({
        ...acc,
        [p.serial_number]: 0
      }), {});
      setState(s => ({
        ...s,
        showSuccess: true,
        cart: {},
        isCartOpen: false,
        showForm: false,
        invoiceUrl: `${API_BASE_URL}/api/dbooking/invoice/${data.order_id}`,
        products: parsedProducts,
        cardImageIndexes: updatedImageIndexes,
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

  const openImageModal = (images, index = 0) => {
    setState(s => ({ ...s, showImageModal: true, selectedImages: images, selectedImageIndex: index }));
  };

  const closeImageModal = () => {
    setState(s => ({ ...s, showImageModal: false, selectedImages: [], selectedImageIndex: 0 }));
  };

  const nextImage = () => {
    setState(s => ({
      ...s,
      selectedImageIndex: (s.selectedImageIndex + 1) % s.selectedImages.length
    }));
  };

  const prevImage = () => {
    setState(s => ({
      ...s,
      selectedImageIndex: (s.selectedImageIndex - 1 + s.selectedImages.length) % s.selectedImages.length
    }));
  };

  const nextCardImage = (serial_number, images) => {
    setState(s => ({
      ...s,
      cardImageIndexes: {
        ...s.cardImageIndexes,
        [serial_number]: (s.cardImageIndexes[serial_number] + 1) % images.length
      }
    }));
  };

  const prevCardImage = (serial_number, images) => {
    setState(s => ({
      ...s,
      cardImageIndexes: {
        ...s.cardImageIndexes,
        [serial_number]: (s.cardImageIndexes[serial_number] - 1 + images.length) % images.length
      }
    }));
  };

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

  const filteredProducts = useMemo(() => state.products.filter(p => 
    !state.search || 
    p.productname.toLowerCase().includes(state.search.toLowerCase()) || 
    p.serial_number.toLowerCase().includes(state.search.toLowerCase())
  ).sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true })), [state.products, state.search]);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      <motion.div className="fixed left-4 top-4">
        <p className="text-4xl font-bold text-sky-600 dark:text-sky-400">Hifi Pyro Park</p>
      </motion.div>
      <motion.button
        onClick={handleLogout}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed top-4 right-4 z-50 text-white dark:text-gray-200 rounded-full shadow-xl w-12 h-12 flex items-center justify-center text-xl"
        style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, border: styles.button.border, borderDark: styles.button.borderDark, boxShadow: styles.button.boxShadow, boxShadowDark: styles.button.boxShadowDark }}
      >
        <FaSignOutAlt />
      </motion.button>
      {(state.isCartOpen || state.showForm || state.showImageModal) && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/60 z-30" onClick={() => setState(s => ({ ...s, isCartOpen: false, showForm: false, showImageModal: false, isEditing: false }))} />
      )}
      {state.showSuccess && (
        <motion.div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <BigFireworkAnimation />
          <motion.div className="flex flex-col items-center gap-4 z-10" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <motion.h2 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 via-emerald-500 to-green-700 dark:from-green-500 dark:via-emerald-400 dark:to-green-600 bg-clip-text text-transparent text-center" style={{ textShadow: "0 0 20px rgba(34,197,94,0.8)" }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: 1, delay: 0.5 }}>
              {state.isEditing ? 'Updated' : 'Booked'}
            </motion.h2>
          </motion.div>
        </motion.div>
      )}
      {state.showError && (
        <motion.div className="fixed inset-0 flex items-center justify-center z-60 pointer-events-none" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.5 }}>
          <div className="bg-red-500 dark:bg-red-600 text-white dark:text-gray-100 text-lg font-semibold rounded-xl py-6 px-4 max-w-md mx-auto text-center shadow-lg">{state.error}</div>
        </motion.div>
      )}
      {state.showImageModal && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }} 
          animate={{ opacity: 1, scale: 1 }} 
          exit={{ opacity: 0, scale: 0.8}} 
          transition={{ duration: 0.3 }} 
          className="fixed inset-0 flex items-center justify-center z-50"
        >
          <div 
            className="relative w-full max-w-3xl mx-4 p-6 rounded-xl bg-white dark:bg-gray-800"
            style={{ 
              background: styles.modal.background, 
              backgroundDark: styles.modal.backgroundDark, 
              border: styles.modal.border, 
              borderDark: styles.modal.borderDark, 
              boxShadow: styles.modal.boxShadow, 
              boxShadowDark: styles.modal.boxShadowDark 
            }}
          >
            <button 
              onClick={closeImageModal} 
              className="absolute top-2 right-2 text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xl cursor-pointer"
            >
              <FaTimes />
            </button>
            <div className="relative flex items-center justify-center">
              {state.selectedImages.length > 0 ? (
                <>
                  <img 
                    src={state.selectedImages[state.selectedImageIndex]} 
                    alt={`Full-size ${state.products.find(p => p.image.includes(state.selectedImages[state.selectedImageIndex]))?.productname || 'product'}`} 
                    className="max-w-full max-h-[70vh] object-contain rounded-xl"
                  />
                  {state.selectedImages.length > 1 && (
                    <>
                      <button 
                        onClick={prevImage} 
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white dark:text-gray-100 rounded-full w-10 h-10 flex items-center justify-center" 
                        style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}
                      >
                        &larr;
                      </button>
                      <button 
                        onClick={nextImage} 
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white dark:text-gray-100 rounded-full w-10 h-10 flex items-center justify-center" 
                        style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}
                      >
                        &rarr;
                      </button>
                      <div className="absolute bottom-2 flex gap-2">
                        {state.selectedImages.map((_, index) => (
                          <div 
                            key={index} 
                            className={`w-3 h-3 rounded-full ${index === state.selectedImageIndex ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">No images available</p>
              )}
            </div>
          </div>
        </motion.div>
      )}
      <main className="relative pt-5 mobile:px-5 mobile:pt-20 max-w-7xl mx-auto">
        <section className="rounded-xl px-4 py-3 shadow-inner flex justify-between flex-wrap gap-4 text-sm sm:text-base border border-sky-300 dark:border-sky-600 bg-gradient-to-br from-sky-400/80 to-sky-600/90 dark:from-sky-600/80 dark:to-sky-800/90 text-white dark:text-gray-100 font-semibold">
          <div>Net: ₹{totals.net}</div><div>Save: ₹{totals.save}</div><div className="font-bold">Total: ₹{totals.total}</div>
        </section>
        <div className="flex justify-center gap-4 mb-8 mt-8">
          <input 
            type="text" 
            placeholder="Search by name or serial number" 
            value={state.search} 
            onChange={e => setState(s => ({ ...s, search: e.target.value }))} 
            className="rounded-xl px-4 w-80 h-12 text-lg text-slate-800 dark:text-gray-800 font-medium focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800" 
            style={{ background: styles.input.background, backgroundDark: styles.input.backgroundDark, border: styles.input.border, borderDark: styles.input.borderDark, backdropFilter: styles.input.backdropFilter }}
          />
        </div>
        <div className="mt-12 mb-10">
          <div className="flex justify-between items-center mb-5">
            <h2 className="text-3xl text-sky-500 dark:text-sky-300 font-semibold capitalize border-b-4 border-sky-500 dark:border-sky-300 pb-2">Gift Box Products</h2>
            <button
              onClick={() => setState(s => ({ ...s, showForm: true, isEditing: true }))}
              className="text-sm text-white dark:text-gray-100 font-semibold py-2 px-4 rounded-xl"
              style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, border: styles.button.border, borderDark: styles.button.borderDark, boxShadow: styles.button.boxShadow, boxShadowDark: styles.button.boxShadowDark }}
            >
              Edit Profile
            </button>
          </div>
          {filteredProducts.length === 0 ? (
            <p className="text-lg text-center text-gray-600 dark:text-gray-400 font-medium">No products available.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredProducts.map(p => {
                const price = parseFloat(p.price), disc = price * (p.discount / 100), finalPrice = p.discount > 0 ? formatPrice(price - disc) : formatPrice(price), count = state.cart[p.serial_number] || 0;
                const currentImageIndex = state.cardImageIndexes[p.serial_number] || 0;
                const primaryImage = Array.isArray(p.image) && p.image.length > 0 ? p.image[currentImageIndex] : "/placeholder.svg";
                return (
                  <motion.div 
                    key={p.serial_number} 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    whileHover={{ y: -8, scale: 1.02 }} 
                    className="group relative rounded-3xl p-6 overflow-hidden cursor-pointer bg-white dark:bg-gray-800"
                    style={{ 
                      background: styles.card.background, 
                      backgroundDark: styles.card.backgroundDark, 
                      border: styles.card.border, 
                      borderDark: styles.card.borderDark, 
                      boxShadow: styles.card.boxShadow, 
                      boxShadowDark: styles.card.boxShadowDark 
                    }}
                  >
                    {p.discount > 0 && <div className="absolute left-2 top-2 bg-red-500 dark:bg-red-600 text-white dark:text-gray-100 text-md font-bold px-2 py-1 rounded-br-xl rounded-tl-xl mobile:text-xs mobile:px-1.5 mobile:py-0.5">{p.discount}%</div>}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100" style={{ background: "linear-gradient(135deg, rgba(2,132,199,0.3), transparent 50%, rgba(14,165,233,0.2))", backgroundDark: "linear-gradient(135deg, rgba(59,130,246,0.4), transparent 50%, rgba(37,99,235,0.3))" }} />
                    <div className="relative z-10 mobile:mt-2">
                      <p className="text-lg mobile:text-sm sm:text-base font-bold text-slate-800 dark:text-gray-100 group-hover:text-slate-900 dark:group-hover:text-gray-200 line-clamp-2 mb-2">{p.productname}</p>
                      <div className="space-y-1 mb-4">
                        {p.discount > 0 ? (
                          <>
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-through">MRP: ₹{formatPrice(price)}</p>
                            <p className="text-xl sm:text-lg font-bold text-sky-500 dark:text-sky-300 group-hover:text-sky-700 dark:group-hover:text-sky-400">₹{finalPrice} / {p.per}</p>
                          </>
                        ) : (
                          <p className="text-xl sm:text-lg font-bold text-sky-500 dark:text-sky-300 group-hover:text-sky-700 dark:group-hover:text-sky-400">₹{finalPrice} / {p.per}</p>
                        )}
                      </div>
                      {primaryImage && (
                        <div 
                          className="relative w-full h-30 rounded-2xl mb-4 overflow-hidden cursor-pointer" 
                          style={{ background: styles.card.background, backgroundDark: styles.card.backgroundDark, backdropFilter: styles.card.backdropFilter, border: styles.card.border, borderDark: styles.card.borderDark }}
                          onClick={() => openImageModal(p.image, currentImageIndex)}
                        >
                          <img src={primaryImage} alt={`${p.productname} - Image ${currentImageIndex + 1}`} className="w-full h-full object-contain p-2" />
                          {Array.isArray(p.image) && p.image.length > 1 && (
                            <>
                              <button 
                                onClick={e => { e.stopPropagation(); prevCardImage(p.serial_number, p.image); }} 
                                className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white dark:text-gray-100 rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" 
                                style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}
                              >
                                &larr;
                              </button>
                              <button 
                                onClick={e => { e.stopPropagation(); nextCardImage(p.serial_number, p.image); }} 
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-white dark:text-gray-100 rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" 
                                style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}
                              >
                                &rarr;
                              </button>
                              <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {p.image.map((_, index) => (
                                  <div 
                                    key={index} 
                                    className={`w-2 h-2 rounded-full ${index === currentImageIndex ? 'bg-sky-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                                  />
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      <div className="relative min-h-[3rem] flex items-end justify-end">
                        <AnimatePresence mode="wait">
                          {count > 0 ? (
                            <motion.div 
                              key="qty-controls" 
                              initial={{ scale: 0.8, opacity: 0 }} 
                              animate={{ scale: 1, opacity: 1 }} 
                              exit={{ scale: 0.8, opacity: 0 }} 
                              transition={{ duration: 0.3, ease: "easeOut" }} 
                              className="flex items-center justify-between w-full rounded-full p-2"
                              style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, border: styles.button.border, borderDark: styles.button.borderDark }}
                            >
                              <motion.button onClick={() => removeFromCart(p)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-full bg-white/20 dark:bg-gray-900/20 text-white dark:text-gray-100 font-bold text-lg flex items-center justify-center"><FaMinus /></motion.button>
                              <motion.span key={count} initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ duration: 0.2 }} className="text-white dark:text-gray-100 font-bold text-lg px-4">{count}</motion.span>
                              <motion.button onClick={() => addToCart(p)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-8 h-8 rounded-full bg-white/20 dark:bg-gray-900/20 text-white dark:text-gray-100 font-bold text-lg flex items-center justify-center"><FaPlus /></motion.button>
                            </motion.div>
                          ) : (
                            <motion.button 
                              key="add-btn" 
                              onClick={() => addToCart(p)} 
                              initial={{ scale: 0.8, opacity: 0 }} 
                              animate={{ scale: 1, opacity: 1 }} 
                              exit={{ scale: 0.8, opacity: 0 }} 
                              whileHover={{ scale: 1.1 }} 
                              whileTap={{ scale: 0.9 }} 
                              transition={{ duration: 0.3 }} 
                              className="w-12 h-12 rounded-full text-white dark:text-gray-100 font-bold text-xl flex items-center justify-center relative overflow-hidden"
                              style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, border: styles.button.border, borderDark: styles.button.borderDark }}
                            >
                              <motion.div className="absolute inset-0 rounded-full" initial={{ scale: 0, opacity: 0.5 }} whileTap={{ scale: 2, opacity: 0 }} transition={{ duration: 0.4 }} style={{ background: "rgba(255,255,255,0.3)", backgroundDark: "rgba(59,130,246,0.3)" }} />
                              <FaPlus />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-px opacity-60" style={{ background: "linear-gradient(90deg, transparent, rgba(2,132,199,0.6), transparent)", backgroundDark: "linear-gradient(90deg, transparent, rgba(59,130,246,0.6), transparent)" }} />
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <motion.button 
        onClick={() => setState(s => ({ ...s, isCartOpen: true }))} 
        whileHover={{ scale: 1.1 }} 
        whileTap={{ scale: 0.95 }} 
        className={`fixed bottom-6 right-6 z-50 text-white dark:text-gray-100 rounded-full shadow-xl w-16 h-16 flex items-center justify-center text-2xl ${state.isCartOpen || state.showForm || state.showImageModal ? "hidden" : ""}`}
        style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, border: styles.button.border, borderDark: styles.button.borderDark, boxShadow: styles.button.boxShadow, boxShadowDark: styles.button.boxShadowDark }}
      >
        <FaShoppingCart />
        {Object.keys(state.cart).length > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 bg-red-500 dark:bg-red-600 text-white dark:text-gray-100 text-xs w-6 h-6 flex items-center justify-center rounded-full font-bold">{Object.values(state.cart).reduce((a, b) => a + b, 0)}</motion.span>}
      </motion.button>
      <motion.aside 
        initial={false} 
        animate={{ x: state.isCartOpen ? 0 : 320 }} 
        transition={{ duration: 0.4, ease: "easeInOut" }} 
        className="fixed top-0 right-0 w-80 h-full shadow-xl border-l border-sky-200 dark:border-gray-700 bg-white dark:bg-gray-800 z-50"
        style={{ background: styles.modal.background, backgroundDark: styles.modal.backgroundDark, border: styles.modal.border, borderDark: styles.modal.borderDark, boxShadow: styles.modal.boxShadow, boxShadowDark: styles.modal.boxShadowDark }}
      >
        <div className="flex justify-between items-center p-4 border-b bg-white dark:bg-gray-800 border-sky-200 dark:border-gray-700">
          <h3 className="text-lg font-bold text-sky-800 dark:text-sky-200">Your Cart</h3>
          <button onClick={() => setState(s => ({ ...s, isCartOpen: false }))} className="text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 text-xl cursor-pointer">×</button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-120px)] space-y-4 bg-white dark:bg-gray-800">
          {Object.keys(state.cart).length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-sm">Your cart is empty.</p>
          ) : (
            Object.entries(state.cart).map(([serial, qty]) => {
              const p = state.products.find(p => p.serial_number === serial);
              if (!p) return null;
              const disc = (p.price * p.discount) / 100, priceAfterDisc = formatPrice(p.price - disc);
              const currentImageIndex = state.cardImageIndexes[p.serial_number] || 0;
              const primaryImage = Array.isArray(p.image) && p.image.length > 0 ? p.image[currentImageIndex] : "/placeholder.svg";
              return (
                <motion.div key={serial} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-3 border-b pb-3 border-sky-100 dark:border-gray-700">
                  {primaryImage && (
                    <div 
                      className="relative w-16 h-16 rounded-xl overflow-hidden cursor-pointer" 
                      style={{ background: styles.card.background, backgroundDark: styles.card.backgroundDark, backdropFilter: styles.card.backdropFilter, border: styles.card.border, borderDark: styles.card.borderDark }}
                      onClick={() => openImageModal(p.image, currentImageIndex)}
                    >
                      <img src={primaryImage} alt={`${p.productname} - Image ${currentImageIndex + 1}`} className="w-full h-full object-contain p-1" />
                      {Array.isArray(p.image) && p.image.length > 1 && (
                        <>
                          <button 
                            onClick={e => { e.stopPropagation(); prevCardImage(p.serial_number, p.image); }} 
                            className="absolute left-1 top-1/2 transform -translate-y-1/2 text-white dark:text-gray-100 rounded-full w-6 h-6 flex items-center justify-center" 
                            style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}
                          >
                            &larr;
                          </button>
                          <button 
                            onClick={e => { e.stopPropagation(); nextCardImage(p.serial_number, p.image); }} 
                            className="absolute right-1 top-1/2 transform -translate-y-1/2 text-white dark:text-gray-100 rounded-full w-6 h-6 flex items-center justify-center" 
                            style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}
                          >
                            &rarr;
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-800 dark:text-gray-100">{p.productname}</p>
                    <p className="text-sm text-sky-700 dark:text-sky-300 font-bold">₹{priceAfterDisc} x {qty}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => removeFromCart(p)} className="w-7 h-7 text-sm text-white dark:text-gray-100 rounded-full flex items-center justify-center" style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}><FaMinus /></button>
                      <span className="text-sm font-medium px-2 text-slate-800 dark:text-gray-100">{qty}</span>
                      <button onClick={() => addToCart(p)} className="w-7 h-7 text-sm text-white dark:text-gray-100 rounded-full flex items-center justify-center" style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark }}><FaPlus /></button>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
        <div className="p-4 border-t border-sky-200 dark:border-gray-700 sticky bottom-0 space-y-4 bg-white dark:bg-gray-800" style={{ background: styles.modal.background, backgroundDark: styles.modal.backgroundDark, border: styles.modal.border, borderDark: styles.modal.borderDark, boxShadow: styles.modal.boxShadow, boxShadowDark: styles.modal.boxShadowDark }}>
          <div className="text-sm bg-white dark:bg-gray-800 p-2 text-slate-700 dark:text-gray-300 space-y-1"><p>Net: ₹{totals.net}</p><p>Save: ₹{totals.save}</p><p className="font-bold text-sky-800 dark:text-sky-200 text-lg">Total: ₹{totals.total}</p></div>
          <div className="flex gap-2">
            <button onClick={() => setState(s => ({ ...s, cart: {} }))} className="flex-1 text-white dark:text-gray-100 text-sm font-semibold py-3 rounded-xl" style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))", backgroundDark: "linear-gradient(135deg, rgba(220,38,38,0.9), rgba(185,28,28,0.9))", boxShadow: "0 5px 15px rgba(239,68,68,0.3)", boxShadowDark: "0 5px 15px rgba(220,38,38,0.4)" }}>Clear Cart</button>
            <button onClick={() => setState(s => ({ ...s, isCartOpen: false, showForm: true }))} className="flex-1 text-white dark:text-gray-100 text-sm font-semibold py-3 rounded-xl" style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, boxShadow: styles.button.boxShadow, boxShadowDark: styles.button.boxShadowDark }}>Proceed to Details</button>
          </div>
        </div>
      </motion.aside>
      {state.showForm && (
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.3 }} className="fixed inset-0 flex items-center justify-center z-50">
          <div className="w-full max-w-xl mx-4 p-6 rounded-xl bg-white dark:bg-gray-800" style={{ background: styles.modal.background, backgroundDark: styles.modal.backgroundDark, border: styles.modal.border, borderDark: styles.modal.borderDark, boxShadow: styles.modal.boxShadow, boxShadowDark: styles.modal.boxShadowDark }}>
            <h2 className="text-lg font-bold text-sky-800 dark:text-sky-200 mb-4">{state.isEditing ? 'Edit Profile' : 'Customer Details'}</h2>
            <form className="space-y-4 hundred:gap-x-5 hundred:grid hundred:grid-cols-2">
              {[
                { label: "Customer Name", key: "customer_name", type: "text", placeholder: "Enter name", required: true },
                { label: "Company Name", key: "company_name", type: "text", placeholder: "Enter company name", required: true },
                { label: "License Number", key: "license_number", type: "text", placeholder: "Enter license number (optional)" },
                { label: "Address", key: "address", type: "textarea", placeholder: "Enter address", required: true },
                { label: "State", key: "state", type: "select", options: state.states, required: true },
                { label: "District", key: "district", type: "select", options: state.districts, required: true },
                { label: "Mobile Number", key: "mobile_number", type: "text", placeholder: "Enter mobile number", required: true },
                { label: "Email", key: "email", type: "email", placeholder: "Enter email", required: true }
              ].map(({ label, key, type, placeholder, required, options }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-800">{label} {required && '*'}</label>
                  {type === "select" ? (
                    <select 
                      value={state.customer[key]} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      className="w-full p-2 rounded-md mt-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent" 
                      style={{ background: styles.input.background, backgroundDark: styles.input.backgroundDark, border: styles.input.border, borderDark: styles.input.borderDark }} 
                      required={required}
                    >
                      <option value="" className="bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-100">Select {label}</option>
                      {options.map(opt => <option key={opt.id || opt.name} value={opt.name} className="bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-800">{opt.name}</option>)}
                    </select>
                  ) : type === "textarea" ? (
                    <textarea 
                      value={state.customer[key]} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      placeholder={placeholder} 
                      className="w-full p-2 rounded-md mt-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent" 
                      style={{ background: styles.input.background, backgroundDark: styles.input.backgroundDark, border: styles.input.border, borderDark: styles.input.borderDark }} 
                      required={required}
                    />
                  ) : (
                    <input 
                      type={type} 
                      value={state.customer[key]} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      placeholder={placeholder} 
                      className="w-full p-2 rounded-md mt-1 bg-white dark:bg-gray-900 text-slate-800 dark:text-gray-800 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500 focus:border-transparent" 
                      style={{ background: styles.input.background, backgroundDark: styles.input.backgroundDark, border: styles.input.border, borderDark: styles.input.borderDark }} 
                      required={required}
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setState(s => ({ ...s, showForm: false, isEditing: false }))} 
                  className="flex-1 text-white dark:text-gray-100 text-sm font-semibold py-3 rounded-xl" 
                  style={{ background: "linear-gradient(135deg, rgba(239,68,68,0.9), rgba(220,38,38,0.9))", backgroundDark: "linear-gradient(135deg, rgba(220,38,38,0.9), rgba(185,28,28,0.9))", boxShadow: "0 5px 15px rgba(239,68,68,0.3)", boxShadowDark: "0 5px 15px rgba(220,38,38,0.4)" }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  onClick={state.isEditing ? handleEditSubmit : handleFormSubmit}
                  className="flex-1 text-white dark:text-gray-100 text-sm font-semibold py-3 rounded-xl" 
                  style={{ background: styles.button.background, backgroundDark: styles.button.backgroundDark, boxShadow: styles.button.boxShadow, boxShadowDark: styles.button.boxShadowDark }}
                >
                  {state.isEditing ? 'Update Profile' : 'Confirm Booking'}
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        [style*="backgroundDark"] { background: var(--bg, ${styles.card.background}); }
        [style*="backgroundDark"][data-dark] { --bg: ${styles.card.backgroundDark}; }
        [style*="borderDark"] { border: var(--border, ${styles.card.border}); }
        [style*="borderDark"][data-dark] { --border: ${styles.card.borderDark}; }
        [style*="boxShadowDark"] { box-shadow: var(--shadow, ${styles.card.boxShadow}); }
        [style*="boxShadowDark"][data-dark] { --shadow: ${styles.card.boxShadowDark}; }
      `}</style>
    </div>
  );
};

export default Book;