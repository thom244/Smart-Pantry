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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8 w-full max-w-md border border-gray-100 dark:border-gray-700">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-coral-500 via-sunny-400 to-ocean-500 bg-clip-text text-transparent">Create Account</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Join Smart Pantry today!</p>
        </div>

        {error && (
          <div className="bg-coral-50 dark:bg-coral-900/30 border border-coral-200 dark:border-coral-800 text-coral-700 dark:text-coral-400 px-4 py-3 rounded-lg mb-4">
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              required
            />
          </div>

          {/* Profile Picture URL (Optional) */}
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
              Profile Picture URL (optional)
            </label>
            <input
              type="url"
              placeholder="https://example.com/photo.jpg"
              value={photoURL}
              onChange={e => setPhotoURL(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Leave empty for an automatic avatar based on your name
            </p>
            {(photoURL || name) && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={photoURL || getDefaultAvatar(name)}
                  alt="Preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-ocean-500"
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
            className="w-full bg-gradient-to-r from-coral-500 to-pink-500 text-white px-4 py-3 rounded-lg hover:from-coral-600 hover:to-pink-600 transition font-semibold disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        <p className="text-gray-600 dark:text-gray-400 mt-6 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-ocean-500 dark:text-cyan-400 hover:text-ocean-600 dark:hover:text-cyan-300 font-semibold">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;