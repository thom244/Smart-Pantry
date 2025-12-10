import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase/config";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { Link, useLocation } from "react-router-dom";
import RecipeChatbot from "../components/RecipeChatbot";

function Pantry() {
  const [user, setUser] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "" }]);
  const [searchTerm, setSearchTerm] = useState("");
  const location = useLocation();


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPantryItems(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (location.hash === '#cooking-assistant' && !loading) {
      setTimeout(() => {
        const element = document.getElementById('cooking-assistant');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    }
  }, [location.hash, loading]);

  const fetchPantryItems = async (userId) => {
    try {
      setLoading(true);
      const pantryRef = collection(db, "users", userId, "pantry");
      const snapshot = await getDocs(pantryRef);
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setPantryItems(items);
    } catch (error) {
      console.error("Error fetching pantry:", error);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const [shouldExpandChatbot, setShouldExpandChatbot] = useState(
    location.hash === '#cooking-assistant'
  );


  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...ingredients];
    newIngredients[index][field] = value;
    setIngredients(newIngredients);
  };

  const addIngredientField = () => {
    setIngredients([...ingredients, { name: "", quantity: "", unit: "" }]);
  };

  const removeIngredientField = (index) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((_, i) => i !== index));
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!user) return;

    const validIngredients = ingredients.filter((ing) => ing.name.trim() !== "");
    if (validIngredients.length === 0) {
      alert("Please add at least one ingredient.");
      return;
    }

    try {
      for (const ing of validIngredients) {
        await addDoc(collection(db, "users", user.uid, "pantry"), {
          name: ing.name.trim(),
          quantity: ing.quantity || "",
          unit: ing.unit || "",
          addedAt: serverTimestamp(),
        });
      }
      setIngredients([{ name: "", quantity: "", unit: "" }]);
      setShowAddForm(false);
      fetchPantryItems(user.uid);
    } catch (error) {
      console.error("Error adding ingredients:", error);
      alert("Failed to add ingredients");
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!user) return;

    if (window.confirm("Remove this item from your pantry?")) {
      try {
        await deleteDoc(doc(db, "users", user.uid, "pantry", itemId));
        fetchPantryItems(user.uid);
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    }
  };

  const handleUpdateQuantity = async (itemId, currentQty, currentUnit) => {
    const newQty = prompt("Enter new quantity:", currentQty);
    if (newQty !== null && user) {
      try {
        await updateDoc(doc(db, "users", user.uid, "pantry", itemId), {
          quantity: newQty,
        });
        fetchPantryItems(user.uid);
      } catch (error) {
        console.error("Error updating quantity:", error);
      }
    }
  };

  const filteredItems = pantryItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-300">Loading pantry...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen bg-white dark:bg-gray-900">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-4">
          Please login to access your pantry
        </h2>
        <Link
          to="/login"
          className="bg-gradient-to-r from-coral-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-coral-600 hover:to-pink-600 transition"
        >
          Login
        </Link>
      </div>
    );
  }

  const units = ["", "tsp", "tbsp", "cup", "ml", "l", "g", "kg", "oz", "lb", "piece", "pinch", "to taste", "to serve"];

  return (
    <div className="min-h-screen pb-24 bg-slate-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-coral-500 via-sunny-400 to-ocean-500 bg-clip-text text-transparent mb-2 pb-1">My Pantry</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Keep track of what you have at home and discover recipes you can make right now!
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-4 mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-gradient-to-r from-coral-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-coral-600 hover:to-pink-600 transition shadow-md"
          >
            {showAddForm ? "Cancel" : "+ Add Ingredients"}
          </button>
          <Link
            to="/recipes/suggestions"
            className="bg-gradient-to-r from-ocean-500 to-mint-500 text-white px-6 py-3 rounded-lg hover:from-ocean-600 hover:to-mint-600 transition shadow-md"
          >
            🍳 What Can I Cook?
          </Link>
        </div>

        {/* Add Ingredients Form */}
        {showAddForm && (
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md mb-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-100">Add Ingredients</h3>
            <form onSubmit={handleAddItem} className="space-y-4">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-gray-50 dark:bg-gray-700 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                  <input
                    type="text"
                    placeholder="Ingredient name *"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Quantity"
                    value={ingredient.quantity}
                    onChange={(e) => handleIngredientChange(index, "quantity", e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                  <select
                    value={ingredient.unit}
                    onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    {units.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit || "Unit"}
                      </option>
                    ))}
                  </select>
                  {ingredients.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeIngredientField(index)}
                      className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addIngredientField}
                className="text-cyan-500 dark:text-cyan-400 font-semibold hover:text-cyan-600 dark:hover:text-cyan-300"
              >
                + Add Another Ingredient
              </button>
              <div className="mt-4">
                <button
                  type="submit"
                  className="bg-gradient-to-r from-coral-500 to-pink-500 text-white px-6 py-2 rounded-lg hover:from-coral-600 hover:to-pink-600 transition shadow-md"
                >
                  Save Ingredients
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search Bar */}
        {pantryItems.length > 0 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search your pantry..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
        )}

        {/* Pantry Items */}
        {filteredItems.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md hover:shadow-lg transition border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 capitalize">
                      {item.name}
                    </h3>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>

                  <button
                    onClick={() => handleUpdateQuantity(item.id, item.quantity, item.unit)}
                    className="text-gray-600 dark:text-gray-400 text-sm mb-1 hover:text-cyan-500 dark:hover:text-cyan-400 cursor-pointer"
                  >
                    <span className="font-medium">
                      {item.quantity} {item.unit}
                    </span> (click to edit)
                  </button>

                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    Added{" "}
                    {item.addedAt?.toDate
                      ? item.addedAt.toDate().toLocaleDateString()
                      : "recently"}
                  </p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="mt-8 bg-berry-50 dark:bg-gray-800 p-6 rounded-lg border border-berry-200 dark:border-fuchsia-400/30">
              <h3 className="text-lg font-semibold text-berry-600 dark:text-fuchsia-400 mb-2">
                Pantry Stats
              </h3>
              <p className="text-gray-700 dark:text-gray-300">
                You have <strong>{pantryItems.length}</strong> ingredient{pantryItems.length !== 1 ? 's' : ''} in your pantry
              </p>
            </div>
          </>
        ) : (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
              {searchTerm
                ? "No ingredients found matching your search."
                : "Your pantry is empty!"}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowAddForm(true)}
                className="bg-gradient-to-r from-coral-500 to-pink-500 text-white px-6 py-3 rounded-lg hover:from-coral-600 hover:to-pink-600 transition shadow-md"
              >
                Add Your First Ingredient
              </button>
            )}
          </div>
        )}
        <div id="cooking-assistant" className="mt-12">
          <RecipeChatbot initiallyExpanded={shouldExpandChatbot} />
        </div>

      </div>
    </div>
  );
}

export default Pantry;