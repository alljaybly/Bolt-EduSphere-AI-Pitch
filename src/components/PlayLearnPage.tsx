import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  Play, 
  Pause, 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  ArrowLeft, 
  Star, 
  Trophy, 
  Target, 
  Zap, 
  Heart, 
  Crown, 
  Sparkles, 
  BookOpen, 
  Gamepad2, 
  Users, 
  Settings, 
  Award, 
  TrendingUp, 
  Calendar, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Globe,
  Headphones,
  Camera,
  Code,
  Palette,
  Music,
  Brain,
  Lightbulb,
  Rocket,
  Shield,
  Gift,
  Diamond,
  Flame,
  Lock,
  Eye,
  EyeOff
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';
import confetti from 'canvas-confetti';
import { supabase } from '../lib/supabase';

/**
 * Play & Learn Page Component
 * Main interactive learning hub with games, quizzes, and activities
 * Supports voice recognition, AR experiences, and social features
 */
const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'games' | 'voice' | 'ar' | 'social' | 'progress'>('games');
  const [voiceQuizzes, setVoiceQuizzes] = useState<any[]>([]);
  const [currentVoiceQuiz, setCurrentVoiceQuiz] = useState<any>(null);
  const [isListening, setIsListening] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userProgress, setUserProgress] = useState<any>({});
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState('en');
  const [difficulty, setDifficulty] = useState('easy');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [theme, setTheme] = useState('light');
  const [fontSize, setFontSize] = useState(16);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  
  // Refs for audio and speech recognition
  const audioRef = useRef<HTMLAudioElement>(null);
  const recognitionRef = useRef<any>(null);

  /**
   * Initialize the Play & Learn page
   */
  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true);
        
        // Check premium access
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);

        // Load user preferences
        await loadUserPreferences();
        
        // Load voice quizzes
        await loadVoiceQuizzes();
        
        // Load user achievements
        await loadAchievements();
        
        // Load user progress
        await loadUserProgress();
        
        // Initialize speech recognition
        initializeSpeechRecognition();

      } catch (error) {
        console.error('Failed to initialize Play & Learn page:', error);
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializePage();
  }, []);

  /**
   * Load user preferences from Supabase
   */
  const loadUserPreferences = async () => {
    try {
      const userId = getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (data) {
        setLanguage(data.preferred_language || 'en');
        setDifficulty(data.preferred_difficulty === 1 ? 'easy' : data.preferred_difficulty === 2 ? 'medium' : 'hard');
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  /**
   * Load voice quizzes from Netlify function
   */
  const loadVoiceQuizzes = async () => {
    try {
      const userId = getCurrentUserId();
      
      const response = await fetch('/.netlify/functions/voiceQuiz', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        const filteredQuizzes = result.data.filter((quiz: any) => 
          quiz.language === language && 
          quiz.difficulty === difficulty
        );
        
        setVoiceQuizzes(filteredQuizzes);
        
        if (filteredQuizzes.length > 0) {
          setCurrentVoiceQuiz(filteredQuizzes[0]);
        }
      } else {
        throw new Error(result.error || 'Failed to load voice quizzes');
      }
    } catch (error) {
      console.error('Failed to load voice quizzes:', error);
      Sentry.captureException(error);
      
      // Fallback to sample quizzes
      const sampleQuizzes = [
        {
          id: 'sample_1',
          question: 'What color is the sky on a clear day?',
          answer: 'blue',
          language: 'en',
          difficulty: 'easy',
          grade_level: 'kindergarten',
          subject: 'science',
          alternative_answers: ['sky blue', 'light blue'],
          hint: 'Look up on a sunny day'
        },
        {
          id: 'sample_2',
          question: 'How many days are in a week?',
          answer: 'seven',
          language: 'en',
          difficulty: 'easy',
          grade_level: 'kindergarten',
          subject: 'math',
          alternative_answers: ['7'],
          hint: 'Monday through Sunday'
        }
      ];
      
      setVoiceQuizzes(sampleQuizzes);
      setCurrentVoiceQuiz(sampleQuizzes[0]);
    }
  };

  /**
   * Load user achievements
   */
  const loadAchievements = async () => {
    try {
      const userId = getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId)
        .order('earned_date', { ascending: false });

      if (data) {
        setAchievements(data);
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  /**
   * Load user progress
   */
  const loadUserProgress = async () => {
    try {
      const userId = getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (data) {
        const progressMap = data.reduce((acc: any, item: any) => {
          const key = `${item.subject}_${item.grade}`;
          acc[key] = item;
          return acc;
        }, {});
        
        setUserProgress(progressMap);
      }
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  /**
   * Initialize speech recognition
   */
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'es' ? 'es-ES' : language === 'zh' ? 'zh-CN' : 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        setUserAnswer(transcript);
        checkVoiceAnswer(transcript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  };

  /**
   * Start voice recognition
   */
  const startListening = () => {
    if (recognitionRef.current && voiceEnabled) {
      setIsListening(true);
      setUserAnswer('');
      setIsCorrect(null);
      recognitionRef.current.start();
    }
  };

  /**
   * Stop voice recognition
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  /**
   * Check voice answer
   */
  const checkVoiceAnswer = async (answer: string) => {
    if (!currentVoiceQuiz) return;

    const correctAnswers = [
      currentVoiceQuiz.answer.toLowerCase(),
      ...(currentVoiceQuiz.alternative_answers || []).map((a: string) => a.toLowerCase())
    ];

    const isAnswerCorrect = correctAnswers.some(correctAnswer => 
      answer.includes(correctAnswer) || correctAnswer.includes(answer)
    );

    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      setScore(prev => prev + 10);
      setStreak(prev => prev + 1);
      
      // Play success sound
      if (soundEnabled) {
        const successSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        successSound.volume = 0.3;
        successSound.play().catch(() => {});
      }
      
      // Show confetti
      if (animationsEnabled) {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }
      
      // Award achievements
      await checkAndAwardAchievements();
      
      // Move to next quiz after delay
      setTimeout(() => {
        nextVoiceQuiz();
      }, 2000);
    } else {
      setStreak(0);
      
      // Play error sound
      if (soundEnabled) {
        const errorSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        errorSound.volume = 0.2;
        errorSound.play().catch(() => {});
      }
    }

    // Save progress
    await saveVoiceQuizProgress(isAnswerCorrect);
  };

  /**
   * Move to next voice quiz
   */
  const nextVoiceQuiz = () => {
    const currentIndex = voiceQuizzes.findIndex(quiz => quiz.id === currentVoiceQuiz?.id);
    const nextIndex = (currentIndex + 1) % voiceQuizzes.length;
    setCurrentVoiceQuiz(voiceQuizzes[nextIndex]);
    setUserAnswer('');
    setIsCorrect(null);
  };

  /**
   * Save voice quiz progress
   */
  const saveVoiceQuizProgress = async (correct: boolean) => {
    try {
      const userId = getCurrentUserId();
      
      const response = await fetch('/.netlify/functions/voiceQuiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          action: 'save_attempt',
          quiz_id: currentVoiceQuiz?.id,
          user_answer: userAnswer,
          is_correct: correct
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        console.error('Failed to save voice quiz progress:', result.error);
      }
    } catch (error) {
      console.error('Failed to save voice quiz progress:', error);
    }
  };

  /**
   * Check and award achievements
   */
  const checkAndAwardAchievements = async () => {
    const userId = getCurrentUserId();
    const newAchievements = [];

    // First correct answer
    if (score === 10 && !achievements.find(a => a.badge_name === 'First Success')) {
      newAchievements.push({
        user_id: userId,
        badge_name: 'First Success',
        badge_description: 'Got your first answer correct!',
        badge_icon: '🎯',
        points: 10,
        category: 'milestone'
      });
    }

    // 5-question streak
    if (streak === 5 && !achievements.find(a => a.badge_name === 'Hot Streak')) {
      newAchievements.push({
        user_id: userId,
        badge_name: 'Hot Streak',
        badge_description: 'Answered 5 questions correctly in a row!',
        badge_icon: '🔥',
        points: 25,
        category: 'streak'
      });
    }

    // 100 points milestone
    if (score >= 100 && !achievements.find(a => a.badge_name === 'Century Club')) {
      newAchievements.push({
        user_id: userId,
        badge_name: 'Century Club',
        badge_description: 'Earned 100 points!',
        badge_icon: '💯',
        points: 50,
        category: 'milestone'
      });
    }

    // Save new achievements
    for (const achievement of newAchievements) {
      try {
        const { error } = await supabase
          .from('user_achievements')
          .insert(achievement);

        if (!error) {
          setAchievements(prev => [...prev, achievement]);
          
          // Show achievement notification
          if (animationsEnabled) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
        }
      } catch (error) {
        console.error('Failed to save achievement:', error);
      }
    }
  };

  /**
   * Navigate to AR Problems
   */
  const navigateToAR = () => {
    if (!isPremium) {
      alert('AR Problems require a premium subscription');
      return;
    }
    navigate('/ar-problems');
  };

  /**
   * Navigate to Live Code
   */
  const navigateToLiveCode = () => {
    if (!isPremium) {
      alert('Live Code requires a premium subscription');
      return;
    }
    navigate('/live-code');
  };

  /**
   * Navigate to Story Mode
   */
  const navigateToStoryMode = () => {
    navigate('/story-mode');
  };

  /**
   * Navigate to Teacher Dashboard
   */
  const navigateToTeacherDashboard = () => {
    navigate('/teacher-dashboard');
  };

  /**
   * Get theme classes
   */
  const getThemeClasses = () => {
    if (highContrast) {
      return theme === 'dark' 
        ? 'min-h-screen bg-black text-white'
        : 'min-h-screen bg-white text-black';
    }
    
    return theme === 'dark'
      ? 'min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 text-white'
      : 'min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className={getThemeClasses()}>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className="animate-spin mx-auto mb-4" size={48} />
            <p className="text-xl font-semibold">Loading Play & Learn...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={getThemeClasses()}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="mr-2" size={20} />
                Back to Book
              </motion.button>

              <div className="flex items-center">
                <Gamepad2 className="mr-2 text-blue-600" size={24} />
                <h1 className="text-xl font-bold">Play & Learn</h1>
                {isPremium && (
                  <Crown className="ml-2 text-yellow-500" size={20} />
                )}
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Score Display */}
              <div className="flex items-center bg-blue-100 dark:bg-blue-900 px-3 py-1 rounded-lg">
                <Star className="mr-1 text-yellow-500" size={16} />
                <span className="font-semibold">{score}</span>
              </div>

              {/* Streak Display */}
              {streak > 0 && (
                <div className="flex items-center bg-orange-100 dark:bg-orange-900 px-3 py-1 rounded-lg">
                  <Flame className="mr-1 text-orange-500" size={16} />
                  <span className="font-semibold">{streak}</span>
                </div>
              )}

              {/* Settings Button */}
              <motion.button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings size={20} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowSettings(false)}
          >
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold mb-4">Settings</h3>
              
              <div className="space-y-4">
                {/* Language */}
                <div>
                  <label className="block text-sm font-medium mb-2">Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={soundEnabled}
                      onChange={(e) => setSoundEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Sound Effects</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Voice Recognition</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showHints}
                      onChange={(e) => setShowHints(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Show Hints</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={animationsEnabled}
                      onChange={(e) => setAnimationsEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">Animations</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm">High Contrast</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-md">
          {[
            { id: 'games', label: 'Games', icon: Gamepad2 },
            { id: 'voice', label: 'Voice Quiz', icon: Mic },
            { id: 'ar', label: 'AR World', icon: Camera },
            { id: 'social', label: 'Social', icon: Users },
            { id: 'progress', label: 'Progress', icon: TrendingUp }
          ].map(({ id, label, icon: Icon }) => (
            <motion.button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center px-4 py-2 rounded-md font-medium transition-all ${
                activeTab === id
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
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
      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Games Tab */}
        {activeTab === 'games' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {/* Interactive Learning Games */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: animationsEnabled ? 1.02 : 1 }}
              whileTap={{ scale: animationsEnabled ? 0.98 : 1 }}
              onClick={navigateToStoryMode}
            >
              <div className="flex items-center mb-4">
                <BookOpen className="text-purple-600 mr-3" size={32} />
                <h3 className="text-xl font-bold">Story Mode</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Interactive storytelling with AI narration and beautiful visuals.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                  All Ages
                </span>
                <ArrowLeft className="transform rotate-180" size={20} />
              </div>
            </motion.div>

            {/* AR Problems */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative"
              whileHover={{ scale: animationsEnabled ? 1.02 : 1 }}
              whileTap={{ scale: animationsEnabled ? 0.98 : 1 }}
              onClick={navigateToAR}
            >
              {!isPremium && (
                <div className="absolute top-2 right-2">
                  <Lock className="text-yellow-500" size={20} />
                </div>
              )}
              <div className="flex items-center mb-4">
                <Camera className="text-blue-600 mr-3" size={32} />
                <h3 className="text-xl font-bold">AR Problems</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Solve math problems in augmented reality with 3D objects.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  {isPremium ? 'Premium' : 'Locked'}
                </span>
                <ArrowLeft className="transform rotate-180" size={20} />
              </div>
            </motion.div>

            {/* Live Code */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 relative"
              whileHover={{ scale: animationsEnabled ? 1.02 : 1 }}
              whileTap={{ scale: animationsEnabled ? 0.98 : 1 }}
              onClick={navigateToLiveCode}
            >
              {!isPremium && (
                <div className="absolute top-2 right-2">
                  <Lock className="text-yellow-500" size={20} />
                </div>
              )}
              <div className="flex items-center mb-4">
                <Code className="text-green-600 mr-3" size={32} />
                <h3 className="text-xl font-bold">Live Code</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Collaborative coding with real-time sharing and voice chat.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                  {isPremium ? 'Premium' : 'Locked'}
                </span>
                <ArrowLeft className="transform rotate-180" size={20} />
              </div>
            </motion.div>

            {/* Teacher Dashboard */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: animationsEnabled ? 1.02 : 1 }}
              whileTap={{ scale: animationsEnabled ? 0.98 : 1 }}
              onClick={navigateToTeacherDashboard}
            >
              <div className="flex items-center mb-4">
                <Users className="text-orange-600 mr-3" size={32} />
                <h3 className="text-xl font-bold">Teacher Dashboard</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Monitor student progress and assign learning tasks.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200 px-2 py-1 rounded">
                  Educators
                </span>
                <ArrowLeft className="transform rotate-180" size={20} />
              </div>
            </motion.div>

            {/* Math Games */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: animationsEnabled ? 1.02 : 1 }}
              whileTap={{ scale: animationsEnabled ? 0.98 : 1 }}
            >
              <div className="flex items-center mb-4">
                <Brain className="text-red-600 mr-3" size={32} />
                <h3 className="text-xl font-bold">Math Games</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Fun mathematical puzzles and number games for all levels.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 px-2 py-1 rounded">
                  Coming Soon
                </span>
                <ArrowLeft className="transform rotate-180" size={20} />
              </div>
            </motion.div>

            {/* Creative Studio */}
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300"
              whileHover={{ scale: animationsEnabled ? 1.02 : 1 }}
              whileTap={{ scale: animationsEnabled ? 0.98 : 1 }}
            >
              <div className="flex items-center mb-4">
                <Palette className="text-pink-600 mr-3" size={32} />
                <h3 className="text-xl font-bold">Creative Studio</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Draw, paint, and create digital art with AI assistance.
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-200 px-2 py-1 rounded">
                  Coming Soon
                </span>
                <ArrowLeft className="transform rotate-180" size={20} />
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Voice Quiz Tab */}
        {activeTab === 'voice' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-2xl mx-auto"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
              <div className="text-center mb-8">
                <div className="flex items-center justify-center mb-4">
                  <Mic className="text-blue-600 mr-3" size={48} />
                  <h2 className="text-3xl font-bold">Voice Quiz</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  Answer questions using your voice!
                </p>
              </div>

              {currentVoiceQuiz && (
                <div className="space-y-6">
                  {/* Question */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl">
                    <h3 className="text-xl font-semibold mb-2">Question:</h3>
                    <p className="text-lg">{currentVoiceQuiz.question}</p>
                    
                    {showHints && currentVoiceQuiz.hint && (
                      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                        <p className="text-sm text-yellow-800 dark:text-yellow-200">
                          💡 Hint: {currentVoiceQuiz.hint}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Voice Controls */}
                  <div className="text-center">
                    <motion.button
                      onClick={isListening ? stopListening : startListening}
                      disabled={!voiceEnabled}
                      className={`p-6 rounded-full text-white font-bold text-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListening 
                          ? 'bg-red-500 hover:bg-red-600' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                      whileHover={{ scale: animationsEnabled ? 1.1 : 1 }}
                      whileTap={{ scale: animationsEnabled ? 0.9 : 1 }}
                    >
                      {isListening ? (
                        <>
                          <MicOff size={32} className="mx-auto mb-2" />
                          Stop Listening
                        </>
                      ) : (
                        <>
                          <Mic size={32} className="mx-auto mb-2" />
                          Start Speaking
                        </>
                      )}
                    </motion.button>

                    {isListening && (
                      <motion.div
                        className="mt-4 text-blue-600"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ repeat: Infinity, duration: 1 }}
                      >
                        <p className="text-sm">Listening...</p>
                      </motion.div>
                    )}
                  </div>

                  {/* Answer Display */}
                  {userAnswer && (
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                      <h4 className="font-semibold mb-2">You said:</h4>
                      <p className="text-lg">"{userAnswer}"</p>
                    </div>
                  )}

                  {/* Result */}
                  {isCorrect !== null && (
                    <motion.div
                      className={`p-4 rounded-xl text-center ${
                        isCorrect 
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                          : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
                      }`}
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      <div className="flex items-center justify-center mb-2">
                        {isCorrect ? (
                          <CheckCircle size={32} />
                        ) : (
                          <XCircle size={32} />
                        )}
                      </div>
                      <p className="text-lg font-semibold">
                        {isCorrect ? 'Correct! Well done!' : 'Try again!'}
                      </p>
                      {!isCorrect && (
                        <p className="text-sm mt-2">
                          The correct answer is: {currentVoiceQuiz.answer}
                        </p>
                      )}
                    </motion.div>
                  )}

                  {/* Next Button */}
                  <div className="text-center">
                    <motion.button
                      onClick={nextVoiceQuiz}
                      className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors"
                      whileHover={{ scale: animationsEnabled ? 1.05 : 1 }}
                      whileTap={{ scale: animationsEnabled ? 0.95 : 1 }}
                    >
                      Next Question
                    </motion.button>
                  </div>
                </div>
              )}

              {!voiceEnabled && (
                <div className="text-center p-8">
                  <MicOff className="mx-auto mb-4 text-gray-400" size={48} />
                  <p className="text-gray-600 dark:text-gray-300">
                    Voice recognition is disabled. Enable it in settings to use voice quizzes.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* AR Tab */}
        {activeTab === 'ar' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg max-w-2xl mx-auto">
              <Camera className="mx-auto mb-6 text-blue-600" size={64} />
              <h2 className="text-3xl font-bold mb-4">AR Learning World</h2>
              <p className="text-gray-600 dark:text-gray-300 mb-8">
                Experience learning in augmented reality with 3D objects and interactive problems.
              </p>

              {isPremium ? (
                <motion.button
                  onClick={navigateToAR}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                  whileHover={{ scale: animationsEnabled ? 1.05 : 1 }}
                  whileTap={{ scale: animationsEnabled ? 0.95 : 1 }}
                >
                  <Camera className="inline mr-2" size={24} />
                  Enter AR World
                </motion.button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center mb-4">
                    <Lock className="text-yellow-500 mr-2" size={24} />
                    <span className="text-lg font-semibold">Premium Feature</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    Upgrade to premium to access AR learning experiences.
                  </p>
                  <motion.button
                    className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
                    whileHover={{ scale: animationsEnabled ? 1.05 : 1 }}
                    whileTap={{ scale: animationsEnabled ? 0.95 : 1 }}
                  >
                    <Crown className="inline mr-2" size={24} />
                    Upgrade to Premium
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Social Tab */}
        {activeTab === 'social' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          >
            {/* Achievements */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-6">
                <Trophy className="text-yellow-500 mr-3" size={32} />
                <h3 className="text-2xl font-bold">Achievements</h3>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    className="flex items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className="text-3xl mr-4">{achievement.badge_icon}</div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{achievement.badge_name}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {achievement.badge_description}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600">
                        +{achievement.points}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(achievement.earned_date).toLocaleDateString()}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {achievements.length === 0 && (
                  <div className="text-center py-8">
                    <Award className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 dark:text-gray-300">
                      No achievements yet. Start learning to earn your first badge!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center mb-6">
                <TrendingUp className="text-green-500 mr-3" size={32} />
                <h3 className="text-2xl font-bold">Leaderboard</h3>
              </div>

              <div className="space-y-4">
                {/* Sample leaderboard data */}
                {[
                  { name: 'Alex', score: 1250, rank: 1 },
                  { name: 'Sam', score: 1100, rank: 2 },
                  { name: 'You', score: score, rank: 3 },
                  { name: 'Jordan', score: 950, rank: 4 },
                  { name: 'Casey', score: 800, rank: 5 }
                ].map((player, index) => (
                  <div
                    key={index}
                    className={`flex items-center p-3 rounded-lg ${
                      player.name === 'You' 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm mr-3">
                      {player.rank}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{player.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-blue-600">{player.score}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
                <Target className="mx-auto mb-4 text-blue-600" size={48} />
                <h3 className="text-2xl font-bold mb-2">{score}</h3>
                <p className="text-gray-600 dark:text-gray-300">Total Score</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
                <Flame className="mx-auto mb-4 text-orange-600" size={48} />
                <h3 className="text-2xl font-bold mb-2">{streak}</h3>
                <p className="text-gray-600 dark:text-gray-300">Current Streak</p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg text-center">
                <Award className="mx-auto mb-4 text-yellow-600" size={48} />
                <h3 className="text-2xl font-bold mb-2">{achievements.length}</h3>
                <p className="text-gray-600 dark:text-gray-300">Achievements</p>
              </div>
            </div>

            {/* Subject Progress */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Subject Progress</h3>
              
              <div className="space-y-4">
                {Object.entries(userProgress).map(([key, progress]: [string, any]) => (
                  <div key={key} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold capitalize">
                        {progress.subject} - {progress.grade}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {progress.total_correct}/{progress.total_attempted}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${progress.total_attempted > 0 ? (progress.total_correct / progress.total_attempted) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                ))}

                {Object.keys(userProgress).length === 0 && (
                  <div className="text-center py-8">
                    <TrendingUp className="mx-auto mb-4 text-gray-400" size={48} />
                    <p className="text-gray-600 dark:text-gray-300">
                      No progress data yet. Start learning to see your progress!
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Audio element for sound effects */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default PlayLearnPage;