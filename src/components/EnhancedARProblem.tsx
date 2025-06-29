import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  Camera, 
  Box, 
  RotateCcw, 
  ArrowLeft, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Settings,
  HelpCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Crown,
  Lock,
  Zap,
  Eye,
  EyeOff,
  Maximize,
  Minimize,
  Lightbulb,
  Target,
  Award,
  Sparkles,
  Layers,
  Move3D,
  RotateCw,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Palette,
  Mic,
  MicOff,
  Brain,
  Gamepad2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

/**
 * Enhanced AR Problem Component
 * Advanced WebXR-based augmented reality problem solving with improved features
 * Includes gesture recognition, voice commands, and adaptive difficulty
 */
const EnhancedARProblem: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const recognitionRef = useRef<any>(null);
  
  // State management
  const [isARSupported, setIsARSupported] = useState(false);
  const [isARActive, setIsARActive] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentProblem, setCurrentProblem] = useState<any>(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showHint, setShowHint] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [isListening, setIsListening] = useState(false);
  
  // AR Settings
  const [arSettings, setArSettings] = useState({
    showGrid: true,
    showLabels: true,
    soundEnabled: true,
    brightness: 1.0,
    objectScale: 1.0,
    rotationSpeed: 1.0,
    showWireframe: false,
    enablePhysics: true,
    enableGestures: true,
    voiceCommands: true,
    adaptiveDifficulty: true,
    showHints: true,
    animationSpeed: 1.0
  });

  // 3D Object state
  const [objectState, setObjectState] = useState({
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: 1.0,
    color: '#3B82F6',
    wireframe: false,
    animation: 'idle'
  });

  // Gesture recognition
  const [gestureState, setGestureState] = useState({
    isTracking: false,
    currentGesture: null,
    confidence: 0,
    handPosition: { x: 0, y: 0 }
  });

  /**
   * Initialize Enhanced AR
   */
  useEffect(() => {
    const initializeEnhancedAR = async () => {
      try {
        setIsLoading(true);
        
        // Check premium access
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);

        // Check WebXR and camera support
        await checkARCapabilities();
        
        // Initialize speech recognition
        initializeSpeechRecognition();
        
        // Load AR problems
        await loadEnhancedARProblems();

        // Initialize gesture recognition
        if (arSettings.enableGestures) {
          initializeGestureRecognition();
        }

      } catch (error) {
        console.error('Failed to initialize Enhanced AR:', error);
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeEnhancedAR();
  }, []);

  /**
   * Check AR capabilities
   */
  const checkARCapabilities = async () => {
    try {
      // Check WebXR support
      if ('xr' in navigator) {
        const isSupported = await navigator.xr?.isSessionSupported('immersive-ar');
        setIsARSupported(!!isSupported);
      } else {
        setIsARSupported(false);
      }

      // Check camera permission
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              facingMode: 'environment',
              width: { ideal: 1280 },
              height: { ideal: 720 }
            } 
          });
          setCameraPermission('granted');
          stream.getTracks().forEach(track => track.stop());
        } catch (error) {
          setCameraPermission('denied');
        }
      }
    } catch (error) {
      console.error('Failed to check AR capabilities:', error);
    }
  };

  /**
   * Initialize speech recognition for voice commands
   */
  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'en-US';
      
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        handleVoiceCommand(transcript);
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };
      
      recognitionRef.current.onend = () => {
        if (arSettings.voiceCommands && isARActive) {
          // Restart recognition for continuous listening
          setTimeout(() => {
            if (recognitionRef.current && arSettings.voiceCommands) {
              recognitionRef.current.start();
            }
          }, 1000);
        }
      };
    }
  };

  /**
   * Handle voice commands
   */
  const handleVoiceCommand = (command: string) => {
    console.log('Voice command:', command);
    
    if (command.includes('rotate')) {
      rotateObject();
    } else if (command.includes('zoom in')) {
      zoomObject(1.2);
    } else if (command.includes('zoom out')) {
      zoomObject(0.8);
    } else if (command.includes('reset')) {
      resetObject();
    } else if (command.includes('hint')) {
      setShowHint(true);
    } else if (command.includes('answer')) {
      // Extract number from voice command
      const numbers = command.match(/\d+/g);
      if (numbers && numbers.length > 0) {
        setUserAnswer(numbers[0]);
        checkAnswer(numbers[0]);
      }
    } else if (command.includes('next')) {
      loadNextProblem();
    }
  };

  /**
   * Initialize gesture recognition
   */
  const initializeGestureRecognition = () => {
    // Simplified gesture recognition using mouse/touch events
    // In a real implementation, you'd use MediaPipe or similar
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isTracking = false;
    let lastPosition = { x: 0, y: 0 };

    const handleStart = (e: MouseEvent | TouchEvent) => {
      isTracking = true;
      const pos = getEventPosition(e);
      lastPosition = pos;
      setGestureState(prev => ({ ...prev, isTracking: true, handPosition: pos }));
    };

    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isTracking) return;
      
      const pos = getEventPosition(e);
      const deltaX = pos.x - lastPosition.x;
      const deltaY = pos.y - lastPosition.y;
      
      // Detect gesture patterns
      if (Math.abs(deltaX) > 50) {
        if (deltaX > 0) {
          handleGesture('swipe_right');
        } else {
          handleGesture('swipe_left');
        }
      }
      
      if (Math.abs(deltaY) > 50) {
        if (deltaY > 0) {
          handleGesture('swipe_down');
        } else {
          handleGesture('swipe_up');
        }
      }
      
      lastPosition = pos;
      setGestureState(prev => ({ ...prev, handPosition: pos }));
    };

    const handleEnd = () => {
      isTracking = false;
      setGestureState(prev => ({ ...prev, isTracking: false }));
    };

    const getEventPosition = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      return {
        x: clientX - rect.left,
        y: clientY - rect.top
      };
    };

    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);

    return () => {
      canvas.removeEventListener('mousedown', handleStart);
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseup', handleEnd);
      canvas.removeEventListener('touchstart', handleStart);
      canvas.removeEventListener('touchmove', handleMove);
      canvas.removeEventListener('touchend', handleEnd);
    };
  };

  /**
   * Handle gesture commands
   */
  const handleGesture = (gesture: string) => {
    console.log('Gesture detected:', gesture);
    
    switch (gesture) {
      case 'swipe_left':
        rotateObject('left');
        break;
      case 'swipe_right':
        rotateObject('right');
        break;
      case 'swipe_up':
        zoomObject(1.1);
        break;
      case 'swipe_down':
        zoomObject(0.9);
        break;
    }
    
    setGestureState(prev => ({ ...prev, currentGesture: gesture, confidence: 0.8 }));
    
    // Clear gesture after delay
    setTimeout(() => {
      setGestureState(prev => ({ ...prev, currentGesture: null }));
    }, 1000);
  };

  /**
   * Load enhanced AR problems
   */
  const loadEnhancedARProblems = async () => {
    try {
      const response = await fetch('/.netlify/functions/arProblems', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        }
      });

      const result = await response.json();

      if (result.success && result.problems.length > 0) {
        // Filter problems by current level if adaptive difficulty is enabled
        let availableProblems = result.problems;
        
        if (arSettings.adaptiveDifficulty) {
          const difficultyMap = { 1: 'easy', 2: 'medium', 3: 'hard' };
          const targetDifficulty = difficultyMap[Math.min(level, 3) as keyof typeof difficultyMap];
          availableProblems = result.problems.filter((p: any) => p.difficulty === targetDifficulty);
        }
        
        const randomProblem = availableProblems[Math.floor(Math.random() * availableProblems.length)];
        setCurrentProblem(randomProblem);
      } else {
        // Enhanced fallback problems
        const enhancedProblems = [
          {
            id: 'enhanced_cube_1',
            object_type: 'cube',
            question: 'How many faces does this rotating cube have?',
            answer: '6',
            hint: 'Count each flat surface as the cube rotates',
            difficulty: 'easy',
            level: 1,
            interactions: ['rotate', 'zoom'],
            animations: ['rotation', 'pulse']
          },
          {
            id: 'enhanced_sphere_1',
            object_type: 'sphere',
            question: 'What is the surface area formula for this sphere if radius = 2?',
            answer: '50.27',
            hint: 'Surface area = 4πr²',
            difficulty: 'medium',
            level: 2,
            interactions: ['scale', 'color'],
            animations: ['bounce', 'glow']
          },
          {
            id: 'enhanced_pyramid_1',
            object_type: 'pyramid',
            question: 'If this pyramid has a square base with side length 4 and height 6, what is its volume?',
            answer: '32',
            hint: 'Volume = (1/3) × base area × height',
            difficulty: 'hard',
            level: 3,
            interactions: ['wireframe', 'explode'],
            animations: ['construction', 'deconstruction']
          }
        ];
        
        const levelAppropriate = enhancedProblems.filter(p => p.level <= level);
        const randomProblem = levelAppropriate[Math.floor(Math.random() * levelAppropriate.length)];
        setCurrentProblem(randomProblem);
      }
    } catch (error) {
      console.error('Failed to load enhanced AR problems:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Start enhanced AR session
   */
  const startEnhancedARSession = async () => {
    if (!isPremium) {
      alert('Enhanced AR Problems require a premium subscription');
      return;
    }

    if (!isARSupported) {
      alert('AR is not supported on this device');
      return;
    }

    try {
      setIsLoading(true);

      // Request camera access with enhanced settings
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      setIsARActive(true);
      
      // Start voice commands if enabled
      if (arSettings.voiceCommands && recognitionRef.current) {
        setIsListening(true);
        recognitionRef.current.start();
      }
      
      // Start enhanced AR rendering
      startEnhancedARRendering();

    } catch (error) {
      console.error('Failed to start enhanced AR session:', error);
      Sentry.captureException(error);
      alert('Failed to start AR session. Please check camera permissions.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Stop enhanced AR session
   */
  const stopEnhancedARSession = () => {
    setIsARActive(false);
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  /**
   * Start enhanced AR rendering loop
   */
  const startEnhancedARRendering = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;
    let startTime = Date.now();

    const render = () => {
      if (!isARActive) return;

      const currentTime = Date.now();
      const deltaTime = (currentTime - startTime) / 1000;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply brightness filter
      ctx.filter = `brightness(${arSettings.brightness})`;

      // Draw video feed
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Reset filter
      ctx.filter = 'none';

      // Draw enhanced AR overlays
      drawEnhancedAROverlays(ctx, deltaTime);

      // Continue rendering
      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  };

  /**
   * Draw enhanced AR overlays
   */
  const drawEnhancedAROverlays = (ctx: CanvasRenderingContext2D, deltaTime: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentProblem) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Update object animation
    updateObjectAnimation(deltaTime);

    // Draw 3D object with enhancements
    if (currentProblem.object_type === 'cube') {
      drawEnhancedCube(ctx, centerX, centerY, 120 * arSettings.objectScale);
    } else if (currentProblem.object_type === 'sphere') {
      drawEnhancedSphere(ctx, centerX, centerY, 80 * arSettings.objectScale);
    } else if (currentProblem.object_type === 'pyramid') {
      drawEnhancedPyramid(ctx, centerX, centerY, 100 * arSettings.objectScale);
    }

    // Draw grid if enabled
    if (arSettings.showGrid) {
      drawEnhancedGrid(ctx);
    }

    // Draw labels if enabled
    if (arSettings.showLabels) {
      drawEnhancedLabels(ctx);
    }

    // Draw gesture indicators
    if (gestureState.isTracking) {
      drawGestureIndicators(ctx);
    }

    // Draw problem overlay
    drawEnhancedProblemOverlay(ctx);

    // Draw level and score
    drawLevelAndScore(ctx);
  };

  /**
   * Update object animation
   */
  const updateObjectAnimation = (deltaTime: number) => {
    const rotationSpeed = arSettings.rotationSpeed * arSettings.animationSpeed;
    
    setObjectState(prev => ({
      ...prev,
      rotation: {
        x: prev.rotation.x + (deltaTime * rotationSpeed * 30),
        y: prev.rotation.y + (deltaTime * rotationSpeed * 45),
        z: prev.rotation.z + (deltaTime * rotationSpeed * 20)
      }
    }));
  };

  /**
   * Draw enhanced cube with advanced features
   */
  const drawEnhancedCube = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    const halfSize = size / 2;
    const depth = size * 0.4;

    // Apply object transformations
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(objectState.scale, objectState.scale);

    // Set enhanced styling
    ctx.strokeStyle = objectState.color;
    ctx.lineWidth = arSettings.showWireframe ? 2 : 4;
    ctx.fillStyle = arSettings.showWireframe ? 'transparent' : `${objectState.color}40`;

    // Add glow effect
    if (!arSettings.showWireframe) {
      ctx.shadowColor = objectState.color;
      ctx.shadowBlur = 20;
    }

    // Front face
    ctx.fillRect(-halfSize, -halfSize, size, size);
    ctx.strokeRect(-halfSize, -halfSize, size, size);

    // Top face (with perspective)
    ctx.beginPath();
    ctx.moveTo(-halfSize, -halfSize);
    ctx.lineTo(-halfSize + depth, -halfSize - depth);
    ctx.lineTo(halfSize + depth, -halfSize - depth);
    ctx.lineTo(halfSize, -halfSize);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right face (with perspective)
    ctx.beginPath();
    ctx.moveTo(halfSize, -halfSize);
    ctx.lineTo(halfSize + depth, -halfSize - depth);
    ctx.lineTo(halfSize + depth, halfSize - depth);
    ctx.lineTo(halfSize, halfSize);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Add face numbers if labels are enabled
    if (arSettings.showLabels) {
      ctx.fillStyle = '#1F2937';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.shadowBlur = 0;
      
      // Front face
      ctx.fillText('1', 0, 5);
      // Top face
      ctx.fillText('2', 0, -halfSize - depth/2);
      // Right face
      ctx.fillText('3', halfSize + depth/2, 0);
    }

    ctx.restore();
  };

  /**
   * Draw enhanced sphere
   */
  const drawEnhancedSphere = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(objectState.scale, objectState.scale);

    // Create gradient for 3D effect
    const gradient = ctx.createRadialGradient(-radius/3, -radius/3, 0, 0, 0, radius);
    gradient.addColorStop(0, '#ffffff80');
    gradient.addColorStop(0.7, objectState.color);
    gradient.addColorStop(1, '#00000040');

    // Draw sphere
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = arSettings.showWireframe ? 'transparent' : gradient;
    ctx.fill();
    
    if (arSettings.showWireframe) {
      // Draw wireframe circles
      ctx.strokeStyle = objectState.color;
      ctx.lineWidth = 2;
      
      // Horizontal circles
      for (let i = -2; i <= 2; i++) {
        const y = (radius * i) / 3;
        const r = Math.sqrt(radius * radius - y * y);
        ctx.beginPath();
        ctx.ellipse(0, y, r, r * 0.3, 0, 0, 2 * Math.PI);
        ctx.stroke();
      }
      
      // Vertical circles
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius, radius * 0.3, angle, 0, 2 * Math.PI);
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = objectState.color;
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    ctx.restore();
  };

  /**
   * Draw enhanced pyramid
   */
  const drawEnhancedPyramid = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(objectState.scale, objectState.scale);

    const baseSize = size;
    const height = size * 0.8;

    ctx.strokeStyle = objectState.color;
    ctx.lineWidth = 3;
    ctx.fillStyle = arSettings.showWireframe ? 'transparent' : `${objectState.color}40`;

    // Base (square)
    ctx.fillRect(-baseSize/2, baseSize/2 - 20, baseSize, 20);
    ctx.strokeRect(-baseSize/2, baseSize/2 - 20, baseSize, 20);

    // Front face
    ctx.beginPath();
    ctx.moveTo(-baseSize/2, baseSize/2);
    ctx.lineTo(0, -height/2);
    ctx.lineTo(baseSize/2, baseSize/2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right face (with perspective)
    ctx.beginPath();
    ctx.moveTo(baseSize/2, baseSize/2);
    ctx.lineTo(0, -height/2);
    ctx.lineTo(baseSize/2 + 30, baseSize/2 - 30);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  };

  /**
   * Draw enhanced grid
   */
  const drawEnhancedGrid = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;

    const gridSize = 40;

    // Vertical lines
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Center crosshair
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY);
    ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20);
    ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
  };

  /**
   * Draw enhanced labels
   */
  const drawEnhancedLabels = (ctx: CanvasRenderingContext2D) => {
    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(10, 10, 250, 80);
    
    ctx.fillStyle = 'white';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Enhanced AR Problem Solver', 20, 30);
    ctx.font = '14px Arial';
    ctx.fillText(`Object: ${currentProblem?.object_type || 'Unknown'}`, 20, 50);
    ctx.fillText(`Level: ${level} | Score: ${score}`, 20, 70);
  };

  /**
   * Draw gesture indicators
   */
  const drawGestureIndicators = (ctx: CanvasRenderingContext2D) => {
    const { handPosition, currentGesture } = gestureState;
    
    // Hand position indicator
    ctx.fillStyle = 'rgba(0, 255, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(handPosition.x, handPosition.y, 10, 0, 2 * Math.PI);
    ctx.fill();
    
    // Gesture feedback
    if (currentGesture) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(currentGesture.replace('_', ' ').toUpperCase(), handPosition.x, handPosition.y - 20);
    }
  };

  /**
   * Draw enhanced problem overlay
   */
  const drawEnhancedProblemOverlay = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas || !currentProblem) return;

    const overlayHeight = 140;
    const y = canvas.height - overlayHeight;

    // Background with gradient
    const gradient = ctx.createLinearGradient(0, y, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, y, canvas.width, overlayHeight);

    // Question text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(currentProblem.question, canvas.width / 2, y + 30);

    // Hint if shown
    if (showHint && currentProblem.hint) {
      ctx.font = '16px Arial';
      ctx.fillStyle = '#FCD34D';
      ctx.fillText(`💡 ${currentProblem.hint}`, canvas.width / 2, y + 60);
    }

    // Answer status
    if (isCorrect !== null) {
      ctx.font = 'bold 18px Arial';
      ctx.fillStyle = isCorrect ? '#10B981' : '#EF4444';
      ctx.fillText(
        isCorrect ? '✅ Correct! Well done!' : '❌ Try again!',
        canvas.width / 2,
        y + 90
      );
    }

    // Voice command indicator
    if (isListening) {
      ctx.fillStyle = '#3B82F6';
      ctx.font = '14px Arial';
      ctx.fillText('🎤 Voice commands active', canvas.width / 2, y + 115);
    }
  };

  /**
   * Draw level and score
   */
  const drawLevelAndScore = (ctx: CanvasRenderingContext2D) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Score panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(canvas.width - 200, 10, 180, 100);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Level: ${level}`, canvas.width - 190, 35);
    ctx.fillText(`Score: ${score}`, canvas.width - 190, 55);
    ctx.fillText(`Streak: ${streak}`, canvas.width - 190, 75);
    
    // Progress bar for level
    const progressWidth = 160;
    const progressHeight = 8;
    const progressX = canvas.width - 190;
    const progressY = 85;
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);
    
    const progress = (score % 100) / 100; // Level up every 100 points
    ctx.fillStyle = '#10B981';
    ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);
  };

  /**
   * Object manipulation functions
   */
  const rotateObject = (direction?: string) => {
    setObjectState(prev => ({
      ...prev,
      rotation: {
        x: prev.rotation.x + (direction === 'left' ? -15 : 15),
        y: prev.rotation.y + (direction === 'left' ? -15 : 15),
        z: prev.rotation.z
      }
    }));
  };

  const zoomObject = (factor: number) => {
    setObjectState(prev => ({
      ...prev,
      scale: Math.max(0.5, Math.min(2.0, prev.scale * factor))
    }));
  };

  const resetObject = () => {
    setObjectState({
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1.0,
      color: '#3B82F6',
      wireframe: false,
      animation: 'idle'
    });
  };

  /**
   * Check answer with enhanced feedback
   */
  const checkAnswer = (answer?: string) => {
    if (!currentProblem) return;

    const userAnswerValue = answer || userAnswer;
    const correct = userAnswerValue.trim().toLowerCase() === currentProblem.answer.toLowerCase();
    setIsCorrect(correct);

    if (correct) {
      const points = level * 10;
      setScore(prev => prev + points);
      setStreak(prev => prev + 1);
      
      // Level up check
      if (score > 0 && score % 100 === 0) {
        setLevel(prev => prev + 1);
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 }
        });
      }
      
      // Play success sound
      if (arSettings.soundEnabled) {
        const successSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        successSound.volume = 0.3;
        successSound.play().catch(() => {});
      }
      
      // Auto-advance to next problem
      setTimeout(() => {
        loadNextProblem();
      }, 3000);
    } else {
      setStreak(0);
      
      // Play error sound
      if (arSettings.soundEnabled) {
        const errorSound = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
        errorSound.volume = 0.2;
        errorSound.play().catch(() => {});
      }
    }
  };

  /**
   * Load next problem
   */
  const loadNextProblem = () => {
    setUserAnswer('');
    setIsCorrect(null);
    setShowHint(false);
    loadEnhancedARProblems();
  };

  /**
   * Toggle fullscreen
   */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl font-semibold">Initializing Enhanced AR Experience...</p>
        </motion.div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 flex items-center justify-center p-6">
        <motion.div
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Lock className="mx-auto mb-6 text-gray-400" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            Enhanced AR Problems require a premium subscription for advanced features like gesture recognition, voice commands, and adaptive difficulty.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/play-learn')}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:shadow-lg transition-all"
            >
              <Crown className="inline mr-2" size={20} />
              Upgrade to Premium
            </button>
            <button
              onClick={() => navigate('/play-learn')}
              className="w-full text-gray-600 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Back to Play & Learn
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 relative overflow-hidden">
      {/* Enhanced Header */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/70 to-transparent">
        <div className="flex items-center justify-between">
          <motion.button
            onClick={() => navigate('/play-learn')}
            className="flex items-center bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-lg hover:bg-white/30 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="mr-2" size={20} />
            Back
          </motion.button>

          <h1 className="text-white text-xl font-bold flex items-center">
            <Sparkles className="mr-2" size={24} />
            Enhanced AR Problems
          </h1>

          <div className="flex items-center space-x-2">
            <motion.button
              onClick={() => setShowHint(!showHint)}
              className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Lightbulb size={20} />
            </motion.button>

            <motion.button
              onClick={toggleFullscreen}
              className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Enhanced AR View */}
      <div className="relative w-full h-screen">
        {/* Video feed */}
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover ${isARActive ? 'block' : 'hidden'}`}
          playsInline
          muted
        />

        {/* Enhanced AR Canvas */}
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 w-full h-full ${isARActive ? 'block' : 'hidden'}`}
          width={window.innerWidth}
          height={window.innerHeight}
        />

        {/* Enhanced Start Screen */}
        {!isARActive && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="text-center text-white max-w-2xl mx-auto p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <motion.div
                className="mb-8"
                animate={{ 
                  rotateY: [0, 360],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <Box className="mx-auto text-blue-400" size={120} />
              </motion.div>
              
              <h2 className="text-4xl font-bold mb-4">Enhanced AR Problem Solving</h2>
              <p className="text-gray-300 mb-8 text-lg">
                Experience next-generation learning with gesture recognition, voice commands, and adaptive difficulty.
              </p>

              {/* Feature highlights */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { icon: Move3D, label: 'Gesture Control' },
                  { icon: Mic, label: 'Voice Commands' },
                  { icon: Brain, label: 'Adaptive AI' },
                  { icon: Gamepad2, label: 'Interactive' }
                ].map(({ icon: Icon, label }, index) => (
                  <motion.div
                    key={label}
                    className="bg-white/10 backdrop-blur-sm p-4 rounded-lg"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Icon className="mx-auto mb-2 text-blue-400" size={24} />
                    <p className="text-sm">{label}</p>
                  </motion.div>
                ))}
              </div>

              {!isARSupported && (
                <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                  <p className="text-red-300">
                    AR is not supported on this device. You can still view problems in enhanced 2D mode.
                  </p>
                </div>
              )}

              {cameraPermission === 'denied' && (
                <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 mb-6">
                  <p className="text-yellow-300">
                    Camera permission is required for AR. Please enable camera access and refresh.
                  </p>
                </div>
              )}

              <motion.button
                onClick={startEnhancedARSession}
                disabled={cameraPermission === 'denied'}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-12 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Camera className="inline mr-2" size={24} />
                Start Enhanced AR Experience
              </motion.button>
            </motion.div>
          </div>
        )}

        {/* Enhanced Controls Overlay */}
        {isARActive && (
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="max-w-4xl mx-auto">
              {/* Problem Info */}
              {currentProblem && (
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 mb-4">
                  <h3 className="text-white font-semibold mb-2">{currentProblem.question}</h3>
                  
                  {showHint && currentProblem.hint && (
                    <p className="text-yellow-300 text-sm mb-3">
                      💡 {currentProblem.hint}
                    </p>
                  )}

                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      placeholder="Your answer..."
                      className="flex-1 bg-white/20 text-white placeholder-white/70 px-3 py-2 rounded-lg border border-white/30 focus:border-white/50 focus:outline-none"
                    />
                    <motion.button
                      onClick={() => checkAnswer()}
                      disabled={!userAnswer.trim()}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isCorrect === null ? (
                        <CheckCircle size={20} />
                      ) : isCorrect ? (
                        <CheckCircle size={20} />
                      ) : (
                        <XCircle size={20} />
                      )}
                    </motion.button>
                  </div>
                </div>
              )}

              {/* Enhanced AR Controls */}
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {/* Object controls */}
                <motion.button
                  onClick={() => rotateObject()}
                  className="p-3 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <RotateCw size={20} />
                </motion.button>

                <motion.button
                  onClick={() => zoomObject(1.2)}
                  className="p-3 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomIn size={20} />
                </motion.button>

                <motion.button
                  onClick={() => zoomObject(0.8)}
                  className="p-3 rounded-full bg-green-600 text-white hover:bg-green-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <ZoomOut size={20} />
                </motion.button>

                <motion.button
                  onClick={resetObject}
                  className="p-3 rounded-full bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Target size={20} />
                </motion.button>

                {/* View controls */}
                <motion.button
                  onClick={() => setArSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                  className={`p-3 rounded-full ${arSettings.showGrid ? 'bg-blue-600' : 'bg-white/20'} text-white hover:bg-blue-700 transition-colors`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Grid3X3 size={20} />
                </motion.button>

                <motion.button
                  onClick={() => setArSettings(prev => ({ ...prev, showWireframe: !prev.showWireframe }))}
                  className={`p-3 rounded-full ${arSettings.showWireframe ? 'bg-purple-600' : 'bg-white/20'} text-white hover:bg-purple-700 transition-colors`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Layers size={20} />
                </motion.button>

                <motion.button
                  onClick={() => setArSettings(prev => ({ ...prev, voiceCommands: !prev.voiceCommands }))}
                  className={`p-3 rounded-full ${arSettings.voiceCommands ? 'bg-green-600' : 'bg-white/20'} text-white hover:bg-green-700 transition-colors`}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {arSettings.voiceCommands ? <Mic size={20} /> : <MicOff size={20} />}
                </motion.button>

                <motion.button
                  onClick={stopEnhancedARSession}
                  className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Pause size={20} />
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedARProblem;