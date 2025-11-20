import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

export default function ImportRecipe() {
  const [user, setUser] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: upload, 2: edit, 3: saved
  const [error, setError] = useState("");
  const [draggedIndex, setDraggedIndex] = useState(null);
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState({
    name: "",
    description: "",
    ingredients: [{ name: "", quantity: "", unit: "" }],
    instructions: "",
    prepTime: "",
    servings: "",
    category: "main",
    images: [""],
  });

  const units = ["", "tsp", "tbsp", "cup", "ml", "l", "g", "kg", "oz", "lb", "piece", "pinch", "to taste"];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(selectedFile.type)) {
      setError("Please upload an image (JPG, PNG, WebP) or PDF file");
      return;
    }

    // Validate file size (10MB max)
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      return;
    }

    setFile(selectedFile);
    setError("");

    // Create preview for images
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const handleExtract = async () => {
    if (!file) {
      setError("Please select a file first");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("http://localhost:5000/api/extract-recipe", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to extract recipe from image");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to extract recipe");
      }

      // Set the extracted recipe data
      setRecipe({
        ...data.recipe,
        images: preview ? [preview] : [""]
      });

      setStep(2); // Move to edit step
      setError("");

    } catch (err) {
      console.error("Extraction error:", err);
      setError(err.message || "Failed to extract recipe. Please try again or use a clearer image.");
    } finally {
      setLoading(false);
    }
  };

  const handleIngredientChange = (index, field, value) => {
    const newIngredients = [...recipe.ingredients];
    newIngredients[index][field] = value;
    setRecipe({ ...recipe, ingredients: newIngredients });
  };

  const addIngredientField = () => {
    setRecipe({
      ...recipe,
      ingredients: [...recipe.ingredients, { name: "", quantity: "", unit: "" }]
    });
  };

  const removeIngredientField = (index) => {
    if (recipe.ingredients.length > 1) {
      setRecipe({
        ...recipe,
        ingredients: recipe.ingredients.filter((_, i) => i !== index)
      });
    }
  };

  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newIngredients = [...recipe.ingredients];
    const draggedItem = newIngredients[draggedIndex];
    newIngredients.splice(draggedIndex, 1);
    newIngredients.splice(index, 0, draggedItem);
    setRecipe({ ...recipe, ingredients: newIngredients });
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleImageChange = (index, value) => {
    const newImages = [...recipe.images];
    newImages[index] = value;
    setRecipe({ ...recipe, images: newImages });
  };

  const addImageField = () => {
    setRecipe({ ...recipe, images: [...recipe.images, ""] });
  };

  const removeImageField = (index) => {
    if (recipe.images.length > 1) {
      setRecipe({
        ...recipe,
        images: recipe.images.filter((_, i) => i !== index)
      });
    }
  };

  const handleSaveRecipe = async () => {
    if (!user) {
      setError("Please login to save recipes");
      return;
    }

    if (!recipe.name.trim()) {
      setError("Recipe name is required");
      return;
    }

    const validIngredients = recipe.ingredients.filter(ing => ing.name.trim() !== "");
    if (validIngredients.length === 0) {
      setError("Please add at least one ingredient");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const validImages = recipe.images.filter(img => img.trim() !== "");

      const recipeData = {
        name: recipe.name,
        description: recipe.description,
        ingredients: validIngredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        servings: recipe.servings,
        category: recipe.category,
        images: validImages,
        imageUrl: validImages[0] || "",
        author: user.email,
        authorName: user.displayName || user.email.split('@')[0],
        authorId: user.uid,
        createdAt: serverTimestamp(),
        ratings: [],
        favoritedBy: [],
      };

      const docRef = await addDoc(collection(db, "recipes"), recipeData);
      
      setStep(3);
      setTimeout(() => {
        navigate(`/recipe/${docRef.id}`);
      }, 2000);

    } catch (err) {
      console.error("Save error:", err);
      setError("Failed to save recipe. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const resetImport = () => {
    setStep(1);
    setFile(null);
    setPreview(null);
    setRecipe({
      name: "",
      description: "",
      ingredients: [{ name: "", quantity: "", unit: "" }],
      instructions: "",
      prepTime: "",
      servings: "",
      category: "main",
      images: [""],
    });
    setError("");
  };

  return (
    <div className="max-w-4xl mx-auto mt-8 p-8 bg-white dark:bg-gray-900 min-h-screen">
      <h1 className="text-4xl font-bold text-green-700 dark:text-green-500 mb-2">
        🤖 Import Recipe from Image
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Upload a photo or PDF of a recipe and let AI extract it for you
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="mb-6">
            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-3">
              Upload Recipe Image or PDF
            </label>
            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-green-500 dark:hover:border-green-500 transition">
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer"
              >
                <div className="text-6xl mb-4">📸</div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  JPG, PNG, WebP, or PDF (Max 10MB)
                </p>
              </label>
            </div>
          </div>

          {preview && (
            <div className="mb-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Preview:</p>
              <img 
                src={preview} 
                alt="Recipe preview" 
                className="w-full max-h-96 object-contain rounded-lg border border-gray-200 dark:border-gray-700"
              />
            </div>
          )}

          {file && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✓ File selected: <strong>{file.name}</strong>
              </p>
            </div>
          )}

          <button
            onClick={handleExtract}
            disabled={!file || loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl font-semibold text-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting Recipe with AI...
              </span>
            ) : (
              "🤖 Extract Recipe"
            )}
          </button>

          <p className="text-xs text-gray-500 dark:text-gray-500 mt-4 text-center">
            💡 Tip: Use clear, well-lit photos for best results
          </p>
        </div>
      )}

      {/* Step 2: Edit Extracted Recipe */}
      {step === 2 && (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8 border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
              Review & Edit Recipe
            </h2>
            <button
              onClick={resetImport}
              className="text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500 font-semibold"
            >
              ← Import Another
            </button>
          </div>

          <form className="space-y-6">
            {/* Recipe Name */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Recipe Name *
              </label>
              <input
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                type="text"
                value={recipe.name}
                onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Description *
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows="3"
                value={recipe.description}
                onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                required
              />
            </div>

            {/* Category, Prep Time, Servings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                  Category
                </label>
                <select
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  value={recipe.category}
                  onChange={(e) => setRecipe({ ...recipe, category: e.target.value })}
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
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                  Prep Time
                </label>
                <input
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  type="text"
                  placeholder="e.g., 30 mins"
                  value={recipe.prepTime}
                  onChange={(e) => setRecipe({ ...recipe, prepTime: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                  Servings
                </label>
                <input
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  type="text"
                  placeholder="e.g., 4 people"
                  value={recipe.servings}
                  onChange={(e) => setRecipe({ ...recipe, servings: e.target.value })}
                />
              </div>
            </div>

            {/* Images */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Recipe Images (optional)
              </label>
              <div className="space-y-3">
                {recipe.images.map((image, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      type="url"
                      placeholder={`Image ${index + 1} URL`}
                      value={image}
                      onChange={(e) => handleImageChange(index, e.target.value)}
                    />
                    {recipe.images.length > 1 && (
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
                className="mt-2 text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 font-semibold"
              >
                + Add Another Image
              </button>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Ingredients * <span className="text-sm font-normal text-gray-500 dark:text-gray-500">(Drag to reorder)</span>
              </label>
              <div className="space-y-2">
                {recipe.ingredients.map((ingredient, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex gap-2 p-2 rounded-lg ${
                      draggedIndex === index
                        ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-400 dark:border-green-600'
                        : 'bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600'
                    } cursor-move`}
                  >
                    <div className="flex items-center justify-center text-gray-400 dark:text-gray-500 px-2">
                      ☰
                    </div>
                    <input
                      className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      type="text"
                      placeholder="Ingredient name"
                      value={ingredient.name}
                      onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                      required
                    />
                    <input
                      className="w-24 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      type="text"
                      placeholder="Amount"
                      value={ingredient.quantity}
                      onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                    />
                    <select
                      className="w-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      value={ingredient.unit}
                      onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                    >
                      {units.map(unit => (
                        <option key={unit} value={unit}>{unit || 'Unit'}</option>
                      ))}
                    </select>
                    {recipe.ingredients.length > 1 && (
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
                className="mt-2 text-green-600 dark:text-green-500 hover:text-green-700 dark:hover:text-green-400 font-semibold"
              >
                + Add Ingredient
              </button>
            </div>

            {/* Instructions */}
            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2">
                Instructions *
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                rows="8"
                value={recipe.instructions}
                onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
                required
              />
            </div>

            {/* Save Button */}
            <button
              type="button"
              onClick={handleSaveRecipe}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-semibold text-lg transition disabled:bg-gray-400 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? "Saving Recipe..." : "💾 Save Recipe"}
            </button>
          </form>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="text-7xl mb-6">🎉</div>
          <h2 className="text-3xl font-bold text-green-700 dark:text-green-500 mb-4">
            Recipe Saved Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Redirecting to your new recipe...
          </p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={resetImport}
              className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition font-semibold"
            >
              Import Another Recipe
            </button>
            <button
              onClick={() => navigate('/recipes')}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
            >
              View All Recipes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}