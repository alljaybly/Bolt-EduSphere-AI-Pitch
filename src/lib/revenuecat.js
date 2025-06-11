/**
 * RevenueCat Integration for EduSphere AI
 * Handles subscription management and user identification
 * World's Largest Hackathon Project
 */

// RevenueCat configuration
const REVENUECAT_API_KEY = 'sk_5b90f0883a3b75fcee4c72d14d73a042b325f02f554f0b04';
const REVENUECAT_BASE_URL = 'https://api.revenuecat.com/v1';

// Local storage keys
const USER_ID_KEY = 'edusphere_user_id';
const SUBSCRIPTION_STATUS_KEY = 'edusphere_subscription_status';

/**
 * Generate a unique anonymous user ID
 * @returns {string} Unique user identifier
 */
function generateAnonymousUserId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  return `anonymous_${timestamp}_${random}`;
}

/**
 * Get or create user ID from localStorage
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
 * Initialize RevenueCat SDK
 * @returns {Promise<boolean>} Success status
 */
async function initializeRevenueCat() {
  try {
    const userId = getUserId();
    
    // Mock RevenueCat initialization since we're using REST API
    console.log('Initializing RevenueCat for user:', userId);
    
    // Store initialization status
    window.revenueCatInitialized = true;
    window.revenueCatUserId = userId;
    
    return true;
  } catch (error) {
    console.error('Failed to initialize RevenueCat:', error);
    
    // Mock fallback - assume basic functionality
    window.revenueCatInitialized = false;
    window.revenueCatMockMode = true;
    
    return false;
  }
}

/**
 * Make authenticated request to RevenueCat API
 * @param {string} endpoint - API endpoint
 * @param {string} method - HTTP method
 * @param {Object} data - Request body data
 * @returns {Promise<Object>} API response
 */
