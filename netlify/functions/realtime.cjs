/**
 * EduSphere AI Realtime Collaboration Netlify Function
 * Handles real-time collaborative coding and learning sessions using Supabase Realtime
 * Supports live code editing, chat, and collaborative problem solving
 * World's Largest Hackathon Project - EduSphere AI
 */

const { createClient } = require('@supabase/supabase-js');
const * = require('@sentry/node');

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// Supabase configuration
const supabaseUrl = 'https://faphnxotbuwiwfatuok.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGhueG90YnV3aXdmYXR1b2siLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ5MjIwMTEzLCJleHAiOjIwNjQ3OTYxMTN9.Ej8nQJhQJGqkKJqKJqKJqKJqKJqKJqKJqKJqKJqKJqK';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Session types supported for real-time collaboration
 */
const SESSION_TYPES = {
  LIVE_CODE: 'live_code',
  PROBLEM_SOLVING: 'problem_solving',
  STUDY_GROUP: 'study_group',
  WHITEBOARD: 'whiteboard'
};

/**
 * Initialize real-time collaboration tables in Supabase
 */
async function initializeRealtimeTables() {
  try {
    console.log('Initializing realtime collaboration tables...');

    // Create live_sessions table
    const { error: sessionsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'live_sessions',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        session_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        code TEXT,
        content JSONB,
        created_by VARCHAR(255) NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        max_participants INTEGER DEFAULT 10,
        password VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
      `
    });

    if (sessionsError) {
      console.error('Error creating live_sessions table:', sessionsError);
    }

    // Create session_participants table
    const { error: participantsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'session_participants',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        session_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'participant',
        is_active BOOLEAN DEFAULT TRUE,
        joined_at TIMESTAMP DEFAULT NOW(),
        last_active_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(session_id, user_id)
      `
    });

    if (participantsError) {
      console.error('Error creating session_participants table:', participantsError);
    }

    // Create chat_messages table
    const { error: messagesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'chat_messages',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        session_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        user_name VARCHAR(100),
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    if (messagesError) {
      console.error('Error creating chat_messages table:', messagesError);
    }

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'live_sessions',
      index_name: 'idx_live_sessions_type',
      index_definition: 'session_type'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'live_sessions',
      index_name: 'idx_live_sessions_created_by',
      index_definition: 'created_by'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'session_participants',
      index_name: 'idx_session_participants_session',
      index_definition: 'session_id'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'chat_messages',
      index_name: 'idx_chat_messages_session',
      index_definition: 'session_id'
    });

    console.log('Realtime collaboration tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize realtime tables:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Create new live session
 * @param {Object} sessionData - Session data
 * @returns {Promise<Object|null>} Created session or null
 */
async function createLiveSession(sessionData) {
  try {
    console.log('Creating new live session:', {
      type: sessionData.session_type,
      createdBy: sessionData.created_by
    });

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        session_type: sessionData.session_type,
        title: sessionData.title || `${sessionData.session_type} Session`,
        code: sessionData.initial_code || null,
        content: sessionData.content || {},
        created_by: sessionData.created_by,
        max_participants: sessionData.max_participants || 10,
        password: sessionData.password || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating live session:', error);
      return null;
    }

    // Add creator as first participant
    await addSessionParticipant({
      session_id: data.id,
      user_id: sessionData.created_by,
      user_name: sessionData.user_name || 'Host',
      role: 'host'
    });

    console.log('Live session created successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to create live session:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Add participant to session
 * @param {Object} participantData - Participant data
 * @returns {Promise<boolean>} Success status
 */
async function addSessionParticipant(participantData) {
  try {
    console.log('Adding participant to session:', {
      sessionId: participantData.session_id,
      userId: participantData.user_id
    });

    // Check if participant already exists
    const { data: existingParticipant } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', participantData.session_id)
      .eq('user_id', participantData.user_id)
      .single();

    if (existingParticipant) {
      // Update existing participant
      const { error } = await supabase
        .from('session_participants')
        .update({
          is_active: true,
          last_active_at: new Date().toISOString()
        })
        .eq('id', existingParticipant.id);

      if (error) {
        console.error('Error updating participant:', error);
        return false;
      }
    } else {
      // Add new participant
      const { error } = await supabase
        .from('session_participants')
        .insert({
          session_id: participantData.session_id,
          user_id: participantData.user_id,
          user_name: participantData.user_name || 'Anonymous',
          role: participantData.role || 'participant'
        });

      if (error) {
        console.error('Error adding participant:', error);
        return false;
      }
    }

    console.log('Participant added/updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to add session participant:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Get session participants
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Array>} Array of participants
 */
async function getSessionParticipants(sessionId) {
  try {
    console.log('Fetching participants for session:', sessionId);

    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Error fetching session participants:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} participants`);
    return data || [];

  } catch (error) {
    console.error('Failed to get session participants:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Update session code
 * @param {string} sessionId - Session identifier
 * @param {string} code - Updated code
 * @returns {Promise<boolean>} Success status
 */
async function updateSessionCode(sessionId, code) {
  try {
    console.log('Updating code for session:', sessionId);

    const { error } = await supabase
      .from('live_sessions')
      .update({
        code: code,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error updating session code:', error);
      return false;
    }

    console.log('Session code updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update session code:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Send chat message
 * @param {Object} messageData - Message data
 * @returns {Promise<Object|null>} Created message or null
 */
async function sendChatMessage(messageData) {
  try {
    console.log('Sending chat message:', {
      sessionId: messageData.session_id,
      userId: messageData.user_id
    });

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: messageData.session_id,
        user_id: messageData.user_id,
        user_name: messageData.user_name || 'Anonymous',
        message: messageData.message
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending chat message:', error);
      return null;
    }

    console.log('Chat message sent successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to send chat message:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Get chat messages
 * @param {string} sessionId - Session identifier
 * @param {number} limit - Maximum number of messages to return
 * @returns {Promise<Array>} Array of chat messages
 */
async function getChatMessages(sessionId, limit = 50) {
  try {
    console.log('Fetching chat messages for session:', sessionId);

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching chat messages:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} chat messages`);
    return data?.reverse() || []; // Return in chronological order

  } catch (error) {
    console.error('Failed to get chat messages:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Get session details
 * @param {string} sessionId - Session identifier
 * @returns {Promise<Object|null>} Session details or null
 */
async function getSessionDetails(sessionId) {
  try {
    console.log('Fetching session details for:', sessionId);

    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      console.error('Error fetching session details:', error);
      return null;
    }

    console.log('Session details retrieved successfully');
    return data;

  } catch (error) {
    console.error('Failed to get session details:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * End session
 * @param {string} sessionId - Session identifier
 * @returns {Promise<boolean>} Success status
 */
async function endSession(sessionId) {
  try {
    console.log('Ending session:', sessionId);

    const { error } = await supabase
      .from('live_sessions')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session:', error);
      return false;
    }

    console.log('Session ended successfully');
    return true;

  } catch (error) {
    console.error('Failed to end session:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Validate request parameters
 * @param {Object} body - Request body
 * @param {string} method - HTTP method
 * @returns {Object} Validation result
 */
function validateRequest(body, method) {
  const errors = [];

  if (method === 'POST') {
    const action = body.action || '';

    if (action === 'create_session') {
      if (!body.session_type || !Object.values(SESSION_TYPES).includes(body.session_type)) {
        errors.push(`Session type must be one of: ${Object.values(SESSION_TYPES).join(', ')}`);
      }

      if (!body.created_by || typeof body.created_by !== 'string') {
        errors.push('Created by (user ID) is required');
      }

    } else if (action === 'join_session') {
      if (!body.session_id || typeof body.session_id !== 'string') {
        errors.push('Session ID is required');
      }

      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required');
      }

    } else if (action === 'update_code') {
      if (!body.session_id || typeof body.session_id !== 'string') {
        errors.push('Session ID is required');
      }

      if (typeof body.code !== 'string') {
        errors.push('Code must be a string');
      }

    } else if (action === 'send_message') {
      if (!body.session_id || typeof body.session_id !== 'string') {
        errors.push('Session ID is required');
      }

      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required');
      }

      if (!body.message || typeof body.message !== 'string') {
        errors.push('Message is required and must be a string');
      }

    } else if (action === 'end_session') {
      if (!body.session_id || typeof body.session_id !== 'string') {
        errors.push('Session ID is required');
      }

      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract user ID from request
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Request body
 * @returns {string|null} User ID
 */
function extractUserId(event, requestBody) {
  return requestBody?.user_id || 
         event.headers['x-user-id'] || 
         event.headers['X-User-ID'] ||
         event.queryStringParameters?.user_id ||
         null;
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Realtime function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Initialize tables
    await initializeRealtimeTables();

    // Handle GET requests - fetch session data
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      
      try {
        // Get session details
        if (queryParams.session_id && queryParams.action !== 'get_participants' && queryParams.action !== 'get_messages') {
          const session = await getSessionDetails(queryParams.session_id);
          
          if (!session) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Session not found',
              }),
            };
          }
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              session: session,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        // Get session participants
        if (queryParams.session_id && queryParams.action === 'get_participants') {
          const participants = await getSessionParticipants(queryParams.session_id);
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              participants: participants,
              count: participants.length,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        // Get chat messages
        if (queryParams.session_id && queryParams.action === 'get_messages') {
          const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;
          const messages = await getChatMessages(queryParams.session_id, limit);
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              messages: messages,
              count: messages.length,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Session ID and action are required',
          }),
        };

      } catch (error) {
        console.error('Failed to fetch session data:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch session data',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - create/join sessions, update code, send messages
    if (event.httpMethod === 'POST') {
      let requestBody;
      try {
        requestBody = JSON.parse(event.body || '{}');
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in request body'
          }),
        };
      }

      // Validate request
      const validation = validateRequest(requestBody, 'POST');
      if (!validation.isValid) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Validation failed',
            details: validation.errors,
          }),
        };
      }

      const action = requestBody.action || '';
      const userId = extractUserId(event, requestBody);

      try {
        if (action === 'create_session') {
          // Create new session
          const sessionData = {
            session_type: requestBody.session_type,
            title: requestBody.title,
            initial_code: requestBody.initial_code,
            content: requestBody.content,
            created_by: userId || requestBody.created_by,
            user_name: requestBody.user_name,
            max_participants: requestBody.max_participants,
            password: requestBody.password
          };

          const session = await createLiveSession(sessionData);
          
          if (session) {
            return {
              statusCode: 201,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                session_id: session.id,
                session_type: session.session_type,
                message: 'Session created successfully',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to create session',
              }),
            };
          }

        } else if (action === 'join_session') {
          // Join existing session
          const participantData = {
            session_id: requestBody.session_id,
            user_id: userId || requestBody.user_id,
            user_name: requestBody.user_name,
            role: 'participant'
          };

          // Check if session exists and is active
          const session = await getSessionDetails(requestBody.session_id);
          
          if (!session) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Session not found',
              }),
            };
          }
          
          if (!session.is_active) {
            return {
              statusCode: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Session is no longer active',
              }),
            };
          }
          
          // Check password if required
          if (session.password && session.password !== requestBody.password) {
            return {
              statusCode: 403,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Invalid session password',
              }),
            };
          }

          // Add participant
          const joined = await addSessionParticipant(participantData);
          
          if (joined) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                session_id: requestBody.session_id,
                session_type: session.session_type,
                code: session.code,
                content: session.content,
                message: 'Joined session successfully',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to join session',
              }),
            };
          }

        } else if (action === 'update_code') {
          // Update session code
          const updated = await updateSessionCode(requestBody.session_id, requestBody.code);
          
          if (updated) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                session_id: requestBody.session_id,
                message: 'Code updated successfully',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to update code',
              }),
            };
          }

        } else if (action === 'send_message') {
          // Send chat message
          const messageData = {
            session_id: requestBody.session_id,
            user_id: userId || requestBody.user_id,
            user_name: requestBody.user_name || 'Anonymous',
            message: requestBody.message
          };

          const message = await sendChatMessage(messageData);
          
          if (message) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                message_id: message.id,
                session_id: requestBody.session_id,
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to send message',
              }),
            };
          }

        } else if (action === 'end_session') {
          // End session
          // Check if user is the host
          const session = await getSessionDetails(requestBody.session_id);
          
          if (!session) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Session not found',
              }),
            };
          }
          
          if (session.created_by !== (userId || requestBody.user_id)) {
            return {
              statusCode: 403,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Only the session host can end the session',
              }),
            };
          }

          const ended = await endSession(requestBody.session_id);
          
          if (ended) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                session_id: requestBody.session_id,
                message: 'Session ended successfully',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to end session',
              }),
            };
          }
        }

        // Unknown action
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Unknown action',
            allowedActions: ['create_session', 'join_session', 'update_code', 'send_message', 'end_session'],
          }),
        };

      } catch (error) {
        console.error('Failed to process realtime request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process realtime request',
            message: error.message,
          }),
        };
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
        usage: {
          GET: 'Fetch session data, participants, or messages',
          POST: 'Create/join sessions, update code, send messages, or end sessions'
        }
      }),
    };

  } catch (error) {
    console.error('Function execution error:', error);
    Sentry.captureException(error);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing realtime collaboration',
        timestamp: new Date().toISOString()
      }),
    };
  }
};