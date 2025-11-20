import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  if (loading) {
    return (
      <nav className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-green-600">
            Smart Pantry
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-green-600 hover:text-green-800 transition">
            🍳 Smart Pantry
          </Link>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 hover:text-green-600 transition">
              Home
            </Link>
            <Link to="/recipes" className="text-gray-700 hover:text-green-600 transition">
              Recipes
            </Link>
            {user && (
              <>
                <Link to="/pantry" className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition">
                  My Pantry
                </Link>
                <Link to="/meal-planner" className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition">
                  Meal Planner
                </Link>
                <Link to="/recipe/new" className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition">
                  Create
                </Link>
                <Link to="/import-recipe" className="text-gray-700 dark:text-gray-200 hover:text-green-600 transition">
                  Import Recipe
                </Link>
                <Link to="/profile" className="text-gray-700 dark:text-gray-200 hover:text-green-600 dark:hover:text-green-400 transition">
                  Profile
                </Link>
              </>
            )}
            
            {/* Search Button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-700 hover:text-green-600 transition"
            >
              🔍
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 text-sm">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link 
                  to="/login" 
                  className="text-gray-700 hover:text-green-600 transition px-4 py-2"
                >
                  Login
                </Link>
                <Link 
                  to="/register" 
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-700 hover:text-green-600"
            >
              🔍
            </button>
          </div>
        </div>

        {/* Search Bar (appears when toggled) */}
        {showSearch && (
          <div className="pb-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600"
                autoFocus
              />
              <button
                type="submit"
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Search
              </button>
            </form>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;