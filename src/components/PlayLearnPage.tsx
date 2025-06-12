import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Puzzle, 
  Play, 
  Video, 
  X, 
  Check, 
  Volume2,
  VideoIcon,
  ArrowLeft,
  Sparkles,
  Send,
  BookOpen,
  FileText,
  GraduationCap,
  Loader2,
  Crown,
  Lock,
  Globe,
  Languages,
  Trophy,
  Star,
  Share2,
  Target,
  Zap,
  Award,
  TrendingUp,
  Users,
  Heart,
  Eye,
  Settings,
  Mic,
  Bot,
  Lightbulb,
  ArrowRight,
  Gift,
  Calendar,
  Clock,
  Brain,
  Gamepad2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';
import { supabase, supabaseHelpers, UserPreferences, UserAchievements, SharedContent } from '../lib/supabase';

// Drag and drop types
const ItemTypes = {
  BLOCK: 'block'
};

// Language configuration with ElevenLabs voice IDs
const LANGUAGES = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
    locale: 'en-US'
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    voiceId: 'XB0fDUnXU5powFXDhCwa', // Charlotte (Spanish)
    locale: 'es-ES'
  },
  zh: {
    name: '中文',
    flag: '🇨🇳',
    voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam (Mandarin)
    locale: 'zh-CN'
  }
};

// AI Tutor tone options
const TUTOR_TONES = {
  friendly: {
    name: 'Friendly',
    icon: '😊',
    description: 'Warm and encouraging',
    color: 'bg-green-100 text-green-800'
  },
  professional: {
    name: 'Professional',
    icon: '👔',
    description: 'Clear and structured',
    color: 'bg-blue-100 text-blue-800'
  },
  enthusiastic: {
    name: 'Enthusiastic',
    icon: '🎉',
    description: 'Energetic and motivating',
    color: 'bg-orange-100 text-orange-800'
  },
  patient: {
    name: 'Patient',
    icon: '🧘',
    description: 'Calm and understanding',
    color: 'bg-purple-100 text-purple-800'
  },
  playful: {
    name: 'Playful',
    icon: '🎮',
    description: 'Fun and interactive',
    color: 'bg-pink-100 text-pink-800'
  }
};

// Achievement badges configuration
const ACHIEVEMENT_BADGES = {
  first_lesson: {
    name: 'First Steps',
    description: 'Completed your first lesson',
    icon: '🎯',
    points: 10,
    color: 'bg-blue-500'
  },
  streak_3: {
    name: '3-Day Streak',
    description: 'Learned for 3 days in a row',
    icon: '🔥',
    points: 25,
    color: 'bg-orange-500'
  },
  streak_7: {
    name: 'Week Warrior',
    description: 'Learned for 7 days in a row',
    icon: '⚡',
    points: 50,
    color: 'bg-yellow-500'
  },
  perfect_score: {
    name: 'Perfect Score',
    description: 'Got 100% on a lesson',
    icon: '⭐',
    points: 30,
    color: 'bg-green-500'
  },
  social_sharer: {
    name: 'Social Butterfly',
    description: 'Shared your first creation',
    icon: '🦋',
    points: 20,
    color: 'bg-purple-500'
  },
  ai_tutor_fan: {
    name: 'AI Tutor Fan',
    description: 'Used AI tutor 5 times',
    icon: '🤖',
    points: 40,
    color: 'bg-indigo-500'
  }
};

