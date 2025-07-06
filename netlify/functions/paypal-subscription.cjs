const { createClient } = require('@supabase/supabase-js');
       const fetch = require('node-fetch');
       const Sentry = require('@sentry/node');

       // Initialize Sentry
       Sentry.init({
         dsn: process.env.VITE_SENTRY_DSN || 'https://df5806fa12da19ec70b9390fe8ce70f6@o4508991941378048.ingest.de.sentry.io/4509513811951696',
         environment: process.env.NODE_ENV || 'production',
       });

       // PayPal configuration
       const PAYPAL_CLIENT_ID = process.env.VITE_PAYPAL_CLIENT_ID;
       const PAYPAL_CLIENT_SECRET = process.env.VITE_PAYPAL_SECRET_KEY;
       const PAYPAL_BASE_URL = process.env.PAYPAL_SANDBOX === 'true' 
         ? 'https://api-m.sandbox.paypal.com' 
         : 'https://api-m.paypal.com';

       // Supabase client
       const supabase = createClient(
         process.env.VITE_SUPABASE_URL,
         process.env.SUPABASE_SERVICE_ROLE_KEY
       );

       // CORS headers
       const corsHeaders = {
         'Access-Control-Allow-Origin': '*',
         'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
         'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
       };

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

       async function checkSubscription(userId) {
         try {
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

           // Check user's subscription in Supabase
           const { data: userData, error: userError } = await supabase
             .from('users')
             .select('is_premium, paypal_subscription_id')
             .eq('id', userId)
             .single();

           if (userError || !userData) {
             console.error('Failed to fetch user:', userError);
             return {
               isActive: false,
               has_subscription: false,
               error: 'User not found'
             };
           }

           if (!userData.paypal_subscription_id) {
             return {
               isActive: false,
               has_subscription: false,
               status: 'inactive',
               message: 'No subscription found'
             };
           }

           const response = await fetch(`${PAYPAL_BASE_URL}/v1/billing/subscriptions/${userData.paypal_subscription_id}`, {
             headers: {
               'Authorization': `Bearer ${accessToken}`,
               'Content-Type': 'application/json'
             }
           });

           const responseText = await response.text();
           const data = safeJsonParse(responseText);

           if (!response.ok) {
             console.error('PayPal subscription check failed:', response.status, data);
             return {
               isActive: false,
               has_subscription: true,
               subscription_id: userData.paypal_subscription_id,
               error: data?.message || 'Failed to check subscription'
             };
           }

           return {
             isActive: data.status === 'ACTIVE',
             has_subscription: true,
             subscription_id: userData.paypal_subscription_id,
             status: data.status
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
               return_url: `${process.env.URL || 'https://adorable-gingersnap-818b08.netlify.app'}/subscription/success`,
               cancel_url: `${process.env.URL || 'https://adorable-gingersnap-818b08.netlify.app'}/subscription/cancel`
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

           // Update user in Supabase
           const { error: updateError } = await supabase
             .from('users')
             .update({
               is_premium: true,
               paypal_subscription_id: data.id
             })
             .eq('id', userId);

           if (updateError) {
             console.error('Failed to update user:', updateError);
             return {
               success: false,
               error: 'Failed to update user subscription'
             };
           }

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

       exports.handler = async (event, context) => {
         console.log('PayPal subscription function invoked:', {
           method: event.httpMethod,
           path: event.path,
           hasBody: !!event.body
         });

         if (event.httpMethod === 'OPTIONS') {
           return createJsonResponse({}, 200);
         }

         if (event.httpMethod !== 'POST') {
           return createJsonResponse({
             success: false,
             error: 'Method not allowed'
           }, 405);
         }

         try {
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
               
               return createJsonResponse({
                 success: true,
                 message: 'Subscription cancellation requested'
               });

             case 'create_payment':
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