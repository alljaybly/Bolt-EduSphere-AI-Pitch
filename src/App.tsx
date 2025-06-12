import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import Book from './components/Book';
import BookCover from './components/BookCover';
import PlayLearnPage from './components/PlayLearnPage.tsx';
import TeacherDashboard from './components/TeacherDashboard.tsx';
import { useAppStore } from './store/useAppStore';

function App() {
  const showBookCover = useAppStore((state) => state.showBookCover);
  const location = useLocation();

  return (
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
          </Routes>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;