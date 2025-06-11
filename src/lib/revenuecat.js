/**
 * RevenueCat Integration for EduSphere AI
 * Handles subscription management and user identification
 * World's Largest Hackathon Project - EduSphere AI
 */

// RevenueCat configuration
const REVENUECAT_API_KEY = 'sk_5b90f0883a3b75fcee4c72d14d73a042b325f02f554f0b04';
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
    // Fallback for environments where localStorage is not available
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
    const url = `${REVENUECAT_BASE_URL}${endpoint}`;
    
    const options = {
      method,
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'web',
      },
    };
    
    // Add request body for POST/PUT requests
    if (data && method !== 'GET') {
      options.body = JSON.stringify(data);
    }
    
    console.log(`Making RevenueCat ${method} request to:`, url);
    
    const response = await fetch(url, options);
    
    // Handle different response status codes
    if (response.status === 404) {
      // User not found - this is normal for new users
      return { subscriber: null, isNewUser: true };
    }
    
    if (!response.ok) {
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
    }
    
    const responseData = await response.json();
    return responseData;
    
  } catch (error) {
    console.error('RevenueCat API request failed:', error);
    
    // Return mock data for development/fallback scenarios
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
      entitlements: {
        // Mock free tier - no premium entitlements
      },
      original_purchase_date: new Date().toISOString(),
      first_seen: new Date().toISOString(),
    },
    isMockData: true
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
    
    // Get or create anonymous user ID
    const userId = getUserId();
    
    // Store initialization status globally
    window.revenueCatInitialized = true;
    window.revenueCatUserId = userId;
    
    // Attempt to fetch existing subscriber data
    try {
      const subscriberData = await makeRevenueCatRequest(`/subscribers/${userId}`);
      
      if (subscriberData.isNewUser) {
        console.log('New user detected, will create subscriber on first purchase');
      } else {
        console.log('Existing subscriber found:', subscriberData.subscriber?.original_purchase_date);
      }
      
    } catch (error) {
      console.log('Could not fetch subscriber data, will create on first interaction:', error.message);
    }
    
    return {
      success: true,
      userId: userId,
      initialized: true,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    
    // Set fallback mode for graceful degradation
    window.revenueCatInitialized = false;
    window.revenueCatMockMode = true;
    
    return {
      success: false,
      error: error.message,
      mockMode: true,
      userId: getUserId(),
      timestamp: new Date().toISOString()
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
    
    // Check cached status first (unless force refresh is requested)
    if (!forceRefresh) {
      const cachedStatus = getCachedSubscriptionStatus();
      if (cachedStatus) {
        console.log('Using cached subscription status');
        return cachedStatus;
      }
    }
    
    console.log('Fetching fresh subscription status for user:', userId);
    
    let subscriptionData;
    
    // Use mock data if RevenueCat is in mock mode
    if (window.revenueCatMockMode) {
      subscriptionData = getMockSubscriptionData();
    } else {
      // Make actual API call to RevenueCat
      subscriptionData = await makeRevenueCatRequest(`/subscribers/${userId}`);
    }
    
    // Parse subscription status from RevenueCat response
    const status = parseSubscriptionStatus(subscriptionData);
    
    // Cache the result for future use
    cacheSubscriptionStatus(status);
    
    return status;
    
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    
    // Return safe default status on error
    return {
      isActive: false,
      isPremium: false,
      isSubscribed: false,
      expirationDate: null,
      productId: null,
      error: error.message,
      timestamp: new Date().toISOString()
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
    timestamp: new Date().toISOString()
  };
  
  // Handle case where user doesn't exist yet
  if (!subscriptionData.subscriber) {
    return status;
  }
  
  const { subscriber } = subscriptionData;
  
  // Check for premium entitlements
  if (subscriber.entitlements && subscriber.entitlements.premium) {
    const premium = subscriber.entitlements.premium;
    
    status.isPremium = true;
    status.productId = premium.product_identifier;
    status.expirationDate = premium.expires_date;
    
    // Check if subscription is currently active
    if (!premium.expires_date) {
      // No expiration date means lifetime or active subscription
      status.isActive = true;
      status.isSubscribed = true;
    } else {
      // Check if subscription hasn't expired
      const expirationTime = new Date(premium.expires_date).getTime();
      const currentTime = new Date().getTime();
      
      status.isActive = expirationTime > currentTime;
      status.isSubscribed = true;
    }
  }
  
  // Store original purchase date if available
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
    
    // Check if cache is still valid (not expired)
    if (Date.now() - parsed.cacheTime < SUBSCRIPTION_CACHE_DURATION) {
      return parsed.data;
    }
    
    // Cache expired, remove it
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
      cacheTime: Date.now()
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
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return false; // Default to no access on error
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
    
    // Clear session data
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
      ...subscriberData
    };
    
    const response = await makeRevenueCatRequest(`/subscribers/${userId}`, 'POST', data);
    
    // Clear cached status to force refresh
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    
    return {
      success: true,
      subscriber: response.subscriber,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Failed to create/update subscriber:', error);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
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
      ...eventData
    });
    
    // Here you could integrate with analytics services like Google Analytics,
    // Mixpanel, or other tracking platforms
    
  } catch (error) {
    console.error('Failed to log subscription event:', error);
  }
}

// Export all public functions for use in other components
export {
  initializeRevenueCat,
  checkSubscription,
  hasPremiumAccess,
  getCurrentUserId,
  clearUserData,
  createOrUpdateSubscriber,
  logSubscriptionEvent
};

// Auto-initialize when module is loaded
initializeRevenueCat()
  .then((result) => {
    if (result.success) {
      console.log('RevenueCat initialized successfully for user:', result.userId);
    } else {
      console.log('RevenueCat initialization failed, using mock mode:', result.error);
    }
  })
  .catch((error) => {
    console.error('RevenueCat initialization error:', error);
  });