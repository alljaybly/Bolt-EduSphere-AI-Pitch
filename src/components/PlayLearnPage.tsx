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
  Lock
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';

// Drag and drop types
const ItemTypes = {
  BLOCK: 'block'
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
const DropZone = ({ onDrop }: { onDrop: (item: any) => void }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.BLOCK,
    drop: (item) => onDrop(item),
    collect: (monitor) => ({ isOver: monitor.isOver() })
  }));

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
        Drop blocks here to build your game!
      </p>
    </motion.div>
  );
};

/**
 * Claude Sonnet 4 Content Generator Component
 * Allows teachers/parents to generate educational content using AI
 */
const ContentGenerator = ({ 
  isPremium, 
  onUpgradeClick 
}: { 
  isPremium: boolean; 
  onUpgradeClick: () => void;
}) => {
  const [prompt, setPrompt] = useState('');
  const [contentType, setContentType] = useState('problems');
  const [grade, setGrade] = useState('kindergarten');
  const [subject, setSubject] = useState('math');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const contentTypes = [
    { id: 'problems', name: 'Practice Problems', icon: <BookOpen size={16} /> },
    { id: 'narration', name: 'Narration Scripts', icon: <Volume2 size={16} /> },
    { id: 'video', name: 'Video Scripts', icon: <VideoIcon size={16} /> },
    { id: 'exam', name: 'Mock Exams', icon: <GraduationCap size={16} /> }
  ];

  const grades = [
    { id: 'kindergarten', name: 'Kindergarten' },
    { id: 'grade1-6', name: 'Grades 1-6' },
    { id: 'grade7-9', name: 'Grades 7-9' },
    { id: 'grade10-12', name: 'Grades 10-12' },
    { id: 'matric', name: 'Matric' }
  ];

  const subjects = [
    { id: 'math', name: 'Mathematics' },
    { id: 'physics', name: 'Physics' },
    { id: 'science', name: 'Science' },
    { id: 'english', name: 'English' },
    { id: 'history', name: 'History' },
    { id: 'geography', name: 'Geography' },
    { id: 'coding', name: 'Coding' }
  ];

  /**
   * Generate educational content using Claude Sonnet 4
   */
  const generateContent = async () => {
    if (!isPremium) {
      onUpgradeClick();
      return;
    }

    if (!prompt.trim()) {
      setError('Please enter a prompt for content generation');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedContent(null);

    try {
      const userId = getCurrentUserId();
      
      // Call Claude Sonnet 4 via our backend function
      const response = await fetch('/.netlify/functions/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          content_type: contentType,
          grade,
          subject,
          user_id: userId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to generate content');
      }

      if (result.success) {
        setGeneratedContent(result.content);
        
        // Store in Neon database via manageProblems function
        await fetch('/.netlify/functions/manageProblems', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-User-ID': userId
          },
          body: JSON.stringify({
            action: 'store_generated_content',
            prompt: prompt.trim(),
            content_type: contentType,
            content: result.content,
            grade,
            subject,
            user_id: userId
          })
        });

        console.log('Content generated and stored successfully');
      } else {
        throw new Error(result.message || 'Content generation failed');
      }

    } catch (error) {
      console.error('Content generation error:', error);
      setError(error.message || 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  if (!isPremium) {
    return (
      <div className="relative">
        <div className="filter blur-sm pointer-events-none">
          <ContentGeneratorForm />
        </div>
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
          <motion.button
            onClick={onUpgradeClick}
            className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Lock className="mr-2" size={20} />
            Unlock AI Content Generator
          </motion.button>
        </div>
      </div>
    );
  }

  function ContentGeneratorForm() {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-gradient-to-r from-purple-500 to-blue-500 p-2 rounded-full mr-3">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">AI Content Generator</h3>
              <p className="text-sm text-gray-600">Powered by Claude Sonnet 4</p>
            </div>
          </div>
          {isPremium && (
            <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm">
              <Crown className="mr-1" size={14} />
              Premium
            </div>
          )}
        </div>

        {/* Content Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Content Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {contentTypes.map((type) => (
              <motion.button
                key={type.id}
                onClick={() => setContentType(type.id)}
                className={`flex items-center p-3 rounded-lg border transition-colors ${
                  contentType === type.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {type.icon}
                <span className="ml-2 text-sm font-medium">{type.name}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Grade and Subject Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade Level
            </label>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {grades.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Prompt Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Describe what you want to create
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Example: "Create 5 ${contentType} about fractions for ${grade} students that focus on real-world applications like cooking and shopping"`}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            maxLength={1000}
          />
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">
              {prompt.length}/1000 characters
            </span>
            <span className="text-xs text-gray-500">
              Be specific for better results
            </span>
          </div>
        </div>

        {/* Generate Button */}
        <motion.button
          onClick={generateContent}
          disabled={isGenerating || !prompt.trim()}
          className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center transition-colors ${
            isGenerating || !prompt.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700'
          }`}
          whileHover={!isGenerating && prompt.trim() ? { scale: 1.02 } : {}}
          whileTap={!isGenerating && prompt.trim() ? { scale: 0.98 } : {}}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin mr-2" size={20} />
              Generating with Claude Sonnet 4...
            </>
          ) : (
            <>
              <Send className="mr-2" size={20} />
              Generate Content
            </>
          )}
        </motion.button>

        {/* Error Display */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-red-700 text-sm">{error}</p>
          </motion.div>
        )}

        {/* Generated Content Display */}
        {generatedContent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center mb-3">
              <Check className="text-green-600 mr-2" size={20} />
              <h4 className="font-semibold text-green-800">Content Generated Successfully!</h4>
            </div>
            
            <div className="bg-white p-3 rounded border max-h-60 overflow-y-auto">
              <pre className="whitespace-pre-wrap text-sm text-gray-700">
                {typeof generatedContent === 'string' 
                  ? generatedContent 
                  : JSON.stringify(generatedContent, null, 2)}
              </pre>
            </div>
            
            <div className="mt-3 flex gap-2">
              <motion.button
                onClick={() => navigator.clipboard.writeText(
                  typeof generatedContent === 'string' 
                    ? generatedContent 
                    : JSON.stringify(generatedContent, null, 2)
                )}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Copy to Clipboard
              </motion.button>
              
              <motion.button
                onClick={() => setGeneratedContent(null)}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Clear
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  return <ContentGeneratorForm />;
};

/**
 * Premium Modal Component
 */
const PremiumModal = ({ 
  isOpen, 
  onClose, 
  onUpgrade 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onUpgrade: () => void;
}) => {
  if (!isOpen) return null;

  const premiumFeatures = [
    'AI content generation with Claude Sonnet 4',
    'AI-powered narration with ElevenLabs',
    'Interactive video content with Tavus',
    'Advanced coding blocks and challenges',
    'Unlimited access to all learning materials',
    'Progress tracking and analytics',
    'Ad-free learning experience'
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
          className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl"
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
            <ul className="space-y-3">
              {premiumFeatures.map((feature, index) => (
                <motion.li
                  key={index}
                  className="flex items-center"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="bg-green-100 rounded-full p-1 mr-3">
                    <Check className="text-green-600" size={16} />
                  </div>
                  <span className="text-gray-700">{feature}</span>
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
                Upgrade to Premium
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
 * Main PlayLearnPage component
 */
const PlayLearnPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [droppedItems, setDroppedItems] = useState<string[]>([]);
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Sample content data
  const slides = [
    { 
      id: 1, 
      content: '🐘 Elephant (Gray)', 
      color: 'gray',
      narration: 'This is a big gray elephant!'
    },
    { 
      id: 2, 
      content: '🔴 Red Circle', 
      color: 'red',
      narration: 'Look at this beautiful red circle!'
    },
    { 
      id: 3, 
      content: '🔵 Blue Square', 
      color: 'blue',
      narration: 'Here we have a blue square shape!'
    }
  ];

  const videoTopics = [
    { 
      id: 1, 
      topic: 'Numbers 1-10', 
      emoji: '🔢',
      videoUrl: 'https://example.com/numbers-video'
    },
    { 
      id: 2, 
      topic: 'Alphabet A-Z', 
      emoji: '📖',
      videoUrl: 'https://example.com/alphabet-video'
    }
  ];

  const codingBlocks = [
    { id: 'move', type: 'move', text: 'Move Forward' },
    { id: 'jump', type: 'jump', text: 'Jump Block' },
    { id: 'loop', type: 'loop', text: 'Repeat Loop' },
    { id: 'condition', type: 'condition', text: 'If Statement' }
  ];

  /**
   * Initialize premium status check using secure backend function
   */
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        setIsLoading(true);
        
        // Use the updated hasPremiumAccess function that calls backend
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);
        
        console.log('Premium status checked via backend:', premiumStatus);
      } catch (error) {
        console.error('Failed to check premium status:', error);
        setIsPremium(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkPremiumStatus();
  }, []);

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
   * Handle narration using browser's speech synthesis
   */
  const handleNarration = (text: string) => {
    try {
      // Use browser's speech synthesis as a simple solution
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      utterance.volume = 0.8;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis failed:', error);
      alert(`Would say: "${text}"`);
    }
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
      {/* Header with back button and premium status */}
      <div className="flex justify-between items-center mb-6">
        <motion.button
          className="flex items-center bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="mr-2" size={20} />
          Back to Book
        </motion.button>

        {/* Premium status indicator */}
        <div className="flex items-center space-x-4">
          {isPremium ? (
            <div className="flex items-center bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-4 py-2 rounded-full">
              <Crown className="mr-2" size={20} />
              <span className="font-semibold">Premium Active</span>
            </div>
          ) : (
            <motion.button
              onClick={() => setShowPremiumModal(true)}
              className="flex items-center bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full hover:shadow-lg transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Sparkles className="mr-2" size={20} />
              <span className="font-semibold">Upgrade to Premium</span>
            </motion.button>
          )}
        </div>
      </div>

      <h1 className="font-serif text-4xl text-blue-800 text-center mb-8">Play & Learn</h1>

      {/* AI Content Generator Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Sparkles size={24} className="mr-2" /> AI Content Generator
        </h2>
        
        <ContentGenerator 
          isPremium={isPremium} 
          onUpgradeClick={() => setShowPremiumModal(true)} 
        />
      </motion.section>

      {/* Picture Slides Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Puzzle size={24} className="mr-2" /> Picture Slides
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slides.map((slide) => (
            <SlideCard 
              key={slide.id} 
              slide={slide} 
              onNarration={handleNarration} 
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
          <Video size={24} className="mr-2" /> Learning Videos
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videoTopics.map((topic) => (
            <VideoCard 
              key={topic.id} 
              topic={topic} 
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
          <Play size={24} className="mr-2" /> Drag & Drop Coding
        </h2>
        
        <DndProvider backend={HTML5Backend}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coding blocks */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Blocks:</h3>
              <div className="grid grid-cols-2 gap-4">
                {codingBlocks.map((block) => (
                  <DragBlock 
                    key={block.id} 
                    id={block.id} 
                    type={block.type}
                  >
                    {block.text}
                  </DragBlock>
                ))}
              </div>
            </div>

            {/* Drop zone */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Build Your Program:</h3>
              <DropZone onDrop={handleDrop} />
              
              {droppedItems.length > 0 && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                  <h4 className="font-semibold mb-2">Your Program:</h4>
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
                    Clear Program
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
      />
    </div>
  );
};

/**
 * Individual slide card component
 */
const SlideCard = ({ 
  slide, 
  onNarration 
}: { 
  slide: any; 
  onNarration: (text: string) => void;
}) => (
  <motion.div
    className={`bg-${slide.color}-200 p-6 rounded-lg text-center relative overflow-hidden`}
    animate={{ rotate: [0, 2, -2, 0], transition: { duration: 4, repeat: Infinity } }}
    whileHover={{ scale: 1.05 }}
  >
    <p className="font-bold text-lg mb-4">{slide.content}</p>
    <motion.button
      onClick={() => onNarration(slide.narration)}
      className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <Volume2 size={16} className="mr-2" />
      <span className="text-sm font-medium">Listen</span>
    </motion.button>
  </motion.div>
);

/**
 * Individual video card component
 */
const VideoCard = ({ 
  topic, 
  onVideoGeneration 
}: { 
  topic: any; 
  onVideoGeneration: (topic: string) => void;
}) => (
  <motion.div
    className="bg-purple-200 p-6 rounded-lg text-center relative overflow-hidden"
    animate={{ y: [0, -5, 0], transition: { duration: 3, repeat: Infinity } }}
    whileHover={{ scale: 1.05 }}
  >
    <div className="text-4xl mb-4">{topic.emoji}</div>
    <p className="font-bold text-lg mb-4">{topic.topic}</p>
    <motion.button
      onClick={() => onVideoGeneration(topic.topic)}
      className="flex items-center justify-center mx-auto bg-white/80 hover:bg-white px-4 py-2 rounded-full transition-colors"
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
    >
      <VideoIcon size={16} className="mr-2" />
      <span className="text-sm font-medium">Generate Video</span>
    </motion.button>
  </motion.div>
);

export default PlayLearnPage;