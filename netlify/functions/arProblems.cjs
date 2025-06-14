/**
 * EduSphere AI AR Problems Netlify Function
 * Handles augmented reality problem generation and management using Supabase
 * Supports WebXR-based 3D problem solving with progress tracking
 * World's Largest Hackathon Project - EduSphere AI
 */

const { createClient } = require('@supabase/supabase-js');
const * = require('@sentry/node');

// Initialize Sentry for error monitoring
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
});

// Supabase configuration
const supabaseUrl = 'https://faphnxotbuwiwfatuok.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGhueG90YnV3aXdmYXR1b2siLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ5MjIwMTEzLCJleHAiOjIwNjQ3OTYxMTN9.Ej8nQJhQJGqkKJqKJqKJqKJqKJqKJqKJqKJqKJqKJqK';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * AR Problem templates for different object types and difficulty levels
 */
const AR_PROBLEM_TEMPLATES = {
  cube: {
    easy: [
      {
        question: 'How many faces does this cube have?',
        answer: '6',
        hint: 'Count each flat surface of the cube',
        explanation: 'A cube has 6 faces: top, bottom, front, back, left, and right.'
      },
      {
        question: 'How many corners (vertices) does this cube have?',
        answer: '8',
        hint: 'Count where the edges meet',
        explanation: 'A cube has 8 vertices where three edges meet at each corner.'
      },
      {
        question: 'How many edges does this cube have?',
        answer: '12',
        hint: 'Count the lines where faces meet',
        explanation: 'A cube has 12 edges where two faces meet.'
      }
    ],
    medium: [
      {
        question: 'If each edge of this cube is 3 units long, what is the volume?',
        answer: '27',
        hint: 'Volume = length × width × height',
        explanation: 'Volume of a cube = side³ = 3³ = 27 cubic units.'
      },
      {
        question: 'What is the surface area if each face is 4 square units?',
        answer: '24',
        hint: 'Add up the area of all faces',
        explanation: 'Surface area = 6 faces × 4 square units = 24 square units.'
      }
    ],
    hard: [
      {
        question: 'If you unfold this cube into a net, how many different nets are possible?',
        answer: '11',
        hint: 'Think about different ways to arrange 6 connected squares',
        explanation: 'There are exactly 11 distinct nets that can fold into a cube.'
      }
    ]
  },
  sphere: {
    easy: [
      {
        question: 'How many faces does this sphere have?',
        answer: '1',
        hint: 'A sphere is one continuous curved surface',
        explanation: 'A sphere has one continuous curved face with no edges or vertices.'
      },
      {
        question: 'How many edges does this sphere have?',
        answer: '0',
        hint: 'Look for straight lines where faces meet',
        explanation: 'A sphere has no edges because it is a smooth curved surface.'
      }
    ],
    medium: [
      {
        question: 'If the radius of this sphere is 3 units, what is the diameter?',
        answer: '6',
        hint: 'Diameter = 2 × radius',
        explanation: 'Diameter = 2 × radius = 2 × 3 = 6 units.'
      }
    ]
  },
  pyramid: {
    easy: [
      {
        question: 'How many faces does this triangular pyramid have?',
        answer: '4',
        hint: 'Count the triangular base and the three triangular sides',
        explanation: 'A triangular pyramid has 4 triangular faces: 1 base + 3 sides.'
      },
      {
        question: 'How many vertices does this triangular pyramid have?',
        answer: '4',
        hint: 'Count the corners including the top point',
        explanation: 'A triangular pyramid has 4 vertices: 3 on the base + 1 at the top.'
      }
    ],
    medium: [
      {
        question: 'How many edges does this triangular pyramid have?',
        answer: '6',
        hint: 'Count the edges of the base and the edges going to the top',
        explanation: 'A triangular pyramid has 6 edges: 3 on the base + 3 connecting to the apex.'
      }
    ]
  }
};

/**
 * Initialize AR problems table in Supabase
 */
