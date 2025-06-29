/**
 * PayPal Integration for EduSphere AI
 * Handles both one-time payments and subscription management
 * World's Largest Hackathon Project - EduSphere AI
 */

// PayPal configuration
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'Ac9SLHZByLNIrYdGQmWaTP3jED5AHKj4uy84NE91tHy0Il-rYMqe7JmoxjAtkkWn7yVRmQ9U8QUGTjhL';
const PAYPAL_CLIENT_SECRET = import.meta.env.VITE_PAYPAL_CLIENT_SECRET || 'ELCJbX3h_VC0AkLE9TdExKArD-15tC6z7qGi1ypLKftDkAEO8CzdWju3WV024IKyXdBt5iykZXfvF1eT';
const PAYPAL_BASE_URL = import.meta.env.NODE_ENV === 'production' 
  ? 'https://api-m.paypal.com' 
  : 'https://api-m.sandbox.paypal.com';

// Local storage keys for PayPal data
const PAYPAL_ACCESS_TOKEN_KEY = 'edusphere_paypal_token';
const SUBSCRIPTION_STATUS_KEY = 'edusphere_paypal_subscription';
const PAYMENT_HISTORY_KEY = 'edusphere_paypal_payments';

/**
 * Get PayPal access token
 * @returns {Promise<string>} Access token
 */
