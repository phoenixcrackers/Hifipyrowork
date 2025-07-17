import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Sidebar from './Sidebar/Sidebar';
import { API_BASE_URL } from '../../Config';
import { FaEye, FaEdit, FaTrash, FaPlus } from 'react-icons/fa';
import Logout from './Logout';

// Set app element for accessibility
Modal.setAppElement('#root');

// Define FormFields component outside to prevent redefinition
const FormFields = ({ isEdit, formData, handleInputChange, handleImageChange, handleSubmit, closeModal, capitalize }) => {
  const fields = [
    { name: 'productname', label: 'Product Name', type: 'text', placeholder: 'Enter product name' },
    { name: 'serial_number', label: 'Serial Number', type: 'text', placeholder: 'Enter serial number' },
    { name: 'price', label: 'Price (INR)', type: 'number', placeholder: 'Enter price', step: '0.01' },
    { name: 'discount', label: 'Discount (%)', type: 'number', placeholder: 'Enter discount', step: '0.01' },
    { name: 'stock', label: 'Stock Quantity', type: 'number', placeholder: 'Enter stock quantity', min: '0', step: '1' },
  ];

  return (
    <form onSubmit={(e) => handleSubmit(e, isEdit)} className="space-y-4">
      {fields.map(field => (
        <div key={field.name}>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{field.label}</label>
          <input
            type={field.type}
            name={field.name}
            value={formData[field.name] || ''}
            onChange={handleInputChange}
            className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-indigo-600 dark:focus:ring-indigo-400 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            required
            placeholder={field.placeholder}
            step={field.step}
            min={field.min}
          />
        </div>
      ))}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Unit</label>
        <select
          name="per"
          value={formData.per || ''}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-indigo-600 dark:focus:border-indigo-400 focus:ring-indigo-600 dark:focus:ring-indigo-400 sm:text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          required
        >
          <option value="">Select Unit</option>
          {['pieces', 'box', 'pkt'].map(unit => (
            <option key={unit} value={unit}>{capitalize(unit)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
        <input
          type="file"
          name="image"
          onChange={handleImageChange}
          accept="image/jpeg,image/png"
          className="mt-1 block w-full text-sm text-gray-900 dark:text-gray-100 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-indigo-50 dark:file:bg-indigo-900 file:text-indigo-600 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-800"
        />
        {formData.imageBase64 && <img src={formData.imageBase64} alt="Preview" className="mt-2 h-24 w-24 object-cover rounded-md" />}
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={closeModal}
          className="rounded-md bg-gray-600 dark:bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-700 dark:hover:bg-gray-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="rounded-md bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm text-white hover:bg-indigo-700 dark:hover:bg-indigo-600"
        >
          {isEdit ? 'Save Changes' : 'Add Product'}
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
  const [formData, setFormData] = useState({
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
    const intervalId = setInterval(fetchProducts, 5000);
    return () => clearInterval(intervalId);
  }, []);

  const handleSubmit = async (e, isEdit = false) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const url = `${API_BASE_URL}/api/gift-box-products${isEdit ? `/${selectedProduct.id}` : ''}`;
      const response = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isEdit ? formData : { ...formData, product_type: productType }),
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
    e.persist(); // Ensure event is available in async contexts
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/png', 'image/jpeg'].includes(file.type)) return setError('Only PNG or JPEG images are allowed');
      if (file.size > 1000000) return setError('Image size must be less than 1MB');
      const reader = new FileReader();
      reader.onloadend = () => setFormData(prev => ({ ...prev, imageBase64: reader.result }));
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const resetForm = () => {
    setFormData({
      productname: '',
      serial_number: '',
      price: '',
      discount: '',
      per: '',
      stock: '',
      imageBase64: '',
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
        imageBase64: product.image || '',
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

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct);
  const totalPages = Math.ceil(products.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      <Sidebar />
      <Logout />
      <div className="flex-1 md:ml-64 p-6 pt-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl text-center font-bold text-gray-900 dark:text-gray-100 mb-6">Gift Box Dealers</h2>
          {error && <div className="mb-4 text-red-600 dark:text-red-400 text-sm text-center">{error}</div>}
          {success && <div className="mb-4 text-green-600 dark:text-green-400 text-sm text-center">{success}</div>}
          <div className="mb-6 flex items-center gap-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-gray-100">Product Type</label>
              <input
                type="text"
                value={capitalize(productType)}
                readOnly
                className="mt-2 w-48 rounded-md bg-gray-100 dark:bg-gray-800 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-none"
              />
            </div>
            <button
              onClick={() => openModal()}
              className="mt-7 bg-indigo-600 dark:bg-indigo-500 text-white px-3 py-1.5 rounded-md flex items-center gap-x-2 hover:bg-indigo-700 dark:hover:bg-indigo-600"
            >
              <FaPlus className="h-4 w-4" /> Add Product
            </button>
          </div>
          {currentProducts.length === 0 ? (
            <p className="text-lg text-center text-gray-600 dark:text-gray-400 font-medium">No products found</p>
          ) : (
            <div className="grid mobile:grid-cols-1 onefifty:grid-cols-3 gap-6">
              {currentProducts.map(product => {
                const productKey = `${productType}-${product.id}`;
                return (
                  <div key={productKey} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 hover:shadow-lg transition flex flex-col">
                    <div className="flex justify-center mb-4">
                      {product.image ? (
                        <img src={product.image} alt={product.productname} className="h-24 w-24 object-cover rounded-md" />
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">No image</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">{product.productname}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Serial: {product.serial_number}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Price: ₹{parseFloat(product.price).toFixed(2)}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Discount: {parseFloat(product.discount).toFixed(2)}%</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Stock: {product.stock} {product.per}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <label className="inline-flex items-center">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={toggleStates[productKey] || false}
                            onChange={() => handleToggleChange(product)}
                          />
                          <div className={`w-11 h-6 rounded-full ${toggleStates[productKey] ? 'bg-green-600 dark:bg-green-500' : 'bg-red-600 dark:bg-red-500'}`}>
                            <div className={`w-5 h-5 translate-y-[2px] bg-white dark:bg-gray-200 rounded-full transition-transform ${toggleStates[productKey] ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                          </div>
                        </label>
                      </div>
                    </div>
                    <div className="mt-4 flex justify-between gap-2">
                      <button
                        onClick={() => openViewModal(product)}
                        className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-2 py-1 rounded-md text-sm hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center gap-1"
                      >
                        <FaEye className="h-4 w-4" /> View
                      </button>
                      <button
                        onClick={() => openModal(true, product)}
                        className="flex-1 bg-yellow-600 dark:bg-yellow-500 text-white px-2 py-1 rounded-md text-sm hover:bg-yellow-700 dark:hover:bg-yellow-600 flex items-center justify-center gap-1"
                      >
                        <FaEdit className="h-4 w-4" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(product)}
                        className="flex-1 bg-red-600 dark:bg-red-500 text-white px-2 py-1 rounded-md text-sm hover:bg-red-700 dark:hover:bg-red-600 flex items-center justify-center gap-1"
                      >
                        <FaTrash className="h-4 w-4" /> Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm ${currentPage === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'}`}
              >
                Previous
              </button>
              {[...Array(totalPages).keys()].map(page => (
                <button
                  key={page + 1}
                  onClick={() => handlePageChange(page + 1)}
                  className={`px-3 py-1 rounded-md text-sm ${currentPage === page + 1 ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 border'}`}
                >
                  {page + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm ${currentPage === totalPages ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'}`}
              >
                Next
              </button>
            </div>
          )}
          <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
            key="add-modal"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">Add New Product</h2>
              <FormFields
                isEdit={false}
                formData={formData}
                handleInputChange={handleInputChange}
                handleImageChange={handleImageChange}
                handleSubmit={handleSubmit}
                closeModal={closeModal}
                capitalize={capitalize}
              />
            </div>
          </Modal>
          <Modal
            isOpen={editModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
            key="edit-modal"
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">Edit Product</h2>
              <FormFields
                isEdit={true}
                formData={formData}
                handleInputChange={handleInputChange}
                handleImageChange={handleImageChange}
                handleSubmit={handleSubmit}
                closeModal={closeModal}
                capitalize={capitalize}
              />
            </div>
          </Modal>
          <Modal
            isOpen={viewModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
            key="view-modal"
          >
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">Product Details</h2>
                <div className="space-y-4">
                  <div className="flex justify-center">
                    {selectedProduct.image ? (
                      <img src={selectedProduct.image} alt={selectedProduct.productname} className="h-24 w-24 object-cover rounded-md" />
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400 text-sm">No Image</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    {['product_type', 'serial_number', 'productname', 'price', 'per', 'discount', 'stock', 'status'].map(field => (
                      <div key={field} className="flex">
                        <span className="font-medium text-gray-700 dark:text-gray-300 w-24">{capitalize(field) + ':'}</span>
                        <span className="text-gray-900 dark:text-gray-100">
                          {field === 'product_type' ? capitalize(productType) :
                           field === 'price' ? `₹${parseFloat(selectedProduct[field]).toFixed(2)}` :
                           field === 'discount' ? `${parseFloat(selectedProduct[field]).toFixed(2)}%` :
                           field === 'status' ? capitalize(selectedProduct[field]) : selectedProduct[field]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="rounded-md bg-gray-600 dark:bg-gray-500 px-4 py-2 text-sm text-white hover:bg-gray-700 dark:hover:bg-gray-600"
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