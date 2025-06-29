import * as Sentry from '@sentry/node';

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX === 'true' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Safe JSON parse utility
 * @param {string} text - JSON string to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed object or fallback
 */
function safeJsonParse(text, fallback = null) {
  try {
    if (!text || text.trim() === '') {
      return fallback;
    }
    return JSON.parse(text);
  } catch (error) {
    console.warn('JSON parse error:', error);
    return fallback;
  }
}

/**
 * Create standardized JSON response
 * @param {object} data - Response data
 * @param {number} statusCode - HTTP status code
 * @returns {object} Netlify function response
 */
function createJsonResponse(data, statusCode = 200) {
  return {
    statusCode,
    headers: { 
      ...corsHeaders, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(data || {})
  };
}

/**
 * Get PayPal access token
 * @returns {Promise<string|null>} Access token or null on failure
 */
async function getPayPalAccessToken() {
  try {
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET) {
      console.error('PayPal credentials not configured');
      return null;
    }

    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64');
    
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials'
    });

    const responseText = await response.text();
    
    if (!response.ok) {
      console.error('PayPal auth failed:', response.status, responseText);
      return null;
    }

    const data = safeJsonParse(responseText);
    
    if (!data || !data.access_token) {
      console.error('Invalid PayPal auth response:', data);
      return null;
    }

    return data.access_token;

  } catch (error) {
    console.error('PayPal auth error:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Check subscription status
 * @param {string} userId - User ID
 * @returns {Promise<object>} Subscription status
 */
async function checkSubscription(userId) {
  try {
    // For demo purposes, return mock data if PayPal is not configured
    if (!PAYPAL_CLIENT_ID || !PAYPAL_CLIENT_SECRET || 
        PAYPAL_CLIENT_ID === 'demo_client_id' || 
        PAYPAL_CLIENT_SECRET === 'demo_client_secret') {
      
      console.log('PayPal not configured, returning demo subscription status');
      return {
        isActive: false,
        has_subscription: false,
        subscription_id: null,
        status: 'demo_mode',
        message: 'PayPal not configured - demo mode'
      };
    }

    const accessToken = await getPayPalAccessToken();
    
    if (!accessToken) {
      return {
        isActive: false,
        has_subscription: false,
        error: 'Failed to authenticate with PayPal'
      };
    }

    // In a real implementation, you would:
    // 1. Query your database for user's subscription ID
    // 2. Call PayPal API to check subscription status
    // 3. Return the actual status
    
    // For now, return demo data
    return {
      isActive: false,
      has_subscription: false,
      subscription_id: null,
      status: 'inactive',
      message: 'No active subscription found'
    };

  } catch (error) {
    console.error('Subscription check error:', error);
    Sentry.captureException(error);
    return {
      isActive: false,
      has_subscription: false,
      error: 'Failed to check subscription status'
    };
  }
}

/**
 * Create PayPal subscription
 * @param {string} planId - PayPal plan ID
 * @param {string} userId - User ID
 * @returns {Promise<object>} Subscription creation result
 */
async function createSubscription(planId, userId) {
  try {
    const accessToken = await getPayPalAccessToken();
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Failed to authenticate with PayPal'
      };
    }

    const subscriptionData = {
      plan_id: planId,
      subscriber: {
        name: {
          given_name: 'EduSphere',
          surname: 'User'
        }
      },
      application_context: {
        brand_name: 'EduSphere AI',
        locale: 'en-US',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'SUBSCRIBE_NOW',
        payment_method: {
          payer_selected: 'PAYPAL',
          payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
        },
        return_url: `${process.env.URL || 'http://localhost:3000'}/subscription/success`,
        cancel_url: `${process.env.URL || 'http://localhost:3000'}/subscription/cancel`
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(subscriptionData)
    });

    const responseText = await response.text();
    const data = safeJsonParse(responseText);

    if (!response.ok) {
      console.error('PayPal subscription creation failed:', response.status, data);
      return {
        success: false,
        error: data?.message || 'Failed to create subscription'
      };
    }

    if (!data || !data.id) {
      return {
        success: false,
        error: 'Invalid subscription response from PayPal'
      };
    }

    // Find approval URL
    const approvalLink = data.links?.find(link => link.rel === 'approve');
    
    return {
      success: true,
      subscription_id: data.id,
      approval_url: approvalLink?.href,
      status: data.status
    };

  } catch (error) {
    console.error('Subscription creation error:', error);
    Sentry.captureException(error);
    return {
      success: false,
      error: 'Failed to create subscription'
    };
  }
}

/**
 * Main handler function
 */
export const handler = async (event, context) => {
  console.log('PayPal subscription function invoked:', {
    method: event.httpMethod,
    path: event.path,
    hasBody: !!event.body
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return createJsonResponse({}, 200);
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return createJsonResponse({
      success: false,
      error: 'Method not allowed'
    }, 405);
  }

  try {
    // Parse request body safely
    let requestBody = {};
    if (event.body) {
      requestBody = safeJsonParse(event.body, {});
    }

    const { action, user_id, plan_id, subscription_id } = requestBody;

    if (!action) {
      return createJsonResponse({
        success: false,
        error: 'Action parameter is required'
      }, 400);
    }

    console.log('Processing action:', action, 'for user:', user_id);

    // Handle different actions
    switch (action) {
      case 'check_subscription':
        const subscriptionStatus = await checkSubscription(user_id);
        return createJsonResponse({
          success: true,
          ...subscriptionStatus
        });

      case 'create_subscription':
        if (!plan_id) {
          return createJsonResponse({
            success: false,
            error: 'Plan ID is required'
          }, 400);
        }
        
        const creationResult = await createSubscription(plan_id, user_id);
        return createJsonResponse(creationResult);

      case 'cancel_subscription':
        if (!subscription_id) {
          return createJsonResponse({
            success: false,
            error: 'Subscription ID is required'
          }, 400);
        }
        
        // Implement cancellation logic here
        return createJsonResponse({
          success: true,
          message: 'Subscription cancellation requested'
        });

      case 'create_payment':
        // Implement one-time payment creation
        return createJsonResponse({
          success: true,
          payment_id: 'demo_payment_id',
          approval_url: 'https://www.paypal.com/checkoutnow?token=demo_token',
          message: 'Demo payment created'
        });

      default:
        return createJsonResponse({
          success: false,
          error: `Unknown action: ${action}`
        }, 400);
    }

  } catch (error) {
    console.error('PayPal subscription function error:', error);
    Sentry.captureException(error);
    
    return createJsonResponse({
      success: false,
      error: 'Internal server error',
      message: error.message
    }, 500);
  }
};