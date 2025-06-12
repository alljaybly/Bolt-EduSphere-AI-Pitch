import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import * as Sentry from '@sentry/react';
import confetti from 'canvas-confetti';
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
  Mic,
  MicOff,
  Camera,
  Cube,
  Upload,
  MessageSquare,
  Code,
  BookOpen as BookOpenIcon,
  Settings,
  HelpCircle,
  Award,
  Users,
  Zap,
  Heart,
  Share2,
  Lightbulb,
  PanelLeft,
  PanelRight,
  Moon,
  Sun,
  Maximize,
  Minimize
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';
import { supabase, supabaseHelpers } from '../lib/supabase';

// Drag and drop types
const ItemTypes = {
  BLOCK: 'block'
};

// Language configuration with ElevenLabs voice IDs
const LANGUAGES = {
  en: {
    name: 'English',
    flag: '🇺🇸',
    voiceId: 'VITE_ELEVENLABS_VOICE_EN' || '21m00Tcm4TlvDq8ikWAM', // Rachel
    locale: 'en-US'
  },
  es: {
    name: 'Español',
    flag: '🇪🇸',
    voiceId: 'VITE_ELEVENLABS_VOICE_ES' || 'XB0fDUnXU5powFXDhCwa', // Charlotte (Spanish)
    locale: 'es-ES'
  },
  zh: {
    name: '中文',
    flag: '🇨🇳',
    voiceId: 'VITE_ELEVENLABS_VOICE_ZH' || 'pNInz6obpgDQGcFmaJgB', // Adam (Mandarin)
    locale: 'zh-CN'
  },
  fr: {
    name: 'Français',
    flag: '🇫🇷',
    voiceId: 'VITE_ELEVENLABS_VOICE_FR' || 'jsCqWAovK2LkecY7zXl4', // Antoine
    locale: 'fr-FR'
  },
  de: {
    name: 'Deutsch',
    flag: '🇩🇪',
    voiceId: 'VITE_ELEVENLABS_VOICE_DE' || '5Q0t7uMcjvnagumLfvZi', // Hans
    locale: 'de-DE'
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
    arProblems: 'AR Problems',
    voiceQuizzes: 'Voice Quizzes',
    crowdsource: 'Contribute Content',
    liveCode: 'Live Code',
    storyMode: 'Story Mode',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    highContrast: 'High Contrast',
    fontSize: 'Font Size',
    accessibilitySettings: 'Accessibility Settings',
    speakNow: 'Speak Now',
    listeningForAnswer: 'Listening for answer...',
    submitAnswer: 'Submit Answer',
    nextQuestion: 'Next Question',
    personalizedLearning: 'Personalized Learning',
    yourNextLesson: 'Your Next Lesson',
    startLesson: 'Start Lesson',
    achievements: 'Achievements',
    leaderboard: 'Leaderboard',
    yourProgress: 'Your Progress',
    viewAll: 'View All',
    shareYourCreation: 'Share Your Creation',
    communityContent: 'Community Content',
    aiTutor: 'AI Tutor',
    selectTone: 'Select Tone',
    friendly: 'Friendly',
    professional: 'Professional',
    enthusiastic: 'Enthusiastic',
    patient: 'Patient',
    playful: 'Playful'
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
    arProblems: 'Problemas RA',
    voiceQuizzes: 'Cuestionarios de Voz',
    crowdsource: 'Contribuir Contenido',
    liveCode: 'Código en Vivo',
    storyMode: 'Modo Historia',
    darkMode: 'Modo Oscuro',
    lightMode: 'Modo Claro',
    highContrast: 'Alto Contraste',
    fontSize: 'Tamaño de Fuente',
    accessibilitySettings: 'Configuración de Accesibilidad',
    speakNow: 'Habla Ahora',
    listeningForAnswer: 'Escuchando respuesta...',
    submitAnswer: 'Enviar Respuesta',
    nextQuestion: 'Siguiente Pregunta',
    personalizedLearning: 'Aprendizaje Personalizado',
    yourNextLesson: 'Tu Próxima Lección',
    startLesson: 'Comenzar Lección',
    achievements: 'Logros',
    leaderboard: 'Tabla de Clasificación',
    yourProgress: 'Tu Progreso',
    viewAll: 'Ver Todo',
    shareYourCreation: 'Comparte Tu Creación',
    communityContent: 'Contenido Comunitario',
    aiTutor: 'Tutor IA',
    selectTone: 'Seleccionar Tono',
    friendly: 'Amigable',
    professional: 'Profesional',
    enthusiastic: 'Entusiasta',
    patient: 'Paciente',
    playful: 'Juguetón'
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
    arProblems: 'AR问题',
    voiceQuizzes: '语音测验',
    crowdsource: '贡献内容',
    liveCode: '实时编程',
    storyMode: '故事模式',
    darkMode: '深色模式',
    lightMode: '浅色模式',
    highContrast: '高对比度',
    fontSize: '字体大小',
    accessibilitySettings: '无障碍设置',
    speakNow: '现在说话',
    listeningForAnswer: '正在听取答案...',
    submitAnswer: '提交答案',
    nextQuestion: '下一个问题',
    personalizedLearning: '个性化学习',
    yourNextLesson: '您的下一课',
    startLesson: '开始课程',
    achievements: '成就',
    leaderboard: '排行榜',
    yourProgress: '您的进度',
    viewAll: '查看全部',
    shareYourCreation: '分享您的创作',
    communityContent: '社区内容',
    aiTutor: 'AI导师',
    selectTone: '选择语调',
    friendly: '友好的',
    professional: '专业的',
    enthusiastic: '热情的',
    patient: '耐心的',
    playful: '俏皮的'
  }
};

/**
 * Language Selector Component
 * Accessible dropdown for language selection
 */
