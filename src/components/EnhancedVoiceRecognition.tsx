import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  Settings, 
  Languages, 
  Brain, 
  Zap, 
  Target, 
  Award, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Sparkles,
  Headphones,
  Waveform,
  RotateCcw,
  Play,
  Pause,
  SkipForward,
  Star,
  Flame,
  Trophy,
  Globe,
  Lightbulb,
  Eye,
  EyeOff
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/revenuecat.js';
import confetti from 'canvas-confetti';

interface VoiceQuiz {
  id: string;
  question: string;
  answer: string;
  language: string;
  difficulty: string;
  grade_level: string;
  subject: string;
  alternative_answers?: string[];
  hint?: string;
  audio_url?: string;
}

interface EnhancedVoiceRecognitionProps {
  language?: string;
  difficulty?: string;
  onScoreUpdate?: (score: number) => void;
  onStreakUpdate?: (streak: number) => void;
}

/**
 * Enhanced Voice Recognition Component
 * Advanced speech recognition with AI-powered feedback and adaptive learning
 */
const EnhancedVoiceRecognition: React.FC<EnhancedVoiceRecognitionProps> = ({
  language = 'en',
  difficulty = 'easy',
  onScoreUpdate,
  onStreakUpdate
}) => {
  // State management
  const [isListening, setIsListening] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentQuiz, setCurrentQuiz] = useState<VoiceQuiz | null>(null);
  const [quizzes, setQuizzes] = useState<VoiceQuiz[]>([]);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [confidence, setConfidence] = useState(0);
  const [audioWaveform, setAudioWaveform] = useState<number[]>([]);
  const [showTranscript, setShowTranscript] = useState(true);
  const [showHints, setShowHints] = useState(true);
  const [autoPlay, setAutoPlay] = useState(true);
  const [speechRate, setSpeechRate] = useState(1.0);
  const [speechVolume, setSpeechVolume] = useState(0.8);
  
  // Refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Language options
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'pt', name: 'Português', flag: '🇵🇹' }
  ];

  /**
   * Initialize enhanced voice recognition
   */
  useEffect(() => {
    initializeEnhancedVoiceRecognition();
    loadVoiceQuizzes();
    
    return () => {
      cleanup();
    };
  }, [language, difficulty]);

  /**
   * Initialize speech recognition with enhanced features
   */
  const initializeEnhancedVoiceRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      // Enhanced configuration
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.maxAlternatives = 5;
      recognitionRef.current.lang = getLanguageCode(language);
      
      recognitionRef.current.onstart = () => {
        setIsListening(true);
        startAudioVisualization();
      };
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          const confidence = event.results[i][0].confidence;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
            setConfidence(confidence);
            setUserAnswer(finalTranscript.trim());
            checkAnswer(finalTranscript.trim(), confidence);
          } else {
            interimTranscript += transcript;
            setUserAnswer(interimTranscript);
          }
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        stopAudioVisualization();
        
        // Provide user-friendly error messages
        let errorMessage = 'Speech recognition error occurred.';
        switch (event.error) {
          case 'no-speech':
            errorMessage = 'No speech detected. Please try speaking louder.';
            break;
          case 'audio-capture':
            errorMessage = 'Microphone access denied. Please check permissions.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied.';
            break;
          case 'network':
            errorMessage = 'Network error. Please check your connection.';
            break;
        }
        
        // Show error to user (you might want to add a toast notification system)
        console.warn(errorMessage);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
        stopAudioVisualization();
      };
    }
  };

  /**
   * Get language code for speech recognition
   */
  const getLanguageCode = (lang: string) => {
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'es': 'es-ES',
      'zh': 'zh-CN',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'ja': 'ja-JP',
      'ko': 'ko-KR',
      'pt': 'pt-PT'
    };
    return langMap[lang] || 'en-US';
  };

  /**
   * Start audio visualization
   */
  const startAudioVisualization = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);
      
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const updateWaveform = () => {
        if (!analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Convert to normalized values for visualization
        const waveform = Array.from(dataArray).map(value => value / 255);
        setAudioWaveform(waveform.slice(0, 32));
        
        animationFrameRef.current = requestAnimationFrame(updateWaveform);
      };
      
      updateWaveform();
    } catch (error) {
      console.error('Failed to start audio visualization:', error);
    }
  };

  /**
   * Stop audio visualization
   */
  const stopAudioVisualization = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }
    
    setAudioWaveform([]);
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
    }
    
    stopAudioVisualization();
    
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
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
        .eq('language', language)
        .eq('difficulty', difficulty)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        setQuizzes(data);
        setCurrentQuiz(data[0]);
      } else {
        // Fallback to sample quizzes
        const sampleQuizzes = [
          {
            id: 'sample_1',
            question: 'What color is the sky on a clear day?',
            answer: 'blue',
            language: language,
            difficulty: difficulty,
            grade_level: 'kindergarten',
            subject: 'science',
            alternative_answers: ['sky blue', 'light blue'],
            hint: 'Look up on a sunny day'
          },
          {
            id: 'sample_2',
            question: 'How many days are in a week?',
            answer: 'seven',
            language: language,
            difficulty: difficulty,
            grade_level: 'kindergarten',
            subject: 'math',
            alternative_answers: ['7'],
            hint: 'Monday through Sunday'
          },
          {
            id: 'sample_3',
            question: 'What is the capital of France?',
            answer: 'Paris',
            language: language,
            difficulty: difficulty,
            grade_level: 'grade1-6',
            subject: 'geography',
            alternative_answers: [],
            hint: 'It has a famous tower'
          }
        ];
        
        setQuizzes(sampleQuizzes);
        setCurrentQuiz(sampleQuizzes[0]);
      }
    } catch (error) {
      console.error('Failed to load voice quizzes:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Start listening for voice input
   */
  const startListening = () => {
    if (recognitionRef.current) {
      setUserAnswer('');
      setIsCorrect(null);
      recognitionRef.current.start();
    }
  };

  /**
   * Stop listening for voice input
   */
  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  /**
   * Check answer with enhanced matching
   */
  const checkAnswer = (answer: string, confidenceScore: number = 0) => {
    if (!currentQuiz) return;

    // Normalize answers for comparison
    const normalizedUserAnswer = answer.toLowerCase().trim();
    const normalizedCorrectAnswer = currentQuiz.answer.toLowerCase().trim();
    
    // Include alternative answers
    const alternativeAnswers = currentQuiz.alternative_answers || [];
    const normalizedAlternatives = alternativeAnswers.map(alt => alt.toLowerCase().trim());
    
    // Check for exact match
    let isExactMatch = normalizedUserAnswer === normalizedCorrectAnswer;
    
    // Check for alternative matches
    let isAlternativeMatch = normalizedAlternatives.some(alt => normalizedUserAnswer === alt);
    
    // Check for partial match (if confidence is high)
    let isPartialMatch = false;
    if (confidenceScore > 0.7) {
      isPartialMatch = normalizedUserAnswer.includes(normalizedCorrectAnswer) || 
                      normalizedCorrectAnswer.includes(normalizedUserAnswer) ||
                      normalizedAlternatives.some(alt => 
                        normalizedUserAnswer.includes(alt) || alt.includes(normalizedUserAnswer)
                      );
    }
    
    const isAnswerCorrect = isExactMatch || isAlternativeMatch || isPartialMatch;
    setIsCorrect(isAnswerCorrect);

    if (isAnswerCorrect) {
      // Calculate points based on difficulty and confidence
      const difficultyMultiplier = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 2 : 3;
      const confidenceBonus = Math.round(confidenceScore * 5);
      const points = 10 * difficultyMultiplier + confidenceBonus;
      
      setScore(prev => {
        const newScore = prev + points;
        if (onScoreUpdate) onScoreUpdate(newScore);
        return newScore;
      });
      
      setStreak(prev => {
        const newStreak = prev + 1;
        if (onStreakUpdate) onStreakUpdate(newStreak);
        return newStreak;
      });
      
      // Level up check
      if ((score + points) > 0 && (score + points) % 100 === 0) {
        setLevel(prev => prev + 1);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
      
      // Play success sound
      const successSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      successSound.volume = 0.3;
      successSound.play().catch(() => {});
      
      // Save progress
      saveVoiceQuizProgress(true, confidenceScore);
      
      // Auto-advance to next quiz if enabled
      if (autoPlay) {
        setTimeout(() => {
          nextQuiz();
        }, 2000);
      }
    } else {
      setStreak(0);
      if (onStreakUpdate) onStreakUpdate(0);
      
      // Play error sound
      const errorSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
      errorSound.volume = 0.2;
      errorSound.play().catch(() => {});
      
      // Save progress
      saveVoiceQuizProgress(false, confidenceScore);
    }
  };

  /**
   * Save voice quiz progress to Supabase
   */
  const saveVoiceQuizProgress = async (correct: boolean, confidenceScore: number) => {
    try {
      const userId = getCurrentUserId();
      
      const { error } = await supabase
        .from('voice_quiz_attempts')
        .insert({
          user_id: userId,
          quiz_id: currentQuiz?.id,
          user_answer: userAnswer,
          is_correct: correct,
          confidence_score: confidenceScore
        });
      
      if (error) {
        console.error('Failed to save voice quiz progress:', error);
      }
    } catch (error) {
      console.error('Failed to save voice quiz progress:', error);
    }
  };

  /**
   * Move to next quiz
   */
  const nextQuiz = () => {
    if (!quizzes.length) return;
    
    const currentIndex = quizzes.findIndex(quiz => quiz.id === currentQuiz?.id);
    const nextIndex = (currentIndex + 1) % quizzes.length;
    setCurrentQuiz(quizzes[nextIndex]);
    setUserAnswer('');
    setIsCorrect(null);
    setConfidence(0);
  };

  /**
   * Speak quiz question using text-to-speech
   */
  const speakQuestion = () => {
    if (!currentQuiz) return;
    
    const utterance = new SpeechSynthesisUtterance(currentQuiz.question);
    utterance.lang = getLanguageCode(language);
    utterance.rate = speechRate;
    utterance.volume = speechVolume;
    
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  /**
   * Render audio waveform visualization
   */
  const renderWaveform = () => {
    return (
      <div className="flex items-center justify-center h-12 gap-1">
        {audioWaveform.map((value, index) => (
          <motion.div
            key={index}
            className="w-1 bg-blue-500"
            style={{ 
              height: `${Math.max(4, value * 48)}px`,
              opacity: Math.max(0.3, value)
            }}
            animate={{ 
              height: `${Math.max(4, value * 48)}px`,
              opacity: Math.max(0.3, value)
            }}
            transition={{ duration: 0.1 }}
          />
        ))}
        
        {audioWaveform.length === 0 && isListening && (
          <div className="flex items-center space-x-1">
            {[1, 2, 3, 4, 5].map((_, i) => (
              <motion.div
                key={i}
                className="w-1 h-4 bg-blue-500"
                animate={{ 
                  height: [4, 16, 8, 24, 4],
                  opacity: [0.3, 1, 0.5, 0.8, 0.3]
                }}
                transition={{ 
                  duration: 1.5, 
                  repeat: Infinity,
                  delay: i * 0.1
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <Mic className="text-blue-600 mr-3" size={48} />
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">
            Enhanced Voice Quiz
          </h2>
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          Answer questions using your voice with advanced speech recognition!
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin mr-3" size={32} />
          <p>Loading voice quizzes...</p>
        </div>
      ) : (
        <>
          {/* Quiz Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-center">
              <Star className="mx-auto mb-1 text-yellow-500" size={20} />
              <p className="text-sm text-gray-600 dark:text-gray-300">Score</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{score}</p>
            </div>
            
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg text-center">
              <Flame className="mx-auto mb-1 text-orange-500" size={20} />
              <p className="text-sm text-gray-600 dark:text-gray-300">Streak</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{streak}</p>
            </div>
            
            <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg text-center">
              <Trophy className="mx-auto mb-1 text-purple-500" size={20} />
              <p className="text-sm text-gray-600 dark:text-gray-300">Level</p>
              <p className="text-xl font-bold text-gray-800 dark:text-white">{level}</p>
            </div>
          </div>

          {currentQuiz && (
            <div className="space-y-6">
              {/* Language Indicator */}
              <div className="flex items-center justify-center mb-2">
                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full flex items-center">
                  <Globe className="mr-1 text-blue-500" size={16} />
                  <span className="text-sm">
                    {languages.find(l => l.code === language)?.flag || '🌐'} {languages.find(l => l.code === language)?.name || 'English'}
                  </span>
                </div>
              </div>

              {/* Question */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-800 dark:text-white">Question:</h3>
                  <button 
                    onClick={speakQuestion}
                    className="p-2 bg-blue-100 dark:bg-blue-800 rounded-full text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-700"
                  >
                    <Volume2 size={16} />
                  </button>
                </div>
                <p className="text-lg text-gray-800 dark:text-white">{currentQuiz.question}</p>
                
                {showHints && currentQuiz.hint && (
                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start">
                    <Lightbulb className="text-yellow-600 dark:text-yellow-400 mr-2 flex-shrink-0 mt-0.5" size={16} />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Hint: {currentQuiz.hint}
                    </p>
                  </div>
                )}
              </div>

              {/* Voice Controls */}
              <div className="text-center">
                <div className="mb-4">
                  {renderWaveform()}
                </div>
                
                <motion.button
                  onClick={isListening ? stopListening : startListening}
                  className={`p-6 rounded-full text-white font-bold text-lg shadow-lg transition-all ${
                    isListening 
                      ? 'bg-red-500 hover:bg-red-600' 
                      : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
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
                    className="mt-4 text-blue-600 dark:text-blue-400"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    <p className="text-sm">Listening... Speak your answer clearly</p>
                  </motion.div>
                )}
              </div>

              {/* Answer Display */}
              {userAnswer && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <h4 className="font-semibold mb-2 text-gray-800 dark:text-white">You said:</h4>
                  <p className="text-lg text-gray-800 dark:text-white">"{userAnswer}"</p>
                  {confidence > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Confidence: {Math.round(confidence * 100)}%
                      </p>
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-1">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${confidence * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
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
                      The correct answer is: {currentQuiz.answer}
                      {currentQuiz.alternative_answers && currentQuiz.alternative_answers.length > 0 && (
                        <span className="block mt-1 text-xs">
                          Also accepted: {currentQuiz.alternative_answers.join(', ')}
                        </span>
                      )}
                    </p>
                  )}
                </motion.div>
              )}

              {/* Controls */}
              <div className="flex justify-center space-x-4">
                <motion.button
                  onClick={nextQuiz}
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <SkipForward className="mr-2" size={20} />
                  Next Question
                </motion.button>
                
                <motion.button
                  onClick={() => setShowHints(!showHints)}
                  className="bg-yellow-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-yellow-700 transition-colors flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showHints ? <EyeOff className="mr-2" size={20} /> : <Eye className="mr-2" size={20} />}
                  {showHints ? 'Hide Hints' : 'Show Hints'}
                </motion.button>
              </div>
            </div>
          )}

          {!currentQuiz && (
            <div className="text-center py-12">
              <Mic className="mx-auto mb-4 text-gray-400" size={48} />
              <p className="text-gray-600 dark:text-gray-300">
                No voice quizzes available for the selected language and difficulty.
              </p>
              <button
                onClick={loadVoiceQuizzes}
                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Reload Quizzes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EnhancedVoiceRecognition;