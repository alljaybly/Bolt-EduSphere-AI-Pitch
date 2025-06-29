import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import Book from './components/Book';
import BookCover from './components/BookCover';
import PlayLearnPage from './components/PlayLearnPage.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import ARProblem from './components/ARProblem';
import Login from './components/Login';
import LiveCode from './components/LiveCode';
import StoryMode from './components/StoryMode';
import { useAppStore } from './store/useAppStore';

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || 'https://your-sentry-dsn@sentry.io/project-id',
  environment: import.meta.env.MODE || 'development',
  integrations: [
    new Sentry.BrowserTracing({
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        useLocation,
      ),
    }),
  ],
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out non-critical errors in development
    if (import.meta.env.MODE === 'development') {
      return event.level === 'error' ? event : null;
    }
    return event;
  },
});

function App() {
  const showBookCover = useAppStore((state) => state.showBookCover);
  const location = useLocation();

  // Initialize error boundary and performance monitoring
  useEffect(() => {
    // Set user context for Sentry
    Sentry.setUser({
      id: localStorage.getItem('edusphere_user_id') || 'anonymous',
      username: '',
    });

    // Add global error handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      Sentry.captureException(event.reason);
    };

    const handleError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      Sentry.captureException(event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  return (
    <Sentry.ErrorBoundary 
      fallback={({ error, resetError }) => (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">Oops! Something went wrong</h2>
            <p className="text-gray-600 mb-4">We're sorry for the inconvenience. Please try refreshing the page.</p>
            <button
              onClick={resetError}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Try Again
            </button>
            {import.meta.env.MODE === 'development' && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer text-sm text-gray-500">Error Details</summary>
                <pre className="mt-2 text-xs text-red-600 overflow-auto">{error.toString()}</pre>
              </details>
            )}
          </div>
        </div>
      )}
      showDialog
    >
      <div className="app min-h-screen bg-gradient-to-b from-secondary-100 to-secondary-200">
        <AnimatePresence mode="wait">
          {showBookCover ? (
            <motion.div
              key="book-cover"
              initial={{ opacity: 1 }}
              exit={{ 
                opacity: 0,
                scale: 0.8,
                rotateY: -180,
                transition: { 
                  duration: 1.2, 
                  ease: "easeInOut" 
                }
              }}
              className="fixed inset-0 z-50"
            >
              <BookCover />
            </motion.div>
          ) : (
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={
                <motion.div 
                  key="main-book"
                  initial={{ 
                    opacity: 0, 
                    scale: 0.8,
                    rotateY: 180 
                  }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    rotateY: 0 
                  }}
                  exit={{ 
                    opacity: 0,
                    scale: 0.9,
                    transition: { duration: 0.5 }
                  }}
                  transition={{ 
                    duration: 1.2, 
                    ease: "easeInOut",
                    delay: 0.2 
                  }}
                  className="book-open h-screen w-full flex justify-center items-center"
                  style={{ transformStyle: "preserve-3d" }}
                >
                  <Book />
                </motion.div>
              } />
              <Route path="/play-learn" element={
                <motion.div
                  key="play-learn"
                  initial={{ 
                    opacity: 0, 
                    x: 100,
                    scale: 0.95 
                  }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    scale: 1 
                  }}
                  exit={{ 
                    opacity: 0, 
                    x: -100,
                    scale: 0.95,
                    transition: { duration: 0.4 }
                  }}
                  transition={{ 
                    duration: 0.6, 
                    ease: "easeOut" 
                  }}
                  className="min-h-screen"
                >
                  <PlayLearnPage />
                </motion.div>
              } />
              <Route path="/teacher-dashboard" element={
                <motion.div
                  key="teacher-dashboard"
                  initial={{ 
                    opacity: 0, 
                    y: 50,
                    scale: 0.95 
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: 1 
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -50,
                    scale: 0.95,
                    transition: { duration: 0.4 }
                  }}
                  transition={{ 
                    duration: 0.6, 
                    ease: "easeOut" 
                  }}
                  className="min-h-screen"
                >
                  <TeacherDashboard />
                </motion.div>
              } />
              <Route path="/ar-problems" element={
                <motion.div
                  key="ar-problems"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.5 }}
                  className="min-h-screen"
                >
                  <ARProblem />
                </motion.div>
              } />
              <Route path="/login" element={
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="min-h-screen"
                >
                  <Login />
                </motion.div>
              } />
              <Route path="/live-code" element={
                <motion.div
                  key="live-code"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.5 }}
                  className="min-h-screen"
                >
                  <LiveCode />
                </motion.div>
              } />
              <Route path="/story-mode" element={
                <motion.div
                  key="story-mode"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.6 }}
                  className="min-h-screen"
                >
                  <StoryMode />
                </motion.div>
              } />
            </Routes>
          )}
        </AnimatePresence>
      </div>
    </Sentry.ErrorBoundary>
  );
}

export default Sentry.withSentryRouting(App);