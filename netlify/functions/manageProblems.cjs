/**
 * EduSphere AI Problems Management Netlify Function
 * Handles user progress tracking and subscription management with Neon database
 * World's Largest Hackathon Project - EduSphere AI
 */

const { neon } = require('@neondatabase/serverless');

// Neon database configuration
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Initialize database tables if they don't exist
 * Creates both user_progress and subscriptions tables
 */
async function initializeTables() {
  try {
    console.log('Initializing database tables...');

    // Create user_progress table
    await sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        total_attempted INTEGER DEFAULT 0,
        total_correct INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subject, grade)
      )
    `;

    // Create subscriptions table for RevenueCat integration
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        revenuecat_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'free',
        is_active BOOLEAN DEFAULT FALSE,
        product_id VARCHAR(255),
        expires_at TIMESTAMP,
        trial_ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create recent_attempts table for detailed tracking
    await sql`
      CREATE TABLE IF NOT EXISTS recent_attempts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        user_answer TEXT,
        correct_answer TEXT,
        is_correct BOOLEAN NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX(user_id, attempted_at)
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_id ON subscriptions(revenuecat_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_recent_attempts_user_id ON recent_attempts(user_id)
    `;

    console.log('Database tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
}

/**
 * Get user progress data from database
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User progress data
 */
async function getUserProgress(userId) {
  try {
    console.log('Fetching user progress for:', userId);

    // Get aggregated progress by subject and grade
    const progressData = await sql`
      SELECT 
        subject,
        grade,
        total_attempted,
        total_correct,
        last_activity
      FROM user_progress 
      WHERE user_id = ${userId}
      ORDER BY subject, grade
    `;

    // Get recent attempts (last 10)
    const recentAttempts = await sql`
      SELECT 
        subject,
        grade,
        question,
        user_answer,
        correct_answer,
        is_correct,
        attempted_at
      FROM recent_attempts 
      WHERE user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 10
    `;

    // Calculate overall statistics
    const overallStats = await sql`
      SELECT 
        COALESCE(SUM(total_attempted), 0) as total_attempted,
        COALESCE(SUM(total_correct), 0) as total_correct
      FROM user_progress 
      WHERE user_id = ${userId}
    `;

    // Format response data
    const formattedProgress = {
      totalAttempted: parseInt(overallStats[0]?.total_attempted || 0),
      totalCorrect: parseInt(overallStats[0]?.total_correct || 0),
      bySubject: {},
      recentAttempts: recentAttempts.map(attempt => ({
        subject: attempt.subject,
        grade: attempt.grade,
        question: attempt.question,
        userAnswer: attempt.user_answer,
        correctAnswer: attempt.correct_answer,
        correct: attempt.is_correct,
        timestamp: new Date(attempt.attempted_at).getTime(),
      })),
    };

    // Group progress by subject
    const subjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
    const grades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];

    subjects.forEach(subject => {
      formattedProgress.bySubject[subject] = {
        totalAttempted: 0,
        totalCorrect: 0,
        byGrade: {},
      };

      grades.forEach(grade => {
        formattedProgress.bySubject[subject].byGrade[grade] = {
          totalAttempted: 0,
          totalCorrect: 0,
        };
      });
    });

    // Populate with actual data
    progressData.forEach(row => {
      const subject = row.subject;
      const grade = row.grade;
      
      if (formattedProgress.bySubject[subject]) {
        formattedProgress.bySubject[subject].totalAttempted += parseInt(row.total_attempted);
        formattedProgress.bySubject[subject].totalCorrect += parseInt(row.total_correct);
        
        if (formattedProgress.bySubject[subject].byGrade[grade]) {
          formattedProgress.bySubject[subject].byGrade[grade].totalAttempted = parseInt(row.total_attempted);
          formattedProgress.bySubject[subject].byGrade[grade].totalCorrect = parseInt(row.total_correct);
        }
      }
    });

    return formattedProgress;

  } catch (error) {
    console.error('Failed to get user progress:', error);
    throw error;
  }
}

/**
 * Update user progress in database
 * @param {string} userId - User identifier
 * @param {Object} progressData - Progress data to update
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProgress(userId, progressData) {
  try {
    console.log('Updating user progress for:', userId, progressData);

    const { subject, grade, correct, question, userAnswer, correctAnswer } = progressData;

    // Update or insert progress record
    await sql`
      INSERT INTO user_progress (user_id, subject, grade, total_attempted, total_correct, last_activity, updated_at)
      VALUES (${userId}, ${subject}, ${grade}, 1, ${correct ? 1 : 0}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, subject, grade)
      DO UPDATE SET
        total_attempted = user_progress.total_attempted + 1,
        total_correct = user_progress.total_correct + ${correct ? 1 : 0},
        last_activity = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    // Record the specific attempt
    await sql`
      INSERT INTO recent_attempts (
        user_id, subject, grade, question, user_answer, correct_answer, is_correct, attempted_at
      ) VALUES (
        ${userId}, ${subject}, ${grade}, ${question}, ${userAnswer}, ${correctAnswer}, ${correct}, CURRENT_TIMESTAMP
      )
    `;

    // Clean up old attempts (keep only last 50 per user)
    await sql`
      DELETE FROM recent_attempts 
      WHERE user_id = ${userId} 
      AND id NOT IN (
        SELECT id FROM recent_attempts 
        WHERE user_id = ${userId} 
        ORDER BY attempted_at DESC 
        LIMIT 50
      )
    `;

    console.log('User progress updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user progress:', error);
    throw error;
  }
}

