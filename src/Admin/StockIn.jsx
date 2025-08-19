import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import Sidebar from './Sidebar/Sidebar';
import { API_BASE_URL } from '../../Config';
import { FaPlus, FaEye } from 'react-icons/fa';
import Logout from './Logout';

Modal.setAppElement('#root');

export default function StockIn() {
  const [products, setProducts] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [viewModalIsOpen, setViewModalIsOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [stockHistory, setStockHistory] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [addStockData, setAddStockData] = useState({ quantity: '' });
  const [currentPage, setCurrentPage] = useState(1);
  const productType = 'gift_box_dealers';
  const productsPerPage = 10;

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch products');
      setProducts([...data].sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStockHistory = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${productId}/stock-history`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch stock history');
      setStockHistory(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
    const intervalId = setInterval(fetchProducts, 6000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/gift-box-products/${selectedProduct.id}/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(addStockData.quantity) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to add stock');
      setSuccess('Stock added successfully!');
      setAddStockData({ quantity: '' });
      fetchProducts();
      setModalIsOpen(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAddStockData(prev => ({ ...prev, [name]: value }));
  };

  const openModal = (product) => {
    setSelectedProduct(product);
    setModalIsOpen(true);
  };

  const openViewModal = (product) => {
    setSelectedProduct(product);
    setViewModalIsOpen(true);
    fetchStockHistory(product.id);
  };

  const closeModal = () => {
    setModalIsOpen(false);
    setViewModalIsOpen(false);
    setSelectedProduct(null);
    setError('');
    setSuccess('');
    setStockHistory([]);
  };

  const indexOfLastProduct = currentPage * productsPerPage;
  const indexOfFirstProduct = indexOfLastProduct - productsPerPage;
  const currentProducts = products.slice(indexOfFirstProduct, indexOfLastProduct).sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true }));
  const totalPages = Math.ceil(products.length / productsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo(0, 0);
  };

  return (
    <div className="flex min-h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <Logout />
      <div className="flex-1 hundred:ml-64 onefifty:ml-1 p-6 pt-16 overflow-hidden">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl text-center font-bold text-gray-900 dark:text-gray-100 mb-6">Stock In - Gift Box Dealers</h2>
          {error && <div className="mb-4 text-red-600 dark:text-red-300 text-sm text-center">{error}</div>}
          {success && <div className="mb-4 text-green-600 dark:text-green-300 text-sm text-center">{success}</div>}
          {currentProducts.length === 0 ? (
            <p className="text-lg text-center text-gray-600 dark:text-gray-400 font-medium">
              No products found
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentProducts.map((product) => (
                <div
                  key={`${productType}-${product.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-600"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-100">Serial Number:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{product.serial_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-100">Product Name:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{product.productname}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-100">Stock:</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100">{product.stock}</span>
                    </div>
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => openModal(product)}
                        className="flex items-center px-3 py-1 text-sm text-white bg-indigo-600 dark:bg-indigo-500 rounded-md hover:bg-indigo-700 dark:hover:bg-indigo-600 transition duration-200"
                      >
                        <FaPlus className="mr-1 h-4 w-4" />
                        Add
                      </button>
                      <button
                        onClick={() => openViewModal(product)}
                        className="flex items-center px-3 py-1 text-sm text-white bg-gray-600 dark:bg-gray-500 rounded-md hover:bg-gray-700 dark:hover:bg-gray-600 transition duration-200"
                      >
                        <FaEye className="mr-1 h-4 w-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center items-center space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === 1 ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-400 cursor-not-allowed' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'}`}
              >
                Previous
              </button>
              {[...Array(totalPages).keys()].map((page) => (
                <button
                  key={page + 1}
                  onClick={() => handlePageChange(page + 1)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === page + 1 ? 'bg-indigo-600 dark:bg-indigo-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600'}`}
                >
                  {page + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm font-medium ${currentPage === totalPages ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-400 cursor-not-allowed' : 'bg-indigo-600 dark:bg-indigo-500 text-white hover:bg-indigo-700 dark:hover:bg-indigo-600'}`}
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
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-xl">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-6 text-center">
                Add Stock for {selectedProduct?.productname}
              </h2>
              <form onSubmit={handleAddStockSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-100">Quantity to Add</label>
                  <input
                    type="number"
                    name="quantity"
                    value={addStockData.quantity}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-2 border-gray-100 px-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-indigo-600 dark:focus:ring-indigo-500 transition duration-150 ease-in-out"
                    required
                    min="1"
                    placeholder="Enter quantity to add"
                  />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-md bg-gray-600 dark:bg-gray-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 dark:hover:bg-gray-600 transition duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-indigo-600 dark:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 dark:hover:bg-indigo-600 transition duration-200"
                  >
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </Modal>
          <Modal
            isOpen={viewModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4"
            overlayClassName="fixed inset-0 bg-black/50 dark:bg-black/40"
          >
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-lg w-full shadow-xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
                  Stock History for {selectedProduct.productname}
                </h2>
                {stockHistory.length === 0 ? (
                  <p className="text-center text-gray-600 dark:text-gray-400">No stock addition history found</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                      <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase">
                            Quantity Added
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-100 uppercase">
                            Added At
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                        {stockHistory.map((history) => (
                          <tr key={history.id}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {history.quantity_added}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                              {new Date(history.added_at).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="rounded-md bg-gray-600 dark:bg-gray-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-700 dark:hover:bg-gray-600 transition duration-200"
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