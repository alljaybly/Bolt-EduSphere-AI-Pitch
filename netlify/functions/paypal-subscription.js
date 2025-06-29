import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'Ac9SLHZByLNIrYdGQmWaTP3jED5AHKj4uy84NE91tHy0Il-rYMqe7JmoxjAtkkWn7yVRmQ9U8QUGTjhL';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || 'ELCJbX3h_VC0AkLE9TdExKArD-15tC6z7qGi1ypLKftDkAEO8CzdWju3WV024IKyXdBt5iykZXfvF1eT';
const PAYPAL_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Get PayPal access token
 */
async function getPayPalAccessToken() {
  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PayPal auth failed: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Failed to get PayPal access token:', error);
    throw error;
  }
}

/**
 * Check if a subscription is active
 */
async function checkSubscription(subscriptionId) {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { exists: false, active: false };
      }
      const errorData = await response.json();
      throw new Error(`Failed to check subscription: ${errorData.message || response.status}`);
    }

    const subscription = await response.json();
    const isActive = subscription.status === 'ACTIVE' || subscription.status === 'APPROVED';
    
    return {
      exists: true,
      active: isActive,
      status: subscription.status,
      details: subscription
    };
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    throw error;
  }
}

/**
 * Main handler function
 */
export const handler = async (event, context) => {
  console.log('PayPal Subscription function invoked:', { 
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
      body: ''
    };
  }

  try {
    const requestBody = event.body ? JSON.parse(event.body) : {};
    const { action, subscription_id } = requestBody;
    const userId = event.headers['x-user-id'];

    // Validate user ID for most actions
    if (!userId && action !== 'get_client_token') {
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: false,
          error: 'User ID required',
          message: 'X-User-ID header is required for this action'
        })
      };
    }

    // Process different actions
    switch (action) {
      case 'check_subscription':
        // For demo purposes, we'll check a hardcoded subscription ID
        // In production, you would look up the user's subscription ID in your database
        const demoSubscriptionId = subscription_id || 'I-DEMO123456789';
        
        try {
          const subscriptionStatus = await checkSubscription(demoSubscriptionId);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: true,
              hasActiveSubscription: subscriptionStatus.active,
              status: subscriptionStatus.status,
              subscription: subscriptionStatus.details
            })
          };
        } catch (error) {
          // If there's an error checking the subscription, assume no active subscription
          console.error('Error checking subscription:', error);
          return {
            statusCode: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              success: true,
              hasActiveSubscription: false,
              error: error.message
            })
          };
        }

      case 'get_client_token':
        // Return client ID for frontend initialization
        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            client_id: PAYPAL_CLIENT_ID,
            environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
          })
        };

      default:
        return {
          statusCode: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: false,
            error: 'Invalid action',
            message: `Action '${action}' is not supported`
          })
        };
    }
  } catch (error) {
    console.error('PayPal Subscription function error:', error);
    Sentry.captureException(error);

    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};