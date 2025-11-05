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

  const getImagePlaceholder = (category) => {
    const emojis = {
      breakfast: '🥞',
      lunch: '🥗',
      dinner: '🍽️',
      dessert: '🍰',
      snack: '🍿',
      main: '🍲',
      side: '🥘'
    };
    return emojis[category] || '🍳';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-gray-600">Loading recipes...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h2 className="text-4xl font-bold text-green-700 dark:text-green-500 mb-6">All Recipes</h2>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 min-w-48"
          >
            <option value="all">All Categories</option>
            <option value="breakfast">Breakfast</option>
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
            <option value="dessert">Dessert</option>
            <option value="snack">Snack</option>
            <option value="main">Main Course</option>
            <option value="side">Side Dish</option>
          </select>
        </div>

        <p className="text-gray-600">
          Showing {filteredRecipes.length} of {recipes.length} recipes
        </p>
      </div>

      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg mb-4">
            {searchTerm || categoryFilter !== "all" 
              ? "No recipes found matching your criteria." 
              : "No recipes available yet."}
          </p>
          <Link 
            to="/recipe/new" 
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Create the First Recipe
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1"
            >
              {/* Recipe Image */}
              <div className="h-48 relative overflow-hidden">
                {recipe.imageUrl ? (
                  <img 
                    src={recipe.imageUrl} 
                    alt={recipe.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 dark:from-green-700 dark:to-green-900 flex items-center justify-center">
                    <span className="text-7xl">{getImagePlaceholder(recipe.category)}</span>
                  </div>
                )}
                {recipe.isRemix && (
                  <span className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                    Remix
                  </span>
                )}
              </div>
              
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 line-clamp-2">
                  {recipe.name || recipe.title}
                </h3>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                  {recipe.description}
                </p>

                {/* Recipe Info */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                  <span className="capitalize bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                    {recipe.category || 'Main'}
                  </span>
                  {recipe.prepTime && (
                    <span className="flex items-center">
                      <span className="mr-1">⏱️</span> {recipe.prepTime}
                    </span>
                  )}
                  {recipe.servings && (
                    <span className="flex items-center">
                      <span className="mr-1">👥</span> {recipe.servings}
                    </span>
                  )}
                </div>

                {/* Rating and Author */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center">
                    <span className="text-yellow-500 dark:text-yellow-300 mr-1">★</span>
                    <span className="text-sm text-gray-700 dark:text-gray-300 font-semibold">
                      {getAverageRating(recipe.ratings) || 'New'}
                    </span>
                    {recipe.ratings && recipe.ratings.length > 0 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                        ({recipe.ratings.length})
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    by {recipe.authorName || recipe.author?.split('@')[0] || 'Anonymous'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecipeList;