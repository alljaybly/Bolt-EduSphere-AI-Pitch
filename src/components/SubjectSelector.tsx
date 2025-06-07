import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore';

const SubjectSelector: React.FC = () => {
  const { currentSubject, currentGrade, setCurrentSubject, setCurrentGrade } = useAppStore();
  const [showStudyPlanGrade, setShowStudyPlanGrade] = useState(false);

  const subjects = [
    'Coding', 'Mathematics', 'Physical Sciences', 'English', 'Life Sciences',
    'Biology', 'Accounting', 'Business Studies', 'Economics', 'Arts & Crafts',
    'Life Orientation', 'EMS', 'Technology', 'Natural Science'
  ];

  const grades = { '1-4': 'Kindergarten/Primary', '5-7': 'Intermediate', '8-10': 'Senior Phase', '11-12': 'Matric' };
  const studyPlanGrades = ['8', '9', '10', '11', '12'];

  return (
    <div className="subject-selector mb-6">
      <label htmlFor="subject" className="sr-only">Select a Subject</label>
      <select
        id="subject"
        value={currentSubject || ''}
        onChange={(e) => setCurrentSubject(e.target.value)}
        className="p-2 border rounded w-full bg-white focus:ring-2 focus:ring-blue-500"
        aria-label="Select a Subject"
      >
        <option value="">Select a Subject</option>
        {subjects.map((subject) => (
          <option key={subject} value={subject}>{subject}</option>
        ))}
      </select>

      <label htmlFor="grade" className="sr-only">Select a Grade Range</label>
      <select
        id="grade"
        value={currentGrade || ''}
        onChange={(e) => {
          setCurrentGrade(e.target.value);
          setShowStudyPlanGrade(e.target.value === 'Study Plan');
        }}
        className="p-2 border rounded w-full mt-2 bg-white focus:ring-2 focus:ring-blue-500"
        aria-label="Select a Grade Range"
      >
        <option value="">Select a Grade Range</option>
        {Object.entries(grades).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
        <option value="Study Plan">Study Plan (8-12)</option>
      </select>

      {showStudyPlanGrade && (
        <>
          <label htmlFor="studyPlanGrade" className="sr-only">Select a Grade for Study Plan</label>
          <select
            id="studyPlanGrade"
            value={currentGrade || ''}
            onChange={(e) => setCurrentGrade(e.target.value)}
            className="p-2 border rounded w-full mt-2 bg-white focus:ring-2 focus:ring-blue-500"
            aria-label="Select a Grade for Study Plan"
          >
            <option value="">Select a Grade</option>
            {studyPlanGrades.map((grade) => (
              <option key={grade} value={grade}>Grade {grade}</option>
            ))}
          </select>
        </>
      )}
    </div>
  );
};

export default SubjectSelector;