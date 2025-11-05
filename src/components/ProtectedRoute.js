import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  
  // Add admin check if needed
  // if (adminOnly && !user.isAdmin) return <Navigate to="/" />;
  
  return children;
};

export default ProtectedRoute;