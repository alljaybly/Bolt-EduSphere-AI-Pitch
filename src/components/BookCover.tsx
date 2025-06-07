import React from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Globe2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const BookCover: React.FC = () => {
  const hideBookCover = useAppStore((state) => state.hideBookCover);
  
  const letterAnimation = {
    initial: { y: 20, opacity: 0 },
    animate: (i: number) => ({
      y: 0,
      opacity: 1,
      transition: {
        delay: i * 0.1,
        duration: 0.5,
      },
    }),
  };

  const title = "EduSphere AI: Learn Without Limits";

  return (
    <motion.div 
      className="book-cover fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-book-leather to-book-leatherDark"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      <motion.h1 
        className="text-book-gold font-serif text-5xl font-bold text-center mb-16 px-4"
        style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.3)' }}
      >
        {title.split('').map((char, index) => (
          <motion.span
            key={index}
            className="inline-block"
            custom={index}
            variants={letterAnimation}
            initial="initial"
            animate="animate"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </motion.h1>
      
      <div className="relative flex items-center justify-center gap-16">
        <div className="flex flex-col gap-4">
          <motion.div 
            className="text-book-gold text-3xl"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ 
              opacity: 1,
              rotate: 360
            }}
            transition={{ 
              duration: 20,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            <Globe2 size={40} />
          </motion.div>
          
          <motion.div 
            className="text-book-gold text-3xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <BookOpen size={40} />
          </motion.div>
          
          <motion.div 
            className="text-book-gold text-3xl font-serif"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            π
          </motion.div>
        </div>

        <motion.button
          onClick={hideBookCover}
          className="bg-book-gold text-book-leather font-serif text-lg px-8 py-4 rounded-md cursor-pointer hover:bg-yellow-500 transition-colors duration-300 hover:scale-105 transform"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Enter the Realm of Learning
        </motion.button>
      </div>
    </motion.div>
  );
};

export default BookCover;