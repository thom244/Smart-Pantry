import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import RecipeImage from '../components/RecipeImage';

function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Guest Data
  const [featuredRecipes, setFeaturedRecipes] = useState([]);
  const [stats, setStats] = useState({ recipes: 0, users: 0 });

  // Dashboard Data (Logged In)
  const [myRecipes, setMyRecipes] = useState([]);
  const [pantryCount, setPantryCount] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const [allRecipes, setAllRecipes] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchDashboardData(currentUser);
      } else {
        fetchGuestData();
      }
      setLoading(false);
      if (currentUser) {
        fetchDashboardData(currentUser);
      } else {
        fetchGuestData();
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Helper: Sort recipes to show images first
  const sortRecipesByImage = (recipes) => {
    return recipes.sort((a, b) => {
      if (a.imageUrl && !b.imageUrl) return -1;
      if (!a.imageUrl && b.imageUrl) return 1;
      return 0;
    });
  };

  const fetchGuestData = async () => {
    try {
      const recipesQuery = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'), limit(3));
      const recipesSnapshot = await getDocs(recipesQuery);
      setFeaturedRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      const allRecipesSnapshot = await getDocs(collection(db, 'recipes'));
      const usersSnapshot = await getDocs(collection(db, 'users'));
      setStats({ recipes: allRecipesSnapshot.size, users: usersSnapshot.size });
    } catch (error) {
      console.error('Error fetching guest data:', error);
    }
  };

  const fetchDashboardData = async (currentUser) => {
    try {
      // Fetch ALL recipes
      const allRecipesQuery = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
      const allRecipesSnap = await getDocs(allRecipesQuery);
      const allRawRecipes = allRecipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Filter and sort
      const myFilteredRecipes = allRawRecipes.filter(recipe => recipe.authorId === currentUser.uid);
      const favoriteFilteredRecipes = allRawRecipes.filter(recipe => recipe.favoritedBy?.includes(currentUser.uid));
      const allSortedRecipes = sortRecipesByImage(allRawRecipes);

      setMyRecipes(myFilteredRecipes);
      setFavorites(favoriteFilteredRecipes);
      setAllRecipes(allSortedRecipes);

      // Pantry Count
      const pantrySnap = await getDocs(collection(db, 'users', currentUser.uid, 'pantry'));
      setPantryCount(pantrySnap.size);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      console.error('Error fetching dashboard data:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-green-600 text-xl font-bold animate-pulse">Loading Chef's Kitchen...</div>
      </div>
    );
  }

  // ==================================================================================
  // VIEW 1: USER DASHBOARD (Logged In)
  // ==================================================================================
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">

        {/* Compact Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 dark:from-green-700 dark:to-green-800 px-4 py-8 shadow-lg">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-2">
              <h1 className="text-3xl font-bold text-white">
                Welcome back, {user.displayName?.split(' ')[0] || 'Chef'}! 👋
              </h1>
              <Link to="/pantry" className="bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-lg transition flex items-center gap-2">
                <span className="text-lg">🥕</span>
                <span className="font-semibold">{pantryCount} items</span>
              </Link>
            </div>
            <p className="text-green-50">Let's cook something delicious today!</p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-8 space-y-10">

          {/* SECTION 1: ALL RECIPES */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-3xl">🍽️</span>
                All Recipes
              </h2>
              <Link
                to="/recipes"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold flex items-center gap-1 transition"
              >
                View More
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {allRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {allRecipes.slice(0, 4).map(recipe => (
                  <Link
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group transform hover:-translate-y-1"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <RecipeImage
                        recipe={recipe}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-bold text-white text-lg drop-shadow-lg line-clamp-2">
                          {recipe.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <span>🏷️</span>
                          {recipe.category || 'Main'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <span>⏱️</span>
                          {recipe.prepTime || '30m'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-500 dark:text-gray-400">No recipes yet. Be the first to add one!</p>
              </div>
            )}
          </section>

          {/* SECTION 2: MY RECIPES */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-3xl">📖</span>
                My Recipes
              </h2>
              <Link
                to="/profile"
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold flex items-center gap-1 transition"
              >
                View More
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {myRecipes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {myRecipes.slice(0, 4).map(recipe => (
                  <Link
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group transform hover:-translate-y-1"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <RecipeImage
                        recipe={recipe}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
                      <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                        MINE
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-bold text-white text-lg drop-shadow-lg line-clamp-2">
                          {recipe.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <span>🏷️</span>
                          {recipe.category || 'Main'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <span>⏱️</span>
                          {recipe.prepTime || '30m'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-500 dark:text-gray-400 mb-3">Your cookbook is empty</p>
                <Link
                  to="/add-recipe"
                  className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition"
                >
                  Create Your First Recipe
                </Link>
              </div>
            )}
          </section>

          {/* SECTION 3: FAVORITES */}
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-3xl">❤️</span>
                Favorites
              </h2>
              <Link
                to="/profile"
                // ADD THIS LINE BELOW:
                state={{ activeTab: 'favorites' }}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold flex items-center gap-1 transition"
              >
                View More
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            {favorites.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {favorites.slice(0, 4).map(recipe => (
                  <Link
                    key={recipe.id}
                    to={`/recipe/${recipe.id}`}
                    className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group transform hover:-translate-y-1"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <RecipeImage
                        recipe={recipe}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0"></div>
                      <div className="absolute top-3 right-3 bg-red-500 text-white p-2 rounded-full shadow-lg">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <h3 className="font-bold text-white text-lg drop-shadow-lg line-clamp-2">
                          {recipe.name}
                        </h3>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <span>🏷️</span>
                          {recipe.category || 'Main'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <span>⏱️</span>
                          {recipe.prepTime || '30m'}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-500 dark:text-gray-400">No favorites yet. Start exploring recipes!</p>
              </div>
            )}
          </section>

          {/* SECTION 4: QUICK ACTIONS */}
          <section className="pb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <span className="text-3xl">⚡</span>
              Quick Actions
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
              <Link
                to="/add-recipe"
                className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">➕</div>
                <div className="font-bold text-lg">Add Recipe</div>
                <div className="text-sm text-green-100">Create new dish</div>
              </Link>

              <Link
                to="/import-recipe"
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">📸</div>
                <div className="font-bold text-lg">Import Recipe</div>
                <div className="text-sm text-blue-100">Scan or type</div>
              </Link>

              <Link
                to="/chatbot"
                className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">🤖</div>
                <div className="font-bold text-lg">AI Chef</div>
                <div className="text-sm text-purple-100">Get suggestions</div>
              </Link>

              <Link
                to="/meal-planner"
                className="bg-gradient-to-br from-pink-500 to-pink-600 hover:from-orange-600 hover:to-orange-700 text-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="text-4xl mb-3">📅</div>
                <div className="font-bold text-lg">Meal Planner</div>
                <div className="text-sm text-orange-100">Plan your week</div>
              </Link>
            </div>
          </section>

        </div>
      </div>
    );
  }

  // ==================================================================================
  // VIEW 2: GUEST LANDING PAGE (Unchanged)
  // ==================================================================================
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-green-600 text-xl font-bold animate-pulse">Loading Chef's Kitchen...</div>
      </div>
    );
  }

  // ==================================================================================
  // VIEW 1: USER DASHBOARD (Logged In)
  // ==================================================================================
  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">

        {/* Compact Header */}
        <div className="bg-white dark:bg-gray-800 px-4 py-6 shadow-sm border-b border-gray-100 dark:border-gray-700 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <div>
              <p className="text-xs font-bold text-green-600 uppercase tracking-wider mb-0.5">Kitchen Dashboard</p>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hello, {user.displayName?.split(' ')[0] || 'Chef'}! 👨‍🍳</h1>
            </div>
            <div className="bg-green-100 dark:bg-green-900/30 px-3 py-1 rounded-full">
              <span className="text-sm font-bold text-green-700 dark:text-green-400">{pantryCount} items in pantry</span>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-6 space-y-8">

          {/* SECTION 1: ALL RECIPES (Horizontal Scroll) */}
          <section>
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                🍽️ All Recipes
              </h2>
              <Link to="/recipes" className="text-sm font-semibold text-green-600 hover:text-green-700">View All</Link>
            </div>
            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 space-x-4 snap-x scroll-smooth no-scrollbar">
              {allRecipes.slice(0, 10).map(recipe => (
                <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="min-w-[260px] md:min-w-[300px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden snap-start group relative">
                  <div className="h-32 relative">
                    <RecipeImage recipe={recipe} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-gray-900 dark:text-white truncate">{recipe.name}</h3>
                    <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{recipe.category || 'Main'}</span>
                      <span>{recipe.prepTime || '30m'}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION 2: MY RECIPES (Horizontal Scroll) */}
          <section>
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                📖 My Cookbook
              </h2>
              <Link to="/profile" className="text-sm font-semibold text-green-600 hover:text-green-700">View All</Link>
            </div>

            {myRecipes.length > 0 ? (
              <div className="flex overflow-x-auto pb-4 -mx-4 px-4 space-x-4 snap-x scroll-smooth no-scrollbar">
                {/* Add New Button (First item) */}
                <Link to="/add-recipe" className="min-w-[140px] md:min-w-[160px] h-48 flex flex-col items-center justify-center bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-gray-400 hover:border-green-500 hover:text-green-500 transition snap-start">
                  <span className="text-3xl mb-2">+</span>
                  <span className="text-sm font-bold">Add New</span>
                </Link>

                {/* Recipe Cards */}
                {myRecipes.slice(0, 9).map(recipe => (
                  <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="min-w-[260px] md:min-w-[300px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden snap-start group relative">
                    <div className="h-32 relative">
                      <RecipeImage recipe={recipe} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-60"></div>
                    </div>
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">{recipe.name}</h3>
                      <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{recipe.category || 'Main'}</span>
                        <span>{recipe.prepTime || '30m'}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 text-center border border-dashed border-gray-300 dark:border-gray-600">
                <p className="text-gray-500 mb-2">Your cookbook is empty.</p>
                <Link to="/add-recipe" className="text-green-600 font-bold hover:underline">Create your first recipe</Link>
              </div>
            )}
          </section>

          {/* SECTION 3: FAVORITES (Horizontal Scroll) */}
          <section>
            <div className="flex justify-between items-center mb-3 px-1">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                ❤️ Your Favorites
              </h2>
              <Link to="/profile" className="text-sm font-semibold text-green-600 hover:text-green-700">View All</Link>
            </div>

            <div className="flex overflow-x-auto pb-4 -mx-4 px-4 space-x-4 snap-x scroll-smooth no-scrollbar">
              {favorites.slice(0, 10).map(recipe => (
                <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="min-w-[200px] md:min-w-[240px] bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden snap-start">
                  <div className="h-28 relative">
                    <RecipeImage recipe={recipe} className="w-full h-full object-cover" />
                    {/* Heart Icon Overlay */}
                    <div className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full shadow-sm">
                      <svg className="w-3 h-3 text-red-500 fill-current" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white truncate">{recipe.name}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{recipe.description}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* SECTION 4: QUICK ACTIONS (Grid at bottom) */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 px-1">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-4">
              <Link to="/import-recipe" className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-center gap-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition border border-blue-100 dark:border-blue-800">
                <span className="text-2xl">📸</span>
                <div className="text-left">
                  <div className="font-bold text-blue-900 dark:text-blue-100">Import</div>
                  <div className="text-xs text-blue-600 dark:text-blue-300">Scan Photo</div>
                </div>
              </Link>

              <Link to="/chatbot" className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl flex items-center gap-3 hover:bg-purple-100 dark:hover:bg-purple-900/30 transition border border-purple-100 dark:border-purple-800">
                <span className="text-2xl">🤖</span>
                <div className="text-left">
                  <div className="font-bold text-purple-900 dark:text-purple-100">AI Chef</div>
                  <div className="text-xs text-purple-600 dark:text-purple-300">Ask Ideas</div>
                </div>
              </Link>

              <Link to="/pantry" className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-2xl flex items-center gap-3 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition border border-orange-100 dark:border-orange-800">
                <span className="text-2xl">🥕</span>
                <div className="text-left">
                  <div className="font-bold text-orange-900 dark:text-orange-100">Pantry</div>
                  <div className="text-xs text-orange-600 dark:text-orange-300">Update Items</div>
                </div>
              </Link>

              <Link to="/meal-planner" className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl flex items-center gap-3 hover:bg-green-100 dark:hover:bg-green-900/30 transition border border-green-100 dark:border-green-800">
                <span className="text-2xl">📅</span>
                <div className="text-left">
                  <div className="font-bold text-green-900 dark:text-green-100">Planner</div>
                  <div className="text-xs text-green-600 dark:text-green-300">Weekly Plan</div>
                </div>
              </Link>
            </div>
          </section>

        </div>
      </div>
    );
  }

  // ==================================================================================
  // VIEW 2: GUEST LANDING PAGE (Your Original Style)
  // ==================================================================================
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