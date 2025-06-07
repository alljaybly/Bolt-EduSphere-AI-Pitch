import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import BookContent from './BookContent';
import { useAppStore } from '../store/useAppStore';

const Book: React.FC = () => {
  const showBookCover = useAppStore((state) => state.showBookCover);
  
  return (
    <div className="book-container w-full h-screen overflow-hidden bg-secondary-50">
      <AnimatePresence mode="wait">
        {!showBookCover && (
          <motion.div 
            initial={{ opacity: 0, rotateY: -180 }}
            animate={{ opacity: 1, rotateY: 0 }}
            exit={{ opacity: 0, rotateY: 180 }}
            transition={{ duration: 1, type: "spring", stiffness: 50 }}
            className="book-open h-full w-full flex justify-center items-center"
            style={{ perspective: "1000px" }}
          >
            <BookContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Book;