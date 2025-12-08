import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import RecipeImage from '../components/RecipeImage';
import { useNavigate, Link, useLocation } from 'react-router-dom';

function Profile() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userRecipes, setUserRecipes] = useState([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('recipes');
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  
  useEffect(() => {
    if (location.state && location.state.activeTab) {
      setActiveTab(location.state.activeTab);
    }
  }, [location]);

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
      const remixesQuery = query(
        collection(db, 'recipes'),
        where('originalRecipeId', '==', recipeId)
      );
      const remixesSnapshot = await getDocs(remixesQuery);
      const remixes = remixesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (remixes.length > 0) {
        const firstRemix = remixes[0];
        
        for (let i = 1; i < remixes.length; i++) {
          const remixRef = doc(db, 'recipes', remixes[i].id);
          await updateDoc(remixRef, {
            originalRecipeId: firstRemix.id
          });
        }

        const firstRemixRef = doc(db, 'recipes', firstRemix.id);
        await updateDoc(firstRemixRef, {
          isRemix: false,
          originalRecipeId: null
        });

        alert(`Recipe deleted. "${firstRemix.name}" is now the main recipe with ${remixes.length - 1} remix(es).`);
      }

      await deleteDoc(doc(db, 'recipes', recipeId));
      fetchUserData(user.uid);
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe. Please try again.');
    }
  };

  const toggleDescription = (recipeId) => {
    setExpandedDescriptions(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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
    <div className="dark:bg-gray-900 mx-auto p-6">
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
                <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden flex flex-col h-[420px]">
                  <Link to={`/recipe/${recipe.id}`}>
                    <RecipeImage recipe={recipe} className="w-full h-48 object-cover" showBadge={true} />
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <Link to={`/recipe/${recipe.id}`}>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 hover:text-green-600 dark:hover:text-green-500 line-clamp-2 min-h-[3.5rem]">
                        {recipe.name}
                      </h3>
                    </Link>
                    <div className="flex-1 mb-3">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {expandedDescriptions[recipe.id] 
                          ? recipe.description 
                          : truncateText(recipe.description, 100)}
                      </p>
                      {recipe.description && recipe.description.length > 100 && (
                        <button
                          onClick={() => toggleDescription(recipe.id)}
                          className="text-green-600 dark:text-green-500 text-sm mt-1 hover:underline"
                        >
                          {expandedDescriptions[recipe.id] ? 'Read less' : 'Read more'}
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2 mt-auto">
                      <Link
                        to={`/recipe/${recipe.id}`}
                        className="flex-1 bg-green-600 text-white text-center px-4 py-2 rounded-lg hover:bg-green-700 transition text-sm"
                      >
                        View
                      </Link>
                      <Link
                        to={`/recipe/edit/${recipe.id}`}
                        className="flex-1 bg-blue-500 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-600 transition text-sm"
                      >
                        Edit
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
                <div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition flex flex-col h-[400px]">
                  <Link to={`/recipe/${recipe.id}`}>
                    <RecipeImage recipe={recipe} className="w-full h-48 object-cover" showBadge={true} />
                  </Link>
                  <div className="p-4 flex flex-col flex-1">
                    <Link to={`/recipe/${recipe.id}`}>
                      <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2 hover:text-green-600 dark:hover:text-green-500 line-clamp-2 min-h-[3.5rem]">
                        {recipe.name}
                      </h3>
                    </Link>
                    <div className="flex-1">
                      <p className="text-gray-600 dark:text-gray-400 text-sm">
                        {expandedDescriptions[recipe.id] 
                          ? recipe.description 
                          : truncateText(recipe.description, 100)}
                      </p>
                      {recipe.description && recipe.description.length > 100 && (
                        <button
                          onClick={() => toggleDescription(recipe.id)}
                          className="text-green-600 dark:text-green-500 text-sm mt-1 hover:underline"
                        >
                          {expandedDescriptions[recipe.id] ? 'Read less' : 'Read more'}
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                      by {recipe.author?.split('@')[0]}
                    </p>
                  </div>
                </div>
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