import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Play, Pause, RotateCcw, CheckCircle, XCircle, Settings, Zap, Brain, Loader2, Star, Target, TrendingUp, Headphones } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/authUtils';
import confetti from 'canvas-confetti';

// Type definition for SpeechRecognition
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionEvent {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface VoiceQuiz {
  id: string;
  question: string;
  answer: string;
  alternative_answers?: string[];
  hint?: string;
  language: string;
  difficulty: string;
  grade_level: string;
  subject: string;
}

interface VoiceSettings {
  sensitivity: number;
  timeout: number;
  language: string;
  autoPlay: boolean;
  showHints: boolean;
}

const EnhancedVoiceRecognition: React.FC = () => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentQuiz, setCurrentQuiz] = useState<VoiceQuiz | null>(null);
  const [quizzes, setQuizzes] = useState<VoiceQuiz[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [settings, setSettings] = useState<VoiceSettings>({
    sensitivity: 0.7,
    timeout: 5000,
    language: 'en-US',
    autoPlay: true,
    showHints: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Initialize speech recognition and load quizzes
   */
  useEffect(() => {
    initializeSpeechRecognition();
    loadVoiceQuizzes();
    loadUserProgress();

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []);

  /**
   * Initialize speech recognition
   */
  const initializeSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setIsLoading(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition() as SpeechRecognition;

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = settings.language;

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          finalTranscript += transcript;
          setConfidence(confidence);
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        setUserAnswer(finalTranscript.trim());
        checkAnswer(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setError('No speech detected. Please try again.');
          break;
        case 'audio-capture':
          setError('Microphone not accessible. Please check permissions.');
          break;
        case 'not-allowed':
          setError('Microphone permission denied. Please allow microphone access.');
          break;
        default:
          setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
  };

  /**
   * Load voice quizzes from Supabase
   */
  const loadVoiceQuizzes = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('voice_quizzes')
        .select('*')
        .eq('language', settings.language.split('-')[0])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Supabase error:', error.message, error.details, error.hint);
        throw new Error(`Failed to load quizzes: ${error.message}`);
      }

      if (data && data.length > 0) {
        setQuizzes(data);
        setCurrentQuiz(data[0]);
      } else {
        // Fallback to sample quizzes
        const sampleQuizzes: VoiceQuiz[] = [
          {
            id: '1',
            question: 'What color is the sky on a clear day?',
            answer: 'blue',
            alternative_answers: ['sky blue', 'light blue'],
            hint: 'Look up on a sunny day',
            language: 'en',
            difficulty: 'easy',
            grade_level: 'kindergarten',
            subject: 'science'
          },
          {
            id: '2',
            question: 'How many days are in a week?',
            answer: 'seven',
            alternative_answers: ['7'],
            hint: 'Monday through Sunday',
            language: 'en',
            difficulty: 'easy',
            grade_level: 'kindergarten',
            subject: 'math'
          },
          {
            id: '3',
            question: 'What sound does a cat make?',
            answer: 'meow',
            alternative_answers: ['mew', 'purr'],
            hint: 'Think about your pet cat',
            language: 'en',
            difficulty: 'easy',
            grade_level: 'kindergarten',
            subject: 'language'
          }
        ];
        
        setQuizzes(sampleQuizzes);
        setCurrentQuiz(sampleQuizzes[0]);
      }
    } catch (error: any) {
      console.error('Failed to load voice quizzes:', error);
      setError('Failed to load quizzes. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load user progress from localStorage
   */
  const loadUserProgress = () => {
    try {
      const savedProgress = localStorage.getItem('voice_recognition_progress');
      if (savedProgress) {
        const progress = JSON.parse(savedProgress);
        setScore(progress.score || { correct: 0, total: 0 });
        setStreak(progress.streak || 0);
        setBestStreak(progress.bestStreak || 0);
      }
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  /**
   * Save user progress to localStorage
   */
  const saveUserProgress = () => {
    try {
      const progress = {
        score,
        streak,
        bestStreak,
        timestamp: Date.now()
      };
      localStorage.setItem('voice_recognition_progress', JSON.stringify(progress));
    } catch (error) {
      console.error('Failed to save user progress:', error);
    }
  };

  /**
   * Start listening for voice input
   */
  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Speech recognition not initialized');
      return;
    }

    try {
      setError(null);
      setTranscript('');
      setUserAnswer('');
      setIsCorrect(null);
      
      recognitionRef.current.start();

      // Set timeout for listening
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        stopListening();
        setError('Listening timeout. Please try again.');
      }, settings.timeout);

    } catch (error) {
      console.error('Failed to start listening:', error);
      setError('Failed to start listening. Please try again.');
    }
  };

  /**
   * Stop listening for voice input
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setIsListening(false);
  };

  /**
   * Check if the user's answer is correct
   */
  const checkAnswer = async (answer: string) => {
    if (!currentQuiz) return;

    const normalizedAnswer = answer.toLowerCase().trim();
    const correctAnswer = currentQuiz.answer.toLowerCase();
    const alternativeAnswers = currentQuiz.alternative_answers?.map(alt => alt.toLowerCase()) || [];

    const isAnswerCorrect = normalizedAnswer === correctAnswer || 
                           alternativeAnswers.includes(normalizedAnswer) ||
                           normalizedAnswer.includes(correctAnswer) ||
                           correctAnswer.includes(normalizedAnswer);

    setIsCorrect(isAnswerCorrect);

    // Update score and streak
    const newScore = {
      correct: score.correct + (isAnswerCorrect ? 1 : 0),
      total: score.total + 1
    };
    setScore(newScore);

    if (isAnswerCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      
      if (newStreak > bestStreak) {
        setBestStreak(newStreak);
      }

      // Show confetti for correct answers
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });

      // Play success sound
      playSuccessSound();
    } else {
      setStreak(0);
      // Play error sound
      playErrorSound();
    }

    // Save progress
    saveUserProgress();

    // Record attempt in Supabase
    try {
      await supabase
        .from('voice_quiz_attempts')
        .insert({
          user_id: getCurrentUserId(),
          quiz_id: currentQuiz.id,
          user_answer: answer,
          is_correct: isAnswerCorrect,
          confidence_score: confidence
        });
    } catch (error) {
      console.error('Failed to record quiz attempt:', error);
    }

    // Auto-advance to next quiz after delay
    if (settings.autoPlay) {
      setTimeout(() => {
        nextQuiz();
      }, 2000);
    }
  };

  /**
   * Move to the next quiz
   */
  const nextQuiz = () => {
    if (quizzes.length === 0) return;

    const currentIndex = quizzes.findIndex(quiz => quiz.id === currentQuiz?.id);
    const nextIndex = (currentIndex + 1) % quizzes.length;
    
    setCurrentQuiz(quizzes[nextIndex]);
    setUserAnswer('');
    setTranscript('');
    setIsCorrect(null);
    setShowHint(false);
    setConfidence(0);
    setError(null);
  };

  /**
   * Reset current quiz
   */
  const resetQuiz = () => {
    setUserAnswer('');
    setTranscript('');
    setIsCorrect(null);
    setShowHint(false);
    setConfidence(0);
    setError(null);
  };

  /**
   * Play success sound
   */
  const playSuccessSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'); // Replace with actual success sound file
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Failed to play success sound:', error);
    }
  };

  /**
   * Play error sound
   */
  const playErrorSound = () => {
    try {
      const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'); // Replace with actual error sound file
      audio.volume = 0.2;
      audio.play().catch(() => {});
    } catch (error) {
      console.error('Failed to play error sound:', error);
    }
  };

  /**
   * Update settings
   */
  const updateSettings = (newSettings: Partial<VoiceSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    
    // Update speech recognition language if changed
    if (newSettings.language && recognitionRef.current) {
      recognitionRef.current.lang = newSettings.language;
    }
    
    // Save settings to localStorage
    localStorage.setItem('voice_recognition_settings', JSON.stringify(updatedSettings));
  };

  // Calculate accuracy percentage
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-xl font-semibold text-blue-800">Loading Voice Recognition...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Headphones className="text-white" size={32} />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Voice Recognition Quiz</h1>
          <p className="text-gray-600">Practice speaking and improve your pronunciation</p>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            className="bg-white rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-2xl font-bold text-blue-600">{score.correct}/{score.total}</p>
              </div>
              <Target className="text-blue-500" size={24} />
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Accuracy</p>
                <p className="text-2xl font-bold text-green-600">{accuracy}%</p>
              </div>
              <TrendingUp className="text-green-500" size={24} />
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Streak</p>
                <p className="text-2xl font-bold text-orange-600">{streak}</p>
              </div>
              <Zap className="text-orange-500" size={24} />
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl p-4 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Best Streak</p>
                <p className="text-2xl font-bold text-purple-600">{bestStreak}</p>
              </div>
              <Star className="text-purple-500" size={24} />
            </div>
          </motion.div>
        </div>

        {/* Main Quiz Area */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {error && (
            <motion.div
              className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center">
                <XCircle className="text-red-500 mr-3" size={20} />
                <p className="text-red-700">{error}</p>
              </div>
            </motion.div>
          )}

          {currentQuiz && (
            <div className="text-center">
              {/* Question */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={currentQuiz.id}
              >
                <h2 className="text-2xl font-bold text-gray-800 mb-4">{currentQuiz.question}</h2>
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-600">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                    {currentQuiz.subject}
                  </span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">
                    {currentQuiz.difficulty}
                  </span>
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
                    {currentQuiz.grade_level}
                  </span>
                </div>
              </motion.div>

              {/* Microphone Button */}
              <motion.button
                onClick={isListening ? stopListening : startListening}
                className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 mx-auto transition-all duration-300 ${
                  isListening
                    ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white shadow-lg hover:shadow-xl`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                disabled={!currentQuiz}
              >
                {isListening ? <MicOff size={32} /> : <Mic size={32} />}
              </motion.button>

              <p className="text-gray-600 mb-6">
                {isListening ? 'Listening... Speak now!' : 'Click the microphone to start speaking'}
              </p>

              {/* Transcript Display */}
              {transcript && (
                <motion.div
                  className="bg-gray-50 rounded-lg p-4 mb-6"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <p className="text-gray-700">
                    <strong>You said:</strong> "{transcript}"
                  </p>
                  {confidence > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      Confidence: {Math.round(confidence * 100)}%
                    </p>
                  )}
                </motion.div>
              )}

              {/* Result Display */}
              <AnimatePresence>
                {isCorrect !== null && (
                  <motion.div
                    className={`p-4 rounded-lg mb-6 ${
                      isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <div className="flex items-center justify-center mb-2">
                      {isCorrect ? (
                        <CheckCircle className="text-green-500 mr-2" size={24} />
                      ) : (
                        <XCircle className="text-red-500 mr-2" size={24} />
                      )}
                      <span className={`font-semibold ${isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {isCorrect ? 'Correct!' : 'Try again!'}
                      </span>
                    </div>
                    {!isCorrect && (
                      <p className="text-red-600">
                        The correct answer is: <strong>{currentQuiz.answer}</strong>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hint */}
              {showHint && currentQuiz.hint && (
                <motion.div
                  className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <p className="text-yellow-800">
                    <strong>Hint:</strong> {currentQuiz.hint}
                  </p>
                </motion.div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-center space-x-4">
                {settings.showHints && currentQuiz.hint && (
                  <motion.button
                    onClick={() => setShowHint(!showHint)}
                    className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {showHint ? 'Hide Hint' : 'Show Hint'}
                  </motion.button>
                )}

                <motion.button
                  onClick={resetQuiz}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <RotateCcw className="mr-2" size={16} />
                  Reset
                </motion.button>

                <motion.button
                  onClick={nextQuiz}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Next Quiz
                </motion.button>

                <motion.button
                  onClick={() => setShowSettings(true)}
                  className="bg-purple-500 text-white px-4 py-2 rounded-lg hover:bg-purple-600 transition-colors flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings className="mr-2" size={16} />
                  Settings
                </motion.button>
              </div>
            </div>
          )}
        </div>

        {/* Settings Modal */}
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
                className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
 fringes
                >
                  <h3 className="text-lg font-bold mb-4">Voice Recognition Settings</h3>
                  
                  <div className="space-y-4">
                    {/* Language */}
                    <div>
                      <label className="block text-sm font-medium mb-2">Language</label>
                      <select
                        value={settings.language}
                        onChange={(e) => updateSettings({ language: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="es-ES">Spanish</option>
                        <option value="fr-FR">French</option>
                        <option value="de-DE">German</option>
                        <option value="zh-CN">Chinese</option>
                      </select>
                    </div>

                    {/* Sensitivity */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Sensitivity: {Math.round(settings.sensitivity * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={settings.sensitivity}
                        onChange={(e) => updateSettings({ sensitivity: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Timeout */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Timeout: {settings.timeout / 1000}s
                      </label>
                      <input
                        type="range"
                        min="3000"
                        max="10000"
                        step="1000"
                        value={settings.timeout}
                        onChange={(e) => updateSettings({ timeout: Number(e.target.value) })}
                        className="w-full"
                      />
                    </div>

                    {/* Toggles */}
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.autoPlay}
                          onChange={(e) => updateSettings({ autoPlay: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Auto-advance to next quiz</span>
                      </label>

                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={settings.showHints}
                          onChange={(e) => updateSettings({ showHints: e.target.checked })}
                          className="mr-2"
                        />
                        <span className="text-sm">Show hint button</span>
                      </label>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowSettings(false)}
                    className="w-full mt-6 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
                  >
                    Done
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
};

export default EnhancedVoiceRecognition;