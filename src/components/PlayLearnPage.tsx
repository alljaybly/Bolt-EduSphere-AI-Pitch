import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Puzzle, Play, Video } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ItemTypes = {
  BLOCK: 'block'
};

const DragBlock = ({ id, type, children }: { id: string; type: string; children: React.ReactNode }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { id, type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() })
  }));

  return (
    <motion.div
      ref={drag}
      className={`bg-${type === 'move' ? 'blue' : 'green'}-200 p-4 rounded-lg cursor-move`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.div>
  );
};

const DropZone = ({ onDrop }: { onDrop: (item: any) => void }) => {
  const [, drop] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: (item) => onDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() })
  }));

  return (
    <motion.div
      ref={drop}
      className="bg-yellow-100 p-6 rounded-lg border-2 border-dashed border-yellow-400 h-40 flex items-center justify-center"
      animate={{ borderColor: ['#FBBF24', '#F59E0B', '#FBBF24'], transition: { duration: 2, repeat: Infinity } }}
    >
      Drop blocks here to build your game!
    </motion.div>
  );
};

const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  const [droppedItems, setDroppedItems] = useState<string[]>([]);

  const handleDrop = (item: any) => {
    setDroppedItems((prev) => [...prev, item.type]);
  };

  const slides = [
    { id: 1, content: '🐘 Elephant (Gray)', color: 'gray' },
    { id: 2, content: '🔴 Red Circle', color: 'red' },
    { id: 3, content: '🔵 Blue Square', color: 'blue' }
  ];

  const videoTopics = [
    { id: 1, topic: 'Numbers 1-10', emoji: '🔢' },
    { id: 2, topic: 'Alphabet A-Z', emoji: '📖' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100 p-6">
      <motion.button
        className="mb-4 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => navigate('/')}
      >
        Back to Book
      </motion.button>

      <h1 className="font-serif text-4xl text-blue-800 text-center mb-6">Play & Learn</h1>

      {/* Picture Slides */}
      <motion.section
        className="bg-white p-4 rounded-lg shadow-lg mb-6"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-4 flex items-center">
          <Puzzle size={24} className="mr-2" /> Picture Slides
        </h2>
        <div className="flex overflow-x-auto space-x-4 pb-4">
          {slides.map((slide) => (
            <motion.div
              key={slide.id}
              className={`bg-${slide.color}-200 p-4 rounded-lg min-w-[200px] text-center`}
              animate={{ rotate: [0, 5, -5, 0], transition: { duration: 2, repeat: Infinity } }}
            >
              <p className="font-bold">{slide.content}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Learning Videos */}
      <motion.section
        className="bg-white p-4 rounded-lg shadow-lg mb-6"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-4 flex items-center">
          <Video size={24} className="mr-2" /> Learning Videos
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {videoTopics.map((topic) => (
            <motion.div
              key={topic.id}
              className="bg-purple-200 p-3 rounded-lg text-center"
              animate={{ y: [0, -10, 0], transition: { duration: 2, repeat: Infinity } }}
            >
              <p className="font-bold">{topic.emoji} {topic.topic}</p>
              <p className="text-sm text-gray-600">Add YouTube URL here manually</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Drag & Drop Coding */}
      <motion.section
        className="bg-white p-4 rounded-lg shadow-lg"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-4 flex items-center">
          <Play size={24} className="mr-2" /> Drag & Drop Coding
        </h2>
        <DndProvider backend={HTML5Backend}>
          <div className="flex space-x-4 mb-4">
            <DragBlock id="1" type="move">Move Block</DragBlock>
            <DragBlock id="2" type="jump">Jump Block</DragBlock>
          </div>
          <DropZone onDrop={handleDrop} />
          <div className="mt-4">
            <p>Dropped: {droppedItems.join(', ')}</p>
          </div>
        </DndProvider>
      </motion.section>
    </div>
  );
};

export default PlayLearnPage;