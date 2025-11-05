import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  doc, getDoc, collection, addDoc, getDocs, 
  query, where, orderBy, updateDoc, arrayUnion 
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import RecipeForm from './RecipeForm';
import { Link } from 'react-router-dom';
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

    try {
      const docRef = doc(db, 'recipes', id);
      if (isFavorite) {
        const updatedFavorites = recipe.favoritedBy.filter(uid => uid !== user.uid);
        await updateDoc(docRef, { favoritedBy: updatedFavorites });
        setIsFavorite(false);
      } else {
        await updateDoc(docRef, { 
          favoritedBy: arrayUnion(user.uid) 
        });
        setIsFavorite(true);
      }
    } catch (error) {
      console.error('Error updating favorites:', error);
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
    <div className="flex justify-center items-center h-screen">
      <div className="text-xl text-gray-600">Loading...</div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
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
                e.target.nextElementSibling.style.display = 'flex';
              }}
            />
            <div className="hidden w-full h-96 bg-gradient-to-br from-green-400 to-green-600 items-center justify-center">
              <span className="text-9xl">🍽️</span>
            </div>
            
            {hasMultipleImages && (
              <>
                {/* Previous Button */}
                <button
                  onClick={() => setCurrentImageIndex(prev => prev === 0 ? images.length - 1 : prev - 1)}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition"
                >
                  ❮
                </button>
                
                {/* Next Button */}
                <button
                  onClick={() => setCurrentImageIndex(prev => prev === images.length - 1 ? 0 : prev + 1)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-75 transition"
                >
                  ❯
                </button>
                
                {/* Image Indicators */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  {images.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-3 h-3 rounded-full transition ${
                        index === currentImageIndex ? 'bg-white' : 'bg-white bg-opacity-50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            
            {recipe.isRemix && (
              <span className="absolute top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                Remix
              </span>
            )}
          </>
        ) : (
          <RecipeImage recipe={recipe} className="w-full h-96" showBadge={true} />
        )}
      </div>

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold text-green-700 dark:text-green-500">{recipe.name}</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">
            By {recipe.authorName || recipe.author?.split('@')[0] || 'Anonymous'} • {recipe.createdAt?.toDate().toLocaleDateString()}
          </p>
        </div>
        {user && (
          <button
            onClick={handleFavorite}
            className={`px-4 py-2 rounded-lg transition ${
              isFavorite 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {isFavorite ? '❤️ Favorited' : '🤍 Add to Favorites'}
          </button>
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
        <span className="text-lg text-gray-600">
          {averageRating > 0 ? `${averageRating} / 5` : 'No ratings yet'}
          {recipe.ratings && ` (${recipe.ratings.length} ${recipe.ratings.length === 1 ? 'rating' : 'ratings'})`}
        </span>
      </div>

      <p className="text-gray-700 text-lg">{recipe.description}</p>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-green-700 dark:text-green-500">Ingredients</h2>
          <ul className="space-y-2">
            {recipe.ingredients?.map((ing, i) => (
              <li key={i} className="flex items-start">
                <span className="text-green-600 dark:text-green-500 mr-2">•</span>
                <span className="text-gray-700 dark:text-gray-300">{renderIngredient(ing)}</span>
              </li>
            ))}
          </ul>
        </div>
        
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-green-700 dark:text-green-500">Instructions</h2>
          <p className="text-gray-700 dark:text-gray-300 whitespace-pre-line">{recipe.instructions}</p>
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
        <div className="bg-gray-50 p-6 rounded-lg">
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

      {/* Remixes Section */}
      {remixes.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-4 text-green-700">
            Community Remixes ({remixes.length})
          </h2>
          <div className="overflow-x-auto">
            <div className="flex gap-4 pb-4">
              {remixes.map((remix) => (
                <Link
                  key={remix.id}
                  to={`/recipe/${remix.id}`}
                  className="flex-shrink-0 w-64 bg-gray-50 rounded-lg overflow-hidden hover:shadow-lg transition border-2 border-blue-200"
                >
                  <RecipeImage recipe={remix} className="w-full h-32" />
                  <div className="p-4">
                    <h3 className="font-bold text-gray-800 mb-1 line-clamp-2">
                      {remix.name}
                    </h3>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      {remix.description}
                    </p>
                    <p className="text-xs text-blue-600">
                      by {remix.authorName || remix.author?.split('@')[0] || 'Anonymous'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-4 text-green-700 dark:text-green-500">
          Comments ({comments.length})
        </h2>
        
        {user ? (
          <div className="mb-6">
            <textarea
              placeholder="Share your thoughts about this recipe..."
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-600 min-h-24"
            />
            <button
              onClick={handleCommentSubmit}
              disabled={!newComment.trim()}
              className="mt-2 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Post Comment
            </button>
          </div>
        ) : (
          <p className="text-gray-500 mb-4">Please login to comment</p>
        )}

        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map(comment => (
              <div key={comment.id} className="border-l-4 border-green-500 dark:border-green-600 pl-4 py-2">
                <p className="text-gray-800 dark:text-gray-200">{comment.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-gray-600 dark:text-gray-400 text-sm font-medium">
                    {comment.authorName || comment.author}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    {comment.createdAt?.toDate().toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </div>
    </div>
  );
}

export default RecipeDetail;