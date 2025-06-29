/**
 * RevenueCat Integration for EduSphere AI
 * Handles subscription management and user identification
 * World's Largest Hackathon Project - EduSphere AI
 */

import { Purchases } from '@revenuecat/purchases-js';

// RevenueCat configuration - Using public key from environment
const REVENUECAT_API_KEY = import.meta.env.VITE_REVENUECAT_PUBLIC_KEY || 'pk_test_your_public_key_here';
const REVENUECAT_BASE_URL = 'https://api.revenuecat.com/v1';

// Local storage keys for persistent user data
const USER_ID_KEY = 'edusphere_user_id';
const SUBSCRIPTION_STATUS_KEY = 'edusphere_subscription_status';
const SUBSCRIPTION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

/**
 * Generate a unique anonymous user ID
 * Creates a timestamp-based ID with random suffix for uniqueness
 * @returns {string} Unique user identifier
 */
function generateAnonymousUserId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `anonymous_${timestamp}_${random}`;
}

/**
 * Get or create user ID from localStorage
 * Handles fallback for environments where localStorage is unavailable
 * @returns {string} User ID
 */
function getUserId() {
  try {
    let userId = localStorage.getItem(USER_ID_KEY);

    if (!userId) {
      userId = generateAnonymousUserId();
      localStorage.setItem(USER_ID_KEY, userId);
      console.log('Generated new anonymous user ID:', userId);
    }

    return userId;
  } catch (error) {
    console.warn('localStorage not available, using session-based ID:', error);
    if (!window.sessionUserId) {
      window.sessionUserId = generateAnonymousUserId();
    }
    return window.sessionUserId;
  }
}

/**
 * Make authenticated request to RevenueCat REST API
 * Handles proper headers and error responses
 * @param {string} endpoint - API endpoint (e.g., '/subscribers/user123')
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {Object} data - Request body data for POST/PUT requests
 * @returns {Promise<Object>} API response data
 */
async function makeRevenueCatRequest(endpoint, method = 'GET', data = null) {
  try {
    if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY === 'pk_test_your_public_key_here') {
      console.warn('RevenueCat public key not configured, using mock data');
      return getMockSubscriptionData();
    }

    const url = `${REVENUECAT_BASE_URL}${endpoint}`;

    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'web',
      },
    };

    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }

    console.log(`Making RevenueCat ${method} request to:`, url);

    const response = await fetch(url, options);

    if (response.status === 404) {
      return { subscriber: null, isNewUser: true };
    }

    if (!response.ok) {
      if (response.status === 401) {
        console.warn('RevenueCat API returned 401 - check your public key configuration');
        return getMockSubscriptionData();
      }
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();
    return responseData;

  } catch (error) {
    console.error('RevenueCat API request failed:', error);
    return getMockSubscriptionData();
  }
}

/**
 * Get mock subscription data for fallback scenarios
 * Used when RevenueCat API is unavailable or for development
 * @returns {Object} Mock subscription data structure
 */
function getMockSubscriptionData() {
  return {
    subscriber: {
      subscriptions: {},
      entitlements: {},
      original_purchase_date: new Date().toISOString(),
      first_seen: new Date().toISOString(),
    },
    isMockData: true,
  };
}

/**
 * Initialize RevenueCat SDK and user identification
 * Sets up anonymous user tracking and prepares for subscription management
 * @returns {Promise<Object>} Initialization result with user ID and status
 */
