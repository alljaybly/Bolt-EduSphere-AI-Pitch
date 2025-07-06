import React, { useState, useEffect, useRef } from 'react';
    import { motion } from 'framer-motion';
    import * as Sentry from '@sentry/react';
    import { 
      Camera, 
      Box, 
      RotateCcw, 
      ArrowLeft, 
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
      Minimize
    } from 'lucide-react';
    import { useNavigate } from 'react-router-dom';
    import { supabase, supabaseHelpers } from '../lib/supabase';
    import { getCurrentUserId } from '../lib/authUtils';

    const ARProblem: React.FC = () => {
      const navigate = useNavigate();
      const videoRef = useRef<HTMLVideoElement>(null);
      const canvasRef = useRef<HTMLCanvasElement>(null);
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
      const [error, setError] = useState<string | null>(null);
      const [arSettings, setArSettings] = useState({
        showGrid: true,
        showLabels: true,
        soundEnabled: true,
        brightness: 1.0
      });

      useEffect(() => {
        const checkARSupport = async () => {
          try {
            setIsLoading(true);
            
            const userId = await getCurrentUserId();
            const premiumStatus = await supabaseHelpers.hasActiveSubscription(userId);
            setIsPremium(premiumStatus);

            if ('xr' in navigator) {
              const isSupported = await navigator.xr?.isSessionSupported('immersive-ar');
              setIsARSupported(!!isSupported);
            } else {
              setIsARSupported(false);
            }

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
              try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setCameraPermission('granted');
                stream.getTracks().forEach(track => track.stop());
              } catch (error) {
                setCameraPermission('denied');
              }
            }

            if (premiumStatus) {
              await loadARProblems();
            }
          } catch (error) {
            console.error('Failed to initialize AR:', error);
            Sentry.captureException(error);
            setError('Failed to initialize AR experience. Please try again.');
          } finally {
            setIsLoading(false);
          }
        };

        checkARSupport();
      }, []);

      const loadARProblems = async () => {
        try {
          const { data, error } = await supabase
            .from('ar_problems')
            .select('*')
            .limit(10);

          if (error) {
            throw error;
          }

          if (data && data.length > 0) {
            const randomProblem = data[Math.floor(Math.random() * data.length)];
            setCurrentProblem(randomProblem);
          } else {
            setCurrentProblem({
              id: 'sample_1',
              object_type: 'box',
              question: 'How many faces does this box have?',
              answer: '6',
              hint: 'Count each flat surface of the box',
              difficulty: 'easy'
            });
          }
        } catch (error) {
          console.error('Failed to load AR problems:', error);
          Sentry.captureException(error);
          setError('Failed to load AR problems. Using sample problem.');
          setCurrentProblem({
            id: 'sample_1',
            object_type: 'box',
            question: 'How many faces does this box have?',
            answer: '6',
            hint: 'Count each flat surface of the box',
            difficulty: 'easy'
          });
        }
      };

      const startARSession = async () => {
        if (!isPremium) {
          setError('AR Problems require a premium subscription. Contact support at nxlevel.myebookhub@gmail.com.');
          return;
        }

        if (!isARSupported) {
          setError('AR is not supported on this device.');
          return;
        }

        try {
          setIsLoading(true);

          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }

          setIsARActive(true);
          startARRendering();
        } catch (error) {
          console.error('Failed to start AR session:', error);
          Sentry.captureException(error);
          setError('Failed to start AR session. Please check camera permissions.');
        } finally {
          setIsLoading(false);
        }
      };

      const stopARSession = () => {
        setIsARActive(false);
        
        if (videoRef.current && videoRef.current.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
          videoRef.current.srcObject = null;
        }
      };

      const startARRendering = () => {
        const canvas = canvasRef.current;
        const video = videoRef.current;
        
        if (!canvas || !video) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const render = () => {
          if (!isARActive) return;

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          drawAROverlays(ctx);
          requestAnimationFrame(render);
        };

        render();
      };

      const drawAROverlays = (ctx: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current;
        if (!canvas || !currentProblem) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        if (currentProblem.object_type === 'box') {
          drawBox(ctx, centerX, centerY, 100);
        }

        if (arSettings.showGrid) {
          drawGrid(ctx);
        }

        if (arSettings.showLabels) {
          drawLabels(ctx);
        }

        drawProblemOverlay(ctx);
      };

      const drawBox = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number) => {
        const halfSize = size / 2;
        const depth = size * 0.3;

        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(59, 130, 246, 0.3)';

        ctx.fillRect(x - halfSize, y - halfSize, size, size);
        ctx.strokeRect(x - halfSize, y - halfSize, size, size);

        ctx.beginPath();
        ctx.moveTo(x - halfSize, y - halfSize);
        ctx.lineTo(x - halfSize + depth, y - halfSize - depth);
        ctx.lineTo(x + halfSize + depth, y - halfSize - depth);
        ctx.lineTo(x + halfSize, y - halfSize);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + halfSize, y - halfSize);
        ctx.lineTo(x + halfSize + depth, y - halfSize - depth);
        ctx.lineTo(x + halfSize + depth, y + halfSize - depth);
        ctx.lineTo(x + halfSize, y + halfSize);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        if (arSettings.showLabels) {
          ctx.fillStyle = '#1F2937';
          ctx.font = 'bold 16px Arial';
          ctx.textAlign = 'center';
          
          ctx.fillText('1', x, y);
          ctx.fillText('2', x, y - halfSize - depth/2);
          ctx.fillText('3', x + halfSize + depth/2, y);
        }
      };

      const drawGrid = (ctx: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;

        const gridSize = 50;

        for (let x = 0; x < canvas.width; x += gridSize) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvas.height);
          ctx.stroke();
        }

        for (let y = 0; y < canvas.height; y += gridSize) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvas.width, y);
          ctx.stroke();
        }
      };

      const drawLabels = (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, 10, 200, 60);
        
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('AR Problem Solver', 20, 30);
        ctx.fillText(`Object: ${currentProblem?.object_type || 'Unknown'}`, 20, 50);
      };

      const drawProblemOverlay = (ctx: CanvasRenderingContext2D) => {
        const canvas = canvasRef.current;
        if (!canvas || !currentProblem) return;

        const overlayHeight = 120;
        const y = canvas.height - overlayHeight;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, y, canvas.width, overlayHeight);

        ctx.fillStyle = 'white';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(currentProblem.question, canvas.width / 2, y + 30);

        if (showHint && currentProblem.hint) {
          ctx.font = '14px Arial';
          ctx.fillStyle = '#FCD34D';
          ctx.fillText(`Hint: ${currentProblem.hint}`, canvas.width / 2, y + 60);
        }

        if (isCorrect !== null) {
          ctx.font = 'bold 16px Arial';
          ctx.fillStyle = isCorrect ? '#10B981' : '#EF4444';
          ctx.fillText(
            isCorrect ? 'Correct! Well done!' : 'Try again!',
            canvas.width / 2,
            y + 90
          );
        }
      };

      const submitAnswer = async () => {
        if (!currentProblem || !userAnswer.trim()) return;

        const correct = userAnswer.trim().toLowerCase() === currentProblem.answer.toLowerCase();
        setIsCorrect(correct);

        if (arSettings.soundEnabled) {
          const audio = new Audio(
            correct 
              ? 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
              : 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT'
          );
          audio.volume = 0.3;
          audio.play().catch(() => {});
        }

        try {
          const userId = await getCurrentUserId();
          await supabase
            .from('user_progress')
            .upsert({
              user_id: userId,
              subject: 'ar_problems',
              grade: currentProblem.difficulty || 'easy',
              total_attempted: 1,
              total_correct: correct ? 1 : 0,
              last_activity: new Date().toISOString()
            });
        } catch (error) {
          console.error('Failed to save progress:', error);
        }

        if (correct) {
          setTimeout(() => {
            loadARProblems();
            setUserAnswer('');
            setIsCorrect(null);
            setShowHint(false);
          }, 2000);
        }
      };

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
              <p className="text-xl font-semibold">Initializing AR Experience...</p>
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
                AR Problems require a premium subscription. Contact support at nxlevel.myebookhub@gmail.com to upgrade.
              </p>
              <button
                onClick={() => navigate('/play-learn')}
                className="w-full text-gray-600 py-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Back to Play & Learn
              </button>
            </motion.div>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 to-blue-900 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 z-20 p-4 bg-gradient-to-b from-black/50 to-transparent">
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
                <Box className="mr-2" size={24} />
                AR Problems
              </h1>

              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => setShowHint(!showHint)}
                  className="bg-white/20 backdrop-blur-sm text-white p-2 rounded-lg hover:bg-white/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <HelpCircle size={20} />
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

          {error && (
            <div className="absolute top-16 left-0 right-0 p-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center mx-auto max-w-md">
                <AlertCircle className="text-red-500 mr-3" size={20} />
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          <div className="relative w-full h-screen">
            <video
              ref={videoRef}
              className={`absolute inset-0 w-full h-full object-cover ${isARActive ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full ${isARActive ? 'block' : 'hidden'}`}
              width={window.innerWidth}
              height={window.innerHeight}
            />

            {!isARActive && (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                  className="text-center text-white max-w-md mx-auto p-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Box className="mx-auto mb-6 text-blue-400" size={80} />
                  <h2 className="text-3xl font-bold mb-4">AR Problem Solving</h2>
                  <p className="text-gray-300 mb-8">
                    Solve mathematical problems in augmented reality. Point your camera at a flat surface to begin.
                  </p>

                  {!isARSupported && (
                    <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
                      <p className="text-red-300">
                        AR is not supported on this device. You can still view problems in 2D mode.
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
                    onClick={startARSession}
                    disabled={cameraPermission === 'denied'}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Camera className="inline mr-2" size={24} />
                    Start AR Experience
                  </motion.button>
                </motion.div>
              </div>
            )}

            {isARActive && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                <div className="max-w-md mx-auto">
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
                          onClick={submitAnswer}
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

                  <div className="flex justify-center space-x-4">
                    <motion.button
                      onClick={() => setArSettings(prev => ({ ...prev, showGrid: !prev.showGrid }))}
                      className={`p-3 rounded-full ${arSettings.showGrid ? 'bg-blue-600' : 'bg-white/20'} text-white hover:bg-blue-700 transition-colors`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Eye size={20} />
                    </motion.button>

                    <motion.button
                      onClick={() => setArSettings(prev => ({ ...prev, soundEnabled: !prev.soundEnabled }))}
                      className={`p-3 rounded-full ${arSettings.soundEnabled ? 'bg-green-600' : 'bg-white/20'} text-white hover:bg-green-700 transition-colors`}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {arSettings.soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                    </motion.button>

                    <motion.button
                      onClick={loadARProblems}
                      className="p-3 rounded-full bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <RotateCcw size={20} />
                    </motion.button>

                    <motion.button
                      onClick={stopARSession}
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

    export default ARProblem;