// Translation dictionary for UI elements
const TRANSLATIONS = {
  en: {
    playAndLearn: 'Play & Learn',
    backToBook: 'Back to Book',
    upgradeToPremiun: 'Upgrade to Premium',
    premiumActive: 'Premium Active',
    aiContentGenerator: 'AI Content Generator',
    poweredByClaude: 'Powered by Claude Sonnet 4',
    contentType: 'Content Type',
    gradeLevel: 'Grade Level',
    subject: 'Subject',
    describeContent: 'Describe what you want to create',
    generateContent: 'Generate Content',
    generatingWithClaude: 'Generating with Claude Sonnet 4...',
    pictureSlides: 'Picture Slides',
    learningVideos: 'Learning Videos',
    dragDropCoding: 'Drag & Drop Coding',
    availableBlocks: 'Available Blocks:',
    buildYourProgram: 'Build Your Program:',
    yourProgram: 'Your Program:',
    clearProgram: 'Clear Program',
    listen: 'Listen',
    generateVideo: 'Generate Video',
    forward: 'Forward',
    turnLeft: 'Turn Left',
    turnRight: 'Turn Right',
    resetRobot: 'Reset Robot',
    language: 'Language',
    selectLanguage: 'Select Language',
    nextLesson: 'Next Lesson',
    achievements: 'Achievements',
    leaderboard: 'Leaderboard',
    shareCreation: 'Share Creation',
    aiTutor: 'AI Tutor',
    personalizedLearning: 'Personalized Learning',
    gamification: 'Gamification',
    socialSharing: 'Social Sharing'
  },
  es: {
    playAndLearn: 'Jugar y Aprender',
    backToBook: 'Volver al Libro',
    upgradeToPremiun: 'Actualizar a Premium',
    premiumActive: 'Premium Activo',
    aiContentGenerator: 'Generador de Contenido IA',
    poweredByClaude: 'Impulsado por Claude Sonnet 4',
    contentType: 'Tipo de Contenido',
    gradeLevel: 'Nivel de Grado',
    subject: 'Materia',
    describeContent: 'Describe lo que quieres crear',
    generateContent: 'Generar Contenido',
    generatingWithClaude: 'Generando con Claude Sonnet 4...',
    pictureSlides: 'Diapositivas con Imágenes',
    learningVideos: 'Videos de Aprendizaje',
    dragDropCoding: 'Programación Arrastrar y Soltar',
    availableBlocks: 'Bloques Disponibles:',
    buildYourProgram: 'Construye tu Programa:',
    yourProgram: 'Tu Programa:',
    clearProgram: 'Limpiar Programa',
    listen: 'Escuchar',
    generateVideo: 'Generar Video',
    forward: 'Adelante',
    turnLeft: 'Girar Izquierda',
    turnRight: 'Girar Derecha',
    resetRobot: 'Reiniciar Robot',
    language: 'Idioma',
    selectLanguage: 'Seleccionar Idioma',
    nextLesson: 'Próxima Lección',
    achievements: 'Logros',
    leaderboard: 'Tabla de Clasificación',
    shareCreation: 'Compartir Creación',
    aiTutor: 'Tutor IA',
    personalizedLearning: 'Aprendizaje Personalizado',
    gamification: 'Gamificación',
    socialSharing: 'Compartir Social'
  },
  zh: {
    playAndLearn: '游戏学习',
    backToBook: '返回书本',
    upgradeToPremiun: '升级到高级版',
    premiumActive: '高级版已激活',
    aiContentGenerator: 'AI内容生成器',
    poweredByClaude: '由Claude Sonnet 4驱动',
    contentType: '内容类型',
    gradeLevel: '年级水平',
    subject: '科目',
    describeContent: '描述您想要创建的内容',
    generateContent: '生成内容',
    generatingWithClaude: '正在使用Claude Sonnet 4生成...',
    pictureSlides: '图片幻灯片',
    learningVideos: '学习视频',
    dragDropCoding: '拖拽编程',
    availableBlocks: '可用块:',
    buildYourProgram: '构建您的程序:',
    yourProgram: '您的程序:',
    clearProgram: '清除程序',
    listen: '听',
    generateVideo: '生成视频',
    forward: '前进',
    turnLeft: '左转',
    turnRight: '右转',
    resetRobot: '重置机器人',
    language: '语言',
    selectLanguage: '选择语言',
    nextLesson: '下一课',
    achievements: '成就',
    leaderboard: '排行榜',
    shareCreation: '分享创作',
    aiTutor: 'AI导师',
    personalizedLearning: '个性化学习',
    gamification: '游戏化',
    socialSharing: '社交分享'
  }
};

/**
 * Language Selector Component
 */
