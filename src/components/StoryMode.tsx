
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
   import { getCurrentUserId } from '../lib/authUtils';
   import { supabase } from '../lib/supabase';
   import confetti from 'canvas-confetti';

   const StoryMode: React.FC = () => {
     const navigate = useNavigate();
     const audioRef = useRef<HTMLAudioElement>(null);
     
     // State management
     const [isLoading, setIsLoading] = useState(true);
     const [currentStory, setCurrentStory] = useState<any>(null);
     const [stories, setStories] = useState<any[]>([]);
     const [isPlaying, setIsPlaying] = useState(false);
     const [currentChapter, setCurrentChapter] = useState(0);
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
     const audioUrlRef = useRef<string | null>(null);

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
           await loadStories();
           loadUserPreferences();
         } catch (error) {
           console.error('Failed to initialize story mode:', error);
           Sentry.captureException(error);
         } finally {
           setIsLoading(false);
         }
       };

       initializeStoryMode();

       return () => {
         if (audioRef.current) {
           audioRef.current.pause();
           audioRef.current.src = '';
         }
         if (audioUrlRef.current) {
           URL.revokeObjectURL(audioUrlRef.current);
           audioUrlRef.current = null;
         }
         window.speechSynthesis.cancel();
       };
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

         if (!response.ok) {
           throw new Error(`HTTP error: ${response.status}`);
         }

         const result = await response.json();

         if (result.success && result.stories.length > 0) {
           setStories(result.stories);
           setCurrentStory(result.stories[0]);
         } else {
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
           if (audioRef.current) {
             audioRef.current.pause();
             audioRef.current.src = '';
           }
           window.speechSynthesis.cancel();
           setIsPlaying(false);
         } else {
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

         if (audioRef.current) {
           audioRef.current.pause();
           audioRef.current.src = '';
         }
         if (audioUrlRef.current) {
           URL.revokeObjectURL(audioUrlRef.current);
           audioUrlRef.current = null;
         }
         window.speechSynthesis.cancel();

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
     };

     /**
      * Generate new story
      */
     const generateNewStory = async () => {
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
             language,
             grade: 'kindergarten'
           })
         });

         if (!response.ok) {
           throw new Error(`HTTP error: ${response.status}`);
         }

         const result = await response.json();

         if (result.success) {
           const newStory = result.story;
           setStories(prev => [...prev, newStory]);
           setCurrentStory(newStory);
           setCurrentChapter(0);
           setIsPlaying(false);
         }

       } catch (error) {
         console.error('Failed to generate story:', error);
         Sentry.captureException(error);
         alert('Failed to generate new story. Please try again.');
       } finally {
         setIsLoading(false);
       }
     };

     /**
      * Share story
      */
     const shareStory = async () => {
       if (!currentStory) return;

       const shareUrl = `${window.location.origin}/story-mode?story=${currentStory.story_id}`;
       
       try {
         await navigator.clipboard.writeText(shareUrl);
         alert('Story link copied to clipboard!');
       } catch (error) {
         console.error('Failed to copy to clipboard:', error);
         alert(`Share this link: ${shareUrl}`);
       }
     };

     /**
      * Download story
      */
     const downloadStory = () => {
       if (!currentStory) return;

       const content = currentStory.chapters.map((chapter: any, index: number) => (
         `# Chapter ${index + 1}: ${chapter.title}\n\n${chapter.content}\n\n`
       )).join('');

       const blob = new Blob([content], { type: 'text/plain' });
       const url = URL.createObjectURL(blob);
       const a = document.createElement('a');
       a.href = url;
       a.download = `${currentStory.title}.txt`;
       document.body.appendChild(a);
       a.click();
       document.body.removeChild(a);
       URL.revokeObjectURL(url);
     };

     if (isLoading) {
       return (
         <div className={`min-h-screen bg-gradient-to-br ${themes.find(t => t.id === theme)?.bg || 'from-blue-50 to-indigo-100'} flex items-center justify-center`}>
           <motion.div
             className="text-center"
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             transition={reducedMotion ? {} : { duration: 0.5 }}
           >
             <Loader2 className="animate-spin mx-auto mb-4 text-blue-600" size={48} />
             <p className="text-xl font-semibold text-blue-800">Loading Story Mode...</p>
           </motion.div>
         </div>
       );
     }

     return (
       <div className={`min-h-screen bg-gradient-to-br ${themes.find(t => t.id === theme)?.bg || 'from-blue-50 to-indigo-100'} p-6 ${highContrast ? 'high-contrast' : ''}`}>
         <div className="max-w-4xl mx-auto">
           {/* Header */}
           <motion.div
             className="flex items-center justify-between mb-8"
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={reducedMotion ? {} : { duration: 0.5 }}
           >
             <div className="flex items-center space-x-4">
               <motion.button
                 onClick={() => navigate('/play-learn')}
                 className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
                 whileHover={reducedMotion ? {} : { scale: 1.05 }}
                 whileTap={reducedMotion ? {} : { scale: 0.95 }}
               >
                 <ArrowLeft className="mr-2" size={20} />
                 Back
               </motion.button>

               <div className="flex items-center">
                 <BookOpen className="mr-2 text-blue-600" size={28} />
                 <h1 className="text-2xl font-bold text-gray-800">Story Mode</h1>
               </div>
             </div>

             <div className="flex items-center space-x-3">
               <motion.button
                 onClick={shareStory}
                 className="p-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                 whileHover={reducedMotion ? {} : { scale: 1.05 }}
                 whileTap={reducedMotion ? {} : { scale: 0.95 }}
               >
                 <Share2 size={20} />
               </motion.button>
               <motion.button
                 onClick={downloadStory}
                 className="p-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                 whileHover={reducedMotion ? {} : { scale: 1.05 }}
                 whileTap={reducedMotion ? {} : { scale: 0.95 }}
               >
                 <Download size={20} />
               </motion.button>
               <motion.button
                 onClick={() => setShowSettings(true)}
                 className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                 whileHover={reducedMotion ? {} : { scale: 1.05 }}
                 whileTap={reducedMotion ? {} : { scale: 0.95 }}
               >
                 <Settings size={20} />
               </motion.button>
             </div>
           </motion.div>

           {/* Story Selection */}
           <div className="mb-8">
             <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Stories</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {stories.map((story) => (
                 <motion.div
                   key={story.id}
                   className={`p-4 rounded-lg cursor-pointer transition-colors ${
                     currentStory?.id === story.id ? 'bg-blue-100' : 'bg-white hover:bg-gray-50'
                   } ${highContrast ? 'border-2 border-black' : 'shadow-lg'}`}
                   onClick={() => selectStory(story)}
                   whileHover={reducedMotion ? {} : { scale: 1.02 }}
                   whileTap={reducedMotion ? {} : { scale: 0.98 }}
                 >
                   <div className="flex items-center justify-between">
                     <div>
                       <h3 className="text-lg font-medium text-gray-800">{story.title}</h3>
                       <p className="text-sm text-gray-600">Grade: {story.grade}</p>
                       <p className="text-sm text-gray-600">
                         Language: {languages.find(lang => lang.code === story.language)?.name || story.language}
                       </p>
                     </div>
                     <Star className="text-yellow-400" size={20} />
                   </div>
                 </motion.div>
               ))}
             </div>
             <motion.button
               onClick={generateNewStory}
               className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg font-medium flex items-center"
               whileHover={reducedMotion ? {} : { scale: 1.05 }}
               whileTap={reducedMotion ? {} : { scale: 0.95 }}
             >
               <Sparkles className="mr-2" size={16} />
               Generate New Story
             </motion.button>
           </div>

           {/* Current Story */}
           {currentStory && (
             <div className="bg-white rounded-2xl shadow-xl p-8">
               <motion.div
                 key={currentStory.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 transition={reducedMotion ? {} : { duration: 0.5 }}
               >
                 <h2 className="text-2xl font-bold text-gray-800 mb-4">{currentStory.title}</h2>
                 {currentStory.chapters && currentStory.chapters[currentChapter] && (
                   <>
                     <h3 className="text-xl font-semibold text-gray-700 mb-4">
                       Chapter {currentChapter + 1}: {currentStory.chapters[currentChapter].title}
                     </h3>
                     {showTranscript && (
                       <p className="text-gray-600 text-lg" style={{ fontSize: `${fontSize}px` }}>
                         {currentStory.chapters[currentChapter].content}
                       </p>
                     )}
                   </>
                 )}
               </motion.div>
             </div>
           )}
         </div>
       </div>
     );
   };

   export default StoryMode;
   