async function initializeRevenueCat() {
  try {
    console.log('Initializing RevenueCat for EduSphere AI...');

    const userId = getUserId();

    if (!REVENUECAT_API_KEY || REVENUECAT_API_KEY === 'pk_test_your_public_key_here') {
      console.log('RevenueCat public key not configured, running in mock mode');
      window.revenueCatInitialized = true;
      window.revenueCatUserId = userId;
      window.revenueCatMockMode = true;

      return {
        success: true,
        userId: userId,
        initialized: true,
        mockMode: true,
        message: 'Running in mock mode - configure RevenueCat public key for live functionality',
        timestamp: new Date().toISOString(),
      };
    }

    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: userId,
    });

    const subscriberData = await makeRevenueCatRequest(`/subscribers/${userId}`);

    window.revenueCatInitialized = true;
    window.revenueCatUserId = userId;

    if (subscriberData.isNewUser) {
      console.log('New user detected, will create subscriber on first purchase');
    } else {
      console.log('Existing subscriber found:', subscriberData.subscriber?.original_purchase_date);
    }

    return {
      success: true,
      userId: userId,
      initialized: true,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);

    window.revenueCatInitialized = false;
    window.revenueCatMockMode = true;

    return {
      success: false,
      error: error.message,
      mockMode: true,
      userId: getUserId(),
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Check current subscription status for the user
 * Implements caching to reduce API calls and improve performance
 * @param {boolean} forceRefresh - Skip cache and fetch fresh data
 * @returns {Promise<Object>} Subscription status object
 */
async function checkSubscription(forceRefresh = false) {
  try {
    const userId = getUserId();

    if (!forceRefresh) {
      const cachedStatus = getCachedSubscriptionStatus();
      if (cachedStatus) {
        console.log('Using cached subscription status');
        return cachedStatus;
      }
    }

    console.log('Fetching fresh subscription status for user:', userId);

    let subscriptionData;

    if (window.revenueCatMockMode || !REVENUECAT_API_KEY || REVENUECAT_API_KEY === 'pk_test_your_public_key_here') {
      subscriptionData = getMockSubscriptionData();
    } else {
      subscriptionData = await makeRevenueCatRequest(`/subscribers/${userId}`);
    }

    const status = parseSubscriptionStatus(subscriptionData);

    cacheSubscriptionStatus(status);

    return status;

  } catch (error) {
    console.error('Failed to check subscription status:', error);

    return {
      isActive: false,
      isPremium: false,
      isSubscribed: false,
      expirationDate: null,
      productId: null,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Parse subscription status from RevenueCat API response
 * Extracts relevant subscription information and determines access levels
 * @param {Object} subscriptionData - Raw RevenueCat API response
 * @returns {Object} Parsed subscription status
 */
function parseSubscriptionStatus(subscriptionData) {
  const status = {
    isActive: false,
    isPremium: false,
    isSubscribed: false,
    expirationDate: null,
    productId: null,
    originalPurchaseDate: null,
    isMockData: subscriptionData.isMockData || false,
    timestamp: new Date().toISOString(),
  };

  if (!subscriptionData.subscriber) {
    return status;
  }

  const { subscriber } = subscriptionData;

  if (subscriber.entitlements && subscriber.entitlements.premium) {
    const premium = subscriber.entitlements.premium;

    status.isPremium = true;
    status.productId = premium.product_identifier;
    status.expirationDate = premium.expires_date;

    if (!premium.expires_date) {
      status.isActive = true;
      status.isSubscribed = true;
    } else {
      const expirationTime = new Date(premium.expires_date).getTime();
      const currentTime = new Date().getTime();

      status.isActive = expirationTime > currentTime;
      status.isSubscribed = true;
    }
  }

  if (subscriber.original_purchase_date) {
    status.originalPurchaseDate = subscriber.original_purchase_date;
  }

  return status;
}

/**
 * Get cached subscription status from localStorage
 * @returns {Object|null} Cached status or null if expired/not found
 */
function getCachedSubscriptionStatus() {
  try {
    const cached = localStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    if (!cached) return null;

    const parsed = JSON.parse(cached);

    if (Date.now() - parsed.cacheTime < SUBSCRIPTION_CACHE_DURATION) {
      return parsed.data;
    }

    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    return null;

  } catch (error) {
    console.warn('Could not read cached subscription status:', error);
    return null;
  }
}

/**
 * Cache subscription status in localStorage
 * @param {Object} status - Subscription status to cache
 */
function cacheSubscriptionStatus(status) {
  try {
    const cacheData = {
      data: status,
      timestamp: Date.now(),
    };

    localStorage.setItem(SUBSCRIPTION_STATUS_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.warn('Could not cache subscription status:', error);
  }
}

/**
 * Check if user has premium access
 * Convenience function for quick premium status checking
 * @returns {Promise<boolean>} True if user has active premium subscription
 */
async function hasPremiumAccess() {
  try {
    const status = await checkSubscription();
    return status.isActive && status.isPremium;
  } catch (err) {
    console.error('Failed to check premium access:', err);
    return false;
  }
}

/**
 * Get current user ID
 * @returns {string} Current user identifier
 */
function getCurrentUserId() {
  return getUserId();
}

/**
 * Clear user data and reset to new anonymous user
 * Useful for testing or user logout scenarios
 */
function clearUserData() {
  try {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);

    delete window.sessionUserId;
    delete window.revenueCatInitialized;
    delete window.revenueCatUserId;

    console.log('User data cleared, will generate new anonymous ID on next access');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

/**
 * Create or update subscriber in RevenueCat
 * Used when user makes their first purchase or updates information
 * @param {Object} subscriberData - Subscriber information
 * @returns {Promise<Object>} Creation/update result
 */
async function createOrUpdateSubscriber(subscriberData = {}) {
  try {
    const userId = getUserId();

    const data = {
      app_user_id: userId,
      ...subscriberData,
    };

    const response = await makeRevenueCatRequest(`/subscribers/${userId}`, 'POST', data);

    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);

    return {
      success: true,
      subscriber: response.subscriber,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Failed to create/update subscriber:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Log subscription event for analytics
 * @param {string} eventType - Type of subscription event
 * @param {Object} eventData - Additional event data
 */
function logSubscriptionEvent(eventType, eventData = {}) {
  try {
    console.log(`Subscription Event: ${eventType}`, {
      userId: getUserId(),
      timestamp: new Date().toISOString(),
      ...eventData,
    });
  } catch (error) {
    console.error('Failed to log subscription event:', error);
  }
}

export {
  initializeRevenueCat,
  checkSubscription,
  hasPremiumAccess,
  getCurrentUserId,
  clearUserData,
  createOrUpdateSubscriber,
  logSubscriptionEvent,
};

initializeRevenueCat()
  .then((result) => {
    if (result.success) {
      console.log('RevenueCat initialized successfully for user:', result.userId);
      if (result.mockMode) {
        console.log('Note: Running in mock mode. To enable live RevenueCat functionality, replace the API key with your public key from the RevenueCat dashboard.');
      }
    } else {
      console.log('Error: RevenueCat initialization failed, using mock mode:', result.error);
    }
  })
  .catch((error) => {
    console.error('RevenueCat initialization error:', error);
  });