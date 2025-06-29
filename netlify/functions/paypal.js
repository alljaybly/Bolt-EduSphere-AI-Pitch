import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// PayPal configuration
const PAYPAL_CLIENT_ID = process.env.VITE_PAYPAL_CLIENT_ID || 'Ac9SLHZByLNIrYdGQmWaTP3jED5AHKj4uy84NE91tHy0Il-rYMqe7JmoxjAtkkWn7yVRmQ9U8QUGTjhL';
const PAYPAL_SECRET_KEY = process.env.VITE_PAYPAL_SECRET_KEY || 'ELCJbX3h_VC0AkLE9TdExKArD-15tC6z7qGi1ypLKftDkAEO8CzdWju3WV024IKyXdBt5iykZXfvF1eT';
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
 * @returns {Promise<string>} Access token
 */
async function getPayPalAccessToken() {
  try {
    const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en_US',
        'Authorization': `Basic ${Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET_KEY}`).toString('base64')}`,
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
 * Create a one-time payment
 */
async function createPayment(paymentData) {
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
        return_url: paymentData.return_url || 'https://edusphere-ai.netlify.app/payment-success',
        cancel_url: paymentData.cancel_url || 'https://edusphere-ai.netlify.app/payment-cancel'
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

    return await response.json();
  } catch (error) {
    console.error('Failed to create PayPal payment:', error);
    throw error;
  }
}

/**
 * Capture a payment after approval
 */
async function capturePayment(orderId) {
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

    return await response.json();
  } catch (error) {
    console.error('Failed to capture PayPal payment:', error);
    throw error;
  }
}

/**
 * Create a subscription plan
 */
async function createSubscriptionPlan(planData) {
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
 * Create a subscription
 */
async function createSubscription(subscriptionData) {
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
        return_url: subscriptionData.return_url || 'https://edusphere-ai.netlify.app/subscription-success',
        cancel_url: subscriptionData.cancel_url || 'https://edusphere-ai.netlify.app/subscription-cancel'
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

    return await response.json();
  } catch (error) {
    console.error('Failed to create PayPal subscription:', error);
    throw error;
  }
}

/**
 * Get subscription details
 */
async function getSubscription(subscriptionId) {
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
 * Cancel a subscription
 */
async function cancelSubscription(subscriptionId, reason = 'User requested cancellation') {
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

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel PayPal subscription:', error);
    throw error;
  }
}

/**
 * Get payment details
 */
async function getPaymentDetails(orderId) {
  try {
    const accessToken = await getPayPalAccessToken();

    const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal order fetch failed: ${errorData.message || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to get PayPal payment details:', error);
    throw error;
  }
}

/**
 * Create a product (required for subscription plans)
 */
async function createProduct(productData) {
  try {
    const accessToken = await getPayPalAccessToken();

    const product = {
      name: productData.name || 'EduSphere AI Premium',
      description: productData.description || 'Premium access to all EduSphere AI features',
      type: 'SERVICE',
      category: 'EDUCATIONAL_AND_TEXTBOOKS',
      home_url: productData.home_url || 'https://edusphere-ai.netlify.app'
    };

    const response = await fetch(`${PAYPAL_BASE_URL}/v1/catalogs/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'PayPal-Request-Id': `product-${Date.now()}`
      },
      body: JSON.stringify(product)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`PayPal product creation failed: ${errorData.message || response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to create PayPal product:', error);
    throw error;
  }
}

/**
 * Main handler function
 */
export const handler = async (event, context) => {
  console.log('PayPal function invoked:', { 
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
    const { action } = requestBody;

    // Validate user ID if required for the action
    const userIdRequired = ['create_payment', 'create_subscription', 'cancel_subscription'].includes(action);
    const userId = event.headers['x-user-id'];

    if (userIdRequired && !userId) {
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
      case 'create_payment':
        const payment = await createPayment({
          amount: requestBody.amount,
          currency: requestBody.currency || 'USD',
          description: requestBody.description || 'EduSphere AI Premium Access',
          user_id: userId,
          reference_id: requestBody.reference_id || `edusphere_${Date.now()}`,
          return_url: requestBody.return_url,
          cancel_url: requestBody.cancel_url
        });

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            payment: payment,
            links: payment.links,
            id: payment.id
          })
        };

      case 'capture_payment':
        const captureResult = await capturePayment(requestBody.order_id);

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            capture: captureResult,
            status: captureResult.status
          })
        };

      case 'create_product':
        const product = await createProduct({
          name: requestBody.name,
          description: requestBody.description,
          home_url: requestBody.home_url
        });

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            product: product,
            id: product.id
          })
        };

      case 'create_plan':
        const plan = await createSubscriptionPlan({
          product_id: requestBody.product_id,
          name: requestBody.name,
          description: requestBody.description,
          amount: requestBody.amount,
          currency: requestBody.currency || 'USD',
          interval_unit: requestBody.interval_unit || 'MONTH',
          interval_count: requestBody.interval_count || 1,
          total_cycles: requestBody.total_cycles || 0
        });

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            plan: plan,
            id: plan.id
          })
        };

      case 'create_subscription':
        const subscription = await createSubscription({
          plan_id: requestBody.plan_id,
          user_id: userId,
          currency: requestBody.currency || 'USD',
          subscriber: requestBody.subscriber,
          return_url: requestBody.return_url,
          cancel_url: requestBody.cancel_url
        });

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            subscription: subscription,
            id: subscription.id,
            links: subscription.links
          })
        };

      case 'get_subscription':
        const subscriptionDetails = await getSubscription(requestBody.subscription_id);

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            subscription: subscriptionDetails,
            status: subscriptionDetails.status
          })
        };

      case 'cancel_subscription':
        const cancelResult = await cancelSubscription(
          requestBody.subscription_id,
          requestBody.reason || 'User requested cancellation'
        );

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            message: 'Subscription cancelled successfully'
          })
        };

      case 'get_payment_details':
        const paymentDetails = await getPaymentDetails(requestBody.order_id);

        return {
          statusCode: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            success: true,
            payment: paymentDetails,
            status: paymentDetails.status
          })
        };

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
    console.error('PayPal function error:', error);
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