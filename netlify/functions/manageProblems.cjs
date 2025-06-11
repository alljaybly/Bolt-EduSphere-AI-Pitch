/**
 * EduSphere AI Problems Management Netlify Function
 * Handles user progress tracking and subscription management with Neon database
 * Supports RevenueCat webhooks and comprehensive user data management
 * World's Largest Hackathon Project - EduSphere AI
 */

const { neon } = require('@neondatabase/serverless');

// Neon database configuration
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);

// RevenueCat configuration for webhook validation
const REVENUECAT_API_KEY = 'sk_5b90f0883a3b75fcee4c72d14d73a042b325f02f554f0b04';

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
 * Creates user_progress, recent_attempts, and subscriptions tables
 */
async function initializeTables() {
  try {
    console.log('Initializing database tables...');

    // Create user_progress table for tracking learning progress
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

    // Create recent_attempts table for detailed activity tracking
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
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
        original_purchase_date TIMESTAMP,
        last_webhook_event VARCHAR(100),
        webhook_processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_subject_grade ON user_progress(subject, grade)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recent_attempts_user_id ON recent_attempts(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recent_attempts_attempted_at ON recent_attempts(attempted_at)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_id ON subscriptions(revenuecat_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status, is_active)
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
 * Retrieves comprehensive learning analytics for a user
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User progress data with statistics
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
        last_activity,
        created_at
      FROM user_progress 
      WHERE user_id = ${userId}
      ORDER BY subject, grade
    `;

    // Get recent attempts (last 20 for detailed view)
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
      LIMIT 20
    `;

    // Calculate overall statistics
    const overallStats = await sql`
      SELECT 
        COALESCE(SUM(total_attempted), 0) as total_attempted,
        COALESCE(SUM(total_correct), 0) as total_correct
      FROM user_progress 
      WHERE user_id = ${userId}
    `;

    // Get subject-wise statistics
    const subjectStats = await sql`
      SELECT 
        subject,
        SUM(total_attempted) as subject_attempted,
        SUM(total_correct) as subject_correct,
        COUNT(DISTINCT grade) as grades_covered
      FROM user_progress 
      WHERE user_id = ${userId}
      GROUP BY subject
    `;

    // Format response data
    const formattedProgress = {
      totalAttempted: parseInt(overallStats[0]?.total_attempted || 0),
      totalCorrect: parseInt(overallStats[0]?.total_correct || 0),
      overallAccuracy: 0,
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
      subjectSummary: {}
    };

    // Calculate overall accuracy
    if (formattedProgress.totalAttempted > 0) {
      formattedProgress.overallAccuracy = 
        ((formattedProgress.totalCorrect / formattedProgress.totalAttempted) * 100).toFixed(1);
    }

    // Initialize subject structure
    const subjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
    const grades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];

    subjects.forEach(subject => {
      formattedProgress.bySubject[subject] = {
        totalAttempted: 0,
        totalCorrect: 0,
        accuracy: 0,
        byGrade: {},
      };

      grades.forEach(grade => {
        formattedProgress.bySubject[subject].byGrade[grade] = {
          totalAttempted: 0,
          totalCorrect: 0,
          accuracy: 0,
        };
      });
    });

    // Populate with actual progress data
    progressData.forEach(row => {
      const subject = row.subject;
      const grade = row.grade;
      const attempted = parseInt(row.total_attempted);
      const correct = parseInt(row.total_correct);
      
      if (formattedProgress.bySubject[subject]) {
        formattedProgress.bySubject[subject].totalAttempted += attempted;
        formattedProgress.bySubject[subject].totalCorrect += correct;
        
        if (formattedProgress.bySubject[subject].byGrade[grade]) {
          formattedProgress.bySubject[subject].byGrade[grade].totalAttempted = attempted;
          formattedProgress.bySubject[subject].byGrade[grade].totalCorrect = correct;
          
          // Calculate grade-specific accuracy
          if (attempted > 0) {
            formattedProgress.bySubject[subject].byGrade[grade].accuracy = 
              ((correct / attempted) * 100).toFixed(1);
          }
        }
      }
    });

    // Calculate subject-level accuracy and create summary
    subjects.forEach(subject => {
      const subjectData = formattedProgress.bySubject[subject];
      if (subjectData.totalAttempted > 0) {
        subjectData.accuracy = ((subjectData.totalCorrect / subjectData.totalAttempted) * 100).toFixed(1);
      }
      
      // Find matching subject stats
      const stats = subjectStats.find(s => s.subject === subject);
      formattedProgress.subjectSummary[subject] = {
        attempted: subjectData.totalAttempted,
        correct: subjectData.totalCorrect,
        accuracy: subjectData.accuracy,
        gradesCovered: stats ? parseInt(stats.grades_covered) : 0
      };
    });

    return formattedProgress;

  } catch (error) {
    console.error('Failed to get user progress:', error);
    throw error;
  }
}

