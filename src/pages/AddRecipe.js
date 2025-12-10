import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

function AddRecipe() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [draggedIndex, setDraggedIndex] = useState(null);
    const navigate = useNavigate();

    const [recipe, setRecipe] = useState({
        name: '',
        description: '',
        ingredients: [{ name: '', quantity: '', unit: '' }],
        instructions: '',
        prepTime: '',
        servings: '',
        category: 'main',
        images: [''],
    });

    const units = ['', 'tsp', 'tbsp', 'cup', 'ml', 'l', 'g', 'kg', 'oz', 'lb', 'piece', 'pinch', 'to taste'];

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleIngredientChange = (index, field, value) => {
        const newIngredients = [...recipe.ingredients];
        newIngredients[index][field] = value;
        setRecipe({ ...recipe, ingredients: newIngredients });
    };

    const addIngredientField = () => {
        setRecipe({
            ...recipe,
            ingredients: [...recipe.ingredients, { name: '', quantity: '', unit: '' }]
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


    const handleRecipeImageUpload = (index, file) => {
        if (!file) return;

        const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
        if (!validTypes.includes(file.type)) {
            setError("Only JPG, PNG, or WebP images are allowed");
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            setError("File size must be less than 10MB");
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const newImages = [...recipe.images];
            newImages[index] = reader.result; // store preview as base64
            setRecipe({ ...recipe, images: newImages });
            setError("");
        };
        reader.readAsDataURL(file);
    };

    const addImageField = () => {
        setRecipe({ ...recipe, images: [...recipe.images, ''] });
    };

    const removeImageField = (index) => {
        if (recipe.images.length > 1) {
            setRecipe({
                ...recipe,
                images: recipe.images.filter((_, i) => i !== index)
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Please login to create recipes');
            return;
        }

        if (!recipe.name.trim()) {
            setError('Recipe name is required');
            return;
        }

        const validIngredients = recipe.ingredients.filter(ing => ing.name.trim() !== '');
        if (validIngredients.length === 0) {
            setError('Please add at least one ingredient');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const validImages = recipe.images.filter(img => img.trim() !== '');

            const recipeData = {
                name: recipe.name,
                description: recipe.description,
                ingredients: validIngredients,
                instructions: recipe.instructions,
                prepTime: recipe.prepTime,
                servings: recipe.servings,
                category: recipe.category,
                images: validImages,
                imageUrl: validImages[0] || '',
                author: user.email,
                authorName: user.displayName || user.email.split('@')[0],
                authorId: user.uid,
                userId: user.uid,
                createdAt: serverTimestamp(),
                ratings: [],
                favoritedBy: [],
            };

            const docRef = await addDoc(collection(db, 'recipes'), recipeData);
            navigate(`/recipe/${docRef.id}`);
        } catch (err) {
            console.error('Error creating recipe:', err);
            setError('Failed to create recipe. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!user) {
        return (
            <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
                <div className="text-xl text-gray-600 dark:text-gray-300">Loading...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
                <div className="mb-6 sm:mb-8">
                    <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-coral-500 via-sunny-400 to-ocean-500 bg-clip-text text-transparent mb-2 pb-1">
                        Create New Recipe
                    </h1>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                        Share your culinary creation with the community
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg mb-4 sm:mb-6">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow-lg rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 border border-gray-200 dark:border-gray-700 space-y-4 sm:space-y-6">
                    {/* Recipe Name */}
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                            Recipe Name *
                        </label>
                        <input
                            className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            type="text"
                            placeholder="e.g., Grandma's Chocolate Chip Cookies"
                            value={recipe.name}
                            onChange={(e) => setRecipe({ ...recipe, name: e.target.value })}
                            required
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                            Description *
                        </label>
                        <textarea
                            className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            rows="3"
                            placeholder="A brief description of your recipe..."
                            value={recipe.description}
                            onChange={(e) => setRecipe({ ...recipe, description: e.target.value })}
                            required
                        />
                    </div>

                    {/* Category, Prep Time, Servings */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                                Category
                            </label>
                            <select
                                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                                Prep Time
                            </label>
                            <input
                                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                type="text"
                                placeholder="e.g., 30 mins"
                                value={recipe.prepTime}
                                onChange={(e) => setRecipe({ ...recipe, prepTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                                Servings
                            </label>
                            <input
                                className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                type="text"
                                placeholder="e.g., 4 people"
                                value={recipe.servings}
                                onChange={(e) => setRecipe({ ...recipe, servings: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Images */}
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                            Recipe Images (optional)
                        </label>
                        <div className="space-y-3 sm:space-y-4">
                            {recipe.images.map((image, index) => (
                                <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 sm:p-4 rounded-lg border border-gray-300 dark:border-gray-600">
                                    <div className="flex flex-col sm:flex-row gap-3">
                                        {/* URL input */}
                                        <input
                                            type="url"
                                            placeholder={`Image ${index + 1} URL`}
                                            value={image}
                                            onChange={(e) => handleImageChange(index, e.target.value)}
                                            className="flex-1 p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                        />

                                        {/* File input with better styling */}
                                        <div className="flex gap-2">
                                            <label className="flex-1 sm:flex-none cursor-pointer">
                                                <div className="px-4 py-3 bg-gradient-to-r from-ocean-500 to-mint-500 hover:from-ocean-600 hover:to-mint-600 text-white rounded-lg font-medium text-sm sm:text-base transition text-center">
                                                    Choose File
                                                </div>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    onChange={(e) => handleRecipeImageUpload(index, e.target.files[0])}
                                                    className="hidden"
                                                />
                                            </label>

                                            {recipe.images.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeImageField(index)}
                                                    className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm sm:text-base font-medium"
                                                >
                                                    ✕
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    {/* Preview if image exists */}
                                    {image && (
                                        <div className="mt-3">
                                            <img
                                                src={image}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full sm:w-48 h-32 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
                                                onError={(e) => e.target.style.display = 'none'}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addImageField}
                            className="mt-3 text-sm sm:text-base text-ocean-500 dark:text-cyan-400 hover:text-ocean-600 dark:hover:text-cyan-300 font-semibold"
                        >
                            + Add Another Image
                        </button>
                    </div>

                    {/* Ingredients */}
                    <div>
                        <label className="block text-gray-700 dark:text-green-500 font-semibold mb-2 text-sm sm:text-base">
                            Ingredients * <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-500">(Drag to reorder)</span>
                        </label>
                        <div className="space-y-2">
                            {recipe.ingredients.map((ingredient, index) => (
                                <div
                                    key={index}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex flex-col sm:flex-row gap-2 p-2 rounded-lg ${draggedIndex === index
                                        ? 'bg-green-50 dark:bg-green-900 border-2 border-green-400 dark:border-green-600'
                                        : 'bg-gray-50 dark:bg-gray-700 border border-gray-600'}
  cursor-move`}
                                >
                                    <div className="hidden sm:flex items-center justify-center text-gray-400 dark:text-gray-500 px-2">
                                        ☰
                                    </div>
                                    <input
                                        className="flex-1 p-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                        type="text"
                                        placeholder="Ingredient name"
                                        value={ingredient.name}
                                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                                        required
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            className="w-20 sm:w-24 p-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                            type="text"
                                            placeholder="Amount"
                                            value={ingredient.quantity}
                                            onChange={(e) => handleIngredientChange(index, 'quantity', e.target.value)}
                                        />
                                        <select
                                            className="flex-1 sm:w-28 p-2.5 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                                                className="px-3 sm:px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition text-sm sm:text-base"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            type="button"
                            onClick={addIngredientField}
                            className="mt-2 text-sm sm:text-base text-ocean-500 dark:text-cyan-400 hover:text-ocean-600 dark:hover:text-cyan-300 font-semibold"
                        >
                            + Add Ingredient
                        </button>
                    </div>

                    {/* Instructions */}
                    <div>
                        <label className="block text-gray-700 dark:text-gray-300 font-semibold mb-2 text-sm sm:text-base">
                            Instructions *
                        </label>
                        <textarea
                            className="w-full p-2.5 sm:p-3 text-sm sm:text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            rows="8"
                            placeholder="Step-by-step instructions for your recipe..."
                            value={recipe.instructions}
                            onChange={(e) => setRecipe({ ...recipe, instructions: e.target.value })}
                            required
                        />
                    </div>

                    {/* Submit Button */}
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-2">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-coral-500 to-pink-500 hover:from-coral-600 hover:to-pink-600 text-white py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold text-base sm:text-lg transition disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? 'Creating Recipe...' : '✨ Create Recipe'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-6 py-3 sm:py-4 rounded-lg sm:rounded-xl font-semibold transition"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AddRecipe;