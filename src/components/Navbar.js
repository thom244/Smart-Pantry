import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

function Navbar() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Dark mode initialization
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode.toString());

    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setMobileMenuOpen(false);
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
      setMobileMenuOpen(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  if (loading) {
    return (
      <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
          <Link to="/" className="text-2xl font-bold text-coral-500 dark:text-coral-400">
            Smart Pantry
          </Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-50 transition-colors border-b-4 border-transparent" style={{ borderImage: 'linear-gradient(to right, #ff6b6b, #feca57, #48dbfb, #ff9ff3) 1' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-bold text-coral-500 dark:text-coral-400 hover:text-coral-600 dark:hover:text-coral-300 transition"
            onClick={closeMobileMenu}
          >
            🍳 Smart Pantry
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-6">
            <Link to="/" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
              Home
            </Link>
            <Link to="/recipes" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
              Recipes
            </Link>
            {user && (
              <>
                <Link to="/pantry" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
                  My Pantry
                </Link>
                <Link to="/meal-planner" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
                  Meal Planner
                </Link>
                <Link to="/add-recipe" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
                  Create
                </Link>
                <Link to="/import-recipe" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
                  Import
                </Link>
                <Link to="/profile" className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition font-medium">
                  Profile
                </Link>
              </>
            )}

            {/* Search Button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition p-2"
              aria-label="Search"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="text-gray-700 dark:text-gray-200 hover:text-sunny-500 dark:hover:text-yellow-400 transition p-2"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>

            {user ? (
              <div className="flex items-center space-x-4">
                <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                  {user.displayName || user.email?.split('@')[0]}
                </span>
                <button
                  onClick={handleLogout}
                  className="bg-coral-500 hover:bg-coral-600 text-white px-4 py-2 rounded-lg transition font-medium shadow-md"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition px-4 py-2 font-medium"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-gradient-to-r from-coral-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-coral-600 hover:to-pink-600 transition font-medium shadow-md"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Controls */}
          <div className="flex lg:hidden items-center space-x-2">
            {/* Search Button */}
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 transition p-2"
              aria-label="Search"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="text-gray-700 dark:text-gray-200 hover:text-sunny-500 dark:hover:text-yellow-400 transition p-2"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" fillRule="evenodd" clipRule="evenodd"></path>
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path>
                </svg>
              )}
            </button>

            {/* Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 dark:text-gray-200 hover:text-coral-500 dark:hover:text-red-400 transition p-2"
              aria-label="Menu"
            >
              {mobileMenuOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
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
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
              <button
                type="submit"
                className="bg-ocean-500 hover:bg-ocean-600 text-white px-6 py-2 rounded-lg transition font-medium"
              >
                Search
              </button>
            </form>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="flex flex-col space-y-3">
              <Link
                to="/"
                className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                onClick={closeMobileMenu}
              >
                Home
              </Link>
              <Link
                to="/recipes"
                className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                onClick={closeMobileMenu}
              >
                Recipes
              </Link>
              {user && (
                <>
                  <Link
                    to="/pantry"
                    className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    My Pantry
                  </Link>
                  <Link
                    to="/meal-planner"
                    className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    Meal Planner
                  </Link>
                  <Link
                    to="/add-recipe"
                    className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    Create Recipe
                  </Link>
                  <Link
                    to="/import-recipe"
                    className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    Import Recipe
                  </Link>
                  <Link
                    to="/profile"
                    className="text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    Profile
                  </Link>

                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-3">
                    <div className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                      Signed in as <span className="font-semibold text-gray-900 dark:text-white">{user.displayName || user.email?.split('@')[0]}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left text-coral-600 dark:text-red-400 hover:bg-coral-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    >
                      Logout
                    </button>
                  </div>
                </>
              )}

              {!user && (
                <div className="flex flex-col space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/login"
                    className="text-center text-gray-700 dark:text-gray-200 hover:text-ocean-500 dark:hover:text-cyan-400 hover:bg-ocean-50 dark:hover:bg-gray-700 transition px-4 py-2 rounded-lg font-medium"
                    onClick={closeMobileMenu}
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="text-center bg-gradient-to-r from-coral-500 to-pink-500 text-white px-4 py-2 rounded-lg hover:from-coral-600 hover:to-pink-600 transition font-medium"
                    onClick={closeMobileMenu}
                  >
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navbar;