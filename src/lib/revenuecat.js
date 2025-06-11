/**
 * RevenueCat Integration for EduSphere AI (Client-Side)
 * Handles user identification and communicates with backend for subscription checks
 * World's Largest Hackathon Project - EduSphere AI
 */

// RevenueCat configuration - Using public key for client-side usage
// TODO: Replace with your actual public API key from RevenueCat dashboard (starts with pk_)
const REVENUECAT_PUBLIC_KEY = 'pk_your_public_key_here';

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
 * Get mock subscription data for fallback scenarios
 * Used when backend is unavailable or for development
 * @returns {Object} Mock subscription data structure
 */
function getMockSubscriptionData() {
  return {
    isActive: false,
    isPremium: false,
    isSubscribed: false,
    expirationDate: null,
    productId: null,
    originalPurchaseDate: null,
    isMockData: true,
    timestamp: new Date().toISOString()
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
    
    // Check if public API key is configured
    if (REVENUECAT_PUBLIC_KEY === 'pk_your_public_key_here') {
      console.warn('RevenueCat public API key not configured, using mock mode');
      window.revenueCatMockMode = true;
    }
    
    // Get or create anonymous user ID
    const userId = getUserId();
    
    // Store initialization status globally
    window.revenueCatInitialized = true;
    window.revenueCatUserId = userId;
    
    return {
      success: true,
      userId: userId,
      initialized: true,
      mockMode: window.revenueCatMockMode || false,
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
 * Check current subscription status for the user via backend function
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
    
    // Use mock data if RevenueCat is in mock mode
    if (window.revenueCatMockMode) {
      const mockStatus = getMockSubscriptionData();
      cacheSubscriptionStatus(mockStatus);
      return mockStatus;
    }
    
    // Call backend function to check subscription securely
    try {
      const response = await fetch('/.netlify/functions/checkSubscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': userId
        },
        body: JSON.stringify({
          user_id: userId
        })
      });
      
      if (!response.ok) {
        throw new Error(`Backend subscription check failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Cache the result for future use
        cacheSubscriptionStatus(result.data);
        return result.data;
      } else {
        throw new Error(result.error || 'Subscription check failed');
      }
      
    } catch (backendError) {
      console.error('Backend subscription check failed:', backendError);
      
      // Fallback to mock data if backend is unavailable
      const fallbackStatus = getMockSubscriptionData();
      fallbackStatus.error = backendError.message;
      return fallbackStatus;
    }
    
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
  logSubscriptionEvent
};

// Auto-initialize when module is loaded
initializeRevenueCat()
  .then((result) => {
    if (result.success) {
      console.log('RevenueCat initialized successfully for user:', result.userId);
      if (result.mockMode) {
        console.log('Running in mock mode - configure RevenueCat public key for production');
      }
    } else {
      console.log('RevenueCat initialization failed, using mock mode:', result.error);
    }
  })
  .catch((error) => {
    console.error('RevenueCat initialization error:', error);
  });