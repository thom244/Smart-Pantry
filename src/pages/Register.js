import React, { useState } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const getDefaultAvatar = (name) => {
    // Generate a colorful avatar URL based on name
    const initial = name.charAt(0).toUpperCase();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setLoading(true);
      
      // Create user account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Set display name and photo
      const avatarURL = photoURL || getDefaultAvatar(name);
      await updateProfile(userCredential.user, {
        displayName: name,
        photoURL: avatarURL
      });

      // Create user document in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name,
        email: email,
        photoURL: avatarURL,
        role: 'user',
        createdAt: serverTimestamp(),
        banned: false
      });

      navigate('/');
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'auth/email-already-in-use') {
        setError('This email is already registered');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-green-100 dark:from-green-300 dark:to-green-100 p-4">
      <div className="bg-white dark:bg-gray-900 shadow-xl rounded-2xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-300">Create Account</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Join Smart Pantry today!</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-300 border border-red-200 dark:border-red-400 text-red-700 dark:text-red-900 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

  <form className="space-y-4" onSubmit={handleSubmit}>
          {/* Name */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
              Full Name *
            </label>
            <input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
              Email Address *
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
              Password *
            </label>
            <input
              type="password"
              placeholder="Min 6 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
              Confirm Password *
            </label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-300 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Profile Picture URL (Optional) */}
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Profile Picture URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={photoURL}
              onChange={e => setPhotoURL(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for an automatic avatar based on your name
            </p>
            {(photoURL || name) && (
              <div className="mt-3 flex items-center gap-3">
                <img 
                  src={photoURL || getDefaultAvatar(name)} 
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-green-500"
                  onError={(e) => {
                    e.target.src = getDefaultAvatar(name || 'User');
                  }}
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Preview</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition font-semibold disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-gray-600 dark:text-gray-400 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-green-600 dark:text-green-300 hover:underline font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;