/**
 * Update user progress in database
 * Records a new learning attempt and updates statistics
 * @param {string} userId - User identifier
 * @param {Object} progressData - Progress data to update
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProgress(userId, progressData) {
  try {
    console.log('Updating user progress for:', userId, progressData);

    const { subject, grade, correct, question, userAnswer, correctAnswer } = progressData;

    // Start a transaction for data consistency
    await sql.begin(async (sql) => {
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

      // Clean up old attempts (keep only last 100 per user for performance)
      await sql`
        DELETE FROM recent_attempts 
        WHERE user_id = ${userId} 
        AND id NOT IN (
          SELECT id FROM recent_attempts 
          WHERE user_id = ${userId} 
          ORDER BY attempted_at DESC 
          LIMIT 100
        )
      `;
    });

    console.log('User progress updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user progress:', error);
    throw error;
  }
}

/**
 * Get subscription data for a user
 * Retrieves current subscription status from Neon database
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
        original_purchase_date,
        last_webhook_event,
        webhook_processed_at,
        created_at,
        updated_at
      FROM subscriptions 
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (subscriptionData.length === 0) {
      // Return default free subscription for new users
      return {
        user_id: userId,
        revenuecat_id: null,
        status: 'free',
        is_active: false,
        product_id: null,
        expires_at: null,
        trial_ends_at: null,
        original_purchase_date: null,
        last_webhook_event: null,
        webhook_processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isNewUser: true
      };
    }

    const subscription = subscriptionData[0];
    
    // Check if subscription is still active based on expiration
    let actuallyActive = subscription.is_active;
    if (subscription.expires_at) {
      const now = new Date();
      const expirationDate = new Date(subscription.expires_at);
      actuallyActive = actuallyActive && (expirationDate > now);
    }

    return {
      user_id: subscription.user_id,
      revenuecat_id: subscription.revenuecat_id,
      status: subscription.status,
      is_active: actuallyActive,
      product_id: subscription.product_id,
      expires_at: subscription.expires_at,
      trial_ends_at: subscription.trial_ends_at,
      original_purchase_date: subscription.original_purchase_date,
      last_webhook_event: subscription.last_webhook_event,
      webhook_processed_at: subscription.webhook_processed_at,
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
 * Processes webhook events and updates subscription status
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
    
    // Extract subscription information from webhook
    let subscriptionStatus = 'free';
    let isActive = false;
    let productId = null;
    let expiresAt = null;
    let trialEndsAt = null;
    let originalPurchaseDate = null;
    let revenuecatId = event.original_app_user_id || userId;

    // Process different webhook event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          originalPurchaseDate = premium.purchase_date;
        }
        
        console.log('Processing initial purchase for user:', userId);
        break;

      case 'RENEWAL':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing renewal for user:', userId);
        break;

      case 'PRODUCT_CHANGE':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing product change for user:', userId);
        break;

      case 'CANCELLATION':
        subscriptionStatus = 'cancelled';
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          // Keep active until expiration date
          isActive = expiresAt ? new Date(expiresAt) > new Date() : false;
        } else {
          isActive = false;
        }
        
        console.log('Processing cancellation for user:', userId, 'Active until:', expiresAt);
        break;

      case 'EXPIRATION':
        subscriptionStatus = 'expired';
        isActive = false;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing expiration for user:', userId);
        break;

      case 'BILLING_ISSUE':
        subscriptionStatus = 'billing_issue';
        isActive = false;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing billing issue for user:', userId);
        break;

      case 'SUBSCRIBER_ALIAS':
        // Handle user ID changes - update the revenuecat_id
        revenuecatId = event.new_app_user_id;
        
        // Keep existing subscription status
        const existingSubscription = await getSubscriptionData(userId);
        subscriptionStatus = existingSubscription.status;
        isActive = existingSubscription.is_active;
        productId = existingSubscription.product_id;
        expiresAt = existingSubscription.expires_at;
        
        console.log('Processing subscriber alias change for user:', userId, 'New ID:', revenuecatId);
        break;

      case 'TRIAL_STARTED':
        subscriptionStatus = 'trial';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          trialEndsAt = premium.expires_date;
        }
        
        console.log('Processing trial start for user:', userId);
        break;

      case 'TRIAL_CONVERTED':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          originalPurchaseDate = premium.purchase_date;
        }
        
        console.log('Processing trial conversion for user:', userId);
        break;

      case 'TRIAL_CANCELLED':
        subscriptionStatus = 'trial_cancelled';
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          trialEndsAt = premium.expires_date;
          // Keep active until trial ends
          isActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
        } else {
          isActive = false;
        }
        
        console.log('Processing trial cancellation for user:', userId);
        break;

      default:
        console.log('Unhandled webhook event type:', eventType);
        // Don't fail on unknown events, just log them
        return true;
    }

    // Update or insert subscription record in database
    await sql`
      INSERT INTO subscriptions (
        user_id, 
        revenuecat_id, 
        status, 
        is_active, 
        product_id, 
        expires_at, 
        trial_ends_at, 
        original_purchase_date,
        last_webhook_event,
        webhook_processed_at,
        updated_at
      ) VALUES (
        ${userId}, 
        ${revenuecatId}, 
        ${subscriptionStatus}, 
        ${isActive}, 
        ${productId}, 
        ${expiresAt}, 
        ${trialEndsAt}, 
        ${originalPurchaseDate},
        ${eventType},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        revenuecat_id = ${revenuecatId},
        status = ${subscriptionStatus},
        is_active = ${isActive},
        product_id = ${productId},
        expires_at = ${expiresAt},
        trial_ends_at = ${trialEndsAt},
        original_purchase_date = COALESCE(${originalPurchaseDate}, subscriptions.original_purchase_date),
        last_webhook_event = ${eventType},
        webhook_processed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log('Subscription updated successfully for user:', userId, 'Status:', subscriptionStatus, 'Active:', isActive);
    return true;

  } catch (error) {
    console.error('Failed to update subscription from webhook:', error);
    throw error;
  }
}

/**
 * Get subscription statistics for analytics
 * @returns {Promise<Object>} Subscription statistics
 */
