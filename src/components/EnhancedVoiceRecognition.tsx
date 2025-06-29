import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Settings,
  Languages,
  Zap,
  Brain,
  Loader2,
  Award,
  Star,
  Target,
  TrendingUp,
  Globe,
  Headphones,
  Waveform,
  Activity
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/revenuecat.js';
import confetti from 'canvas-confetti';

/**
 * Enhanced Voice Recognition Component
 * Advanced speech recognition with real-time feedback, pronunciation scoring,
 * and adaptive learning algorithms
 */
interface VoiceQuiz {
  id: string;
  question: string;
  answer: string;
  language: string;
  difficulty: string;
  grade_level: string;
  subject: string;
  audio_url?: string;
  alternative_answers: string[];
  hint?: string;
}

interface VoiceSettings {
  language: string;
  sensitivity: number;
  autoPlay: boolean;
  showWaveform: boolean;
  pronunciationFeedback: boolean;
  adaptiveDifficulty: boolean;
}

interface RecognitionResult {
  transcript: string;
  confidence: number;
  isCorrect: boolean;
  pronunciationScore: number;
  feedback: string;
}

const EnhancedVoiceRecognition: React.FC = () => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentQuiz, setCurrentQuiz] = useState<VoiceQuiz | null>(null);
  const [quizzes, setQuizzes] = useState<VoiceQuiz[]>([]);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [result, setResult] = useState<RecognitionResult | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [settings, setSettings] = useState<VoiceSettings>({
    language: 'en-US',
    sensitivity: 0.7,
    autoPlay: true,
    showWaveform: true,
    pronunciationFeedback: true,
    adaptiveDifficulty: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [streak, setStreak] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [sessionStats, setSessionStats] = useState({
    attempted: 0,
    correct: 0,
    averageConfidence: 0,
    averagePronunciation: 0
  });

  // Refs
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  // Language options
  const languages = [
    { code: 'en-US', name: 'English (US)', flag: '🇺🇸' },
    { code: 'en-GB', name: 'English (UK)', flag: '🇬🇧' },
    { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
    { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
    { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'zh-CN', name: '中文', flag: '🇨🇳' },
    { code: 'ja-JP', name: '日本語', flag: '🇯🇵' },
    { code: 'ko-KR', name: '한국어', flag: '🇰🇷' }
  ];

  /**
   * Initialize voice recognition and load quizzes
   */
  useEffect(() => {
    const initializeVoiceRecognition = async () => {
      try {
        setIsLoading(true);

        // Check for speech recognition support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          throw new Error('Speech recognition not supported in this browser');
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        
        if (recognitionRef.current) {
          recognitionRef.current.continuous = false;
          recognitionRef.current.interimResults = true;
          recognitionRef.current.lang = settings.language;
          
          recognitionRef.current.onstart = () => {
            setIsListening(true);
            startWaveformAnimation();
          };
          
          recognitionRef.current.onresult = handleSpeechResult;
          
          recognitionRef.current.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
            stopWaveformAnimation();
            Sentry.captureException(new Error(`Speech recognition error: ${event.error}`));
          };
          
          recognitionRef.current.onend = () => {
            setIsListening(false);
            stopWaveformAnimation();
          };
        }

        // Load voice quizzes
        await loadVoiceQuizzes();

        // Load user progress
        await loadUserProgress();

      } catch (error) {
        console.error('Failed to initialize voice recognition:', error);
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeVoiceRecognition();

    // Cleanup
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopWaveformAnimation();
    };
  }, []);

  /**
   * Update recognition language when settings change
   */
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = settings.language;
    }
  }, [settings.language]);

  /**
   * Load voice quizzes from Supabase
   */
  const loadVoiceQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('voice_quizzes')
        .select('*')
        .eq('language', settings.language.split('-')[0])
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (data && data.length > 0) {
        setQuizzes(data);
        setCurrentQuiz(data[0]);
      } else {
        // Fallback sample quizzes
        const sampleQuizzes: VoiceQuiz[] = [
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
        setQuizzes(sampleQuizzes);
        setCurrentQuiz(sampleQuizzes[0]);
      }
    } catch (error) {
      console.error('Failed to load voice quizzes:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Load user progress and statistics
   */
  const loadUserProgress = async () => {
    try {
      const userId = getCurrentUserId();
      
      const { data, error } = await supabase
        .from('voice_quiz_attempts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      if (data) {
        const correct = data.filter(attempt => attempt.is_correct).length;
        const total = data.length;
        const avgConfidence = data.reduce((sum, attempt) => sum + (attempt.confidence_score || 0), 0) / total || 0;
        
        setSessionStats({
          attempted: total,
          correct: correct,
          averageConfidence: avgConfidence,
          averagePronunciation: avgConfidence // Simplified for demo
        });

        // Calculate streak
        let currentStreak = 0;
        for (const attempt of data) {
          if (attempt.is_correct) {
            currentStreak++;
          } else {
            break;
          }
        }
        setStreak(currentStreak);
        setTotalScore(correct * 10 + currentStreak * 5);
      }
    } catch (error) {
      console.error('Failed to load user progress:', error);
    }
  };

  /**
   * Handle speech recognition results
   */
  const handleSpeechResult = (event: SpeechRecognitionEvent) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) {
        finalTranscript += result[0].transcript;
        setConfidence(result[0].confidence);
      } else {
        interimTranscript += result[0].transcript;
      }
    }

    setTranscript(finalTranscript || interimTranscript);

    if (finalTranscript && currentQuiz) {
      processAnswer(finalTranscript, event.results[event.results.length - 1][0].confidence);
    }
  };

  /**
   * Process the user's spoken answer
   */
  const processAnswer = async (spokenText: string, confidence: number) => {
    if (!currentQuiz) return;

    try {
      const normalizedSpoken = spokenText.toLowerCase().trim();
      const normalizedAnswer = currentQuiz.answer.toLowerCase().trim();
      const alternatives = currentQuiz.alternative_answers.map(alt => alt.toLowerCase().trim());

      // Check if answer is correct
      const isCorrect = normalizedSpoken === normalizedAnswer || 
                       alternatives.some(alt => normalizedSpoken === alt) ||
                       normalizedSpoken.includes(normalizedAnswer);

      // Calculate pronunciation score (simplified algorithm)
      const pronunciationScore = calculatePronunciationScore(spokenText, currentQuiz.answer, confidence);

      // Generate feedback
      const feedback = generateFeedback(isCorrect, confidence, pronunciationScore);

      const result: RecognitionResult = {
        transcript: spokenText,
        confidence: confidence,
        isCorrect: isCorrect,
        pronunciationScore: pronunciationScore,
        feedback: feedback
      };

      setResult(result);

      // Update session stats
      setSessionStats(prev => ({
        attempted: prev.attempted + 1,
        correct: prev.correct + (isCorrect ? 1 : 0),
        averageConfidence: (prev.averageConfidence * prev.attempted + confidence) / (prev.attempted + 1),
        averagePronunciation: (prev.averagePronunciation * prev.attempted + pronunciationScore) / (prev.attempted + 1)
      }));

      // Update streak
      if (isCorrect) {
        setStreak(prev => prev + 1);
        setTotalScore(prev => prev + 10 + (pronunciationScore > 0.8 ? 5 : 0));
        
        // Show celebration for correct answers
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      } else {
        setStreak(0);
      }

      // Save attempt to database
      await saveAttempt(result);

      // Auto-advance to next quiz if correct and auto-play enabled
      if (isCorrect && settings.autoPlay) {
        setTimeout(() => {
          nextQuiz();
        }, 2000);
      }

    } catch (error) {
      console.error('Failed to process answer:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Calculate pronunciation score based on confidence and text similarity
   */
  const calculatePronunciationScore = (spoken: string, expected: string, confidence: number): number => {
    // Simplified pronunciation scoring algorithm
    const similarity = calculateTextSimilarity(spoken.toLowerCase(), expected.toLowerCase());
    const score = (similarity * 0.7 + confidence * 0.3);
    return Math.max(0, Math.min(1, score));
  };

  /**
   * Calculate text similarity using Levenshtein distance
   */
  const calculateTextSimilarity = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }

    const maxLength = Math.max(str1.length, str2.length);
    return maxLength === 0 ? 1 : (maxLength - matrix[str2.length][str1.length]) / maxLength;
  };

  /**
   * Generate feedback based on performance
   */
  const generateFeedback = (isCorrect: boolean, confidence: number, pronunciationScore: number): string => {
    if (isCorrect) {
      if (pronunciationScore > 0.9) return "Perfect pronunciation! Excellent work!";
      if (pronunciationScore > 0.7) return "Great job! Your pronunciation is very good.";
      if (pronunciationScore > 0.5) return "Correct answer! Try to speak a bit more clearly.";
      return "Correct! Keep practicing your pronunciation.";
    } else {
      if (confidence < 0.3) return "I couldn't hear you clearly. Try speaking louder and more clearly.";
      if (confidence < 0.6) return "I heard you, but the answer isn't quite right. Try again!";
      return "Not quite right. Listen to the question again and try once more.";
    }
  };

  /**
   * Save attempt to database
   */
  const saveAttempt = async (result: RecognitionResult) => {
    if (!currentQuiz) return;

    try {
      const userId = getCurrentUserId();
      
      const { error } = await supabase
        .from('voice_quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: currentQuiz.id,
          user_answer: result.transcript,
          is_correct: result.isCorrect,
          confidence_score: result.confidence
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to save attempt:', error);
    }
  };

  /**
   * Start voice recognition
   */
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setTranscript('');
      setResult(null);
      recognitionRef.current.start();
    }
  };

  /**
   * Stop voice recognition
   */
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  /**
   * Play question audio
   */
  const playQuestion = async () => {
    if (!currentQuiz) return;

    try {
      setIsPlaying(true);

      if (currentQuiz.audio_url) {
        // Play pre-recorded audio
        if (audioRef.current) {
          audioRef.current.src = currentQuiz.audio_url;
          await audioRef.current.play();
        }
      } else {
        // Use text-to-speech
        const utterance = new SpeechSynthesisUtterance(currentQuiz.question);
        utterance.lang = settings.language;
        utterance.rate = 0.8;
        utterance.onend = () => setIsPlaying(false);
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Failed to play question:', error);
      setIsPlaying(false);
    }
  };

  /**
   * Move to next quiz
   */
  const nextQuiz = () => {
    if (quizzes.length === 0) return;

    const currentIndex = quizzes.findIndex(quiz => quiz.id === currentQuiz?.id);
    const nextIndex = (currentIndex + 1) % quizzes.length;
    setCurrentQuiz(quizzes[nextIndex]);
    setTranscript('');
    setResult(null);
    setConfidence(0);
  };

  /**
   * Start waveform animation
   */
  const startWaveformAnimation = () => {
    if (!settings.showWaveform || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const animate = () => {
      if (!isListening) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw animated waveform
      const centerY = canvas.height / 2;
      const amplitude = 20 + Math.random() * 30;
      const frequency = 0.02;
      
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      
      for (let x = 0; x < canvas.width; x++) {
        const y = centerY + Math.sin(x * frequency + Date.now() * 0.01) * amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
  };

  /**
   * Stop waveform animation
   */
  const stopWaveformAnimation = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
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
          <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
          <p className="text-xl font-semibold text-blue-800">Initializing Voice Recognition...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      {/* Header */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Headphones className="text-blue-600 mr-3" size={32} />
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Enhanced Voice Recognition</h1>
              <p className="text-gray-600">Practice pronunciation with AI-powered feedback</p>
            </div>
          </div>
          
          <motion.button
            onClick={() => setShowSettings(!showSettings)}
            className="p-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Settings className="text-gray-600" size={24} />
          </motion.button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Current Streak</p>
                <p className="text-3xl font-bold text-orange-600">{streak}</p>
              </div>
              <Zap className="text-orange-500" size={32} />
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Score</p>
                <p className="text-3xl font-bold text-purple-600">{totalScore}</p>
              </div>
              <Star className="text-purple-500" size={32} />
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Accuracy</p>
                <p className="text-3xl font-bold text-green-600">
                  {sessionStats.attempted > 0 ? Math.round((sessionStats.correct / sessionStats.attempted) * 100) : 0}%
                </p>
              </div>
              <Target className="text-green-500" size={32} />
            </div>
          </motion.div>

          <motion.div
            className="bg-white rounded-xl shadow-lg p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Confidence</p>
                <p className="text-3xl font-bold text-blue-600">
                  {Math.round(sessionStats.averageConfidence * 100)}%
                </p>
              </div>
              <TrendingUp className="text-blue-500" size={32} />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quiz Panel */}
          <div className="lg:col-span-2">
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {currentQuiz && (
                <>
                  {/* Question */}
                  <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-bold text-gray-800">Question</h2>
                      <div className="flex items-center space-x-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {currentQuiz.subject}
                        </span>
                        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          {currentQuiz.difficulty}
                        </span>
                      </div>
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-6 mb-4">
                      <p className="text-lg text-gray-800 mb-4">{currentQuiz.question}</p>
                      
                      <motion.button
                        onClick={playQuestion}
                        disabled={isPlaying}
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isPlaying ? <Pause className="mr-2" size={20} /> : <Play className="mr-2" size={20} />}
                        {isPlaying ? 'Playing...' : 'Play Question'}
                      </motion.button>
                    </div>

                    {currentQuiz.hint && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                        <p className="text-yellow-800 text-sm">
                          💡 <strong>Hint:</strong> {currentQuiz.hint}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Voice Input */}
                  <div className="mb-8">
                    <h3 className="text-xl font-bold text-gray-800 mb-4">Your Answer</h3>
                    
                    {/* Waveform Visualization */}
                    {settings.showWaveform && (
                      <div className="mb-4">
                        <canvas
                          ref={canvasRef}
                          width={400}
                          height={80}
                          className="w-full h-20 bg-gray-100 rounded-lg"
                        />
                      </div>
                    )}

                    {/* Voice Controls */}
                    <div className="flex items-center justify-center space-x-4 mb-6">
                      <motion.button
                        onClick={isListening ? stopListening : startListening}
                        className={`p-6 rounded-full text-white font-semibold text-lg shadow-lg ${
                          isListening 
                            ? 'bg-red-500 hover:bg-red-600' 
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                        transition={isListening ? { repeat: Infinity, duration: 1 } : {}}
                      >
                        {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                      </motion.button>
                    </div>

                    <p className="text-center text-gray-600 mb-4">
                      {isListening ? 'Listening... Speak your answer clearly' : 'Click the microphone to start speaking'}
                    </p>

                    {/* Transcript Display */}
                    {transcript && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <p className="text-blue-800">
                          <strong>You said:</strong> "{transcript}"
                        </p>
                        {confidence > 0 && (
                          <p className="text-blue-600 text-sm mt-1">
                            Confidence: {Math.round(confidence * 100)}%
                          </p>
                        )}
                      </div>
                    )}

                    {/* Result Display */}
                    <AnimatePresence>
                      {result && (
                        <motion.div
                          className={`border rounded-lg p-6 ${
                            result.isCorrect 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                        >
                          <div className="flex items-center mb-3">
                            {result.isCorrect ? (
                              <CheckCircle className="text-green-600 mr-2" size={24} />
                            ) : (
                              <XCircle className="text-red-600 mr-2" size={24} />
                            )}
                            <h4 className={`font-bold ${
                              result.isCorrect ? 'text-green-800' : 'text-red-800'
                            }`}>
                              {result.isCorrect ? 'Correct!' : 'Try Again'}
                            </h4>
                          </div>
                          
                          <p className={`mb-3 ${
                            result.isCorrect ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {result.feedback}
                          </p>

                          {settings.pronunciationFeedback && (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="font-medium">Confidence:</span>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${result.confidence * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {Math.round(result.confidence * 100)}%
                                </span>
                              </div>
                              
                              <div>
                                <span className="font-medium">Pronunciation:</span>
                                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                  <div 
                                    className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${result.pronunciationScore * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-xs text-gray-600">
                                  {Math.round(result.pronunciationScore * 100)}%
                                </span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Action Buttons */}
                    <div className="flex justify-center space-x-4 mt-6">
                      <motion.button
                        onClick={nextQuiz}
                        className="bg-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Next Question
                      </motion.button>
                      
                      <motion.button
                        onClick={() => {
                          setTranscript('');
                          setResult(null);
                          setConfidence(0);
                        }}
                        className="bg-gray-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-700 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <RotateCcw className="inline mr-2" size={16} />
                        Reset
                      </motion.button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          {/* Settings Panel */}
          <div className="lg:col-span-1">
            <motion.div
              className="bg-white rounded-2xl shadow-xl p-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
                <Brain className="mr-2 text-purple-600" size={24} />
                Settings
              </h3>

              <div className="space-y-6">
                {/* Language Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Language
                  </label>
                  <select
                    value={settings.language}
                    onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    {languages.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.flag} {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sensitivity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sensitivity: {Math.round(settings.sensitivity * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.1"
                    value={settings.sensitivity}
                    onChange={(e) => setSettings(prev => ({ ...prev, sensitivity: parseFloat(e.target.value) }))}
                    className="w-full"
                  />
                </div>

                {/* Toggle Settings */}
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.autoPlay}
                      onChange={(e) => setSettings(prev => ({ ...prev, autoPlay: e.target.checked }))}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Auto-play next question</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.showWaveform}
                      onChange={(e) => setSettings(prev => ({ ...prev, showWaveform: e.target.checked }))}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Show waveform</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.pronunciationFeedback}
                      onChange={(e) => setSettings(prev => ({ ...prev, pronunciationFeedback: e.target.checked }))}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Pronunciation feedback</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings.adaptiveDifficulty}
                      onChange={(e) => setSettings(prev => ({ ...prev, adaptiveDifficulty: e.target.checked }))}
                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Adaptive difficulty</span>
                  </label>
                </div>

                {/* Progress Summary */}
                <div className="border-t pt-6">
                  <h4 className="font-medium text-gray-800 mb-3">Session Progress</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Questions Attempted:</span>
                      <span className="font-medium">{sessionStats.attempted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Correct Answers:</span>
                      <span className="font-medium text-green-600">{sessionStats.correct}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Current Streak:</span>
                      <span className="font-medium text-orange-600">{streak}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Audio Element */}
      <audio ref={audioRef} className="hidden" />
    </div>
  );
};

export default EnhancedVoiceRecognition;