const LanguageSelector = ({ 
  currentLanguage, 
  onLanguageChange 
}: { 
  currentLanguage: string; 
  onLanguageChange: (lang: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Globe className="mr-2" size={20} />
        <span className="mr-2">{LANGUAGES[currentLanguage]?.flag}</span>
        <span className="font-medium">{LANGUAGES[currentLanguage]?.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="ml-2"
        >
          ▼
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 min-w-[200px]"
          >
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <motion.button
                key={code}
                onClick={() => {
                  onLanguageChange(code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center px-4 py-3 hover:bg-blue-50 transition-colors ${
                  currentLanguage === code ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                }`}
                whileHover={{ backgroundColor: '#dbeafe' }}
              >
                <span className="mr-3 text-xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {currentLanguage === code && (
                  <Check className="ml-auto text-blue-600" size={16} />
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/**
 * Personalized Learning Component
 */
const PersonalizedLearning = ({ 
  userId, 
  language, 
  isPremium, 
  onUpgradeClick 
}: { 
  userId: string; 
  language: string; 
  isPremium: boolean; 
  onUpgradeClick: () => void;
}) => {
  const [nextLesson, setNextLesson] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    loadUserPreferences();
  }, [userId]);

  const loadUserPreferences = async () => {
    try {
      const userPrefs = await supabaseHelpers.getUserPreferences(userId);
      setPreferences(userPrefs);
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  const getNextLesson = async () => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/personalizeContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          user_id: userId,
          language: language,
          preferences: preferences
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setNextLesson(result.lesson);
      } else {
        console.error('Failed to get next lesson:', result.message);
      }
    } catch (error) {
      console.error('Error getting next lesson:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg border border-blue-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-2 rounded-full mr-3">
          <Brain className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{t.personalizedLearning}</h3>
          <p className="text-gray-600">AI-powered learning recommendations</p>
        </div>
      </div>

      {preferences && (
        <div className="mb-4 p-3 bg-white/60 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Preferred Subject:</strong> {preferences.preferred_subject} | 
            <strong> Difficulty:</strong> {preferences.preferred_difficulty}/5 | 
            <strong> Style:</strong> {preferences.learning_style}
          </p>
        </div>
      )}

      {nextLesson && (
        <motion.div
          className="mb-4 p-4 bg-white rounded-lg shadow-sm border border-gray-200"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h4 className="font-semibold text-gray-800 mb-2">Recommended Next Lesson:</h4>
          <p className="text-gray-700 mb-2">{nextLesson.title}</p>
          <p className="text-sm text-gray-600 mb-3">{nextLesson.description}</p>
          <div className="flex items-center justify-between">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {nextLesson.subject} • {nextLesson.difficulty}/5
            </span>
            <motion.button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Start Lesson
            </motion.button>
          </div>
        </motion.div>
      )}

      <motion.button
        onClick={getNextLesson}
        disabled={isLoading || !isPremium}
        className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${
          !isPremium
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isLoading
            ? 'bg-blue-400 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700'
        }`}
        whileHover={isPremium && !isLoading ? { scale: 1.02 } : {}}
        whileTap={isPremium && !isLoading ? { scale: 0.98 } : {}}
      >
        {isLoading ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            Getting your next lesson...
          </>
        ) : !isPremium ? (
          <>
            <Lock className="mr-2" size={20} />
            Premium Required
          </>
        ) : (
          <>
            <Target className="mr-2" size={20} />
            {t.nextLesson}
          </>
        )}
      </motion.button>
    </motion.div>
  );
};

/**
 * Gamification Component with Achievements and Leaderboard
 */
const GamificationPanel = ({ 
  userId, 
  language 
}: { 
  userId: string; 
  language: string;
}) => {
  const [achievements, setAchievements] = useState<UserAchievements[]>([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [userStats, setUserStats] = useState({ totalPoints: 0, rank: 0, streak: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    loadAchievements();
    loadLeaderboard();
  }, [userId]);

  const loadAchievements = async () => {
    try {
      const userAchievements = await supabaseHelpers.getUserAchievements(userId);
      setAchievements(userAchievements);
      
      const totalPoints = userAchievements.reduce((sum, achievement) => sum + achievement.points, 0);
      setUserStats(prev => ({ ...prev, totalPoints }));
    } catch (error) {
      console.error('Failed to load achievements:', error);
    }
  };

  const loadLeaderboard = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/.netlify/functions/achievements', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        }
      });

      const result = await response.json();
      
      if (result.success) {
        setLeaderboard(result.leaderboard);
        setUserStats(prev => ({ ...prev, rank: result.userRank, streak: result.userStreak }));
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkForNewAchievements = async () => {
    try {
      const response = await fetch('/.netlify/functions/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          user_id: userId,
          action: 'check_achievements'
        })
      });

      const result = await response.json();
      
      if (result.success && result.newAchievements.length > 0) {
        // Show achievement notification
        result.newAchievements.forEach(achievement => {
          showAchievementNotification(achievement);
        });
        
        // Reload achievements
        loadAchievements();
      }
    } catch (error) {
      console.error('Error checking achievements:', error);
    }
  };

  const showAchievementNotification = (achievement) => {
    // Create a toast notification for new achievement
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-lg shadow-lg z-50 transform translate-x-full transition-transform duration-300';
    notification.innerHTML = `
      <div class="flex items-center">
        <div class="text-2xl mr-3">${achievement.badge_icon}</div>
        <div>
          <div class="font-bold">Achievement Unlocked!</div>
          <div class="text-sm">${achievement.badge_name}</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-6 shadow-lg border border-yellow-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-r from-yellow-500 to-orange-600 p-2 rounded-full mr-3">
          <Trophy className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{t.gamification}</h3>
          <p className="text-gray-600">Achievements and leaderboard</p>
        </div>
      </div>

      {/* User Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 bg-white/60 rounded-lg">
          <div className="text-2xl font-bold text-yellow-600">{userStats.totalPoints}</div>
          <div className="text-sm text-gray-600">Points</div>
        </div>
        <div className="text-center p-3 bg-white/60 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">#{userStats.rank || '?'}</div>
          <div className="text-sm text-gray-600">Rank</div>
        </div>
        <div className="text-center p-3 bg-white/60 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{userStats.streak}</div>
          <div className="text-sm text-gray-600">Streak</div>
        </div>
      </div>

      {/* Recent Achievements */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">Recent Achievements</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {achievements.slice(0, 3).map((achievement, index) => (
            <motion.div
              key={achievement.id}
              className="flex items-center p-2 bg-white/60 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="text-2xl mr-3">{achievement.badge_icon}</div>
              <div className="flex-1">
                <div className="font-medium text-gray-800">{achievement.badge_name}</div>
                <div className="text-xs text-gray-600">{achievement.points} points</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button
          onClick={checkForNewAchievements}
          className="bg-yellow-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-yellow-600 transition-colors"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Award className="inline mr-2" size={16} />
          Check Progress
        </motion.button>
        
        <motion.button
          onClick={loadLeaderboard}
          disabled={isLoading}
          className="bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {isLoading ? (
            <Loader2 className="inline animate-spin mr-2" size={16} />
          ) : (
            <TrendingUp className="inline mr-2" size={16} />
          )}
          {t.leaderboard}
        </motion.button>
      </div>
    </motion.div>
  );
};

/**
 * Social Sharing Component
 */
const SocialSharingPanel = ({ 
  userId, 
  language, 
  isPremium, 
  onUpgradeClick 
}: { 
  userId: string; 
  language: string; 
  isPremium: boolean; 
  onUpgradeClick: () => void;
}) => {
  const [sharedContent, setSharedContent] = useState<SharedContent[]>([]);
  const [isSharing, setIsSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    loadSharedContent();
  }, []);

  const loadSharedContent = async () => {
    try {
      const content = await supabaseHelpers.getSharedContent(10);
      setSharedContent(content);
    } catch (error) {
      console.error('Failed to load shared content:', error);
    }
  };

  const shareCreation = async () => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }

    setIsSharing(true);
    try {
      // Generate video with Tavus
      const response = await fetch('/.netlify/functions/generateVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          topic: 'My Learning Creation',
          age_group: 'grade1-6',
          script: 'Check out what I created in EduSphere AI!',
          userId: userId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Save to shared content
        const shareData: SharedContent = {
          user_id: userId,
          content_type: 'video',
          content_title: 'My Learning Creation',
          share_url: result.video_data?.video_url || 'https://example.com/share',
          thumbnail_url: result.video_data?.thumbnail_url,
          description: 'Created with EduSphere AI',
          views: 0,
          likes: 0
        };

        const shareId = await supabaseHelpers.shareContent(shareData);
        
        if (shareId) {
          setShareUrl(`https://edusphere.ai/share/${shareId}`);
          loadSharedContent(); // Refresh the list
          
          // Award achievement for first share
          await fetch('/.netlify/functions/achievements', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-User-ID': userId
            },
            body: JSON.stringify({
              user_id: userId,
              action: 'award_achievement',
              achievement_type: 'social_sharer'
            })
          });
        }
      }
    } catch (error) {
      console.error('Error sharing creation:', error);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 shadow-lg border border-purple-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-2 rounded-full mr-3">
          <Share2 className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{t.socialSharing}</h3>
          <p className="text-gray-600">Share your creations with Tavus videos</p>
        </div>
      </div>

      {shareUrl && (
        <motion.div
          className="mb-4 p-3 bg-green-100 border border-green-200 rounded-lg"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <p className="text-green-800 text-sm mb-2">✅ Successfully shared!</p>
          <div className="flex items-center">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 p-2 bg-white border border-green-300 rounded text-sm"
            />
            <motion.button
              onClick={() => navigator.clipboard.writeText(shareUrl)}
              className="ml-2 bg-green-500 text-white px-3 py-2 rounded text-sm hover:bg-green-600 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Copy
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Recent Shared Content */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">Community Creations</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {sharedContent.slice(0, 3).map((content, index) => (
            <motion.div
              key={content.id}
              className="flex items-center p-2 bg-white/60 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <div className="w-8 h-8 bg-purple-200 rounded mr-3 flex items-center justify-center">
                <VideoIcon size={16} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium text-gray-800 text-sm">{content.content_title}</div>
                <div className="text-xs text-gray-600 flex items-center">
                  <Eye size={12} className="mr-1" />
                  {content.views}
                  <Heart size={12} className="ml-2 mr-1" />
                  {content.likes}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <motion.button
        onClick={shareCreation}
        disabled={isSharing || !isPremium}
        className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${
          !isPremium
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isSharing
            ? 'bg-purple-400 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700'
        }`}
        whileHover={isPremium && !isSharing ? { scale: 1.02 } : {}}
        whileTap={isPremium && !isSharing ? { scale: 0.98 } : {}}
      >
        {isSharing ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            Creating video...
          </>
        ) : !isPremium ? (
          <>
            <Lock className="mr-2" size={20} />
            Premium Required
          </>
        ) : (
          <>
            <Share2 className="mr-2" size={20} />
            {t.shareCreation}
          </>
        )}
      </motion.button>
    </motion.div>
  );
};

/**
 * AI Tutor Component
 */
const AITutorPanel = ({ 
  userId, 
  language, 
  isPremium, 
  onUpgradeClick 
}: { 
  userId: string; 
  language: string; 
  isPremium: boolean; 
  onUpgradeClick: () => void;
}) => {
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [tutorScript, setTutorScript] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedScripts, setSavedScripts] = useState([]);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  useEffect(() => {
    loadSavedScripts();
  }, []);

  const loadSavedScripts = async () => {
    try {
      const scripts = await supabaseHelpers.getTutorScripts({ tone: selectedTone });
      setSavedScripts(scripts);
    } catch (error) {
      console.error('Failed to load tutor scripts:', error);
    }
  };

  const generateTutorVideo = async () => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch('/.netlify/functions/generateVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          topic: 'AI Tutor Session',
          age_group: 'grade1-6',
          script: tutorScript || 'Hello! I\'m your AI tutor. Let\'s learn something amazing together!',
          tone: selectedTone,
          userId: userId
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Save the script
        await supabaseHelpers.saveTutorScript({
          tone: selectedTone,
          script: tutorScript,
          grade: 'grade1-6',
          subject: 'general',
          topic: 'AI Tutor Session',
          duration_minutes: 2,
          voice_settings: { tone: selectedTone }
        });

        // Award achievement for using AI tutor
        await fetch('/.netlify/functions/achievements', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId
          },
          body: JSON.stringify({
            user_id: userId,
            action: 'award_achievement',
            achievement_type: 'ai_tutor_fan'
          })
        });

        loadSavedScripts();
        alert('AI Tutor video generated successfully!');
      }
    } catch (error) {
      console.error('Error generating tutor video:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <motion.div
      className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 shadow-lg border border-indigo-100"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="flex items-center mb-4">
        <div className="bg-gradient-to-r from-indigo-500 to-blue-600 p-2 rounded-full mr-3">
          <Bot className="text-white" size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-800">{t.aiTutor}</h3>
          <p className="text-gray-600">Personalized AI tutor with tone selection</p>
        </div>
      </div>

      {/* Tone Selector */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-800 mb-2">Select Tutor Tone:</h4>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(TUTOR_TONES).map(([key, tone]) => (
            <motion.button
              key={key}
              onClick={() => setSelectedTone(key)}
              className={`p-3 rounded-lg border-2 transition-all ${
                selectedTone === key
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-2xl mb-1">{tone.icon}</div>
              <div className="font-medium text-sm">{tone.name}</div>
              <div className="text-xs text-gray-600">{tone.description}</div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Script Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Custom Script (optional):
        </label>
        <textarea
          value={tutorScript}
          onChange={(e) => setTutorScript(e.target.value)}
          placeholder="Enter a custom script for your AI tutor..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          rows={3}
        />
      </div>

      {/* Recent Scripts */}
      {savedScripts.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-800 mb-2">Recent Scripts:</h4>
          <div className="space-y-1 max-h-20 overflow-y-auto">
            {savedScripts.slice(0, 2).map((script, index) => (
              <div key={script.id} className="text-xs p-2 bg-white/60 rounded">
                <span className={`inline-block px-2 py-1 rounded text-xs ${TUTOR_TONES[script.tone]?.color || 'bg-gray-100'}`}>
                  {TUTOR_TONES[script.tone]?.name || script.tone}
                </span>
                <span className="ml-2 text-gray-600">{script.script.substring(0, 50)}...</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <motion.button
        onClick={generateTutorVideo}
        disabled={isGenerating || !isPremium}
        className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${
          !isPremium
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : isGenerating
            ? 'bg-indigo-400 text-white cursor-not-allowed'
            : 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white hover:from-indigo-600 hover:to-blue-700'
        }`}
        whileHover={isPremium && !isGenerating ? { scale: 1.02 } : {}}
        whileTap={isPremium && !isGenerating ? { scale: 0.98 } : {}}
      >
        {isGenerating ? (
          <>
            <Loader2 className="animate-spin mr-2" size={20} />
            Generating AI Tutor...
          </>
        ) : !isPremium ? (
          <>
            <Lock className="mr-2" size={20} />
            Premium Required
          </>
        ) : (
          <>
            <Mic className="mr-2" size={20} />
            Generate AI Tutor
          </>
        )}
      </motion.button>
    </motion.div>
  );
};

/**
 * Draggable coding block component
 */
const DragBlock = ({ 
  id, 
  type, 
  children 
}: { 
  id: string; 
  type: string; 
  children: React.ReactNode;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { id, type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <motion.div
      ref={drag}
      className={`p-4 rounded-lg transition-all cursor-move ${
        type === 'move' ? 'bg-blue-200' : 
        type === 'jump' ? 'bg-green-200' : 
        'bg-purple-200'
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      {children}
    </motion.div>
  );
};

/**
 * Drop zone for coding blocks
 */
const DropZone = ({ 
  onDrop, 
  language 
}: { 
  onDrop: (item: any) => void;
  language: string;
}) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: (item) => onDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() })
  }));

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <motion.div
      ref={drop}
      className={`p-6 rounded-lg border-2 border-dashed h-40 flex items-center justify-center transition-colors ${
        isOver ? 'border-blue-400 bg-blue-50' : 'border-yellow-400 bg-yellow-100'
      }`}
      animate={{ 
        borderColor: isOver ? '#60A5FA' : ['#FBBF24', '#F59E0B', '#FBBF24'], 
        transition: { duration: 2, repeat: Infinity } 
      }}
    >
      <p className="text-center font-medium">
        {language === 'es' ? 'Arrastra bloques aquí para construir tu juego!' :
         language === 'zh' ? '将块拖到这里来构建您的游戏！' :
         'Drop blocks here to build your game!'}
      </p>
    </motion.div>
  );
};

