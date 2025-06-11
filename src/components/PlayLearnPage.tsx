import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Puzzle, 
  Play, 
  Video, 
  X, 
  Check, 
  Volume2,
  VideoIcon,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Drag and drop types
const ItemTypes = {
  BLOCK: 'block'
};

/**
 * Draggable coding block component
 */
const DragBlock = ({ 
  id, 
  type, 
  children 
}: { 
  id: string; 
  type: string; 
  children: React.ReactNode;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { id, type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <motion.div
      ref={drag}
      className={`p-4 rounded-lg transition-all cursor-move ${
        type === 'move' ? 'bg-blue-200' : 
        type === 'jump' ? 'bg-green-200' : 
        'bg-purple-200'
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Drop zone for coding blocks
 */
const DropZone = ({ onDrop }: { onDrop: (item: any) => void }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: (item) => onDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() })
  }));

  return (
    <motion.div
      ref={drop}
      className={`p-6 rounded-lg border-2 border-dashed h-40 flex items-center justify-center transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-yellow-400 bg-yellow-100'
      }`}
      animate={{ 
        borderColor: isOver ? '#60A5FA' : ['#FBBF24', '#F59E0B', '#FBBF24'], 
        transition: { duration: 2, repeat: Infinity } 
      }}
    >
      <p className="text-center font-medium">
        Drop blocks here to build your game!
      </p>
    </motion.div>
  );
};

/**
 * Main PlayLearnPage component
 */
const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [droppedItems, setDroppedItems] = useState<string[]>([]);

  // Sample content data
  const slides = [
    { 
      id: 1, 
      content: '🐘 Elephant (Gray)', 
      color: 'gray',
      narration: 'This is a big gray elephant!'
    },
    { 
      id: 2, 
      content: '🔴 Red Circle', 
      color: 'red',
      narration: 'Look at this beautiful red circle!'
    },
    { 
      id: 3, 
      content: '🔵 Blue Square', 
      color: 'blue',
      narration: 'Here we have a blue square shape!'
    }
  ];

  const videoTopics = [
    { 
      id: 1, 
      topic: 'Numbers 1-10', 
      emoji: '🔢',
      videoUrl: 'https://example.com/numbers-video'
    },
    { 
      id: 2, 
      topic: 'Alphabet A-Z', 
      emoji: '📖',
      videoUrl: 'https://example.com/alphabet-video'
    }
  ];

  const codingBlocks = [
    { id: 'move', type: 'move', text: 'Move Forward' },
    { id: 'jump', type: 'jump', text: 'Jump Block' },
    { id: 'loop', type: 'loop', text: 'Repeat Loop' },
    { id: 'condition', type: 'condition', text: 'If Statement' }
  ];

  /**
   * Handle drop event for coding blocks
   */
  const handleDrop = (item: any) => {
    setDroppedItems((prev) => [...prev, item.type]);
  };

  /**
   * Handle narration using browser's speech synthesis
   */
  const handleNarration = (text: string) => {
    try {
      // Use browser's speech synthesis as a simple solution
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      alert(`Would say: "${text}"`);
    }
  };

  /**
   * Handle video generation (placeholder)
   */
  const handleVideoGeneration = (topic: string) => {
    alert(`Generating educational video for: ${topic}\n(This is a demo placeholder)`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100 p-6">
      {/* Header with back button */}
      <div className="flex justify-between items-center mb-6">
        <motion.button
          className="flex items-center bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Book
        </motion.button>
      </div>

      <h1 className="font-serif text-4xl text-blue-800 text-center mb-8">Play & Learn</h1>

      {/* Picture Slides Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Puzzle size={24} className="mr-2" /> Picture Slides
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slides.map((slide) => (
            <SlideCard 
              key={slide.id} 
              slide={slide} 
              onNarration={handleNarration} 
            />
          ))}
        </div>
      </motion.section>

      {/* Learning Videos Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Video size={24} className="mr-2" /> Learning Videos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videoTopics.map((topic) => (
            <VideoCard 
              key={topic.id} 
              topic={topic} 
              onVideoGeneration={handleVideoGeneration} 
            />
          ))}
        </div>
      </motion.section>

      {/* Drag & Drop Coding Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Play size={24} className="mr-2" /> Drag & Drop Coding
        </h2>
        
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coding blocks */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Blocks:</h3>
              <div className="grid grid-cols-2 gap-4">
                {codingBlocks.map((block) => (
                  <DragBlock 
                    key={block.id} 
                    id={block.id} 
                    type={block.type}
                  >
                    {block.text}
                  </DragBlock>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Build Your Program:</h3>
              <DropZone onDrop={handleDrop} />
              
              {droppedItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h4 className="font-semibold mb-2">Your Program:</h4>
                  <div className="space-y-2">
                    {droppedItems.map((item, index) => (
                      <div key={index} className="bg-white p-2 rounded border">
                        {index + 1}. {item.charAt(0).toUpperCase() + item.slice(1)} Block
                      </div>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => setDroppedItems([])}
                    className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Clear Program
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </DndProvider>
      </motion.section>
    </div>
  );
};

/**
 * Individual slide card component
 */
const SlideCard = ({ 
  slide, 
  onNarration 
}: { 
  slide: any; 
  onNarration: (text: string) => void;
}) => (
  <motion.div
    className={`bg-${slide.color}-200 p-6 rounded-lg text-center relative overflow-hidden`}
    animate={{ rotate: [0, 2, -2, 0], transition: { duration: 4, repeat: Infinity } }}
    whileHover={{ scale: 1.05 }}
  >
    <p className="font-bold text-lg mb-4">{slide.content}</p>
    <motion.button
      onClick={() => onNarration(slide.narration)}
      className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Volume2 size={16} className="mr-2" />
      <span className="text-sm font-medium">Listen</span>
    </motion.button>
  </motion.div>
);

/**
 * Individual video card component
 */
const VideoCard = ({ 
  topic, 
  onVideoGeneration 
}: { 
  topic: any; 
  onVideoGeneration: (topic: string) => void;
}) => (
  <motion.div
    className="bg-purple-200 p-6 rounded-lg text-center relative overflow-hidden"
    animate={{ y: [0, -5, 0], transition: { duration: 3, repeat: Infinity } }}
    whileHover={{ scale: 1.05 }}
  >
    <div className="text-4xl mb-4">{topic.emoji}</div>
    <p className="font-bold text-lg mb-4">{topic.topic}</p>
    <motion.button
      onClick={() => onVideoGeneration(topic.topic)}
      className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <VideoIcon size={16} className="mr-2" />
      <span className="text-sm font-medium">Generate Video</span>
    </motion.button>
  </motion.div>
);

export default PlayLearnPage;