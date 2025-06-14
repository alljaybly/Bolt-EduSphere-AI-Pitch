import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  TrendingUp, 
  Calendar, 
  Download, 
  Plus, 
  Search, 
  Filter,
  BarChart3,
  PieChart,
  FileText,
  Award,
  Clock,
  Target,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Eye,
  Edit,
  Trash2,
  Send,
  Loader2,
  GraduationCap,
  Brain,
  Star,
  Zap
} from 'lucide-react';
import { getCurrentUserId } from '../lib/revenuecat.js';

// Types for TypeScript
interface StudentProgress {
  user_id: string;
  student_name: string;
  total_attempted: number;
  total_correct: number;
  accuracy: number;
  last_activity: string;
  subjects: {
    [key: string]: {
      attempted: number;
      correct: number;
      accuracy: number;
    };
  };
  recent_attempts: Array<{
    subject: string;
    grade: string;
    question: string;
    correct: boolean;
    timestamp: number;
  }>;
}

interface Task {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  due_date: string;
  assigned_to: string[];
  status: 'pending' | 'in_progress' | 'completed';
  created_by: string;
  created_at: string;
}

interface ReportConfig {
  student_ids: string[];
  date_range: {
    start: string;
    end: string;
  };
  subjects: string[];
  report_type: 'summary' | 'detailed' | 'progress';
  include_charts: boolean;
}

/**
 * Student Progress Card Component
 * Displays individual student progress with visual indicators
 */
