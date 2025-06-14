import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  BookOpen, 
  Play, 
  Pause, 
  SkipForward, 
  SkipBack, 
  Volume2, 
  VolumeX,
  ArrowLeft,
  Settings,
  Star,
  Heart,
  Sparkles,
  Crown,
  Lock,
  Loader2,
  Mic,
  MicOff,
  Eye,
  EyeOff,
  RotateCcw,
  Share2,
  Download,
  Palette,
  Type,
  Zap,
  Globe,
  Languages
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

/**
 * Story Mode Component
 * Interactive storytelling with AI-generated narratives and voice synthesis
 * Supports multiple languages, accessibility features, and premium content
 */
const StoryMode: React.FC = () => {
  const navigate = useNavigate();
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // State management
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentStory, setCurrentStory] = useState<any>(null);
  const [stories, setStories] = useState<any[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentChapter, setCurrentChapter] = useState(0);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [language, setLanguage] = useState('en');
  const [fontSize, setFontSize] = useState(18);
  const [theme, setTheme] = useState('light');
  const [showSettings, setShowSettings] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [showTranscript, setShowTranscript] = useState(true);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Language options
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' }
  ];

  // Theme options
  const themes = [
    { id: 'light', name: 'Light', bg: 'from-blue-50 to-indigo-100' },
    { id: 'dark', name: 'Dark', bg: 'from-gray-900 to-blue-900' },
    { id: 'sepia', name: 'Sepia', bg: 'from-amber-50 to-orange-100' },
    { id: 'forest', name: 'Forest', bg: 'from-green-50 to-emerald-100' },
    { id: 'ocean', name: 'Ocean', bg: 'from-cyan-50 to-blue-100' }
  ];

  /**
   * Initialize story mode
   */
  useEffect(() => {
    const initializeStoryMode = async () => {
      try {
        setIsLoading(true);
        
        // Check premium access
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);

        // Load stories from Supabase
        await loadStories();

        // Load user preferences
        loadUserPreferences();

      } catch (error) {
        console.error('Failed to initialize story mode:', error);
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeStoryMode();
  }, []);

  /**
   * Load stories from Supabase
   */
  const loadStories = async () => {
    try {
      const response = await fetch('/.netlify/functions/narrative', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        }
      });

      const result = await response.json();

      if (result.success && result.stories.length > 0) {
        setStories(result.stories);
        setCurrentStory(result.stories[0]);
      } else {
        // Fallback to sample stories
        const sampleStories = [
          {
            id: 'sample_1',
            story_id: 'adventure_forest',
            title: 'The Magical Forest Adventure',
            content: 'Once upon a time, in a magical forest filled with talking animals and glowing flowers, there lived a brave young explorer named Alex. Every day brought new adventures and wonderful discoveries...',
            grade: 'kindergarten',
            language: 'en',
            chapters: [
              {
                title: 'The Beginning',
                content: 'Alex stepped into the magical forest for the first time, eyes wide with wonder.',
                audio_url: null
              },
              {
                title: 'Meeting Friends',
                content: 'A friendly rabbit hopped up to Alex and said, "Welcome to our magical home!"',
                audio_url: null
              },
              {
                title: 'The Adventure',
                content: 'Together, Alex and the forest friends discovered a hidden treasure of friendship.',
                audio_url: null
              }
            ]
          },
          {
            id: 'sample_2',
            story_id: 'space_journey',
            title: 'Journey to the Stars',
            content: 'Captain Luna and her crew embarked on an incredible journey through space, discovering new planets and making friends with alien civilizations...',
            grade: 'grade1-6',
            language: 'en',
            chapters: [
              {
                title: 'Blast Off',
                content: 'The spaceship engines roared to life as Captain Luna began her cosmic adventure.',
                audio_url: null
              },
              {
                title: 'New Worlds',
                content: 'Each planet they visited had unique creatures and amazing landscapes.',
                audio_url: null
              },
              {
                title: 'Coming Home',
                content: 'With hearts full of memories, the crew returned to Earth with stories to share.',
                audio_url: null
              }
            ]
          }
        ];
        
        setStories(sampleStories);
        setCurrentStory(sampleStories[0]);
      }
    } catch (error) {
      console.error('Failed to load stories:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Load user preferences
   */
  const loadUserPreferences = () => {
    try {
      const savedPrefs = localStorage.getItem('storymode_preferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setLanguage(prefs.language || 'en');
        setFontSize(prefs.fontSize || 18);
        setTheme(prefs.theme || 'light');
        setVolume(prefs.volume || 0.8);
        setPlaybackSpeed(prefs.playbackSpeed || 1);
        setAutoPlay(prefs.autoPlay !== false);
        setShowTranscript(prefs.showTranscript !== false);
        setVoiceEnabled(prefs.voiceEnabled !== false);
        setHighContrast(prefs.highContrast || false);
        setReducedMotion(prefs.reducedMotion || false);
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  };

  /**
   * Save user preferences
   */
  const saveUserPreferences = () => {
    try {
      const prefs = {
        language,
        fontSize,
        theme,
        volume,
        playbackSpeed,
        autoPlay,
        showTranscript,
        voiceEnabled,
        highContrast,
        reducedMotion
      };
      localStorage.setItem('storymode_preferences', JSON.stringify(prefs));
    } catch (error) {
      console.error('Failed to save user preferences:', error);
    }
  };

  /**
   * Play/pause story narration
   */
  const togglePlayback = async () => {
    if (!currentStory || !voiceEnabled) return;

    try {
      if (isPlaying) {
        // Pause narration
        if (audioRef.current) {
          audioRef.current.pause();
        }
        setIsPlaying(false);
      } else {
        // Start narration
        await playChapter(currentChapter);
      }
    } catch (error) {
      console.error('Failed to toggle playback:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Play specific chapter
   */
  const playChapter = async (chapterIndex: number) => {
    if (!currentStory || !currentStory.chapters || !voiceEnabled) return;

    try {
      const chapter = currentStory.chapters[chapterIndex];
      if (!chapter) return;

      // Generate audio if premium user
      if (isPremium) {
        const response = await fetch('/.netlify/functions/textToSpeech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': getCurrentUserId()
          },
          body: JSON.stringify({
            text: chapter.content,
            language: language,
            settings: {
              stability: 0.7,
              similarity_boost: 0.8,
              style: 0.6,
              speaking_rate: playbackSpeed
            }
          })
        });

        const result = await response.json();

        if (result.success && result.audio_data) {
          // Play generated audio
          const audioBlob = new Blob([
            Uint8Array.from(atob(result.audio_data), c => c.charCodeAt(0))
          ], { type: 'audio/mpeg' });
          
          const audioUrl = URL.createObjectURL(audioBlob);
          
          if (audioRef.current) {
            audioRef.current.src = audioUrl;
            audioRef.current.volume = isMuted ? 0 : volume;
            audioRef.current.playbackRate = playbackSpeed;
            
            audioRef.current.onended = () => {
              URL.revokeObjectURL(audioUrl);
              if (autoPlay && chapterIndex < currentStory.chapters.length - 1) {
                setCurrentChapter(chapterIndex + 1);
                setTimeout(() => playChapter(chapterIndex + 1), 1000);
              } else {
                setIsPlaying(false);
                if (chapterIndex === currentStory.chapters.length - 1) {
                  // Story completed - show confetti
                  confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 }
                  });
                }
              }
            };
            
            await audioRef.current.play();
            setIsPlaying(true);
          }
        }
      } else {
        // Use browser speech synthesis for free users
        const utterance = new SpeechSynthesisUtterance(chapter.content);
        utterance.rate = playbackSpeed;
        utterance.volume = isMuted ? 0 : volume;
        utterance.lang = language === 'zh' ? 'zh-CN' : language === 'es' ? 'es-ES' : 'en-US';
        
        utterance.onend = () => {
          if (autoPlay && chapterIndex < currentStory.chapters.length - 1) {
            setCurrentChapter(chapterIndex + 1);
            setTimeout(() => playChapter(chapterIndex + 1), 1000);
          } else {
            setIsPlaying(false);
            if (chapterIndex === currentStory.chapters.length - 1) {
              // Story completed - show confetti
              confetti({
                particleCount: 100,
                spread: 70,
                origin: { y: 0.6 }
              });
            }
          }
        };
        
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
      }

    } catch (error) {
      console.error('Failed to play chapter:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Navigate to next chapter
   */
  const nextChapter = () => {
    if (currentStory && currentChapter < currentStory.chapters.length - 1) {
      const newChapter = currentChapter + 1;
      setCurrentChapter(newChapter);
      setIsPlaying(false);
      
      if (autoPlay && voiceEnabled) {
        setTimeout(() => playChapter(newChapter), 500);
      }
    }
  };

  /**
   * Navigate to previous chapter
   */
  const previousChapter = () => {
    if (currentChapter > 0) {
      const newChapter = currentChapter - 1;
      setCurrentChapter(newChapter);
      setIsPlaying(false);
      
      if (autoPlay && voiceEnabled) {
        setTimeout(() => playChapter(newChapter), 500);
      }
    }
  };

  /**
   * Select story
   */
  const selectStory = (story: any) => {
    setCurrentStory(story);
    setCurrentChapter(0);
    setIsPlaying(false);
    setProgress(0);
  };

  /**
   * Generate new story (premium feature)
   */
  const generateNewStory = async () => {
    if (!isPremium) {
      alert('Story generation requires a premium subscription');
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await fetch('/.netlify/functions/narrative', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'generate_story',
          language: language,
          grade: 'kindergarten',
          theme: 'adventure'
        })
      });

      const result = await response.json();

      if (result.success && result.story) {
        setStories(prev => [result.story, ...prev]);
        setCurrentStory(result.story);
        setCurrentChapter(0);
        setIsPlaying(false);
        
        // Show success confetti
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

    } catch (error) {
      console.error('Failed to generate new story:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Get theme classes
   */
  const getThemeClasses = () => {
    const selectedTheme = themes.find(t => t.id === theme) || themes[0];
    const baseClasses = `min-h-screen bg-gradient-to-br ${selectedTheme.bg}`;
    
    if (highContrast) {
      return theme === 'dark' 
        ? 'min-h-screen bg-black text-white'
        : 'min-h-screen bg-white text-black';
    }
    
    return baseClasses;
  };

  /**
   * Get text color classes
   */
  const getTextClasses = () => {
    if (highContrast) {
      return theme === 'dark' ? 'text-white' : 'text-black';
    }
    
    return theme === 'dark' ? 'text-white' : 'text-gray-800';
  };

  // Save preferences when they change
  useEffect(() => {
    saveUserPreferences();
  }, [language, fontSize, theme, volume, playbackSpeed, autoPlay, showTranscript, voiceEnabled, highContrast, reducedMotion]);

  if (isLoading) {
    return (
      <div className={getThemeClasses()}>
        <div className="flex items-center justify-center min-h-screen">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Loader2 className={`animate-spin mx-auto mb-4 ${getTextClasses()}`} size={48} />
            <p className={`text-xl font-semibold ${getTextClasses()}`}>Loading Story Mode...</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className={getThemeClasses()}>
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <motion.button
                onClick={() => navigate('/play-learn')}
                className={`flex items-center ${getTextClasses()} hover:opacity-80 transition-opacity`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ArrowLeft className="mr-2" size={20} />
                Back
              </motion.button>

              <div className="flex items-center">
                <BookOpen className="mr-2 text-purple-600" size={24} />
                <h1 className={`text-xl font-bold ${getTextClasses()}`}>Story Mode</h1>
                {isPremium && (
                  <Crown className="ml-2 text-yellow-500" size={20} />
                )}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white/50 dark:bg-gray-800/50 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {languages.map(lang => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name}
                  </option>
                ))}
              </select>

              {/* Settings Button */}
              <motion.button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 bg-white/50 dark:bg-gray-800/50 rounded-lg hover:bg-white/70 dark:hover:bg-gray-700/70 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings size={20} />
              </motion.button>

              {/* Generate Story Button (Premium) */}
              {isPremium ? (
                <motion.button
                  onClick={generateNewStory}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Sparkles className="mr-2" size={16} />
                  New Story
                </motion.button>
              ) : (
                <motion.button
                  onClick={() => navigate('/play-learn')}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:shadow-lg transition-all flex items-center"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Crown className="mr-2" size={16} />
                  Upgrade
                </motion.button>
              )}
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
              <h3 className={`text-lg font-bold mb-4 ${getTextClasses()}`}>Story Settings</h3>
              
              <div className="space-y-4">
                {/* Font Size */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${getTextClasses()}`}>
                    Font Size: {fontSize}px
                  </label>
                  <input
                    type="range"
                    min="14"
                    max="24"
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Theme */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${getTextClasses()}`}>
                    Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {themes.map(themeOption => (
                      <button
                        key={themeOption.id}
                        onClick={() => setTheme(themeOption.id)}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                          theme === themeOption.id
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {themeOption.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Volume */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${getTextClasses()}`}>
                    Volume: {Math.round(volume * 100)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Playback Speed */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${getTextClasses()}`}>
                    Speed: {playbackSpeed}x
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={playbackSpeed}
                    onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={autoPlay}
                      onChange={(e) => setAutoPlay(e.target.checked)}
                      className="mr-2"
                    />
                    <span className={`text-sm ${getTextClasses()}`}>Auto-play chapters</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={showTranscript}
                      onChange={(e) => setShowTranscript(e.target.checked)}
                      className="mr-2"
                    />
                    <span className={`text-sm ${getTextClasses()}`}>Show transcript</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="mr-2"
                    />
                    <span className={`text-sm ${getTextClasses()}`}>Voice narration</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={highContrast}
                      onChange={(e) => setHighContrast(e.target.checked)}
                      className="mr-2"
                    />
                    <span className={`text-sm ${getTextClasses()}`}>High contrast</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={reducedMotion}
                      onChange={(e) => setReducedMotion(e.target.checked)}
                      className="mr-2"
                    />
                    <span className={`text-sm ${getTextClasses()}`}>Reduce motion</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-6 bg-purple-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-purple-700 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Story List */}
          <div className="lg:col-span-1">
            <h2 className={`text-xl font-bold mb-4 ${getTextClasses()}`}>Available Stories</h2>
            <div className="space-y-3">
              {stories.map((story, index) => (
                <motion.div
                  key={story.id}
                  className={`p-4 rounded-lg cursor-pointer transition-all ${
                    currentStory?.id === story.id
                      ? 'bg-purple-100 dark:bg-purple-900 border-2 border-purple-500'
                      : 'bg-white/50 dark:bg-gray-800/50 hover:bg-white/70 dark:hover:bg-gray-700/70 border border-gray-200 dark:border-gray-600'
                  }`}
                  onClick={() => selectStory(story)}
                  whileHover={{ scale: reducedMotion ? 1 : 1.02 }}
                  whileTap={{ scale: reducedMotion ? 1 : 0.98 }}
                >
                  <h3 className={`font-semibold mb-2 ${getTextClasses()}`}>{story.title}</h3>
                  <p className={`text-sm opacity-70 ${getTextClasses()}`}>
                    {story.content.substring(0, 100)}...
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                      {story.grade}
                    </span>
                    <div className="flex items-center">
                      {story.chapters && (
                        <span className={`text-xs ${getTextClasses()} opacity-70`}>
                          {story.chapters.length} chapters
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Story Reader */}
          <div className="lg:col-span-2">
            {currentStory ? (
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-6 shadow-lg">
                {/* Story Header */}
                <div className="mb-6">
                  <h1 className={`text-2xl font-bold mb-2 ${getTextClasses()}`}>
                    {currentStory.title}
                  </h1>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-3 py-1 rounded-full">
                        Chapter {currentChapter + 1} of {currentStory.chapters?.length || 1}
                      </span>
                      <span className={`text-sm ${getTextClasses()} opacity-70`}>
                        {currentStory.grade}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.button
                        onClick={() => setIsMuted(!isMuted)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                      </motion.button>
                      <motion.button
                        onClick={() => setShowTranscript(!showTranscript)}
                        className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        {showTranscript ? <Eye size={20} /> : <EyeOff size={20} />}
                      </motion.button>
                    </div>
                  </div>
                </div>

                {/* Story Content */}
                {showTranscript && currentStory.chapters && (
                  <div className="mb-6">
                    <h2 className={`text-lg font-semibold mb-3 ${getTextClasses()}`}>
                      {currentStory.chapters[currentChapter]?.title || `Chapter ${currentChapter + 1}`}
                    </h2>
                    <div 
                      className={`prose max-w-none ${getTextClasses()}`}
                      style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }}
                    >
                      {currentStory.chapters[currentChapter]?.content || currentStory.content}
                    </div>
                  </div>
                )}

                {/* Audio Player */}
                <audio ref={audioRef} className="hidden" />

                {/* Controls */}
                <div className="flex items-center justify-center space-x-4 mb-6">
                  <motion.button
                    onClick={previousChapter}
                    disabled={currentChapter === 0}
                    className="p-3 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: reducedMotion ? 1 : 1.1 }}
                    whileTap={{ scale: reducedMotion ? 1 : 0.9 }}
                  >
                    <SkipBack size={24} />
                  </motion.button>

                  <motion.button
                    onClick={togglePlayback}
                    disabled={!voiceEnabled}
                    className="p-4 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: reducedMotion ? 1 : 1.1 }}
                    whileTap={{ scale: reducedMotion ? 1 : 0.9 }}
                  >
                    {isPlaying ? <Pause size={32} /> : <Play size={32} />}
                  </motion.button>

                  <motion.button
                    onClick={nextChapter}
                    disabled={!currentStory.chapters || currentChapter >= currentStory.chapters.length - 1}
                    className="p-3 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: reducedMotion ? 1 : 1.1 }}
                    whileTap={{ scale: reducedMotion ? 1 : 0.9 }}
                  >
                    <SkipForward size={24} />
                  </motion.button>
                </div>

                {/* Progress Bar */}
                {currentStory.chapters && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className={getTextClasses()}>Progress</span>
                      <span className={getTextClasses()}>
                        {Math.round(((currentChapter + 1) / currentStory.chapters.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((currentChapter + 1) / currentStory.chapters.length) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Chapter Navigation */}
                {currentStory.chapters && currentStory.chapters.length > 1 && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {currentStory.chapters.map((chapter, index) => (
                      <motion.button
                        key={index}
                        onClick={() => {
                          setCurrentChapter(index);
                          setIsPlaying(false);
                        }}
                        className={`p-2 rounded-lg text-sm font-medium transition-colors ${
                          currentChapter === index
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                        whileHover={{ scale: reducedMotion ? 1 : 1.02 }}
                        whileTap={{ scale: reducedMotion ? 1 : 0.98 }}
                      >
                        {chapter.title || `Chapter ${index + 1}`}
                      </motion.button>
                    ))}
                  </div>
                )}

                {/* Premium Features Notice */}
                {!isPremium && (
                  <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center">
                      <Crown className="text-yellow-500 mr-3" size={24} />
                      <div>
                        <h4 className={`font-semibold ${getTextClasses()}`}>Unlock Premium Stories</h4>
                        <p className={`text-sm ${getTextClasses()} opacity-70`}>
                          Get access to AI-generated stories, premium voices, and unlimited content.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white/50 dark:bg-gray-800/50 rounded-2xl p-12 text-center">
                <BookOpen className={`mx-auto mb-4 ${getTextClasses()} opacity-50`} size={64} />
                <h2 className={`text-xl font-semibold mb-2 ${getTextClasses()}`}>Select a Story</h2>
                <p className={`${getTextClasses()} opacity-70`}>
                  Choose a story from the list to begin your reading adventure.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoryMode;