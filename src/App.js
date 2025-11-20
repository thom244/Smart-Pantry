import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import SearchResults from './pages/SearchResults';
import RecipeDetail from './components/RecipeDetail';
import RecipeList from './components/RecipeList';
import RecipeForm from './components/RecipeForm';
import Pantry from './pages/Pantry';
import RecipeSuggestions from './pages/RecipeSuggestions';
import MealPlanner from './pages/MealPlanner';
import ImportRecipe from "./pages/ImportRecipe";

function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/recipes" element={<RecipeList />} />
            <Route path="/recipe/:id" element={<RecipeDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/search" element={<SearchResults />} />

            {/* Protected Routes - Require Login */}
            <Route 
              path="/recipe/new" 
              element={
                <ProtectedRoute>
                  <RecipeForm />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/pantry" 
              element={
                <ProtectedRoute>
                  <Pantry />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/recipes/suggestions" 
              element={
                <ProtectedRoute>
                  <RecipeSuggestions />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/import-recipe" 
              element={
                <ProtectedRoute>
                  <ImportRecipe />
                </ProtectedRoute>
              } 
            />
            <Route
              path="/meal-planner"
              element={
                <ProtectedRoute>
                  <MealPlanner />
                </ProtectedRoute>
              }
            />

            {/* Admin Only Route */}
            <Route 
              path="/admin" 
              element={
                <ProtectedRoute adminOnly={true}>
                  <AdminDashboard />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
