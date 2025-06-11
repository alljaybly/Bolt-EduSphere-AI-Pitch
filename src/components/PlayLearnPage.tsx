import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { 
  Puzzle, 
  Play, 
  Video, 
  Crown, 
  Lock, 
  X, 
  Check, 
  Star,
  Volume2,
  VideoIcon,
  Sparkles
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Paddle from '@paddle/paddle-js';
import { hasPremiumAccess, getSubscriptionStatus } from '../lib/revenuecat.js';

// Paddle configuration
const PADDLE_SELLER_ID = 32663;
const PADDLE_TOKEN = 'test_aee7f4c095b16ab3e6229322121';
const PADDLE_PRODUCT_ID = 'pro_01jxb5h104j9qfghpvj7dcew81';
const PADDLE_PRICE_ID = 'pri_01jxb5xwx1k258bgbytqe5r2vz';

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
  children, 
  isPremium = false 
}: { 
  id: string; 
  type: string; 
  children: React.ReactNode;
  isPremium?: boolean;
}) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.BLOCK,
    item: { id, type },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    canDrag: !isPremium, // Disable dragging for premium blocks if not subscribed
  }));

  return (
    <motion.div
      ref={!isPremium ? drag : undefined}
      className={`relative p-4 rounded-lg transition-all ${
        type === 'move' ? 'bg-blue-200' : 
        type === 'jump' ? 'bg-green-200' : 
        'bg-purple-200'
      } ${!isPremium ? 'cursor-move' : 'cursor-not-allowed opacity-60'}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
      whileHover={!isPremium ? { scale: 1.1 } : {}}
      whileTap={!isPremium ? { scale: 0.9 } : {}}
    >
      {isPremium && (
        <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-1">
          <Crown size={16} className="text-yellow-800" />
        </div>
      )}
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
 * Premium subscription modal component
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
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Premium feature gate component
 */
const PremiumGate = ({ 
  children, 
  onUpgradeClick 
}: { 
  children: React.ReactNode; 
  onUpgradeClick: () => void;
}) => {
  return (
    <div className="relative">
      <div className="filter blur-sm pointer-events-none">
        {children}
      </div>
      <div className="absolute inset-0 bg-black/20 flex items-center justify-center rounded-lg">
        <motion.button
          onClick={onUpgradeClick}
          className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-6 py-3 rounded-full font-semibold shadow-lg flex items-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Lock className="mr-2" size={20} />
          Unlock with Premium
        </motion.button>
      </div>
    </div>
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
  const [paddle, setPaddle] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<any>(null);

  // Sample content data
  const slides = [
    { 
      id: 1, 
      content: '🐘 Elephant (Gray)', 
      color: 'gray',
      narration: 'This is a big gray elephant!',
      isPremium: false
    },
    { 
      id: 2, 
      content: '🔴 Red Circle', 
      color: 'red',
      narration: 'Look at this beautiful red circle!',
      isPremium: true
    },
    { 
      id: 3, 
      content: '🔵 Blue Square', 
      color: 'blue',
      narration: 'Here we have a blue square shape!',
      isPremium: true
    }
  ];

  const videoTopics = [
    { 
      id: 1, 
      topic: 'Numbers 1-10', 
      emoji: '🔢',
      isPremium: false,
      videoUrl: 'https://example.com/numbers-video'
    },
    { 
      id: 2, 
      topic: 'Alphabet A-Z', 
      emoji: '📖',
      isPremium: true,
      videoUrl: 'https://example.com/alphabet-video'
    }
  ];

  const codingBlocks = [
    { id: 'move', type: 'move', text: 'Move Forward', isPremium: false },
    { id: 'jump', type: 'jump', text: 'Jump Block', isPremium: false },
    { id: 'loop', type: 'loop', text: 'Repeat Loop', isPremium: true },
    { id: 'condition', type: 'condition', text: 'If Statement', isPremium: true }
  ];

  /**
   * Initialize Paddle and check subscription status
   */
  useEffect(() => {
    const initializeServices = async () => {
      try {
        setIsLoading(true);

        // Initialize Paddle
        const paddleInstance = await Paddle.init({
          environment: 'sandbox', // Use 'production' for live
          seller: PADDLE_SELLER_ID,
          token: PADDLE_TOKEN,
        });

        if (paddleInstance) {
          setPaddle(paddleInstance);
          console.log('Paddle initialized successfully');
        }

        // Check subscription status via RevenueCat
        const premiumStatus = await hasPremiumAccess();
        const status = await getSubscriptionStatus();
        
        setIsPremium(premiumStatus);
        setSubscriptionStatus(status);
        
        console.log('Premium status:', premiumStatus);
        console.log('Subscription status:', status);

      } catch (error) {
        console.error('Failed to initialize services:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeServices();
  }, []);

  /**
   * Handle drop event for coding blocks
   */
  const handleDrop = (item: any) => {
    setDroppedItems((prev) => [...prev, item.type]);
  };

  /**
   * Handle premium upgrade via Paddle
   */
  const handleUpgrade = async () => {
    if (!paddle) {
      console.error('Paddle not initialized');
      return;
    }

    try {
      // Open Paddle checkout
      await paddle.Checkout.open({
        items: [
          {
            priceId: PADDLE_PRICE_ID,
            quantity: 1,
          },
        ],
        customer: {
          email: 'user@example.com', // This should come from user authentication
        },
        customData: {
          userId: 'current_user_id', // This should come from your auth system
        },
        settings: {
          displayMode: 'overlay',
          theme: 'light',
          locale: 'en',
        },
      });

      // Close the premium modal
      setShowPremiumModal(false);

      // Refresh subscription status after successful payment
      setTimeout(async () => {
        const premiumStatus = await hasPremiumAccess();
        const status = await getSubscriptionStatus();
        setIsPremium(premiumStatus);
        setSubscriptionStatus(status);
      }, 2000);

    } catch (error) {
      console.error('Upgrade failed:', error);
    }
  };

  /**
   * Handle ElevenLabs narration (Premium feature)
   */
  const handleNarration = async (text: string) => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    try {
      // Simulate ElevenLabs API call
      console.log('Playing narration:', text);
      
      // In a real implementation, you would:
      // 1. Call ElevenLabs API to generate audio
      // 2. Play the generated audio
      // 3. Handle loading states and errors
      
      // For now, use browser's speech synthesis as fallback
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.8;
      utterance.pitch = 1.2;
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Narration failed:', error);
    }
  };

  /**
   * Handle Tavus video generation (Premium feature)
   */
  const handleVideoGeneration = async (topic: string) => {
    if (!isPremium) {
      setShowPremiumModal(true);
      return;
    }

    try {
      // Simulate Tavus API call
      console.log('Generating video for topic:', topic);
      
      // In a real implementation, you would:
      // 1. Call Tavus API to generate personalized video
      // 2. Handle video processing status
      // 3. Display the generated video when ready
      
      alert(`Generating personalized video for: ${topic}\n(This is a demo - real video generation would happen here)`);
      
    } catch (error) {
      console.error('Video generation failed:', error);
    }
  };

  /**
   * Show loading state while initializing
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
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/')}
        >
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
              <Star className="mr-2" size={20} />
              <span className="font-semibold">Upgrade to Premium</span>
            </motion.button>
          )}
        </div>
      </div>

      <h1 className="font-serif text-4xl text-blue-800 text-center mb-8">Play & Learn</h1>

      {/* Picture Slides Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg mb-8"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="font-serif text-2xl text-green-700 mb-6 flex items-center">
          <Puzzle size={24} className="mr-2" /> Picture Slides
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {slides.map((slide) => (
            <div key={slide.id} className="relative">
              {slide.isPremium && !isPremium ? (
                <PremiumGate onUpgradeClick={() => setShowPremiumModal(true)}>
                  <SlideCard slide={slide} onNarration={handleNarration} />
                </PremiumGate>
              ) : (
                <SlideCard slide={slide} onNarration={handleNarration} />
              )}
            </div>
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
            <div key={topic.id} className="relative">
              {topic.isPremium && !isPremium ? (
                <PremiumGate onUpgradeClick={() => setShowPremiumModal(true)}>
                  <VideoCard topic={topic} onVideoGeneration={handleVideoGeneration} />
                </PremiumGate>
              ) : (
                <VideoCard topic={topic} onVideoGeneration={handleVideoGeneration} />
              )}
            </div>
          ))}
        </div>
      </motion.section>

      {/* Drag & Drop Coding Section */}
      <motion.section
        className="bg-white p-6 rounded-lg shadow-lg"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
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
                    isPremium={block.isPremium && !isPremium}
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