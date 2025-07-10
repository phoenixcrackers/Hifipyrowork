import React, { useState, useEffect, useRef } from 'react';
import Modal from 'react-modal';
import Sidebar from './Sidebar/Sidebar';
import { API_BASE_URL } from '../../Config';
import { FaEye, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import Logout from './Logout';

Modal.setAppElement('#root');

export default function Dealers() {
  const [products, setProducts] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [editModalIsOpen, setEditModalIsOpen] = useState(false);
  const [viewModalIsOpen, setViewModalIsOpen] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [toggleStates, setToggleStates] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const [addFormData, setAddFormData] = useState({
    productname: '',
    serial_number: '',
    price: '',
    discount: '',
    per: '',
    stock: '',
    imageBase64: '',
  });
  const [editFormData, setEditFormData] = useState({
    productname: '',
    serial_number: '',
    price: '',
    discount: '',
    per: '',
    stock: '',
    imageBase64: '',
  });
  const productType = 'gift_box_dealers';
  const productsPerPage = 10;
  const menuRef = useRef({});

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch products');
      setProducts(data);
      const initialToggles = data.reduce((acc, product) => ({
        ...acc,
        [`${productType}-${product.id}`]: product.status === 'on',
        [`fast-${productType}-${product.id}`]: product.fast_running === true,
      }), {});
      setToggleStates(initialToggles);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
    const intervalId = setInterval(fetchProducts, 5000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (viewModalIsOpen && menuRef.current[viewModalIsOpen] && !menuRef.current[viewModalIsOpen].contains(event.target)) {
        setViewModalIsOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [viewModalIsOpen]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addFormData, product_type: productType }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to save product');
      setSuccess('Product saved successfully!');
      setAddFormData({
        productname: '',
        serial_number: '',
        price: '',
        discount: '',
        per: '',
        stock: '',
        imageBase64: '',
      });
      fetchProducts();
      setModalIsOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update product');
      fetchProducts();
      setEditModalIsOpen(false);
      setSelectedProduct(null);
      setSuccess('Product updated successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (product) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${product.id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete product');
      fetchProducts();
      setViewModalIsOpen(null);
      setSuccess('Product deleted successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleChange = async (product) => {
    const productKey = `${productType}-${product.id}`;
    try {
      setToggleStates(prev => ({
        ...prev,
        [productKey]: !prev[productKey],
      }));
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${product.id}/toggle-status`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Failed to toggle status');
      await fetchProducts();
      setSuccess('Status toggled successfully!');
    } catch (err) {
      setToggleStates(prev => ({
        ...prev,
        [productKey]: prev[productKey],
      }));
      setError(err.message);
    }
  };

  const handleInputChange = (e, formType = 'add') => {
    const { name, value } = e.target;
    if (formType === 'add') {
      setAddFormData(prev => ({ ...prev, [name]: value }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleImageChange = (e, formType = 'add') => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/png', 'image/jpeg'].includes(file.type)) {
        setError('Only PNG or JPEG images are allowed');
        return;
      }
      if (file.size > 1000000) {
        setError('Image size must be less than 1MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (formType === 'add') {
          setAddFormData(prev => ({ ...prev, imageBase64: reader.result }));
        } else {
          setEditFormData(prev => ({ ...prev, imageBase64: reader.result }));
        }
        setError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const capitalize = (str) => {
    if (!str) return '';
    return str
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const openModal = () => {
    setModalIsOpen(true);
  };

  const openEditModal = (product) => {
    setSelectedProduct(product);
    setEditFormData({
      productname: product.productname,
      serial_number: product.serial_number,
      price: product.price,
      discount: product.discount,
      per: product.per,
      stock: product.stock,
      imageBase64: product.image || '',
    });
    setEditModalIsOpen(true);
    setViewModalIsOpen(null);
  };

  const openViewModal = (product) => {
    setSelectedProduct(product);
    setViewModalIsOpen(`${productType}-${product.id}`);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setEditModalIsOpen(false);
    setViewModalIsOpen(null);
    setSelectedProduct(null);
    setError('');
    setSuccess('');
  };

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(products.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-100">
      <Sidebar />
      <Logout />
      <div className="flex-1 md:ml-64 p-6 pt-16 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl text-center font-bold text-gray-900 mb-6">Gift Box Dealers</h2>
          {error && <div className="mb-4 text-red-600 text-sm text-center">{error}</div>}
          {success && <div className="mb-4 text-green-600 text-sm text-center">{success}</div>}
          <div className="mb-6 flex items-center gap-x-4">
            <div className="sm:col-span-4">
              <label htmlFor="product-type" className="block text-sm font-medium text-gray-900">
                Product Type
              </label>
              <div className="mt-2">
                <input
                  type="text"
                  id="product-type"
                  value={capitalize(productType)}
                  readOnly
                  className="block w-48 rounded-md bg-gray-100 px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 sm:text-sm"
                />
              </div>
            </div>
            <button
              onClick={openModal}
              className="rounded-md mt-7 bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 flex items-center gap-x-2 transition duration-200"
            >
              <FaPlus className="h-4 w-4" />
              Add Product
            </button>
          </div>
          {currentProducts.length === 0 ? (
            <p className="text-lg text-center text-gray-600 font-medium">
              No products found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 rounded-lg shadow-sm">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Serial Number
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product Name
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Price (INR)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Per
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Discount (%)
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Stock
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Image
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 border-b border-gray-200">
                  {currentProducts.map((product) => {
                    const productKey = `${productType}-${product.id}`;
                    return (
                      <tr key={productKey} className="hover:bg-gray-50">
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {product.serial_number}
                        </td>
                        <td className="px-2 py-3 whitespace-normal text-sm text-gray-900 max-w-xs truncate">
                          {product.productname}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          ₹{parseFloat(product.price).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {product.per}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {parseFloat(product.discount).toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                          {product.stock}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {product.image ? (
                            <img
                              src={product.image}
                              alt={product.productname}
                              className="h-12 w-12 object-cover rounded-md mx-auto"
                            />
                          ) : (
                            <span className="text-xs text-gray-500">No image</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <label className="inline-flex items-center">
                            <input
                              type="checkbox"
                              className="sr-only peer"
                              checked={toggleStates[productKey]}
                              onChange={() => handleToggleChange(product)}
                            />
                            <div
                              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ease-in-out ${toggleStates[productKey] ? 'bg-green-600' : 'bg-red-600'}`}
                            >
                              <div
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ease-in-out ${toggleStates[productKey] ? 'translate-x-5' : 'translate-x-0.5'}`}
                              ></div>
                            </div>
                          </label>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center relative">
                          <button
                            onClick={() => setViewModalIsOpen(viewModalIsOpen === productKey ? null : productKey)}
                            className="text-gray-500 hover:text-gray-700 cursor-pointer"
                          >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4zm0 8a2 2 0 110-4 2 2 0 010 4z" />
                            </svg>
                          </button>
                          {viewModalIsOpen === productKey && (
                            <div
                              ref={(el) => (menuRef.current[productKey] = el)}
                              className="absolute z-10 w-28 bg-white rounded-md shadow-lg border border-gray-200 right-0"
                            >
                              <div className="py-1 flex flex-col">
                                <button
                                  onClick={() => openViewModal(product)}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 text-left"
                                >
                                  <FaEye className="mr-2 h-4 w-4" />
                                  View
                                </button>
                                <button
                                  onClick={() => openEditModal(product)}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-300 text-left"
                                >
                                  <FaEdit className="mr-2 h-4 w-4" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(product)}
                                  className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-300 text-left"
                                >
                                  <FaTrash className="mr-2 h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === 1 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                Previous
              </button>
              {[...Array(totalPages).keys()].map((page) => (
                <button
                  key={page + 1}
                  onClick={() => handlePageChange(page + 1)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === page + 1 ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`}
                >
                  {page + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === totalPages ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
              >
                Next
              </button>
            </div>
          )}
          <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50"
          >
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Add New Product
              </h2>
              <form onSubmit={handleAddSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    type="text"
                    name="productname"
                    value={addFormData.productname}
                    onChange={(e) => handleInputChange(e, 'add')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={addFormData.serial_number}
                    onChange={(e) => handleInputChange(e, 'add')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    placeholder="Enter serial number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (INR)</label>
                  <input
                    type="number"
                    name="price"
                    value={addFormData.price}
                    onChange={(e) => handleInputChange(e, 'add')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    step="0.01"
                    placeholder="Enter price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                  <input
                    type="number"
                    name="discount"
                    value={addFormData.discount}
                    onChange={(e) => handleInputChange(e, 'add')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    step="0.01"
                    placeholder="Enter discount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    name="stock"
                    value={addFormData.stock}
                    onChange={(e) => handleInputChange(e, 'add')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    min="0"
                    placeholder="Enter stock quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    name="per"
                    value={addFormData.per}
                    onChange={(e) => handleInputChange(e, 'add')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                  >
                    <option value="">Select Unit</option>
                    <option value="pieces">Pieces</option>
                    <option value="box">Box</option>
                    <option value="pkt">Packet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input
                    type="file"
                    name="image"
                    onChange={(e) => handleImageChange(e, 'add')}
                    accept="image/jpeg,image/png"
                    className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  {addFormData.imageBase64 && (
                    <img
                      src={addFormData.imageBase64}
                      alt="Preview"
                      className="mt-2 h-24 w-24 object-cover rounded-md"
                    />
                  )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition duration-200"
                  >
                    Add Product
                  </button>
                </div>
              </form>
            </div>
          </Modal>
          <Modal
            isOpen={editModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50"
          >
            <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 text-center">
                Edit Product
              </h2>
              <form onSubmit={handleEditSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product Name</label>
                  <input
                    type="text"
                    name="productname"
                    value={editFormData.productname}
                    onChange={(e) => handleInputChange(e, 'edit')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                  <input
                    type="text"
                    name="serial_number"
                    value={editFormData.serial_number}
                    onChange={(e) => handleInputChange(e, 'edit')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    placeholder="Enter serial number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price (INR)</label>
                  <input
                    type="number"
                    name="price"
                    value={editFormData.price}
                    onChange={(e) => handleInputChange(e, 'edit')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    step="0.01"
                    placeholder="Enter price"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Discount (%)</label>
                  <input
                    type="number"
                    name="discount"
                    value={editFormData.discount}
                    onChange={(e) => handleInputChange(e, 'edit')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    step="0.01"
                    placeholder="Enter discount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Stock Quantity</label>
                  <input
                    type="number"
                    name="stock"
                    value={editFormData.stock}
                    onChange={(e) => handleInputChange(e, 'edit')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                    min="0"
                    placeholder="Enter stock quantity"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    name="per"
                    value={editFormData.per}
                    onChange={(e) => handleInputChange(e, 'edit')}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-600 focus:ring-indigo-600 sm:text-sm transition duration-150 ease-in-out"
                    required
                  >
                    <option value="">Select Unit</option>
                    <option value="pieces">Pieces</option>
                    <option value="box">Box</option>
                    <option value="pkt">Packet</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image</label>
                  <input
                    type="file"
                    name="image"
                    onChange={(e) => handleImageChange(e, 'edit')}
                    accept="image/jpeg,image/png"
                    className="mt-1 block w-full text-sm text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
                  />
                  {editFormData.imageBase64 && (
                    <img
                      src={editFormData.imageBase64}
                      alt="Preview"
                      className="mt-2 h-24 w-24 object-cover rounded-md"
                    />
                  )}
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition duration-200"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </Modal>
          <Modal
            isOpen={selectedProduct && viewModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50"
          >
            {selectedProduct && (
              <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-xl">
                <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">
                  Product Details
                </h2>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {selectedProduct.image ? (
                      <img
                        src={selectedProduct.image}
                        alt={selectedProduct.productname}
                        className="h-24 w-24 object-cover rounded-md"
                      />
                    ) : (
                      <span className="text-gray-500 text-sm">No Image</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Product Type:</span>
                      <span className="ml-2 text-gray-900 text-sm">{capitalize(productType)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Serial Number:</span>
                      <span className="ml-2 text-gray-900 text-sm">{selectedProduct.serial_number}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Product Name:</span>
                      <span className="ml-2 text-gray-900 text-sm">{selectedProduct.productname}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Price:</span>
                      <span className="ml-2 text-gray-900 text-sm">₹{parseFloat(selectedProduct.price).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Per:</span>
                      <span className="ml-2 text-gray-900 text-sm">{selectedProduct.per}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Discount:</span>
                      <span className="ml-2 text-gray-900 text-sm">{parseFloat(selectedProduct.discount).toFixed(2)}%</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Stock:</span>
                      <span className="ml-2 text-gray-900 text-sm">{selectedProduct.stock}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700 text-sm">Status:</span>
                      <span className="ml-2 text-gray-900 text-sm">{capitalize(selectedProduct.status)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 transition duration-200"
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