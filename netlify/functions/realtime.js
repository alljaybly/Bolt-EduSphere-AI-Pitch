import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// Use environment variable with fallback
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://faphnxotbuwiiwfatuok.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is not set');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

// Valid table names for security
const VALID_TABLES = [
  'live_sessions',
  'session_participants', 
  'chat_messages',
  'user_progress',
  'user_preferences',
  'users'
];

/**
 * Validate table name to prevent SQL injection
 */
function validateTableName(tableName) {
  return VALID_TABLES.includes(tableName);
}

/**
 * Main handler function
 */
export const handler = async (event, context) => {
  console.log('realtime invoked:', { 
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body,
    url: supabaseUrl
  });

  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers: corsHeaders, 
      body: JSON.stringify({ message: 'CORS preflight' })
    };
  }

  try {
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const userId = event.headers['x-user-id'];
    const { action } = requestBody;

    console.log('Processing request:', { action, userId: userId ? 'present' : 'missing' });

    if (!userId) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'User ID required',
          message: 'X-User-ID header is required'
        }),
      };
    }

    // Verify user exists using user_id column
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, clerk_id')
      .eq('clerk_id', userId)
      .single();

    if (userError) {
      console.error('User verification error:', userError);
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'User verification failed',
          message: userError.message
        }),
      };
    }

    if (!userData) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'User not found',
          message: 'User does not exist in database'
        }),
      };
    }

    // Handle different actions
    switch (action) {
      case 'create_session':
        return await createLiveSession(requestBody, userId);
      
      case 'join_session':
        return await joinSession(requestBody, userId);
      
      case 'update_code':
        return await updateSessionCode(requestBody, userId);
      
      case 'send_message':
        return await sendChatMessage(requestBody, userId);
      
      case 'get_participants':
        return await getSessionParticipants(requestBody.session_id, userId);
      
      case 'get_messages':
        return await getChatMessages(requestBody.session_id, userId);
      
      case 'get_user_progress':
        return await getUserProgress(userId);
      
      case 'update_user_progress':
        return await updateUserProgress(requestBody, userId);
      
      case 'get_user_preferences':
        return await getUserPreferences(userId);
      
      case 'update_user_preferences':
        return await updateUserPreferences(requestBody, userId);
      
      default:
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: 'Invalid action',
            message: `Action '${action}' is not supported`
          }),
        };
    }

  } catch (error) {
    console.error('realtime error:', error);
    Sentry.captureException(error);
    
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};

/**
 * Create a new live session
 */
async function createLiveSession(requestBody, userId) {
  try {
    const { session_type, title, initial_code, max_participants = 10 } = requestBody;

    if (!session_type) {
      throw new Error('session_type is required');
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        session_type,
        title: title || 'New Live Session',
        code: initial_code || '',
        created_by: userId,
        max_participants,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating session:', error);
      throw new Error(`Failed to create session: ${error.message}`);
    }

    // Add creator as first participant using user_id
    const { error: participantError } = await supabase
      .from('session_participants')
      .insert({
        session_id: data.id,
        user_id: userId, // Using user_id instead of clerk_id
        role: 'host',
        is_active: true
      });

    if (participantError) {
      console.error('Error adding participant:', participantError);
      // Don't fail the session creation if participant addition fails
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        session_id: data.id,
        session: data,
        message: 'Session created successfully'
      }),
    };
  } catch (error) {
    console.error('Error in createLiveSession:', error);
    throw error;
  }
}

/**
 * Join an existing session
 */
async function joinSession(requestBody, userId) {
  try {
    const { session_id, user_name } = requestBody;

    if (!session_id) {
      throw new Error('session_id is required');
    }

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('is_active', true)
      .single();

    if (sessionError) {
      console.error('Session query error:', sessionError);
      throw new Error(`Session query failed: ${sessionError.message}`);
    }

    if (!session) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Session not found or inactive',
          message: 'The requested session does not exist or is no longer active'
        }),
      };
    }

    // Check participant count using user_id
    const { count, error: countError } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('is_active', true);

    if (countError) {
      console.error('Participant count error:', countError);
      throw new Error(`Failed to check participant count: ${countError.message}`);
    }

    if (count >= session.max_participants) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Session is full',
          message: `Session has reached maximum capacity of ${session.max_participants} participants`
        }),
      };
    }

    // Add participant using user_id
    const { error: participantError } = await supabase
      .from('session_participants')
      .upsert({
        session_id,
        user_id: userId, // Using user_id instead of clerk_id
        user_name: user_name || 'Anonymous',
        role: 'participant',
        is_active: true,
        last_active_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      });

    if (participantError) {
      console.error('Error adding participant:', participantError);
      throw new Error(`Failed to join session: ${participantError.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        session,
        message: 'Joined session successfully'
      }),
    };
  } catch (error) {
    console.error('Error in joinSession:', error);
    throw error;
  }
}

/**
 * Update session code
 */
async function updateSessionCode(requestBody, userId) {
  try {
    const { session_id, code } = requestBody;

    if (!session_id) {
      throw new Error('session_id is required');
    }

    // Verify user is participant using user_id
    const { data: participant, error: participantError } = await supabase
      .from('session_participants')
      .select('role')
      .eq('session_id', session_id)
      .eq('user_id', userId) // Using user_id instead of clerk_id
      .eq('is_active', true)
      .single();

    if (participantError) {
      console.error('Participant verification error:', participantError);
      throw new Error(`Failed to verify participant: ${participantError.message}`);
    }

    if (!participant) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Not a participant of this session',
          message: 'You must be an active participant to update session code'
        }),
      };
    }

    // Update session code
    const { error } = await supabase
      .from('live_sessions')
      .update({ 
        code: code || '',
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (error) {
      console.error('Code update error:', error);
      throw new Error(`Failed to update code: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Code updated successfully'
      }),
    };
  } catch (error) {
    console.error('Error in updateSessionCode:', error);
    throw error;
  }
}