async function getSubscriptionStats() {
  try {
    const stats = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `;

    const totalUsers = await sql`
      SELECT COUNT(DISTINCT user_id) as total FROM subscriptions
    `;

    const activeSubscriptions = await sql`
      SELECT COUNT(*) as active FROM subscriptions WHERE is_active = true AND status != 'free'
    `;

    return {
      byStatus: stats.map(row => ({
        status: row.status,
        total: parseInt(row.count),
        active: parseInt(row.active_count)
      })),
      totalUsers: parseInt(totalUsers[0]?.total || 0),
      activeSubscriptions: parseInt(activeSubscriptions[0]?.active || 0),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to get subscription stats:', error);
    throw error;
  }
}

/**
 * Validate request parameters based on HTTP method
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

    // Validate subject and grade values
    const validSubjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
    const validGrades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];

    if (!validSubjects.includes(body.subject)) {
      errors.push(`Invalid subject. Must be one of: ${validSubjects.join(', ')}`);
    }

    if (!validGrades.includes(body.grade)) {
      errors.push(`Invalid grade. Must be one of: ${validGrades.join(', ')}`);
    }

  } else if (method === 'POST') {
    // Validate webhook request
    if (!body.event || typeof body.event !== 'object') {
      errors.push('Event data is required for webhook processing');
    } else {
      if (!body.event.type || typeof body.event.type !== 'string') {
        errors.push('Event type is required in webhook data');
      }

      if (!body.event.app_user_id || typeof body.event.app_user_id !== 'string') {
        errors.push('App user ID is required in webhook data');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
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
  const userId = requestBody.userId || 
                 event.headers['x-user-id'] || 
                 event.headers['X-User-ID'] ||
                 event.queryStringParameters?.user_id ||
                 event.queryStringParameters?.userId;
  
  return userId || null;
}

/**
 * Main Netlify function handler
 * Handles user progress tracking, subscription management, and RevenueCat webhooks
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Problems Management function invoked:', {
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

  try {
    // Initialize database tables
    await initializeTables();

    // Handle GET requests - fetch user progress and subscription data
    if (event.httpMethod === 'GET') {
      const userId = extractUserId(event, {});
      const action = event.queryStringParameters?.action;

      // Handle subscription statistics request (admin/analytics)
      if (action === 'subscription-stats') {
        try {
          const stats = await getSubscriptionStats();

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              data: stats,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to fetch subscription stats:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to fetch subscription statistics',
              message: error.message,
            }),
          };
        }
      }

      // Regular user data request
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
            usage: 'Include user ID in X-User-ID header or user_id query parameter'
          }),
        };
      }

      try {
        // Fetch both progress and subscription data
        const [progressData, subscriptionData] = await Promise.all([
          getUserProgress(userId),
          getSubscriptionData(userId)
        ]);

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
      const userId = extractUserId(event, {});

      if (!userId) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID is required for progress updates',
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

    // Handle POST requests - RevenueCat webhook processing
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
            user_id: webhookData.event?.app_user_id,
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
        allowed_methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
        usage: {
          GET: 'Fetch user progress and subscription data',
          PUT: 'Update user learning progress',
          POST: 'Process RevenueCat webhooks'
        }
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
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `manage_problems_${Date.now()}`
        }
      }),
    };
  }
};