const LanguageSelector = ({ 
  currentLanguage, 
  onLanguageChange 
}: { 
  currentLanguage: string; 
  onLanguageChange: (lang: string) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent, code: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onLanguageChange(code);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg shadow-md hover:shadow-lg transition-all border border-gray-200 dark:bg-gray-800/90 dark:border-gray-700 dark:text-white"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={t.selectLanguage}
      >
        <Globe className="mr-2" size={20} />
        <span className="mr-2">{LANGUAGES[currentLanguage]?.flag}</span>
        <span className="font-medium">{LANGUAGES[currentLanguage]?.name}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          className="ml-2"
          aria-hidden="true"
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
            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50 min-w-[200px] dark:bg-gray-800 dark:border-gray-700"
            role="listbox"
            aria-label={t.selectLanguage}
          >
            {Object.entries(LANGUAGES).map(([code, lang]) => (
              <motion.button
                key={code}
                onClick={() => {
                  onLanguageChange(code);
                  setIsOpen(false);
                }}
                onKeyDown={(e) => handleKeyDown(e, code)}
                className={`w-full flex items-center px-4 py-3 hover:bg-blue-50 transition-colors dark:hover:bg-gray-700 ${
                  currentLanguage === code ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                }`}
                whileHover={{ backgroundColor: '#dbeafe' }}
                role="option"
                aria-selected={currentLanguage === code}
                tabIndex={0}
              >
                <span className="mr-3 text-xl">{lang.flag}</span>
                <span className="font-medium">{lang.name}</span>
                {currentLanguage === code && (
                  <Check className="ml-auto text-blue-600 dark:text-blue-400" size={16} />
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
 * Accessibility Settings Component
 * Controls for font size, contrast, and other accessibility features
 */
const AccessibilitySettings = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    fontSize: number;
    highContrast: boolean;
    darkMode: boolean;
    reducedMotion: boolean;
    screenReader: boolean;
  };
  onSettingsChange: (newSettings: any) => void;
}) => {
  if (!isOpen) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-title"
      >
        <h3 
          id="accessibility-title" 
          className="text-lg font-bold mb-4 text-gray-800 dark:text-white"
        >
          Accessibility Settings
        </h3>
        
        <div className="space-y-4">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Font Size: {settings.fontSize}px
            </label>
            <input
              type="range"
              min="14"
              max="24"
              value={settings.fontSize}
              onChange={(e) => onSettingsChange({
                ...settings,
                fontSize: Number(e.target.value)
              })}
              className="w-full"
              aria-label="Adjust font size"
            />
          </div>

          {/* Dark Mode */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => onSettingsChange({
                ...settings,
                darkMode: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {settings.darkMode ? 'Light Mode' : 'Dark Mode'}
            </span>
          </label>

          {/* High Contrast */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.highContrast}
              onChange={(e) => onSettingsChange({
                ...settings,
                highContrast: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">High Contrast</span>
          </label>

          {/* Reduced Motion */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.reducedMotion}
              onChange={(e) => onSettingsChange({
                ...settings,
                reducedMotion: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Reduced Motion</span>
          </label>

          {/* Screen Reader Optimization */}
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={settings.screenReader}
              onChange={(e) => onSettingsChange({
                ...settings,
                screenReader: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Screen Reader Optimization</span>
          </label>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Save Settings
        </button>
      </motion.div>
    </motion.div>
  );
};

/**
 * Draggable coding block component
 */
const DragBlock = ({ 
  id, 
  type, 
  children,
  reducedMotion = false
}: { 
  id: string; 
  type: string; 
  children: React.ReactNode;
  reducedMotion?: boolean;
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
        type === 'move' ? 'bg-blue-200 dark:bg-blue-800' : 
        type === 'jump' ? 'bg-green-200 dark:bg-green-800' : 
        'bg-purple-200 dark:bg-purple-800'
      }`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      whileHover={reducedMotion ? {} : { scale: 1.1 }}
      whileTap={reducedMotion ? {} : { scale: 0.9 }}
      aria-label={`Drag ${type} block`}
      role="button"
      tabIndex={0}
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
  language,
  reducedMotion = false
}: { 
  onDrop: (item: any) => void;
  language: string;
  reducedMotion?: boolean;
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
        isOver ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/30' : 'border-yellow-400 bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-900/20'
      }`}
      animate={reducedMotion ? {} : { 
        borderColor: isOver ? '#60A5FA' : ['#FBBF24', '#F59E0B', '#FBBF24'], 
        transition: { duration: 2, repeat: Infinity } 
      }}
      role="region"
      aria-label="Drop zone for code blocks"
    >
      <p className="text-center font-medium dark:text-white">
        {language === 'es' ? 'Arrastra bloques aquí para construir tu juego!' :
         language === 'zh' ? '将块拖到这里来构建您的游戏！' :
         'Drop blocks here to build your game!'}
      </p>
    </motion.div>
  );
};

/**
 * Voice Quiz Component
 * Implements speech recognition for educational quizzes
 */
const VoiceQuiz = ({
  isPremium,
  onUpgradeClick,
  language,
  reducedMotion = false,
  darkMode = false
}: {
  isPremium: boolean;
  onUpgradeClick: () => void;
  language: string;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{isCorrect: boolean | null, feedback: string}>({
    isCorrect: null,
    feedback: ''
  });
  const recognitionRef = useRef<any>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = LANGUAGES[language]?.locale || 'en-US';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setTranscript(transcript);
        stopListening();
        checkAnswer(transcript);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        Sentry.captureMessage(`Speech recognition error: ${event.error}`);
        stopListening();
        setResult({
          isCorrect: null,
          feedback: 'Sorry, I couldn\'t hear you. Please try again.'
        });
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    // Load voice quizzes
    loadVoiceQuizzes();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language]);

  // Load voice quizzes from Supabase
  const loadVoiceQuizzes = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch(`/.netlify/functions/voiceQuiz?language=${language}`, {
        headers: {
          'X-User-ID': getCurrentUserId()
        }
      });
      
      const result = await response.json();
      
      if (result.success && result.quizzes.length > 0) {
        setQuizzes(result.quizzes);
        setCurrentQuiz(result.quizzes[0]);
      } else {
        // Fallback quizzes if none found
        const fallbackQuizzes = [
          {
            id: 'fallback_1',
            question: language === 'es' ? '¿De qué color es el cielo?' : 
                      language === 'zh' ? '天空是什么颜色？' : 
                      'What color is the sky?',
            answer: language === 'es' ? 'azul' : 
                    language === 'zh' ? '蓝色' : 
                    'blue',
            language: language,
            difficulty: 'easy',
            grade_level: 'kindergarten',
            subject: 'science'
          },
          {
            id: 'fallback_2',
            question: language === 'es' ? '¿Cuántos días hay en una semana?' : 
                      language === 'zh' ? '一周有几天？' : 
                      'How many days are in a week?',
            answer: language === 'es' ? 'siete' : 
                    language === 'zh' ? '七' : 
                    'seven',
            language: language,
            difficulty: 'easy',
            grade_level: 'kindergarten',
            subject: 'math'
          }
        ];
        
        setQuizzes(fallbackQuizzes);
        setCurrentQuiz(fallbackQuizzes[0]);
      }
    } catch (error) {
      console.error('Failed to load voice quizzes:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Start listening for speech
  const startListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      setTranscript('');
      setResult({ isCorrect: null, feedback: '' });
      recognitionRef.current.lang = LANGUAGES[language]?.locale || 'en-US';
      recognitionRef.current.start();
      setIsListening(true);
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
      Sentry.captureException(error);
    }
  };

  // Stop listening for speech
  const stopListening = () => {
    if (!recognitionRef.current) return;
    
    try {
      recognitionRef.current.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Failed to stop speech recognition:', error);
      Sentry.captureException(error);
    }
  };

  // Check if answer is correct
  const checkAnswer = async (userAnswer: string) => {
    if (!currentQuiz) return;
    
    try {
      const response = await fetch('/.netlify/functions/voiceQuiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'check_answer',
          user_id: getCurrentUserId(),
          quiz_id: currentQuiz.id,
          user_answer: userAnswer
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setResult({
          isCorrect: result.is_correct,
          feedback: result.feedback
        });
        
        // Show confetti for correct answers
        if (result.is_correct) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (error) {
      console.error('Failed to check answer:', error);
      Sentry.captureException(error);
      setResult({
        isCorrect: null,
        feedback: 'Error checking answer. Please try again.'
      });
    }
  };

  // Move to next question
  const nextQuestion = () => {
    const currentIndex = quizzes.findIndex(q => q.id === currentQuiz?.id);
    if (currentIndex < quizzes.length - 1) {
      setCurrentQuiz(quizzes[currentIndex + 1]);
    } else {
      // Cycle back to first question if at the end
      setCurrentQuiz(quizzes[0]);
    }
    setTranscript('');
    setResult({ isCorrect: null, feedback: '' });
  };

  // Speak question using text-to-speech
  const speakQuestion = async () => {
    if (!currentQuiz) return;
    
    try {
      const utterance = new SpeechSynthesisUtterance(currentQuiz.question);
      utterance.lang = LANGUAGES[language]?.locale || 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Failed to speak question:', error);
      Sentry.captureException(error);
    }
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none">
          <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Mic className="mr-2" size={20} />
              {t.voiceQuizzes}
            </h3>
            <div className="p-8 text-center">
              <Mic size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Voice quizzes allow you to practice pronunciation and speaking skills</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
          >
            <Lock className="mr-2" size={20} />
            {t.upgradeToPremiun}
          </motion.button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Mic className="mr-2" size={20} />
          {t.voiceQuizzes}
        </h3>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Loading voice quizzes...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Mic className="mr-2" size={20} />
        {t.voiceQuizzes}
      </h3>
      
      {currentQuiz && (
        <div>
          {/* Quiz Question */}
          <div className={`p-4 mb-4 rounded-lg ${result.isCorrect === true ? 'bg-green-100 dark:bg-green-900/30' : result.isCorrect === false ? 'bg-red-100 dark:bg-red-900/30' : 'bg-blue-100 dark:bg-blue-900/30'}`}>
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium px-2 py-1 rounded bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
                {currentQuiz.subject} • {currentQuiz.difficulty}
              </span>
              <motion.button
                onClick={speakQuestion}
                className="p-1 rounded-full bg-blue-500 text-white"
                whileHover={reducedMotion ? {} : { scale: 1.1 }}
                whileTap={reducedMotion ? {} : { scale: 0.9 }}
                aria-label="Speak question"
              >
                <Volume2 size={16} />
              </motion.button>
            </div>
            <p className="text-lg font-medium">{currentQuiz.question}</p>
          </div>
          
          {/* Voice Input */}
          <div className="mb-4">
            <div className="flex items-center justify-center mb-4">
              <motion.button
                onClick={isListening ? stopListening : startListening}
                className={`p-4 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-blue-500'} text-white shadow-lg`}
                whileHover={reducedMotion ? {} : { scale: 1.05 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
                aria-label={isListening ? 'Stop listening' : 'Start listening'}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </motion.button>
            </div>
            
            <div className="text-center">
              {isListening ? (
                <p className="text-blue-600 dark:text-blue-400 animate-pulse">{t.listeningForAnswer}...</p>
              ) : transcript ? (
                <p className="font-medium">Your answer: "{transcript}"</p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400">Click the microphone and {t.speakNow}</p>
              )}
            </div>
          </div>
          
          {/* Result Feedback */}
          {result.isCorrect !== null && (
            <div className={`p-4 rounded-lg mb-4 ${result.isCorrect ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
              <div className="flex items-center">
                {result.isCorrect ? (
                  <Check className="mr-2 flex-shrink-0" size={20} />
                ) : (
                  <X className="mr-2 flex-shrink-0" size={20} />
                )}
                <p>{result.feedback}</p>
              </div>
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between">
            <motion.button
              onClick={startListening}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              disabled={isListening}
            >
              <Mic className="mr-2" size={16} />
              {t.speakNow}
            </motion.button>
            
            <motion.button
              onClick={nextQuestion}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center"
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
            >
              {t.nextQuestion}
              <ArrowLeft className="ml-2 rotate-180" size={16} />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Crowdsource Form Component
 * Allows users to contribute educational content
 */
const CrowdsourceForm = ({
  isPremium,
  onUpgradeClick,
  language,
  reducedMotion = false,
  darkMode = false
}: {
  isPremium: boolean;
  onUpgradeClick: () => void;
  language: string;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const [contentType, setContentType] = useState('problem');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [subject, setSubject] = useState('math');
  const [grade, setGrade] = useState('grade1-6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{success: boolean, message: string} | null>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Content type options
  const contentTypes = [
    { id: 'problem', name: 'Problem' },
    { id: 'story', name: 'Story' },
    { id: 'quiz', name: 'Quiz' },
    { id: 'lesson', name: 'Lesson' }
  ];

  // Subject options
  const subjects = [
    { id: 'math', name: 'Mathematics' },
    { id: 'science', name: 'Science' },
    { id: 'english', name: 'English' },
    { id: 'history', name: 'History' },
    { id: 'geography', name: 'Geography' },
    { id: 'coding', name: 'Coding' }
  ];

  // Grade options
  const grades = [
    { id: 'kindergarten', name: 'Kindergarten' },
    { id: 'grade1-6', name: 'Grades 1-6' },
    { id: 'grade7-9', name: 'Grades 7-9' },
    { id: 'grade10-12', name: 'Grades 10-12' },
    { id: 'matric', name: 'Matric' }
  ];

  // Submit content
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !content) {
      setSubmitResult({
        success: false,
        message: 'Please fill in all required fields'
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      setSubmitResult(null);
      
      // Format content based on type
      let formattedContent;
      switch (contentType) {
        case 'problem':
          formattedContent = {
            question: content,
            answer: '', // User would fill this in a real form
            hint: '',
            difficulty: 'medium'
          };
          break;
        case 'story':
          formattedContent = {
            story_text: content,
            chapters: [{ title: 'Chapter 1', content }]
          };
          break;
        case 'quiz':
          formattedContent = {
            questions: [{ text: content, answer: '' }]
          };
          break;
        default:
          formattedContent = { content };
      }
      
      const response = await fetch('/.netlify/functions/crowdsource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'submit',
          user_id: getCurrentUserId(),
          content_type: contentType,
          title: title,
          content: formattedContent,
          subject: subject,
          grade_level: grade,
          language: language
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSubmitResult({
          success: true,
          message: 'Thank you for your contribution! Your content has been submitted for review.'
        });
        
        // Reset form
        setTitle('');
        setContent('');
        
        // Show confetti for successful submission
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } else {
        setSubmitResult({
          success: false,
          message: result.error || 'Failed to submit content. Please try again.'
        });
      }
    } catch (error) {
      console.error('Failed to submit content:', error);
      Sentry.captureException(error);
      setSubmitResult({
        success: false,
        message: 'An error occurred while submitting your content. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none">
          <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Upload className="mr-2" size={20} />
              {t.crowdsource}
            </h3>
            <div className="p-8 text-center">
              <Upload size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Contribute your own educational content to help others learn</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
          >
            <Lock className="mr-2" size={20} />
            {t.upgradeToPremiun}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Upload className="mr-2" size={20} />
        {t.crowdsource}
      </h3>
      
      {submitResult && (
        <div className={`p-4 rounded-lg mb-4 ${submitResult.success ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'}`}>
          <div className="flex items-center">
            {submitResult.success ? (
              <Check className="mr-2 flex-shrink-0" size={20} />
            ) : (
              <X className="mr-2 flex-shrink-0" size={20} />
            )}
            <p>{submitResult.message}</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        {/* Content Type */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Content Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {contentTypes.map(type => (
              <motion.button
                key={type.id}
                type="button"
                onClick={() => setContentType(type.id)}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  contentType === type.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                whileTap={reducedMotion ? {} : { scale: 0.98 }}
              >
                <span className="ml-2 text-sm font-medium">{type.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
        
        {/* Title */}
        <div className="mb-4">
          <label htmlFor="content-title" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Title
          </label>
          <input
            id="content-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="Enter a title for your content"
            required
          />
        </div>
        
        {/* Content */}
        <div className="mb-4">
          <label htmlFor="content-body" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
            Content
          </label>
          <textarea
            id="content-body"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            rows={5}
            placeholder={contentType === 'problem' ? 'Enter your problem question...' : 
                         contentType === 'story' ? 'Write your story...' : 
                         contentType === 'quiz' ? 'Enter your quiz question...' : 
                         'Enter your content...'}
            required
          />
        </div>
        
        {/* Subject and Grade */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="content-subject" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Subject
            </label>
            <select
              id="content-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="content-grade" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Grade Level
            </label>
            <select
              id="content-grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {grades.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={isSubmitting || !title || !content}
          className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
          whileHover={!isSubmitting && title && content && !reducedMotion ? { scale: 1.02 } : {}}
          whileTap={!isSubmitting && title && content && !reducedMotion ? { scale: 0.98 } : {}}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Submitting...
            </>
          ) : (
            <>
              <Send className="mr-2" size={20} />
              Submit Content
            </>
          )}
        </motion.button>
      </form>
    </div>
  );
};

/**
 * Personalized Learning Component
 * Shows AI-recommended next lessons based on user progress
 */
const PersonalizedLearning = ({
  isPremium,
  onUpgradeClick,
  language,
  reducedMotion = false,
  darkMode = false
}: {
  isPremium: boolean;
  onUpgradeClick: () => void;
  language: string;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [nextLesson, setNextLesson] = useState<any>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Load personalized recommendation
  useEffect(() => {
    if (isPremium) {
      loadPersonalizedLesson();
    }
  }, [isPremium, language]);

  // Get personalized lesson recommendation
  const loadPersonalizedLesson = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/.netlify/functions/personalizeContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          user_id: getCurrentUserId(),
          language: language
        })
      });
      
      const result = await response.json();
      
      if (result.success && result.lesson) {
        setNextLesson(result.lesson);
      } else if (result.premium_required) {
        // Premium required message handled by component rendering
      } else {
        // Fallback recommendation
        setNextLesson({
          title: language === 'es' ? 'Introducción a las Fracciones' : 
                 language === 'zh' ? '分数入门' : 
                 'Introduction to Fractions',
          description: language === 'es' ? 'Aprende los conceptos básicos de fracciones con ejemplos visuales' : 
                       language === 'zh' ? '通过视觉示例学习分数的基本概念' : 
                       'Learn the basic concepts of fractions with visual examples',
          subject: 'math',
          difficulty: 3,
          estimated_minutes: 20,
          learning_objectives: [
            language === 'es' ? 'Entender qué son las fracciones' : 
            language === 'zh' ? '理解什么是分数' : 
            'Understand what fractions are',
            language === 'es' ? 'Identificar fracciones en ejemplos visuales' : 
            language === 'zh' ? '在视觉示例中识别分数' : 
            'Identify fractions in visual examples'
          ]
        });
      }
    } catch (error) {
      console.error('Failed to load personalized lesson:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none">
          <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Zap className="mr-2" size={20} />
              {t.personalizedLearning}
            </h3>
            <div className="p-8 text-center">
              <Zap size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Get personalized learning recommendations based on your progress</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
          >
            <Lock className="mr-2" size={20} />
            {t.upgradeToPremiun}
          </motion.button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Zap className="mr-2" size={20} />
          {t.personalizedLearning}
        </h3>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Finding your perfect next lesson...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Zap className="mr-2" size={20} />
        {t.personalizedLearning}
      </h3>
      
      {nextLesson && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-blue-800 dark:text-blue-300">{t.yourNextLesson}</h4>
            <span className="text-xs font-medium px-2 py-1 rounded bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200">
              {nextLesson.subject} • Level {nextLesson.difficulty}/5
            </span>
          </div>
          
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{nextLesson.title}</h3>
          <p className="text-gray-600 dark:text-gray-300 mb-3">{nextLesson.description}</p>
          
          <div className="mb-3">
            <h5 className="font-medium text-gray-700 dark:text-gray-300 mb-1">Learning Objectives:</h5>
            <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400">
              {nextLesson.learning_objectives?.map((objective: string, index: number) => (
                <li key={index}>{objective}</li>
              ))}
            </ul>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              <Clock className="inline mr-1" size={14} />
              {nextLesson.estimated_minutes} minutes
            </span>
            
            <motion.button
              className="px-4 py-2 bg-blue-600 text-white rounded-lg flex items-center"
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
            >
              {t.startLesson}
              <ArrowLeft className="ml-2 rotate-180" size={16} />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Achievements Component
 * Shows user badges and gamification elements
 */
const Achievements = ({
  isPremium,
  onUpgradeClick,
  language,
  reducedMotion = false,
  darkMode = false
}: {
  isPremium: boolean;
  onUpgradeClick: () => void;
  language: string;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [newAchievements, setNewAchievements] = useState<any[]>([]);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Load achievements
  useEffect(() => {
    if (isPremium) {
      loadAchievements();
    }
  }, [isPremium]);

  // Get user achievements
  const loadAchievements = async () => {
    try {
      setIsLoading(true);
      
      const response = await fetch('/.netlify/functions/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'check_achievements',
          user_id: getCurrentUserId()
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Get existing achievements
        const userAchievements = await supabaseHelpers.getUserAchievements(getCurrentUserId());
        setAchievements(userAchievements);
        
        // Set user stats
        setUserStats(result.userStats);
        
        // Check for new achievements
        if (result.newAchievements && result.newAchievements.length > 0) {
          setNewAchievements(result.newAchievements);
          
          // Show confetti for new achievements
          confetti({
            particleCount: 150,
            spread: 70,
            origin: { y: 0.6 }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load achievements:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none">
          <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Award className="mr-2" size={20} />
              {t.achievements}
            </h3>
            <div className="p-8 text-center">
              <Award size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Earn badges and track your progress with gamification</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
          >
            <Lock className="mr-2" size={20} />
            {t.upgradeToPremiun}
          </motion.button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="mr-2" size={20} />
          {t.achievements}
        </h3>
        <div className="flex items-center justify-center p-8">
          <Loader2 className="animate-spin mr-2" size={24} />
          <span>Loading achievements...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Award className="mr-2" size={20} />
        {t.achievements}
      </h3>
      
      {/* User Stats */}
      {userStats && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-blue-800 dark:text-blue-300">{userStats.totalPoints}</div>
            <div className="text-xs text-blue-600 dark:text-blue-400">Points</div>
          </div>
          <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-purple-800 dark:text-purple-300">
              {userStats.rank || '-'}
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400">Rank</div>
          </div>
          <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-lg text-center">
            <div className="text-2xl font-bold text-orange-800 dark:text-orange-300">{userStats.streak}</div>
            <div className="text-xs text-orange-600 dark:text-orange-400">Day Streak</div>
          </div>
        </div>
      )}
      
      {/* New Achievements */}
      {newAchievements.length > 0 && (
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">New Achievements!</h4>
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            {newAchievements.map((achievement, index) => (
              <motion.div 
                key={index}
                className="flex items-center mb-2 last:mb-0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.2 }}
              >
                <div className="text-2xl mr-2">{achievement.badge_icon}</div>
                <div>
                  <div className="font-medium text-yellow-800 dark:text-yellow-300">{achievement.badge_name}</div>
                  <div className="text-xs text-yellow-600 dark:text-yellow-400">{achievement.badge_description}</div>
                </div>
                <div className="ml-auto text-yellow-800 dark:text-yellow-300 font-bold">+{achievement.points}</div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
      
      {/* Achievement Badges */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-medium text-gray-700 dark:text-gray-300">Your Badges</h4>
          <button className="text-sm text-blue-600 dark:text-blue-400">{t.viewAll}</button>
        </div>
        
        <div className="grid grid-cols-4 gap-2">
          {achievements.slice(0, 8).map((achievement, index) => (
            <motion.div
              key={index}
              className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg text-center"
              whileHover={reducedMotion ? {} : { scale: 1.05 }}
            >
              <div className="text-2xl mb-1">{achievement.badge_icon}</div>
              <div className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate" title={achievement.badge_name}>
                {achievement.badge_name}
              </div>
            </motion.div>
          ))}
          
          {achievements.length === 0 && (
            <div className="col-span-4 text-center py-4 text-gray-500 dark:text-gray-400">
              <p>Complete activities to earn badges!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * AI Tutor Component
 * Video-based AI tutoring with different personality tones
 */
const AITutor = ({
  isPremium,
  onUpgradeClick,
  language,
  reducedMotion = false,
  darkMode = false
}: {
  isPremium: boolean;
  onUpgradeClick: () => void;
  language: string;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const [selectedTone, setSelectedTone] = useState('friendly');
  const [topic, setTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedVideo, setGeneratedVideo] = useState<any>(null);
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  // Tutor tones
  const tutorTones = [
    { id: 'friendly', name: t.friendly, icon: '😊', description: 'Warm and encouraging' },
    { id: 'professional', name: t.professional, icon: '👔', description: 'Clear and structured' },
    { id: 'enthusiastic', name: t.enthusiastic, icon: '🎉', description: 'Energetic and motivating' },
    { id: 'patient', name: t.patient, icon: '🧘', description: 'Calm and understanding' },
    { id: 'playful', name: t.playful, icon: '🎮', description: 'Fun and interactive' }
  ];

  // Generate AI tutor video
  const generateVideo = async () => {
    if (!isPremium || !topic) return;
    
    try {
      setIsGenerating(true);
      setGeneratedVideo(null);
      
      const response = await fetch('/.netlify/functions/generateVideo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          topic: topic,
          age_group: 'grade1-6',
          tone: selectedTone,
          language: language,
          quality: 'high',
          share_content: true
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setGeneratedVideo(result.video_data);
        
        // Show confetti for successful generation
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else if (result.fallback) {
        setGeneratedVideo(result.fallback);
      } else {
        console.error('Failed to generate video:', result.error);
        Sentry.captureMessage(`Failed to generate video: ${result.error}`);
      }
    } catch (error) {
      console.error('Failed to generate video:', error);
      Sentry.captureException(error);
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none">
          <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Video className="mr-2" size={20} />
              {t.aiTutor}
            </h3>
            <div className="p-8 text-center">
              <Video size={48} className="mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">Learn from personalized AI tutors with different teaching styles</p>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
            whileHover={reducedMotion ? {} : { scale: 1.05 }}
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
          >
            <Lock className="mr-2" size={20} />
            {t.upgradeToPremiun}
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white p-6 rounded-lg shadow-lg ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Video className="mr-2" size={20} />
        {t.aiTutor}
      </h3>
      
      {!generatedVideo ? (
        <div>
          {/* Tone Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              {t.selectTone}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {tutorTones.map(tone => (
                <motion.button
                  key={tone.id}
                  type="button"
                  onClick={() => setSelectedTone(tone.id)}
                  className={`flex flex-col items-center p-3 rounded-lg border transition-colors ${
                    selectedTone === tone.id
                      ? 'border-purple-500 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300'
                      : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                  }`}
                  whileHover={reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={reducedMotion ? {} : { scale: 0.98 }}
                >
                  <div className="text-2xl mb-1">{tone.icon}</div>
                  <span className="text-xs font-medium">{tone.name}</span>
                </motion.button>
              ))}
            </div>
          </div>
          
          {/* Topic Input */}
          <div className="mb-4">
            <label htmlFor="tutor-topic" className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
              Topic
            </label>
            <input
              id="tutor-topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="What would you like to learn about?"
              required
            />
          </div>
          
          {/* Generate Button */}
          <motion.button
            onClick={generateVideo}
            disabled={isGenerating || !topic}
            className="w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            whileHover={!isGenerating && topic && !reducedMotion ? { scale: 1.02 } : {}}
            whileTap={!isGenerating && topic && !reducedMotion ? { scale: 0.98 } : {}}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                Generating AI Tutor...
              </>
            ) : (
              <>
                <Video className="mr-2" size={20} />
                Generate AI Tutor Video
              </>
            )}
          </motion.button>
        </div>
      ) : (
        <div>
          {/* Generated Video Result */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800 mb-4">
            <div className="flex items-center mb-3">
              <div className="text-2xl mr-2">{tutorTones.find(t => t.id === selectedTone)?.icon || '😊'}</div>
              <div>
                <h4 className="font-semibold text-purple-800 dark:text-purple-300">
                  {tutorTones.find(t => t.id === selectedTone)?.name || 'Friendly'} Tutor
                </h4>
                <p className="text-xs text-purple-600 dark:text-purple-400">
                  {tutorTones.find(t => t.id === selectedTone)?.description || 'Warm and encouraging'}
                </p>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">{topic}</h3>
            
            <div className="bg-white dark:bg-gray-800 p-3 rounded border border-gray-200 dark:border-gray-700 mb-3">
              <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-line">
                {generatedVideo.script || generatedVideo.video_data?.script || "Your AI tutor is being prepared. This process typically takes 2-5 minutes. You'll receive a notification when your personalized video is ready to view."}
              </p>
            </div>
            
            <div className="flex justify-between">
              <motion.button
                onClick={() => setGeneratedVideo(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg flex items-center"
                whileHover={reducedMotion ? {} : { scale: 1.05 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
              >
                <RotateCcw className="mr-2" size={16} />
                New Topic
              </motion.button>
              
              <motion.button
                className="px-4 py-2 bg-purple-600 text-white rounded-lg flex items-center"
                whileHover={reducedMotion ? {} : { scale: 1.05 }}
                whileTap={reducedMotion ? {} : { scale: 0.95 }}
              >
                <Share2 className="mr-2" size={16} />
                Share
              </motion.button>
            </div>
          </div>
        </div>
      )}
    </div>
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
    Sentry.captureException(error);
    
    // Always fallback to browser speech synthesis
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = LANGUAGES[language]?.locale || 'en-US';
    window.speechSynthesis.speak(utterance);
  }
};

/**
 * Individual slide card component with multilingual support
 */
const SlideCard = ({ 
  slide, 
  language,
  isPremium,
  onNarration,
  onUpgradeClick,
  reducedMotion = false,
  darkMode = false
}: { 
  slide: any; 
  language: string;
  isPremium: boolean;
  onNarration: (text: string) => void;
  onUpgradeClick: () => void;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  return (
    <motion.div
      className={`bg-${slide.color}-200 dark:bg-${slide.color}-900/30 p-6 rounded-lg text-center relative overflow-hidden`}
      animate={reducedMotion ? {} : { rotate: [0, 2, -2, 0], transition: { duration: 4, repeat: Infinity } }}
      whileHover={reducedMotion ? {} : { scale: 1.05 }}
      aria-label={`Slide: ${slide.content[language] || slide.content.en}`}
    >
      <p className={`font-bold text-lg mb-4 ${darkMode ? 'dark:text-white' : ''}`}>
        {slide.content[language] || slide.content.en}
      </p>
      <motion.button
        onClick={() => onNarration(slide.narration[language] || slide.narration.en)}
        className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:text-white px-4 py-2 rounded-full transition-colors"
        whileHover={reducedMotion ? {} : { scale: 1.1 }}
        whileTap={reducedMotion ? {} : { scale: 0.9 }}
        aria-label={`Listen to narration for ${slide.content[language] || slide.content.en}`}
      >
        <Volume2 size={16} className="mr-2" />
        <span className="text-sm font-medium">{t.listen}</span>
      </motion.button>
      
      {!isPremium && (
        <div className="absolute top-2 right-2">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-yellow-400 text-yellow-900 dark:bg-yellow-600 dark:text-yellow-100 p-1 rounded-full shadow-lg"
            whileHover={reducedMotion ? {} : { scale: 1.1 }}
            title="Premium feature"
            aria-label="Premium feature"
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
  onVideoGeneration,
  reducedMotion = false,
  darkMode = false
}: { 
  topic: any; 
  language: string;
  onVideoGeneration: (topic: string) => void;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  
  return (
    <motion.div
      className="bg-purple-200 dark:bg-purple-900/30 p-6 rounded-lg text-center relative overflow-hidden"
      animate={reducedMotion ? {} : { y: [0, -5, 0], transition: { duration: 3, repeat: Infinity } }}
      whileHover={reducedMotion ? {} : { scale: 1.05 }}
      aria-label={`Video topic: ${topic.topic[language] || topic.topic.en}`}
    >
      <div className="text-4xl mb-4" aria-hidden="true">{topic.emoji}</div>
      <p className={`font-bold text-lg mb-4 ${darkMode ? 'dark:text-white' : ''}`}>
        {topic.topic[language] || topic.topic.en}
      </p>
      <motion.button
        onClick={() => onVideoGeneration(topic.topic[language] || topic.topic.en)}
        className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white dark:bg-gray-800/80 dark:hover:bg-gray-800 dark:text-white px-4 py-2 rounded-full transition-colors"
        whileHover={reducedMotion ? {} : { scale: 1.1 }}
        whileTap={reducedMotion ? {} : { scale: 0.9 }}
        aria-label={`Generate video about ${topic.topic[language] || topic.topic.en}`}
      >
        <VideoIcon size={16} className="mr-2" />
        <span className="text-sm font-medium">{t.generateVideo}</span>
      </motion.button>
    </motion.div>
  );
};

/**
 * Premium Modal Component
 */
const PremiumModal = ({ 
  isOpen, 
  onClose, 
  onUpgrade,
  language,
  reducedMotion = false,
  darkMode = false
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpgrade: () => void;
  language: string;
  reducedMotion?: boolean;
  darkMode?: boolean;
}) => {
  if (!isOpen) return null;

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const premiumFeatures = [
    'AI content generation with Claude Sonnet 4',
    'AI-powered narration with ElevenLabs',
    'Interactive video content with Tavus',
    'Advanced coding blocks and challenges',
    'Unlimited access to all learning materials',
    'Progress tracking and analytics',
    'Ad-free learning experience',
    'Multilingual support with professional voices',
    'AR problem solving',
    'Voice quizzes',
    'Personalized learning recommendations',
    'Live collaborative coding',
    'Interactive storytelling'
  ];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-title"
      >
        <motion.div
          className={`bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl ${darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}
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
              <h2 id="premium-title" className="text-2xl font-bold text-gray-800 dark:text-white">Go Premium</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Close premium modal"
            >
              <X size={24} />
            </button>
          </div>

          {/* Features list */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-300">
              Unlock Premium Features:
            </h3>
            <ul className="space-y-3">
              {premiumFeatures.map((feature, index) => (
                <motion.li
                  key={index}
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="bg-green-100 dark:bg-green-900/50 rounded-full p-1 mr-3">
                    <Check className="text-green-600 dark:text-green-400" size={16} />
                  </div>
                  <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                </motion.li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 mb-6">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-3xl font-bold text-gray-800 dark:text-white">$9.99</span>
                <span className="text-gray-600 dark:text-gray-400 ml-2">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Cancel anytime • 7-day free trial
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <motion.button
              onClick={onUpgrade}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
            >
              <div className="flex items-center justify-center">
                <Sparkles className="mr-2" size={20} />
                {t.upgradeToPremiun}
              </div>
            </motion.button>
            
            <button
              onClick={onClose}
              className="w-full text-gray-600 dark:text-gray-400 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
 * Main PlayLearnPage component with multilingual support
 * Enhanced with accessibility features and mobile optimization
 */
const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [droppedItems, setDroppedItems] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [accessibilitySettings, setAccessibilitySettings] = useState({
    fontSize: 16,
    highContrast: false,
    darkMode: false,
    reducedMotion: false,
    screenReader: false
  });
  const [isMobile, setIsMobile] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Get translations for current language
  const t = TRANSLATIONS[currentLanguage] || TRANSLATIONS.en;

  // Sample content data with multilingual support
  const slides = [
    { 
      id: 1, 
      content: {
        en: '🐘 Elephant (Gray)',
        es: '🐘 Elefante (Gris)',
        zh: '🐘 大象 (灰色)',
        fr: '🐘 Éléphant (Gris)',
        de: '🐘 Elefant (Grau)'
      },
      color: 'gray',
      narration: {
        en: 'This is a big gray elephant!',
        es: '¡Este es un gran elefante gris!',
        zh: '这是一只大灰象！',
        fr: 'C\'est un grand éléphant gris !',
        de: 'Das ist ein großer grauer Elefant!'
      }
    },
    { 
      id: 2, 
      content: {
        en: '🔴 Red Circle',
        es: '🔴 Círculo Rojo',
        zh: '🔴 红圆圈',
        fr: '🔴 Cercle Rouge',
        de: '🔴 Roter Kreis'
      },
      color: 'red',
      narration: {
        en: 'Look at this beautiful red circle!',
        es: '¡Mira este hermoso círculo rojo!',
        zh: '看这个美丽的红圆圈！',
        fr: 'Regarde ce beau cercle rouge !',
        de: 'Schau dir diesen schönen roten Kreis an!'
      }
    },
    { 
      id: 3, 
      content: {
        en: '🔵 Blue Square',
        es: '🔵 Cuadrado Azul',
        zh: '🔵 蓝色正方形',
        fr: '🔵 Carré Bleu',
        de: '🔵 Blaues Quadrat'
      },
      color: 'blue',
      narration: {
        en: 'Here we have a blue square shape!',
        es: '¡Aquí tenemos una forma de cuadrado azul!',
        zh: '这里我们有一个蓝色的正方形！',
        fr: 'Ici, nous avons une forme carrée bleue !',
        de: 'Hier haben wir eine blaue quadratische Form!'
      }
    }
  ];

  const videoTopics = [
    { 
      id: 1, 
      topic: {
        en: 'Numbers 1-10',
        es: 'Números 1-10',
        zh: '数字 1-10',
        fr: 'Chiffres 1-10',
        de: 'Zahlen 1-10'
      },
      emoji: '🔢',
      videoUrl: 'https://example.com/numbers-video'
    },
    { 
      id: 2, 
      topic: {
        en: 'Alphabet A-Z',
        es: 'Alfabeto A-Z',
        zh: '字母 A-Z',
        fr: 'Alphabet A-Z',
        de: 'Alphabet A-Z'
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
        zh: '前进',
        fr: 'Avancer',
        de: 'Vorwärts'
      }
    },
    { 
      id: 'jump', 
      type: 'jump', 
      text: {
        en: 'Jump Block',
        es: 'Bloque de Salto',
        zh: '跳跃块',
        fr: 'Bloc de Saut',
        de: 'Sprungblock'
      }
    },
    { 
      id: 'loop', 
      type: 'loop', 
      text: {
        en: 'Repeat Loop',
        es: 'Bucle de Repetición',
        zh: '重复循环',
        fr: 'Boucle de Répétition',
        de: 'Wiederholungsschleife'
      }
    },
    { 
      id: 'condition', 
      type: 'condition', 
      text: {
        en: 'If Statement',
        es: 'Declaración Si',
        zh: '如果语句',
        fr: 'Instruction Si',
        de: 'Wenn-Anweisung'
      }
    }
  ];

  /**
   * Check screen size for mobile optimization
   */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  /**
   * Initialize premium status check
   */
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        setIsLoading(true);
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);
        console.log('Premium status:', premiumStatus);
      } catch (error) {
        console.error('Failed to check premium status:', error);
        Sentry.captureException(error);
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPremiumStatus();
  }, []);

  /**
   * Load saved language preference
   */
  useEffect(() => {
    const savedLanguage = localStorage.getItem('edusphere_language');
    if (savedLanguage && LANGUAGES[savedLanguage]) {
      setCurrentLanguage(savedLanguage);
    }
    
    // Load saved accessibility settings
    const savedSettings = localStorage.getItem('edusphere_accessibility');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setAccessibilitySettings(settings);
      } catch (e) {
        console.error('Failed to parse saved accessibility settings');
      }
    }
  }, []);

  /**
   * Save accessibility settings when they change
   */
  useEffect(() => {
    localStorage.setItem('edusphere_accessibility', JSON.stringify(accessibilitySettings));
    
    // Apply dark mode to document
    if (accessibilitySettings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Apply reduced motion to document
    if (accessibilitySettings.reducedMotion) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, [accessibilitySettings]);

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
    
    // Show confetti for successful drop
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.6 }
    });
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
      <div className={`min-h-screen ${accessibilitySettings.darkMode ? 'bg-gray-900 text-white' : 'bg-gradient-to-b from-blue-100 to-green-100'} flex items-center justify-center`}>
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-blue-800 dark:text-blue-400">Loading Play & Learn...</p>
        </motion.div>
      </div>
    );
  }

  // Apply theme and accessibility classes
  const getThemeClasses = () => {
    let baseClasses = accessibilitySettings.darkMode 
      ? 'bg-gray-900 text-white' 
      : 'bg-gradient-to-b from-blue-100 to-green-100';
    
    if (accessibilitySettings.highContrast) {
      baseClasses = accessibilitySettings.darkMode 
        ? 'bg-black text-white' 
        : 'bg-white text-black';
    }
    
    return `min-h-screen ${baseClasses}`;
  };

  return (
    <div className={getThemeClasses()}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/')}
                className="flex items-center text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                aria-label="Back to book"
              >
                <ArrowLeft className="mr-2" size={20} />
                {t.backToBook}
              </motion.button>

              <h1 className="text-xl font-bold text-gray-800 dark:text-white flex items-center">
                <Puzzle className="mr-2 text-blue-600 dark:text-blue-400" size={24} />
                {t.playAndLearn}
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Mobile menu toggle */}
              {isMobile && (
                <motion.button
                  onClick={() => setShowSidebar(!showSidebar)}
                  className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                  whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                  whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                  aria-label={showSidebar ? "Hide sidebar" : "Show sidebar"}
                >
                  {showSidebar ? <PanelRight size={20} /> : <PanelLeft size={20} />}
                </motion.button>
              )}

              {/* Accessibility settings */}
              <motion.button
                onClick={() => setShowAccessibilitySettings(true)}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                aria-label="Accessibility settings"
              >
                <Settings size={20} />
              </motion.button>

              {/* Dark mode toggle */}
              <motion.button
                onClick={() => setAccessibilitySettings(prev => ({ ...prev, darkMode: !prev.darkMode }))}
                className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                aria-label={accessibilitySettings.darkMode ? "Switch to light mode" : "Switch to dark mode"}
              >
                {accessibilitySettings.darkMode ? <Sun size={20} /> : <Moon size={20} />}
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
                    whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <Sparkles className="mr-2" size={20} />
                    <span className="font-semibold">{t.upgradeToPremiun}</span>
                  </motion.button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main Content Area */}
          <div className={`${isMobile && !showSidebar ? 'w-full' : 'w-full md:w-2/3'}`}>
            <div className="space-y-8">
              {/* Personalized Learning */}
              <PersonalizedLearning 
                isPremium={isPremium} 
                onUpgradeClick={() => setShowPremiumModal(true)}
                language={currentLanguage}
                reducedMotion={accessibilitySettings.reducedMotion}
                darkMode={accessibilitySettings.darkMode}
              />

              {/* Picture Slides Section */}
              <motion.section
                className={`bg-white p-6 rounded-lg shadow-lg ${accessibilitySettings.darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}
                initial={accessibilitySettings.reducedMotion ? { opacity: 1 } : { y: 50, opacity: 0 }}
                animate={accessibilitySettings.reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="font-serif text-2xl text-green-700 dark:text-green-400 mb-6 flex items-center">
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
                      reducedMotion={accessibilitySettings.reducedMotion}
                      darkMode={accessibilitySettings.darkMode}
                    />
                  ))}
                </div>
              </motion.section>

              {/* Learning Videos Section */}
              <motion.section
                className={`bg-white p-6 rounded-lg shadow-lg ${accessibilitySettings.darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}
                initial={accessibilitySettings.reducedMotion ? { opacity: 1 } : { y: 50, opacity: 0 }}
                animate={accessibilitySettings.reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h2 className="font-serif text-2xl text-green-700 dark:text-green-400 mb-6 flex items-center">
                  <Video size={24} className="mr-2" /> {t.learningVideos}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {videoTopics.map((topic) => (
                    <VideoCard 
                      key={topic.id} 
                      topic={topic} 
                      language={currentLanguage}
                      onVideoGeneration={handleVideoGeneration}
                      reducedMotion={accessibilitySettings.reducedMotion}
                      darkMode={accessibilitySettings.darkMode}
                    />
                  ))}
                </div>
              </motion.section>

              {/* Drag & Drop Coding Section */}
              <motion.section
                className={`bg-white p-6 rounded-lg shadow-lg ${accessibilitySettings.darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}
                initial={accessibilitySettings.reducedMotion ? { opacity: 1 } : { y: 50, opacity: 0 }}
                animate={accessibilitySettings.reducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="font-serif text-2xl text-green-700 dark:text-green-400 mb-6 flex items-center">
                  <Play size={24} className="mr-2" /> {t.dragDropCoding}
                </h2>
                
                <DndProvider backend={HTML5Backend}>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coding blocks */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 dark:text-white">{t.availableBlocks}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        {codingBlocks.map((block) => (
                          <DragBlock 
                            key={block.id} 
                            id={block.id} 
                            type={block.type}
                            reducedMotion={accessibilitySettings.reducedMotion}
                          >
                            {block.text[currentLanguage] || block.text.en}
                          </DragBlock>
                        ))}
                      </div>
                    </div>

                    {/* Drop zone */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4 dark:text-white">{t.buildYourProgram}</h3>
                      <DropZone 
                        onDrop={handleDrop} 
                        language={currentLanguage}
                        reducedMotion={accessibilitySettings.reducedMotion}
                      />
                      
                      {droppedItems.length > 0 && (
                        <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                          <h4 className="font-semibold mb-2 dark:text-white">{t.yourProgram}</h4>
                          <div className="space-y-2">
                            {droppedItems.map((item, index) => (
                              <div key={index} className="bg-white dark:bg-gray-800 p-2 rounded border dark:border-gray-600 dark:text-white">
                                {index + 1}. {item.charAt(0).toUpperCase() + item.slice(1)} Block
                              </div>
                            ))}
                          </div>
                          <motion.button
                            onClick={() => setDroppedItems([])}
                            className="mt-3 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                            whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                            whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                          >
                            {t.clearProgram}
                          </motion.button>
                        </div>
                      )}
                    </div>
                  </div>
                </DndProvider>
              </motion.section>
            </div>
          </div>

          {/* Sidebar */}
          {(!isMobile || showSidebar) && (
            <div className="w-full md:w-1/3 space-y-6">
              {/* Voice Quizzes */}
              <VoiceQuiz 
                isPremium={isPremium} 
                onUpgradeClick={() => setShowPremiumModal(true)}
                language={currentLanguage}
                reducedMotion={accessibilitySettings.reducedMotion}
                darkMode={accessibilitySettings.darkMode}
              />
              
              {/* Crowdsource Form */}
              <CrowdsourceForm 
                isPremium={isPremium} 
                onUpgradeClick={() => setShowPremiumModal(true)}
                language={currentLanguage}
                reducedMotion={accessibilitySettings.reducedMotion}
                darkMode={accessibilitySettings.darkMode}
              />
              
              {/* Achievements */}
              <Achievements 
                isPremium={isPremium} 
                onUpgradeClick={() => setShowPremiumModal(true)}
                language={currentLanguage}
                reducedMotion={accessibilitySettings.reducedMotion}
                darkMode={accessibilitySettings.darkMode}
              />
              
              {/* AI Tutor */}
              <AITutor 
                isPremium={isPremium} 
                onUpgradeClick={() => setShowPremiumModal(true)}
                language={currentLanguage}
                reducedMotion={accessibilitySettings.reducedMotion}
                darkMode={accessibilitySettings.darkMode}
              />
              
              {/* Feature Navigation */}
              <div className={`bg-white p-6 rounded-lg shadow-lg ${accessibilitySettings.darkMode ? 'dark:bg-gray-800 dark:text-white' : ''}`}>
                <h3 className="text-lg font-semibold mb-4">More Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button
                    onClick={() => navigate('/ar-problems')}
                    className="flex flex-col items-center p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg"
                    whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <Cube size={24} className="mb-2 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium">{t.arProblems}</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => navigate('/live-code')}
                    className="flex flex-col items-center p-4 bg-purple-100 dark:bg-purple-900/30 rounded-lg"
                    whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <Code size={24} className="mb-2 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium">{t.liveCode}</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => navigate('/story-mode')}
                    className="flex flex-col items-center p-4 bg-green-100 dark:bg-green-900/30 rounded-lg"
                    whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <BookOpenIcon size={24} className="mb-2 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium">{t.storyMode}</span>
                  </motion.button>
                  
                  <motion.button
                    onClick={() => navigate('/login')}
                    className="flex flex-col items-center p-4 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg"
                    whileHover={accessibilitySettings.reducedMotion ? {} : { scale: 1.05 }}
                    whileTap={accessibilitySettings.reducedMotion ? {} : { scale: 0.95 }}
                  >
                    <Users size={24} className="mb-2 text-yellow-600 dark:text-yellow-400" />
                    <span className="text-sm font-medium">Login</span>
                  </motion.button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Premium Modal */}
      <PremiumModal
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
        onUpgrade={handleUpgrade}
        language={currentLanguage}
        reducedMotion={accessibilitySettings.reducedMotion}
        darkMode={accessibilitySettings.darkMode}
      />

      {/* Accessibility Settings Modal */}
      <AnimatePresence>
        {showAccessibilitySettings && (
          <AccessibilitySettings
            isOpen={showAccessibilitySettings}
            onClose={() => setShowAccessibilitySettings(false)}
            settings={accessibilitySettings}
            onSettingsChange={setAccessibilitySettings}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default PlayLearnPage;