const StudentProgressCard = ({ 
  student, 
  onViewDetails 
}: { 
  student: StudentProgress; 
  onViewDetails: (student: StudentProgress) => void;
}) => {
  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return 'text-green-600 bg-green-100';
    if (accuracy >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getActivityStatus = (lastActivity: string) => {
    const daysSince = Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return { text: 'Active today', color: 'text-green-600' };
    if (daysSince <= 3) return { text: `${daysSince} days ago`, color: 'text-yellow-600' };
    return { text: `${daysSince} days ago`, color: 'text-red-600' };
  };

  const activityStatus = getActivityStatus(student.last_activity);

  return (
    <motion.div
      className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-300 border border-gray-100"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Student Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
            {student.student_name.charAt(0).toUpperCase()}
          </div>
          <div className="ml-3">
            <h3 className="font-semibold text-gray-800 text-lg">{student.student_name}</h3>
            <p className={`text-sm ${activityStatus.color}`}>
              <Clock size={14} className="inline mr-1" />
              {activityStatus.text}
            </p>
          </div>
        </div>
        <motion.button
          onClick={() => onViewDetails(student)}
          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Eye size={20} />
        </motion.button>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800">{student.total_attempted}</div>
          <div className="text-sm text-gray-600">Problems</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{student.total_correct}</div>
          <div className="text-sm text-gray-600">Correct</div>
        </div>
        <div className="text-center">
          <div className={`text-2xl font-bold px-3 py-1 rounded-full ${getAccuracyColor(student.accuracy)}`}>
            {student.accuracy.toFixed(1)}%
          </div>
          <div className="text-sm text-gray-600">Accuracy</div>
        </div>
      </div>

      {/* Subject Progress */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Subject Progress</h4>
        {Object.entries(student.subjects).slice(0, 3).map(([subject, data]) => (
          <div key={subject} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 capitalize">{subject}</span>
            <div className="flex items-center">
              <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(data.accuracy, 100)}%` }}
                ></div>
              </div>
              <span className="text-sm font-medium text-gray-700">{data.accuracy.toFixed(0)}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Action Button */}
      <motion.button
        onClick={() => onViewDetails(student)}
        className="w-full mt-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        View Details
      </motion.button>
    </motion.div>
  );
};

/**
 * Task Assignment Modal Component
 * Allows teachers to create and assign tasks to students
 */
const TaskAssignmentModal = ({ 
  isOpen, 
  onClose, 
  students, 
  onCreateTask 
}: {
  isOpen: boolean;
  onClose: () => void;
  students: StudentProgress[];
  onCreateTask: (task: Omit<Task, 'id' | 'created_at' | 'status'>) => void;
}) => {
  const [taskData, setTaskData] = useState({
    title: '',
    description: '',
    subject: 'math',
    grade: 'grade1-6',
    due_date: '',
    assigned_to: [] as string[]
  });

  const subjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
  const grades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskData.title && taskData.description && taskData.assigned_to.length > 0) {
      onCreateTask({
        ...taskData,
        created_by: getCurrentUserId()
      });
      setTaskData({
        title: '',
        description: '',
        subject: 'math',
        grade: 'grade1-6',
        due_date: '',
        assigned_to: []
      });
      onClose();
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setTaskData(prev => ({
      ...prev,
      assigned_to: prev.assigned_to.includes(studentId)
        ? prev.assigned_to.filter(id => id !== studentId)
        : [...prev.assigned_to, studentId]
    }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Create New Task</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Task Title
              </label>
              <input
                type="text"
                value={taskData.title}
                onChange={(e) => setTaskData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter task title..."
                required
              />
            </div>

            {/* Task Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={taskData.description}
                onChange={(e) => setTaskData(prev => ({ ...prev, description: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="Describe the task..."
                required
              />
            </div>

            {/* Subject and Grade */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Subject
                </label>
                <select
                  value={taskData.subject}
                  onChange={(e) => setTaskData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject.charAt(0).toUpperCase() + subject.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade Level
                </label>
                <select
                  value={taskData.grade}
                  onChange={(e) => setTaskData(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {grades.map(grade => (
                    <option key={grade} value={grade}>
                      {grade.charAt(0).toUpperCase() + grade.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={taskData.due_date}
                onChange={(e) => setTaskData(prev => ({ ...prev, due_date: e.target.value }))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Student Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assign to Students ({taskData.assigned_to.length} selected)
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
                {students.map(student => (
                  <label key={student.user_id} className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={taskData.assigned_to.includes(student.user_id)}
                      onChange={() => toggleStudentSelection(student.user_id)}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-gray-700">{student.student_name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={!taskData.title || !taskData.description || taskData.assigned_to.length === 0}
            >
              <Send className="inline mr-2" size={20} />
              Create Task
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Progress Report Generator Component
 * Handles PDF report generation with various options
 */
const ReportGenerator = ({ 
  students, 
  onGenerateReport 
}: {
  students: StudentProgress[];
  onGenerateReport: (config: ReportConfig) => void;
}) => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    student_ids: [],
    date_range: {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0]
    },
    subjects: ['math', 'science', 'english'],
    report_type: 'summary',
    include_charts: true
  });

  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateReport = async () => {
    if (reportConfig.student_ids.length === 0) {
      alert('Please select at least one student for the report.');
      return;
    }

    setIsGenerating(true);
    try {
      await onGenerateReport(reportConfig);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleStudentSelection = (studentId: string) => {
    setReportConfig(prev => ({
      ...prev,
      student_ids: prev.student_ids.includes(studentId)
        ? prev.student_ids.filter(id => id !== studentId)
        : [...prev.student_ids, studentId]
    }));
  };

  const toggleSubjectSelection = (subject: string) => {
    setReportConfig(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const subjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center mb-6">
        <FileText className="text-blue-600 mr-3" size={24} />
        <h3 className="text-xl font-bold text-gray-800">Generate Progress Report</h3>
      </div>

      <div className="space-y-6">
        {/* Report Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Report Type
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'summary', label: 'Summary', icon: BarChart3 },
              { value: 'detailed', label: 'Detailed', icon: FileText },
              { value: 'progress', label: 'Progress', icon: TrendingUp }
            ].map(({ value, label, icon: Icon }) => (
              <motion.button
                key={value}
                onClick={() => setReportConfig(prev => ({ ...prev, report_type: value as any }))}
                className={`p-3 rounded-lg border-2 transition-all ${
                  reportConfig.report_type === value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Icon className="mx-auto mb-1" size={20} />
                <div className="text-sm font-medium">{label}</div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={reportConfig.date_range.start}
              onChange={(e) => setReportConfig(prev => ({
                ...prev,
                date_range: { ...prev.date_range, start: e.target.value }
              }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={reportConfig.date_range.end}
              onChange={(e) => setReportConfig(prev => ({
                ...prev,
                date_range: { ...prev.date_range, end: e.target.value }
              }))}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Student Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Students ({reportConfig.student_ids.length} selected)
          </label>
          <div className="max-h-32 overflow-y-auto border border-gray-300 rounded-lg p-3 space-y-2">
            {students.map(student => (
              <label key={student.user_id} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportConfig.student_ids.includes(student.user_id)}
                  onChange={() => toggleStudentSelection(student.user_id)}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-gray-700">{student.student_name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Include Subjects ({reportConfig.subjects.length} selected)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {subjects.map(subject => (
              <label key={subject} className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={reportConfig.subjects.includes(subject)}
                  onChange={() => toggleSubjectSelection(subject)}
                  className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700 capitalize">{subject}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={reportConfig.include_charts}
              onChange={(e) => setReportConfig(prev => ({ ...prev, include_charts: e.target.checked }))}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-gray-700">Include charts and visualizations</span>
          </label>
        </div>

        {/* Generate Button */}
        <motion.button
          onClick={handleGenerateReport}
          disabled={isGenerating || reportConfig.student_ids.length === 0}
          className="w-full bg-gradient-to-r from-green-500 to-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-green-600 hover:to-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          whileHover={!isGenerating ? { scale: 1.02 } : {}}
          whileTap={!isGenerating ? { scale: 0.98 } : {}}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin inline mr-2" size={20} />
              Generating Report...
            </>
          ) : (
            <>
              <Download className="inline mr-2" size={20} />
              Generate PDF Report
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

/**
 * Main Teacher Dashboard Component
 * Comprehensive dashboard for teachers and parents to track student progress
 */
const TeacherDashboard: React.FC = () => {
  // State management
  const [students, setStudents] = useState<StudentProgress[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentProgress | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'tasks' | 'reports'>('overview');

  /**
   * Fetch student progress data from Neon database
   */
  const fetchStudentProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const userId = getCurrentUserId();
      
      // Fetch progress data from manageProblems function
      const response = await fetch(`/.netlify/functions/manageProblems?action=teacher-dashboard&teacher_id=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch student progress');
      }

      if (result.success) {
        setStudents(result.data.students || []);
        setTasks(result.data.tasks || []);
      } else {
        throw new Error(result.message || 'Failed to load dashboard data');
      }

    } catch (error) {
      console.error('Failed to fetch student progress:', error);
      setError(error.message || 'Failed to load student data');
      
      // Set mock data for development
      setStudents([
        {
          user_id: 'student_1',
          student_name: 'Alice Johnson',
          total_attempted: 45,
          total_correct: 38,
          accuracy: 84.4,
          last_activity: new Date().toISOString(),
          subjects: {
            math: { attempted: 20, correct: 18, accuracy: 90 },
            science: { attempted: 15, correct: 12, accuracy: 80 },
            english: { attempted: 10, correct: 8, accuracy: 80 }
          },
          recent_attempts: [
            {
              subject: 'math',
              grade: 'grade1-6',
              question: 'What is 15 + 27?',
              correct: true,
              timestamp: Date.now() - 3600000
            }
          ]
        },
        {
          user_id: 'student_2',
          student_name: 'Bob Smith',
          total_attempted: 32,
          total_correct: 24,
          accuracy: 75.0,
          last_activity: new Date(Date.now() - 86400000).toISOString(),
          subjects: {
            math: { attempted: 18, correct: 14, accuracy: 77.8 },
            science: { attempted: 8, correct: 6, accuracy: 75 },
            english: { attempted: 6, correct: 4, accuracy: 66.7 }
          },
          recent_attempts: []
        }
      ]);
      
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Create a new task assignment
   */
  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'created_at' | 'status'>) => {
    try {
      const userId = getCurrentUserId();
      
      const response = await fetch('/.netlify/functions/manageProblems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          action: 'create_task',
          task_data: taskData,
          teacher_id: userId
        })
      });

      const result = await response.json();

      if (result.success) {
        // Add the new task to local state
        const newTask: Task = {
          ...taskData,
          id: result.task_id || `task_${Date.now()}`,
          status: 'pending',
          created_at: new Date().toISOString()
        };
        
        setTasks(prev => [newTask, ...prev]);
        console.log('Task created successfully');
      } else {
        throw new Error(result.message || 'Failed to create task');
      }

    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  /**
   * Generate progress report PDF
   */
  const handleGenerateReport = async (config: ReportConfig) => {
    try {
      const userId = getCurrentUserId();
      
      const response = await fetch('/.netlify/functions/manageProblems', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          action: 'generate_report',
          report_config: config,
          teacher_id: userId
        })
      });

      const result = await response.json();

      if (result.success && result.pdf_url) {
        // Download the generated PDF
        const link = document.createElement('a');
        link.href = result.pdf_url;
        link.download = `progress_report_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        console.log('Report generated successfully');
      } else {
        throw new Error(result.message || 'Failed to generate report');
      }

    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    }
  };

  /**
   * Initialize dashboard data
   */
  useEffect(() => {
    fetchStudentProgress();
  }, []);

  /**
   * Filter students based on search term
   */
  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  /**
   * Calculate overall statistics
   */
  const overallStats = {
    totalStudents: students.length,
    averageAccuracy: students.length > 0 
      ? students.reduce((sum, student) => sum + student.accuracy, 0) / students.length 
      : 0,
    totalProblems: students.reduce((sum, student) => sum + student.total_attempted, 0),
    activeTasks: tasks.filter(task => task.status !== 'completed').length
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl font-semibold text-blue-800">Loading Teacher Dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <GraduationCap className="text-blue-600 mr-3" size={32} />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Teacher Dashboard</h1>
                <p className="text-gray-600">Monitor student progress and assign tasks</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => setShowTaskModal(true)}
                className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Plus className="inline mr-2" size={20} />
                New Task
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-md">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'students', label: 'Students', icon: Users },
            { id: 'tasks', label: 'Tasks', icon: CheckCircle },
            { id: 'reports', label: 'Reports', icon: FileText }
          ].map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Icon className="mr-2" size={20} />
              {label}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 pb-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  title: 'Total Students',
                  value: overallStats.totalStudents,
                  icon: Users,
                  color: 'from-blue-500 to-blue-600',
                  textColor: 'text-blue-600'
                },
                {
                  title: 'Average Accuracy',
                  value: `${overallStats.averageAccuracy.toFixed(1)}%`,
                  icon: Target,
                  color: 'from-green-500 to-green-600',
                  textColor: 'text-green-600'
                },
                {
                  title: 'Total Problems',
                  value: overallStats.totalProblems,
                  icon: Brain,
                  color: 'from-purple-500 to-purple-600',
                  textColor: 'text-purple-600'
                },
                {
                  title: 'Active Tasks',
                  value: overallStats.activeTasks,
                  icon: Zap,
                  color: 'from-orange-500 to-orange-600',
                  textColor: 'text-orange-600'
                }
              ].map((stat, index) => (
                <motion.div
                  key={stat.title}
                  className="bg-white rounded-xl shadow-lg p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-600 text-sm font-medium">{stat.title}</p>
                      <p className="text-3xl font-bold text-gray-800 mt-1">{stat.value}</p>
                    </div>
                    <div className={`p-3 rounded-full bg-gradient-to-r ${stat.color}`}>
                      <stat.icon className="text-white" size={24} />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Student Activity</h3>
              <div className="space-y-3">
                {students.slice(0, 5).map((student, index) => (
                  <motion.div
                    key={student.user_id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                        {student.student_name.charAt(0)}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-800">{student.student_name}</p>
                        <p className="text-sm text-gray-600">
                          {student.total_attempted} problems • {student.accuracy.toFixed(1)}% accuracy
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        student.accuracy >= 80 ? 'bg-green-100 text-green-800' :
                        student.accuracy >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {student.accuracy >= 80 ? 'Excellent' :
                         student.accuracy >= 60 ? 'Good' : 'Needs Help'}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">Student Progress</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="text-red-500 mr-2" size={20} />
                    <p className="text-red-700">{error}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredStudents.map((student, index) => (
                  <motion.div
                    key={student.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <StudentProgressCard
                      student={student}
                      onViewDetails={setSelectedStudent}
                    />
                  </motion.div>
                ))}
              </div>

              {filteredStudents.length === 0 && (
                <div className="text-center py-8">
                  <Users className="mx-auto text-gray-400 mb-4" size={48} />
                  <p className="text-gray-600">No students found matching your search.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Tasks Tab */}
        {activeTab === 'tasks' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-800">Task Management</h3>
                <motion.button
                  onClick={() => setShowTaskModal(true)}
                  className="bg-gradient-to-r from-green-500 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-green-600 hover:to-blue-700 transition-all duration-300"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="inline mr-2" size={20} />
                  Create Task
                </motion.button>
              </div>

              <div className="space-y-4">
                {tasks.map((task, index) => (
                  <motion.div
                    key={task.id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800">{task.title}</h4>
                        <p className="text-gray-600 text-sm mt-1">{task.description}</p>
                        <div className="flex items-center mt-2 space-x-4">
                          <span className="text-sm text-gray-500">
                            <BookOpen className="inline mr-1" size={14} />
                            {task.subject} • {task.grade}
                          </span>
                          {task.due_date && (
                            <span className="text-sm text-gray-500">
                              <Calendar className="inline mr-1" size={14} />
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                          <span className="text-sm text-gray-500">
                            Assigned to {task.assigned_to.length} student{task.assigned_to.length !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {tasks.length === 0 && (
                  <div className="text-center py-8">
                    <CheckCircle className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600">No tasks created yet. Create your first task to get started!</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <ReportGenerator
              students={students}
              onGenerateReport={handleGenerateReport}
            />
          </motion.div>
        )}
      </div>

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        students={students}
        onCreateTask={handleCreateTask}
      />

      {/* Student Detail Modal */}
      {selectedStudent && (
        <AnimatePresence>
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedStudent(null)}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  {selectedStudent.student_name} - Detailed Progress
                </h2>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{selectedStudent.total_attempted}</div>
                  <div className="text-blue-800">Total Problems</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{selectedStudent.total_correct}</div>
                  <div className="text-green-800">Correct Answers</div>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{selectedStudent.accuracy.toFixed(1)}%</div>
                  <div className="text-purple-800">Accuracy Rate</div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Subject Performance</h3>
                  <div className="space-y-3">
                    {Object.entries(selectedStudent.subjects).map(([subject, data]) => (
                      <div key={subject} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                            {subject.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800 capitalize">{subject}</span>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-gray-600">{data.correct}/{data.attempted}</span>
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${Math.min(data.accuracy, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-700 w-12">{data.accuracy.toFixed(0)}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {selectedStudent.recent_attempts.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
                    <div className="space-y-2">
                      {selectedStudent.recent_attempts.map((attempt, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <p className="text-gray-800">{attempt.question}</p>
                            <p className="text-sm text-gray-600 capitalize">{attempt.subject} • {attempt.grade}</p>
                          </div>
                          <div className="flex items-center">
                            {attempt.correct ? (
                              <CheckCircle className="text-green-500" size={20} />
                            ) : (
                              <XCircle className="text-red-500" size={20} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default TeacherDashboard;