/**
 * Get subscription data for a user
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Subscription data
 */
async function getSubscriptionData(userId) {
  try {
    console.log('Fetching subscription data for user:', userId);

    const subscriptionData = await sql`
      SELECT 
        user_id,
        revenuecat_id,
        status,
        is_active,
        product_id,
        expires_at,
        trial_ends_at,
        created_at,
        updated_at
      FROM subscriptions 
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (subscriptionData.length === 0) {
      // Return default free subscription
      return {
        user_id: userId,
        revenuecat_id: null,
        status: 'free',
        is_active: false,
        product_id: null,
        expires_at: null,
        trial_ends_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }

    const subscription = subscriptionData[0];
    return {
      user_id: subscription.user_id,
      revenuecat_id: subscription.revenuecat_id,
      status: subscription.status,
      is_active: subscription.is_active,
      product_id: subscription.product_id,
      expires_at: subscription.expires_at,
      trial_ends_at: subscription.trial_ends_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    };

  } catch (error) {
    console.error('Failed to get subscription data:', error);
    throw error;
  }
}

/**
 * Update subscription data from RevenueCat webhook
 * @param {Object} webhookData - RevenueCat webhook payload
 * @returns {Promise<boolean>} Success status
 */
async function updateSubscriptionFromWebhook(webhookData) {
  try {
    console.log('Processing RevenueCat webhook:', webhookData.event?.type);

    const { event } = webhookData;
    if (!event || !event.app_user_id) {
      throw new Error('Invalid webhook data: missing event or app_user_id');
    }

    const userId = event.app_user_id;
    const eventType = event.type;
    
    // Extract subscription information
    let subscriptionStatus = 'free';
    let isActive = false;
    let productId = null;
    let expiresAt = null;
    let trialEndsAt = null;
    let revenuecatId = event.original_app_user_id || userId;

    // Process different event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        break;

      case 'CANCELLATION':
        subscriptionStatus = 'cancelled';
        isActive = false;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          // Keep active until expiration date
          isActive = expiresAt ? new Date(expiresAt) > new Date() : false;
        }
        break;

      case 'EXPIRATION':
        subscriptionStatus = 'expired';
        isActive = false;
        break;

      case 'BILLING_ISSUE':
        subscriptionStatus = 'billing_issue';
        isActive = false;
        break;

      case 'SUBSCRIBER_ALIAS':
        // Handle user ID changes
        revenuecatId = event.new_app_user_id;
        break;

      default:
        console.log('Unhandled webhook event type:', eventType);
        return true; // Don't fail on unknown events
    }

    // Update or insert subscription record
    await sql`
      INSERT INTO subscriptions (
        user_id, revenuecat_id, status, is_active, product_id, expires_at, trial_ends_at, updated_at
      ) VALUES (
        ${userId}, ${revenuecatId}, ${subscriptionStatus}, ${isActive}, ${productId}, ${expiresAt}, ${trialEndsAt}, CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        revenuecat_id = ${revenuecatId},
        status = ${subscriptionStatus},
        is_active = ${isActive},
        product_id = ${productId},
        expires_at = ${expiresAt},
        trial_ends_at = ${trialEndsAt},
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log('Subscription updated successfully for user:', userId);
    return true;

  } catch (error) {
    console.error('Failed to update subscription from webhook:', error);
    throw error;
  }
}

/**
 * Validate request parameters
 * @param {Object} body - Request body
 * @param {string} method - HTTP method
 * @returns {Object} Validation result
 */
function validateRequest(body, method) {
  const errors = [];

  if (method === 'PUT') {
    // Validate progress update request
    if (!body.subject || typeof body.subject !== 'string') {
      errors.push('Subject is required and must be a string');
    }

    if (!body.grade || typeof body.grade !== 'string') {
      errors.push('Grade is required and must be a string');
    }

    if (typeof body.correct !== 'boolean') {
      errors.push('Correct field is required and must be a boolean');
    }

    if (!body.question || typeof body.question !== 'string') {
      errors.push('Question is required and must be a string');
    }

    if (!body.userAnswer || typeof body.userAnswer !== 'string') {
      errors.push('User answer is required and must be a string');
    }

    if (!body.correctAnswer || typeof body.correctAnswer !== 'string') {
      errors.push('Correct answer is required and must be a string');
    }
  } else if (method === 'POST') {
    // Validate webhook request
    if (!body.event || typeof body.event !== 'object') {
      errors.push('Event data is required for webhook processing');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Problems Management function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  try {
    // Initialize database tables
    await initializeTables();

    // Get user ID from headers or query parameters
    const userId = event.headers['x-user-id'] || 
                  event.headers['X-User-ID'] || 
                  event.queryStringParameters?.user_id;

    // Handle GET requests - fetch user progress
    if (event.httpMethod === 'GET') {
      if (!userId) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID is required',
          }),
        };
      }

      try {
        const progressData = await getUserProgress(userId);
        const subscriptionData = await getSubscriptionData(userId);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            data: {
              progress: progressData,
              subscription: subscriptionData,
            },
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch user data:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch user data',
            message: error.message,
          }),
        };
      }
    }

    // Handle PUT requests - update user progress
    if (event.httpMethod === 'PUT') {
      if (!userId) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID is required',
          }),
        };
      }

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
          }),
        };
      }

      // Validate request
      const validation = validateRequest(requestBody, 'PUT');
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

      try {
        await updateUserProgress(userId, requestBody);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            message: 'Progress updated successfully',
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to update progress:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to update progress',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - RevenueCat webhook
    if (event.httpMethod === 'POST') {
      let webhookData;
      try {
        webhookData = JSON.parse(event.body || '{}');
      } catch (error) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid JSON in webhook payload',
          }),
        };
      }

      // Validate webhook data
      const validation = validateRequest(webhookData, 'POST');
      if (!validation.isValid) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Invalid webhook payload',
            details: validation.errors,
          }),
        };
      }

      try {
        await updateSubscriptionFromWebhook(webhookData);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            message: 'Webhook processed successfully',
            event_type: webhookData.event?.type,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to process webhook:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process webhook',
            message: error.message,
          }),
        };
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed',
        allowed_methods: ['GET', 'PUT', 'POST'],
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
        message: 'An unexpected error occurred while processing your request',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};