async function initializeARProblemsTable() {
  try {
    console.log('Initializing AR problems table...');

    // Create ar_problems table
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'ar_problems',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        object_type VARCHAR(50) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        hint TEXT,
        explanation TEXT,
        difficulty VARCHAR(20) DEFAULT 'easy',
        grade_level VARCHAR(20) DEFAULT 'kindergarten',
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    if (error) {
      console.error('Error creating AR problems table:', error);
    }

    // Seed sample problems if table is empty
    await seedARProblems();

    console.log('AR problems table initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize AR problems table:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Seed AR problems table with sample data
 */
async function seedARProblems() {
  try {
    // Check if problems already exist
    const { data: existing } = await supabase
      .from('ar_problems')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('AR problems already seeded');
      return;
    }

    console.log('Seeding AR problems...');

    const problems = [];

    // Generate problems from templates
    Object.entries(AR_PROBLEM_TEMPLATES).forEach(([objectType, difficulties]) => {
      Object.entries(difficulties).forEach(([difficulty, problemList]) => {
        problemList.forEach(problem => {
          problems.push({
            object_type: objectType,
            question: problem.question,
            answer: problem.answer,
            hint: problem.hint,
            explanation: problem.explanation,
            difficulty: difficulty,
            grade_level: difficulty === 'easy' ? 'kindergarten' : difficulty === 'medium' ? 'grade1-6' : 'grade7-9'
          });
        });
      });
    });

    // Insert problems in batches
    const batchSize = 10;
    for (let i = 0; i < problems.length; i += batchSize) {
      const batch = problems.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('ar_problems')
        .insert(batch);

      if (error) {
        console.error('Error inserting AR problems batch:', error);
      }
    }

    console.log(`Seeded ${problems.length} AR problems`);

  } catch (error) {
    console.error('Failed to seed AR problems:', error);
    Sentry.captureException(error);
  }
}

/**
 * Get AR problems from Supabase
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Array of AR problems
 */
async function getARProblems(filters = {}) {
  try {
    const { 
      object_type, 
      difficulty, 
      grade_level, 
      limit = 10, 
      random = false 
    } = filters;

    console.log('Fetching AR problems with filters:', filters);

    let query = supabase
      .from('ar_problems')
      .select('*');

    // Apply filters
    if (object_type) {
      query = query.eq('object_type', object_type);
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (grade_level) {
      query = query.eq('grade_level', grade_level);
    }

    // Apply ordering and limit
    if (random) {
      // Note: Supabase doesn't have RANDOM() function, so we'll shuffle client-side
      query = query.limit(limit * 2); // Get more to shuffle
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching AR problems:', error);
      return [];
    }

    let problems = data || [];

    // Shuffle if random requested
    if (random && problems.length > 0) {
      problems = problems.sort(() => Math.random() - 0.5).slice(0, limit);
    }

    console.log(`Found ${problems.length} AR problems`);
    return problems;

  } catch (error) {
    console.error('Failed to get AR problems:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Create new AR problem
 * @param {Object} problemData - Problem data
 * @returns {Promise<Object|null>} Created problem or null
 */
async function createARProblem(problemData) {
  try {
    console.log('Creating new AR problem:', problemData);

    const { data, error } = await supabase
      .from('ar_problems')
      .insert({
        object_type: problemData.object_type,
        question: problemData.question,
        answer: problemData.answer,
        hint: problemData.hint,
        explanation: problemData.explanation,
        difficulty: problemData.difficulty || 'easy',
        grade_level: problemData.grade_level || 'kindergarten'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating AR problem:', error);
      return null;
    }

    console.log('AR problem created successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to create AR problem:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Save user's AR problem attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<boolean>} Success status
 */
async function saveARAttempt(attemptData) {
  try {
    console.log('Saving AR problem attempt:', attemptData);

    // Create ar_attempts table if it doesn't exist
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'ar_attempts',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        problem_id UUID NOT NULL,
        user_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_spent_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    const { error } = await supabase
      .from('ar_attempts')
      .insert({
        user_id: attemptData.user_id,
        problem_id: attemptData.problem_id,
        user_answer: attemptData.user_answer,
        is_correct: attemptData.is_correct,
        time_spent_seconds: attemptData.time_spent_seconds || 0
      });

    if (error) {
      console.error('Error saving AR attempt:', error);
      return false;
    }

    console.log('AR attempt saved successfully');
    return true;

  } catch (error) {
    console.error('Failed to save AR attempt:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Get user's AR progress
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User's AR progress data
 */
async function getUserARProgress(userId) {
  try {
    console.log('Fetching AR progress for user:', userId);

    const { data, error } = await supabase
      .from('ar_attempts')
      .select(`
        *,
        ar_problems (
          object_type,
          difficulty,
          grade_level
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching AR progress:', error);
      return {
        total_attempts: 0,
        correct_attempts: 0,
        accuracy: 0,
        by_object_type: {},
        by_difficulty: {},
        recent_attempts: []
      };
    }

    const attempts = data || [];
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    // Group by object type
    const byObjectType = {};
    attempts.forEach(attempt => {
      const objectType = attempt.ar_problems?.object_type || 'unknown';
      if (!byObjectType[objectType]) {
        byObjectType[objectType] = { total: 0, correct: 0 };
      }
      byObjectType[objectType].total++;
      if (attempt.is_correct) {
        byObjectType[objectType].correct++;
      }
    });

    // Group by difficulty
    const byDifficulty = {};
    attempts.forEach(attempt => {
      const difficulty = attempt.ar_problems?.difficulty || 'unknown';
      if (!byDifficulty[difficulty]) {
        byDifficulty[difficulty] = { total: 0, correct: 0 };
      }
      byDifficulty[difficulty].total++;
      if (attempt.is_correct) {
        byDifficulty[difficulty].correct++;
      }
    });

    return {
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      accuracy: Math.round(accuracy),
      by_object_type: byObjectType,
      by_difficulty: byDifficulty,
      recent_attempts: attempts.slice(0, 10)
    };

  } catch (error) {
    console.error('Failed to get user AR progress:', error);
    Sentry.captureException(error);
    return {
      total_attempts: 0,
      correct_attempts: 0,
      accuracy: 0,
      by_object_type: {},
      by_difficulty: {},
      recent_attempts: []
    };
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

  if (method === 'POST') {
    const action = body.action;

    if (action === 'create_problem') {
      if (!body.object_type || typeof body.object_type !== 'string') {
        errors.push('Object type is required and must be a string');
      }

      if (!body.question || typeof body.question !== 'string') {
        errors.push('Question is required and must be a string');
      }

      if (!body.answer || typeof body.answer !== 'string') {
        errors.push('Answer is required and must be a string');
      }

      if (body.difficulty && !['easy', 'medium', 'hard'].includes(body.difficulty)) {
        errors.push('Difficulty must be one of: easy, medium, hard');
      }

    } else if (action === 'submit_answer') {
      if (!body.problem_id || typeof body.problem_id !== 'string') {
        errors.push('Problem ID is required and must be a string');
      }

      if (!body.user_answer || typeof body.user_answer !== 'string') {
        errors.push('User answer is required and must be a string');
      }

      if (typeof body.is_correct !== 'boolean') {
        errors.push('is_correct is required and must be a boolean');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract user ID from request
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Request body
 * @returns {string|null} User ID
 */
function extractUserId(event, requestBody) {
  return requestBody?.user_id || 
         event.headers['x-user-id'] || 
         event.headers['X-User-ID'] ||
         event.queryStringParameters?.user_id ||
         null;
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('AR Problems function invoked:', {
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
    // Initialize tables
    await initializeARProblemsTable();

    // Handle GET requests - fetch AR problems
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      const userId = extractUserId(event, {});

      try {
        // Check if requesting user progress
        if (queryParams.action === 'progress' && userId) {
          const progress = await getUserARProgress(userId);
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              progress: progress,
              timestamp: new Date().toISOString(),
            }),
          };
        }

        // Get AR problems with filters
        const filters = {
          object_type: queryParams.object_type,
          difficulty: queryParams.difficulty,
          grade_level: queryParams.grade_level,
          limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
          random: queryParams.random === 'true'
        };

        const problems = await getARProblems(filters);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            problems: problems,
            count: problems.length,
            filters: filters,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch AR problems:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch AR problems',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - create problems or submit answers
    if (event.httpMethod === 'POST') {
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
            error: 'Invalid JSON in request body'
          }),
        };
      }

      // Validate request
      const validation = validateRequest(requestBody, 'POST');
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

      const action = requestBody.action || 'submit_answer';
      const userId = extractUserId(event, requestBody);

      try {
        if (action === 'create_problem') {
          // Create new AR problem
          const problem = await createARProblem(requestBody);
          
          if (problem) {
            return {
              statusCode: 201,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                problem: problem,
                message: 'AR problem created successfully',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to create AR problem',
              }),
            };
          }

        } else if (action === 'submit_answer') {
          // Submit answer attempt
          if (!userId) {
            return {
              statusCode: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'User ID is required for submitting answers'
              }),
            };
          }

          const attemptData = {
            user_id: userId,
            problem_id: requestBody.problem_id,
            user_answer: requestBody.user_answer,
            is_correct: requestBody.is_correct,
            time_spent_seconds: requestBody.time_spent_seconds || 0
          };

          const saved = await saveARAttempt(attemptData);
          
          if (saved) {
            // Get updated progress
            const progress = await getUserARProgress(userId);
            
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                attempt_saved: true,
                is_correct: requestBody.is_correct,
                progress: progress,
                message: requestBody.is_correct ? 'Correct answer!' : 'Try again!',
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to save attempt',
              }),
            };
          }
        }

      } catch (error) {
        console.error('Failed to process AR request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process AR request',
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
        allowedMethods: ['GET', 'POST', 'OPTIONS'],
        usage: {
          GET: 'Fetch AR problems with optional filters',
          POST: 'Create AR problems or submit answers'
        }
      }),
    };

  } catch (error) {
    console.error('Function execution error:', error);
    Sentry.captureException(error);
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while processing AR problems',
        timestamp: new Date().toISOString()
      }),
    };
  }
};