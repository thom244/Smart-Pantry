import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import RecipeImage from '../components/RecipeImage';

function Home() {
  const [user, setUser] = useState(null);
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [stats, setStats] = useState({ recipes: 0, users: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Get top recipes
      const recipesQuery = query(
        collection(db, 'recipes'),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const recipesSnapshot = await getDocs(recipesQuery);
      setFeaturedRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Get stats
      const allRecipesSnapshot = await getDocs(collection(db, 'recipes'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setStats({
        recipes: allRecipesSnapshot.size,
        users: usersSnapshot.size
      });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-gray-100 leading-tight">
                Cook Smarter with
                <span className="text-green-600 dark:text-green-500"> Smart Pantry</span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Discover delicious recipes, track your ingredients, and never wonder "what's for dinner?" again.
              </p>
              <div className="flex flex-wrap gap-4">    
                {user ? (
                  <>
                    <Link
                      to="/recipes"
                      className="bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold text-lg"
                    >
                      Browse Recipes 🍽️
                    </Link>
                    <Link
                      to="/pantry"
                      className="bg-white dark:bg-gray-800 text-green-600 dark:text-green-500 border-2 border-green-600 dark:border-green-500 px-8 py-4 rounded-xl hover:bg-green-50 dark:hover:bg-gray-700 transition shadow-lg font-semibold text-lg"
            >
              My Pantry 🥘
            </Link>
                  </>
                ) : (
                  <>
                    <Link
                      to="/register"
                      className="bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-1 font-semibold text-lg"
                    >
                      Get Started Free
                    </Link>
                    <Link
                      to="/recipes"
                      className="bg-white text-green-600 border-2 border-green-600 px-8 py-4 rounded-xl hover:bg-green-50 transition shadow-lg font-semibold text-lg"
                    >
                      Explore Recipes
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="hidden lg:flex justify-center items-center">
              <div className="relative">
                <div className="w-96 h-96 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-2xl">
                  <span className="text-9xl">🍳</span>
                </div>
                <div className="absolute -top-8 -right-8 w-32 h-32 bg-yellow-400 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                  <span className="text-5xl">🥗</span>
                </div>
                <div className="absolute -bottom-4 -left-8 w-28 h-28 bg-red-400 rounded-full flex items-center justify-center shadow-xl animate-pulse">
                  <span className="text-4xl">🍕</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Why Choose Smart Pantry?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Everything you need to make cooking easier and more enjoyable
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-400 dark:to-green-300 p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
              <div className="text-6xl mb-4">🥘</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Track Your Pantry
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Keep track of what ingredients you have at home. Never buy duplicates or forget what's in your kitchen.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-400 dark:to-blue-300 p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Smart Suggestions
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Get recipe recommendations based on what you already have. Cook with confidence using your pantry items.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-400 dark:to-purple-300 p-8 rounded-2xl shadow-lg hover:shadow-xl transition transform hover:-translate-y-2">
              <div className="text-6xl mb-4">🎨</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Create & Remix
              </h3>
              <p className="text-gray-600 dark:text-gray-300">
                Share your recipes or remix others' creations. Build a personalized cookbook that grows with you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Recipes */}
      {featuredRecipes.length > 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Recently Added Recipes
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Check out what the community is cooking
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {featuredRecipes.map(recipe => (
                <Link
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition transform hover:-translate-y-2"
                >
                  <RecipeImage recipe={recipe} className="w-full h-48" showBadge={true} />
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                      {recipe.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex justify-between items-center text-sm text-gray-500">
                      <span>by {recipe.authorName || recipe.author?.split('@')[0]}</span>
                      <span className="text-green-600 font-semibold">View →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            <div className="text-center mt-12">
              <Link
                to="/recipes"
                className="inline-block bg-green-600 text-white px-8 py-4 rounded-xl hover:bg-green-700 transition shadow-lg font-semibold text-lg"
              >
                View All Recipes
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center text-white">
            <div>
              <div className="text-6xl font-bold mb-2">{stats.recipes}+</div>
              <div className="text-2xl">Delicious Recipes</div>
            </div>
            <div>
              <div className="text-6xl font-bold mb-2">{stats.users}+</div>
              <div className="text-2xl">Happy Cooks</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Ready to Start Cooking Smarter?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
              Join our community of home cooks and discover your next favorite recipe
            </p>
            <Link
              to="/register"
              className="inline-block bg-green-600 text-white px-12 py-5 rounded-xl hover:bg-green-700 transition shadow-xl hover:shadow-2xl transform hover:-translate-y-1 font-bold text-xl"
            >
              Sign Up Now - It's Free! 🎉
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}

export default Home;