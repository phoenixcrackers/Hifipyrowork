import React, { useState, useEffect, useMemo } from 'react';
import Modal from 'react-modal';
import Sidebar from './Sidebar/Sidebar';
import { API_BASE_URL } from '../../Config';
import { FaPlus, FaEye, FaSearch, FaWarehouse, FaHistory, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  const productType = 'gift_box_dealers';
  const productsPerPage = 9;

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hifi/gift-box-products`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch products');
      setProducts([...data].sort((a, b) => (a.serial_number || "").localeCompare(b.serial_number || "", undefined, { numeric: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchStockHistory = async (productId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/hifi/gift-box-products/${productId}/stock-history`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch stock history');
      setStockHistory(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchProducts();
    const intervalId = setInterval(fetchProducts, 8000);
    return () => clearInterval(intervalId);
  }, []);

  const handleAddStockSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const response = await fetch(`${API_BASE_URL}/api/hifi/gift-box-products/${selectedProduct.id}/add-stock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: parseInt(addStockData.quantity) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to add stock');
      setSuccess(`Added ${addStockData.quantity} units to ${selectedProduct.productname} successfully!`);
      setAddStockData({ quantity: '' });
      fetchProducts();
      setModalIsOpen(false);
      setTimeout(() => setSuccess(''), 4000);
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

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (p.productname && p.productname.toLowerCase().includes(q)) ||
        (p.serial_number && p.serial_number.toLowerCase().includes(q));

      const stockNum = Number(p.stock) || 0;
      let matchesFilter = true;
      if (filterType === 'low') matchesFilter = stockNum > 0 && stockNum <= 10;
      if (filterType === 'out') matchesFilter = stockNum <= 0;
      if (filterType === 'in') matchesFilter = stockNum > 10;

      return matchesSearch && matchesFilter;
    });
  }, [products, searchQuery, filterType]);

  const stats = useMemo(() => {
    const total = products.length;
    const inStock = products.filter(p => Number(p.stock) > 10).length;
    const lowStock = products.filter(p => Number(p.stock) > 0 && Number(p.stock) <= 10).length;
    const outOfStock = products.filter(p => Number(p.stock) <= 0).length;
    return { total, inStock, lowStock, outOfStock };
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

          {/* Header Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700/80 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
                  Stock Replenishment (Stock In)
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Add incoming production batches, restock products, and view transaction history
                </p>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-gray-100 dark:border-gray-700">
              <div className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl">
                <span className="text-xs text-gray-500 font-medium">Total Products</span>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Healthy Stock (&gt; 10)</span>
                <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{stats.inStock}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-100 dark:border-amber-800/40">
                <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">Low Stock (&le; 10)</span>
                <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{stats.lowStock}</p>
              </div>
              <div className="bg-rose-50 dark:bg-rose-950/30 p-3 rounded-xl border border-rose-100 dark:border-rose-800/40">
                <span className="text-xs text-rose-700 dark:text-rose-400 font-medium">Out of Stock (0)</span>
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
                placeholder="Search by product name or serial number..."
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
              {[
                { id: 'all', label: 'All' },
                { id: 'low', label: 'Low Stock' },
                { id: 'out', label: 'Out of Stock' },
                { id: 'in', label: 'In Stock' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setFilterType(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    filterType === tab.id
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Products Grid */}
          {currentProducts.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <FaWarehouse className="w-12 h-12 text-gray-400 mx-auto mb-3 opacity-50" />
              <p className="text-base font-semibold text-gray-600 dark:text-gray-300">No products match your filter criteria</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setFilterType('all');
                }}
                className="mt-2 text-sm text-blue-600 font-bold underline"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {currentProducts.map((product) => {
                const stockNum = Number(product.stock) || 0;
                const isOutOfStock = stockNum <= 0;
                const isLowStock = stockNum > 0 && stockNum <= 10;

                return (
                  <div
                    key={product.id}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-md border border-gray-200/80 dark:border-gray-700/80 p-5 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className="text-xs font-mono font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-md">
                          #{product.serial_number}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                            isOutOfStock
                              ? 'bg-rose-50 text-rose-600 border-rose-200'
                              : isLowStock
                              ? 'bg-amber-50 text-amber-600 border-amber-200'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOutOfStock ? 'bg-rose-500' : isLowStock ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Available'}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-1 mb-1">
                        {product.productname}
                      </h3>
                      <p className="text-xs text-gray-500 mb-3">Unit: {product.per || 'box'}</p>

                      {/* Stock Highlight Box */}
                      <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800 text-center">
                        <span className="text-xs text-gray-400 font-medium">Current Stock</span>
                        <div className={`text-3xl font-extrabold mt-0.5 ${
                          isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'
                        }`}>
                          {stockNum}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openModal(product)}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-sm"
                      >
                        <FaPlus className="text-xs" /> Add Stock
                      </button>
                      <button
                        onClick={() => openViewModal(product)}
                        className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition"
                      >
                        <FaHistory className="text-xs" /> History Log
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

          {/* Add Stock Modal */}
          <Modal
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">
                  Add Stock
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-6">
                  {selectedProduct.productname} (#{selectedProduct.serial_number}) &bull; Currently: <strong>{selectedProduct.stock}</strong> in stock
                </p>

                <form onSubmit={handleAddStockSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1">
                      Units to Add
                    </label>
                    <input
                      type="number"
                      name="quantity"
                      value={addStockData.quantity}
                      onChange={handleInputChange}
                      min="1"
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={closeModal}
                      className="px-4 py-2 text-xs font-semibold rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 shadow-md"
                    >
                      Confirm Stock In
                    </button>
                  </div>
                </form>
              </div>
            )}
          </Modal>

          {/* View Stock History Modal */}
          <Modal
            isOpen={viewModalIsOpen}
            onRequestClose={closeModal}
            className="fixed inset-0 flex items-center justify-center p-4 z-[9999]"
            overlayClassName="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9998]"
          >
            {selectedProduct && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-lg w-full max-h-[85vh] flex flex-col shadow-2xl">
                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Stock History</h2>
                    <p className="text-xs text-gray-500">{selectedProduct.productname} (#{selectedProduct.serial_number})</p>
                  </div>
                  <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">×</button>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {stockHistory.length === 0 ? (
                    <p className="text-center py-8 text-gray-400 text-sm">No stock replenishment records found.</p>
                  ) : (
                    <div className="space-y-2">
                      {stockHistory.map((item) => (
                        <div key={item.id} className="bg-gray-50 dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                              +{item.quantity} Units
                            </span>
                            <p className="text-gray-400 text-[11px] mt-0.5">
                              {new Date(item.created_at).toLocaleString('en-GB')}
                            </p>
                          </div>
                          <span className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-mono px-2 py-0.5 rounded text-[11px]">
                            Log #{item.id}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-5 py-2 rounded-xl text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300"
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