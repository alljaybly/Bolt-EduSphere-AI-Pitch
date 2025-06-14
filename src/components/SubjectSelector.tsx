import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { SubjectType, GradeType } from '../types';
import { 
  Calculator, 
  Atom, 
  Microscope, 
  BookText, 
  Clock, 
  Globe2, 
  Code 
} from 'lucide-react';

const SubjectSelector: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { 
    currentSubject, 
    currentGrade, 
    setSubject, 
    setGrade,
    generateNewProblem,
    setActiveTab
  } = useAppStore();
  
  const subjects: { id: SubjectType; name: string; icon: React.ReactNode }[] = [
    { id: 'math', name: t('subjects.math'), icon: <Calculator size={24} /> },
    { id: 'physics', name: t('subjects.physics'), icon: <Atom size={24} /> },
    { id: 'science', name: t('subjects.science'), icon: <Microscope size={24} /> },
    { id: 'english', name: t('subjects.english'), icon: <BookText size={24} /> },
    { id: 'history', name: t('subjects.history'), icon: <Clock size={24} /> },
    { id: 'geography', name: t('subjects.geography'), icon: <Globe2 size={24} /> },
    { id: 'coding', name: t('subjects.coding'), icon: <Code size={24} /> },
  ];

  const grades: { id: GradeType; display: { top: string; bottom?: string } }[] = [
    { id: 'kindergarten', display: { top: t('grades.kindergarten') } },
    { id: 'grade1-6', display: { top: 'Grades', bottom: '1-6' } },
    { id: 'grade7-9', display: { top: 'Grades', bottom: '7-9' } },
    { id: 'grade10-12', display: { top: 'Grades', bottom: '10-12' } },
    { id: 'matric', display: { top: t('grades.matric') } },
  ];

  const handleSubjectSelect = (subject: SubjectType) => {
    const pageTurnSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2526/2526-preview.mp3');
    pageTurnSound.volume = 0.3;
    pageTurnSound.play().catch(() => {});
    
    setSubject(subject);
    if (currentGrade) {
      setTimeout(() => generateNewProblem(), 300);
    }
  };

  const handleGradeSelect = (grade: GradeType) => {
    const pageTurnSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2526/2526-preview.mp3');
    pageTurnSound.volume = 0.3;
    pageTurnSound.play().catch(() => {});
    
    setGrade(grade);
    
    if (grade === 'kindergarten') {
      setActiveTab('playlearn');
      navigate('/play-learn');
    } else if (currentSubject) {
      setTimeout(() => generateNewProblem(), 300);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="mb-6 space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="subjects-selector">
        <h2 className="font-serif text-xl text-book-leather mb-4">{t('select_subject')}:</h2>
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={containerVariants}
        >
          {subjects.map((subject) => (
            <motion.button
              key={subject.id}
              variants={itemVariants}
              className={`flex items-center px-3 py-4 rounded-lg transition-all ${
                currentSubject === subject.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white/80 text-book-leather hover:bg-primary-100 hover:shadow-md'
              }`}
              onClick={() => handleSubjectSelect(subject.id)}
              whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 400 } }}
              whileTap={{ scale: 0.98 }}
            >
              <motion.span 
                className="w-8 flex justify-center mr-2"
                animate={currentSubject === subject.id ? {
                  rotate: [0, 360],
                  transition: { duration: 0.5 }
                } : {}}
              >
                {subject.icon}
              </motion.span>
              <span className="font-serif text-lg truncate">{subject.name}</span>
            </motion.button>
          ))}
        </motion.div>
      </div>

      <div className="grades-selector">
        <h2 className="font-serif text-xl text-book-leather mb-4">{t('select_grade')}:</h2>
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          variants={containerVariants}
        >
          {grades.map((grade) => (
            <motion.button
              key={grade.id}
              variants={itemVariants}
              className={`flex flex-col items-center justify-center px-6 py-3 rounded-lg transition-all h-[4.5rem] ${
                currentGrade === grade.id
                  ? 'bg-primary-600 text-white shadow-lg'
                  : 'bg-white/80 text-book-leather hover:bg-primary-100 hover:shadow-md'
              }`}
              onClick={() => handleGradeSelect(grade.id)}
              whileHover={{ scale: 1.02, transition: { type: "spring", stiffness: 400 } }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="font-serif text-lg leading-tight">{grade.display.top}</span>
              {grade.display.bottom && (
                <span className="font-serif text-lg leading-tight mt-1">{grade.display.bottom}</span>
              )}
            </motion.button>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SubjectSelector;