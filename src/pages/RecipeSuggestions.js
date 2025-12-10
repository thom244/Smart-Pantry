import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';
import RecipeImage from '../components/RecipeImage';

function RecipeSuggestions() {
  const [user, setUser] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [matchedRecipes, setMatchedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [minMatchPercentage, setMinMatchPercentage] = useState(50);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchData(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (userId) => {
    try {
      setLoading(true);

      const pantryRef = collection(db, 'users', userId, 'pantry');
      const pantrySnapshot = await getDocs(pantryRef);
      const items = pantrySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPantryItems(items);

      const recipesSnapshot = await getDocs(collection(db, 'recipes'));
      const allRecipes = recipesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecipes(allRecipes);

      matchRecipesWithPantry(allRecipes, items);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ingredient density database (grams per cup)
  // These are approximate values for common ingredients
  const ingredientDensities = {
    // Sugars
    'sugar': 200,
    'white sugar': 200,
    'granulated sugar': 200,
    'brown sugar': 220,
    'powdered sugar': 120,
    'icing sugar': 120,
    'confectioners sugar': 120,

    // Flours
    'flour': 120,
    'all purpose flour': 120,
    'wheat flour': 120,
    'bread flour': 127,
    'cake flour': 114,
    'whole wheat flour': 120,

    // Dairy
    'butter': 227,
    'milk': 245,
    'cream': 240,
    'yogurt': 245,
    'sour cream': 230,

    // Oils & Liquids
    'oil': 220,
    'olive oil': 216,
    'vegetable oil': 220,
    'water': 237,
    'honey': 340,
    'syrup': 340,
    'maple syrup': 320,

    // Grains & Pasta
    'rice': 185,
    'pasta': 100,
    'oats': 80,

    // Nuts & Seeds
    'almonds': 140,
    'walnuts': 100,
    'peanuts': 145,

    // Other Common Ingredients
    'cocoa powder': 85,
    'baking powder': 220,
    'baking soda': 220,
    'salt': 292,
    'vanilla extract': 208,
  };

  // Find density for an ingredient
  const findIngredientDensity = (ingredientName) => {
    if (!ingredientName) return null;

    const normalized = ingredientName.toLowerCase().trim();

    // Direct match
    if (ingredientDensities[normalized]) {
      return ingredientDensities[normalized];
    }

    // Partial match - check if any key is contained in the ingredient name
    for (const [key, density] of Object.entries(ingredientDensities)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return density;
      }
    }

    return null; // No density found
  };

  // Convert units to a common base
  const convertToBaseUnit = (quantity, unit, ingredientName = '') => {
    const qty = parseFloat(quantity) || 0;
    if (qty === 0) return { value: 0, type: 'unknown', originalValue: qty, originalUnit: unit };

    const unitLower = (unit || '').toLowerCase().trim();

    // Volume conversions (to ml)
    const volumeConversions = {
      'ml': 1,
      'l': 1000,
      'liter': 1000,
      'litre': 1000,
      'tsp': 5,
      'teaspoon': 5,
      'tbsp': 15,
      'tablespoon': 15,
      'cup': 240,
      'cups': 240,
      'fl oz': 30,
      'fluid ounce': 30,
      'oz': 30, // assuming fluid oz for liquids
      'pint': 473,
      'quart': 946,
      'gallon': 3785,
    };

    // Weight conversions (to g)
    const weightConversions = {
      'g': 1,
      'gram': 1,
      'grams': 1,
      'kg': 1000,
      'kilogram': 1000,
      'kilograms': 1000,
      'oz': 28.35,
      'ounce': 28.35,
      'ounces': 28.35,
      'lb': 453.59,
      'lbs': 453.59,
      'pound': 453.59,
      'pounds': 453.59,
    };

    // Check volume first
    if (volumeConversions[unitLower] !== undefined) {
      return {
        value: qty * volumeConversions[unitLower],
        type: 'volume',
        originalValue: qty,
        originalUnit: unit
      };
    }

    // Check weight
    if (weightConversions[unitLower] !== undefined) {
      return {
        value: qty * weightConversions[unitLower],
        type: 'weight',
        originalValue: qty,
        originalUnit: unit
      };
    }

    // For pieces, pinches, or unknown units
    return {
      value: qty,
      type: 'count',
      originalValue: qty,
      originalUnit: unit
    };
  };

  // Convert between weight and volume using ingredient density
  const convertCrossType = (fromValue, fromType, toType, ingredientName) => {
    if (fromType === toType) return fromValue;
    if (fromType === 'count' || toType === 'count') return null;

    const density = findIngredientDensity(ingredientName);
    if (!density) return null; // Can't convert without density

    if (fromType === 'volume' && toType === 'weight') {
      // ml to grams: (ml / 240) * density
      // 240ml = 1 cup
      const cups = fromValue / 240;
      return cups * density;
    }

    if (fromType === 'weight' && toType === 'volume') {
      // grams to ml: (grams / density) * 240
      const cups = fromValue / density;
      return cups * 240;
    }

    return null;
  };

  const hasEnoughQuantity = (pantryItem, recipeQuantity, recipeUnit, ingredientName) => {
    // If recipe doesn't specify quantity, just check if ingredient exists
    if (!recipeQuantity || recipeQuantity === '') {
      return { enough: true, status: 'sufficient', message: 'No quantity specified' };
    }

    // If pantry doesn't have quantity specified, assume insufficient for safety
    if (!pantryItem.quantity || pantryItem.quantity === '') {
      return { enough: false, status: 'unknown', message: 'No quantity tracked in pantry' };
    }

    const pantryConverted = convertToBaseUnit(pantryItem.quantity, pantryItem.unit, ingredientName);
    const recipeConverted = convertToBaseUnit(recipeQuantity, recipeUnit, ingredientName);

    // If same type, direct comparison
    if (pantryConverted.type === recipeConverted.type) {
      const hasEnough = pantryConverted.value >= recipeConverted.value;
      const percentage = recipeConverted.value > 0
        ? (pantryConverted.value / recipeConverted.value * 100).toFixed(0)
        : 100;

      return {
        enough: hasEnough,
        status: hasEnough ? 'sufficient' : 'insufficient',
        percentage: parseInt(percentage),
        pantryAmount: `${pantryItem.quantity} ${pantryItem.unit}`,
        neededAmount: `${recipeQuantity} ${recipeUnit}`,
        conversionUsed: false
      };
    }

    // Try cross-type conversion (weight ↔ volume)
    if ((pantryConverted.type === 'volume' && recipeConverted.type === 'weight') ||
      (pantryConverted.type === 'weight' && recipeConverted.type === 'volume')) {

      // Convert pantry to recipe's type
      const convertedPantryValue = convertCrossType(
        pantryConverted.value,
        pantryConverted.type,
        recipeConverted.type,
        ingredientName
      );

      if (convertedPantryValue !== null) {
        const hasEnough = convertedPantryValue >= recipeConverted.value;
        const percentage = recipeConverted.value > 0
          ? (convertedPantryValue / recipeConverted.value * 100).toFixed(0)
          : 100;

        // Calculate equivalent amounts for display
        let equivalentPantryAmount = '';
        if (recipeConverted.type === 'weight') {
          equivalentPantryAmount = `${Math.round(convertedPantryValue)}g`;
        } else {
          equivalentPantryAmount = `${Math.round(convertedPantryValue)}ml`;
        }

        return {
          enough: hasEnough,
          status: hasEnough ? 'sufficient' : 'insufficient',
          percentage: parseInt(percentage),
          pantryAmount: `${pantryItem.quantity} ${pantryItem.unit}`,
          neededAmount: `${recipeQuantity} ${recipeUnit}`,
          conversionUsed: true,
          equivalentAmount: equivalentPantryAmount,
          conversionNote: `≈ ${equivalentPantryAmount} (converted)`
        };
      }
    }

    // Can't convert - assume sufficient if ingredient exists
    return {
      enough: true,
      status: 'incomparable',
      message: 'Different unit types (conversion not available)',
      pantryAmount: `${pantryItem.quantity} ${pantryItem.unit}`,
      neededAmount: `${recipeQuantity} ${recipeUnit}`
    };
  };

  const matchRecipesWithPantry = (allRecipes, pantry) => {
    const normalize = (s) => {
      if (!s || typeof s !== 'string') return '';
      let out = s.trim().toLowerCase();
      out = out.replace(/[^\w\s]/g, '');
      out = out.replace(/\s+/g, ' ');
      if (out.length > 3) {
        if (out.endsWith('es')) out = out.slice(0, -2);
        else if (out.endsWith('s')) out = out.slice(0, -1);
      }
      return out;
    };

    const pantryNorms = pantry.map(item => {
      const name = typeof item === 'string' ? item : (item.name || item.ingredient || '');
      const norm = normalize(name);
      return { raw: item, name: name || '', norm };
    }).filter(p => p.norm);

    const extractIngredientName = (ing) => {
      if (!ing) return '';
      if (typeof ing === 'string') return ing;
      return ing.ingredient || ing.name || ing.item || '';
    };

    const matched = allRecipes.map(recipe => {
      const recipeIngredientsRaw = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];

      const recipeIngredients = recipeIngredientsRaw.map(ing => {
        const name = extractIngredientName(ing) || '';
        const norm = normalize(name);
        const quantity = typeof ing === 'object' ? (ing.quantity || ing.amount || '') : '';
        const unit = typeof ing === 'object' ? (ing.unit || '') : '';
        return { raw: ing, name, norm, quantity, unit };
      }).filter(r => r.name);

      const matchingIngredients = [];
      const missingIngredients = [];
      const insufficientIngredients = [];

      recipeIngredients.forEach(rIng => {
        const ingNorm = rIng.norm;

        const matchedPantryItem = pantryNorms.find(p => {
          if (!p.norm || !ingNorm) return false;
          if (p.norm === ingNorm) return true;
          if (ingNorm.includes(p.norm) || p.norm.includes(ingNorm)) return true;
          const ingTokens = ingNorm.split(' ');
          const pantryTokens = p.norm.split(' ');
          return ingTokens.some(t => pantryTokens.includes(t));
        });

        const display = typeof rIng.raw === 'string'
          ? rIng.raw
          : `${rIng.name}${rIng.quantity ? ' — ' + rIng.quantity + (rIng.unit ? ' ' + rIng.unit : '') : ''}`;

        if (matchedPantryItem) {
          // Check quantity with cross-type conversion support
          const quantityCheck = hasEnoughQuantity(
            matchedPantryItem.raw,
            rIng.quantity,
            rIng.unit,
            rIng.name // Pass ingredient name for density lookup
          );

          if (quantityCheck.enough) {
            matchingIngredients.push({
              display,
              status: quantityCheck.status,
              details: quantityCheck
            });
          } else {
            insufficientIngredients.push({
              display,
              status: 'insufficient',
              details: quantityCheck
            });
          }
        } else {
          missingIngredients.push({
            display,
            status: 'missing'
          });
        }
      });

      const total = recipeIngredients.length || 0;
      const fullyAvailable = matchingIngredients.length;
      const matchPercentage = total > 0 ? Math.round((fullyAvailable / total) * 100) : 0;

      const cookabilityPercentage = total > 0
        ? Math.round(((fullyAvailable + (insufficientIngredients.length * 0.5)) / total) * 100)
        : 0;

      return {
        ...recipe,
        matchPercentage,
        cookabilityPercentage,
        matchingIngredients,
        insufficientIngredients,
        missingIngredients,
        totalIngredients: total,
      };
    });

    const filtered = matched
      .filter(r => r.cookabilityPercentage >= minMatchPercentage)
      .sort((a, b) => {
        if (b.matchPercentage !== a.matchPercentage) {
          return b.matchPercentage - a.matchPercentage;
        }
        return b.cookabilityPercentage - a.cookabilityPercentage;
      });

    setMatchedRecipes(filtered);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (recipes.length > 0 && pantryItems.length > 0) {
      matchRecipesWithPantry(recipes, pantryItems);
    }
  }, [minMatchPercentage]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-300">Finding recipes...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
          Please login to see recipe suggestions
        </h2>
        <Link to="/login" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Login
        </Link>
      </div>
    );
  }

  if (pantryItems.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 min-h-screen bg-white dark:bg-gray-900">
        <h1 className="text-4xl font-bold text-green-700 dark:text-emerald-400 mb-4">Recipe Suggestions</h1>
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 dark:border-yellow-600 p-6 rounded-lg">
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
            Your pantry is empty! Add ingredients to get personalized recipe suggestions.
          </p>
          <Link
            to="/pantry"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Go to Pantry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 min-h-screen bg-white dark:bg-gray-900">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-green-700 dark:text-emerald-400 mb-2">
          🍳 What Can I Cook?
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Based on the {pantryItems.length} ingredient{pantryItems.length !== 1 ? 's' : ''} in your pantry
        </p>
        <p className="text-sm text-blue-600 dark:text-cyan-400 mt-1">
          ✨ Smart unit conversion enabled (weight ↔ volume)
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 border dark:border-gray-700">
        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
          Minimum Match: {minMatchPercentage}%
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="10"
          value={minMatchPercentage}
          onChange={(e) => setMinMatchPercentage(parseInt(e.target.value))}
          className="w-full accent-green-600"
        />
        <div className="flex justify-between text-sm text-gray-500 dark:text-gray-400 mt-2">
          <span>Show all recipes</span>
          <span>Only exact matches</span>
        </div>
      </div>

      {/* Results */}
      {matchedRecipes.length > 0 ? (
        <div className="space-y-6">
          <p className="text-lg text-gray-700 dark:text-gray-300">
            Found <strong>{matchedRecipes.length}</strong> recipe{matchedRecipes.length !== 1 ? 's' : ''} you can make!
          </p>

          <div className="grid grid-cols-1 gap-6">
            {matchedRecipes.map((recipe) => (
              <div
                key={recipe.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition border dark:border-gray-700"
              >
                <div className="md:flex">
                  <div className="md:w-1/3">
                    <Link to={`/recipe/${recipe.id}`}>
                      <RecipeImage recipe={recipe} className="w-full h-64 md:h-full" showBadge={true} />
                    </Link>
                  </div>

                  <div className="p-6 md:w-2/3 flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <Link
                          to={`/recipe/${recipe.id}`}
                          className="text-2xl font-bold text-green-700 dark:text-emerald-400 hover:text-green-800 dark:hover:text-emerald-300"
                        >
                          {recipe.name}
                        </Link>
                        <p className="text-gray-600 dark:text-gray-300 mt-1">{recipe.description}</p>
                      </div>

                      <div className="ml-4 text-center">
                        <div className={`text-4xl font-bold ${recipe.matchPercentage === 100 ? 'text-green-600 dark:text-green-400' :
                          recipe.matchPercentage >= 75 ? 'text-blue-600 dark:text-blue-400' :
                            'text-orange-600 dark:text-orange-400'
                          }`}>
                          {recipe.matchPercentage}%
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">Available</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Fully Available */}
                      <div>
                        <h4 className="font-semibold text-green-700 dark:text-emerald-400 mb-2">
                          ✅ Have Enough ({recipe.matchingIngredients.length})
                        </h4>
                        <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                          {recipe.matchingIngredients.slice(0, 3).map((ing, i) => (
                            <li key={i} className="truncate" title={ing.details.conversionNote || ''}>
                              • {ing.display}
                              {ing.details.conversionUsed && (
                                <span className="text-xs text-blue-600 dark:text-cyan-400 ml-1" title={ing.details.conversionNote}>
                                  🔄
                                </span>
                              )}
                            </li>
                          ))}
                          {recipe.matchingIngredients.length > 3 && (
                            <li className="text-gray-400 dark:text-gray-500">
                              + {recipe.matchingIngredients.length - 3} more
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Insufficient Quantity */}
                      {recipe.insufficientIngredients.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-yellow-700 dark:text-yellow-400 mb-2">
                            ⚠️ Not Enough ({recipe.insufficientIngredients.length})
                          </h4>
                          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            {recipe.insufficientIngredients.slice(0, 3).map((ing, i) => (
                              <li
                                key={i}
                                className="truncate"
                                title={`Have: ${ing.details.pantryAmount}${ing.details.conversionNote ? ' ' + ing.details.conversionNote : ''}, Need: ${ing.details.neededAmount}`}
                              >
                                • {ing.display}
                                <span className="text-xs text-yellow-600 dark:text-amber-400 ml-1">
                                  ({ing.details.percentage}%)
                                  {ing.details.conversionUsed && ' 🔄'}
                                </span>
                              </li>
                            ))}
                            {recipe.insufficientIngredients.length > 3 && (
                              <li className="text-gray-400 dark:text-gray-500">
                                + {recipe.insufficientIngredients.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}

                      {/* Missing */}
                      {recipe.missingIngredients.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                            ❌ Need to Buy ({recipe.missingIngredients.length})
                          </h4>
                          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                            {recipe.missingIngredients.slice(0, 3).map((ing, i) => (
                              <li key={i} className="truncate">• {ing.display}</li>
                            ))}
                            {recipe.missingIngredients.length > 3 && (
                              <li className="text-gray-400 dark:text-gray-500">
                                + {recipe.missingIngredients.length - 3} more
                              </li>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <Link
                        to={`/recipe/${recipe.id}`}
                        className="flex-1 bg-green-600 text-white text-center px-4 py-2 rounded-lg hover:bg-green-700 transition"
                      >
                        View Recipe
                      </Link>
                      {recipe.matchPercentage === 100 && recipe.insufficientIngredients.length === 0 && (
                        <span className="bg-green-100 dark:bg-emerald-900/30 text-green-700 dark:text-emerald-400 px-4 py-2 rounded-lg font-semibold">
                          🎉 Perfect Match!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border dark:border-gray-700">
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-4">
            No recipes match your current pantry at {minMatchPercentage}% or higher.
          </p>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            Try lowering the match percentage or add more ingredients to your pantry.
          </p>
          <Link
            to="/pantry"
            className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
          >
            Manage Pantry
          </Link>
        </div>
      )}
    </div>
  );
}

export default RecipeSuggestions;