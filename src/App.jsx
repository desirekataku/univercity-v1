import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';

// Lazy loading des pages
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const FeedPage = lazy(() => import('./pages/FeedPage'));
const ExplorePage = lazy(() => import('./pages/ExplorePage'));
const GroupPage = lazy(() => import('./pages/GroupPage'));
const CreateGroupPage = lazy(() => import('./pages/CreateGroupPage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const EventsPage = lazy(() => import('./pages/EventsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

const Loading = () => (
  <div className="loading-spinner">
    <div className="spinner"></div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            {/* Routes publiques */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />

            {/* Routes protégées */}
            <Route path="/feed" element={
              <ProtectedRoute>
                <><Navbar /><FeedPage /></>
              </ProtectedRoute>
            } />
            <Route path="/explore" element={
              <ProtectedRoute>
                <><Navbar /><ExplorePage /></>
              </ProtectedRoute>
            } />
            <Route path="/group/:id" element={
              <ProtectedRoute>
                <><Navbar /><GroupPage /></>
              </ProtectedRoute>
            } />
            <Route path="/create-group" element={
              <ProtectedRoute>
                <><Navbar /><CreateGroupPage /></>
              </ProtectedRoute>
            } />
            <Route path="/messages" element={
              <ProtectedRoute>
                <MessagesPage />
              </ProtectedRoute>
            } />
            <Route path="/events" element={
              <ProtectedRoute>
                <><Navbar /><EventsPage /></>
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <><Navbar /><ProfilePage /></>
              </ProtectedRoute>
            } />
            <Route path="/profile/:userId" element={
              <ProtectedRoute>
                <><Navbar /><ProfilePage /></>
              </ProtectedRoute>
            } />

            {/* 404 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;

