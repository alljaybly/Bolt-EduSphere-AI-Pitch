import React from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/useAppStore';
import SubjectSelector from './SubjectSelector';
import ProblemGenerator from './ProblemGenerator';
import ProgressTracker from './ProgressTracker';
import MatricTab from './MatricTab.tsx';
import PromptMasterTab from './PromptMasterTab';
import CodingEducation from './CodingEducation';
import PlayLearnTab from './PlayLearnTab';
import TabSelector from './TabSelector';

const BookContent: React.FC = () => {
  const { 
    currentSubject, 
    currentGrade,
    activeTab
  } = useAppStore();

  const pageVariants = {
    initial: { rotateY: -180, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: 180, opacity: 0 }
  };

  const pageTransition = {
    type: "spring",
    stiffness: 50,
    damping: 20
  };

  return (
    <div className="book-content flex h-[90vh] w-[95vw] max-w-[1400px] overflow-hidden perspective-1000">
      {/* Left Page */}
      <motion.div 
        className="left-page w-1/2 h-full bg-gradient-to-b from-book-parchment to-book-parchmentDark p-8 overflow-y-auto"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ ...pageTransition, delay: 0.2 }}
        style={{ 
          borderRight: '2px solid #FFD700',
          boxShadow: '2px 0 5px rgba(0,0,0,0.1)',
          transformOrigin: 'left'
        }}
      >
        <h1 className="font-serif text-3xl text-book-leather text-center mb-6">
          EduSphere AI
        </h1>
        
        <SubjectSelector />
        
        {activeTab === 'main' && currentSubject && currentGrade && (
          currentSubject === 'coding' ? (
            <CodingEducation />
          ) : (
            <ProblemGenerator />
          )
        )}
        
        {activeTab === 'matric' && (
          <MatricTab />
        )}
        
        {activeTab === 'promptmaster' && (
          <PromptMasterTab />
        )}
        
        {activeTab === 'playlearn' && currentGrade === 'kindergarten' && (
          <PlayLearnTab />
        )}
      </motion.div>
      
      {/* Right Page */}
      <motion.div 
        className="right-page w-1/2 h-full bg-gradient-to-b from-book-parchment to-book-parchmentDark p-8 overflow-y-auto"
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ ...pageTransition, delay: 0.4 }}
        style={{ 
          borderLeft: '2px solid #FFD700',
          boxShadow: '-2px 0 5px rgba(0,0,0,0.1)',
          transformOrigin: 'right'
        }}
      >
        <TabSelector />
        
        <div className="mt-6">
          {activeTab === 'main' && <ProgressTracker />}
          {(activeTab === 'matric' || activeTab === 'promptmaster' || activeTab === 'playlearn') && (
            <div className="bg-white/60 p-4 rounded-lg shadow-sm">
              <p className="font-serif text-book-leather text-lg">
                Continue your learning journey on the left page!
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default BookContent;