/**
 * Send chat message - FIXED: Using user_id instead of clerk_id
 */
async function sendChatMessage(requestBody, userId) {
  try {
    const { session_id, message, user_name } = requestBody;

    if (!session_id || !message) {
      throw new Error('session_id and message are required');
    }

    // Verify user is participant using user_id
    const { data: participant, error: participantError } = await supabase
      .from('session_participants')
      .select('user_name')
      .eq('session_id', session_id)
      .eq('user_id', userId) // Using user_id instead of clerk_id
      .eq('is_active', true)
      .single();

    if (participantError) {
      console.error('Participant verification error:', participantError);
      throw new Error(`Failed to verify participant: ${participantError.message}`);
    }

    if (!participant) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Not a participant of this session',
          message: 'You must be an active participant to send messages'
        }),
      };
    }

    // Insert chat message using user_id
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        user_id: userId, // FIXED: Using user_id instead of clerk_id
        user_name: user_name || participant.user_name || 'Anonymous',
        message: message.trim()
      })
      .select()
      .single();

    if (error) {
      console.error('Message insert error:', error);
      throw new Error(`Failed to send message: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message_id: data.id,
        message: 'Message sent successfully'
      }),
    };
  } catch (error) {
    console.error('Error in sendChatMessage:', error);
    throw error;
  }
}

/**
 * Get session participants
 */
async function getSessionParticipants(sessionId, userId) {
  try {
    if (!sessionId) {
      throw new Error('session_id is required');
    }

    // Verify user is participant using user_id
    const { data: userParticipant, error: userError } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId) // Using user_id instead of clerk_id
      .eq('is_active', true)
      .single();

    if (userError || !userParticipant) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Access denied',
          message: 'You must be a participant to view session participants'
        }),
      };
    }

    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) {
      console.error('Participants query error:', error);
      throw new Error(`Failed to get participants: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        participants: data || []
      }),
    };
  } catch (error) {
    console.error('Error in getSessionParticipants:', error);
    throw error;
  }
}

/**
 * Get chat messages - FIXED: Using user_id instead of clerk_id
 */
async function getChatMessages(sessionId, userId) {
  try {
    if (!sessionId) {
      throw new Error('session_id is required');
    }

    // Verify user is participant using user_id
    const { data: userParticipant, error: userError } = await supabase
      .from('session_participants')
      .select('id')
      .eq('session_id', sessionId)
      .eq('user_id', userId) // Using user_id instead of clerk_id
      .eq('is_active', true)
      .single();

    if (userError || !userParticipant) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: false, 
          error: 'Access denied',
          message: 'You must be a participant to view session messages'
        }),
      };
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Messages query error:', error);
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        messages: data || []
      }),
    };
  } catch (error) {
    console.error('Error in getChatMessages:', error);
    throw error;
  }
}

/**
 * Get user progress using user_id
 */
async function getUserProgress(userId) {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId) // Using user_id column
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('User progress query error:', error);
      throw new Error(`Failed to get user progress: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        progress: data || []
      }),
    };
  } catch (error) {
    console.error('Error in getUserProgress:', error);
    throw error;
  }
}

/**
 * Update user progress using user_id
 */
async function updateUserProgress(requestBody, userId) {
  try {
    const { subject, grade, total_attempted, total_correct, streak_days } = requestBody;

    if (!subject || !grade) {
      throw new Error('subject and grade are required');
    }

    const { data, error } = await supabase
      .from('user_progress')
      .upsert({
        user_id: userId, // Using user_id column
        subject,
        grade,
        total_attempted: total_attempted || 0,
        total_correct: total_correct || 0,
        streak_days: streak_days || 0,
        last_activity: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,subject,grade'
      })
      .select()
      .single();

    if (error) {
      console.error('User progress update error:', error);
      throw new Error(`Failed to update user progress: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        progress: data,
        message: 'User progress updated successfully'
      }),
    };
  } catch (error) {
    console.error('Error in updateUserProgress:', error);
    throw error;
  }
}

/**
 * Get user preferences using user_id
 */
async function getUserPreferences(userId) {
  try {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId) // Using user_id column
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('User preferences query error:', error);
      throw new Error(`Failed to get user preferences: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        preferences: data || null
      }),
    };
  } catch (error) {
    console.error('Error in getUserPreferences:', error);
    throw error;
  }
}

/**
 * Update user preferences using user_id
 */
async function updateUserPreferences(requestBody, userId) {
  try {
    const { 
      preferred_subject, 
      preferred_difficulty, 
      preferred_language, 
      learning_style, 
      daily_goal_minutes 
    } = requestBody;

    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId, // Using user_id column
        preferred_subject: preferred_subject || 'math',
        preferred_difficulty: preferred_difficulty || 2,
        preferred_language: preferred_language || 'en',
        learning_style: learning_style || 'visual',
        daily_goal_minutes: daily_goal_minutes || 30,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single();

    if (error) {
      console.error('User preferences update error:', error);
      throw new Error(`Failed to update user preferences: ${error.message}`);
    }

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        preferences: data,
        message: 'User preferences updated successfully'
      }),
    };
  } catch (error) {
    console.error('Error in updateUserPreferences:', error);
    throw error;
  }
}