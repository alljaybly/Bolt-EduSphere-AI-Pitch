import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  Code, 
  Play, 
  Users, 
  ArrowLeft, 
  Share2, 
  Copy, 
  Download,
  Settings,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
  Crown,
  Lock,
  Loader2,
  Send,
  UserPlus,
  Eye,
  EyeOff,
  RotateCcw,
  Save,
  Zap,
  Terminal,
  FileText,
  Palette
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { hasPremiumAccess, getCurrentUserId } from '../lib/revenuecat.js';
import { supabase } from '../lib/supabase';

/**
 * Live Code Component
 * Real-time collaborative coding environment with voice/video chat
 * Integrates with Supabase for real-time synchronization
 */
const LiveCode: React.FC = () => {
  const navigate = useNavigate();
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLIFrameElement>(null);
  
  // State management
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [code, setCode] = useState(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Code Session</title>
    <style>
        body {
            font-family: 'Arial', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        h1 {
            font-size: 3em;
            margin-bottom: 20px;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
        }
        .button {
            background: #ff6b6b;
            color: white;
            border: none;
            padding: 15px 30px;
            font-size: 1.2em;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s ease;
            margin: 10px;
        }
        .button:hover {
            background: #ff5252;
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Welcome to Live Code!</h1>
        <p>Start coding together in real-time</p>
        <button class="button" onclick="changeColor()">Click me!</button>
        <p id="output">Ready to code...</p>
    </div>
    
    <script>
        function changeColor() {
            const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.style.background = \`linear-gradient(135deg, \${randomColor} 0%, #764ba2 100%)\`;
            document.getElementById('output').textContent = 'Color changed! Keep coding...';
        }
    </script>
</body>
</html>`);
  
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(14);
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  /**
   * Initialize live coding session
   */
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setIsLoading(true);
        
        // Check premium access
        const premiumStatus = await hasPremiumAccess();
        setIsPremium(premiumStatus);

        if (premiumStatus) {
          // Initialize real-time session
          await initializeRealtimeSession();
        }

      } catch (error) {
        console.error('Failed to initialize live code session:', error);
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, []);

  /**
   * Initialize real-time session with Supabase
   */
  const initializeRealtimeSession = async () => {
    try {
      const userId = getCurrentUserId();
      
      // Create or join session
      const response = await fetch('/.netlify/functions/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          action: 'create_session',
          session_type: 'live_code',
          initial_code: code
        })
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(result.session_id);
        
        // Set up real-time subscriptions
        setupRealtimeSubscriptions(result.session_id);
      }

    } catch (error) {
      console.error('Failed to initialize realtime session:', error);
      Sentry.captureException(error);
    }
  };

  /**
   * Set up real-time subscriptions
   */
  const setupRealtimeSubscriptions = (sessionId: string) => {
    // Subscribe to code changes
    const codeChannel = supabase
      .channel(`live_code_${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'live_sessions',
        filter: `id=eq.${sessionId}`
      }, (payload) => {
        if (payload.new.code !== code) {
          setCode(payload.new.code);
          updatePreview(payload.new.code);
        }
      })
      .subscribe();

    // Subscribe to chat messages
    const chatChannel = supabase
      .channel(`chat_${sessionId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        setChatMessages(prev => [...prev, payload.new]);
      })
      .subscribe();

    // Subscribe to participants
    const participantsChannel = supabase
      .channel(`participants_${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        loadParticipants(sessionId);
      })
      .subscribe();

    // Cleanup on unmount
    return () => {
      codeChannel.unsubscribe();
      chatChannel.unsubscribe();
      participantsChannel.unsubscribe();
    };
  };

  /**
   * Load participants
   */
  const loadParticipants = async (sessionId: string) => {
    try {
      const response = await fetch(`/.netlify/functions/realtime?action=get_participants&session_id=${sessionId}`, {
        headers: {
          'X-User-ID': getCurrentUserId()
        }
      });

      const result = await response.json();

      if (result.success) {
        setParticipants(result.participants);
      }

    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  /**
   * Handle code changes
   */
  const handleCodeChange = async (newCode: string) => {
    setCode(newCode);
    updatePreview(newCode);

    // Auto-save if enabled
    if (autoSave && sessionId) {
      await saveCode(newCode);
    }
  };

  /**
   * Update preview
   */
  const updatePreview = (code: string) => {
    if (outputRef.current) {
      const doc = outputRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(code);
        doc.close();
      }
    }
  };

  /**
   * Save code to session
   */
  const saveCode = async (codeToSave: string = code) => {
    if (!sessionId) return;

    try {
      const response = await fetch('/.netlify/functions/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'update_code',
          session_id: sessionId,
          code: codeToSave
        })
      });

      const result = await response.json();

      if (result.success) {
        setLastSaved(new Date());
      }

    } catch (error) {
      console.error('Failed to save code:', error);
    }
  };

  /**
   * Send chat message
   */
  const sendChatMessage = async () => {
    if (!newMessage.trim() || !sessionId) return;

    try {
      const response = await fetch('/.netlify/functions/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': getCurrentUserId()
        },
        body: JSON.stringify({
          action: 'send_message',
          session_id: sessionId,
          message: newMessage.trim()
        })
      });

      const result = await response.json();

      if (result.success) {
        setNewMessage('');
      }

    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  /**
   * Share session
   */
  const shareSession = async () => {
    if (!sessionId) return;

    const shareUrl = `${window.location.origin}/live-code?session=${sessionId}`;
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Session link copied to clipboard!');
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      alert(`Share this link: ${shareUrl}`);
    }
  };

  /**
   * Download code
   */
  const downloadCode = () => {
    const blob = new Blob([code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'live-code-session.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Run code
   */
  const runCode = () => {
    updatePreview(code);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl font-semibold">Initializing Live Code Session...</p>
        </motion.div>
      </div>
    );
  }

  if (!isPremium) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-6">
        <motion.div
          className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Lock className="mx-auto mb-6 text-gray-400" size={64} />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Premium Feature</h2>
          <p className="text-gray-600 mb-6">
            Live Code requires a premium subscription for real-time collaborative coding with voice and video chat.
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
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <motion.button
              onClick={() => navigate('/play-learn')}
              className="flex items-center text-gray-300 hover:text-white transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <ArrowLeft className="mr-2" size={20} />
              Back
            </motion.button>

            <div className="flex items-center">
              <Code className="mr-2 text-blue-400" size={24} />
              <h1 className="text-xl font-bold">Live Code</h1>
              {sessionId && (
                <span className="ml-2 text-sm text-gray-400">
                  Session: {sessionId.substring(0, 8)}...
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Participants Count */}
            <div className="flex items-center bg-gray-700 px-3 py-1 rounded-lg">
              <Users className="mr-1" size={16} />
              <span className="text-sm">{participants.length}</span>
            </div>

            {/* Voice/Video Controls */}
            <motion.button
              onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                isVoiceEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isVoiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </motion.button>

            <motion.button
              onClick={() => setIsVideoEnabled(!isVideoEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                isVideoEnabled ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </motion.button>

            {/* Action Buttons */}
            <motion.button
              onClick={runCode}
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="mr-2" size={16} />
              Run
            </motion.button>

            <motion.button
              onClick={() => saveCode()}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Save className="mr-2" size={16} />
              Save
            </motion.button>

            <motion.button
              onClick={shareSession}
              className="bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg font-medium transition-colors flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Share2 className="mr-2" size={16} />
              Share
            </motion.button>

            <motion.button
              onClick={downloadCode}
              className="bg-gray-600 hover:bg-gray-700 p-2 rounded-lg transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Download size={20} />
            </motion.button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <span>Theme: {theme}</span>
            <span>Font: {fontSize}px</span>
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${sessionId ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span>{sessionId ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Code Editor */}
        <div className="flex-1 flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="text-blue-400" size={16} />
              <span className="text-sm font-medium">index.html</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFontSize(Math.max(10, fontSize - 1))}
                className="text-gray-400 hover:text-white transition-colors"
              >
                -
              </button>
              <span className="text-sm">{fontSize}px</span>
              <button
                onClick={() => setFontSize(Math.min(24, fontSize + 1))}
                className="text-gray-400 hover:text-white transition-colors"
              >
                +
              </button>
            </div>
          </div>

          <textarea
            ref={editorRef}
            value={code}
            onChange={(e) => handleCodeChange(e.target.value)}
            className="flex-1 bg-gray-900 text-white p-4 font-mono resize-none focus:outline-none"
            style={{ fontSize: `${fontSize}px` }}
            placeholder="Start coding here..."
            spellCheck={false}
          />
        </div>

        {/* Preview */}
        <div className="w-1/2 flex flex-col border-l border-gray-700">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="text-green-400" size={16} />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <motion.button
              onClick={runCode}
              className="text-gray-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <RotateCcw size={16} />
            </motion.button>
          </div>

          <iframe
            ref={outputRef}
            className="flex-1 bg-white"
            title="Code Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setShowChat(true)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                showChat ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="inline mr-2" size={16} />
              Chat
            </button>
            <button
              onClick={() => setShowChat(false)}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                !showChat ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Users className="inline mr-2" size={16} />
              People
            </button>
          </div>

          {/* Chat Panel */}
          {showChat ? (
            <div className="flex-1 flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.map((message, index) => (
                  <div key={index} className="bg-gray-700 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-400">
                        {message.user_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-200">{message.message}</p>
                  </div>
                ))}
                
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <MessageSquare className="mx-auto mb-2" size={32} />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-700">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <motion.button
                    onClick={sendChatMessage}
                    disabled={!newMessage.trim()}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-3 py-2 rounded-lg transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Send size={16} />
                  </motion.button>
                </div>
              </div>
            </div>
          ) : (
            /* Participants Panel */
            <div className="flex-1 p-4">
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <div key={index} className="flex items-center space-x-3 bg-gray-700 rounded-lg p-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {participant.user_name?.charAt(0) || 'A'}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">
                        {participant.user_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {participant.is_active ? 'Active' : 'Away'}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      participant.is_active ? 'bg-green-400' : 'bg-gray-500'
                    }`}></div>
                  </div>
                ))}

                {participants.length === 0 && (
                  <div className="text-center text-gray-400 py-8">
                    <Users className="mx-auto mb-2" size={32} />
                    <p>No other participants yet. Share the session to invite others!</p>
                  </div>
                )}
              </div>

              <motion.button
                onClick={shareSession}
                className="w-full mt-4 bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <UserPlus className="mr-2" size={16} />
                Invite Others
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveCode;