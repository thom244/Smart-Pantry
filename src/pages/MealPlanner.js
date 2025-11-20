import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import RecipeImage from '../components/RecipeImage';

const CATEGORY_TO_MEALTYPE = {
  breakfast: ["Breakfast"],
  lunch: ["Lunch"],
  dinner: ["Dinner"],
  dessert: ["Dinner", "Snack"],
  snack: ["Snack"],
  main: ["Lunch", "Dinner"],
  side: ["Lunch", "Dinner"]
};

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

const UNIT_CONVERSIONS = {
  g: { kg: 0.001 },
  kg: { g: 1000 },
  ml: { l: 0.001 },
  l: { ml: 1000 },
  cup: { g: 200 },
  tbsp: { g: 15 },
  tsp: { g: 5 }
};

const convertUnit = (quantity, fromUnit, toUnit) => {
  if (!quantity || !fromUnit || !toUnit) return quantity;
  if (fromUnit === toUnit) return quantity;
  if (UNIT_CONVERSIONS[fromUnit]?.[toUnit]) return quantity * UNIT_CONVERSIONS[fromUnit][toUnit];
  if (UNIT_CONVERSIONS[toUnit]?.[fromUnit]) return quantity / UNIT_CONVERSIONS[toUnit][fromUnit];
  return quantity;
};

const MEAL_EMOJIS = {
  Breakfast: '🌅',
  Lunch: '☀️',
  Dinner: '🌙',
  Snack: '🍪'
};

