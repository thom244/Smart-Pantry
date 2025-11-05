import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase/config';
import { Link, useLocation } from 'react-router-dom';

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function SearchResults() {
  const queryParams = useQuery();
  const searchTerm = queryParams.get('q') || '';
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    const fetchRecipes = async () => {
      const q = query(collection(db, 'recipes'));
      const snapshot = await getDocs(q);
      setRecipes(snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(r => {
            const name = r.name || r.title || '';
            return name.toLowerCase().includes(searchTerm.toLowerCase());
            })
        );
    };
    fetchRecipes();
  }, [searchTerm]);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h2 className="text-3xl font-bold text-green-700 mb-6">
        Search Results for "{searchTerm}"
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recipes.length > 0 ? recipes.map(recipe => (
          <Link key={recipe.id} to={`/recipe/${recipe.id}`} className="bg-white shadow-md rounded-lg p-4 hover:shadow-xl transition">
            <h3 className="text-xl font-semibold mb-2">{recipe.name}</h3>
            <p className="text-gray-600 text-sm">{recipe.description}</p>
          </Link>
        )) : (
          <p className="text-gray-500 col-span-full">No recipes found.</p>
        )}
      </div>
    </div>
  );
}

export default SearchResults;
