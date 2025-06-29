import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import {
  BookOpen,
  Mic,
  Code,
  Users,
  Video,
  Gamepad2,
  Brain,
  Globe,
  Star,
  Trophy,
  Zap,
  Target,
  Heart,
  Music,
  Palette,
  Camera,
  Headphones,
  Sparkles,
  Crown,
  Gift,
  ArrowRight,
  Play,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Home,
  GraduationCap,
  Rocket,
  Puzzle,
  Wand2,
  Volume2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';
import PaymentModal from './PaymentModal';

/**
 * Play & Learn Page Component
 * Main hub for all learning activities and features
 */
interface Feature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  route: string;
  isPremium: boolean;
  category: 'learning' | 'creative' | 'social' | 'advanced';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  color: string;
}

interface UserStats {
  totalPoints: number;
  streak: number;
  completedActivities: number;
  favoriteSubject: string;
  level: number;
  achievements: string[];
}

const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 0,
    streak: 0,
    completedActivities: 0,
    favoriteSubject: 'Math',
    level: 1,
    achievements: []
  });
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showWelcome, setShowWelcome] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Feature definitions
  const features: Feature[] = [
    {
      id: 'interactive-book',
      title: 'Interactive Learning Book',
      description: 'Explore subjects through our magical interactive book with AI-powered content',
      icon: <BookOpen size={32} />,
      route: '/',
      isPremium: false,
      category: 'learning',
      difficulty: 'beginner',
      estimatedTime: '15-30 min',
      color: 'from-blue-500 to-blue-600'
    },
    {
      id: 'voice-recognition',
      title: 'Enhanced Voice Recognition',
      description: 'Practice pronunciation and speaking with advanced AI voice analysis',
      icon: <Mic size={32} />,
      route: '/voice-recognition',
      isPremium: false,
      category: 'learning',
      difficulty: 'intermediate',
      estimatedTime: '10-20 min',
      color: 'from-green-500 to-green-600'
    },
    {
      id: 'ar-problems',
      title: 'AR Learning Experience',
      description: 'Solve problems in augmented reality with 3D interactive objects',
      icon: <Camera size={32} />,
      route: '/ar-problems',
      isPremium: true,
      category: 'advanced',
      difficulty: 'advanced',
      estimatedTime: '20-40 min',
      color: 'from-purple-500 to-purple-600'
    },
    {
      id: 'live-code',
      title: 'Collaborative Coding',
      description: 'Code together in real-time with voice chat and screen sharing',
      icon: <Code size={32} />,
      route: '/live-code',
      isPremium: true,
      category: 'social',
      difficulty: 'intermediate',
      estimatedTime: '30-60 min',
      color: 'from-indigo-500 to-indigo-600'
    },
    {
      id: 'story-mode',
      title: 'Interactive Stories',
      description: 'Learn through engaging AI-generated stories with voice narration',
      icon: <BookOpen size={32} />,
      route: '/story-mode',
      isPremium: false,
      category: 'creative',
      difficulty: 'beginner',
      estimatedTime: '15-25 min',
      color: 'from-pink-500 to-pink-600'
    },
    {
      id: 'teacher-dashboard',
      title: 'Teacher Dashboard',
      description: 'Track student progress and manage classroom activities',
      icon: <GraduationCap size={32} />,
      route: '/teacher-dashboard',
      isPremium: false,
      category: 'advanced',
      difficulty: 'advanced',
      estimatedTime: '10-15 min',
      color: 'from-orange-500 to-orange-600'
    },
    {
      id: 'ai-tutor',
      title: 'AI Personal Tutor',
      description: 'Get personalized 1-on-1 tutoring with adaptive AI technology',
      icon: <Brain size={32} />,
      route: '/ai-tutor',
      isPremium: true,
      category: 'learning',
      difficulty: 'intermediate',
      estimatedTime: '20-45 min',
      color: 'from-teal-500 to-teal-600'
    },
    {
      id: 'music-learning',
      title: 'Music & Rhythm',
      description: 'Learn through music, songs, and rhythm-based activities',
      icon: <Music size={32} />,
      route: '/music-learning',
      isPremium: true,
      category: 'creative',
      difficulty: 'beginner',
      estimatedTime: '15-30 min',
      color: 'from-yellow-500 to-yellow-600'
    },
    {
      id: 'art-studio',
      title: 'Digital Art Studio',
      description: 'Create and learn through digital art and creative expression',
      icon: <Palette size={32} />,
      route: '/art-studio',
      isPremium: true,
      category: 'creative',
      difficulty: 'intermediate',
      estimatedTime: '25-45 min',
      color: 'from-red-500 to-red-600'
    },
    {
      id: 'global-classroom',
      title: 'Global Classroom',
      description: 'Connect with students worldwide for cultural exchange and learning',
      icon: <Globe size={32} />,
      route: '/global-classroom',
      isPremium: true,
      category: 'social',
      difficulty: 'intermediate',
      estimatedTime: '30-60 min',
      color: 'from-cyan-500 to-cyan-600'
    }
  ];

  const categories = [
    { id: 'all', name: 'All Features', icon: <Sparkles size={20} /> },
    { id: 'learning', name: 'Learning', icon: <Brain size={20} /> },
    { id: 'creative', name: 'Creative', icon: <Palette size={20} /> },
    { id: 'social', name: 'Social', icon: <Users size={20} /> },
    { id: 'advanced', name: 'Advanced', icon: <Rocket size={20} /> }
  ];

  /**
   * Initialize page and load user data
   */
  useEffect(() => {
    const initializePage = async () => {
      try {
        setIsLoading(true);

        // Check premium status using PayPal
        const premiumStatus = await checkPremiumSubscription();
        setIsPremium(premiumStatus);

        // Load user statistics
        await loadUserStats();

        // Check if this is user's first visit
        const hasVisited = localStorage.getItem('edusphere_has_visited');
        if (!hasVisited) {
          setShowWelcome(true);
          localStorage.setItem('edusphere_has_visited', 'true');
        }

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
   * Check if user has premium subscription via PayPal
   */
  const checkPremiumSubscription = async () => {
    try {
      // Call PayPal subscription check endpoint
      const response = await fetch('/.netlify/functions/paypal-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'check_subscription'
        })
      });

      const result = await response.json();
      return result.success && result.hasActiveSubscription;
    } catch (error) {
      console.error('Failed to check premium subscription:', error);
      return false;
    }
  };

  /**
   * Get current user ID from local storage
   */
  const getCurrentUserId = () => {
    return localStorage.getItem('edusphere_user_id') || 'anonymous_user';
  };

  /**
   * Load user statistics from Supabase
   */
  const loadUserStats = async () => {
    try {
      const userId = getCurrentUserId();

      // Load user achievements
      const { data: achievements, error: achievementsError } = await supabase
        .from('user_achievements')
        .select('*')
        .eq('user_id', userId);

      if (achievementsError) throw achievementsError;

      // Load user progress
      const { data: progress, error: progressError } = await supabase
        .from('user_progress')
        .select('*')
        .eq('user_id', userId);

      if (progressError) throw progressError;

      // Calculate statistics
      const totalPoints = achievements?.reduce((sum, achievement) => sum + (achievement.points || 0), 0) || 0;
      const completedActivities = progress?.length || 0;
      const level = Math.floor(totalPoints / 100) + 1;

      // Calculate streak (simplified)
      const streak = Math.max(0, Math.floor(Math.random() * 10)); // Mock streak for demo

      setUserStats({
        totalPoints,
        streak,
        completedActivities,
        favoriteSubject: 'Math', // Could be calculated from progress data
        level,
        achievements: achievements?.map(a => a.achievement_name) || []
      });

    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  /**
   * Handle feature selection
   */
  const handleFeatureSelect = (feature: Feature) => {
    if (feature.isPremium && !isPremium) {
      // Show premium upgrade modal
      setShowPaymentModal(true);
      return;
    }

    // Add some celebration for feature access
    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.8 }
    });

    // Navigate to feature
    navigate(feature.route);
  };

  /**
   * Handle successful payment/subscription
   */
  const handlePaymentSuccess = () => {
    setIsPremium(true);
    setShowPaymentModal(false);
    
    // Show celebration
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  };

  /**
   * Filter features based on category and search
   */
  const filteredFeatures = features.filter(feature => {
    const matchesCategory = selectedCategory === 'all' || feature.category === selectedCategory;
    const matchesSearch = feature.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         feature.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  /**
   * Get difficulty color
   */
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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
          <p className="text-xl font-semibold text-blue-800">Loading your learning adventure...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <motion.div
                className="flex items-center"
                whileHover={{ scale: 1.05 }}
              >
                <Rocket className="text-blue-600 mr-2" size={32} />
                <h1 className="text-2xl font-bold text-gray-800">EduSphere AI</h1>
              </motion.div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => navigate('/')}
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <Home className="mr-1" size={18} />
                Home
              </button>
              <button
                onClick={() => navigate('/teacher-dashboard')}
                className="flex items-center text-gray-600 hover:text-blue-600 transition-colors"
              >
                <GraduationCap className="mr-1" size={18} />
                Teachers
              </button>
              <button className="flex items-center text-gray-600 hover:text-blue-600 transition-colors">
                <Settings className="mr-1" size={18} />
                Settings
              </button>
            </nav>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {isPremium && (
                <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  <Crown className="mr-1" size={16} />
                  Premium
                </div>
              )}
              
              <div className="flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                <Star className="mr-1" size={16} />
                Level {userStats.level}
              </div>

              <button className="p-2 text-gray-600 hover:text-blue-600 transition-colors">
                <User size={20} />
              </button>

              {/* Mobile menu button */}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 text-gray-600 hover:text-blue-600 transition-colors"
              >
                {showMobileMenu ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {showMobileMenu && (
            <motion.div
              className="md:hidden bg-white border-t"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="px-4 py-2 space-y-2">
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center w-full text-left text-gray-600 hover:text-blue-600 py-2"
                >
                  <Home className="mr-2" size={18} />
                  Home
                </button>
                <button
                  onClick={() => navigate('/teacher-dashboard')}
                  className="flex items-center w-full text-left text-gray-600 hover:text-blue-600 py-2"
                >
                  <GraduationCap className="mr-2" size={18} />
                  Teachers
                </button>
                <button className="flex items-center w-full text-left text-gray-600 hover:text-blue-600 py-2">
                  <Settings className="mr-2" size={18} />
                  Settings
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Welcome Modal */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="text-blue-600 mb-4">
                <Sparkles className="w-16 h-16 mx-auto" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-4">Welcome to EduSphere AI!</h2>
              <p className="text-gray-600 mb-6">
                Discover a world of interactive learning with AI-powered features, voice recognition, AR experiences, and collaborative tools.
              </p>
              <motion.button
                onClick={() => {
                  setShowWelcome(false);
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                  });
                }}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Start Learning!
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-800 mb-4">
            Play & Learn
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Discover the future of education with AI-powered interactive learning experiences
          </p>

          {/* User Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto mb-8">
            <motion.div
              className="bg-white rounded-lg p-4 shadow-md"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-2xl font-bold text-blue-600">{userStats.totalPoints}</div>
              <div className="text-sm text-gray-600">Points</div>
            </motion.div>
            <motion.div
              className="bg-white rounded-lg p-4 shadow-md"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-2xl font-bold text-orange-600">{userStats.streak}</div>
              <div className="text-sm text-gray-600">Day Streak</div>
            </motion.div>
            <motion.div
              className="bg-white rounded-lg p-4 shadow-md"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-2xl font-bold text-green-600">{userStats.completedActivities}</div>
              <div className="text-sm text-gray-600">Activities</div>
            </motion.div>
            <motion.div
              className="bg-white rounded-lg p-4 shadow-md"
              whileHover={{ scale: 1.05 }}
            >
              <div className="text-2xl font-bold text-purple-600">{userStats.level}</div>
              <div className="text-sm text-gray-600">Level</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Search and Filters */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search features..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <motion.button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedCategory === category.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-blue-50 shadow-md'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {category.icon}
                  <span className="ml-2">{category.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          {filteredFeatures.map((feature, index) => (
            <motion.div
              key={feature.id}
              className="bg-white rounded-2xl shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 cursor-pointer group"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -5 }}
              onClick={() => handleFeatureSelect(feature)}
            >
              {/* Feature Header */}
              <div className={`bg-gradient-to-r ${feature.color} p-6 text-white relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full transform translate-x-16 -translate-y-16"></div>
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 bg-white bg-opacity-20 rounded-lg">
                      {feature.icon}
                    </div>
                    {feature.isPremium && (
                      <div className="flex items-center bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold">
                        <Crown size={12} className="mr-1" />
                        PRO
                      </div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-white text-opacity-90 text-sm">{feature.description}</p>
                </div>
              </div>

              {/* Feature Details */}
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getDifficultyColor(feature.difficulty)}`}>
                    {feature.difficulty}
                  </span>
                  <span className="text-gray-500 text-sm">{feature.estimatedTime}</span>
                </div>

                <motion.button
                  className="w-full bg-gray-100 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="mr-2" size={16} />
                  Start Learning
                  <ArrowRight className="ml-2 transform group-hover:translate-x-1 transition-transform" size={16} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* No Results */}
        {filteredFeatures.length === 0 && (
          <motion.div
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Puzzle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No features found</h3>
            <p className="text-gray-500">Try adjusting your search or category filter</p>
          </motion.div>
        )}

        {/* Premium CTA */}
        {!isPremium && (
          <motion.div
            className="mt-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
          >
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
            <h2 className="text-3xl font-bold mb-4">Unlock Premium Features</h2>
            <p className="text-xl mb-6 opacity-90">
              Get access to AR learning, collaborative coding, AI tutoring, and much more!
            </p>
            <motion.button
              onClick={() => setShowPaymentModal(true)}
              className="bg-yellow-400 text-purple-900 px-8 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Upgrade to Premium
            </motion.button>
          </motion.div>
        )}
      </main>

      {/* Payment Modal */}
      <PaymentModal 
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
};

export default PlayLearnPage;