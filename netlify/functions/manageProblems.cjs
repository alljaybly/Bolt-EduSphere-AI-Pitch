/**
 * EduSphere AI Problem Management Netlify Function
 * Handles problem creation, retrieval, and progress tracking using Supabase
 * Supports confetti feedback, progress reports, and analytics
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
 * Initialize problems table in Supabase
 */
async function initializeProblemsTable() {
  try {
    console.log('Initializing problems table...');

    // Create problems table
    const { error: problemsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'problems',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        options JSONB,
        hint TEXT,
        explanation TEXT,
        difficulty_level INTEGER DEFAULT 1,
        topic VARCHAR(100),
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `
    });

    if (problemsError) {
      console.error('Error creating problems table:', problemsError);
    }

    // Create problem_attempts table
    const { error: attemptsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'problem_attempts',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        problem_id UUID NOT NULL,
        user_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        time_spent_seconds INTEGER DEFAULT 0,
        hint_used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    if (attemptsError) {
      console.error('Error creating problem_attempts table:', attemptsError);
    }

    // Create feedback table
    const { error: feedbackError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'problem_feedback',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        problem_id UUID NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        rating INTEGER CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(problem_id, user_id)
      `
    });

    if (feedbackError) {
      console.error('Error creating problem_feedback table:', feedbackError);
    }

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'problems',
      index_name: 'idx_problems_subject_grade',
      index_definition: 'subject, grade'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'problems',
      index_name: 'idx_problems_difficulty',
      index_definition: 'difficulty_level'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'problem_attempts',
      index_name: 'idx_problem_attempts_user',
      index_definition: 'user_id'
    });

    // Seed sample problems
    await seedSampleProblems();

    console.log('Problems tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize problems tables:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Seed sample problems
 */
async function seedSampleProblems() {
  try {
    // Check if problems already exist
    const { data: existing } = await supabase
      .from('problems')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Sample problems already seeded');
      return;
    }

    console.log('Seeding sample problems...');

    const sampleProblems = [
      // Kindergarten problems
      {
        subject: 'math',
        grade: 'kindergarten',
        question: 'What is 1 + 1?',
        answer: '2',
        options: ['1', '2', '3', '4'],
        hint: 'Count on your fingers!',
        difficulty_level: 1,
        topic: 'Basic Addition'
      },
      {
        subject: 'english',
        grade: 'kindergarten',
        question: 'What letter does "Apple" start with?',
        answer: 'A',
        options: ['A', 'B', 'C', 'D'],
        hint: 'Think about the first sound you hear!',
        difficulty_level: 1,
        topic: 'Letter Recognition'
      },
      
      // Grade 1-6 problems
      {
        subject: 'math',
        grade: 'grade1-6',
        question: 'What is 15 + 27?',
        answer: '42',
        hint: 'Try adding the ones place first, then the tens place.',
        difficulty_level: 2,
        topic: 'Addition'
      },
      {
        subject: 'science',
        grade: 'grade1-6',
        question: 'What do plants need to make their own food?',
        answer: 'sunlight',
        options: ['sunlight', 'darkness', 'cold', 'noise'],
        hint: 'Think about what makes plants green and healthy!',
        difficulty_level: 2,
        topic: 'Photosynthesis'
      },
      
      // Grade 7-9 problems
      {
        subject: 'math',
        grade: 'grade7-9',
        question: 'Solve for x: 2x + 5 = 13',
        answer: '4',
        hint: 'Subtract 5 from both sides, then divide by 2.',
        difficulty_level: 3,
        topic: 'Linear Equations'
      },
      {
        subject: 'physics',
        grade: 'grade7-9',
        question: 'If a car travels 60 km in 2 hours, what is its average speed?',
        answer: '30 km/h',
        hint: 'Speed = Distance ÷ Time',
        difficulty_level: 3,
        topic: 'Speed and Velocity'
      }
    ];

    // Insert problems in batches
    const batchSize = 10;
    for (let i = 0; i < sampleProblems.length; i += batchSize) {
      const batch = sampleProblems.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('problems')
        .insert(batch);

      if (error) {
        console.error('Error inserting problems batch:', error);
      }
    }

    console.log(`Seeded ${sampleProblems.length} sample problems`);

  } catch (error) {
    console.error('Failed to seed sample problems:', error);
    Sentry.captureException(error);
  }
}

