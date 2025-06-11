/**
 * RevenueCat Subscription Check Netlify Function
 * Securely handles subscription verification using secret API key
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');

// RevenueCat configuration - Using secret key for server-side usage
const REVENUECAT_API_KEY = process.env.REVENUECAT_API_KEY || 'sk_5b90f0883a3b75fcee4c72d14d73a042b325f02f554f0b04';
const REVENUECAT_BASE_URL = 'https://api.revenuecat.com/v1';

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Make HTTP request using Node.js built-in modules
 * Compatible with Netlify Functions serverless environment
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {string|Buffer} data - Request body data
 * @returns {Promise<Object>} Response data with status and headers
 */
function makeHttpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          // Parse JSON response if content-type indicates JSON
          const parsedData = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(responseData) 
            : responseData;
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

/**
 * Check user's subscription status via RevenueCat REST API
 * Uses secret API key for secure server-side verification
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Subscription status with premium access info
 */
async function checkRevenueCatSubscription(userId) {
  try {
    console.log('Checking RevenueCat subscription status for user:', userId);

    // Handle missing or invalid user ID
    if (!userId || userId === '[Not provided]' || userId === 'undefined') {
      console.log('No valid user ID provided, treating as free user');
      return {
        isActive: false,
        isPremium: false,
        isSubscribed: false,
        expirationDate: null,
        productId: null,
        error: 'No valid user ID provided',
        userId: userId
      };
    }

    // Check if API key is configured
    if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY === 'your_secret_key_here') {
      console.warn('RevenueCat API key not configured, returning mock data');
      return {
        isActive: false,
        isPremium: false,
        isSubscribed: false,
        expirationDate: null,
        productId: null,
        isMockData: true,
        userId: userId
      };
    }

    // Make request to RevenueCat API
    const url = `${REVENUECAT_BASE_URL}/subscribers/${encodeURIComponent(userId)}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'web',
      },
    };

    const response = await makeHttpRequest(url, options);

    // Handle different response status codes
    if (response.statusCode === 404) {
      // User not found in RevenueCat - treat as free user
      console.log('User not found in RevenueCat, treating as free user');
      return {
        isActive: false,
        isPremium: false,
        isSubscribed: false,
        expirationDate: null,
        productId: null,
        isNewUser: true,
        userId: userId
      };
    }

    if (response.statusCode === 200 && response.data) {
      const { subscriber } = response.data;
      
      // Parse subscription status
      const status = {
        isActive: false,
        isPremium: false,
        isSubscribed: false,
        expirationDate: null,
        productId: null,
        originalPurchaseDate: null,
        userId: userId
      };
      
      // Check for premium entitlements
      if (subscriber && subscriber.entitlements) {
        const premiumEntitlement = subscriber.entitlements.premium;
        
        if (premiumEntitlement) {
          status.isPremium = true;
          status.productId = premiumEntitlement.product_identifier;
          status.expirationDate = premiumEntitlement.expires_date;
          
          // Check if subscription is active (not expired)
          if (!premiumEntitlement.expires_date) {
            // No expiration date means lifetime or active subscription
            status.isActive = true;
            status.isSubscribed = true;
          } else {
            // Check if subscription hasn't expired
            const expirationTime = new Date(premiumEntitlement.expires_date).getTime();
            const currentTime = new Date().getTime();
            
            status.isActive = expirationTime > currentTime;
            status.isSubscribed = true;
          }
          
          console.log('Premium subscription found:', {
            isActive: status.isActive,
            expiresAt: premiumEntitlement.expires_date,
            productId: premiumEntitlement.product_identifier
          });
        }
      }
      
      // Store original purchase date if available
      if (subscriber.original_purchase_date) {
        status.originalPurchaseDate = subscriber.original_purchase_date;
      }
      
      return status;
    }

    // User exists but no premium subscription
    console.log('User found but no premium subscription');
    return {
      isActive: false,
      isPremium: false,
      isSubscribed: false,
      expirationDate: null,
      productId: null,
      userId: userId
    };

  } catch (error) {
    console.error('RevenueCat subscription check failed:', error.message);
    
    // On error, default to free tier for security
    return {
      isActive: false,
      isPremium: false,
      isSubscribed: false,
      expirationDate: null,
      productId: null,
      error: error.message,
      userId: userId
    };
  }
}

/**
 * Validate subscription check request parameters
 * @param {Object} body - Request body from client
 * @returns {Object} Validation result with errors if any
 */
function validateRequest(body) {
  const errors = [];

  // Validate user_id parameter
  if (!body.user_id || typeof body.user_id !== 'string') {
    errors.push('User ID is required and must be a string');
  } else if (body.user_id.trim().length === 0) {
    errors.push('User ID cannot be empty');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract user ID from various sources in the request
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Parsed request body
 * @returns {string|null} User ID or null if not found
 */
function extractUserId(event, requestBody) {
  // Try multiple sources for user ID
  const userId = requestBody.user_id || 
                 event.headers['x-user-id'] || 
                 event.headers['X-User-ID'] ||
                 event.queryStringParameters?.user_id ||
                 event.queryStringParameters?.userId;
  
  return userId || null;
}

/**
 * Main Netlify function handler
 * Processes subscription check requests securely
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object with subscription status
 */
exports.handler = async (event, context) => {
  console.log('Subscription Check function invoked:', {
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

  // Only allow POST requests for subscription checking
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST for subscription checking.',
        allowedMethods: ['POST', 'OPTIONS']
      }),
    };
  }

  try {
    // Parse request body
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
          error: 'Invalid JSON in request body',
          details: 'Request body must be valid JSON'
        }),
      };
    }

    // Validate request parameters
    const validation = validateRequest(requestBody);
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

    // Extract user ID for subscription checking
    const userId = extractUserId(event, requestBody);

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'User ID is required for subscription checking',
        }),
      };
    }

    console.log('Processing subscription check for user:', userId);

    // Check subscription status via RevenueCat
    const subscriptionStatus = await checkRevenueCatSubscription(userId);
    
    console.log('Subscription check result:', {
      isPremium: subscriptionStatus.isPremium,
      isActive: subscriptionStatus.isActive,
      hasError: !!subscriptionStatus.error,
      userId: subscriptionStatus.userId
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          ...subscriptionStatus,
          timestamp: new Date().toISOString()
        },
        message: 'Subscription status retrieved successfully'
      }),
    };

  } catch (error) {
    console.error('Function execution error:', error);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while checking subscription status',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `subscription_check_${Date.now()}`
        }
      }),
    };
  }
};