async function getPayPalAccessToken() {
  try {
    // Check for cached token
    const cachedToken = localStorage.getItem(PAYPAL_ACCESS_TOKEN_KEY);
    if (cachedToken) {
      const tokenData = JSON.parse(cachedToken);
      if (Date.now() < tokenData.expires_at) {
        return tokenData.access_token;
      }
    }

    // Get new token
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${btoa(`${PAYPAL_CLIENT_ID}:${PAYPAL_CLIENT_SECRET}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`PayPal auth failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Cache token with expiration
    const tokenData = {
      access_token: data.access_token,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000 // 1 minute buffer
    };
    
    localStorage.setItem(PAYPAL_ACCESS_TOKEN_KEY, JSON.stringify(tokenData));
    
    return data.access_token;
  } catch (error) {
    console.error('Failed to get PayPal access token:', error);
    throw error;
  }
}

/**
 * Create PayPal payment for one-time purchase
 * @param {Object} paymentData - Payment details
 * @returns {Promise<Object>} Payment creation result
 */
async function createPayPalPayment(paymentData) {
  try {
    const accessToken = await getPayPalAccessToken();
    
    const payment = {
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: paymentData.reference_id || `edusphere_${Date.now()}`,
        amount: {
          currency_code: paymentData.currency || 'USD',
          value: paymentData.amount.toString()
        },
        description: paymentData.description || 'EduSphere AI Premium Features',
        custom_id: paymentData.user_id,
        invoice_id: `INV-${Date.now()}`,
        soft_descriptor: 'EDUSPHERE AI'
      }],
      application_context: {
        brand_name: 'EduSphere AI',
        locale: 'en-US',
        landing_page: 'BILLING',
        shipping_preference: 'NO_SHIPPING',
        user_action: 'PAY_NOW',
        return_url: `${window.location.origin}/payment-success`,
        cancel_url: `${window.location.origin}/payment-cancel`
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `edusphere-${Date.now()}`
      },
      body: JSON.stringify(payment)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal payment creation failed: ${errorData.message || response.status}`);
    }

    const result = await response.json();
    
    // Store payment info locally
    const paymentHistory = getPaymentHistory();
    paymentHistory.push({
      id: result.id,
      status: result.status,
      amount: paymentData.amount,
      currency: paymentData.currency || 'USD',
      description: paymentData.description,
      created_at: new Date().toISOString(),
      type: 'one-time'
    });
    localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(paymentHistory));

    return result;
  } catch (error) {
    console.error('Failed to create PayPal payment:', error);
    throw error;
  }
}

/**
 * Capture PayPal payment after approval
 * @param {string} orderId - PayPal order ID
 * @returns {Promise<Object>} Capture result
 */
async function capturePayPalPayment(orderId) {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `capture-${Date.now()}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal capture failed: ${errorData.message || response.status}`);
    }

    const result = await response.json();
    
    // Update payment history
    const paymentHistory = getPaymentHistory();
    const paymentIndex = paymentHistory.findIndex(p => p.id === orderId);
    if (paymentIndex !== -1) {
      paymentHistory[paymentIndex].status = result.status;
      paymentHistory[paymentIndex].captured_at = new Date().toISOString();
      localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(paymentHistory));
    }

    return result;
  } catch (error) {
    console.error('Failed to capture PayPal payment:', error);
    throw error;
  }
}

/**
 * Create PayPal subscription plan
 * @param {Object} planData - Subscription plan details
 * @returns {Promise<Object>} Plan creation result
 */
async function createPayPalSubscriptionPlan(planData) {
  try {
    const accessToken = await getPayPalAccessToken();

    const plan = {
      product_id: planData.product_id || 'EDUSPHERE_PREMIUM',
      name: planData.name || 'EduSphere AI Premium',
      description: planData.description || 'Premium access to all EduSphere AI features',
      status: 'ACTIVE',
      billing_cycles: [{
        frequency: {
          interval_unit: planData.interval_unit || 'MONTH',
          interval_count: planData.interval_count || 1
        },
        tenure_type: 'REGULAR',
        sequence: 1,
        total_cycles: planData.total_cycles || 0, // 0 = infinite
        pricing_scheme: {
          fixed_price: {
            value: planData.amount.toString(),
            currency_code: planData.currency || 'USD'
          }
        }
      }],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee: {
          value: '0',
          currency_code: planData.currency || 'USD'
        },
        setup_fee_failure_action: 'CONTINUE',
        payment_failure_threshold: 3
      },
      taxes: {
        percentage: '0',
        inclusive: false
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/plans`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `plan-${Date.now()}`
      },
      body: JSON.stringify(plan)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal plan creation failed: ${errorData.message || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create PayPal subscription plan:', error);
    throw error;
  }
}

/**
 * Create PayPal subscription
 * @param {Object} subscriptionData - Subscription details
 * @returns {Promise<Object>} Subscription creation result
 */
async function createPayPalSubscription(subscriptionData) {
  try {
    const accessToken = await getPayPalAccessToken();

    const subscription = {
      plan_id: subscriptionData.plan_id,
      start_time: new Date(Date.now() + 60000).toISOString(), // Start in 1 minute
      quantity: '1',
      shipping_amount: {
        currency_code: subscriptionData.currency || 'USD',
        value: '0.00'
      },
      subscriber: {
        name: {
          given_name: subscriptionData.subscriber?.first_name || 'EduSphere',
          surname: subscriptionData.subscriber?.last_name || 'User'
        },
        email_address: subscriptionData.subscriber?.email || 'user@edusphere.ai'
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
        return_url: `${window.location.origin}/subscription-success`,
        cancel_url: `${window.location.origin}/subscription-cancel`
      }
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `sub-${Date.now()}`
      },
      body: JSON.stringify(subscription)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal subscription creation failed: ${errorData.message || response.status}`);
    }

    const result = await response.json();
    
    // Store subscription info
    const subscriptionInfo = {
      id: result.id,
      status: result.status,
      plan_id: subscriptionData.plan_id,
      created_at: new Date().toISOString(),
      user_id: subscriptionData.user_id
    };
    localStorage.setItem(SUBSCRIPTION_STATUS_KEY, JSON.stringify(subscriptionInfo));

    return result;
  } catch (error) {
    console.error('Failed to create PayPal subscription:', error);
    throw error;
  }
}

/**
 * Get PayPal subscription details
 * @param {string} subscriptionId - Subscription ID
 * @returns {Promise<Object>} Subscription details
 */
async function getPayPalSubscription(subscriptionId) {
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
      const errorData = await response.json();
      throw new Error(`PayPal subscription fetch failed: ${errorData.message || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get PayPal subscription:', error);
    throw error;
  }
}

/**
 * Cancel PayPal subscription
 * @param {string} subscriptionId - Subscription ID
 * @param {string} reason - Cancellation reason
 * @returns {Promise<boolean>} Success status
 */
async function cancelPayPalSubscription(subscriptionId, reason = 'User requested cancellation') {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        reason: reason
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal subscription cancellation failed: ${errorData.message || response.status}`);
    }

    // Update local subscription status
    const subscriptionInfo = getSubscriptionStatus();
    if (subscriptionInfo) {
      subscriptionInfo.status = 'CANCELLED';
      subscriptionInfo.cancelled_at = new Date().toISOString();
      localStorage.setItem(SUBSCRIPTION_STATUS_KEY, JSON.stringify(subscriptionInfo));
    }

    return true;
  } catch (error) {
    console.error('Failed to cancel PayPal subscription:', error);
    throw error;
  }
}

/**
 * Check if user has active subscription
 * @returns {Promise<boolean>} Active subscription status
 */
async function hasActiveSubscription() {
  try {
    const subscriptionInfo = getSubscriptionStatus();
    
    if (!subscriptionInfo || !subscriptionInfo.id) {
      return false;
    }

    // Check with PayPal API for current status
    const subscription = await getPayPalSubscription(subscriptionInfo.id);
    
    const activeStatuses = ['ACTIVE', 'APPROVED'];
    const isActive = activeStatuses.includes(subscription.status);
    
    // Update local status
    subscriptionInfo.status = subscription.status;
    subscriptionInfo.last_checked = new Date().toISOString();
    localStorage.setItem(SUBSCRIPTION_STATUS_KEY, JSON.stringify(subscriptionInfo));
    
    return isActive;
  } catch (error) {
    console.error('Failed to check subscription status:', error);
    return false;
  }
}

/**
 * Get subscription status from local storage
 * @returns {Object|null} Subscription status
 */
function getSubscriptionStatus() {
  try {
    const stored = localStorage.getItem(SUBSCRIPTION_STATUS_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch (error) {
    console.error('Failed to get subscription status:', error);
    return null;
  }
}

/**
 * Get payment history from local storage
 * @returns {Array} Payment history
 */
function getPaymentHistory() {
  try {
    const stored = localStorage.getItem(PAYMENT_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to get payment history:', error);
    return [];
  }
}

/**
 * Initialize PayPal SDK
 * @returns {Promise<Object>} PayPal SDK instance
 */
async function initializePayPalSDK() {
  return new Promise((resolve, reject) => {
    if (window.paypal) {
      resolve(window.paypal);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&vault=true&intent=subscription`;
    script.onload = () => {
      if (window.paypal) {
        resolve(window.paypal);
      } else {
        reject(new Error('PayPal SDK failed to load'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.head.appendChild(script);
  });
}

/**
 * Create PayPal button for one-time payment
 * @param {string} containerId - Container element ID
 * @param {Object} paymentData - Payment configuration
 * @returns {Promise<void>}
 */
async function createPayPalPaymentButton(containerId, paymentData) {
  try {
    const paypal = await initializePayPalSDK();
    
    return paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'blue',
        layout: 'vertical',
        label: 'paypal'
      },
      createOrder: async (data, actions) => {
        const payment = await createPayPalPayment(paymentData);
        return payment.id;
      },
      onApprove: async (data, actions) => {
        const capture = await capturePayPalPayment(data.orderID);
        
        if (capture.status === 'COMPLETED') {
          // Handle successful payment
          if (paymentData.onSuccess) {
            paymentData.onSuccess(capture);
          }
        }
        
        return capture;
      },
      onError: (err) => {
        console.error('PayPal payment error:', err);
        if (paymentData.onError) {
          paymentData.onError(err);
        }
      },
      onCancel: (data) => {
        console.log('PayPal payment cancelled:', data);
        if (paymentData.onCancel) {
          paymentData.onCancel(data);
        }
      }
    }).render(`#${containerId}`);
  } catch (error) {
    console.error('Failed to create PayPal payment button:', error);
    throw error;
  }
}

/**
 * Create PayPal button for subscription
 * @param {string} containerId - Container element ID
 * @param {Object} subscriptionData - Subscription configuration
 * @returns {Promise<void>}
 */
async function createPayPalSubscriptionButton(containerId, subscriptionData) {
  try {
    const paypal = await initializePayPalSDK();
    
    return paypal.Buttons({
      style: {
        shape: 'rect',
        color: 'blue',
        layout: 'vertical',
        label: 'subscribe'
      },
      createSubscription: async (data, actions) => {
        const subscription = await createPayPalSubscription(subscriptionData);
        return subscription.id;
      },
      onApprove: async (data, actions) => {
        const subscription = await getPayPalSubscription(data.subscriptionID);
        
        if (subscription.status === 'ACTIVE') {
          // Handle successful subscription
          if (subscriptionData.onSuccess) {
            subscriptionData.onSuccess(subscription);
          }
        }
        
        return subscription;
      },
      onError: (err) => {
        console.error('PayPal subscription error:', err);
        if (subscriptionData.onError) {
          subscriptionData.onError(err);
        }
      },
      onCancel: (data) => {
        console.log('PayPal subscription cancelled:', data);
        if (subscriptionData.onCancel) {
          subscriptionData.onCancel(data);
        }
      }
    }).render(`#${containerId}`);
  } catch (error) {
    console.error('Failed to create PayPal subscription button:', error);
    throw error;
  }
}

/**
 * Clear PayPal data (for logout/reset)
 */
function clearPayPalData() {
  try {
    localStorage.removeItem(PAYPAL_ACCESS_TOKEN_KEY);
    localStorage.removeItem(SUBSCRIPTION_STATUS_KEY);
    localStorage.removeItem(PAYMENT_HISTORY_KEY);
    console.log('PayPal data cleared');
  } catch (error) {
    console.error('Failed to clear PayPal data:', error);
  }
}

// Export functions
export {
  getPayPalAccessToken,
  createPayPalPayment,
  capturePayPalPayment,
  createPayPalSubscriptionPlan,
  createPayPalSubscription,
  getPayPalSubscription,
  cancelPayPalSubscription,
  hasActiveSubscription,
  getSubscriptionStatus,
  getPaymentHistory,
  initializePayPalSDK,
  createPayPalPaymentButton,
  createPayPalSubscriptionButton,
  clearPayPalData
};

// Auto-initialize on import
console.log('PayPal integration initialized for EduSphere AI');