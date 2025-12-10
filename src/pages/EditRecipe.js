import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase/config';
import RecipeForm from '../components/RecipeForm';

function EditRecipe() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recipe, setRecipe] = useState(null);

  // 1. Monitor Auth State
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        // Not logged in -> Redirect
        navigate('/login');
      } else {
        // Only fetch recipe once we know who the user is
        fetchRecipe(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Fetch Recipe & Check Ownership
  const fetchRecipe = async (currentUserId) => {
    try {
      const docRef = doc(db, 'recipes', id);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const recipeData = { id: docSnap.id, ...docSnap.data() };

        // SECURITY CHECK: Is this user the author?
        if (recipeData.authorId !== currentUserId) {
          alert("You are not authorized to edit this recipe.");
          navigate('/');
          return;
        }

        setRecipe(recipeData);
      } else {
        alert('Recipe not found');
        navigate('/profile');
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
      alert('Error loading recipe');
    } finally {
      setLoading(false);
    }
  };

  // 3. Handle the Update Logic
  const handleUpdate = async (formData) => {
    try {
      const docRef = doc(db, 'recipes', id);

      // Update specific fields (add more if your form has more)
      await updateDoc(docRef, {
        name: formData.name,
        description: formData.description,
        ingredients: formData.ingredients,
        instructions: formData.instructions,
        cookTime: formData.cookTime,
        difficulty: formData.difficulty,
        // Don't update authorId, createdAt, ratings, etc.
        updatedAt: new Date()
      });

      alert('Recipe updated successfully!');
      navigate(`/recipe/${id}`); // Go back to the detail view
    } catch (error) {
      console.error("Error updating recipe: ", error);
      alert("Failed to update recipe.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="text-xl text-gray-600 dark:text-gray-300">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-gray-100 mb-6 sm:mb-8 border-b border-gray-200 dark:border-gray-700 pb-4">
          Edit Recipe
        </h1>

        {recipe && (
          <RecipeForm
            defaultRecipe={recipe}
            isEditMode={true}
            onSubmit={handleUpdate}
          />
        )}
      </div>
    </div>
  );
}

export default EditRecipe;