function MealPlanner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [shoppingList, setShoppingList] = useState([]);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const navigate = useNavigate();

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
    setLoading(true);
    try {
      const mealPlanDoc = await getDoc(doc(db, 'users', userId, 'mealPlans', 'current'));
      if (mealPlanDoc.exists()) {
        setMealPlan(ensureMealPlanStructure(mealPlanDoc.data().plan || {}));
      } else {
        setMealPlan(ensureMealPlanStructure({}));
      }

      const recipesSnapshot = await getDocs(
        query(collection(db, 'recipes'), orderBy('createdAt', 'desc'), limit(200))
      );
      setRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const ensureMealPlanStructure = (plan = {}) => {
    const structured = { ...plan };
    DAYS_OF_WEEK.forEach(day => {
      if (!structured[day]) structured[day] = {};
      MEAL_TYPES.forEach(meal => {
        if (!structured[day][meal]) structured[day][meal] = [];
      });
    });
    return structured;
  };

  const saveMealPlan = async (newPlan) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid, 'mealPlans', 'current'), {
        plan: newPlan,
        updatedAt: new Date()
      });
      setMealPlan(newPlan);
    } catch (err) {
      console.error(err);
      alert('Failed to save meal plan');
    }
  };

  const addRecipeToSlot = (day, mealType, recipe) => {
    const newPlan = { ...mealPlan };
    if (!newPlan[day]) newPlan[day] = {};
    if (!newPlan[day][mealType]) newPlan[day][mealType] = [];
    if (!newPlan[day][mealType].find(r => r.id === recipe.id)) {
      newPlan[day][mealType].push(recipe);
      saveMealPlan(newPlan);
    }
    setShowRecipeSelector(false);
    setSelectedSlot(null);
  };

  const removeRecipeFromSlot = (day, mealType, recipeId) => {
    const newPlan = { ...mealPlan };
    if (newPlan[day]?.[mealType]) {
      newPlan[day][mealType] = newPlan[day][mealType].filter(r => r.id !== recipeId);
      saveMealPlan(newPlan);
    }
  };

  const openRecipeSelector = (day, mealType) => {
    setSelectedSlot({ day, mealType });
    setShowRecipeSelector(true);
    setSearchTerm('');
    setCategoryFilter('all');
  };

  const getRecipesForMealType = (mealType) => {
    return recipes.filter(r => {
      const cat = r.category?.trim().toLowerCase();
      return CATEGORY_TO_MEALTYPE[cat]?.includes(mealType);
    });
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    const matchesMealType = selectedSlot
      ? CATEGORY_TO_MEALTYPE[recipe.category?.toLowerCase()]?.includes(selectedSlot.mealType)
      : true;
    return matchesSearch && matchesCategory && matchesMealType;
  });

  const generateShoppingList = () => {
    const ingredientsMap = {};

    DAYS_OF_WEEK.forEach(day => {
      MEAL_TYPES.forEach(mealType => {
        const meals = mealPlan[day]?.[mealType] || [];
        meals.forEach(recipe => {
          if (!Array.isArray(recipe.ingredients)) return;
          recipe.ingredients.forEach(ing => {
            if (!ing?.name) return;
            const name = ing.name.toLowerCase().trim();
            const unit = ing.unit || '';
            const qty = parseFloat(ing.quantity) || 0;

            if (!ingredientsMap[name]) {
              ingredientsMap[name] = { name: ing.name, quantity: qty, unit };
            } else {
              const existing = ingredientsMap[name];
              let addedQty = qty;
              if (unit && existing.unit && unit !== existing.unit) {
                addedQty = convertUnit(qty, unit, existing.unit);
              }
              existing.quantity += addedQty;
            }
          });
        });
      });
    });

    setShoppingList(Object.values(ingredientsMap));
    setShowShoppingList(true);
  };

  const clearMealPlan = () => {
    if (window.confirm('Are you sure you want to clear your entire meal plan?')) {
      const emptyPlan = ensureMealPlanStructure({});
      saveMealPlan(emptyPlan);
    }
  };

  const getTotalRecipes = () => {
    let count = 0;
    DAYS_OF_WEEK.forEach(day => {
      MEAL_TYPES.forEach(mealType => {
        count += (mealPlan[day]?.[mealType] || []).length;
      });
    });
    return count;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading your meal plan...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Please login to use Meal Planner
        </h2>
        <Link to="/login" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-6">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-500 mb-2">
            📅 Weekly Meal Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plan your meals for the week and generate a shopping list
          </p>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-white dark:bg-gray-800 px-6 py-3 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">Planned Meals</div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-500">
              {getTotalRecipes()}
            </div>
          </div>

          <button
            onClick={generateShoppingList}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg shadow-md transition font-semibold flex items-center gap-2"
          >
            <span>🛒</span>
            Generate Shopping List
          </button>

          <button
            onClick={clearMealPlan}
            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg shadow-md transition font-semibold"
          >
            Clear All
          </button>
        </div>

        {/* Meal Plan Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 text-white">
                <tr>
                  <th className="p-4 text-left font-semibold w-32 sticky left-0 bg-green-600 dark:bg-green-700 z-10">
                    Meal
                  </th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="p-4 text-center font-semibold min-w-[180px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {MEAL_TYPES.map((mealType, idx) => (
                  <tr
                    key={mealType}
                    className={`border-t border-gray-200 dark:border-gray-700 ${idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'
                      }`}
                  >
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 sticky left-0 bg-gray-100 dark:bg-gray-900 z-10">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{MEAL_EMOJIS[mealType]}</span>
                        <span>{mealType}</span>
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map(day => {
                      const selectedRecipes = mealPlan[day]?.[mealType] || [];
                      return (
                        <td key={day} className="p-3 align-top">
                          {/* Add Recipe Button */}
                          <button
                            onClick={() => openRecipeSelector(day, mealType)}
                            className="w-full bg-green-100 dark:bg-green-900/30 hover:bg-green-200 dark:hover:bg-green-900/50 text-green-700 dark:text-green-500 py-2 px-3 rounded-lg text-sm font-semibold transition border-2 border-dashed border-green-300 dark:border-green-700"
                          >
                            + Add Recipe
                          </button>

                          {/* Selected Recipes */}
                          <div className="mt-2 space-y-2">
                            {selectedRecipes.map(recipe => (
                              <div
                                key={recipe.id}
                                className="group relative bg-white dark:bg-gray-700 rounded-lg shadow-sm hover:shadow-md transition border border-gray-200 dark:border-gray-600 overflow-hidden"
                              >
                                <Link to={`/recipe/${recipe.id}`} className="block p-2">
                                  <div className="flex items-center gap-2">
                                    {recipe.imageUrl ? (
                                      <img
                                        src={recipe.imageUrl}
                                        alt={recipe.name}
                                        className="w-10 h-10 rounded object-cover flex-shrink-0"
                                      />
                                    ) : (
                                      <div className="w-10 h-10 rounded bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg">🍽️</span>
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
                                        {recipe.name}
                                      </p>
                                      {recipe.prepTime && (
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                          ⏱️ {recipe.prepTime}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                </Link>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    removeRecipeFromSlot(day, mealType, recipe.id);
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition"
                                  title="Remove recipe"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 p-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <span>🛒</span>
                  Shopping List
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  {shoppingList.length} ingredient{shoppingList.length !== 1 ? 's' : ''} needed for this week
                </p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {shoppingList.length > 0 ? (
                  <div className="space-y-2">
                    {shoppingList
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((ing, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition"
                        >
                          <span className="text-gray-800 dark:text-gray-200 font-medium capitalize">
                            {ing.name}
                          </span>
                          <span className="text-gray-600 dark:text-gray-300 font-semibold">
                            {ing.quantity > 0 ? `${Math.round(ing.quantity * 100) / 100} ${ing.unit}` : ing.unit || 'as needed'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📝</div>
                    <p className="text-gray-600 dark:text-gray-400">
                      No ingredients needed yet. Add recipes to your meal plan!
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    const text = shoppingList
                      .map(ing => `${ing.name}: ${ing.quantity > 0 ? `${Math.round(ing.quantity * 100) / 100} ${ing.unit}` : ing.unit || 'as needed'}`)
                      .join('\n');
                    navigator.clipboard.writeText(text);
                    alert('Shopping list copied to clipboard!');
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold transition"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowShoppingList(false)}
                  className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Selector Modal */}
        {showRecipeSelector && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-green-700 dark:from-green-700 dark:to-green-800 p-6">
                <h2 className="text-2xl font-bold text-white">
                  Add Recipe to {selectedSlot.day} - {selectedSlot.mealType}
                </h2>
                <p className="text-green-100 text-sm mt-1">
                  Select a recipe from your collection
                </p>
              </div>

              <div className="p-6">
                {/* Search & Filter */}
                <div className="flex gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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

                {/* Recipe Grid */}
                <div className="overflow-y-auto max-h-[50vh]">
                  {filteredRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRecipes.map(recipe => (
                        <button
                          key={recipe.id}
                          onClick={() => addRecipeToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                          className="text-left bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition border-2 border-transparent hover:border-green-500 dark:hover:border-green-600"
                        >
                          <RecipeImage recipe={recipe} className="w-full h-32" />
                          <div className="p-3">
                            <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1 line-clamp-2">
                              {recipe.name}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                              {recipe.description}
                            </p>
                            {recipe.prepTime && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                                ⏱️ {recipe.prepTime} • 👥 {recipe.servings}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-6xl mb-4">🔍</div>
                      <p className="text-gray-600 dark:text-gray-400">
                        No recipes found. Try a different search or{' '}
                        <Link to="/recipe/new" className="text-green-600 hover:underline">
                          create one
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowRecipeSelector(false)}
                  className="w-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-4 py-3 rounded-lg font-semibold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MealPlanner;