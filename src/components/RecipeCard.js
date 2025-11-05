import React from 'react';
import { Link } from 'react-router-dom';

const RecipeCard = ({ recipe }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
      {recipe.image ? (
        <img 
          src={recipe.image} 
          alt={recipe.name} 
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-green-400 to-green-600 dark:from-green-700 dark:to-green-900 flex items-center justify-center">
          <span className="text-6xl">🍽️</span>
        </div>
      )}
      <div className="p-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {recipe.name}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {recipe.description}
        </p>
        <Link 
          to={`/recipe/${recipe.id}`}
          className="inline-flex items-center text-green-600 dark:text-green-500 font-semibold hover:text-green-700 dark:hover:text-green-400"
        >
          View Recipe →
        </Link>
      </div>
    </div>
  );
};

export default RecipeCard;
