import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AiOutlineEye, AiOutlineEyeInvisible } from 'react-icons/ai';
import { API_BASE_URL } from '../../Config';

export default function Admin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      localStorage.setItem('username', data.username);
      
      navigate('/dealers');

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:px-8 bg-gray-100 dark:bg-gray-900">
        <div className="sm:mx-auto sm:w-full sm:max-w-sm">
          <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-gray-100">Login</h2>
        </div>

        <div className=" sm:mx-auto sm:w-full sm:max-w-sm">
          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm text-center mb-4">{error}</div>
          )}
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">Username</label>
              <div className="mt-2">
                <input 
                  type="text" 
                  name="username" 
                  id="username" 
                  autoComplete="username" 
                  required 
                  className="block w-full rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm/6"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm/6 font-medium text-gray-900 dark:text-gray-100">Password</label>
              </div>
              <div className="mt-2 relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  id="password" 
                  autoComplete="current-password" 
                  required 
                  className="block w-full rounded-md bg-white dark:bg-gray-800 px-3 py-1.5 text-base text-gray-900 dark:text-gray-100 outline-1 -outline-offset-1 outline-gray-300 dark:outline-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:focus:outline-indigo-500 sm:text-sm/6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute cursor-pointer inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <AiOutlineEyeInvisible className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  ) : (
                    <AiOutlineEye className="h-5 w-5 text-gray-400 dark:text-gray-500" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <button 
                type="submit" 
                className="flex cursor-pointer w-full justify-center rounded-md bg-indigo-600 dark:bg-indigo-700 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 dark:hover:bg-indigo-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 dark:focus-visible:outline-indigo-500"
              >
                Sign in
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}