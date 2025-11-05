import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { useNavigate, Link } from 'react-router-dom';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import RecipeImage from '../components/RecipeImage';

function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recipes'); // 'recipes' or 'favorites'

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserData(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      
      // Fetch user's recipes
      const recipesQuery = query(
        collection(db, 'recipes'),
        where('authorId', '==', userId)
      );
      const recipesSnapshot = await getDocs(recipesQuery);
      const recipes = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUserRecipes(recipes);

      // Fetch favorited recipes
      const allRecipesSnapshot = await getDocs(collection(db, 'recipes'));
      const favorites = allRecipesSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(recipe => recipe.favoritedBy?.includes(userId));
      setFavoriteRecipes(favorites);

    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteRecipe = async (recipeId, recipeName) => {
    if (!window.confirm(`Are you sure you want to delete "${recipeName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Check if there are remixes of this recipe
      const remixesQuery = query(
        collection(db, 'recipes'),
        where('originalRecipeId', '==', recipeId)
      );
      const remixesSnapshot = await getDocs(remixesQuery);
      const remixes = remixesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (remixes.length > 0) {
        // There are remixes - promote the first one
        const firstRemix = remixes[0];
        
        // Update remaining remixes to point to the first remix as the new original
        for (let i = 1; i < remixes.length; i++) {
          const remixRef = doc(db, 'recipes', remixes[i].id);
          await updateDoc(remixRef, {
            originalRecipeId: firstRemix.id
          });
        }

        // Remove the isRemix flag from first remix (it's now the main recipe)
        const firstRemixRef = doc(db, 'recipes', firstRemix.id);
        await updateDoc(firstRemixRef, {
          isRemix: false,
          originalRecipeId: null
        });

        alert(`Recipe deleted. "${firstRemix.name}" is now the main recipe with ${remixes.length - 1} remix(es).`);
      }

      // Delete the original recipe
      await deleteDoc(doc(db, 'recipes', recipeId));
      
      // Refresh the recipes list
      fetchUserData(user.uid);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-gray-600">Loading profile...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Please login to view your profile
        </h2>
        <Link to="/login" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-md p-8 mb-6">
        <div className="flex items-center gap-6">
          <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random&size=200`}
            alt={user.displayName || 'User'}
            className="w-24 h-24 rounded-full object-cover border-4 border-green-500 dark:border-green-600"
            onError={(e) => {
              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email)}&background=random&size=200`;
            }}
          />
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-300">
              {user.displayName || 'User'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">{user.email}</p>
            <div className="flex gap-4 mt-4 text-sm">
              <div className="bg-green-50 dark:bg-green-800 px-4 py-2 rounded-lg">
                <span className="font-semibold text-green-700 dark:text-green-200">{userRecipes.length}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">Recipes</span>
              </div>
              <div className="bg-blue-50 dark:bg-blue-700 px-4 py-2 rounded-lg">
                <span className="font-semibold text-blue-700 dark:text-blue-200">{favoriteRecipes.length}</span>
                <span className="text-gray-600 dark:text-gray-400 ml-1">Favorites</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('recipes')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'recipes'
              ? 'bg-green-600 dark:bg-green-700 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          My Recipes ({userRecipes.length})
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`px-6 py-3 rounded-lg font-semibold transition ${
            activeTab === 'favorites'
              ? 'bg-green-600 dark:bg-green-700 text-white'
              : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          Favorites ({favoriteRecipes.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'recipes' && (
        <div>
          {userRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userRecipes.map(recipe => (
                <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
                  <Link to={`/recipe/${recipe.id}`}>
                    <RecipeImage recipe={recipe} className="w-full h-48" showBadge={true} />
                  </Link>
                  <div className="p-4">
                    <Link to={`/recipe/${recipe.id}`}>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 hover:text-green-600 dark:hover:text-green-500">
                        {recipe.name}
                      </h3>
                    </Link>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                      {recipe.description}
                    </p>
                    <div className="flex gap-2">
                      <Link
                        to={`/recipe/${recipe.id}`}
                        className="flex-1 bg-green-600 text-white text-center px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">You haven't created any recipes yet</p>
              <Link
                to="/recipe/new"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                Create Your First Recipe
              </Link>
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div>
          {favoriteRecipes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favoriteRecipes.map(recipe => (
                <Link
                  key={recipe.id}
                  to={`/recipe/${recipe.id}`}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition"
                >
                  <RecipeImage recipe={recipe} className="w-full h-48" showBadge={true} />
                  <div className="p-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                      {recipe.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                      {recipe.description}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      by {recipe.author?.split('@')[0]}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">You haven't favorited any recipes yet</p>
              <Link
                to="/recipes"
                className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
              >
                Browse Recipes
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Profile;