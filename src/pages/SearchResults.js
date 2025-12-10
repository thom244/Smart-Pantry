import React, { useEffect, useState } from 'react';
import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link, useLocation } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function SearchResults() {
  const queryParams = useQuery();
  const searchTerm = queryParams.get('q') || '';
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      setLoading(true);
      try {
        const q = query(collection(db, 'recipes'));
        const snapshot = await getDocs(q);
        setRecipes(snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(r => {
            const name = r.name || r.title || '';
            const desc = r.description || '';
            const searchLower = searchTerm.toLowerCase();
            return name.toLowerCase().includes(searchLower) || desc.toLowerCase().includes(searchLower);
          })
        );
      } catch (error) {
        console.error("Error searching recipes:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRecipes();
  }, [searchTerm]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-7xl mx-auto p-6">
        <h2 className="text-3xl font-bold text-green-700 dark:text-emerald-400 mb-2">
          Search Results
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Found {recipes.length} result{recipes.length !== 1 ? 's' : ''} for "<span className="font-semibold text-gray-900 dark:text-white">{searchTerm}</span>"
        </p>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-xl text-gray-600 dark:text-gray-400">Searching...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {recipes.length > 0 ? recipes.map(recipe => (
              <Link
                key={recipe.id}
                to={`/recipe/${recipe.id}`}
                className="bg-white dark:bg-gray-800 shadow-md rounded-xl overflow-hidden hover:shadow-xl transition transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700 flex flex-col h-full"
              >
                {/* Using RecipeImage or fallback if you don't have that component imported yet, 
                     but standardizing on the style used in Profile/RecipeList is best */}
                <div className="h-48 overflow-hidden relative">
                  {recipe.imageUrl ? (
                    <img
                      src={recipe.imageUrl}
                      alt={recipe.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <span className="text-5xl">🍳</span>
                    </div>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-grow">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-1">
                    {recipe.name}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2 mb-4 flex-grow">
                    {recipe.description}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <span className="capitalize bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                      {recipe.category || 'Main'}
                    </span>
                    <span>by {recipe.authorName || 'Chef'}</span>
                  </div>
                </div>
              </Link>
            )) : (
              <div className="col-span-full text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No results found</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  We couldn't find any recipes matching "{searchTerm}". Try a different keyword!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;