/**
 * Enhanced narration function with multilingual support
 */
const handleMultilingualNarration = async (
  text: string, 
  language: string, 
  isPremium: boolean,
  onUpgradeClick: () => void
) => {
  try {
    if (!isPremium) {
      // Use browser's speech synthesis for free users
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      utterance.volume = 0.8;
      utterance.lang = LANGUAGES[language]?.locale || 'en-US';
      
      // Try to find a voice that matches the language
      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(voice => 
        voice.lang.startsWith(language) || 
        voice.lang.startsWith(LANGUAGES[language]?.locale.split('-')[0])
      );
      
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }
      
      window.speechSynthesis.speak(utterance);
      return;
    }

    // Premium users get ElevenLabs narration
    const userId = getCurrentUserId();
    const voiceId = LANGUAGES[language]?.voiceId;

    console.log('Generating multilingual narration:', { text, language, voiceId });

    const response = await fetch('/.netlify/functions/textToSpeech', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId
      },
      body: JSON.stringify({
        text: text,
        voiceId: voiceId,
        language: language,
        settings: {
          stability: 0.7,
          similarity_boost: 0.8,
          style: 0.2
        },
        userId: userId
      })
    });

    const result = await response.json();

    if (result.success && result.audio_data) {
      // Play the generated audio
      const audioBlob = new Blob([
        Uint8Array.from(atob(result.audio_data), c => c.charCodeAt(0))
      ], { type: 'audio/mpeg' });
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
      };
      
      await audio.play();
    } else if (result.premium_required) {
      onUpgradeClick();
    } else {
      // Fallback to browser speech synthesis
      console.log('ElevenLabs failed, using browser fallback');
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGES[language]?.locale || 'en-US';
      window.speechSynthesis.speak(utterance);
    }

  } catch (error) {
    console.error('Multilingual narration failed:', error);
    
    // Always fallback to browser speech synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGES[language]?.locale || 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

/**
 * Premium Modal Component
 */
const PremiumModal = ({ 
  isOpen, 
  onClose, 
  onUpgrade,
  language 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpgrade: () => void;
  language: string;
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const premiumFeatures = [
    'AI content generation with Claude Sonnet 4',
    'AI-powered narration with ElevenLabs',
    'Interactive video content with Tavus',
    'Personalized learning recommendations',
    'Advanced gamification features',
    'Social sharing with AI-generated videos',
    'AI tutor with multiple personality tones',
    'Unlimited access to all learning materials',
    'Progress tracking and analytics',
    'Ad-free learning experience',
    'Multilingual support with professional voices'
  ];

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
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-full mr-3">
                <Crown className="text-white" size={24} />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Go Premium</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Features list */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">
              Unlock Premium Features:
            </h3>
            <ul className="space-y-3 max-h-60 overflow-y-auto">
              {premiumFeatures.map((feature, index) => (
                <motion.li
                  key={index}
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="bg-green-100 rounded-full p-1 mr-3">
                    <Check className="text-green-600" size={16} />
                  </div>
                  <span className="text-gray-700 text-sm">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-3xl font-bold text-gray-800">$9.99</span>
                <span className="text-gray-600 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-600">
                Cancel anytime • 7-day free trial
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <motion.button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="flex items-center justify-center">
                <Sparkles className="mr-2" size={20} />
                {t.upgradeToPremiun}
              </div>
            </motion.button>
            
            <button
              onClick={onClose}
              className="w-full text-gray-600 py-2 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Maybe later
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Main PlayLearnPage component with enhanced features
 */
const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [droppedItems, setDroppedItems] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [userId, setUserId] = useState('');

  // Get translations for current language
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Sample content data with multilingual support
  const slides = [
    { 
      id: 1, 
      content: {
        en: '🐘 Elephant (Gray)',
        es: '🐘 Elefante (Gris)',
        zh: '🐘 大象 (灰色)'
      },
      color: 'gray',
      narration: {
        en: 'This is a big gray elephant!',
        es: '¡Este es un gran elefante gris!',
        zh: '这是一只大灰象！'
      }
    },
    { 
      id: 2, 
      content: {
        en: '🔴 Red Circle',
        es: '🔴 Círculo Rojo',
        zh: '🔴 红圆圈'
      },
      color: 'red',
      narration: {
        en: 'Look at this beautiful red circle!',
        es: '¡Mira este hermoso círculo rojo!',
        zh: '看这个美丽的红圆圈！'
      }
    },
    { 
      id: 3, 
      content: {
        en: '🔵 Blue Square',
        es: '🔵 Cuadrado Azul',
        zh: '🔵 蓝色正方形'
      },
      color: 'blue',
      narration: {
        en: 'Here we have a blue square shape!',
        es: '¡Aquí tenemos una forma de cuadrado azul!',
        zh: '这里我们有一个蓝色的正方形！'
      }
    }
  ];

  const videoTopics = [
    { 
      id: 1, 
      topic: {
        en: 'Numbers 1-10',
        es: 'Números 1-10',
        zh: '数字 1-10'
      },
      emoji: '🔢',
      videoUrl: 'https://example.com/numbers-video'
    },
    { 
      id: 2, 
      topic: {
        en: 'Alphabet A-Z',
        es: 'Alfabeto A-Z',
        zh: '字母 A-Z'
      },
      emoji: '📖',
      videoUrl: 'https://example.com/alphabet-video'
    }
  ];

  const codingBlocks = [
    { 
      id: 'move', 
      type: 'move', 
      text: {
        en: 'Move Forward',
        es: 'Avanzar',
        zh: '前进'
      }
    },
    { 
      id: 'jump', 
      type: 'jump', 
      text: {
        en: 'Jump Block',
        es: 'Bloque de Salto',
        zh: '跳跃块'
      }
    },
    { 
      id: 'loop', 
      type: 'loop', 
      text: {
        en: 'Repeat Loop',
        es: 'Bucle de Repetición',
        zh: '重复循环'
      }
    },
    { 
      id: 'condition', 
      type: 'condition', 
      text: {
        en: 'If Statement',
        es: 'Declaración Si',
        zh: '如果语句'
      }
    }
  ];

  /**
   * Initialize user and premium status check
   */
  useEffect(() => {
    const initializeUser = async () => {
      try {
        setIsLoading(true);
        const currentUserId = getCurrentUserId();
        setUserId(currentUserId);
        
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);
        console.log('Premium status:', premiumStatus);
      } catch (error) {
        console.error('Failed to initialize user:', error);
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeUser();
  }, []);

  /**
   * Load saved language preference
   */
  useEffect(() => {
    const savedLanguage = localStorage.getItem('edusphere_language');
    if (savedLanguage && LANGUAGES[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
  }, []);

  /**
   * Handle language change
   */
  const handleLanguageChange = (language: string) => {
    setCurrentLanguage(language);
    localStorage.setItem('edusphere_language', language);
    console.log('Language changed to:', language);
  };

  /**
   * Handle drop event for coding blocks
   */
  const handleDrop = (item: any) => {
    setDroppedItems((prev) => [...prev, item.type]);
  };

  /**
   * Handle premium upgrade
   */
  const handleUpgrade = () => {
    // In a real implementation, this would integrate with a payment processor
    alert('Upgrade functionality would be implemented here with your payment provider');
    setShowPremiumModal(false);
  };

  /**
   * Handle video generation (placeholder)
   */
  const handleVideoGeneration = (topic: string) => {
    alert(`Generating educational video for: ${topic}\n(This is a demo placeholder)`);
  };

  /**
   * Show loading state while checking premium status
   */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-blue-800">Loading Play & Learn...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-100 to-green-100 p-6">
      {/* Header with back button, language selector, and premium status */}
      <div className="flex justify-between items-center mb-6">
        <motion.button
          className="flex items-center bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2" size={20} />
          {t.backToBook}
        </motion.button>

        {/* Language Selector */}
        <LanguageSelector 
          currentLanguage={currentLanguage}
          onLanguageChange={handleLanguageChange}
        />

        {/* Premium status indicator */}
        <div className="flex items-center space-x-4">
          {isPremium ? (
            <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full">
              <Crown className="mr-2" size={20} />
              <span className="font-semibold">{t.premiumActive}</span>
            </div>
          ) : (
            <motion.button
              onClick={() => setShowPremiumModal(true)}
              className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full hover:shadow-lg transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="mr-2" size={20} />
              <span className="font-semibold">{t.upgradeToPremiun}</span>
            </motion.button>
          )}
        </div>
      </div>

      <h1 className="font-serif text-4xl text-blue-800 text-center mb-8">{t.playAndLearn}</h1>

      {/* Enhanced Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Personalized Learning */}
        <PersonalizedLearning 
          userId={userId}
          language={currentLanguage}
          isPremium={isPremium}
          onUpgradeClick={() => setShowPremiumModal(true)}
        />

        {/* Gamification */}
        <GamificationPanel 
          userId={userId}
          language={currentLanguage}
        />

        {/* Social Sharing */}
        <SocialSharingPanel 
          userId={userId}
          language={currentLanguage}
          isPremium={isPremium}
          onUpgradeClick={() => setShowPremiumModal(true)}
        />

        {/* AI Tutor */}
        <AITutorPanel 
          userId={userId}
          language={currentLanguage}
          isPremium={isPremium}
          onUpgradeClick={() => setShowPremiumModal(true)}
        />
      </div>

      {/* Original Content Sections */}
      {/* Picture Slides Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Puzzle size={24} className="mr-2" /> {t.pictureSlides}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slides.map((slide) => (
            <SlideCard 
              key={slide.id} 
              slide={slide} 
              language={currentLanguage}
              isPremium={isPremium}
              onNarration={(text) => handleMultilingualNarration(text, currentLanguage, isPremium, () => setShowPremiumModal(true))}
              onUpgradeClick={() => setShowPremiumModal(true)}
            />
          ))}
        </div>
      </motion.section>

      {/* Learning Videos Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Video size={24} className="mr-2" /> {t.learningVideos}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videoTopics.map((topic) => (
            <VideoCard 
              key={topic.id} 
              topic={topic} 
              language={currentLanguage}
              onVideoGeneration={handleVideoGeneration} 
            />
          ))}
        </div>
      </motion.section>

      {/* Drag & Drop Coding Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Play size={24} className="mr-2" /> {t.dragDropCoding}
        </h2>
        
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coding blocks */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.availableBlocks}</h3>
              <div className="grid grid-cols-2 gap-4">
                {codingBlocks.map((block) => (
                  <DragBlock 
                    key={block.id} 
                    id={block.id} 
                    type={block.type}
                  >
                    {block.text[currentLanguage] || block.text.en}
                  </DragBlock>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div>
              <h3 className="text-lg font-semibold mb-4">{t.buildYourProgram}</h3>
              <DropZone onDrop={handleDrop} language={currentLanguage} />
              
              {droppedItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h4 className="font-semibold mb-2">{t.yourProgram}</h4>
                  <div className="space-y-2">
                    {droppedItems.map((item, index) => (
                      <div key={index} className="bg-white p-2 rounded border">
                        {index + 1}. {item.charAt(0).toUpperCase() + item.slice(1)} Block
                      </div>
                    ))}
                  </div>
                  <motion.button
                    onClick={() => setDroppedItems([])}
                    className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {t.clearProgram}
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </DndProvider>
      </motion.section>

      {/* Premium Modal */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={handleUpgrade}
        language={currentLanguage}
      />
    </div>
  );
};

/**
 * Individual slide card component with multilingual support
 */
const SlideCard = ({ 
  slide, 
  language,
  isPremium,
  onNarration,
  onUpgradeClick
}: { 
  slide: any; 
  language: string;
  isPremium: boolean;
  onNarration: (text: string) => void;
  onUpgradeClick: () => void;
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  return (
    <motion.div
      className={`bg-${slide.color}-200 p-6 rounded-lg text-center relative overflow-hidden`}
      animate={{ rotate: [0, 2, -2, 0], transition: { duration: 4, repeat: Infinity } }}
      whileHover={{ scale: 1.05 }}
    >
      <p className="font-bold text-lg mb-4">
        {slide.content[language] || slide.content.en}
      </p>
      <motion.button
        onClick={() => onNarration(slide.narration[language] || slide.narration.en)}
        className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Volume2 size={16} className="mr-2" />
        <span className="text-sm font-medium">{t.listen}</span>
      </motion.button>
      
      {!isPremium && (
        <div className="absolute top-2 right-2">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-yellow-400 text-yellow-900 p-1 rounded-full shadow-lg"
            whileHover={{ scale: 1.1 }}
            title="Premium feature"
          >
            <Crown size={16} />
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

/**
 * Individual video card component with multilingual support
 */
const VideoCard = ({ 
  topic, 
  language,
  onVideoGeneration 
}: { 
  topic: any; 
  language: string;
  onVideoGeneration: (topic: string) => void;
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  return (
    <motion.div
      className="bg-purple-200 p-6 rounded-lg text-center relative overflow-hidden"
      animate={{ y: [0, -5, 0], transition: { duration: 3, repeat: Infinity } }}
      whileHover={{ scale: 1.05 }}
    >
      <div className="text-4xl mb-4">{topic.emoji}</div>
      <p className="font-bold text-lg mb-4">
        {topic.topic[language] || topic.topic.en}
      </p>
      <motion.button
        onClick={() => onVideoGeneration(topic.topic[language] || topic.topic.en)}
        className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <VideoIcon size={16} className="mr-2" />
        <span className="text-sm font-medium">{t.generateVideo}</span>
      </motion.button>
    </motion.div>
  );
};

export default PlayLearnPage;