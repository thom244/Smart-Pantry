import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email');
      } else if (err.code === 'auth/wrong-password') {
        setError('Incorrect password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError('Failed to login. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-white to-blue-50 p-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 max-w-6xl w-full shadow-2xl rounded-3xl overflow-hidden bg-white">
        {/* Left Side - Decorative */}
        <div className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-green-500 to-green-700 p-12 text-white">
          <div className="space-y-8 text-center">
            <div className="text-8xl animate-bounce">🍳</div>
            <h2 className="text-4xl font-bold">Welcome Back!</h2>
            <p className="text-xl opacity-90">
              Your culinary journey continues here
            </p>
            <div className="flex gap-4 justify-center text-6xl">
              <span className="animate-pulse">🥗</span>
              <span className="animate-pulse" style={{animationDelay: '0.2s'}}>🍕</span>
              <span className="animate-pulse" style={{animationDelay: '0.4s'}}>🍰</span>
            </div>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 md:p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h2 className="text-4xl font-bold text-gray-800 mb-2">Login</h2>
            <p className="text-gray-600">Sign in to access your recipes</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Email Address
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-600 transition"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full border-2 border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:border-green-600 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 rounded-xl hover:from-green-700 hover:to-green-800 transition font-semibold text-lg shadow-lg disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-green-600 hover:text-green-700 font-semibold">
                Create one now
              </Link>
            </p>
          </div>

          {/* Quick Links */}
          <div className="mt-6 flex justify-center gap-4 text-sm">
            <Link to="/" className="text-gray-500 hover:text-green-600 transition">
              Back to Home
            </Link>
            <span className="text-gray-300">•</span>
            <Link to="/recipes" className="text-gray-500 hover:text-green-600 transition">
              Browse Recipes
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;