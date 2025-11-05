import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs } from 'firebase/firestore';
import RecipeImage from '../components/RecipeImage';

function Favorites() {
  const [user, setUser] = useState(null);
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchFavorites(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchFavorites = async (userId) => {
    try {
      setLoading(true);
      const allRecipesSnapshot = await getDocs(collection(db, 'recipes'));
      const favorites = allRecipesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(recipe => recipe.favoritedBy?.includes(userId));
      setFavoriteRecipes(favorites);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-gray-600">Loading favorites...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Please login to view favorites
        </h2>
        <Link to="/login" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-red-600 dark:text-red-500 mb-2">
          ❤️ My Favorite Recipes
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {favoriteRecipes.length} recipe{favoriteRecipes.length !== 1 ? 's' : ''} saved
        </p>
      </div>

      {favoriteRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteRecipes.map(recipe => (
            <Link
              key={recipe.id}
              to={`/recipe/${recipe.id}`}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1"
            >
              <RecipeImage recipe={recipe} className="w-full h-48" showBadge={true} />
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                  {recipe.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-3">
                  {recipe.description}
                </p>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400">
                    by {recipe.authorName || recipe.author?.split('@')[0]}
                  </span>
                  <span className="text-red-500 dark:text-red-400 font-semibold">❤️</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="text-6xl mb-4">💔</div>
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            You haven't favorited any recipes yet
          </p>
          <Link
            to="/recipes"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Discover Recipes
          </Link>
        </div>
      )}
    </div>
  );
}

export default Favorites;