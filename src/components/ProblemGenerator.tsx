import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, ArrowRight, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const ProblemGenerator: React.FC = () => {
  const { 
    currentSubject, 
    currentGrade, 
    currentProblem, 
    showHint,
    toggleHint, 
    generateNewProblem,
    userAnswer,
    setUserAnswer,
    checkAnswer,
    isCorrect
  } = useAppStore();
  
  const [submitted, setSubmitted] = useState(false);
  
  useEffect(() => {
    if (currentSubject && currentGrade && !currentProblem) {
      generateNewProblem();
    }
  }, [currentSubject, currentGrade, currentProblem, generateNewProblem]);
  
  const handleSubmitAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    checkAnswer();
    setSubmitted(true);
  };
  
  const handleNextProblem = () => {
    setSubmitted(false);
    generateNewProblem();
  };
  
  // If we don't have a problem yet, show loading state
  if (!currentProblem) {
    return (
      <motion.div 
        className="bg-white/80 rounded-lg p-6 shadow-page"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
        </div>
        <p className="text-center font-serif text-book-leather">Generating a problem for you...</p>
      </motion.div>
    );
  }
  
  // Show multiple choice if options are available
  const hasOptions = currentProblem.options && Array.isArray(currentProblem.options) && currentProblem.options.length > 0;
  
  return (
    <motion.div 
      className="bg-white/80 rounded-lg p-6 shadow-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      key={currentProblem.id}
    >
      <div className="problem-container">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-serif text-xl text-book-leather">Problem:</h2>
          <motion.button
            onClick={toggleHint}
            className="flex items-center text-accent-600 hover:text-accent-800"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Lightbulb size={18} className="mr-1" />
            <span className="text-sm">{showHint ? 'Hide Hint' : 'Show Hint'}</span>
          </motion.button>
        </div>
        
        <div className="bg-secondary-50 p-4 rounded-md mb-4 border border-secondary-200">
          <p className="font-serif text-lg text-book-leather">{currentProblem.question}</p>
        </div>
        
        {showHint && currentProblem.hint && (
          <motion.div 
            className="hint-container bg-primary-50 p-3 rounded-md mb-4 border border-primary-200"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <p className="text-sm italic text-book-leather">{currentProblem.hint}</p>
          </motion.div>
        )}
        
        {!submitted ? (
          <form onSubmit={handleSubmitAnswer}>
            {hasOptions ? (
              <div className="options-container space-y-2 mb-4">
                {currentProblem.options?.map((option, index) => (
                  <div key={index} className="option">
                    <label className="flex items-center space-x-2 cursor-pointer p-2 hover:bg-secondary-50 rounded">
                      <input
                        type="radio"
                        name="answer"
                        value={option}
                        checked={userAnswer === option}
                        onChange={() => setUserAnswer(option)}
                        className="form-radio text-primary-600 focus:ring-primary-500 h-4 w-4"
                      />
                      <span className="font-serif">{option}</span>
                    </label>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mb-4">
                <label htmlFor="answer" className="block text-sm font-serif text-book-leather mb-1">
                  Your Answer:
                </label>
                <input
                  type="text"
                  id="answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  className="w-full p-2 border border-secondary-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="Enter your answer..."
                  required
                />
              </div>
            )}
            
            <motion.button
              type="submit"
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!userAnswer}
            >
              <span className="mr-2">Submit Answer</span>
              <ArrowRight size={16} />
            </motion.button>
          </form>
        ) : (
          <div className="results-container">
            <div className={`result-message p-3 rounded-md mb-4 ${
              isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <p className="font-serif text-lg">
                {isCorrect ? 'Correct! Well done!' : 'Not quite right.'}
              </p>
              {!isCorrect && (
                <p className="mt-1">
                  The correct answer is: <span className="font-bold">{currentProblem.answer}</span>
                </p>
              )}
            </div>
            
            <motion.button
              onClick={handleNextProblem}
              className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RotateCcw size={16} className="mr-2" />
              <span>Try Another Problem</span>
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProblemGenerator;