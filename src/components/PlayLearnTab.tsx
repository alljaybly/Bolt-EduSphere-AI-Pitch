import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Puzzle, Video, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const PlayLearnTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [draggedBlock, setDraggedBlock] = useState<string | null>(null);

  const slides = [
    { 
      title: 'Animals', 
      image: 'https://images.pexels.com/photos/145939/pexels-photo-145939.jpeg', 
      description: 'Learn about different animals',
      animation: {
        character: '🦁',
        sound: 'Roar!'
      }
    },
    { 
      title: 'Colors', 
      image: 'https://images.pexels.com/photos/1209843/pexels-photo-1209843.jpeg', 
      description: 'Explore the rainbow',
      animation: {
        character: '🌈',
        sound: 'Wow!'
      }
    },
    { 
      title: 'Shapes', 
      image: 'https://images.pexels.com/photos/2988232/pexels-photo-2988232.jpeg', 
      description: 'Discover geometric shapes',
      animation: {
        character: '⭐',
        sound: 'Pop!'
      }
    }
  ];

  const codingBlocks = [
    { id: 'move', color: 'bg-blue-400', text: 'Move Forward' },
    { id: 'turn', color: 'bg-green-400', text: 'Turn Right' },
    { id: 'jump', color: 'bg-yellow-400', text: 'Jump' }
  ];

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    playSlideSound(slides[(currentSlide + 1) % slides.length].animation.sound);
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    playSlideSound(slides[(currentSlide - 1 + slides.length) % slides.length].animation.sound);
  };

  const playSlideSound = (sound: string) => {
    const utterance = new SpeechSynthesisUtterance(sound);
    utterance.pitch = 1.5; // Higher pitch for child-friendly voice
    utterance.rate = 0.9; // Slightly slower rate
    window.speechSynthesis.speak(utterance);
  };

  const floatingAnimation = {
    y: [0, -10, 0],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        staggerChildren: 0.1
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      transition: {
        duration: 0.3
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: {
      opacity: 1,
      x: 0,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <motion.div
      className="play-learn-tab bg-white/80 rounded-lg p-6 shadow-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div 
        className="flex items-center justify-center mb-6"
        animate={floatingAnimation}
      >
        <Star className="text-yellow-400 mr-2" size={28} />
        <h2 className="font-serif text-2xl text-book-leather text-center">
          Play & Learn
        </h2>
        <Star className="text-yellow-400 ml-2" size={28} />
      </motion.div>

      <AnimatePresence mode="wait">
        {activeSection === null ? (
          <motion.div 
            className="grid grid-cols-1 gap-6"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <motion.div 
              className="bg-gradient-to-r from-blue-400 to-blue-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03,
                transition: { duration: 0.2 }
              }}
              onClick={() => setActiveSection('slides')}
            >
              <div className="flex items-center mb-3">
                <motion.div animate={floatingAnimation}>
                  <Play className="text-white mr-3" size={24} />
                </motion.div>
                <h3 className="font-serif text-xl text-white">Picture Slides</h3>
              </div>
              <p className="text-sm text-white/90">
                Explore animals, shapes, and colors with interactive slides!
              </p>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-r from-green-400 to-green-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03,
                transition: { duration: 0.2 }
              }}
              onClick={() => setActiveSection('videos')}
            >
              <div className="flex items-center mb-3">
                <motion.div animate={floatingAnimation}>
                  <Video className="text-white mr-3" size={24} />
                </motion.div>
                <h3 className="font-serif text-xl text-white">Learning Videos</h3>
              </div>
              <p className="text-sm text-white/90">
                Watch fun videos about numbers and letters!
              </p>
            </motion.div>

            <motion.div 
              className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 rounded-xl shadow-md hover:shadow-lg transition-all"
              variants={itemVariants}
              whileHover={{ 
                scale: 1.03,
                transition: { duration: 0.2 }
              }}
              onClick={() => setActiveSection('coding')}
            >
              <div className="flex items-center mb-3">
                <motion.div animate={floatingAnimation}>
                  <Puzzle className="text-white mr-3" size={24} />
                </motion.div>
                <h3 className="font-serif text-xl text-white">Drag & Drop Coding</h3>
              </div>
              <p className="text-sm text-white/90">
                Build your own game by moving blocks around!
              </p>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <motion.button 
              onClick={() => setActiveSection(null)}
              className="mb-6 text-primary-600 hover:text-primary-800 transition-colors flex items-center bg-white/50 px-4 py-2 rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ChevronLeft size={20} className="mr-1" />
              Back to Fun Activities
            </motion.button>

            {activeSection === 'slides' && (
              <div className="relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide}
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    className="rounded-xl overflow-hidden aspect-video relative"
                  >
                    <img 
                      src={slides[currentSlide].image} 
                      alt={slides[currentSlide].title}
                      className="w-full h-full object-cover"
                    />
                    <motion.div 
                      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent text-white p-6"
                      initial={{ y: 50 }}
                      animate={{ y: 0 }}
                    >
                      <div className="flex items-center">
                        <motion.span 
                          className="text-4xl mr-3"
                          animate={floatingAnimation}
                        >
                          {slides[currentSlide].animation.character}
                        </motion.span>
                        <div>
                          <h4 className="text-2xl font-serif mb-1">{slides[currentSlide].title}</h4>
                          <p className="text-lg">{slides[currentSlide].description}</p>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                </AnimatePresence>

                <motion.button
                  onClick={handlePrevSlide}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronLeft size={24} className="text-primary-600" />
                </motion.button>
                <motion.button
                  onClick={handleNextSlide}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 p-3 rounded-full shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ChevronRight size={24} className="text-primary-600" />
                </motion.button>
              </div>
            )}

            {activeSection === 'videos' && (
              <motion.div 
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="font-serif text-2xl text-book-leather mb-6">Fun Learning Videos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['Numbers', 'Letters', 'Colors', 'Animals'].map((topic, index) => (
                    <motion.div
                      key={topic}
                      className="bg-white/50 p-4 rounded-xl shadow-md"
                      variants={itemVariants}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="aspect-video bg-gradient-to-br from-primary-100 to-primary-200 rounded-lg flex items-center justify-center">
                        <motion.div
                          animate={floatingAnimation}
                          className="text-4xl"
                        >
                          {['1️⃣', '🔤', '🌈', '🦁'][index]}
                        </motion.div>
                      </div>
                      <h4 className="text-lg font-serif mt-3 text-center">{topic}</h4>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {activeSection === 'coding' && (
              <motion.div 
                className="space-y-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <h3 className="font-serif text-2xl text-book-leather mb-6">Build Your Game!</h3>
                
                <div className="flex gap-6">
                  <div className="w-1/2">
                    <h4 className="font-serif text-lg mb-3">Blocks:</h4>
                    <div className="space-y-3">
                      {codingBlocks.map((block) => (
                        <motion.div
                          key={block.id}
                          className={`${block.color} p-4 rounded-lg cursor-move shadow-md`}
                          drag
                          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                          whileHover={{ scale: 1.05 }}
                          whileDrag={{ scale: 1.1 }}
                          onDragStart={() => setDraggedBlock(block.id)}
                        >
                          <p className="text-white font-medium text-center">{block.text}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  
                  <motion.div 
                    className="w-1/2 bg-gray-100 rounded-lg p-4"
                    animate={{
                      backgroundColor: draggedBlock ? "#e5e7eb" : "#f3f4f6"
                    }}
                  >
                    <h4 className="font-serif text-lg mb-3">Drop Here:</h4>
                    <div className="h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                      <p className="text-gray-500">Drag blocks here to build your game!</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default PlayLearnTab;