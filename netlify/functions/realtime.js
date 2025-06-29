import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://faphnxotbuwiiwfatuok.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

export const handler = async (event, context) => {
  console.log('realtime invoked:', { 
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  try {
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const userId = event.headers['x-user-id'];
    const { action } = requestBody;

    if (!userId) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'User ID required' }),
      };
    }

    // Verify user exists
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('clerk_id', userId)
      .single();

    if (userError || !userData) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Unauthorized' }),
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
        return await getSessionParticipants(requestBody.session_id);
      
      case 'get_messages':
        return await getChatMessages(requestBody.session_id);
      
      default:
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ success: false, error: 'Invalid action' }),
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

    if (error) throw error;

    // Add creator as first participant
    await supabase
      .from('session_participants')
      .insert({
        session_id: data.id,
        user_id: userId,
        role: 'host',
        is_active: true
      });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        session_id: data.id,
        session: data
      }),
    };
  } catch (error) {
    console.error('Error creating session:', error);
    throw error;
  }
}

/**
 * Join an existing session
 */
async function joinSession(requestBody, userId) {
  try {
    const { session_id, user_name } = requestBody;

    // Check if session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('id', session_id)
      .eq('is_active', true)
      .single();

    if (sessionError || !session) {
      return {
        statusCode: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Session not found or inactive' }),
      };
    }

    // Check participant count
    const { count } = await supabase
      .from('session_participants')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', session_id)
      .eq('is_active', true);

    if (count >= session.max_participants) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Session is full' }),
      };
    }

    // Add participant
    const { error: participantError } = await supabase
      .from('session_participants')
      .upsert({
        session_id,
        user_id: userId,
        user_name: user_name || 'Anonymous',
        role: 'participant',
        is_active: true,
        last_active_at: new Date().toISOString()
      }, {
        onConflict: 'session_id,user_id'
      });

    if (participantError) throw participantError;

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
    console.error('Error joining session:', error);
    throw error;
  }
}

/**
 * Update session code
 */
async function updateSessionCode(requestBody, userId) {
  try {
    const { session_id, code } = requestBody;

    // Verify user is participant
    const { data: participant } = await supabase
      .from('session_participants')
      .select('role')
      .eq('session_id', session_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!participant) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Not a participant of this session' }),
      };
    }

    // Update session code
    const { error } = await supabase
      .from('live_sessions')
      .update({ 
        code,
        updated_at: new Date().toISOString()
      })
      .eq('id', session_id);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: 'Code updated successfully'
      }),
    };
  } catch (error) {
    console.error('Error updating code:', error);
    throw error;
  }
}

/**
 * Send chat message - FIXED: Using user_id instead of clerk_id
 */
async function sendChatMessage(requestBody, userId) {
  try {
    const { session_id, message, user_name } = requestBody;

    // Verify user is participant
    const { data: participant } = await supabase
      .from('session_participants')
      .select('user_name')
      .eq('session_id', session_id)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (!participant) {
      return {
        statusCode: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Not a participant of this session' }),
      };
    }

    // Insert chat message - FIXED: Using user_id instead of clerk_id
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id,
        user_id: userId, // FIXED: Changed from clerk_id to user_id
        user_name: user_name || participant.user_name || 'Anonymous',
        message
      })
      .select()
      .single();

    if (error) throw error;

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
    console.error('Error sending message:', error);
    throw error;
  }
}

/**
 * Get session participants
 */
async function getSessionParticipants(sessionId) {
  try {
    const { data, error } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('is_active', true)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        participants: data || []
      }),
    };
  } catch (error) {
    console.error('Error getting participants:', error);
    throw error;
  }
}

/**
 * Get chat messages - FIXED: Using user_id instead of clerk_id
 */
async function getChatMessages(sessionId) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        messages: data || []
      }),
    };
  } catch (error) {
    console.error('Error getting messages:', error);
    throw error;
  }
}