import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Sentry from '@sentry/react';
import { 
  Code, 
  Play, 
  Users, 
  Share2, 
  Copy, 
  Download,
  Settings,
  Mic,
  MicOff,
  Video,
  VideoOff,
  MessageSquare,
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
  Palette,
  Lock,
  Unlock,
  GitBranch,
  GitMerge,
  GitPullRequest,
  History,
  Layers,
  Split,
  Maximize,
  Minimize,
  Cpu,
  Database,
  Server,
  Globe,
  Braces,
  Hash
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getCurrentUserId } from '../lib/revenuecat.js';

interface EnhancedCollaborativeCodingProps {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  onSessionJoined?: (sessionId: string) => void;
  onSessionClosed?: () => void;
}

/**
 * Enhanced Collaborative Coding Component
 * Advanced real-time collaborative coding environment with voice/video chat
 * Includes code versioning, syntax highlighting, and AI assistance
 */
const EnhancedCollaborativeCoding: React.FC<EnhancedCollaborativeCodingProps> = ({
  sessionId: initialSessionId,
  onSessionCreated,
  onSessionJoined,
  onSessionClosed
}) => {
  // Refs
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLIFrameElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Session state
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [participants, setParticipants] = useState<any[]>([]);
  const [isHost, setIsHost] = useState(false);
  
  // Code state
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('html');
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(14);
  const [autoSave, setAutoSave] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [codeHistory, setCodeHistory] = useState<any[]>([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);
  const [isLocked, setIsLocked] = useState(false);
  
  // Chat state
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showChat, setShowChat] = useState(true);
  const [showParticipants, setShowParticipants] = useState(true);
  
  // Media state
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<{[key: string]: MediaStream}>({});
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [layout, setLayout] = useState<'horizontal' | 'vertical'>('horizontal');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  
  // Sample initial code
  const initialCode = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enhanced Collaborative Coding</title>
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
            max-width: 800px;
            width: 100%;
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
        .code-info {
            margin-top: 30px;
            padding: 20px;
            background: rgba(0, 0, 0, 0.2);
            border-radius: 10px;
        }
        .collaborators {
            display: flex;
            justify-content: center;
            margin-top: 20px;
        }
        .collaborator {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #ff9f43;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 5px;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Enhanced Collaborative Coding</h1>
        <p>Edit this code together in real-time with voice and video chat!</p>
        
        <div>
            <button class="button" onclick="changeTheme()">Change Theme</button>
            <button class="button" onclick="addElement()">Add Element</button>
        </div>
        
        <div class="code-info">
            <p id="status">Connected with <span id="participant-count">0</span> collaborators</p>
            <p id="last-edit">Last edit: Just now</p>
        </div>
        
        <div class="collaborators" id="collaborators">
            <!-- Collaborators will appear here -->
        </div>
    </div>
    
    <script>
        // Update participant count
        document.getElementById('participant-count').textContent = '${participants.length}';
        
        // Add sample collaborators
        const collaboratorsDiv = document.getElementById('collaborators');
        const names = ['A', 'B', 'C'];
        names.forEach(name => {
            const div = document.createElement('div');
            div.className = 'collaborator';
            div.textContent = name;
            div.style.backgroundColor = getRandomColor();
            collaboratorsDiv.appendChild(div);
        });
        
        function getRandomColor() {
            const colors = ['#ff9f43', '#ee5253', '#0abde3', '#10ac84', '#5f27cd'];
            return colors[Math.floor(Math.random() * colors.length)];
        }
        
        function changeTheme() {
            const colors = [
                'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                'linear-gradient(135deg, #ff9a9e 0%, #fad0c4 100%)',
                'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
                'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)'
            ];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.body.style.background = randomColor;
            document.getElementById('last-edit').textContent = 'Last edit: Theme changed';
        }
        
        function addElement() {
            const container = document.querySelector('.container');
            const newElement = document.createElement('p');
            newElement.textContent = 'New element added at ' + new Date().toLocaleTimeString();
            newElement.style.padding = '10px';
            newElement.style.background = 'rgba(255, 255, 255, 0.2)';
            newElement.style.borderRadius = '5px';
            newElement.style.marginTop = '10px';
            container.appendChild(newElement);
            document.getElementById('last-edit').textContent = 'Last edit: Element added';
        }
    </script>
</body>
</html>`;

  /**
   * Initialize component
   */
  useEffect(() => {
    const initializeCollaborativeCoding = async () => {
      try {
        setIsLoading(true);
        
        if (initialSessionId) {
          await joinSession(initialSessionId);
        } else {
          setCode(initialCode);
          addToHistory(initialCode);
        }
        
      } catch (error) {
        console.error('Failed to initialize collaborative coding:', error);
        Sentry.captureException(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCollaborativeCoding();
    
    return () => {
      // Cleanup media streams
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [initialSessionId]);

  /**
   * Update preview when code changes
   */
  useEffect(() => {
    updatePreview(code);
  }, [code]);

  /**
   * Scroll chat to bottom when new messages arrive
   */
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  /**
   * Set up real-time subscriptions when session is joined
   */
  useEffect(() => {
    if (sessionId) {
      const setupSubscriptions = async () => {
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
            loadParticipants();
          })
          .subscribe();

        // Load initial data
        await Promise.all([
          loadSessionData(),
          loadParticipants(),
          loadChatMessages()
        ]);

        return () => {
          codeChannel.unsubscribe();
          chatChannel.unsubscribe();
          participantsChannel.unsubscribe();
        };
      };

      setupSubscriptions();
    }
  }, [sessionId]);

  /**
   * Create a new session
   */
  const createSession = async () => {
    try {
      setIsLoading(true);
      
      const userId = getCurrentUserId();
      
      const response = await fetch('/.netlify/functions/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          action: 'create_session',
          session_type: 'live_code',
          title: 'Enhanced Collaborative Coding Session',
          initial_code: initialCode,
          max_participants: 10
        })
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(result.session_id);
        setIsHost(true);
        setCode(initialCode);
        addToHistory(initialCode);
        
        if (onSessionCreated) {
          onSessionCreated(result.session_id);
        }
      } else {
        throw new Error(result.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Join an existing session
   */
  const joinSession = async (sessionIdToJoin: string) => {
    try {
      setIsLoading(true);
      
      const userId = getCurrentUserId();
      
      const response = await fetch('/.netlify/functions/realtime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          action: 'join_session',
          session_id: sessionIdToJoin,
          user_name: 'User ' + userId.substring(0, 4)
        })
      });

      const result = await response.json();

      if (result.success) {
        setSessionId(sessionIdToJoin);
        setIsHost(result.session.created_by === userId);
        
        if (onSessionJoined) {
          onSessionJoined(sessionIdToJoin);
        }
      } else {
        throw new Error(result.error || 'Failed to join session');
      }
    } catch (error) {
      console.error('Failed to join session:', error);
      Sentry.captureException(error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load session data
   */
  const loadSessionData = async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCode(data.code || '');
        addToHistory(data.code || '');
      }
    } catch (error) {
      console.error('Failed to load session data:', error);
    }
  };

  /**
   * Load participants
   */
  const loadParticipants = async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('is_active', true);
      
      if (error) throw error;
      
      setParticipants(data || []);
    } catch (error) {
      console.error('Failed to load participants:', error);
    }
  };

  /**
   * Load chat messages
   */
  const loadChatMessages = async () => {
    if (!sessionId) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      setChatMessages(data || []);
    } catch (error) {
      console.error('Failed to load chat messages:', error);
    }
  };

  /**
   * Handle code changes
   */
  const handleCodeChange = async (newCode: string) => {
    setCode(newCode);
    
    // Auto-save if enabled
    if (autoSave && sessionId) {
      await saveCode(newCode);
    }
  };

  /**
   * Update preview
   */
  const updatePreview = (codeToPreview: string) => {
    if (outputRef.current) {
      const doc = outputRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(codeToPreview);
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
        addToHistory(codeToSave);
      }

    } catch (error) {
      console.error('Failed to save code:', error);
    }
  };

  /**
   * Add code to history
   */
  const addToHistory = (codeToAdd: string) => {
    // Only add if different from current version
    if (codeHistory.length === 0 || codeToAdd !== codeHistory[codeHistory.length - 1].code) {
      setCodeHistory(prev => [
        ...prev.slice(0, currentHistoryIndex + 1),
        { 
          code: codeToAdd, 
          timestamp: new Date().toISOString(),
          author: getCurrentUserId()
        }
      ]);
      setCurrentHistoryIndex(prev => prev + 1);
    }
  };

  /**
   * Navigate code history
   */
  const navigateHistory = (direction: 'back' | 'forward') => {
    if (direction === 'back' && currentHistoryIndex > 0) {
      const newIndex = currentHistoryIndex - 1;
      setCurrentHistoryIndex(newIndex);
      setCode(codeHistory[newIndex].code);
    } else if (direction === 'forward' && currentHistoryIndex < codeHistory.length - 1) {
      const newIndex = currentHistoryIndex + 1;
      setCurrentHistoryIndex(newIndex);
      setCode(codeHistory[newIndex].code);
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
    a.download = 'collaborative-code.html';
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

  /**
   * Toggle voice chat
   */
  const toggleVoiceChat = async () => {
    try {
      if (isVoiceEnabled) {
        // Stop voice chat
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        setIsVoiceEnabled(false);
      } else {
        // Start voice chat
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setIsVoiceEnabled(true);
        
        // In a real implementation, you would connect this to WebRTC
        console.log('Voice chat enabled, stream:', stream);
      }
    } catch (error) {
      console.error('Failed to toggle voice chat:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  /**
   * Toggle video chat
   */
  const toggleVideoChat = async () => {
    try {
      if (isVideoEnabled) {
        // Stop video chat
        if (localStream) {
          localStream.getTracks().forEach(track => track.stop());
          setLocalStream(null);
        }
        setIsVideoEnabled(false);
      } else {
        // Start video chat
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 320 },
            height: { ideal: 240 }
          } 
        });
        setLocalStream(stream);
        setIsVideoEnabled(true);
        
        // In a real implementation, you would connect this to WebRTC
        console.log('Video chat enabled, stream:', stream);
      }
    } catch (error) {
      console.error('Failed to toggle video chat:', error);
      alert('Failed to access camera. Please check permissions.');
    }
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

  /**
   * Toggle code lock (read-only mode)
   */
  const toggleCodeLock = () => {
    setIsLocked(!isLocked);
  };

  /**
   * Get language icon
   */
  const getLanguageIcon = () => {
    switch (language) {
      case 'html':
        return <Code size={16} />;
      case 'css':
        return <Palette size={16} />;
      case 'javascript':
        return <Braces size={16} />;
      case 'typescript':
        return <Hash size={16} />;
      default:
        return <FileText size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          className="text-center text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p className="text-xl font-semibold">Initializing Collaborative Coding Environment...</p>
        </motion.div>
      </div>
    );
  }

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-blue-900 flex items-center justify-center p-6">
        <motion.div
          className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-md w-full shadow-2xl"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <div className="text-center mb-8">
            <Code className="mx-auto mb-4 text-blue-600" size={64} />
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
              Enhanced Collaborative Coding
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              Code together in real-time with voice, video, and advanced features
            </p>
          </div>

          <div className="space-y-6">
            <motion.button
              onClick={createSession}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Zap className="mr-2" size={20} />
              Create New Session
            </motion.button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  or join existing
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Enter session ID"
                className="flex-1 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              />
              <motion.button
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Join
              </motion.button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-2">
                Enhanced Features
              </h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li className="flex items-center">
                  <Users className="mr-2 flex-shrink-0" size={14} />
                  Real-time collaboration with multiple users
                </li>
                <li className="flex items-center">
                  <Mic className="mr-2 flex-shrink-0" size={14} />
                  Voice and video communication
                </li>
                <li className="flex items-center">
                  <GitBranch className="mr-2 flex-shrink-0" size={14} />
                  Code versioning and history
                </li>
                <li className="flex items-center">
                  <Cpu className="mr-2 flex-shrink-0" size={14} />
                  AI-powered code suggestions
                </li>
              </ul>
            </div>
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
            <div className="flex items-center">
              <Code className="mr-2 text-blue-400" size={24} />
              <h1 className="text-xl font-bold">Enhanced Collaborative Coding</h1>
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
              onClick={toggleVoiceChat}
              className={`p-2 rounded-lg transition-colors ${
                isVoiceEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {isVoiceEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </motion.button>

            <motion.button
              onClick={toggleVideoChat}
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

        {/* Enhanced Status Bar */}
        <div className="flex items-center justify-between mt-2 text-sm text-gray-400">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              {getLanguageIcon()}
              <span className="ml-1">{language}</span>
            </div>
            <span>Theme: {theme}</span>
            <span>Font: {fontSize}px</span>
            {lastSaved && (
              <span>Last saved: {lastSaved.toLocaleTimeString()}</span>
            )}
            <span className="flex items-center">
              {isLocked ? (
                <>
                  <Lock size={14} className="mr-1" />
                  <span>Read-only</span>
                </>
              ) : (
                <>
                  <Unlock size={14} className="mr-1" />
                  <span>Editable</span>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <span className={`w-2 h-2 rounded-full ${sessionId ? 'bg-green-400' : 'bg-red-400'}`}></span>
            <span>{sessionId ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`flex-1 flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
        {/* Code Editor */}
        <div className={`flex-1 flex flex-col ${layout === 'horizontal' ? 'border-r border-gray-700' : 'border-b border-gray-700'}`}>
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="text-blue-400" size={16} />
              <span className="text-sm font-medium">index.html</span>
            </div>
            <div className="flex items-center space-x-4">
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
              
              <div className="flex items-center space-x-2">
                <motion.button
                  onClick={() => navigateHistory('back')}
                  disabled={currentHistoryIndex <= 0}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <RotateCcw size={16} />
                </motion.button>
                <span className="text-xs">{currentHistoryIndex + 1}/{codeHistory.length}</span>
                <motion.button
                  onClick={() => navigateHistory('forward')}
                  disabled={currentHistoryIndex >= codeHistory.length - 1}
                  className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Play size={16} />
                </motion.button>
              </div>
              
              <motion.button
                onClick={toggleCodeLock}
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
              </motion.button>
              
              <motion.button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <History size={16} />
              </motion.button>
            </div>
          </div>

          <div className="relative flex-1">
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="absolute inset-0 bg-gray-900 text-white p-4 font-mono resize-none focus:outline-none"
              style={{ fontSize: `${fontSize}px` }}
              placeholder="Start coding here..."
              spellCheck={false}
              readOnly={isLocked}
            />
            
            {/* Version History Sidebar */}
            <AnimatePresence>
              {showVersionHistory && (
                <motion.div
                  className="absolute top-0 right-0 bottom-0 w-64 bg-gray-800 border-l border-gray-700 overflow-y-auto"
                  initial={{ x: 64, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: 64, opacity: 0 }}
                >
                  <div className="p-4">
                    <h3 className="text-lg font-semibold mb-4">Version History</h3>
                    <div className="space-y-3">
                      {codeHistory.map((version, index) => (
                        <div 
                          key={index}
                          className={`p-2 rounded cursor-pointer ${
                            index === currentHistoryIndex 
                              ? 'bg-blue-600' 
                              : 'bg-gray-700 hover:bg-gray-600'
                          }`}
                          onClick={() => {
                            setCurrentHistoryIndex(index);
                            setCode(version.code);
                          }}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs">Version {index + 1}</span>
                            <span className="text-xs opacity-70">
                              {new Date(version.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <div className="text-xs opacity-80 truncate">
                            {version.code.substring(0, 50)}...
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Preview */}
        <div className={`${layout === 'horizontal' ? 'w-1/2' : 'h-1/2'} flex flex-col`}>
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Eye className="text-green-400" size={16} />
              <span className="text-sm font-medium">Preview</span>
            </div>
            <div className="flex items-center space-x-2">
              <motion.button
                onClick={runCode}
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <RotateCcw size={16} />
              </motion.button>
              <motion.button
                onClick={() => setLayout(layout === 'horizontal' ? 'vertical' : 'horizontal')}
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Split size={16} />
              </motion.button>
              <motion.button
                onClick={toggleFullscreen}
                className="text-gray-400 hover:text-white transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </motion.button>
            </div>
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
              <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={chatContainerRef}>
                {chatMessages.map((message, index) => (
                  <div 
                    key={index} 
                    className={`p-3 rounded-lg ${
                      message.user_id === getCurrentUserId()
                        ? 'bg-blue-600 ml-8'
                        : 'bg-gray-700 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {message.user_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-gray-300 opacity-70">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.message}</p>
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
                        {participant.role === 'host' && (
                          <span className="ml-2 text-xs bg-yellow-600 text-white px-1.5 py-0.5 rounded">
                            Host
                          </span>
                        )}
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

export default EnhancedCollaborativeCoding;