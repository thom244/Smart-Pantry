import React, { useState } from 'react';

const RecipeImage = ({ recipe, className = "w-full h-48", showBadge = false }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

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
    const cat = category?.toLowerCase() || '';
    return emojis[cat] || '🍳';
  };

  // Rainbow color palette for categories
  const getCategoryColor = (category) => {
    const cat = category?.toLowerCase() || '';
    const colors = {
      breakfast: 'from-sunny-400 to-sunny-600 dark:from-sunny-500 dark:to-sunny-700',
      lunch: 'from-ocean-400 to-ocean-600 dark:from-ocean-500 dark:to-ocean-700',
      dinner: 'from-berry-400 to-berry-600 dark:from-berry-500 dark:to-berry-700',
      dessert: 'from-coral-400 to-coral-600 dark:from-coral-500 dark:to-coral-700',
      snack: 'from-mint-400 to-mint-600 dark:from-mint-500 dark:to-mint-600',
      main: 'from-coral-400 to-berry-500 dark:from-coral-500 dark:to-berry-600',
      side: 'from-ocean-400 to-mint-500 dark:from-ocean-500 dark:to-mint-600'
    };
    return colors[cat] || 'from-coral-400 to-sunny-500 dark:from-coral-500 dark:to-sunny-600';
  };



  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Actual image - only rendered when there's a URL and no error */}
      {recipe?.imageUrl && !imageError && (
        <img
          src={recipe.imageUrl}
          alt={recipe.name || 'Recipe'}
          className={`w-full h-full object-cover absolute inset-0 z-10 ${imageLoaded ? 'opacity-100' : 'opacity-0'} transition-opacity duration-300`}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      )}

      {/* Fallback placeholder - always rendered as background */}
      <div
        className={`w-full h-full bg-gradient-to-br ${getCategoryColor(recipe?.category)} flex items-center justify-center`}
      >
        <span className="text-7xl drop-shadow-lg">{getImagePlaceholder(recipe?.category)}</span>
      </div>

      {showBadge && recipe?.isRemix && (
        <span className="absolute top-2 right-2 bg-gradient-to-r from-ocean-500 to-mint-500 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg z-20">
          Remix
        </span>
      )}
    </div>
  );
};

export default RecipeImage;