import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import Sidebar from './Sidebar/Sidebar';
import { API_BASE_URL } from '../../Config';
import { FaEye, FaEdit, FaTrash, FaPlus, FaTimes, FaSearch, FaBoxes, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Logout from './Logout';

Modal.setAppElement('#root');

const FormFields = ({ isEdit, formData, handleInputChange, handleImageChange, handleRemoveImage, handleSubmit, closeModal, capitalize }) => {
  const fields = [
    { name: 'productname', label: 'Product Name', type: 'text', placeholder: 'Enter product name' },
    { name: 'serial_number', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
    { name: 'price', label: 'Price (₹)', type: 'number', placeholder: 'Enter price', step: '0.01' },
    { name: 'discount', label: 'Discount (%)', type: 'number', placeholder: 'Enter discount', step: '0.01' },
    { name: 'stock', label: 'Initial Stock Quantity', type: 'number', placeholder: 'Enter stock quantity', min: '0', step: '1' },
  ];

  return (
    <form onSubmit={(e) => handleSubmit(e, isEdit)} className="space-y-4">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
            {field.label}
          </label>
          <input
            type={field.type}
            name={field.name}
            value={formData[field.name] || ''}
            onChange={handleInputChange}
            className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            required
            placeholder={field.placeholder}
            step={field.step}
            min={field.min}
          />
        </div>
      ))}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Unit</label>
        <select
          name="per"
          value={formData.per || ''}
          onChange={handleInputChange}
          className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          required
        >
          <option value="">Select Unit</option>
          {['box', 'pkt', 'pieces'].map(unit => (
            <option key={unit} value={unit}>{capitalize(unit)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">Images</label>
        <input
          type="file"
          name="images"
          onChange={handleImageChange}
          accept="image/jpeg,image/png,image/jpg"
          multiple
          className="w-full text-xs text-gray-500 dark:text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-gray-700 dark:file:text-blue-300"
        />
        {formData.existingImages && formData.existingImages.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {formData.existingImages.map((url, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <img src={url} alt={`Existing ${index}`} className="h-16 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index, 'existing')}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-sm hover:bg-red-700"
                >
                  <FaTimes className="h-2 w-2" />
                </button>
              </div>
            ))}
          </div>
        )}
        {formData.newImages && formData.newImages.length > 0 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {formData.newImages.map((file, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                <img src={URL.createObjectURL(file)} alt={`Preview ${index}`} className="h-16 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index, 'new')}
                  className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-sm hover:bg-red-700"
                >
                  <FaTimes className="h-2 w-2" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="button"
          onClick={closeModal}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
        >
          {isEdit ? 'Save Changes' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

export default function Dealers() {
  const [products, setProducts] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [viewModalIsOpen, setViewModalIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toggleStates, setToggleStates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');

  const [formData, setFormData] = useState({
    productname: '',
    serial_number: '',
    price: '',
    discount: '',
    per: '',
    stock: '',
    existingImages: [],
    newImages: [],
  });

  const productType = 'gift_box_dealers';
  const productsPerPage = 9;

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products`);
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to fetch products');
      const data = await response.json();
      setProducts(data);
      setToggleStates(data.reduce((acc, p) => ({
        ...acc,
        [`${productType}-${p.id}`]: p.status === 'on',
        [`fast-${productType}-${p.id}`]: p.fast_running,
      }), {}));
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
    const intervalId = setInterval(fetchProducts, 6000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e, isEdit = false) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('productname', formData.productname);
      formDataToSend.append('serial_number', formData.serial_number);
      formDataToSend.append('price', formData.price);
      formDataToSend.append('discount', formData.discount);
      formDataToSend.append('per', formData.per);
      formDataToSend.append('stock', formData.stock);
      if (!isEdit) {
        formDataToSend.append('product_type', productType);
      }
      if (formData.existingImages.length > 0) {
        formDataToSend.append('existingImages', JSON.stringify(formData.existingImages));
      }
      formData.newImages.forEach((file) => {
        formDataToSend.append('images', file);
      });

      const url = `${API_BASE_URL}/api/gift-box-products${isEdit ? `/${selectedProduct.id}` : ''}`;
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: formDataToSend,
      });
      if (!response.ok) throw new Error((await response.json()).message || `Failed to ${isEdit ? 'update' : 'save'} product`);
      setSuccess(`Product ${isEdit ? 'updated' : 'saved'} successfully!`);
      resetForm();
      fetchProducts();
      setModalIsOpen(false);
      setEditModalIsOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Are you sure you want to delete ${product.productname}?`)) return;
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${product.id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error((await response.json()).message || 'Failed to delete product');
      setSuccess('Product deleted successfully!');
      fetchProducts();
      setViewModalIsOpen(false);
      setSelectedProduct(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleChange = async (product) => {
    const productKey = `${productType}-${product.id}`;
    try {
      setToggleStates(prev => ({ ...prev, [productKey]: !prev[productKey] }));
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${product.id}/toggle-status`, { method: 'PATCH' });
      if (!response.ok) throw new Error('Failed to toggle status');
      setSuccess('Status toggled successfully!');
      await fetchProducts();
    } catch (err) {
      setToggleStates(prev => ({ ...prev, [productKey]: prev[productKey] }));
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const validFiles = files.filter(file => ['image/png', 'image/jpeg', 'image/jpg'].includes(file.type) && file.size <= 2000000);
      if (validFiles.length !== files.length) {
        setError('Only PNG/JPEG/JPG images under 2MB are allowed');
        return;
      }
      setFormData(prev => ({ ...prev, newImages: [...prev.newImages, ...validFiles] }));
      setError('');
    }
  };

  const handleRemoveImage = (index, type) => {
    setFormData(prev => {
      if (type === 'existing') {
        const updatedExisting = [...prev.existingImages];
        updatedExisting.splice(index, 1);
        return { ...prev, existingImages: updatedExisting };
      } else {
        const updatedNew = [...prev.newImages];
        updatedNew.splice(index, 1);
        return { ...prev, newImages: updatedNew };
      }
    });
  };

  const resetForm = () => {
    setFormData({
      productname: '',
      serial_number: '',
      price: '',
      discount: '',
      per: '',
      stock: '',
      existingImages: [],
      newImages: [],
    });
  };

  const capitalize = (str) => (str ? str.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') : '');

  const openModal = (isEdit = false, product = null) => {
    if (isEdit && product) {
      setSelectedProduct(product);
      setFormData({
        productname: product.productname || '',
        serial_number: product.serial_number || '',
        price: product.price || '',
        discount: product.discount || '',
        per: product.per || '',
        stock: product.stock || '',
        existingImages: product.image ? JSON.parse(product.image) : [],
        newImages: [],
      });
      setEditModalIsOpen(true);
    } else {
      resetForm();
      setModalIsOpen(true);
    }
  };

  const openViewModal = (product) => {
    setSelectedProduct(product);
    setViewModalIsOpen(true);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setEditModalIsOpen(false);
    setViewModalIsOpen(false);
    setSelectedProduct(null);
    setError('');
    setSuccess('');
    resetForm();
  };

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        const q = searchQuery.trim().toLowerCase();
        const matchesSearch =
          !q ||
          (p.productname && p.productname.toLowerCase().includes(q)) ||
          (p.serial_number && p.serial_number.toLowerCase().includes(q));
        const matchesUnit = unitFilter === 'all' || (p.per || '').toLowerCase() === unitFilter.toLowerCase();
        return matchesSearch && matchesUnit;
      })
      .sort((a, b) => (a.serial_number || '').localeCompare(b.serial_number || '', undefined, { numeric: true }));
  }, [products, searchQuery, unitFilter]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.status === 'on').length;
    const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 10).length;
    const outOfStock = products.filter(p => Number(p.stock) <= 0).length;
    return { total, active, lowStock, outOfStock };
  }, [products]);

  const totalPages = Math.ceil(filteredProducts.length / productsPerPage) || 1;
  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = filteredProducts.slice(indexOfFirstProduct, indexOfLastProduct);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-white w-full max-w-full overflow-x-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 hundred:ml-64 onefifty:ml-1 p-3 sm:p-6 md:p-8 pt-16 sm:pt-6 min-w-0 max-w-full overflow-x-hidden">
        <div className="max-w-6xl mx-auto space-y-6 min-w-0 w-full">

          {/* Top Title & Quick Stats */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  Inventory Management
                  <span className="text-xs font-bold px-3 py-1 bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-full">
                    {capitalize(productType)}
                  </span>
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Manage product catalog, real-time stock levels, pricing, discounts, and public visibility
                </p>
              </div>
              <button
                onClick={() => openModal()}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition hover:scale-102"
              >
                <FaPlus className="text-xs" /> Add Product
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl">
                <span className="text-xs text-gray-500 font-medium">Total Products</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Active (On Sale)</span>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.active}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-800/40">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Low Stock (&le; 10)</span>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{stats.lowStock}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800/40">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Out of Stock</span>
                <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{stats.outOfStock}</p>
              </div>
            </div>

            {error && <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm font-medium rounded-xl border border-red-200">{error}</div>}
            {success && <div className="mt-4 p-3 bg-green-50 text-green-700 text-sm font-medium rounded-xl border border-green-200">{success}</div>}
          </div>

          {/* Search & Filter Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <input
                type="text"
                placeholder="Search products by name or serial number..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-9 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <FaSearch className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-lg leading-none"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <span className="text-xs text-gray-500 font-semibold uppercase tracking-wider">Unit:</span>
              {['all', 'box', 'pkt', 'pieces'].map((unit) => (
                <button
                  key={unit}
                  onClick={() => {
                    setUnitFilter(unit);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    unitFilter === unit
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {capitalize(unit)}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {currentProducts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FaBoxes className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No products match your search</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setUnitFilter('all');
                }}
                className="mt-2 text-sm text-blue-600 font-bold underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentProducts.map((product) => {
                const productKey = `${productType}-${product.id}`;
                const images = product.image ? JSON.parse(product.image) : [];
                const stockNum = Number(product.stock) || 0;
                const isOutOfStock = stockNum <= 0;
                const isLowStock = stockNum > 0 && stockNum <= 10;

                return (
                  <div
                    key={productKey}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-lg border border-gray-200/80 dark:border-gray-700/80 p-5 transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Image header */}
                      <div className="relative h-44 bg-gray-50 dark:bg-gray-900 rounded-xl overflow-hidden mb-4 flex items-center justify-center border border-gray-100 dark:border-gray-700">
                        {images.length > 0 ? (
                          <img
                            src={images[0]}
                            alt={product.productname}
                            className="h-full w-full object-contain p-2 hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 font-medium">No Image Uploaded</span>
                        )}
                        {product.discount > 0 && (
                          <span className="absolute top-2 left-2 bg-rose-500 text-white text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-sm">
                            {product.discount}% OFF
                          </span>
                        )}
                        <span
                          className={`absolute top-2 right-2 text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/60 dark:text-rose-400'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/60 dark:text-amber-400'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-400'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? `Low (${stockNum})` : `In Stock (${stockNum})`}
                        </span>
                      </div>

                      {/* Product details */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1">
                            {product.productname}
                          </h3>
                          <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">
                            #{product.serial_number}
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between pt-1">
                          <div>
                            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                              ₹{Number(product.price).toFixed(2)}
                            </span>
                            <span className="text-xs text-gray-500 ml-1">/ {product.per || 'box'}</span>
                          </div>
                          <div className="text-xs text-gray-500 font-semibold">
                            Stock: <strong className="text-gray-800 dark:text-gray-200">{stockNum}</strong>
                          </div>
                        </div>

                        {/* Visibility Switch */}
                        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-xs text-gray-500 font-medium">Public Status:</span>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={toggleStates[productKey] || false}
                              onChange={() => handleToggleChange(product)}
                            />
                            <div className={`w-10 h-5 rounded-full transition-colors ${toggleStates[productKey] ? 'bg-emerald-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                              <div className={`w-4 h-4 translate-y-[2px] bg-white rounded-full transition-transform ${toggleStates[productKey] ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                            </div>
                            <span className="ml-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                              {toggleStates[productKey] ? 'Active' : 'Hidden'}
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-2">
                      <button
                        onClick={() => openViewModal(product)}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition"
                      >
                        <FaEye className="text-xs" /> View
                      </button>
                      <button
                        onClick={() => openModal(true, product)}
                        className="bg-amber-500 hover:bg-amber-600 text-white py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition shadow-xs"
                      >
                        <FaEdit className="text-xs" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="bg-rose-600 hover:bg-rose-700 text-white py-1.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition shadow-xs"
                      >
                        <FaTrash className="text-xs" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-40"
              >
                Previous
              </button>
              {[...Array(totalPages).keys()].map((page) => (
                <button
                  key={page + 1}
                  onClick={() => handlePageChange(page + 1)}
                  className={`w-8 h-8 rounded-xl text-xs font-bold transition ${
                    currentPage === page + 1
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {page + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}

          {/* Add Product Modal */}
          <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Add New Product</h2>
              <FormFields
                isEdit={false}
                formData={formData}
                handleInputChange={handleInputChange}
                handleImageChange={handleImageChange}
                handleRemoveImage={handleRemoveImage}
                handleSubmit={handleSubmit}
                closeModal={closeModal}
                capitalize={capitalize}
              />
            </div>
          </Modal>

          {/* Edit Product Modal */}
          <Modal
            isOpen={editModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Edit Product</h2>
              <FormFields
                isEdit={true}
                formData={formData}
                handleInputChange={handleInputChange}
                handleImageChange={handleImageChange}
                handleRemoveImage={handleRemoveImage}
                handleSubmit={handleSubmit}
                closeModal={closeModal}
                capitalize={capitalize}
              />
            </div>
          </Modal>

          {/* View Product Modal */}
          <Modal
            isOpen={viewModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedProduct.productname}</h2>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                {selectedProduct.image && JSON.parse(selectedProduct.image).length > 0 && (
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {JSON.parse(selectedProduct.image).map((url, i) => (
                      <img key={i} src={url} alt={`View ${i}`} className="w-full h-32 object-contain rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900" />
                    ))}
                  </div>
                )}

                <div className="space-y-2 text-sm bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Serial Number:</span>
                    <span className="font-mono font-bold text-gray-900 dark:text-white">{selectedProduct.serial_number}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Price:</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">₹{Number(selectedProduct.price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Discount:</span>
                    <span className="font-bold text-rose-600">{Number(selectedProduct.discount).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Stock Available:</span>
                    <span className="font-bold text-emerald-600">{selectedProduct.stock} {selectedProduct.per}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="font-bold uppercase tracking-wider text-xs">{selectedProduct.status}</span>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 text-gray-800 dark:text-gray-200"
                  >
                    Close
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