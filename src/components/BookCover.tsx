import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Puzzle, Video, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

const BookCover: React.FC = () => {
  const navigate = useNavigate();
  const hideBookCover = useAppStore((state) => state.hideBookCover);
  const [isFlipping, setIsFlipping] = useState(false);
  
  const handleOpenBook = () => {
    setIsFlipping(true);
    
    // Play page turning sound effect
    const pageTurnSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2526/2526-preview.mp3');
    pageTurnSound.volume = 0.4;
    pageTurnSound.play().catch(() => {});
    
    // Navigate after animation completes
    setTimeout(() => {
      hideBookCover();
      navigate('/play-learn');
    }, 1200);
  };

  const letterAnimation = {
    initial: { y: 30, opacity: 0, rotateX: -90 },
    animate: (i: number) => ({
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        delay: i * 0.08,
        duration: 0.6,
        type: "spring",
        stiffness: 100,
      },
    }),
  };

  const symbolAnimation = {
    initial: { scale: 0, rotate: -180, opacity: 0 },
    animate: (i: number) => ({
      scale: 1,
      rotate: 0,
      opacity: 1,
      transition: {
        delay: 1.5 + i * 0.3,
        duration: 0.8,
        type: "spring",
        stiffness: 120,
      },
    }),
  };

  const title = "EduSphere AI";

  return (
    <AnimatePresence>
      <motion.div 
        className="book-cover fixed inset-0 flex items-center justify-center bg-gradient-to-br from-amber-900 via-amber-800 to-amber-900 overflow-hidden"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(139, 69, 19, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(101, 67, 33, 0.4) 0%, transparent 50%),
            linear-gradient(45deg, transparent 30%, rgba(160, 82, 45, 0.1) 50%, transparent 70%),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(139, 69, 19, 0.1) 2px,
              rgba(139, 69, 19, 0.1) 4px
            )
          `,
        }}
      >
        {/* Leather texture overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              radial-gradient(circle at 25% 25%, rgba(101, 67, 33, 0.8) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(139, 69, 19, 0.6) 0%, transparent 50%),
              repeating-linear-gradient(
                45deg,
                transparent,
                transparent 1px,
                rgba(160, 82, 45, 0.2) 1px,
                rgba(160, 82, 45, 0.2) 2px
              )
            `,
          }}
        />

        {/* Stitched edges */}
        <div className="absolute inset-4 border-2 border-dashed border-yellow-600 opacity-40 rounded-lg" />
        <div className="absolute inset-8 border border-yellow-700 opacity-30 rounded-md" />

        {/* Main book content */}
        <motion.div
          className="relative z-10 text-center px-8"
          animate={isFlipping ? {
            rotateY: -180,
            scale: 0.8,
            transition: { duration: 1.2, ease: "easeInOut" }
          } : {}}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Title */}
          <motion.h1 
            className="text-yellow-400 font-serif text-6xl md:text-7xl font-bold mb-8 tracking-wider"
            style={{ 
              textShadow: `
                2px 2px 4px rgba(0,0,0,0.8),
                0 0 20px rgba(255, 215, 0, 0.3),
                0 0 40px rgba(255, 215, 0, 0.1)
              `,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
            }}
          >
            {title.split('').map((char, index) => (
              <motion.span
                key={index}
                className="inline-block"
                custom={index}
                variants={letterAnimation}
                initial="initial"
                animate="animate"
                style={{ transformOrigin: "center bottom" }}
              >
                {char === ' ' ? '\u00A0' : char}
              </motion.span>
            ))}
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-yellow-300 font-serif text-xl md:text-2xl mb-12 opacity-90 tracking-wide"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 2, duration: 0.8 }}
            style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}
          >
            Learn Without Limits
          </motion.p>
          
          {/* Symbol triangle */}
          <div className="relative flex items-center justify-center mb-12">
            {/* Triangle formation of symbols */}
            <div className="relative w-48 h-48">
              {/* Top symbol - Puzzle */}
              <motion.div 
                className="absolute top-0 left-1/2 transform -translate-x-1/2 text-yellow-400 bg-amber-800 p-4 rounded-full shadow-lg border-2 border-yellow-600"
                custom={0}
                variants={symbolAnimation}
                initial="initial"
                animate="animate"
                whileHover={{ 
                  scale: 1.2, 
                  rotate: 360,
                  boxShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
                  transition: { duration: 0.3 }
                }}
              >
                <Puzzle size={32} />
              </motion.div>
              
              {/* Bottom left symbol - Video */}
              <motion.div 
                className="absolute bottom-0 left-0 text-yellow-400 bg-amber-800 p-4 rounded-full shadow-lg border-2 border-yellow-600"
                custom={1}
                variants={symbolAnimation}
                initial="initial"
                animate="animate"
                whileHover={{ 
                  scale: 1.2, 
                  rotate: -360,
                  boxShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
                  transition: { duration: 0.3 }
                }}
              >
                <Video size={32} />
              </motion.div>
              
              {/* Bottom right symbol - Play */}
              <motion.div 
                className="absolute bottom-0 right-0 text-yellow-400 bg-amber-800 p-4 rounded-full shadow-lg border-2 border-yellow-600"
                custom={2}
                variants={symbolAnimation}
                initial="initial"
                animate="animate"
                whileHover={{ 
                  scale: 1.2, 
                  rotate: 360,
                  boxShadow: "0 0 30px rgba(255, 215, 0, 0.6)",
                  transition: { duration: 0.3 }
                }}
              >
                <Play size={32} />
              </motion.div>

              {/* Connecting lines */}
              <motion.div
                className="absolute top-8 left-1/2 w-0.5 h-20 bg-gradient-to-b from-yellow-400 to-transparent transform -translate-x-1/2 rotate-45"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 3, duration: 0.8 }}
              />
              <motion.div
                className="absolute top-8 left-1/2 w-0.5 h-20 bg-gradient-to-b from-yellow-400 to-transparent transform -translate-x-1/2 -rotate-45"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 3.2, duration: 0.8 }}
              />
              <motion.div
                className="absolute bottom-8 left-1/4 w-20 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-400"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 3.4, duration: 0.8 }}
              />
            </div>
          </div>

          {/* Open Book Button */}
          <motion.button
            onClick={handleOpenBook}
            disabled={isFlipping}
            className={`
              relative px-12 py-4 bg-gradient-to-r from-yellow-500 to-yellow-400 
              text-amber-900 font-serif text-xl font-bold rounded-lg 
              shadow-2xl border-2 border-yellow-600 
              transform transition-all duration-300
              ${isFlipping ? 'cursor-not-allowed opacity-50' : 'hover:scale-105 hover:shadow-3xl cursor-pointer'}
            `}
            initial={{ opacity: 0, y: 30, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 3.8, duration: 0.8, type: "spring", stiffness: 100 }}
            whileHover={!isFlipping ? { 
              scale: 1.05,
              boxShadow: "0 20px 40px rgba(0,0,0,0.3), 0 0 30px rgba(255, 215, 0, 0.4)",
              transition: { duration: 0.2 }
            } : {}}
            whileTap={!isFlipping ? { scale: 0.95 } : {}}
            style={{
              textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
              filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'
            }}
          >
            {/* Button glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-yellow-300 to-yellow-200 rounded-lg opacity-0"
              animate={!isFlipping ? {
                opacity: [0, 0.3, 0],
                scale: [1, 1.05, 1],
                transition: { duration: 2, repeat: Infinity }
              } : {}}
            />
            
            <span className="relative z-10">
              {isFlipping ? 'Opening...' : 'Open Book'}
            </span>
            
            {/* Page flip indicator */}
            {!isFlipping && (
              <motion.div
                className="absolute -right-2 top-1/2 transform -translate-y-1/2 text-amber-900"
                animate={{
                  x: [0, 5, 0],
                  transition: { duration: 1.5, repeat: Infinity }
                }}
              >
                📖
              </motion.div>
            )}
          </motion.button>

          {/* Decorative elements */}
          <motion.div
            className="absolute -top-20 -left-20 w-40 h-40 border border-yellow-600 rounded-full opacity-20"
            animate={{
              rotate: 360,
              scale: [1, 1.1, 1],
              transition: { duration: 20, repeat: Infinity, ease: "linear" }
            }}
          />
          <motion.div
            className="absolute -bottom-20 -right-20 w-32 h-32 border border-yellow-600 rounded-full opacity-20"
            animate={{
              rotate: -360,
              scale: [1, 0.9, 1],
              transition: { duration: 15, repeat: Infinity, ease: "linear" }
            }}
          />
        </motion.div>

        {/* Ambient lighting effects */}
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400 rounded-full opacity-5 blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.05, 0.1, 0.05],
            transition: { duration: 4, repeat: Infinity }
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-orange-400 rounded-full opacity-5 blur-3xl"
          animate={{
            scale: [1, 0.8, 1],
            opacity: [0.05, 0.08, 0.05],
            transition: { duration: 6, repeat: Infinity }
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

export default BookCover;