import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase/config';
import { 
  collection, addDoc, getDocs, deleteDoc, 
  doc, updateDoc, serverTimestamp 
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { Link } from 'react-router-dom';

function Pantry() {
  const [user, setUser] = useState(null);
  const [pantryItems, setPantryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Form states
  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchPantryItems(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchPantryItems = async (userId) => {
    try {
      setLoading(true);
      const pantryRef = collection(db, 'users', userId, 'pantry');
      const snapshot = await getDocs(pantryRef);
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPantryItems(items);
    } catch (error) {
      console.error('Error fetching pantry:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!user || !itemName.trim()) return;

    try {
      await addDoc(collection(db, 'users', user.uid, 'pantry'), {
        name: itemName.trim(),
        quantity: quantity || 'N/A',
        unit: unit || '',
        addedAt: serverTimestamp()
      });
      
      setItemName('');
      setQuantity('');
      setUnit('');
      setShowAddForm(false);
      fetchPantryItems(user.uid);
    } catch (error) {
      console.error('Error adding item:', error);
      alert('Failed to add item');
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!user) return;
    
    if (window.confirm('Remove this item from your pantry?')) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'pantry', itemId));
        fetchPantryItems(user.uid);
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };

  const handleUpdateQuantity = async (itemId, currentQty, currentUnit) => {
    const newQty = prompt('Enter new quantity:', currentQty);
    if (newQty !== null && user) {
      try {
        await updateDoc(doc(db, 'users', user.uid, 'pantry', itemId), {
          quantity: newQty
        });
        fetchPantryItems(user.uid);
      } catch (error) {
        console.error('Error updating quantity:', error);
      }
    }
  };

  const filteredItems = pantryItems.filter(item =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-xl text-gray-600">Loading pantry...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">
          Please login to access your pantry
        </h2>
        <Link to="/login" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700">
          Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-green-700 mb-2">My Pantry</h1>
        <p className="text-gray-600">
          Keep track of what you have at home and discover recipes you can make right now!
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
        >
          {showAddForm ? 'Cancel' : '+ Add Ingredient'}
        </button>
        <Link
          to="/recipes/suggestions"
          className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          🍳 What Can I Cook?
        </Link>
      </div>

      {/* Add Item Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow-md mb-6">
          <h3 className="text-xl font-semibold mb-4 dark:text-gray-100">Add New Ingredient</h3>
          <form onSubmit={handleAddItem} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Ingredient name *"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
                required
              />
              <input
                type="text"
                placeholder="Quantity (optional)"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
              />
              <input
                type="text"
                placeholder="Unit (e.g., cups, kg)"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
              />
            </div>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Add to Pantry
            </button>
          </form>
        </div>
      )}

      {/* Search Bar */}
      {pantryItems.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search your pantry..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 dark:focus:ring-green-500"
          />
        </div>
      )}

      {/* Pantry Items */}
      {filteredItems.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-gray-900 p-4 rounded-lg shadow-md hover:shadow-lg transition"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100 capitalize">
                  {item.name}
                </h3>
                <button
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  ✕
                </button>
              </div>
              
              <div className="flex justify-between items-center">
                <button
                  onClick={() => handleUpdateQuantity(item.id, item.quantity, item.unit)}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-500"
                >
                  <span className="font-medium">
                    {item.quantity} {item.unit}
                  </span> (click to edit)
                </button>
              </div>
              
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Added {item.addedAt?.toDate ? item.addedAt.toDate().toLocaleDateString() : 'recently'}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">
            {searchTerm ? 'No ingredients found matching your search.' : 'Your pantry is empty!'}
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition"
            >
              Add Your First Ingredient
            </button>
          )}
        </div>
      )}

      {/* Stats */}
      {pantryItems.length > 0 && (
        <div className="mt-8 bg-green-50 dark:bg-green-300/30 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-300 mb-2">
            Pantry Stats
          </h3>
          <p className="text-gray-700 dark:text-gray-300">
            You have <strong className="dark:text-green-100">{pantryItems.length}</strong> ingredient{pantryItems.length !== 1 ? 's' : ''} in your pantry
          </p>
        </div>
      )}
    </div>
  );
}

export default Pantry;