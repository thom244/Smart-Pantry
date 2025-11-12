import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, setDoc, getDoc, query, orderBy, limit } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import RecipeImage from '../components/RecipeImage';

const CATEGORY_TO_MEALTYPE = {
  Breakfast: ["Breakfast"],
  Lunch: ["Lunch"],
  Dinner: ["Dinner"],
  Dessert: ["Dinner", "Snack"],
  Snack: ["Snack"],
  "Main Course": ["Lunch", "Dinner"],
  "Side Dish": ["Lunch", "Dinner"]
};



const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

// Simple unit conversion map
const UNIT_CONVERSIONS = {
  g: { kg: 0.001 },
  kg: { g: 1000 },
  ml: { l: 0.001 },
  l: { ml: 1000 },
  cup: { g: 200 },  // example: 1 cup sugar = 200g
  tbsp: { g: 15 },
  tsp: { g: 5 }
};

const convertUnit = (quantity, fromUnit, toUnit) => {
  if (!quantity || !fromUnit || !toUnit) return quantity;
  if (fromUnit === toUnit) return quantity;
  if (UNIT_CONVERSIONS[fromUnit]?.[toUnit]) return quantity * UNIT_CONVERSIONS[fromUnit][toUnit];
  if (UNIT_CONVERSIONS[toUnit]?.[fromUnit]) return quantity / UNIT_CONVERSIONS[toUnit][fromUnit];
  return quantity; // fallback
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchData(currentUser.uid);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = async (userId) => {
    setLoading(true);
    try {
      const mealPlanDoc = await getDoc(doc(db, 'users', userId, 'mealPlans', 'current'));
      if (mealPlanDoc.exists()) setMealPlan(mealPlanDoc.data().plan || {});
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
  };

  // Filter recipes by search only (meal type filter optional)
  const filteredRecipes = recipes.filter(recipe =>
    recipe.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Generate aggregated shopping list with unit conversion
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
  };


  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Please login to use Meal Planner</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-center text-white">Weekly Meal Planner</h1>

      {/* Meal plan grid (non-modifiable) */}
      <table className="w-full border border-gray-700 rounded-lg text-sm shadow-lg">
        <thead className="bg-gray-800 text-gray-200">
          <tr>
            <th className="border border-gray-700 p-2 text-left font-semibold w-24">Meal</th>
            {DAYS_OF_WEEK.map(day => (
              <th
                key={day}
                className="border border-gray-700 p-2 text-center font-medium w-[12%]"
              >
                {day}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {MEAL_TYPES.map(mealType => (
            <tr key={mealType} className="hover:bg-gray-800/30 transition">
              <td className="border p-2 font-semibold bg-gray-900 text-gray-300">
                {mealType}
              </td>
              {DAYS_OF_WEEK.map(day => {
                const recipesForMealType = recipes.filter(r => {
                  const cat = r.category?.trim().toLowerCase();
                  const normalizedMap = Object.fromEntries(
                    Object.entries(CATEGORY_TO_MEALTYPE).map(([k, v]) => [k.toLowerCase(), v])
                  );
                  return normalizedMap[cat]?.includes(mealType);
                });
                const selectedRecipes = mealPlan[day]?.[mealType] || [];
                return (
                  <td key={day} className="border p-2 align-top">
                    {/* Dropdown */}
                    <select
                      className="w-full text-xs bg-gray-900 text-gray-200 border border-gray-700 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-green-400 hover:border-green-500 transition"
                      value=""
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        if (!selectedId) return;
                        const recipe = recipes.find(r => r.id === selectedId);
                        if (recipe) addRecipeToSlot(day, mealType, recipe);
                      }}
                    >
                      <option value="">➕ Add</option>
                      {recipesForMealType.map(recipe => (
                        <option key={recipe.id} value={recipe.id}>
                          {recipe.name}
                        </option>
                      ))}
                    </select>


                    {/* Display selected recipes */}
                    <div className="mt-2 flex flex-col gap-1">
                      {selectedRecipes.map(recipe => (
                        <div
                          key={recipe.id}
                          className="flex items-center justify-between bg-gray-800 text-gray-100 px-2 py-1 rounded-md text-xs shadow-sm hover:bg-red-600 transition cursor-pointer group"
                          onClick={() => removeRecipeFromSlot(day, mealType, recipe.id)}
                          title="Click to remove this recipe"
                        >
                          <div className="flex items-center gap-2">
                            {recipe.imageUrl && (
                              <img
                                src={recipe.imageUrl}
                                alt={recipe.name}
                                className="w-5 h-5 rounded object-cover"
                              />
                            )}
                            <span className="truncate max-w-[100px]">{recipe.name}</span>
                          </div>
                          <span className="opacity-0 group-hover:opacity-100 text-red-300 ml-1">✕</span>
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


      <div className="mt-6">
  <button
    onClick={generateShoppingList}
    className="bg-green-500 hover:bg-green-600 text-white rounded p-2 shadow-md transition"
  >
    Generate Ingredients List
  </button>
</div>


      {shoppingList.length > 0 && (
        <div className="mt-6 mb-4">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4 max-w-md">
            <h2 className="text-xl font-bold mb-3 text-green-400">🧺 Ingredients Needed</h2>
            <ul className="divide-y divide-gray-700">
              {shoppingList.map((ing, index) => (
                <li
                  key={index}
                  className="flex justify-between py-2 px-1 hover:bg-gray-800 transition rounded-md"
                >
                  <span className="text-gray-300">{ing.name}</span>
                  <span className="text-gray-100 font-semibold">
                    {ing.quantity} {ing.unit}
                  </span>
                </li>
              ))}
            </ul>
          </div>

        </div>
      )}

      {/* Recipe Selector Modal */}
      {showRecipeSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 w-3/4 max-h-[80vh] overflow-y-auto rounded">
            <h2 className="text-lg font-bold mb-2">
              Add Recipe to {selectedSlot.day} - {selectedSlot.mealType}
            </h2>
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="border p-2 mb-2 w-full"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredRecipes.map(recipe => (
                <button
                  key={recipe.id}
                  className="border p-2 flex gap-2 items-center"
                  onClick={() => addRecipeToSlot(selectedSlot.day, selectedSlot.mealType, recipe)}
                >
                  {recipe.imageUrl && <img src={recipe.imageUrl} alt={recipe.name} className="w-12 h-12 object-cover" />}
                  <span>{recipe.name}</span>
                </button>
              ))}
              {filteredRecipes.length === 0 && <p>No recipes found.</p>}
            </div>
            <button
              className="mt-2 bg-gray-300 p-2 rounded"
              onClick={() => setShowRecipeSelector(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MealPlanner;
