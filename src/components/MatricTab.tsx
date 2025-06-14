import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, BookOpen, CheckSquare, LightbulbIcon } from 'lucide-react';

const MatricTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const mockExams = [
    { id: 1, subject: 'Mathematics', duration: '3 hours', questions: 30 },
    { id: 2, subject: 'Physical Sciences', duration: '3 hours', questions: 25 },
    { id: 3, subject: 'English Home Language', duration: '2 hours', questions: 20 },
    { id: 4, subject: 'Life Sciences', duration: '2.5 hours', questions: 22 }
  ];

  const studyTips = [
    "Create a balanced study schedule with breaks",
    "Use past papers to practice exam conditions",
    "Form study groups for difficult topics",
    "Teach concepts to others to solidify understanding",
    "Use mind maps for visual learning"
  ];

  const studyPlan = {
    days: [
      { day: 1, task: "Mathematics: Algebra revision (2 hours)" },
      { day: 2, task: "Physical Sciences: Mechanics practice (2 hours)" },
      { day: 3, task: "English: Essay writing (1.5 hours)" }
    ]
  };

  return (
    <motion.div
      className="matric-tab bg-white/80 rounded-lg p-6 shadow-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 className="font-serif text-2xl text-book-leather mb-6 text-center">
        Matric Made Easy
      </h2>

      {activeSection === null && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <motion.div 
              className="bg-primary-50 p-4 rounded-lg border border-primary-100"
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center mb-3">
                <Calendar size={20} className="text-primary-600 mr-2" />
                <h3 className="font-serif text-lg text-book-leather">30-Day Study Plan</h3>
              </div>
              <p className="text-sm text-secondary-800 mb-3">
                Structured daily study plan designed specifically for matric students.
              </p>
              <motion.button
                onClick={() => setActiveSection('studyPlan')}
                className="w-full py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View Study Plan
              </motion.button>
            </motion.div>

            <motion.div 
              className="bg-accent-50 p-4 rounded-lg border border-accent-100"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center mb-3">
                <LightbulbIcon size={20} className="text-accent-600 mr-2" />
                <h3 className="font-serif text-lg text-book-leather">Exam Tips</h3>
              </div>
              <ul className="text-sm text-secondary-800 space-y-1 list-disc list-inside mb-3">
                {studyTips.slice(0, 3).map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
              <motion.button
                onClick={() => setActiveSection('tips')}
                className="w-full py-2 bg-accent-600 text-white rounded-md hover:bg-accent-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                More Tips
              </motion.button>
            </motion.div>
          </div>

          <div className="mock-exams mb-6">
            <div className="flex items-center mb-3">
              <CheckSquare size={20} className="text-book-leather mr-2" />
              <h3 className="font-serif text-lg text-book-leather">Mock Exams</h3>
            </div>

            <div className="bg-white p-3 rounded-lg border border-secondary-100">
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {mockExams.map((exam) => (
                  <motion.div 
                    key={exam.id}
                    className="p-3 hover:bg-secondary-50 rounded-md transition-colors cursor-pointer border border-secondary-100"
                    whileHover={{ scale: 1.01 }}
                    onClick={() => setActiveSection(`exam-${exam.id}`)}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-serif font-medium text-book-leather">{exam.subject}</h4>
                        <p className="text-xs text-secondary-600">
                          {exam.duration} · {exam.questions} questions
                        </p>
                      </div>
                      <BookOpen size={18} className="text-secondary-500" />
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.button
                onClick={() => setActiveSection('allExams')}
                className="w-full mt-3 py-2 bg-secondary-600 text-white rounded-md hover:bg-secondary-700"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                View All Exams
              </motion.button>
            </div>
          </div>

          <div className="matric-resources">
            <h3 className="font-serif text-lg text-book-leather mb-2">Resources</h3>
            <div className="grid grid-cols-2 gap-2">
              {['Past Papers', 'Study Guides', 'Video Lessons', 'Practice Tests'].map((resource, index) => (
                <motion.div 
                  key={index}
                  className="bg-secondary-50 p-3 rounded-md text-center hover:bg-secondary-100 cursor-pointer"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setActiveSection(resource.toLowerCase().replace(' ', ''))}
                >
                  <p className="font-serif">{resource}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeSection === 'studyPlan' && (
        <div>
          <button onClick={() => setActiveSection(null)} className="mb-4 text-blue-600">Back</button>
          <h3 className="font-serif text-lg text-book-leather">30-Day Study Plan</h3>
          <ul className="space-y-2">
            {studyPlan.days.map((day) => (
              <li key={day.day} className="p-2 bg-gray-100 rounded">{`Day ${day.day}: ${day.task}`}</li>
            ))}
          </ul>
        </div>
      )}

      {activeSection === 'tips' && (
        <div>
          <button onClick={() => setActiveSection(null)} className="mb-4 text-blue-600">Back</button>
          <h3 className="font-serif text-lg text-book-leather">All Exam Tips</h3>
          <ul className="space-y-2 list-disc list-inside">
            {studyTips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}

      {mockExams.some(exam => activeSection === `exam-${exam.id}`) && (
        <div>
          <button onClick={() => setActiveSection(null)} className="mb-4 text-blue-600">Back</button>
          <h3 className="font-serif text-lg text-book-leather">
            Mock Exam: {mockExams.find(exam => activeSection === `exam-${exam.id}`)?.subject}
          </h3>
          <p>Placeholder for mock exam content (e.g., questions, timer).</p>
        </div>
      )}

      {activeSection === 'allExams' && (
        <div>
          <button onClick={() => setActiveSection(null)} className="mb-4 text-blue-600">Back</button>
          <h3 className="font-serif text-lg text-book-leather">All Mock Exams</h3>
          <ul className="space-y-2">
            {mockExams.map((exam) => (
              <li key={exam.id} className="p-2 bg-gray-100 rounded">
                {exam.subject} - {exam.duration}, {exam.questions} questions
              </li>
            ))}
          </ul>
        </div>
      )}

      {['pastpapers', 'studyguides', 'videolessons', 'practicetests'].includes(activeSection as string) && (
        <div>
          <button onClick={() => setActiveSection(null)} className="mb-4 text-blue-600">Back</button>
          <h3 className="font-serif text-lg text-book-leather">{activeSection.replace(/([A-Z])/g, ' $1').toUpperCase()}</h3>
          <p>Placeholder for {activeSection} content.</p>
        </div>
      )}
    </motion.div>
  );
};

export default MatricTab;