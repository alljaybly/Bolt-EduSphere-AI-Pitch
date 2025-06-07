import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Route, Routes, useLocation } from 'react-router-dom';
import Book from './components/Book';
import BookCover from './components/BookCover';
import PlayLearnPage from './components/PlayLearnPage';
import { useAppStore } from './store/useAppStore';

function App() {
  const showBookCover = useAppStore((state) => state.showBookCover);
  const location = useLocation();

  return (
    <div className="app min-h-screen bg-gradient-to-b from-secondary-100 to-secondary-200">
      <AnimatePresence mode="wait">
        {showBookCover ? (
          <BookCover />
        ) : (
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="book-open h-screen w-full flex justify-center items-center"
              >
                <Book />
              </motion.div>
            } />
            <Route path="/play-learn" element={<PlayLearnPage />} />
          </Routes>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;