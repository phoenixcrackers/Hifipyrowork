import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { API_BASE_URL } from '../Config';
import { API_BASE_URL_loc } from '../Config';
import './App.css';

const Login = () => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    companyname: '',
    licencenumber: '',
    address: '',
    state: '',
    district: '',
    mobile_number: '',
    email: ''
  });
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  const styles = {
    card: { 
      background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(224,242,254,0.3), rgba(186,230,253,0.2))', 
      backdropFilter: 'blur(20px)', 
      border: '1px solid rgba(2,132,199,0.3)', 
      boxShadow: '0 25px 45px rgba(2,132,199,0.1), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(2,132,199,0.1)' 
    },
    button: { 
      background: 'linear-gradient(135deg, rgba(2,132,199,0.9), rgba(14,165,233,0.95))', 
      backdropFilter: 'blur(15px)', 
      border: '1px solid rgba(125,211,252,0.4)', 
      boxShadow: '0 15px 35px rgba(2,132,199,0.3), inset 0 1px 0 rgba(255,255,255,0.2)' 
    },
    input: { 
      background: 'linear-gradient(135deg, rgba(255,255,255,0.8), rgba(240,249,255,0.6))', 
      backdropFilter: 'blur(10px)', 
      border: '1px solid rgba(2,132,199,0.3)' 
    },
    inputContainer: {
      position: 'relative'
    },
    eyeIcon: {
      position: 'absolute',
      right: '10px',
      top: '50%',
      transform: 'translateY(-50%)',
      cursor: 'pointer',
      color: '#0284c7'
    }
  };

  useEffect(() => {
    // Fetch states
    fetch(`${API_BASE_URL_loc}/api/locations/states`)
      .then(res => res.json())
      .then(data => setStates(data))
      .catch(err => {
        setError('Failed to fetch states');
        setShowError(true);
        setTimeout(() => setShowError(false), 5000);
      });
  }, []);

  useEffect(() => {
    if (formData.state) {
      fetch(`${API_BASE_URL_loc}/api/locations/states/${encodeURIComponent(formData.state)}/districts`)
        .then(res => res.json())
        .then(data => setDistricts(data))
        .catch(err => {
          setError('Failed to fetch districts');
          setShowError(true);
          setTimeout(() => setShowError(false), 5000);
        });
    } else {
      setDistricts([]);
    }
  }, [formData.state]);

  const handleInputChange = (key, value) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegister ? 'register' : 'login';
      const body = isRegister ? formData : { username: formData.username, password: formData.password };
      
      const res = await fetch(`${API_BASE_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || `Failed to ${isRegister ? 'register' : 'login'}`);
      }

      // Store username in localStorage
      localStorage.setItem('username', data.user.username);
      
      // Redirect to booking page
      navigate('/booking');
    } catch (err) {
      setError(err.message);
      setShowError(true);
      setTimeout(() => setShowError(false), 5000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-4">
      {showError && (
        <motion.div 
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-red-500 dark:bg-red-700 text-white dark:text-gray-100 text-lg font-semibold rounded-xl py-4 px-6 max-w-md text-center shadow-lg"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          {error}
        </motion.div>
      )}
      <motion.div 
        className="w-full max-w-2xl p-6 rounded-xl"
        style={styles.card}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <h2 className="text-2xl font-bold text-sky-800 dark:text-sky-300 mb-6 text-center">
          {isRegister ? 'Register' : 'Login'}
        </h2>
        <div className="mb-4 text-center">
          <button 
            onClick={() => setIsRegister(!isRegister)}
            className="text-sky-600 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300"
          >
            {isRegister ? 'Already have an account? Login' : 'Need an account? Register'}
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={isRegister ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {[
              { label: 'Username', key: 'username', type: 'text', required: true },
              { label: 'Password', key: 'password', type: showPassword ? 'text' : 'password', required: true, hasEyeIcon: true },
              ...(isRegister ? [
                { label: 'Company Name', key: 'companyname', type: 'text', required: true },
                { label: 'License Number', key: 'licencenumber', type: 'text' },
                { label: 'Address', key: 'address', type: 'textarea', required: true },
                { label: 'State', key: 'state', type: 'select', options: states, required: true },
                { label: 'District', key: 'district', type: 'select', options: districts, required: true, disabled: !formData.state },
                { label: 'Mobile Number', key: 'mobile_number', type: 'text', required: true },
                { label: 'Email', key: 'email', type: 'email', required: true }
              ] : [])
            ].map(({ label, key, type, placeholder = `Enter ${label.toLowerCase()}`, required, options, disabled, hasEyeIcon }) => (
              <div key={key} className={type === 'textarea' && isRegister ? 'md:col-span-2' : ''}>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-100">{label} {required && '*'}</label>
                <div style={hasEyeIcon ? styles.inputContainer : {}}>
                  {type === 'select' ? (
                    <select 
                      value={formData[key]} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      className="w-full p-2 rounded-md mt-1" 
                      style={styles.input} 
                      required={required} 
                      disabled={disabled}
                    >
                      <option value="">Select {label}</option>
                      {options.map(opt => (
                        <option key={opt.id || opt.name} value={opt.name}>{opt.name}</option>
                      ))}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea 
                      value={formData[key]} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      placeholder={placeholder} 
                      className="w-full p-2 rounded-md mt-1" 
                      style={styles.input} 
                      required={required} 
                    />
                  ) : (
                    <input 
                      type={type} 
                      value={formData[key]} 
                      onChange={e => handleInputChange(key, e.target.value)} 
                      placeholder={placeholder} 
                      className="w-full p-2 rounded-md mt-1" 
                      style={styles.input} 
                      required={required} 
                    />
                  )}
                  {hasEyeIcon && (
                    <span 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={styles.eyeIcon}
                    >
                      {showPassword ? <FaEyeSlash /> : <FaEye />}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <button 
              type="submit" 
              className="flex-1 text-white text-sm font-semibold py-3 rounded-xl" 
              style={styles.button}
            >
              {isRegister ? 'Register' : 'Login'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;