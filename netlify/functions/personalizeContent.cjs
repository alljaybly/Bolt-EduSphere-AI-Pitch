/**
 * Personalized Content Generation Netlify Function with Claude Sonnet 4
 * Analyzes user progress and generates tailored learning recommendations
 * World's Largest Hackathon Project - EduSphere AI
 */

const { neon } = require('@neondatabase/serverless');
const https = require('https');
const { URL } = require('url');

// Neon database configuration
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);

// Claude Sonnet 4 API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

// RevenueCat configuration for subscription verification
const REVENUECAT_API_KEY = 'sk_5b90f0883a3b75fcee4c72d14d73a042b325f02f554f0b04';
const REVENUECAT_BASE_URL = 'https://api.revenuecat.com/v1';

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Make HTTP request using Node.js built-in modules
 * Compatible with Netlify Functions serverless environment
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {string|Buffer} data - Request body data
 * @returns {Promise<Object>} Response data with status and headers
 */
function makeHttpRequest(url, options = {}, data = null) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = https.request(requestOptions, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        try {
          // Parse JSON response if content-type indicates JSON
          const parsedData = res.headers['content-type']?.includes('application/json') 
            ? JSON.parse(responseData) 
            : responseData;
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: parsedData,
          });
        } catch (error) {
          reject(new Error(`Failed to parse response: ${error.message}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(new Error(`Request failed: ${error.message}`));
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

/**
 * Initialize database tables if they don't exist
 * Creates user_preferences table for personalized learning
 */
async function initializeTables() {
  try {
    console.log('Initializing personalization tables...');

    // Create user_preferences table for storing learning preferences
    await sql`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        preferred_subject VARCHAR(50),
        preferred_difficulty INTEGER DEFAULT 1,
        learning_style VARCHAR(50) DEFAULT 'balanced',
        focus_areas JSONB DEFAULT '[]',
        weak_areas JSONB DEFAULT '[]',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_preferences_subject ON user_preferences(preferred_subject)
    `;

    console.log('Personalization tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize personalization tables:', error);
    throw error;
  }
}

/**
 * Check user's subscription status via RevenueCat REST API
 * Determines if user has premium access for personalized content
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Subscription status with premium access info
 */
async function checkSubscriptionStatus(userId) {
  try {
    console.log('Checking RevenueCat subscription status for user:', userId);

    // Handle missing or invalid user ID
    if (!userId || userId === '[Not provided]' || userId === 'undefined') {
      console.log('No valid user ID provided, treating as free user');
      return {
        isPremium: false,
        isActive: false,
        error: 'No valid user ID provided',
        userId: userId
      };
    }

    // Make request to RevenueCat API
    const url = `${REVENUECAT_BASE_URL}/subscribers/${encodeURIComponent(userId)}`;
    const options = {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Platform': 'web',
      },
    };

    const response = await makeHttpRequest(url, options);

    // Handle different response status codes
    if (response.statusCode === 404) {
      // User not found in RevenueCat - treat as free user
      console.log('User not found in RevenueCat, treating as free user');
      return {
        isPremium: false,
        isActive: false,
        isNewUser: true,
        userId: userId
      };
    }

    if (response.statusCode === 200 && response.data) {
      const { subscriber } = response.data;
      
      // Check for premium entitlements
      if (subscriber && subscriber.entitlements) {
        const premiumEntitlement = subscriber.entitlements.premium;
        
        if (premiumEntitlement) {
          // Check if subscription is active (not expired)
          const isActive = !premiumEntitlement.expires_date || 
                          new Date(premiumEntitlement.expires_date) > new Date();
          
          console.log('Premium subscription found:', {
            isActive,
            expiresAt: premiumEntitlement.expires_date,
            productId: premiumEntitlement.product_identifier
          });
          
          return {
            isPremium: true,
            isActive,
            expirationDate: premiumEntitlement.expires_date,
            productId: premiumEntitlement.product_identifier,
            userId: userId
          };
        }
      }
    }

    // User exists but no premium subscription
    console.log('User found but no premium subscription');
    return {
      isPremium: false,
      isActive: false,
      userId: userId
    };

  } catch (error) {
    console.error('RevenueCat subscription check failed:', error.message);
    
    // On error, default to free tier for security
    return {
      isPremium: false,
      isActive: false,
      error: error.message,
      userId: userId
    };
  }
}

/**
 * Get user progress data from database
 * Retrieves comprehensive learning analytics for personalization
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User progress data with detailed analytics
 */
async function getUserProgressData(userId) {
  try {
    console.log('Fetching user progress data for:', userId);

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
      ORDER BY last_activity DESC
    `;

    // Get recent attempts for pattern analysis
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
      LIMIT 50
    `;

    // Calculate subject-wise performance metrics
    const subjectPerformance = {};
    const gradePerformance = {};
    let totalAttempted = 0;
    let totalCorrect = 0;

    progressData.forEach(row => {
      const subject = row.subject;
      const grade = row.grade;
      const attempted = parseInt(row.total_attempted);
      const correct = parseInt(row.total_correct);
      
      totalAttempted += attempted;
      totalCorrect += correct;
      
      // Subject-wise aggregation
      if (!subjectPerformance[subject]) {
        subjectPerformance[subject] = { attempted: 0, correct: 0, accuracy: 0 };
      }
      subjectPerformance[subject].attempted += attempted;
      subjectPerformance[subject].correct += correct;
      
      // Grade-wise aggregation
      if (!gradePerformance[grade]) {
        gradePerformance[grade] = { attempted: 0, correct: 0, accuracy: 0 };
      }
      gradePerformance[grade].attempted += attempted;
      gradePerformance[grade].correct += correct;
    });

    // Calculate accuracy percentages
    Object.keys(subjectPerformance).forEach(subject => {
      const perf = subjectPerformance[subject];
      perf.accuracy = perf.attempted > 0 ? (perf.correct / perf.attempted) * 100 : 0;
    });

    Object.keys(gradePerformance).forEach(grade => {
      const perf = gradePerformance[grade];
      perf.accuracy = perf.attempted > 0 ? (perf.correct / perf.attempted) * 100 : 0;
    });

    // Analyze learning patterns from recent attempts
    const learningPatterns = analyzeLearningPatterns(recentAttempts);

    return {
      totalAttempted,
      totalCorrect,
      overallAccuracy: totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0,
      subjectPerformance,
      gradePerformance,
      recentAttempts: recentAttempts.slice(0, 10), // Last 10 for analysis
      learningPatterns,
      lastActivity: progressData.length > 0 ? progressData[0].last_activity : null
    };

  } catch (error) {
    console.error('Failed to get user progress data:', error);
    throw error;
  }
}

/**
 * Analyze learning patterns from recent attempts
 * Identifies strengths, weaknesses, and learning trends
 * @param {Array} recentAttempts - Array of recent learning attempts
 * @returns {Object} Learning pattern analysis
 */
function analyzeLearningPatterns(recentAttempts) {
  const patterns = {
    strongSubjects: [],
    weakSubjects: [],
    improvingSubjects: [],
    strugglingSubjects: [],
    consistencyScore: 0,
    learningTrend: 'stable'
  };

  if (recentAttempts.length === 0) {
    return patterns;
  }

  // Group attempts by subject
  const subjectGroups = {};
  recentAttempts.forEach(attempt => {
    if (!subjectGroups[attempt.subject]) {
      subjectGroups[attempt.subject] = [];
    }
    subjectGroups[attempt.subject].push(attempt);
  });

  // Analyze each subject
  Object.keys(subjectGroups).forEach(subject => {
    const attempts = subjectGroups[subject];
    const correctCount = attempts.filter(a => a.is_correct).length;
    const accuracy = (correctCount / attempts.length) * 100;
    
    // Determine subject strength
    if (accuracy >= 80) {
      patterns.strongSubjects.push({ subject, accuracy, attempts: attempts.length });
    } else if (accuracy < 50) {
      patterns.weakSubjects.push({ subject, accuracy, attempts: attempts.length });
    }
    
    // Analyze trend (recent vs older attempts)
    if (attempts.length >= 4) {
      const recentHalf = attempts.slice(0, Math.floor(attempts.length / 2));
      const olderHalf = attempts.slice(Math.floor(attempts.length / 2));
      
      const recentAccuracy = (recentHalf.filter(a => a.is_correct).length / recentHalf.length) * 100;
      const olderAccuracy = (olderHalf.filter(a => a.is_correct).length / olderHalf.length) * 100;
      
      if (recentAccuracy > olderAccuracy + 10) {
        patterns.improvingSubjects.push({ subject, improvement: recentAccuracy - olderAccuracy });
      } else if (recentAccuracy < olderAccuracy - 10) {
        patterns.strugglingSubjects.push({ subject, decline: olderAccuracy - recentAccuracy });
      }
    }
  });

  // Calculate consistency score (0-100)
  const accuracies = Object.values(subjectGroups).map(attempts => {
    return (attempts.filter(a => a.is_correct).length / attempts.length) * 100;
  });
  
  if (accuracies.length > 1) {
    const mean = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
    const variance = accuracies.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / accuracies.length;
    patterns.consistencyScore = Math.max(0, 100 - Math.sqrt(variance));
  }

  return patterns;
}

/**
 * Get or create user preferences
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User preferences data
 */
async function getUserPreferences(userId) {
  try {
    console.log('Fetching user preferences for:', userId);

    // Try to get existing preferences
    const existingPrefs = await sql`
      SELECT 
        user_id,
        preferred_subject,
        preferred_difficulty,
        learning_style,
        focus_areas,
        weak_areas,
        updated_at,
        created_at
      FROM user_preferences 
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (existingPrefs.length > 0) {
      const prefs = existingPrefs[0];
      return {
        userId: prefs.user_id,
        preferredSubject: prefs.preferred_subject,
        preferredDifficulty: prefs.preferred_difficulty,
        learningStyle: prefs.learning_style,
        focusAreas: prefs.focus_areas || [],
        weakAreas: prefs.weak_areas || [],
        updatedAt: prefs.updated_at,
        createdAt: prefs.created_at
      };
    }

    // Create default preferences for new user
    const defaultPrefs = {
      userId,
      preferredSubject: 'math',
      preferredDifficulty: 1,
      learningStyle: 'balanced',
      focusAreas: [],
      weakAreas: []
    };

    await sql`
      INSERT INTO user_preferences (
        user_id, 
        preferred_subject, 
        preferred_difficulty, 
        learning_style,
        focus_areas,
        weak_areas,
        updated_at
      ) VALUES (
        ${userId}, 
        ${defaultPrefs.preferredSubject}, 
        ${defaultPrefs.preferredDifficulty}, 
        ${defaultPrefs.learningStyle},
        ${JSON.stringify(defaultPrefs.focusAreas)},
        ${JSON.stringify(defaultPrefs.weakAreas)},
        CURRENT_TIMESTAMP
      )
    `;

    console.log('Created default preferences for new user');
    return defaultPrefs;

  } catch (error) {
    console.error('Failed to get user preferences:', error);
    throw error;
  }
}

/**
 * Generate personalized learning recommendations using Claude Sonnet 4
 * Creates tailored content based on user progress and preferences
 * @param {Object} progressData - User's learning progress data
 * @param {Object} preferences - User's learning preferences
 * @param {string} requestedSubject - Specific subject requested (optional)
 * @param {string} requestedGrade - Specific grade requested (optional)
 * @returns {Promise<Object>} Personalized learning recommendations
 */
async function generatePersonalizedRecommendations(progressData, preferences, requestedSubject = null, requestedGrade = null) {
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured in environment variables');
    }

    console.log('Generating personalized recommendations with Claude Sonnet 4');

    // Construct detailed analysis prompt for Claude
    const analysisPrompt = `You are an expert educational AI tutor analyzing a student's learning progress to provide personalized recommendations.

STUDENT PROGRESS ANALYSIS:
- Total Problems Attempted: ${progressData.totalAttempted}
- Overall Accuracy: ${progressData.overallAccuracy.toFixed(1)}%
- Learning Consistency Score: ${progressData.learningPatterns.consistencyScore.toFixed(1)}/100

SUBJECT PERFORMANCE:
${Object.entries(progressData.subjectPerformance).map(([subject, perf]) => 
  `- ${subject}: ${perf.attempted} attempts, ${perf.accuracy.toFixed(1)}% accuracy`
).join('\n')}

LEARNING PATTERNS:
- Strong Subjects: ${progressData.learningPatterns.strongSubjects.map(s => s.subject).join(', ') || 'None identified yet'}
- Weak Subjects: ${progressData.learningPatterns.weakSubjects.map(s => s.subject).join(', ') || 'None identified yet'}
- Improving Subjects: ${progressData.learningPatterns.improvingSubjects.map(s => s.subject).join(', ') || 'None identified yet'}
- Struggling Subjects: ${progressData.learningPatterns.strugglingSubjects.map(s => s.subject).join(', ') || 'None identified yet'}

USER PREFERENCES:
- Preferred Subject: ${preferences.preferredSubject}
- Preferred Difficulty: ${preferences.preferredDifficulty}/5
- Learning Style: ${preferences.learningStyle}

REQUEST CONTEXT:
- Requested Subject: ${requestedSubject || 'Any suitable subject'}
- Requested Grade: ${requestedGrade || 'Based on performance level'}

TASK: Generate personalized learning recommendations including:
1. Next recommended lesson/topic with specific learning objectives
2. Difficulty level (1-5) based on current performance
3. 3-5 specific practice problems tailored to identified weak areas
4. Motivational message acknowledging progress and encouraging growth
5. Study tips specific to the student's learning patterns

Format your response as a structured JSON object with the following keys:
- nextLesson: {subject, topic, objectives, difficulty}
- practiceProblems: [{question, answer, hint, difficulty}]
- motivationalMessage: string
- studyTips: [string]
- focusAreas: [string]
- estimatedTime: string

Make recommendations age-appropriate and encouraging. Focus on building confidence while addressing weak areas.`;

    // Prepare Claude API request
    const url = `${ANTHROPIC_BASE_URL}/messages`;
    const requestData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
      system: 'You are an expert educational AI tutor specializing in personalized learning recommendations. Provide structured, actionable guidance based on student progress analysis.',
      messages: [
        {
          role: 'user',
          content: analysisPrompt
        }
      ]
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
    };

    // Make request to Claude API
    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200 && response.data) {
      const content = response.data.content?.[0]?.text;
      
      if (!content) {
        throw new Error('No content generated by Claude');
      }

      // Parse Claude's JSON response
      let recommendations;
      try {
        // Extract JSON from Claude's response (it might include extra text)
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          recommendations = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No valid JSON found in Claude response');
        }
      } catch (parseError) {
        console.error('Failed to parse Claude response as JSON:', parseError);
        // Fallback to structured text parsing
        recommendations = parseClaudeTextResponse(content);
      }

      console.log('Claude personalization successful:', {
        hasNextLesson: !!recommendations.nextLesson,
        problemCount: recommendations.practiceProblems?.length || 0,
        model: response.data.model
      });
      
      return {
        ...recommendations,
        generatedAt: new Date().toISOString(),
        model: 'claude-3-5-sonnet-20241022',
        basedOnAttempts: progressData.totalAttempted
      };

    } else {
      throw new Error(`Claude API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('Claude personalization failed:', error.message);
    
    // Generate fallback recommendations
    return generateFallbackRecommendations(progressData, preferences, requestedSubject, requestedGrade);
  }
}

/**
 * Parse Claude's text response when JSON parsing fails
 * @param {string} content - Claude's text response
 * @returns {Object} Parsed recommendations object
 */
function parseClaudeTextResponse(content) {
  // Basic fallback parsing for when Claude doesn't return valid JSON
  return {
    nextLesson: {
      subject: 'math',
      topic: 'Practice Problems',
      objectives: ['Improve problem-solving skills'],
      difficulty: 2
    },
    practiceProblems: [
      {
        question: 'Continue practicing to improve your skills!',
        answer: 'Keep learning',
        hint: 'Take your time and think step by step',
        difficulty: 2
      }
    ],
    motivationalMessage: 'Great job on your learning journey! Keep practicing and you\'ll continue to improve.',
    studyTips: [
      'Practice regularly for better retention',
      'Focus on understanding concepts, not just memorizing',
      'Take breaks when you feel overwhelmed'
    ],
    focusAreas: ['Problem solving', 'Concept understanding'],
    estimatedTime: '15-20 minutes'
  };
}

/**
 * Generate fallback recommendations when Claude is unavailable
 * @param {Object} progressData - User's progress data
 * @param {Object} preferences - User preferences
 * @param {string} requestedSubject - Requested subject
 * @param {string} requestedGrade - Requested grade
 * @returns {Object} Fallback recommendations
 */
function generateFallbackRecommendations(progressData, preferences, requestedSubject, requestedGrade) {
  console.log('Generating fallback recommendations');

  // Determine recommended subject based on performance
  let recommendedSubject = requestedSubject || preferences.preferredSubject;
  
  // If user has weak subjects, recommend practice in those areas
  if (progressData.learningPatterns.weakSubjects.length > 0) {
    recommendedSubject = progressData.learningPatterns.weakSubjects[0].subject;
  }

  // Determine difficulty based on performance
  let difficulty = preferences.preferredDifficulty;
  if (progressData.overallAccuracy > 80) {
    difficulty = Math.min(5, difficulty + 1);
  } else if (progressData.overallAccuracy < 50) {
    difficulty = Math.max(1, difficulty - 1);
  }

  return {
    nextLesson: {
      subject: recommendedSubject,
      topic: `${recommendedSubject.charAt(0).toUpperCase() + recommendedSubject.slice(1)} Practice`,
      objectives: [
        'Strengthen understanding of key concepts',
        'Improve problem-solving accuracy',
        'Build confidence through practice'
      ],
      difficulty
    },
    practiceProblems: [
      {
        question: `Practice problem for ${recommendedSubject}`,
        answer: 'Solution will be provided',
        hint: 'Take your time and think through each step',
        difficulty
      }
    ],
    motivationalMessage: progressData.totalAttempted > 0 
      ? `You've attempted ${progressData.totalAttempted} problems with ${progressData.overallAccuracy.toFixed(1)}% accuracy. Keep up the great work!`
      : 'Welcome to your personalized learning journey! Let\'s start with some practice problems.',
    studyTips: [
      'Practice a little bit each day for best results',
      'Don\'t be afraid to make mistakes - they help you learn',
      'Focus on understanding the process, not just the answer'
    ],
    focusAreas: progressData.learningPatterns.weakSubjects.length > 0 
      ? progressData.learningPatterns.weakSubjects.map(s => s.subject)
      : [recommendedSubject],
    estimatedTime: '10-15 minutes',
    fallback: true,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Update user preferences based on learning patterns
 * @param {string} userId - User identifier
 * @param {Object} learningPatterns - Analyzed learning patterns
 * @returns {Promise<boolean>} Success status
 */
async function updateUserPreferences(userId, learningPatterns) {
  try {
    console.log('Updating user preferences based on learning patterns');

    const focusAreas = learningPatterns.weakSubjects.map(s => s.subject);
    const weakAreas = learningPatterns.strugglingSubjects.map(s => s.subject);

    await sql`
      UPDATE user_preferences 
      SET 
        focus_areas = ${JSON.stringify(focusAreas)},
        weak_areas = ${JSON.stringify(weakAreas)},
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = ${userId}
    `;

    console.log('User preferences updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return false;
  }
}

/**
 * Validate personalization request parameters
 * @param {Object} body - Request body from client
 * @returns {Object} Validation result with errors if any
 */
function validateRequest(body) {
  const errors = [];

  // Validate user_id parameter
  if (!body.user_id || typeof body.user_id !== 'string') {
    errors.push('User ID is required and must be a string');
  }

  // Validate optional parameters
  if (body.subject && typeof body.subject !== 'string') {
    errors.push('Subject must be a string');
  }

  if (body.grade && typeof body.grade !== 'string') {
    errors.push('Grade must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors
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
  const userId = requestBody.user_id || 
                 event.headers['x-user-id'] || 
                 event.headers['X-User-ID'] ||
                 event.queryStringParameters?.user_id ||
                 event.queryStringParameters?.userId;
  
  return userId || null;
}

/**
 * Main Netlify function handler
 * Processes personalized content generation requests
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object with personalized recommendations
 */
exports.handler = async (event, context) => {
  console.log('Personalized Content function invoked:', {
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

  // Only allow POST requests for content personalization
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST for personalized content generation.',
        allowedMethods: ['POST', 'OPTIONS']
      }),
    };
  }

  try {
    // Check if database URL is configured
    if (!process.env.DATABASE_URL && !process.env.NEON_DATABASE_URL) {
      console.error('Database URL not configured');
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'Database configuration missing',
          message: 'DATABASE_URL or NEON_DATABASE_URL environment variable not set',
        }),
      };
    }

    // Initialize database tables
    await initializeTables();

    // Parse request body
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
          details: 'Request body must be valid JSON'
        }),
      };
    }

    // Validate request parameters
    const validation = validateRequest(requestBody);
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

    // Extract parameters from request
    const userId = extractUserId(event, requestBody);
    const requestedSubject = requestBody.subject;
    const requestedGrade = requestBody.grade;

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'User ID is required for personalized content generation',
        }),
      };
    }

    console.log('Processing personalization request:', {
      userId,
      requestedSubject,
      requestedGrade
    });

    // Check subscription status via RevenueCat
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    console.log('Subscription check result:', {
      isPremium: subscriptionStatus.isPremium,
      isActive: subscriptionStatus.isActive,
      hasError: !!subscriptionStatus.error,
      userId: subscriptionStatus.userId
    });

    // Get user progress data and preferences
    const [progressData, preferences] = await Promise.all([
      getUserProgressData(userId),
      getUserPreferences(userId)
    ]);

    // Generate personalized recommendations
    let recommendations;
    
    if (subscriptionStatus.isPremium && subscriptionStatus.isActive) {
      // Premium users get Claude Sonnet 4 powered recommendations
      console.log('User has premium access, generating AI-powered recommendations');
      recommendations = await generatePersonalizedRecommendations(
        progressData, 
        preferences, 
        requestedSubject, 
        requestedGrade
      );
    } else {
      // Free users get basic algorithmic recommendations
      console.log('User does not have premium access, providing basic recommendations');
      recommendations = generateFallbackRecommendations(
        progressData, 
        preferences, 
        requestedSubject, 
        requestedGrade
      );
    }

    // Update user preferences based on learning patterns
    await updateUserPreferences(userId, progressData.learningPatterns);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        data: {
          recommendations,
          progressSummary: {
            totalAttempted: progressData.totalAttempted,
            overallAccuracy: progressData.overallAccuracy,
            strongSubjects: progressData.learningPatterns.strongSubjects,
            weakSubjects: progressData.learningPatterns.weakSubjects,
            consistencyScore: progressData.learningPatterns.consistencyScore
          },
          preferences,
          isPremium: subscriptionStatus.isPremium && subscriptionStatus.isActive
        },
        timestamp: new Date().toISOString(),
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
        message: 'An unexpected error occurred while generating personalized content',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `personalize_${Date.now()}`
        }
      }),
    };
  }
};