import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, doc, deleteDoc, query, orderBy, updateDoc, getDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';

function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Data
  const [stats, setStats] = useState({ users: 0, recipes: 0, comments: 0 });
  const [users, setUsers] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [comments, setComments] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        navigate('/login');
        return;
      }

      setUser(currentUser);

      // Check if user is admin
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      const userData = userDoc.data();

      if (userData?.isAdmin) {
        setIsAdmin(true);
        fetchAdminData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const fetchAdminData = async () => {
    try {
      // Fetch all users
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);

      // Fetch all recipes
      const recipesQuery = query(collection(db, 'recipes'), orderBy('createdAt', 'desc'));
      const recipesSnap = await getDocs(recipesQuery);
      const recipesData = recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecipes(recipesData);

      // Fetch all comments from all recipes
      let allComments = [];
      for (const recipe of recipesData) {
        const commentsSnap = await getDocs(
          query(collection(db, 'recipes', recipe.id, 'comments'), orderBy('createdAt', 'desc'))
        );
        const recipeComments = commentsSnap.docs.map(doc => ({
          id: doc.id,
          recipeId: recipe.id,
          recipeName: recipe.name,
          ...doc.data()
        }));
        allComments = [...allComments, ...recipeComments];
      }
      // Sort all comments by date
      allComments.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB - dateA;
      });
      setComments(allComments);

      // Calculate stats
      setStats({
        users: usersData.length,
        recipes: recipesData.length,
        comments: allComments.length
      });

      // Create recent activity log
      const activity = recipesData.slice(0, 10).map(recipe => ({
        type: 'recipe',
        action: 'created',
        item: recipe.name,
        user: recipe.authorName || recipe.author,
        date: recipe.createdAt?.toDate() || new Date()
      }));
      setRecentActivity(activity);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete user "${userName}"? This will also delete all their recipes.`)) {
      return;
    }

    try {
      // Delete user's recipes
      const userRecipes = recipes.filter(r => r.authorId === userId);
      for (const recipe of userRecipes) {
        await deleteDoc(doc(db, 'recipes', recipe.id));
      }

      // Delete user document
      await deleteDoc(doc(db, 'users', userId));

      alert('User and their recipes deleted successfully');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Failed to delete user');
    }
  };

  const handleDeleteRecipe = async (recipeId, recipeName) => {
    if (!window.confirm(`Are you sure you want to delete recipe "${recipeName}"?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'recipes', recipeId));
      alert('Recipe deleted successfully');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting recipe:', error);
      alert('Failed to delete recipe');
    }
  };

  const handleDeleteComment = async (recipeId, commentId, commentText) => {
    const preview = commentText.length > 50 ? commentText.slice(0, 50) + '...' : commentText;
    if (!window.confirm(`Are you sure you want to delete this comment?\n\n"${preview}"`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'recipes', recipeId, 'comments', commentId));
      alert('Comment deleted successfully');
      fetchAdminData();
    } catch (error) {
      console.error('Error deleting comment:', error);
      alert('Failed to delete comment');
    }
  };

  const handleToggleAdmin = async (userId, currentStatus, userName) => {
    if (!window.confirm(`${currentStatus ? 'Remove' : 'Grant'} admin privileges for "${userName}"?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, 'users', userId), {
        isAdmin: !currentStatus
      });
      alert('Admin status updated');
      fetchAdminData();
    } catch (error) {
      console.error('Error updating admin status:', error);
      alert('Failed to update admin status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-fuchsia-500 mb-4"></div>
          <div className="text-xl text-gray-400 animate-pulse">Loading admin panel...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="text-8xl mb-6">🚫</div>
          <h1 className="text-4xl font-bold text-white mb-3">Access Denied</h1>
          <p className="text-gray-400 mb-8 text-lg">You don't have permission to access this page.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white px-8 py-4 rounded-xl hover:from-fuchsia-600 hover:to-violet-600 transition font-semibold text-lg shadow-lg shadow-fuchsia-500/25"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'dashboard', label: '📊 Dashboard', color: 'from-violet-500 to-purple-600' },
    { id: 'users', label: '👥 Users', color: 'from-cyan-500 to-blue-600' },
    { id: 'recipes', label: '🍳 Recipes', color: 'from-emerald-500 to-teal-600' },
    { id: 'comments', label: '💬 Comments', color: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div className="min-h-screen bg-gray-900 pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-800 to-gray-800 border-b border-gray-700 shadow-xl">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white flex items-center gap-3">
                <span className="text-4xl sm:text-5xl">🛡️</span>
                <span className="bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
                  Admin Dashboard
                </span>
              </h1>
              <p className="text-gray-400 mt-2">
                Welcome back, <span className="text-fuchsia-400 font-semibold">{user?.displayName}</span>
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="bg-gray-700 hover:bg-gray-600 text-gray-200 px-5 py-2.5 rounded-xl transition font-medium border border-gray-600"
            >
              ← Exit Admin
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-cyan-500/20 border border-cyan-400/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-cyan-100 text-sm font-medium mb-1 uppercase tracking-wide">Total Users</p>
                <p className="text-4xl font-bold">{stats.users}</p>
              </div>
              <div className="text-5xl opacity-60">👥</div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link to="#" onClick={() => setActiveTab('users')} className="text-sm text-cyan-100 hover:text-white transition">
                View all users →
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-sm font-medium mb-1 uppercase tracking-wide">Total Recipes</p>
                <p className="text-4xl font-bold">{stats.recipes}</p>
              </div>
              <div className="text-5xl opacity-60">🍳</div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link to="#" onClick={() => setActiveTab('recipes')} className="text-sm text-emerald-100 hover:text-white transition">
                View all recipes →
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 border border-amber-400/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-sm font-medium mb-1 uppercase tracking-wide">Total Comments</p>
                <p className="text-4xl font-bold">{stats.comments}</p>
              </div>
              <div className="text-5xl opacity-60">💬</div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link to="#" onClick={() => setActiveTab('comments')} className="text-sm text-amber-100 hover:text-white transition">
                Manage comments →
              </Link>
            </div>
          </div>

          <div className="bg-gradient-to-br from-fuchsia-500 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-fuchsia-500/20 border border-fuchsia-400/20">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-fuchsia-100 text-sm font-medium mb-1 uppercase tracking-wide">Recent Activity</p>
                <p className="text-4xl font-bold">{recentActivity.length}</p>
              </div>
              <div className="text-5xl opacity-60">📊</div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20">
              <Link to="#" onClick={() => setActiveTab('dashboard')} className="text-sm text-fuchsia-100 hover:text-white transition">
                View activity →
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 rounded-xl font-semibold transition-all ${activeTab === tab.id
                  ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-3xl">📊</span>
              Recent Activity
            </h2>
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-gray-700/50 rounded-xl border border-gray-600 hover:bg-gray-700 transition">
                    <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/20">
                      🍳
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        <span className="text-cyan-400">{activity.user}</span> created recipe "{activity.item}"
                      </p>
                      <p className="text-sm text-gray-400">
                        {activity.date.toLocaleDateString()} at {activity.date.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-400">No recent activity to display</p>
              </div>
            )}
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">👥</span>
                All Users ({users.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Recipes</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.displayName || u.email)}&background=random`}
                            alt={u.displayName}
                            className="w-10 h-10 rounded-full border-2 border-gray-600"
                          />
                          <span className="font-medium text-white">{u.displayName || u.name || 'No name'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{u.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-gray-700 text-cyan-400 px-3 py-1 rounded-full text-sm font-medium">
                          {recipes.filter(r => r.authorId === u.id).length}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.isAdmin ? (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white">
                            Admin
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-gray-700 text-gray-300">
                            User
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleToggleAdmin(u.id, u.isAdmin, u.displayName || u.email)}
                            className="text-cyan-400 hover:text-cyan-300 font-medium transition"
                          >
                            {u.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </button>
                          {u.id !== user.uid && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.displayName || u.email)}
                              className="text-red-400 hover:text-red-300 font-medium transition"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🍳</span>
                All Recipes ({recipes.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-700/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Recipe</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {recipes.map(recipe => (
                    <tr key={recipe.id} className="hover:bg-gray-700/50 transition">
                      <td className="px-6 py-4">
                        <div className="font-medium text-white">{recipe.name}</div>
                        <div className="text-sm text-gray-400 line-clamp-1 max-w-xs">{recipe.description}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {recipe.authorName || recipe.author?.split('@')[0]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-sm font-medium capitalize">
                          {recipe.category || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {recipe.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-3">
                          <button
                            onClick={() => navigate(`/recipe/${recipe.id}`)}
                            className="text-cyan-400 hover:text-cyan-300 font-medium transition"
                          >
                            View
                          </button>
                          <button
                            onClick={() => handleDeleteRecipe(recipe.id, recipe.name)}
                            className="text-red-400 hover:text-red-300 font-medium transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Comments Tab - NEW */}
        {activeTab === 'comments' && (
          <div className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">💬</span>
                All Comments ({comments.length})
              </h2>
              <p className="text-gray-400 mt-1">Manage and moderate user comments across all recipes</p>
            </div>

            {comments.length > 0 ? (
              <div className="divide-y divide-gray-700">
                {comments.map(comment => (
                  <div key={`${comment.recipeId}-${comment.id}`} className="p-6 hover:bg-gray-700/30 transition">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* User Avatar */}
                      <div className="flex-shrink-0">
                        <img
                          src={comment.userPhoto || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.userName || 'User')}&background=random`}
                          alt={comment.userName}
                          className="w-12 h-12 rounded-full border-2 border-gray-600"
                        />
                      </div>

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className="font-semibold text-white">{comment.userName || 'Anonymous'}</span>
                          <span className="text-gray-500">•</span>
                          <span className="text-sm text-gray-400">
                            {comment.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                          </span>
                        </div>

                        <p className="text-gray-300 mb-3">{comment.text}</p>

                        {/* Recipe Link */}
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-sm text-gray-500">On recipe:</span>
                          <Link
                            to={`/recipe/${comment.recipeId}`}
                            className="text-sm text-cyan-400 hover:text-cyan-300 transition font-medium"
                          >
                            {comment.recipeName}
                          </Link>
                        </div>
                      </div>

                      {/* Delete Button */}
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => handleDeleteComment(comment.recipeId, comment.id, comment.text)}
                          className="bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 border border-red-500/30"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="text-7xl mb-4">💬</div>
                <h3 className="text-2xl font-bold text-white mb-2">No Comments Yet</h3>
                <p className="text-gray-400">Comments will appear here once users start engaging with recipes</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;