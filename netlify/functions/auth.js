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
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function validateRequestBody(body, action) {
  const errors = [];
  if (!body.clerk_id || typeof body.clerk_id !== 'string') errors.push('clerk_id is required and must be a string');
  if (!body.email || typeof body.email !== 'string') errors.push('email is required and must be a string');
  if (action === 'signup') {
    if (!body.first_name || typeof body.first_name !== 'string') errors.push('first_name is required for signup');
    if (!body.last_name || typeof body.last_name !== 'string') errors.push('last_name is required for signup');
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (body.email && !emailRegex.test(body.email)) errors.push('email must be a valid email address');
  return { isValid: errors.length === 0, errors };
}

export const handler = async (event, context) => {
  console.log('Auth function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body,
  });

  Sentry.configureScope((scope) => {
    scope.setTag('function', 'auth');
    scope.setTag('method', event.httpMethod);
  });

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        allowedMethods: ['POST', 'OPTIONS'],
      }),
    };
  }

  try {
    let requestBody;
    try {
      requestBody = JSON.parse(event.body || '{}');
    } catch (error) {
      console.error('Invalid JSON:', error);
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON',
        }),
      };
    }

    const { action, clerk_id, email, first_name, last_name } = requestBody;

    if (!['login', 'signup'].includes(action)) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Invalid action',
          details: 'Action must be either "login" or "signup"',
        }),
      };
    }

    const validation = validateRequestBody(requestBody, action);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Validation failed',
          details: validation.errors,
        }),
      };
    }

    console.log('Processing auth request:', {
      action,
      clerk_id,
      email,
      hasFirstName: !!first_name,
      hasLastName: !!last_name,
    });

    const userData = {
      clerk_id,
      email,
      ...(first_name && { first_name }),
      ...(last_name && { last_name }),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .upsert(userData, { onConflict: ['clerk_id'] });

    if (error) {
      console.error('Supabase upsert error:', error);
      Sentry.captureException(error);
      return {
        statusCode: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'Failed to store user data',
          details: error.message,
        }),
      };
    }

    console.log('User data stored successfully:', { clerk_id, action });

    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        clerk_id,
        message: `User ${action === 'login' ? 'logged in' : 'signed up'} successfully`,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Auth function execution error:', error);
    Sentry.captureException(error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing the auth request',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `auth_${Date.now()}`,
        },
      }),
    };
  }
};