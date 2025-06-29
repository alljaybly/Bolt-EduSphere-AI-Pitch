import { createClient } from '@supabase/supabase-js';
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

export const handler = async (event, context) => {
  console.log('voiceQuiz invoked:', { event, env: Object.keys(process.env) });
  
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  // Handle GET requests to fetch voice quizzes
  if (event.httpMethod === 'GET') {
    try {
      const { data: quizzes, error } = await supabase
        .from('voice_quizzes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching voice quizzes:', error);
        return {
          statusCode: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            success: false, 
            error: 'Failed to fetch voice quizzes',
            message: error.message 
          }),
        };
      }

      return {
        statusCode: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          success: true, 
          data: quizzes || [] 
        }),
      };
    } catch (error) {
      console.error('voiceQuiz GET error:', error);
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
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: false, error: 'Method not allowed' }),
    };
  }

  try {
    const requestBody = JSON.parse(event.body || '{}');
    const clerkId = event.headers['x-user-id'];
    const { data, error } = await supabase
      .from('users')
      .select('clerk_id')
      .eq('clerk_id', clerkId)
      .single();
    if (error || !data) {
      return {
        statusCode: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Unauthorized' }),
      };
    }
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'voiceQuiz processed', clerkId }),
    };
  } catch (error) {
    console.error('voiceQuiz error:', error);
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