/**
 * PayPal Integration for EduSphere AI
 * Handles subscription management and payments
 * World's Largest Hackathon Project - EduSphere AI
 */

import { getCurrentUserId, safeJsonParse } from './authUtils';

// PayPal configuration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'demo_client_id';
const PAYPAL_BASE_URL = import.meta.env.VITE_PAYPAL_SANDBOX === 'true' 
  ? 'https://api-m.sandbox.paypal.com' 
  : 'https://api-m.paypal.com';

// Cache for subscription status
const SUBSCRIPTION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let subscriptionCache = null;
let cacheTimestamp = 0;

// PayPal SDK initialization state
let paypalSDKLoaded = false;
let paypalSDKPromise = null;

/**
 * Initialize PayPal SDK
 * @returns {Promise<void>} Promise that resolves when PayPal SDK is loaded
 */
export async function initializePayPal() {
  // Return existing promise if already loading
  if (paypalSDKPromise) {
    return paypalSDKPromise;
  }

  // Return immediately if already loaded
  if (paypalSDKLoaded && window.paypal) {
    return Promise.resolve();
  }

  // Create new promise for SDK loading
  paypalSDKPromise = new Promise((resolve, reject) => {
    try {
      // Check if PayPal script already exists
      const existingScript = document.querySelector('script[src*="paypal.com/sdk/js"]');
      if (existingScript) {
        if (window.paypal) {
          paypalSDKLoaded = true;
          resolve();
          return;
        }
        // Script exists but PayPal not loaded yet, wait for it
        existingScript.addEventListener('load', () => {
          paypalSDKLoaded = true;
          resolve();
        });
        existingScript.addEventListener('error', reject);
        return;
      }

      // Create and load PayPal SDK script
      const script = document.createElement('script');
      script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
      script.async = true;
      
      script.onload = () => {
        if (window.paypal) {
          paypalSDKLoaded = true;
          resolve();
        } else {
          reject(new Error('PayPal SDK loaded but window.paypal is not available'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load PayPal SDK'));
      };

      // Add script to document head
      document.head.appendChild(script);
      
    } catch (error) {
      reject(error);
    }
  });

  return paypalSDKPromise;
}

/**
 * Safe fetch with JSON parsing
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<object>} Response data
 */
async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    let responseData;
    const responseText = await response.text();
    
    if (responseText) {
      responseData = safeJsonParse(responseText, { error: 'Invalid JSON response' });
    } else {
      responseData = { error: 'Empty response' };
    }

    return {
      ok: response.ok,
      status: response.status,
      data: responseData
    };
  } catch (error) {
    console.error('Fetch error:', error);
    return {
      ok: false,
      status: 0,
      data: { error: error.message || 'Network error' }
    };
  }
}

/**
 * Check if user has active subscription
 * @returns {Promise<boolean>} True if user has active subscription
 */
export async function hasActiveSubscription() {
  try {
    // Check cache first
    const now = Date.now();
    if (subscriptionCache && (now - cacheTimestamp) < SUBSCRIPTION_CACHE_DURATION) {
      return subscriptionCache.isActive || false;
    }

    const userId = await getCurrentUserId();
    
    // Call Netlify function to check subscription
    const result = await safeFetch('/.netlify/functions/paypal-subscription', {
      method: 'POST',
      body: JSON.stringify({
        action: 'check_subscription',
        user_id: userId
      })
    });

    let isActive = false;
    
    if (result.ok && result.data && !result.data.error) {
      isActive = result.data.isActive || result.data.has_subscription || false;
    } else {
      console.warn('Subscription check failed:', result.data?.error || 'Unknown error');
    }

    // Cache the result
    subscriptionCache = { isActive, timestamp: now };
    cacheTimestamp = now;

    return isActive;

  } catch (error) {
    console.error('Error checking subscription:', error);
    return false; // Default to no subscription on error
  }
}

/**
 * Create PayPal subscription
 * @param {object} options - Subscription options
 * @param {string} options.planId - PayPal plan ID
 * @param {string} options.userId - User ID
 * @param {string} options.planType - Plan type (monthly, yearly, etc.)
 * @returns {Promise<object>} Subscription creation result
 */
export async function createSubscription(options) {
  try {
    const { planId, userId, planType } = options;
    const actualUserId = userId || await getCurrentUserId();
    
    const result = await safeFetch('/.netlify/functions/paypal-subscription', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_subscription',
        plan_id: planId,
        user_id: actualUserId,
        plan_type: planType
      })
    });

    if (result.ok && result.data && !result.data.error) {
      // Clear cache on successful subscription creation
      subscriptionCache = null;
      cacheTimestamp = 0;
      
      return {
        success: true,
        subscription_id: result.data.subscription_id,
        approval_url: result.data.approval_url
      };
    } else {
      throw new Error(result.data?.error || 'Failed to create subscription');
    }

  } catch (error) {
    console.error('Error creating subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to create subscription'
    };
  }
}

