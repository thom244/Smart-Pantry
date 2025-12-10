import React, { useEffect, useState } from "react";
import { db } from "../firebase/config";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { Link } from "react-router-dom";
import RecipeImage from './RecipeImage';

const RecipeList = () => {
  const [recipes, setRecipes] = useState([]);
  const [filteredRecipes, setFilteredRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchRecipes();
  }, []);

  const filterRecipes = React.useCallback(() => {
    let filtered = recipes;

    if (categoryFilter !== "all") {
      filtered = filtered.filter(recipe => recipe.category === categoryFilter);
    }

    if (searchTerm) {
      filtered = filtered.filter(recipe =>
        recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredRecipes(filtered);
  }, [recipes, categoryFilter, searchTerm]);

  useEffect(() => {
    filterRecipes();
  }, [recipes, categoryFilter, searchTerm, filterRecipes]);

  const fetchRecipes = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "recipes"), orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);
      const recipesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setRecipes(recipesData);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  const getAverageRating = (ratings) => {
    if (!ratings || ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return (sum / ratings.length).toFixed(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-coral-500 dark:border-coral-400 mb-4"></div>
          <div className="text-xl text-gray-600 dark:text-gray-400 font-semibold">Loading recipes...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 py-8 pb-24 transition-colors">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-coral-500 via-sunny-400 to-ocean-500 bg-clip-text text-transparent mb-2">
            All Recipes
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Discover delicious recipes from our community
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            {/* Search Input */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search recipes by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 focus:border-transparent transition"
              />
            </div>

            {/* Category Filter */}
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full md:w-auto pl-4 pr-10 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 dark:focus:ring-ocean-400 focus:border-transparent appearance-none cursor-pointer transition min-w-[200px]"
              >
                <option value="all">All Categories</option>
                <option value="breakfast">🥞 Breakfast</option>
                <option value="lunch">🥗 Lunch</option>
                <option value="dinner">🍽️ Dinner</option>
                <option value="dessert">🍰 Dessert</option>
                <option value="snack">🍿 Snack</option>
                <option value="main">🍲 Main Course</option>
                <option value="side">🥘 Side Dish</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="h-5 w-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Results Count */}
          <div className="flex items-center justify-between text-sm">
            <p className="text-gray-600 dark:text-gray-400">
              Showing <span className="font-semibold text-gray-900 dark:text-white">{filteredRecipes.length}</span> of <span className="font-semibold text-gray-900 dark:text-white">{recipes.length}</span> recipes
            </p>
            {(searchTerm || categoryFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                }}
                className="text-ocean-500 dark:text-cyan-400 hover:text-ocean-600 dark:hover:text-cyan-300 font-medium transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Results */}
        {filteredRecipes.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="text-6xl mb-4">🍳</div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {searchTerm || categoryFilter !== "all"
                ? "No recipes found"
                : "No recipes yet"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {searchTerm || categoryFilter !== "all"
                ? "Try adjusting your search criteria or explore other categories."
                : "Be the first to share a delicious recipe with the community!"}
            </p>
            {!searchTerm && categoryFilter === "all" && (
              <Link
                to="/add-recipe"
                className="inline-block bg-gradient-to-r from-coral-500 to-pink-500 hover:from-coral-600 hover:to-pink-600 text-white px-8 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              >
                Create First Recipe
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                className="bg-white dark:bg-gray-800 shadow-md hover:shadow-xl rounded-xl overflow-hidden transition-all transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700 group"
              >
                {/* Recipe Image */}
                <div className="h-48 relative overflow-hidden">
                  <RecipeImage
                    recipe={recipe}
                    className="w-full h-48 group-hover:scale-110 transition-transform duration-300"
                    showBadge={true}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 pointer-events-none"></div>

                  {/* Badges */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    {recipe.isRemix && (
                      <span className="bg-blue-500 dark:bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                        Remix
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-coral-500 dark:group-hover:text-coral-400 transition">
                    {recipe.name || recipe.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                    {recipe.description || "No description available"}
                  </p>

                  {/* Recipe Info Tags */}
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <span className="capitalize bg-coral-100 dark:bg-coral-900/30 text-coral-600 dark:text-coral-400 px-3 py-1 rounded-full font-medium">
                      {recipe.category || 'Main'}
                    </span>
                    {recipe.prepTime && (
                      <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        <span className="mr-1">⏱️</span> {recipe.prepTime}
                      </span>
                    )}
                    {recipe.servings && (
                      <span className="flex items-center bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                        <span className="mr-1">👥</span> {recipe.servings}
                      </span>
                    )}
                  </div>

                  {/* Rating and Author */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center">
                      <span className="text-yellow-500 dark:text-yellow-400 mr-1 text-lg">★</span>
                      <span className="text-sm text-gray-900 dark:text-white font-semibold">
                        {getAverageRating(recipe.ratings) || 'New'}
                      </span>
                      {recipe.ratings && recipe.ratings.length > 0 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                          ({recipe.ratings.length})
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                      by {recipe.authorName || recipe.author?.split('@')[0] || 'Anonymous'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RecipeList;