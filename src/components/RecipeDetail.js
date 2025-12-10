import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link} from 'react-router-dom';
import { 
  doc, getDoc, collection, addDoc, getDocs, 
  query, where, orderBy, updateDoc, arrayUnion, arrayRemove //
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import RecipeForm from './RecipeForm';
import RecipeImage from './RecipeImage';

function RecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [showRemix, setShowRemix] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState(null);
  const [userRating, setUserRating] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [isFavorite, setIsFavorite] = useState(false);
  const [remixes, setRemixes] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Theme (dark mode) support
  const [theme, setTheme] = useState(() => {
    if (typeof window === 'undefined') return 'light';
    return localStorage.getItem('theme') || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  });

  useEffect(() => {
    // Apply theme class to <html>
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const fetchRecipe = React.useCallback(async () => {
    try {
      const docRef = doc(db, 'recipes', id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const recipeData = { id: docSnap.id, ...docSnap.data() };
        setRecipe(recipeData);
        calculateAverageRating(recipeData.ratings || []);

        if (user && recipeData.favoritedBy) {
          setIsFavorite(recipeData.favoritedBy.includes(user.uid));
        }
      } else {
        alert('Recipe not found');
        navigate('/recipes');
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    }
  }, [id, user, navigate]);

  const fetchComments = React.useCallback(async () => {
    try {
      const q = query(
        collection(db, 'recipes', id, 'comments'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [id]);

  const fetchRemixes = React.useCallback(async () => {
    try {
      const q = query(
        collection(db, 'recipes'),
        where('originalRecipeId', '==', id)
      );
      const snapshot = await getDocs(q);
      const recipeRemixes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRemixes(recipeRemixes);
    } catch (error) {
      console.error('Error fetching remixes:', error);
    }
  }, [id]);

  useEffect(() => {
    fetchRecipe();
    fetchComments();
    fetchRemixes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, fetchRecipe, fetchComments, fetchRemixes]);

  const calculateAverageRating = (ratings) => {
    if (!ratings || ratings.length === 0) {
      setAverageRating(0);
      return;
    }
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    setAverageRating((sum / ratings.length).toFixed(1));
  };

  const handleRating = async (rating) => {
    if (!user) {
      alert('Please login to rate recipes');
      return;
    }

    try {
      const docRef = doc(db, 'recipes', id);
      const updatedRatings = [
        ...(recipe.ratings || []).filter(r => r.userId !== user.uid),
        { userId: user.uid, rating }
      ];

      await updateDoc(docRef, { ratings: updatedRatings });
      setUserRating(rating);
      calculateAverageRating(updatedRatings);
    } catch (error) {
      console.error('Error rating recipe:', error);
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      alert('Please login to comment');
      return;
    }
    if (!newComment.trim()) return;

    try {
      await addDoc(collection(db, 'recipes', id, 'comments'), {
        text: newComment,
        author: user.email,
        authorName: user.displayName || user.email.split('@')[0],
        createdAt: new Date(),
      });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
    }
  };

  const handleFavorite = async () => {
    if (!user) {
      alert('Please login to favorite recipes');
      return;
    }

    const previousFavorites = recipe.favoritedBy || [];
    let newFavorites;
    let newIsFavoriteStatus;

    if (isFavorite) {
      newFavorites = previousFavorites.filter(uid => uid !== user.uid);
      newIsFavoriteStatus = false;
    } else {
      newFavorites = [...previousFavorites, user.uid];
      newIsFavoriteStatus = true;
    }

    setIsFavorite(newIsFavoriteStatus);
    setRecipe({ ...recipe, favoritedBy: newFavorites });

    try {
      const docRef = doc(db, 'recipes', id);
      
      if (newIsFavoriteStatus) {
        await updateDoc(docRef, { favoritedBy: arrayUnion(user.uid) });
      } else {
        await updateDoc(docRef, { favoritedBy: arrayRemove(user.uid) });
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
      setIsFavorite(!newIsFavoriteStatus);
      setRecipe({ ...recipe, favoritedBy: previousFavorites });
      alert("Failed to save favorite. Check your console for permission errors.");
    }
  };

  const renderIngredient = (ing) => {
    if (typeof ing === 'string') {
      return ing;
    }
    return `${ing.quantity ? ing.quantity + ' ' : ''}${ing.unit ? ing.unit + ' ' : ''}${ing.name}`.trim();
  };

  const images = recipe?.images || (recipe?.imageUrl ? [recipe.imageUrl] : []);
  const hasMultipleImages = images.length > 1;

  if (!recipe) return (
    <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-xl text-gray-600 dark:text-gray-300">Loading...</div>
    </div>
  );

  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="max-w-5xl mx-auto p-6 space-y-6 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-xl">
        
        {/* Header with Title and Favorite */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-green-600 dark:text-green-400">{recipe.name}</h1>
          {user && (
            <button
              onClick={handleFavorite}
              className={`text-3xl transition ${isFavorite ? 'text-red-500' : 'text-gray-300'} hover:text-red-400`}
            >
              {isFavorite ? '❤️' : '🤍'}
            </button>
          )}
        </div>

        {/* Image Gallery */}
        <div className="relative rounded-xl overflow-hidden shadow-lg">
          {images.length > 0 ? (
            <>
              <img 
                src={images[currentImageIndex]} 
                alt={recipe.name}
                className="w-full h-96 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {hasMultipleImages && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`w-3 h-3 rounded-full ${idx === currentImageIndex ? 'bg-green-500' : 'bg-gray-300'}`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="w-full h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400">No image available</span>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleRating(star)}
                className={`text-3xl ${
                  star <= (userRating || 0) ? 'text-yellow-500' : 'text-gray-300'
                } hover:text-yellow-400 transition`}
              >
                ★
              </button>
            ))}
          </div>
          <span className="text-lg text-gray-600 dark:text-gray-300">
            {averageRating > 0 ? `${averageRating} / 5` : 'No ratings yet'}
            {recipe.ratings && ` (${recipe.ratings.length} ${recipe.ratings.length === 1 ? 'rating' : 'ratings'})`}
          </span>
        </div>

        <p className="text-gray-700 dark:text-gray-300 text-lg">{recipe.description}</p>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Ingredients */}
          <div className="bg-gray-900 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-green-500">Ingredients</h2>
            <ul className="space-y-2">
              {recipe.ingredients?.map((ing, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-green-500 mr-2">•</span>
                  <span className="text-gray-300">{renderIngredient(ing)}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Instructions */}
          <div className="bg-gray-900 p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-4 text-green-500">Instructions</h2>
            <p className="text-gray-300 whitespace-pre-line">{recipe.instructions}</p>
          </div>
        </div>

        {/* Remix Button */}
        {user && (
          <button
            onClick={() => setShowRemix(!showRemix)}
            className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-semibold"
          >
            {showRemix ? 'Cancel Remix' : '🎨 Remix This Recipe'}
          </button>
        )}

        {showRemix && (
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Create Your Remix</h3>
            <RecipeForm 
              defaultRecipe={recipe} 
              isRemix={true}
              originalRecipeId={id}
              onSave={() => {
                setShowRemix(false);
                fetchRemixes();
              }} 
            />
          </div>
        )}

        {/* Community Remixes */}
        {remixes.length > 0 && (
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">
              Community Remixes ({remixes.length})
            </h2>

            <div className="overflow-x-auto -mx-2 px-2">
              <div className="flex gap-4 pb-2">
                {remixes.map((remix) => (
                  <Link
                    key={remix.id}
                    to={`/recipe/${remix.id}`}
                    className="bg-white dark:bg-gray-800 shadow-md hover:shadow-xl rounded-xl overflow-hidden transition-all transform hover:-translate-y-2 border border-gray-200 dark:border-gray-700 group"
                  >
                    <RecipeImage recipe={remix} className="w-full h-36" />
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2">
                        {remix.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
                        {remix.description}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400">
                        by {remix.authorName || remix.author?.split('@')[0] || 'Anonymous'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Comments */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">
            Comments ({comments.length})
          </h2>

          {user ? (
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 resize-none"
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCommentSubmit}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition font-semibold"
                >
                  Post Comment
                </button>

                <button
                  onClick={() => setNewComment('')}
                  className="px-3 py-2 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 hover:shadow transition"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-600 dark:text-gray-300 mb-4">Please login to comment</p>
          )}

          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border-l-4 border-green-500 pl-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-md">
                  <p className="text-gray-800 dark:text-gray-100">{comment.text}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600 dark:text-gray-300 text-sm font-medium">
                      {comment.authorName || comment.author}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                      {comment.createdAt?.toDate?.().toLocaleString?.() ?? ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6">No comments yet. Be the first to share your thoughts!</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeDetail;
