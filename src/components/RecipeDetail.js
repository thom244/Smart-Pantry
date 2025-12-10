import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link} from 'react-router-dom';
import { 
  doc, getDoc, collection, addDoc, getDocs, 
  query, where, orderBy, updateDoc, arrayUnion, arrayRemove
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
      alert('Failed to save rating. Please try again.');
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      alert('Please login to comment');
      return;
    }
    if (!newComment.trim()) return;

    try {
      // FIXED: Added userId field that Firebase rules require
      await addDoc(collection(db, 'recipes', id, 'comments'), {
        text: newComment,
        userId: user.uid, // This was missing!
        author: user.email,
        authorName: user.displayName || user.email.split('@')[0],
        createdAt: new Date(),
      });
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Error: ' + error.message);
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
      alert("Failed to save favorite: " + error.message);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
        
        {/* Header with Title and Favorite */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <div className="flex justify-between items-start gap-4">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 flex-1">
              {recipe.name}
            </h1>
            {user && (
              <button
                onClick={handleFavorite}
                className={`text-3xl sm:text-4xl transition flex-shrink-0 ${
                  isFavorite ? 'text-red-500' : 'text-gray-300 dark:text-gray-600'
                } hover:text-red-400 hover:scale-110`}
                title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorite ? '❤️' : '🤍'}
              </button>
            )}
          </div>

          {/* Recipe Meta Info */}
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {recipe.prepTime && (
              <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                <span className="text-blue-600 dark:text-blue-400">⏱️</span>
                <span className="text-gray-700 dark:text-gray-700">{recipe.prepTime}</span>
              </div>
            )}
            {recipe.servings && (
              <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/30 px-3 py-1 rounded-full">
                <span className="text-purple-600 dark:text-purple-400">🍽️</span>
                <span className="text-gray-700 dark:text-gray-700">{recipe.servings}</span>
              </div>
            )}
            {recipe.category && (
              <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                <span className="text-green-600 dark:text-green-400">📂</span>
                <span className="text-gray-700 dark:text-gray-700 capitalize">{recipe.category}</span>
              </div>
            )}
          </div>

          <p className="mt-4 text-gray-700 dark:text-gray-300 text-sm sm:text-base leading-relaxed">
            {recipe.description}
          </p>
        </div>

        {/* Image Gallery */}
        <div className="relative rounded-xl overflow-hidden shadow-lg bg-white dark:bg-gray-800">
          {images.length > 0 ? (
            <>
              <img 
                src={images[currentImageIndex]} 
                alt={recipe.name}
                className="w-full h-64 sm:h-96 object-cover"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              {hasMultipleImages && (
                <>
                  {/* Navigation Arrows */}
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex((prev) => (prev + 1) % images.length)}
                    className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 sm:p-3 rounded-full transition"
                  >
                    ›
                  </button>
                  
                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full transition ${
                          idx === currentImageIndex ? 'bg-green-500 scale-125' : 'bg-gray-300 hover:bg-gray-400'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="w-full h-64 sm:h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-gray-400 dark:text-gray-500">No image available</span>
            </div>
          )}
        </div>

        {/* Rating */}
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Rate this recipe</h3>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRating(star)}
                  className={`text-2xl sm:text-3xl ${
                    star <= (userRating || 0) ? 'text-yellow-500' : 'text-gray-300 dark:text-gray-600'
                  } hover:text-yellow-400 transition transform hover:scale-110`}
                >
                  ★
                </button>
              ))}
            </div>
            <span className="text-sm sm:text-lg text-gray-600 dark:text-gray-300">
              {averageRating > 0 ? `${averageRating} / 5` : 'No ratings yet'}
              {recipe.ratings && recipe.ratings.length > 0 && ` (${recipe.ratings.length})`}
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Ingredients */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-600 dark:text-green-400 flex items-center gap-2">
              <span>🥗</span>
              <span>Ingredients</span>
            </h2>
            <ul className="space-y-2.5">
              {recipe.ingredients?.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm sm:text-base">
                  <span className="text-green-500 mt-1 flex-shrink-0">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{renderIngredient(ing)}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Instructions */}
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-600 dark:text-green-400 flex items-center gap-2">
              <span>👨‍🍳</span>
              <span>Instructions</span>
            </h2>
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line text-sm sm:text-base leading-relaxed">
              {recipe.instructions}
            </p>
          </div>
        </div>

        {/* Remix Button */}
        {user && (
          <div className="flex justify-center">
            <button
              onClick={() => setShowRemix(!showRemix)}
              className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white px-6 py-3 rounded-lg transition font-semibold text-sm sm:text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {showRemix ? '❌ Cancel Remix' : '🎨 Remix This Recipe'}
            </button>
          </div>
        )}

        {showRemix && (
          <div className="bg-gray-50 dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md border-2 border-green-500">
            <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Create Your Remix</h3>
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
          <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
            <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">
              🎨 Community Remixes ({remixes.length})
            </h2>

            <div className="overflow-x-auto -mx-2 px-2 sm:-mx-4 sm:px-4">
              <div className="flex gap-3 sm:gap-4 pb-2 min-w-max sm:min-w-0 sm:grid sm:grid-cols-2 lg:grid-cols-3">
                {remixes.map((remix) => (
                  <Link
                    key={remix.id}
                    to={`/recipe/${remix.id}`}
                    className="flex-shrink-0 w-64 sm:w-auto bg-gray-50 dark:bg-gray-700 shadow-md hover:shadow-xl rounded-xl overflow-hidden transition-all transform hover:-translate-y-2 border border-gray-200 dark:border-gray-600"
                  >
                    <RecipeImage recipe={remix} className="w-full h-36 object-cover" />
                    <div className="p-3">
                      <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-2 text-sm sm:text-base">
                        {remix.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-2">
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
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-xl shadow-md">
          <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-green-600 dark:text-green-400">
            💬 Comments ({comments.length})
          </h2>

          {user ? (
            <div className="mb-6">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none text-sm sm:text-base"
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleCommentSubmit}
                  disabled={!newComment.trim()}
                  className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition font-semibold text-sm sm:text-base"
                >
                  Post Comment
                </button>

                <button
                  onClick={() => setNewComment('')}
                  className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-sm sm:text-base text-gray-700 dark:text-gray-300"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
              <p className="text-gray-600 dark:text-gray-300 mb-3">Please login to comment</p>
              <Link 
                to="/login"
                className="inline-block bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Login
              </Link>
            </div>
          )}

          {comments.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="border-l-4 border-green-500 pl-3 sm:pl-4 py-2 sm:py-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <p className="text-gray-800 dark:text-gray-100 text-sm sm:text-base">{comment.text}</p>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    <span className="text-gray-600 dark:text-gray-300 text-xs sm:text-sm font-medium truncate">
                      {comment.authorName || comment.author}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-xs flex-shrink-0">
                      {comment.createdAt?.toDate?.().toLocaleDateString?.() ?? ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RecipeDetail;