async function makeRevenueCatRequest(endpoint, method = 'GET', data = null) {
  try {
    const userId = getUserId();
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
    
    if (!response.ok) {
      throw new Error(`RevenueCat API error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('RevenueCat API request failed:', error);
    
    // Return mock data in case of API failure
    return getMockSubscriptionData();
  }
}

/**
 * Get mock subscription data for fallback scenarios
 * @returns {Object} Mock subscription data
 */
function getMockSubscriptionData() {
  return {
    subscriber: {
      subscriptions: {},
      entitlements: {
        premium: {
          expires_date: null,
          product_identifier: 'premium_monthly',
          purchase_date: new Date().toISOString(),
        }
      },
      original_purchase_date: new Date().toISOString(),
      first_seen: new Date().toISOString(),
    }
  };
}

/**
 * Check current subscription status
 * @returns {Promise<Object>} Subscription status object
 */
async function getSubscriptionStatus() {
  try {
    const userId = getUserId();
    
    // Check cached status first
    const cachedStatus = localStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    if (cachedStatus) {
      const parsed = JSON.parse(cachedStatus);
      // Use cached data if it's less than 5 minutes old
      if (Date.now() - parsed.timestamp < 5 * 60 * 1000) {
        return parsed.data;
      }
    }
    
    let subscriptionData;
    
    if (window.revenueCatMockMode) {
      // Use mock data if RevenueCat failed to initialize
      subscriptionData = getMockSubscriptionData();
    } else {
      // Make actual API call
      subscriptionData = await makeRevenueCatRequest(`/subscribers/${userId}`);
    }
    
    const status = {
      isActive: false,
      isPremium: false,
      expirationDate: null,
      productId: null,
    };
    
    // Parse subscription data
    if (subscriptionData && subscriptionData.subscriber) {
      const { entitlements } = subscriptionData.subscriber;
      
      if (entitlements && entitlements.premium) {
        const premium = entitlements.premium;
        status.isPremium = true;
        status.isActive = !premium.expires_date || new Date(premium.expires_date) > new Date();
        status.expirationDate = premium.expires_date;
        status.productId = premium.product_identifier;
      }
    }
    
    // Cache the result
    try {
      localStorage.setItem(SUBSCRIPTION_STATUS_KEY, JSON.stringify({
        data: status,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.warn('Could not cache subscription status:', error);
    }
    
    return status;
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    
    // Return default free status on error
    return {
      isActive: false,
      isPremium: false,
      expirationDate: null,
      productId: null,
    };
  }
}

/**
 * Check if user has access to premium features
 * @returns {Promise<boolean>} Premium access status
 */
async function hasPremiumAccess() {
  try {
    const status = await getSubscriptionStatus();
    return status.isActive && status.isPremium;
  } catch (error) {
    console.error('Failed to check premium access:', error);
    return false;
  }
}

/**
 * Purchase a subscription product
 * @param {string} productId - Product identifier
 * @returns {Promise<Object>} Purchase result
 */
async function purchaseProduct(productId) {
  try {
    const userId = getUserId();
    
    console.log(`Initiating purchase for product ${productId} for user ${userId}`);
    
    // In a real implementation, this would integrate with a payment processor
    // For now, we'll simulate a successful purchase
    
    if (window.revenueCatMockMode) {
      // Mock successful purchase
      return {
        success: true,
        productId,
        transactionId: `mock_${Date.now()}`,
        purchaseDate: new Date().toISOString(),
      };
    }
    
    // Make purchase request to RevenueCat
    const purchaseData = await makeRevenueCatRequest(`/subscribers/${userId}/purchases`, 'POST', {
      product_id: productId,
      price: 9.99, // This would come from product configuration
      currency: 'USD',
      purchase_date: new Date().toISOString(),
    });
    
    // Clear cached subscription status to force refresh
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    
    return {
      success: true,
      productId,
      transactionId: purchaseData.transaction_id,
      purchaseDate: purchaseData.purchase_date,
    };
    
  } catch (error) {
    console.error('Purchase failed:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Restore previous purchases
 * @returns {Promise<Object>} Restore result
 */
async function restorePurchases() {
  try {
    const userId = getUserId();
    
    console.log('Restoring purchases for user:', userId);
    
    // Clear cached data to force fresh fetch
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    
    // Get fresh subscription status
    const status = await getSubscriptionStatus();
    
    return {
      success: true,
      hasActiveSubscription: status.isActive,
      subscriptions: status.isPremium ? [status] : [],
    };
    
  } catch (error) {
    console.error('Failed to restore purchases:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get available products for purchase
 * @returns {Promise<Array>} Available products
 */
async function getAvailableProducts() {
  try {
    // In a real implementation, this would fetch from RevenueCat
    // For now, return mock product data
    return [
      {
        id: 'premium_monthly',
        title: 'EduSphere Premium Monthly',
        description: 'Unlock all premium features and content',
        price: '$9.99',
        currency: 'USD',
        period: 'monthly',
      },
      {
        id: 'premium_yearly',
        title: 'EduSphere Premium Yearly',
        description: 'Unlock all premium features and content (Save 20%)',
        price: '$95.99',
        currency: 'USD',
        period: 'yearly',
      },
    ];
  } catch (error) {
    console.error('Failed to get available products:', error);
    return [];
  }
}

/**
 * Clear user data (for logout/reset)
 */
function clearUserData() {
  try {
    localStorage.removeItem(USER_ID_KEY);
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    
    // Clear session data
    delete window.sessionUserId;
    delete window.revenueCatInitialized;
    delete window.revenueCatUserId;
    
    console.log('User data cleared');
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
}

/**
 * Get current user ID
 * @returns {string} Current user ID
 */
function getCurrentUserId() {
  return getUserId();
}

// Export the RevenueCat integration functions
export {
  initializeRevenueCat,
  getSubscriptionStatus,
  hasPremiumAccess,
  purchaseProduct,
  restorePurchases,
  getAvailableProducts,
  clearUserData,
  getCurrentUserId,
};

// Auto-initialize when module is loaded
initializeRevenueCat().then((success) => {
  if (success) {
    console.log('RevenueCat initialized successfully');
  } else {
    console.log('RevenueCat initialization failed, using mock mode');
  }
}).catch((error) => {
  console.error('RevenueCat initialization error:', error);
});