/**
 * Create one-time payment
 * @param {object} options - Payment options
 * @param {number} options.amount - Payment amount
 * @param {string} options.currency - Currency code (default: USD)
 * @param {string} options.description - Payment description
 * @param {string} options.userId - User ID
 * @param {string} options.planType - Plan type
 * @returns {Promise<object>} Payment creation result
 */
export async function createOneTimePayment(options) {
  try {
    const { 
      amount, 
      currency = 'USD', 
      description = 'EduSphere AI Payment',
      userId,
      planType
    } = options;
    
    const actualUserId = userId || await getCurrentUserId();
    
    const result = await safeFetch('/.netlify/functions/paypal-subscription', {
      method: 'POST',
      body: JSON.stringify({
        action: 'create_payment',
        amount: amount,
        currency: currency,
        description: description,
        user_id: actualUserId,
        plan_type: planType
      })
    });

    if (result.ok && result.data && !result.data.error) {
      return {
        success: true,
        payment_id: result.data.payment_id,
        approval_url: result.data.approval_url
      };
    } else {
      throw new Error(result.data?.error || 'Failed to create payment');
    }

  } catch (error) {
    console.error('Error creating payment:', error);
    return {
      success: false,
      error: error.message || 'Failed to create payment'
    };
  }
}

/**
 * Cancel subscription
 * @param {string} subscriptionId - PayPal subscription ID
 * @returns {Promise<object>} Cancellation result
 */
export async function cancelSubscription(subscriptionId) {
  try {
    const userId = await getCurrentUserId();
    
    const result = await safeFetch('/.netlify/functions/paypal-subscription', {
      method: 'POST',
      body: JSON.stringify({
        action: 'cancel_subscription',
        subscription_id: subscriptionId,
        user_id: userId
      })
    });

    if (result.ok && result.data && !result.data.error) {
      // Clear cache on successful cancellation
      subscriptionCache = null;
      cacheTimestamp = 0;
      
      return {
        success: true,
        message: 'Subscription cancelled successfully'
      };
    } else {
      throw new Error(result.data?.error || 'Failed to cancel subscription');
    }

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel subscription'
    };
  }
}

/**
 * Get subscription details
 * @returns {Promise<object>} Subscription details
 */
export async function getSubscriptionDetails() {
  try {
    const userId = await getCurrentUserId();
    
    const result = await safeFetch('/.netlify/functions/paypal-subscription', {
      method: 'POST',
      body: JSON.stringify({
        action: 'get_subscription_details',
        user_id: userId
      })
    });

    if (result.ok && result.data && !result.data.error) {
      return {
        success: true,
        subscription: result.data.subscription
      };
    } else {
      throw new Error(result.data?.error || 'Failed to get subscription details');
    }

  } catch (error) {
    console.error('Error getting subscription details:', error);
    return {
      success: false,
      error: error.message || 'Failed to get subscription details'
    };
  }
}

/**
 * Clear subscription cache
 */
export function clearSubscriptionCache() {
  subscriptionCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if PayPal SDK is loaded
 * @returns {boolean} True if PayPal SDK is loaded
 */
export function isPayPalSDKLoaded() {
  return paypalSDKLoaded && window.paypal;
}

// Export for backward compatibility
export { hasActiveSubscription as hasPremiumAccess };