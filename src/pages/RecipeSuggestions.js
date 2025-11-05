import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';


function RecipeSuggestions() {
	const [user, setUser] = useState(null);
	const [recipes, setRecipes] = useState([]);
	const [pantry, setPantry] = useState([]);
	const [matchedRecipes, setMatchedRecipes] = useState([]);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
			setUser(currentUser);
		});
		return () => unsubscribe();
	}, []);

	useEffect(() => {
		async function fetchData() {
			setLoading(true);
			try {
				const recipesSnapshot = await getDocs(collection(db, 'recipes'));
				const recipesData = recipesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
				setRecipes(recipesData);

				if (user) {
					const pantrySnapshot = await getDocs(collection(db, `users/${user.uid}/pantry`));
					const pantryData = pantrySnapshot.docs.map(doc => doc.data().name.toLowerCase());
					setPantry(pantryData);
				}
			} catch (error) {
				console.error('Error fetching data:', error);
			}
			setLoading(false);
		}
		fetchData();
	}, [user]);

	useEffect(() => {
		if (!recipes.length || !pantry.length) {
			setMatchedRecipes([]);
			return;
		}
		const matches = recipes.map(recipe => {
			const recipeIngredients = recipe.ingredients.map(ing => ing.toLowerCase());
			const matchingIngredients = recipeIngredients.filter(ing => pantry.includes(ing));
			const missingIngredients = recipeIngredients.filter(ing => !pantry.includes(ing));
			return {
				...recipe,
				matchingIngredients,
				missingIngredients,
			};
		});
		setMatchedRecipes(matches);
	}, [recipes, pantry]);

	if (loading) {
		return <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading suggestions...</div>;
	}

	if (!user) {
		return <div className="text-center py-8 text-red-500 dark:text-red-400">Please log in to see recipe suggestions.</div>;
	}

	if (!matchedRecipes.length) {
		return <div className="text-center py-8 text-gray-500 dark:text-gray-400">No recipe suggestions found.</div>;
	}

	return (
		<div className="max-w-3xl mx-auto px-4 py-8">
			<h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Recipe Suggestions</h2>
			<div className="grid grid-cols-1 gap-6">
				{matchedRecipes.map((recipe) => (
					<div key={recipe.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
						<h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">{recipe.name}</h3>
						<div>
							<h4 className="font-semibold text-green-700 dark:text-green-300 mb-2">
								✅ You Have ({recipe.matchingIngredients.length})
							</h4>
							<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
								{recipe.matchingIngredients.slice(0, 5).map((ing, i) => (
									<li key={i}>• {ing}</li>
								))}
								{recipe.matchingIngredients.length > 5 && (
									<li className="text-gray-400">
										... and {recipe.matchingIngredients.length - 5} more
									</li>
								)}
							</ul>
						</div>
						{recipe.missingIngredients.length > 0 && (
							<div>
								<h4 className="font-semibold text-orange-700 dark:text-orange-300 mb-2">
									❌ You Need ({recipe.missingIngredients.length})
								</h4>
								<ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
									{recipe.missingIngredients.slice(0, 5).map((ing, i) => (
										<li key={i}>• {ing}</li>
									))}
									{recipe.missingIngredients.length > 5 && (
										<li className="text-gray-400 dark:text-gray-500">
											... and {recipe.missingIngredients.length - 5} more
										</li>
									)}
								</ul>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}

export default RecipeSuggestions;