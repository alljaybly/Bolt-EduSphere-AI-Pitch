import React from 'react';
import { motion } from 'framer-motion';
import { Award, Calendar, CheckCircle, XCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { SubjectType } from '../types';

const subjectColors: Record<SubjectType, string> = {
  math: 'bg-blue-500',
  physics: 'bg-purple-500',
  science: 'bg-green-500',
  english: 'bg-yellow-500',
  history: 'bg-red-500',
  geography: 'bg-orange-500',
  coding: 'bg-teal-500'
};

const ProgressTracker: React.FC = () => {
  const { userProgress, currentSubject } = useAppStore();
  
  // Format timestamp to readable date
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };
  
  // Calculate overall accuracy percentage
  const overallAccuracy = userProgress.totalAttempted > 0
    ? ((userProgress.totalCorrect / userProgress.totalAttempted) * 100).toFixed(1)
    : '0.0';
    
  // Get subject-specific accuracy
  const subjectAccuracy = currentSubject && userProgress.bySubject[currentSubject].totalAttempted > 0
    ? ((userProgress.bySubject[currentSubject].totalCorrect / userProgress.bySubject[currentSubject].totalAttempted) * 100).toFixed(1)
    : '0.0';
  
  return (
    <motion.div 
      className="progress-tracker bg-white/80 rounded-lg p-6 shadow-page"
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl text-book-leather">Progress Tracker</h2>
        <Award className="text-book-gold" size={24} />
      </div>
      
      <div className="stats-overview mb-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-primary-50 p-3 rounded-md border border-primary-100">
            <p className="text-sm text-primary-600 mb-1">Total Problems</p>
            <p className="font-serif text-2xl text-book-leather">{userProgress.totalAttempted}</p>
          </div>
          
          <div className="bg-accent-50 p-3 rounded-md border border-accent-100">
            <p className="text-sm text-accent-600 mb-1">Overall Accuracy</p>
            <p className="font-serif text-2xl text-book-leather">{overallAccuracy}%</p>
          </div>
        </div>
        
        {currentSubject && (
          <div className="current-subject-stats bg-secondary-50 p-3 rounded-md border border-secondary-100">
            <p className="text-sm text-secondary-600 mb-1">
              {currentSubject.charAt(0).toUpperCase() + currentSubject.slice(1)} Accuracy
            </p>
            <div className="w-full bg-secondary-200 rounded-full h-2.5 mb-1">
              <div 
                className={`h-2.5 rounded-full ${subjectColors[currentSubject]}`} 
                style={{ width: `${subjectAccuracy}%` }}
              ></div>
            </div>
            <p className="text-xs text-right text-secondary-600">{subjectAccuracy}%</p>
          </div>
        )}
      </div>
      
      <div className="recent-activity">
        <div className="flex items-center mb-3">
          <Calendar size={16} className="text-book-leather mr-2" />
          <h3 className="font-serif text-lg text-book-leather">Recent Activity</h3>
        </div>
        
        {userProgress.recentAttempts.length > 0 ? (
          <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
            {userProgress.recentAttempts.map((attempt, index) => (
              <motion.div 
                key={index} 
                className="bg-white p-3 rounded-md border border-secondary-100 shadow-sm"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="flex items-start">
                  <div className="mt-1 mr-2">
                    {attempt.correct 
                      ? <CheckCircle size={16} className="text-green-500" /> 
                      : <XCircle size={16} className="text-red-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-serif text-book-leather mb-1">
                      <span className={`inline-block px-2 py-0.5 rounded mr-1 text-xs text-white ${subjectColors[attempt.subject]}`}>
                        {attempt.subject}
                      </span>
                      {attempt.question.length > 70 
                        ? attempt.question.substring(0, 70) + '...' 
                        : attempt.question}
                    </p>
                    <div className="flex justify-between items-center text-xs text-secondary-600">
                      <span>{formatDate(attempt.timestamp)}</span>
                      <span>{attempt.correct ? 'Correct' : 'Incorrect'}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-secondary-50 p-4 rounded-md text-center">
            <p className="text-secondary-600 text-sm">
              No activity yet. Start solving problems to see your progress!
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default ProgressTracker;