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

      if (defaultRecipe.ingredients && defaultRecipe.ingredients.length > 0) {
        if (typeof defaultRecipe.ingredients[0] === 'string') {
          setIngredients(defaultRecipe.ingredients.map(ing => ({
            name: ing,
            quantity: "",
            unit: ""
          })));
        } else {
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

      const validIngredients = ingredients.filter(ing => ing.name.trim() !== "");

      if (validIngredients.length === 0) {
        setMessage("Please add at least one ingredient.");
        setLoading(false);
        return;
      }

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
        imageUrl: validImages[0] || "",
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
        await updateDoc(doc(db, "recipes", defaultRecipe.id), {
          ...recipeData,
          updatedAt: serverTimestamp(),
        });
        setMessage("✅ Recipe updated successfully!");
      } else {
        const docRef = await addDoc(collection(db, "recipes"), recipeData);
        setMessage(`✅ Recipe ${isRemix ? 'remixed' : 'created'} successfully!`);

        if (onSave) {
          onSave(docRef.id);
        } else {
          setTimeout(() => navigate(`/recipe/${docRef.id}`), 1500);
        }
      }

      if (!onSave) {
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

  const units = ["", "tsp", "tbsp", "cup", "ml", "l", "g", "kg", "oz", "lb", "piece", "pinch", "to taste", "to serve"];

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 p-4 sm:p-6 md:p-8 shadow-lg rounded-2xl">
      <h2 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-green-700 dark:text-emerald-400">
        {isRemix ? "🎨 Remix Recipe" : defaultRecipe && !isRemix ? "Edit Recipe" : "Create New Recipe"}
      </h2>

      {isRemix && (
        <div className="bg-blue-50 dark:bg-blue-800/30 border-l-4 border-blue-500 dark:border-blue-600 p-3 sm:p-4 mb-4 sm:mb-6">
          <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
            You're creating a remix of "<strong className="dark:text-blue-300">{defaultRecipe?.name}</strong>".
            Modify the recipe below and save it to your collection!
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

        {/* Recipe Name */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Recipe Name *</label>
          <input
            className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
            type="text"
            placeholder="e.g., Grandma's Chocolate Cake"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Description *</label>
          <textarea
            className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
            placeholder="A brief description of your recipe..."
            rows="3"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Category / Prep Time / Servings */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Category</label>
            <select
              className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
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
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Prep Time</label>
            <input
              className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
              type="text"
              placeholder="e.g., 30 mins"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Servings</label>
            <input
              className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
              type="text"
              placeholder="e.g., 4 people"
              value={servings}
              onChange={(e) => setServings(e.target.value)}
            />
          </div>
        </div>

        {/* Images */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">
            Recipe Images (optional)
          </label>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-3">
            Add multiple images - they will appear in a swipeable gallery
          </p>

          <div className="space-y-2 sm:space-y-3">
            {images.map((image, index) => (
              <div key={index} className="flex flex-col sm:flex-row gap-2">
                <input
                  className="flex-1 w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
                  type="url"
                  placeholder={`Image ${index + 1} URL`}
                  value={image}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                />

                {images.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeImageField(index)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addImageField}
            className="mt-2 text-green-600 dark:text-emerald-400 hover:text-green-700 dark:hover:text-emerald-300 font-semibold text-sm sm:text-base"
          >
            + Add Another Image
          </button>
        </div>

        {/* Ingredients WITH DARK BACKGROUND SECTION */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">
            Ingredients * <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400">(Drag to reorder)</span>
          </label>

          {/* 🔥 DARK BACKGROUND ADDED HERE */}
          <div className="space-y-2 bg-gray-900 dark:bg-black p-3 rounded-xl border border-gray-700 dark:border-gray-600">
            {ingredients.map((ingredient, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col sm:flex-row gap-2 p-2 rounded-lg ${draggedIndex === index
                    ? "bg-green-50 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-600"
                    : "bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600"
                  } cursor-move`}
              >
                <div className="hidden sm:flex items-center justify-center text-gray-400 dark:text-gray-500 px-2">
                  ☰
                </div>

                <div className="flex flex-col sm:flex-row gap-2 flex-1">

                  <input
                    className="flex-1 w-full p-2 sm:p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm"
                    type="text"
                    placeholder="Ingredient name"
                    value={ingredient.name}
                    onChange={(e) => handleIngredientChange(index, "name", e.target.value)}
                    required
                  />

                  <div className="flex gap-2">
                    <input
                      className="w-16 sm:w-20 md:w-24 p-2 sm:p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm"
                      type="text"
                      placeholder="Amt"
                      value={ingredient.quantity}
                      onChange={(e) => handleIngredientChange(index, "quantity", e.target.value)}
                    />

                    <select
                      className="flex-1 min-w-0 sm:w-24 md:w-32 p-2 sm:p-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm"
                      value={ingredient.unit}
                      onChange={(e) => handleIngredientChange(index, "unit", e.target.value)}
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
                        className="px-2.5 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm flex-shrink-0"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addIngredientField}
            className="mt-2 text-green-600 dark:text-emerald-400 hover:text-green-700 dark:hover:text-emerald-300 font-semibold text-sm sm:text-base"
          >
            + Add Ingredient
          </button>
        </div>

        {/* Instructions */}
        <div>
          <label className="block text-gray-700 dark:text-gray-200 font-semibold mb-2 text-sm sm:text-base">Instructions *</label>
          <textarea
            className="w-full p-2.5 sm:p-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500 text-sm sm:text-base"
            placeholder="Step-by-step cooking instructions..."
            rows="6"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            required
          />
        </div>

        {/* Submit */}
        <button
          className="w-full bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white py-2.5 sm:py-3 rounded-lg font-semibold transition disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base"
          type="submit"
          disabled={loading}
        >
          {loading ? "Saving..." : isRemix ? "Save Remix" : defaultRecipe && !isRemix ? "Update Recipe" : "Create Recipe"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 sm:p-4 rounded-lg text-center font-semibold text-sm sm:text-base ${message.includes("✅")
              ? "bg-green-100 dark:bg-green-800/30 text-green-700 dark:text-green-300"
              : "bg-red-100 dark:bg-red-800/30 text-red-700 dark:text-red-300"
            }`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default RecipeForm;
