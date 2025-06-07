import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';

const ProgressTracker: React.FC = () => {
  const { currentSubject, currentGrade } = useAppStore();
  const [progress, setProgress] = useState(0);
  const userId = 'user123'; // Placeholder for real user auth

  useEffect(() => {
    const saveProgress = async () => {
      try {
        await fetch('/.netlify/functions/saveProgress', {
          method: 'POST',
          body: JSON.stringify({ userId, subject: currentSubject, grade: currentGrade, progress })
        });
      } catch (err) {
        console.error('Failed to save progress');
      }
    };
    if (progress > 0) saveProgress();
  }, [progress, currentSubject, currentGrade]);

  return (
    <motion.div
      className="progress-tracker p-4 bg-white/60 rounded-lg shadow-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h3 className="font-serif text-lg text-book-leather mb-2">Your Progress</h3>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <motion.div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 1 }}
        />
      </div>
      <button
        className="mt-2 bg-blue-500 text-white px-2 py-1 rounded"
        onClick={() => setProgress((prev) => Math.min(prev + 10, 100))}
      >
        Update Progress
      </button>
    </motion.div>
  );
};

export default ProgressTracker;