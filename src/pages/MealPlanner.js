import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import RecipeImage from '../components/RecipeImage';



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

const MEAL_COLORS = {
  Breakfast: 'from-sunny-400 to-sunny-600',
  Lunch: 'from-ocean-400 to-ocean-600',
  Dinner: 'from-berry-400 to-berry-600',
  Snack: 'from-mint-400 to-mint-600'
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
  const [editMode, setEditMode] = useState(false);

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
    // Set initial filter to the meal type being selected (lowercase to match category values)
    setCategoryFilter(mealType.toLowerCase());
  };

  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = recipe.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || recipe.category === categoryFilter;
    return matchesSearch && matchesCategory;
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
      <div className="flex flex-col justify-center items-center h-screen bg-gradient-to-br from-sunny-50 via-ocean-50 to-berry-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-900">
        <div className="text-6xl mb-4">📅</div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Please login to use Meal Planner
        </h2>
        <Link to="/login" className="bg-gradient-to-r from-coral-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-coral-600 hover:to-pink-600 transition shadow-lg">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-24 bg-slate-50 dark:bg-gray-900 ${!user ? 'flex items-center justify-center' : ''}`}>
      <div className="max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 pb-1">
            <span className="mr-2">📅</span>
            <span className="bg-gradient-to-r from-coral-500 via-sunny-400 to-ocean-500 bg-clip-text text-transparent">Weekly Meal Planner</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plan your meals for the week and generate a shopping list automatically
          </p>
        </div>

        {/* Stats & Actions Bar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-4">
            {/* Stats */}
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-6">
                <div className="bg-coral-50 dark:bg-gray-800 border border-coral-200 dark:border-red-400/30 px-6 py-3 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                    Planned Meals
                  </div>
                  <div className="text-3xl font-bold text-coral-500 dark:text-coral-400">
                    {getTotalRecipes()}
                  </div>
                </div>
                <div className="bg-ocean-50 dark:bg-gray-800 border border-ocean-200 dark:border-cyan-400/30 px-6 py-3 rounded-lg">
                  <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1">
                    This Week
                  </div>
                  <div className="text-3xl font-bold text-ocean-500 dark:text-cyan-400">
                    {DAYS_OF_WEEK.length}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setEditMode(!editMode)}
                className={`${editMode
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                  } ${editMode
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-200'
                  } px-6 py-3 rounded-lg shadow-lg transition font-semibold flex items-center gap-2`}
              >
                <span className="text-xl">{editMode ? '✓' : '✏️'}</span>
                <span>{editMode ? 'Done' : 'Edit'}</span>
              </button>

              <button
                onClick={generateShoppingList}
                className="bg-gradient-to-r from-coral-500 to-pink-500 hover:from-coral-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg shadow-lg transition font-semibold flex items-center gap-2 transform hover:scale-105"
              >
                <span className="text-xl">🛒</span>
                <span>Shopping List</span>
              </button>

              <button
                onClick={clearMealPlan}
                className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg shadow-lg transition font-semibold"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>

        {/* Meal Plan Grid - Desktop View */}
        <div className="hidden lg:block bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead className="bg-gradient-to-r from-coral-500 via-sunny-500 to-ocean-500 dark:from-coral-600 dark:via-sunny-600 dark:to-ocean-600">
                <tr>
                  <th className="p-4 text-left text-white font-bold w-40 border-r border-white/30">Meal Type</th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="p-4 text-center text-white font-bold border-r border-white/30 last:border-r-0">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((mealType, idx) => (
                  <tr
                    key={mealType}
                    className="border-t border-gray-200 dark:border-gray-700"
                  >
                    <td className="p-4 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
                      <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${MEAL_COLORS[mealType]} text-white px-4 py-2 rounded-lg font-semibold shadow-md`}>
                        <span className="text-xl">{MEAL_EMOJIS[mealType]}</span>
                        <span>{mealType}</span>
                      </div>
                    </td>
                    {DAYS_OF_WEEK.map(day => {
                      const selectedRecipes = mealPlan[day]?.[mealType] || [];
                      return (
                        <td key={day} className="p-4 align-top bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 last:border-r-0">
                          <div className="space-y-3">
                            {/* Selected Recipes */}
                            {selectedRecipes.map(recipe => (
                              <div
                                key={recipe.id}
                                className="group relative bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl shadow-sm hover:shadow-lg transition-all border border-gray-200 dark:border-gray-600 overflow-hidden h-16"
                              >
                                <Link to={`/recipe/${recipe.id}`} className="block h-full">
                                  <div className="flex items-center gap-3 p-2 h-full">
                                    <div className="flex-shrink-0">
                                      {recipe.imageUrl || recipe.images?.[0] ? (
                                        <img
                                          src={recipe.imageUrl || recipe.images[0]}
                                          alt={recipe.name}
                                          className="w-12 h-12 rounded-lg object-cover shadow-md"
                                        />
                                      ) : (
                                        <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${MEAL_COLORS[mealType]} flex items-center justify-center shadow-md`}>
                                          <span className="text-xl">🍽️</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-bold text-gray-800 dark:text-gray-100 line-clamp-2 group-hover:text-green-600 dark:group-hover:text-green-500 transition">
                                        {recipe.name}
                                      </p>
                                    </div>
                                  </div>
                                </Link>
                                {editMode && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      removeRecipeFromSlot(day, mealType, recipe.id);
                                    }}
                                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition shadow-lg font-bold"
                                    title="Remove recipe"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            ))}

                            {/* Add Recipe Button - Only show in edit mode */}
                            {editMode && (
                              <button
                                onClick={() => openRecipeSelector(day, mealType)}
                                className="w-full bg-white dark:bg-gray-700 hover:bg-ocean-50 dark:hover:bg-gray-600 border-2 border-dashed border-cyan-300 dark:border-cyan-700 hover:border-cyan-500 dark:hover:border-cyan-500 text-cyan-600 dark:text-cyan-400 py-3 px-4 rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
                              >
                                <span className="text-lg">+</span>
                                <span>Add Recipe</span>
                              </button>
                            )}

                            {/* Empty state when no recipes and not in edit mode */}
                            {!editMode && selectedRecipes.length === 0 && (
                              <div className="text-center py-6 text-gray-400 dark:text-gray-600 text-sm">
                                No recipe planned
                              </div>
                            )}
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

        {/* Mobile View */}
        <div className="lg:hidden space-y-6">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="bg-gradient-to-r from-coral-500 via-sunny-500 to-ocean-500 dark:from-coral-600 dark:via-sunny-600 dark:to-ocean-600 p-4">
                <h2 className="text-xl font-bold text-white">{day}</h2>
              </div>
              <div className="p-4 space-y-4">
                {MEAL_TYPES.map(mealType => {
                  const selectedRecipes = mealPlan[day]?.[mealType] || [];
                  return (
                    <div key={mealType}>
                      <div className={`inline-flex items-center gap-2 bg-gradient-to-r ${MEAL_COLORS[mealType]} text-white px-3 py-1.5 rounded-lg font-semibold text-sm mb-3`}>
                        <span>{MEAL_EMOJIS[mealType]}</span>
                        <span>{mealType}</span>
                      </div>
                      <div className="space-y-2">
                        {selectedRecipes.map(recipe => (
                          <div
                            key={recipe.id}
                            className="group relative bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 h-14 overflow-hidden"
                          >
                            <Link to={`/recipe/${recipe.id}`} className="flex items-center gap-3 p-2 h-full">
                              {recipe.imageUrl || recipe.images?.[0] ? (
                                <img
                                  src={recipe.imageUrl || recipe.images[0]}
                                  alt={recipe.name}
                                  className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0">
                                  <span className="text-lg">🍽️</span>
                                </div>
                              )}
                              <p className="font-semibold text-gray-800 dark:text-gray-100 text-sm line-clamp-2 flex-1">
                                {recipe.name}
                              </p>
                            </Link>
                            {editMode && (
                              <button
                                onClick={() => removeRecipeFromSlot(day, mealType, recipe.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}

                        {/* Add Recipe Button - Only show in edit mode */}
                        {editMode && (
                          <button
                            onClick={() => openRecipeSelector(day, mealType)}
                            className="w-full bg-ocean-50 dark:bg-gray-700 border-2 border-dashed border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 py-2 rounded-lg text-sm font-semibold"
                          >
                            + Add Recipe
                          </button>
                        )}

                        {/* Empty state when no recipes and not in edit mode */}
                        {!editMode && selectedRecipes.length === 0 && (
                          <div className="text-center py-4 text-gray-400 dark:text-gray-600 text-sm">
                            No recipe planned
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Shopping List Modal */}
        {showShoppingList && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 p-4 overflow-auto backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden mt-12">
              <div className="bg-gradient-to-r from-coral-500 to-pink-500 dark:from-coral-600 dark:to-pink-600 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                      <span className="text-4xl">🛒</span>
                      Shopping List
                    </h2>
                    <p className="text-coral-100 text-sm mt-1">
                      {shoppingList.length} ingredient{shoppingList.length !== 1 ? 's' : ''} needed for this week
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 overflow-y-auto max-h-[55vh]">
                {shoppingList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {shoppingList
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((ing, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-600 rounded-xl hover:shadow-md transition border border-gray-200 dark:border-gray-600"
                        >
                          <span className="text-gray-800 dark:text-gray-100 font-semibold capitalize">
                            {ing.name}
                          </span>
                          <span className="text-coral-500 dark:text-coral-400 font-bold ml-2">
                            {ing.quantity > 0 ? `${Math.round(ing.quantity * 100) / 100} ${ing.unit}` : ing.unit || 'as needed'}
                          </span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-7xl mb-4">📝</div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                      No ingredients yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Add recipes to your meal plan to generate a shopping list
                    </p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    const text = shoppingList
                      .map(ing => `• ${ing.name}: ${ing.quantity > 0 ? `${Math.round(ing.quantity * 100) / 100} ${ing.unit}` : ing.unit || 'as needed'}`)
                      .join('\n');
                    navigator.clipboard.writeText(text);
                    alert('✅ Shopping list copied to clipboard!');
                  }}
                  className="flex-1 bg-gradient-to-r from-coral-500 to-pink-500 hover:from-coral-600 hover:to-pink-600 text-white px-6 py-4 rounded-xl font-bold text-lg transition shadow-lg transform hover:scale-105"
                >
                  📋 Copy to Clipboard
                </button>
                <button
                  onClick={() => setShowShoppingList(false)}
                  className="bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-6 py-4 rounded-xl font-bold transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Recipe Selector Modal */}
        {showRecipeSelector && selectedSlot && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-start z-50 p-4 overflow-auto backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[85vh] overflow-hidden mt-8 mb-8 flex flex-col">
              <div className="bg-gradient-to-r from-ocean-500 to-mint-500 dark:from-ocean-600 dark:to-mint-600 p-6">
                <h2 className="text-3xl font-bold text-white mb-2">
                  Add Recipe
                </h2>
                <p className="text-ocean-100">
                  <span className="font-semibold">{selectedSlot.day}</span> • <span className="font-semibold">{selectedSlot.mealType}</span>
                </p>
              </div>

              <div className="p-6 flex-1 overflow-hidden flex flex-col">
                {/* Search & Filter */}
                <div className="flex flex-col md:flex-row gap-3 mb-6">
                  <input
                    type="text"
                    placeholder="🔍 Search recipes..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-ocean-500 dark:focus:border-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <select
                    value={categoryFilter}
                    onChange={e => setCategoryFilter(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:border-ocean-500 dark:focus:border-ocean-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <div className="overflow-y-auto flex-1 min-h-0">
                  {filteredRecipes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredRecipes.map(recipe => (
                        <button
                          key={recipe.id}
                          onClick={() => addRecipeToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                          className="text-left bg-white dark:bg-gray-700 rounded-xl overflow-hidden hover:shadow-xl transition-all border-2 border-gray-200 dark:border-gray-600 hover:border-ocean-500 dark:hover:border-ocean-400 transform hover:-translate-y-1"
                        >
                          <RecipeImage recipe={recipe} className="w-full h-40" showBadge={true} />
                          <div className="p-4">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1 line-clamp-2">
                              {recipe.name}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                              {recipe.description}
                            </p>
                            {(recipe.prepTime || recipe.servings) && (
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                {recipe.prepTime && <span>⏱️ {recipe.prepTime}</span>}
                                {recipe.servings && <span>👥 {recipe.servings}</span>}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-6xl mb-4">🍽️</div>
                      <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                        No recipes found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Try a different search or add new recipes to your collection
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex gap-3 flex-shrink-0">
                  <Link
                    to="/recipes/new"
                    className="ml-auto bg-white dark:bg-gray-700 hover:bg-ocean-50 dark:hover:bg-gray-600 border-2 border-dashed border-cyan-300 dark:border-cyan-700 text-cyan-600 dark:text-cyan-400 py-2 px-4 rounded-xl text-sm font-semibold"
                    onClick={() => {
                      setShowRecipeSelector(false);
                      setSelectedSlot(null);
                    }}
                  >
                    + Create Recipe
                  </Link>
                  <button
                    onClick={() => {
                      setShowRecipeSelector(false);
                      setSelectedSlot(null);
                    }}
                    className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-xl font-semibold"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MealPlanner;