/**
 * Get problems from Supabase
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Array of problems
 */
async function getProblems(filters = {}) {
  try {
    const { 
      grade, 
      subject, 
      difficulty_level, 
      topic, 
      limit = 10, 
      offset = 0,
      random = false 
    } = filters;

    console.log('Fetching problems with filters:', filters);

    let query = supabase
      .from('problems')
      .select('*');

    // Apply filters
    if (grade) {
      query = query.eq('grade', grade);
    }

    if (subject) {
      query = query.eq('subject', subject);
    }

    if (difficulty_level) {
      query = query.eq('difficulty_level', parseInt(difficulty_level));
    }

    if (topic) {
      query = query.ilike('topic', `%${topic}%`);
    }

    // Apply ordering and pagination
    if (random) {
      // Note: Supabase doesn't have RANDOM() function, so we'll shuffle client-side
      query = query.limit(limit * 2); // Get more to shuffle
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching problems:', error);
      return [];
    }

    let problems = data || [];

    // Shuffle if random requested
    if (random && problems.length > 0) {
      problems = problems.sort(() => Math.random() - 0.5).slice(0, limit);
    }

    // Format options if they exist
    problems = problems.map(problem => ({
      ...problem,
      options: problem.options ? (typeof problem.options === 'string' ? JSON.parse(problem.options) : problem.options) : null,
      difficulty_level: parseInt(problem.difficulty_level)
    }));

    console.log(`Found ${problems.length} problems`);
    return problems;

  } catch (error) {
    console.error('Failed to get problems:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Get a single random problem based on filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Object|null>} Single problem object or null
 */
async function getRandomProblem(filters = {}) {
  try {
    const problems = await getProblems({ ...filters, limit: 1, random: true });
    return problems.length > 0 ? problems[0] : null;
  } catch (error) {
    console.error('Failed to get random problem:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Create new problem
 * @param {Object} problemData - Problem data
 * @returns {Promise<Object|null>} Created problem or null
 */
async function createProblem(problemData) {
  try {
    console.log('Creating new problem:', {
      subject: problemData.subject,
      grade: problemData.grade,
      topic: problemData.topic
    });

    const { data, error } = await supabase
      .from('problems')
      .insert({
        subject: problemData.subject,
        grade: problemData.grade,
        question: problemData.question,
        answer: problemData.answer,
        options: problemData.options,
        hint: problemData.hint,
        explanation: problemData.explanation,
        difficulty_level: problemData.difficulty_level || 1,
        topic: problemData.topic,
        created_by: problemData.created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating problem:', error);
      return null;
    }

    console.log('Problem created successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to create problem:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Save problem attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<boolean>} Success status
 */
async function saveProblemAttempt(attemptData) {
  try {
    console.log('Saving problem attempt:', {
      userId: attemptData.user_id,
      problemId: attemptData.problem_id,
      isCorrect: attemptData.is_correct
    });

    const { error } = await supabase
      .from('problem_attempts')
      .insert({
        user_id: attemptData.user_id,
        problem_id: attemptData.problem_id,
        user_answer: attemptData.user_answer,
        is_correct: attemptData.is_correct,
        time_spent_seconds: attemptData.time_spent_seconds || 0,
        hint_used: attemptData.hint_used || false
      });

    if (error) {
      console.error('Error saving problem attempt:', error);
      return false;
    }

    // Update user progress
    await updateUserProgress(attemptData);

    console.log('Problem attempt saved successfully');
    return true;

  } catch (error) {
    console.error('Failed to save problem attempt:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Update user progress
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProgress(attemptData) {
  try {
    // Get problem details to update subject-specific progress
    const { data: problem } = await supabase
      .from('problems')
      .select('subject, grade')
      .eq('id', attemptData.problem_id)
      .single();

    if (!problem) {
      console.error('Problem not found for progress update');
      return false;
    }

    // Check if user progress record exists
    const { data: existingProgress } = await supabase
      .from('user_progress')
      .select('id, total_attempted, total_correct, streak_days, last_activity')
      .eq('user_id', attemptData.user_id)
      .eq('subject', problem.subject)
      .eq('grade', problem.grade)
      .single();

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (existingProgress) {
      // Calculate streak
      let newStreak = existingProgress.streak_days;
      const lastActivity = new Date(existingProgress.last_activity);
      const lastActivityDate = new Date(lastActivity.getFullYear(), lastActivity.getMonth(), lastActivity.getDate());
      
      const dayDifference = Math.floor((today.getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDifference === 1) {
        // Consecutive day, increment streak
        newStreak += 1;
      } else if (dayDifference > 1) {
        // Streak broken, reset to 1
        newStreak = 1;
      }
      // If same day, keep streak unchanged

      // Update existing progress
      const { error } = await supabase
        .from('user_progress')
        .update({
          total_attempted: existingProgress.total_attempted + 1,
          total_correct: existingProgress.total_correct + (attemptData.is_correct ? 1 : 0),
          streak_days: newStreak,
          last_activity: now.toISOString(),
          updated_at: now.toISOString()
        })
        .eq('id', existingProgress.id);

      if (error) {
        console.error('Error updating user progress:', error);
        return false;
      }
    } else {
      // Create new progress record
      const { error } = await supabase
        .from('user_progress')
        .insert({
          user_id: attemptData.user_id,
          subject: problem.subject,
          grade: problem.grade,
          total_attempted: 1,
          total_correct: attemptData.is_correct ? 1 : 0,
          streak_days: 1,
          last_activity: now.toISOString()
        });

      if (error) {
        console.error('Error creating user progress:', error);
        return false;
      }
    }

    console.log('User progress updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user progress:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Save problem feedback
 * @param {Object} feedbackData - Feedback data
 * @returns {Promise<boolean>} Success status
 */
async function saveProblemFeedback(feedbackData) {
  try {
    console.log('Saving problem feedback:', {
      userId: feedbackData.user_id,
      problemId: feedbackData.problem_id,
      rating: feedbackData.rating
    });

    // Check if feedback already exists
    const { data: existingFeedback } = await supabase
      .from('problem_feedback')
      .select('id')
      .eq('problem_id', feedbackData.problem_id)
      .eq('user_id', feedbackData.user_id)
      .single();

    if (existingFeedback) {
      // Update existing feedback
      const { error } = await supabase
        .from('problem_feedback')
        .update({
          rating: feedbackData.rating,
          comment: feedbackData.comment
        })
        .eq('id', existingFeedback.id);

      if (error) {
        console.error('Error updating problem feedback:', error);
        return false;
      }
    } else {
      // Create new feedback
      const { error } = await supabase
        .from('problem_feedback')
        .insert({
          problem_id: feedbackData.problem_id,
          user_id: feedbackData.user_id,
          rating: feedbackData.rating,
          comment: feedbackData.comment
        });

      if (error) {
        console.error('Error creating problem feedback:', error);
        return false;
      }
    }

    console.log('Problem feedback saved successfully');
    return true;

  } catch (error) {
    console.error('Failed to save problem feedback:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Get user progress
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User progress data
 */
async function getUserProgress(userId) {
  try {
    console.log('Fetching progress for user:', userId);

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user progress:', error);
      return {
        total_attempted: 0,
        total_correct: 0,
        by_subject: {},
        streak_days: 0,
        recent_attempts: []
      };
    }

    const progress = data || [];
    
    // Calculate overall stats
    const totalAttempted = progress.reduce((sum, p) => sum + p.total_attempted, 0);
    const totalCorrect = progress.reduce((sum, p) => sum + p.total_correct, 0);
    const maxStreak = Math.max(...progress.map(p => p.streak_days).concat(0));
    
    // Group by subject
    const bySubject = {};
    progress.forEach(p => {
      if (!bySubject[p.subject]) {
        bySubject[p.subject] = {
          total_attempted: 0,
          total_correct: 0,
          by_grade: {}
        };
      }
      
      bySubject[p.subject].total_attempted += p.total_attempted;
      bySubject[p.subject].total_correct += p.total_correct;
      
      if (!bySubject[p.subject].by_grade[p.grade]) {
        bySubject[p.subject].by_grade[p.grade] = {
          total_attempted: 0,
          total_correct: 0
        };
      }
      
      bySubject[p.subject].by_grade[p.grade].total_attempted += p.total_attempted;
      bySubject[p.subject].by_grade[p.grade].total_correct += p.total_correct;
    });

    // Get recent attempts
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('problem_attempts')
      .select(`
        *,
        problems (
          id,
          subject,
          grade,
          question,
          answer
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (attemptsError) {
      console.error('Error fetching recent attempts:', attemptsError);
    }

    // Format recent attempts
    const formattedAttempts = (recentAttempts || []).map(attempt => ({
      id: attempt.id,
      timestamp: new Date(attempt.created_at).getTime(),
      subject: attempt.problems?.subject || 'unknown',
      grade: attempt.problems?.grade || 'unknown',
      question: attempt.problems?.question || 'Unknown question',
      correct: attempt.is_correct,
      user_answer: attempt.user_answer,
      correct_answer: attempt.problems?.answer || 'Unknown'
    }));

    return {
      total_attempted: totalAttempted,
      total_correct: totalCorrect,
      accuracy: totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0,
      by_subject: bySubject,
      streak_days: maxStreak,
      recent_attempts: formattedAttempts
    };

  } catch (error) {
    console.error('Failed to get user progress:', error);
    Sentry.captureException(error);
    return {
      total_attempted: 0,
      total_correct: 0,
      by_subject: {},
      streak_days: 0,
      recent_attempts: []
    };
  }
}

/**
 * Generate PDF progress report
 * @param {Object} reportConfig - Report configuration
 * @returns {Promise<string|null>} PDF URL or null
 */
async function generateProgressReport(reportConfig) {
  try {
    console.log('Generating progress report:', reportConfig);

    // In a real implementation, this would generate a PDF using a library
    // For this demo, we'll return a mock PDF URL
    
    const mockPdfUrl = `https://edusphere.ai/reports/progress_${Date.now()}.pdf`;
    
    console.log('Progress report generated:', mockPdfUrl);
    return mockPdfUrl;

  } catch (error) {
    console.error('Failed to generate progress report:', error);
    Sentry.captureException(error);
    return null;
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
    const action = body.action || '';

    if (action === 'create_problem') {
      if (!body.subject || typeof body.subject !== 'string') {
        errors.push('Subject is required and must be a string');
      }

      if (!body.grade || typeof body.grade !== 'string') {
        errors.push('Grade is required and must be a string');
      }

      if (!body.question || typeof body.question !== 'string') {
        errors.push('Question is required and must be a string');
      }

      if (!body.answer || typeof body.answer !== 'string') {
        errors.push('Answer is required and must be a string');
      }

    } else if (action === 'submit_attempt') {
      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!body.problem_id || typeof body.problem_id !== 'string') {
        errors.push('Problem ID is required and must be a string');
      }

      if (!body.user_answer || typeof body.user_answer !== 'string') {
        errors.push('User answer is required and must be a string');
      }

      if (typeof body.is_correct !== 'boolean') {
        errors.push('is_correct is required and must be a boolean');
      }

    } else if (action === 'submit_feedback') {
      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!body.problem_id || typeof body.problem_id !== 'string') {
        errors.push('Problem ID is required and must be a string');
      }

      if (!body.rating || typeof body.rating !== 'number' || body.rating < 1 || body.rating > 5) {
        errors.push('Rating is required and must be a number between 1 and 5');
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
  console.log('Manage Problems function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body
  });

  // Add Sentry context
  Sentry.configureScope(scope => {
    scope.setTag('function', 'manageProblems');
    scope.setTag('method', event.httpMethod);
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
    await initializeProblemsTable();

    // Handle GET requests - fetch problems
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      const userId = extractUserId(event, {});

      try {
        // Check if requesting user progress
        if (queryParams.action === 'progress' && userId) {
          const progress = await getUserProgress(userId);
          
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

        // Check if requesting a random problem
        if (queryParams.action === 'random') {
          const filters = {
            grade: queryParams.grade,
            subject: queryParams.subject,
            difficulty_level: queryParams.difficulty_level,
            topic: queryParams.topic
          };

          const problem = await getRandomProblem(filters);
          
          if (!problem) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'No problems found matching the criteria',
                filters: filters,
              }),
            };
          }
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              data: problem,
              timestamp: new Date().toISOString(),
            }),
          };
        }

        // Get problems with filters
        const filters = {
          grade: queryParams.grade,
          subject: queryParams.subject,
          difficulty_level: queryParams.difficulty_level,
          topic: queryParams.topic,
          limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
          offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
          random: queryParams.random === 'true'
        };

        const problems = await getProblems(filters);
        
        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            data: problems,
            count: problems.length,
            filters: filters,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch problems:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch problems',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - create problems, submit attempts, etc.
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

      const action = requestBody.action || '';
      const userId = extractUserId(event, requestBody);

      try {
        if (action === 'create_problem') {
          // Create new problem
          const problemData = {
            subject: requestBody.subject,
            grade: requestBody.grade,
            question: requestBody.question,
            answer: requestBody.answer,
            options: requestBody.options,
            hint: requestBody.hint,
            explanation: requestBody.explanation,
            difficulty_level: requestBody.difficulty_level || 1,
            topic: requestBody.topic,
            created_by: userId
          };

          const problem = await createProblem(problemData);
          
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
                message: 'Problem created successfully',
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
                error: 'Failed to create problem',
              }),
            };
          }

        } else if (action === 'submit_attempt') {
          // Submit problem attempt
          const attemptData = {
            user_id: userId || requestBody.user_id,
            problem_id: requestBody.problem_id,
            user_answer: requestBody.user_answer,
            is_correct: requestBody.is_correct,
            time_spent_seconds: requestBody.time_spent_seconds || 0,
            hint_used: requestBody.hint_used || false
          };

          const saved = await saveProblemAttempt(attemptData);
          
          if (saved) {
            // Get updated progress
            const progress = await getUserProgress(attemptData.user_id);
            
            // Determine confetti settings based on performance
            let confettiSettings = null;
            if (attemptData.is_correct) {
              confettiSettings = {
                particleCount: attemptData.time_spent_seconds < 10 ? 150 : 100,
                spread: 70,
                startVelocity: 30,
                gravity: 1.2,
                colors: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff']
              };
            }
            
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                attempt_saved: true,
                is_correct: attemptData.is_correct,
                progress: progress,
                confetti: confettiSettings,
                message: attemptData.is_correct 
                  ? 'Correct! Great job!' 
                  : 'Not quite right. Try again!',
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

        } else if (action === 'submit_feedback') {
          // Submit problem feedback
          const feedbackData = {
            user_id: userId || requestBody.user_id,
            problem_id: requestBody.problem_id,
            rating: requestBody.rating,
            comment: requestBody.comment
          };

          const saved = await saveProblemFeedback(feedbackData);
          
          if (saved) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                feedback_saved: true,
                message: 'Thank you for your feedback!',
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
                error: 'Failed to save feedback',
              }),
            };
          }

        } else if (action === 'generate_report') {
          // Generate progress report
          if (!userId && !requestBody.teacher_id) {
            return {
              statusCode: 400,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'User ID or teacher ID is required for report generation',
              }),
            };
          }

          const reportConfig = {
            user_ids: requestBody.student_ids || [userId],
            date_range: requestBody.date_range || {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
              end: new Date().toISOString().split('T')[0]
            },
            subjects: requestBody.subjects || ['math', 'science', 'english'],
            report_type: requestBody.report_type || 'summary',
            include_charts: requestBody.include_charts !== false,
            generated_by: requestBody.teacher_id || userId
          };

          const pdfUrl = await generateProgressReport(reportConfig);
          
          if (pdfUrl) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                pdf_url: pdfUrl,
                report_config: reportConfig,
                message: 'Progress report generated successfully',
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
                error: 'Failed to generate report',
              }),
            };
          }
        }

        // Unknown action
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Unknown action',
            allowedActions: ['create_problem', 'submit_attempt', 'submit_feedback', 'generate_report'],
          }),
        };

      } catch (error) {
        console.error('Failed to process problem management request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process problem management request',
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
          GET: 'Fetch problems with optional filters',
          POST: 'Create problems, submit attempts, or provide feedback'
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
        message: 'An unexpected error occurred while processing problems',
        timestamp: new Date().toISOString()
      }),
    };
  }
};