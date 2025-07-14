import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Select from 'react-select';
import { API_BASE_URL } from '../../Config';
import { API_BASE_URL_loc } from '../../Config';
import Sidebar from './Sidebar/Sidebar';
import Logout from './Logout';

export default function Direct() {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const customersResponse = await axios.get(`${API_BASE_URL}/api/direct/customers`);
        setCustomers(Array.isArray(customersResponse.data) ? customersResponse.data : []);
        const productsResponse = await axios.get(`${API_BASE_URL}/api/direct/products`);
        setProducts(Array.isArray(productsResponse.data) ? productsResponse.data : []);
      } catch {
        setError('Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const addToCart = () => {
    if (!selectedProduct) return setError('Please select a product');
    const product = products.find(p => p.id.toString() === selectedProduct.value.split('-')[0] && p.product_type === selectedProduct.value.split('-')[1]);
    if (!product) return;
    const exists = cart.find(item => item.id === product.id && item.product_type === product.product_type);
    setCart(
      exists
        ? cart.map(item =>
            item.id === product.id && item.product_type === product.product_type
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        : [...cart, { ...product, quantity: 1 }]
    );
    setSelectedProduct(null);
    setError('');
  };

  const updateQuantity = (id, type, delta) => {
    setCart(prev =>
      prev
        .map(item =>
          item.id === id && item.product_type === type
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (id, type) => {
    setCart(cart.filter(item => !(item.id === id && item.product_type === type)));
  };

  const calculateTotal = () =>
    cart.reduce((total, item) => {
      const discount = (item.price * item.discount) / 100;
      return total + (item.price - discount) * item.quantity;
    }, 0).toFixed(2);

  const handleBooking = async () => {
    if (!selectedCustomer) {
      setError('Please select a customer');
      return;
    }
    if (cart.length === 0) {
      setError('Cart is empty');
      return;
    }
    const customer = customers.find(c => c.id.toString() === selectedCustomer);
    const customerType = customer?.customer_type || 'User';
    try {
      await axios.post(`${API_BASE_URL}/api/direct/bookings`, {
        customer_id: Number(selectedCustomer),
        order_id: `ORD-${Date.now()}`,
        products: cart,
        total: calculateTotal(),
        customer_type: customerType
      });
      setCart([]);
      setSelectedCustomer('');
      setSelectedProduct(null);
      setError('');
      setSuccessMessage('Booking created successfully!');
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        setSuccessMessage('');
      }, 3000);
    } catch {
      setError('Failed to create booking');
    }
  };

  const productOptions = products.map(p => ({
    value: `${p.id}-${p.product_type}`,
    label: `${p.serial_number} - ${p.productname} (${p.product_type})`
  }));

  return (
    <div className="flex min-h-screen bg-gray-100 mobile:flex-col">
      <Sidebar />
      <Logout />
      <div className="flex-1 flex justify-center items-start mobile:p-2">
        <div className="w-full max-w-5xl p-6 mobile:p-4">
          <h1 className="text-4xl font-bold mb-8 text-center text-gray-800 mobile:text-2xl">Direct Booking</h1>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-3 rounded-lg mb-6 text-center shadow-md mobile:text-sm mobile:px-3 mobile:py-2">
              {error}
            </div>
          )}
          {showSuccess && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-3 rounded-lg mb-6 text-center shadow-md mobile:text-sm mobile:px-3 mobile:py-2">
              {successMessage}
            </div>
          )}
          <div className="flex flex-wrap gap-6 justify-center mb-8 mobile:flex-col mobile:gap-3">
            <div className="flex flex-col items-center mobile:w-full">
              <label className="text-lg font-semibold text-gray-700 mb-2 mobile:text-base">Select Customer</label>
              <select
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
                className="onefifty:w-96 hundred:w-96 p-3 border rounded-lg shadow focus:outline-none focus:ring-2 focus:ring-blue-500 mobile:w-full mobile:p-2 mobile:text-sm"
              >
                <option value="">Select a customer</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.customer_type || 'User'})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col items-center mobile:w-full">
              <label className="text-lg font-semibold text-gray-700 mb-2 mobile:text-base">Product</label>
              <Select
                value={selectedProduct}
                onChange={setSelectedProduct}
                options={productOptions}
                placeholder="Search for a product..."
                isClearable
                className="mobile:w-full onefifty:w-96 hundred:w-96"
                classNamePrefix="react-select"
                styles={{
                  control: (base) => ({
                    ...base,
                    padding: '0.25rem',
                    fontSize: '1rem',
                    borderRadius: '0.5rem',
                    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                    borderColor: '#d1d5db',
                    '&:hover': { borderColor: '#3b82f6' },
                    '@media (max-width: 640px)': {
                      padding: '0.25rem',
                      fontSize: '0.875rem',
                    }
                  }),
                  menu: (base) => ({
                    ...base,
                    zIndex: 20,
                    fontSize: '1rem',
                    '@media (max-width: 640px)': {
                      fontSize: '0.875rem',
                    }
                  })
                }}
              />
            </div>
            <div className="mobile:w-full mobile:text-center">
              <button
                onClick={addToCart}
                disabled={!selectedProduct}
                className="mt-8 onefifty:w-50 hundred:w-50 h-10 cursor-pointer bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow hover:bg-blue-700 mobile:mt-4 mobile:w-full mobile:py-1 mobile:px-4 mobile:text-sm"
              >
                Add to Cart
              </button>
            </div>
          </div>
          <div className="overflow-x-auto onefifty:ml-32">
            <table className="w-full border-collapse bg-white shadow rounded-lg mobile:text-xs">
              <thead className="bg-gray-200">
                <tr className='hundred:text-lg mobile:text-sm'>
                  <th className="text-center mobile:p-1">Product</th>
                  <th className="text-center mobile:p-1">Type</th>
                  <th className="text-center mobile:p-1">Price</th>
                  <th className="text-center mobile:p-1">Discount</th>
                  <th className="text-center mobile:p-1">Qty</th>
                  <th className="text-center mobile:p-1">Total</th>
                  <th className="text-center mobile:p-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {cart.length ? cart.map(item => (
                  <tr key={`${item.id}-${item.product_type}`} className="border-t mobile:text-sm">
                    <td className="text-center mobile:p-1">{item.productname}</td>
                    <td className="text-center mobile:p-1">{item.product_type}</td>
                    <td className="text-center mobile:p-1">₹{item.price}</td>
                    <td className="text-center mobile:p-1">{item.discount}%</td>
                    <td className="text-center mobile:p-1">
                      <div className="flex justify-center hundred:gap-3 onefifty:gap-3 mobile:gap-0.5">
                        <button onClick={() => updateQuantity(item.id, item.product_type, -1)} className="mobile:text-xs font-black bg-gray-400 cursor-pointer w-5 hover:bg-gray-300 rounded-full">-</button>
                        <span>{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.product_type, 1)} className="mobile:text-xs font-black bg-gray-400 cursor-pointer hover:bg-gray-300 w-5 rounded-full">+</button>
                      </div>
                    </td>
                    <td className="text-center mobile:p-1">
                      ₹{((item.price * (1 - item.discount / 100)) * item.quantity).toFixed(2)}
                    </td>
                    <td className="text-center mobile:p-1">
                      <button
                        onClick={() => removeFromCart(item.id, item.product_type)}
                        className="text-red-600 hover:text-red-800 font-bold mobile:text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="7" className="p-4 text-center text-gray-500 mobile:p-2 mobile:text-xs">Cart is empty</td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="text-xl text-center mt-4 font-bold mobile:text-base mobile:mt-2">Total: ₹{calculateTotal()}</div>
          </div>
          <div className="flex justify-center mt-8 mobile:mt-4">
            <button
              onClick={handleBooking}
              className="bg-green-600 onefifty:w-50 hundred:w-50 h-10 text-white px-8 py-4 rounded-lg font-bold shadow hover:bg-green-700 mobile:w-full mobile:py-2 mobile:px-6 mobile:text-sm"
            >
              Create Booking
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}