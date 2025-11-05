import React from 'react';

const RecipeImage = ({ recipe, className = "w-full h-48", showBadge = false }) => {
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

  const getCategoryColor = (category) => {
    const colors = {
  breakfast: 'from-yellow-400 to-orange-500 dark:from-yellow-400 dark:to-orange-500',
  lunch: 'from-green-400 to-green-600 dark:from-green-500 dark:to-green-300',
  dinner: 'from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-300',
  dessert: 'from-pink-400 to-pink-600 dark:from-pink-500 dark:to-pink-300',
  snack: 'from-purple-400 to-purple-600 dark:from-purple-500 dark:to-purple-300',
  main: 'from-red-400 to-red-600 dark:from-red-500 dark:to-red-300',
  side: 'from-teal-400 to-teal-600 dark:from-teal-500 dark:to-teal-300'
    };
    return colors[category] || 'from-green-400 to-green-600 dark:from-green-700 dark:to-green-900';
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {recipe.imageUrl ? (
        <img 
          src={recipe.imageUrl} 
          alt={recipe.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            // If image fails to load, show placeholder
            e.target.style.display = 'none';
            e.target.nextElementSibling.style.display = 'flex';
          }}
        />
      ) : null}
      
      {/* Fallback placeholder - shown if no imageUrl or if image fails to load */}
      <div 
        className={`w-full h-full bg-gradient-to-br ${getCategoryColor(recipe.category)} flex items-center justify-center ${recipe.imageUrl ? 'hidden' : 'flex'}`}
        style={{ display: recipe.imageUrl ? 'none' : 'flex' }}
      >
        <span className="text-7xl">{getImagePlaceholder(recipe.category)}</span>
      </div>

      {showBadge && recipe.isRemix && (
  <span className="absolute top-2 right-2 bg-blue-500 dark:bg-blue-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
          Remix
        </span>
      )}
    </div>
  );
};

export default RecipeImage;