import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { 
  collection, getDocs, doc, setDoc, getDoc, 
  query, orderBy, limit 
} from 'firebase/firestore';
import { Link, useNavigate } from 'react-router-dom';
import RecipeImage from '../components/RecipeImage';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 
  'Friday', 'Saturday', 'Sunday'
];

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

function MealPlanner() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mealPlan, setMealPlan] = useState({});
  const [recipes, setRecipes] = useState([]);
  const [pantryItems, setPantryItems] = useState([]);
  const [showRecipeSelector, setShowRecipeSelector] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [shoppingList, setShoppingList] = useState([]);
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
    try {
      setLoading(true);
      
      // Fetch meal plan
      const mealPlanDoc = await getDoc(doc(db, 'users', userId, 'mealPlans', 'current'));
      if (mealPlanDoc.exists()) {
        setMealPlan(mealPlanDoc.data().plan || {});
      }

      // Fetch all recipes
      const recipesSnapshot = await getDocs(
        query(collection(db, 'recipes'), orderBy('createdAt', 'desc'), limit(100))
      );
      setRecipes(recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

      // Fetch pantry items
      const pantrySnapshot = await getDocs(collection(db, 'users', userId, 'pantry'));
      setPantryItems(pantrySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveMealPlan = async (newPlan) => {
    if (!user) return;
    
    try {
      await setDoc(doc(db, 'users', user.uid, 'mealPlans', 'current'), {
        plan: newPlan,
        updatedAt: new Date()
      });
      setMealPlan(newPlan);
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('Failed to save meal plan');
    }
  };

  const addRecipeToSlot = (day, mealType, recipe) => {
    const newPlan = { ...mealPlan };
    if (!newPlan[day]) newPlan[day] = {};
    if (!newPlan[day][mealType]) newPlan[day][mealType] = [];
    
    // Check if recipe already exists in this slot
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
  };

  const generateShoppingList = () => {
    const allIngredients = [];
    
    // Collect all ingredients from meal plan
    DAYS_OF_WEEK.forEach(day => {
      MEAL_TYPES.forEach(mealType => {
        const meals = mealPlan[day]?.[mealType] || [];
        meals.forEach(recipe => {
          if (recipe.ingredients) {
            recipe.ingredients.forEach(ing => {
              allIngredients.push({
                ...ing,
                recipeName: recipe.name,
                day,
                mealType
              });
            });
          }
        });
      });
    });

    // Group by ingredient name
    const grouped = {};
    allIngredients.forEach(ing => {
      const name = typeof ing === 'string' ? ing : ing.name;
      const key = name.toLowerCase().trim();
      
      if (!grouped[key]) {
        grouped[key] = {
          name: name,
          quantity: typeof ing === 'object' ? ing.quantity : '',
          unit: typeof ing === 'object' ? ing.unit : '',
          recipes: [],
          inPantry: false
        };
      }
      
      if (!grouped[key].recipes.includes(ing.recipeName)) {
        grouped[key].recipes.push(ing.recipeName);
      }
    });

    // Check against pantry
    const pantryNames = pantryItems.map(item => item.name.toLowerCase().trim());
    Object.keys(grouped).forEach(key => {
      if (pantryNames.includes(key)) {
        grouped[key].inPantry = true;
      }
    });

    const list = Object.values(grouped).sort((a, b) => {
      if (a.inPantry !== b.inPantry) return a.inPantry ? 1 : -1;
      return a.name.localeCompare(b.name);
    });

    setShoppingList(list);
    setShowShoppingList(true);
  };

  const clearMealPlan = async () => {
    if (window.confirm('Are you sure you want to clear your entire meal plan?')) {
      await saveMealPlan({});
    }
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-300">Loading meal planner...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Please login to access meal planner
        </h2>
        <Link to="/login" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-500 mb-2">
            📅 Weekly Meal Planner
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Plan your meals for the week and generate a shopping list
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={generateShoppingList}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md font-semibold"
          >
            🛒 Generate Shopping List
          </button>
          <button
            onClick={clearMealPlan}
            className="bg-red-500 text-white px-6 py-3 rounded-lg hover:bg-red-600 transition shadow-md font-semibold"
          >
            🗑️ Clear All
          </button>
          <Link
            to="/recipes"
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition shadow-md font-semibold"
          >
            📖 Browse Recipes
          </Link>
        </div>

        {/* Meal Plan Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-green-600 dark:bg-green-700">
                  <th className="p-4 text-left text-white font-semibold sticky left-0 bg-green-600 dark:bg-green-700 z-10">
                    Meal
                  </th>
                  {DAYS_OF_WEEK.map(day => (
                    <th key={day} className="p-4 text-center text-white font-semibold min-w-[200px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map(mealType => (
                  <tr key={mealType} className="border-t border-gray-200 dark:border-gray-700">
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 sticky left-0 z-10">
                      {mealType}
                    </td>
                    {DAYS_OF_WEEK.map(day => (
                      <td 
                        key={`${day}-${mealType}`} 
                        className="p-2 border-l border-gray-200 dark:border-gray-700 align-top"
                      >
                        <div className="min-h-[120px] space-y-2">
                          {mealPlan[day]?.[mealType]?.map(recipe => (
                            <div 
                              key={recipe.id}
                              className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-2 relative group"
                            >
                              <Link 
                                to={`/recipe/${recipe.id}`}
                                className="block hover:text-green-700 dark:hover:text-green-400"
                              >
                                <div className="flex items-start gap-2">
                                  {recipe.imageUrl && (
                                    <img 
                                      src={recipe.imageUrl} 
                                      alt={recipe.name}
                                      className="w-12 h-12 rounded object-cover flex-shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                                      {recipe.name}
                                    </p>
                                    {recipe.prepTime && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400">
                                        ⏱️ {recipe.prepTime}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </Link>
                              <button
                                onClick={() => removeRecipeFromSlot(day, mealType, recipe.id)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition hover:bg-red-600"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                          <button
                            onClick={() => openRecipeSelector(day, mealType)}
                            className="w-full py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-green-500 hover:text-green-600 dark:hover:border-green-500 dark:hover:text-green-400 transition text-sm"
                          >
                            + Add Recipe
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Total Meals Planned</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">
              {Object.values(mealPlan).reduce((total, day) => 
                total + Object.values(day).reduce((sum, meals) => sum + meals.length, 0)
              , 0)}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Unique Recipes</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-500">
              {new Set(
                Object.values(mealPlan).flatMap(day => 
                  Object.values(day).flatMap(meals => meals.map(m => m.id))
                )
              ).size}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
            <p className="text-gray-600 dark:text-gray-400 text-sm">Days Planned</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-500">
              {Object.keys(mealPlan).filter(day => 
                Object.values(mealPlan[day]).some(meals => meals.length > 0)
              ).length} / 7
            </p>
          </div>
        </div>
      </div>

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Add Recipe to {selectedSlot?.day} - {selectedSlot?.mealType}
                </h2>
                <button
                  onClick={() => setShowRecipeSelector(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                >
                  ✕
                </button>
              </div>
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
              {filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredRecipes.map(recipe => (
                    <button
                      key={recipe.id}
                      onClick={() => addRecipeToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                      className="bg-gray-50 dark:bg-gray-700 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-200 dark:border-gray-600 rounded-lg p-4 text-left transition"
                    >
                      <div className="flex gap-3">
                        <RecipeImage recipe={recipe} className="w-20 h-20 rounded-lg flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-1 truncate">
                            {recipe.name}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                            {recipe.description}
                          </p>
                          <div className="flex gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {recipe.prepTime && <span>⏱️ {recipe.prepTime}</span>}
                            {recipe.servings && <span>👥 {recipe.servings}</span>}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No recipes found. <Link to="/recipe/new" className="text-green-600 hover:underline">Create one?</Link>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Shopping List Modal */}
      {showShoppingList && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  🛒 Shopping List
                </h2>
                <button
                  onClick={() => setShowShoppingList(false)}
                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-2xl"
                >
                  ✕
                </button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {shoppingList.filter(i => !i.inPantry).length} items needed • {shoppingList.filter(i => i.inPantry).length} already in pantry
              </p>
            </div>
            <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 150px)' }}>
              {shoppingList.length > 0 ? (
                <>
                  {/* Items to Buy */}
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-red-600 dark:text-red-500 mb-3">
                      ❌ Need to Buy ({shoppingList.filter(i => !i.inPantry).length})
                    </h3>
                    <div className="space-y-2">
                      {shoppingList.filter(i => !i.inPantry).map((item, index) => (
                        <div key={index} className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                {item.quantity && `${item.quantity} `}
                                {item.unit && `${item.unit} `}
                                {item.name}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                For: {item.recipes.join(', ')}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Items in Pantry */}
                  {shoppingList.filter(i => i.inPantry).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold text-green-600 dark:text-green-500 mb-3">
                        ✅ Already in Pantry ({shoppingList.filter(i => i.inPantry).length})
                      </h3>
                      <div className="space-y-2">
                        {shoppingList.filter(i => i.inPantry).map((item, index) => (
                          <div key={index} className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3 opacity-75">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-semibold text-gray-800 dark:text-gray-200 capitalize">
                                  {item.quantity && `${item.quantity} `}
                                  {item.unit && `${item.unit} `}
                                  {item.name}
                                </p>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                  For: {item.recipes.join(', ')}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No meals planned yet. Add some recipes to generate a shopping list!
                </p>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-4">
              <button
                onClick={() => {
                  const text = shoppingList
                    .filter(i => !i.inPantry)
                    .map(i => `${i.quantity ? i.quantity + ' ' : ''}${i.unit ? i.unit + ' ' : ''}${i.name}`)
                    .join('\n');
                  navigator.clipboard.writeText(text);
                  alert('Shopping list copied to clipboard!');
                }}
                className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                📋 Copy List
              </button>
              <button
                onClick={() => setShowShoppingList(false)}
                className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlanner;