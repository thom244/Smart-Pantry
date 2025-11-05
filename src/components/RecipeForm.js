import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/config";
import { collection, addDoc, serverTimestamp, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";

const RecipeForm = ({ defaultRecipe = null, isRemix = false, originalRecipeId = null, onSave = null }) => {
  const [user, setUser] = useState(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ingredients, setIngredients] = useState([{ name: "", quantity: "", unit: "" }]);
  const [instructions, setInstructions] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [servings, setServings] = useState("");
  const [category, setCategory] = useState("main");
  const [images, setImages] = useState([""]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser && !defaultRecipe) {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate, defaultRecipe]);

  useEffect(() => {
    if (defaultRecipe) {
      setName(defaultRecipe.name || "");
      setDescription(defaultRecipe.description || "");
      
      // Handle both old format (string array) and new format (object array)
      if (defaultRecipe.ingredients && defaultRecipe.ingredients.length > 0) {
        if (typeof defaultRecipe.ingredients[0] === 'string') {
          // Old format - convert to new format
          setIngredients(defaultRecipe.ingredients.map(ing => ({
            name: ing,
            quantity: "",
            unit: ""
          })));
        } else {
          // New format
          setIngredients(defaultRecipe.ingredients);
        }
      }
      
      setInstructions(defaultRecipe.instructions || "");
      setPrepTime(defaultRecipe.prepTime || "");
      setServings(defaultRecipe.servings || "");
      setCategory(defaultRecipe.category || "main");
      setImages(defaultRecipe.images || [defaultRecipe.imageUrl || ""]);
    }
  }, [defaultRecipe]);

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

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newIngredients = [...ingredients];
    const draggedItem = newIngredients[draggedIndex];
    newIngredients.splice(draggedIndex, 1);
    newIngredients.splice(index, 0, draggedItem);
    setIngredients(newIngredients);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const addImageField = () => {
    setImages([...images, ""]);
  };

  const removeImageField = (index) => {
    if (images.length > 1) {
      setImages(images.filter((_, i) => i !== index));
    }
  };

  const handleImageChange = (index, value) => {
    const newImages = [...images];
    newImages[index] = value;
    setImages(newImages);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (!user) {
        setMessage("Please log in to save a recipe.");
        setLoading(false);
        return;
      }

      // Filter out empty ingredients and validate
      const validIngredients = ingredients.filter(ing => ing.name.trim() !== "");
      
      if (validIngredients.length === 0) {
        setMessage("Please add at least one ingredient.");
        setLoading(false);
        return;
      }

      // Filter out empty images
      const validImages = images.filter(img => img.trim() !== "");

      const recipeData = {
        name,
        description,
        ingredients: validIngredients,
        instructions,
        prepTime,
        servings,
        category,
        images: validImages,
        imageUrl: validImages[0] || "", // Keep first image as main imageUrl for compatibility
        author: user.email,
        authorName: user.displayName || user.email.split('@')[0],
        authorId: user.uid,
        createdAt: serverTimestamp(),
        ratings: [],
        favoritedBy: [],
      };

      if (isRemix && originalRecipeId) {
        recipeData.isRemix = true;
        recipeData.originalRecipeId = originalRecipeId;
        recipeData.remixedBy = user.uid;
      }

      if (defaultRecipe && !isRemix) {
        // Edit existing recipe (NOT a remix)
        await updateDoc(doc(db, "recipes", defaultRecipe.id), {
          ...recipeData,
          updatedAt: serverTimestamp(),
        });
        setMessage("✅ Recipe updated successfully!");
      } else {
        // Create new recipe OR create a remix (both are new documents)
        const docRef = await addDoc(collection(db, "recipes"), recipeData);
        setMessage(`✅ Recipe ${isRemix ? 'remixed' : 'created'} successfully!`);
        
        if (onSave) {
          onSave(docRef.id);
        } else {
          setTimeout(() => navigate(`/recipe/${docRef.id}`), 1500);
        }
      }

      if (!onSave) {
        // Reset form
        setName("");
        setDescription("");
        setIngredients([{ name: "", quantity: "", unit: "" }]);
        setInstructions("");
        setPrepTime("");
        setServings("");
        setCategory("main");
        setImages([""]);
      }
    } catch (error) {
      console.error("Error saving recipe:", error);
      setMessage("❌ Failed to save recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const units = ["", "tsp", "tbsp", "cup", "ml", "l", "g", "kg", "oz", "lb", "piece", "pinch", "to taste"];

  return (
    <div className="max-w-4xl mx-auto mt-8 bg-white dark:bg-gray-900 p-8 shadow-lg rounded-2xl">
      <h2 className="text-3xl font-bold mb-6 text-green-700 dark:text-green-500">
        {isRemix ? "🎨 Remix Recipe" : defaultRecipe && !isRemix ? "Edit Recipe" : "Create New Recipe"}
      </h2>
      
      {isRemix && (
        <div className="bg-blue-50 dark:bg-blue-800/30 border-l-4 border-blue-500 dark:border-blue-600 p-4 mb-6">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            You're creating a remix of "<strong className="dark:text-blue-300">{defaultRecipe?.name}</strong>". 
            Modify the recipe below and save it to your collection!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Recipe Name */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Recipe Name *</label>
          <input
            className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
            type="text"
            placeholder="e.g., Grandma's Chocolate Cake"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Description *</label>
          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
            placeholder="A brief description of your recipe..."
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Category, Prep Time, Servings */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Category</label>
            <select
              className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="dessert">Dessert</option>
              <option value="snack">Snack</option>
              <option value="main">Main Course</option>
              <option value="side">Side Dish</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Prep Time</label>
            <input
              className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
              type="text"
              placeholder="e.g., 30 mins"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Servings</label>
            <input
              className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
              type="text"
              placeholder="e.g., 4 people"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">
            Recipe Images (optional)
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Add multiple images - they will appear in a swipeable gallery
          </p>
          <div className="space-y-3">
            {images.map((image, index) => (
              <div key={index} className="flex gap-2">
                <input
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
                  type="url"
                  placeholder={`Image ${index + 1} URL`}
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                />
                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addImageField}
            className="mt-2 text-green-600 hover:text-green-700 font-semibold"
          >
            + Add Another Image
          </button>
        </div>

        {/* Ingredients with Quantities */}
        <div>
          <label className="block text-gray-700 font-semibold mb-2">
            Ingredients * <span className="text-sm font-normal text-gray-500">(Drag to reorder)</span>
          </label>
          <div className="space-y-2">
            {ingredients.map((ingredient, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex gap-2 p-2 rounded-lg ${
                  draggedIndex === index 
                    ? 'bg-green-50 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600' 
                    : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                } cursor-move`}
              >
                <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 px-2">
                  ☰
                </div>
                <input
                  className="flex-1 p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
                  type="text"
                  placeholder="Ingredient name"
                  value={ingredient.name}
                  onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                  required
                />
                <input
                  className="w-24 p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
                  type="text"
                  placeholder="Amount"
                  value={ingredient.quantity}
                  onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                />
                <select
                  className="w-32 p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
                  value={ingredient.unit}
                  onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                >
                  {units.map(unit => (
                    <option key={unit} value={unit}>{unit || 'Unit'}</option>
                  ))}
                </select>
                {ingredients.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeIngredientField(index)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addIngredientField}
            className="mt-2 text-green-600 hover:text-green-700 font-semibold"
          >
            + Add Ingredient
          </button>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2">Instructions *</label>
          <textarea
            className="w-full p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
            placeholder="Step-by-step cooking instructions..."
            rows="8"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            required
          />
        </div>

        {/* Submit Button */}
        <button
          className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          type="submit"
          disabled={loading}
        >
          {loading ? "Saving..." : isRemix ? "Save Remix" : defaultRecipe && !isRemix ? "Update Recipe" : "Create Recipe"}
        </button>
      </form>

      {message && (
        <div className={`mt-4 p-4 rounded-lg text-center font-semibold ${
          message.includes("✅") ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default RecipeForm;