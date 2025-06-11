/**
 * EduSphere AI Problems Retrieval Netlify Function
 * Handles fetching educational problems from Neon database
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
 * Creates problems table with proper schema
 */
async function initializeProblemsTable() {
  try {
    console.log('Initializing problems table...');

    // Create problems table with comprehensive schema
    await sql`
      CREATE TABLE IF NOT EXISTS problems (
        id SERIAL PRIMARY KEY,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        options JSONB,
        hint TEXT,
        difficulty_level INTEGER DEFAULT 1,
        topic VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_problems_subject_grade ON problems(subject, grade)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty_level)
    `;

    // Seed some sample problems if table is empty
    const existingProblems = await sql`SELECT COUNT(*) as count FROM problems`;
    
    if (parseInt(existingProblems[0].count) === 0) {
      console.log('Seeding sample problems...');
      await seedSampleProblems();
    }

    console.log('Problems table initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize problems table:', error);
    throw error;
  }
}

/**
 * Seed sample problems for testing and demonstration
 */
async function seedSampleProblems() {
  try {
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

    // Insert sample problems
    for (const problem of sampleProblems) {
      await sql`
        INSERT INTO problems (subject, grade, question, answer, options, hint, difficulty_level, topic)
        VALUES (
          ${problem.subject}, 
          ${problem.grade}, 
          ${problem.question}, 
          ${problem.answer}, 
          ${JSON.stringify(problem.options)}, 
          ${problem.hint}, 
          ${problem.difficulty_level}, 
          ${problem.topic}
        )
      `;
    }

    console.log(`Seeded ${sampleProblems.length} sample problems`);

  } catch (error) {
    console.error('Failed to seed sample problems:', error);
    throw error;
  }
}

/**
 * Get problems from database based on filters
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

    // Build query dynamically based on filters
    let whereConditions = [];
    let queryParams = [];

    if (grade) {
      whereConditions.push(`grade = $${queryParams.length + 1}`);
      queryParams.push(grade);
    }

    if (subject) {
      whereConditions.push(`subject = $${queryParams.length + 1}`);
      queryParams.push(subject);
    }

    if (difficulty_level) {
      whereConditions.push(`difficulty_level = $${queryParams.length + 1}`);
      queryParams.push(parseInt(difficulty_level));
    }

    if (topic) {
      whereConditions.push(`topic ILIKE $${queryParams.length + 1}`);
      queryParams.push(`%${topic}%`);
    }

    // Construct the WHERE clause
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Construct ORDER BY clause
    const orderClause = random ? 'ORDER BY RANDOM()' : 'ORDER BY created_at DESC';

    // Add LIMIT and OFFSET
    const limitClause = `LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(parseInt(limit), parseInt(offset));

    // Execute query using neon sql template
    let problems;
    if (whereConditions.length === 0) {
      // No filters - simple query
      if (random) {
        problems = await sql`
          SELECT id, subject, grade, question, answer, options, hint, difficulty_level, topic, created_at
          FROM problems
          ORDER BY RANDOM()
          LIMIT ${parseInt(limit)}
          OFFSET ${parseInt(offset)}
        `;
      } else {
        problems = await sql`
          SELECT id, subject, grade, question, answer, options, hint, difficulty_level, topic, created_at
          FROM problems
          ORDER BY created_at DESC
          LIMIT ${parseInt(limit)}
          OFFSET ${parseInt(offset)}
        `;
      }
    } else {
      // With filters - use dynamic query construction
      const fullQuery = `
        SELECT id, subject, grade, question, answer, options, hint, difficulty_level, topic, created_at
        FROM problems
        ${whereClause}
        ${orderClause}
        ${limitClause}
      `;
      
      problems = await sql.unsafe(fullQuery, queryParams);
    }

    // Parse JSON options if they exist
    const formattedProblems = problems.map(problem => ({
      ...problem,
      options: problem.options ? (typeof problem.options === 'string' ? JSON.parse(problem.options) : problem.options) : null,
      difficulty_level: parseInt(problem.difficulty_level)
    }));

    console.log(`Found ${formattedProblems.length} problems`);
    return formattedProblems;

  } catch (error) {
    console.error('Failed to get problems:', error);
    throw error;
  }
}

/**
 * Get a single random problem based on filters
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Single problem object
 */
async function getRandomProblem(filters = {}) {
  try {
    const problems = await getProblems({ ...filters, limit: 1, random: true });
    return problems.length > 0 ? problems[0] : null;
  } catch (error) {
    console.error('Failed to get random problem:', error);
    throw error;
  }
}

/**
 * Validate query parameters
 * @param {Object} params - Query parameters
 * @returns {Object} Validation result
 */
function validateQueryParams(params) {
  const errors = [];
  const validGrades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];
  const validSubjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];

  if (params.grade && !validGrades.includes(params.grade)) {
    errors.push(`Invalid grade. Must be one of: ${validGrades.join(', ')}`);
  }

  if (params.subject && !validSubjects.includes(params.subject)) {
    errors.push(`Invalid subject. Must be one of: ${validSubjects.join(', ')}`);
  }

  if (params.difficulty_level) {
    const difficulty = parseInt(params.difficulty_level);
    if (isNaN(difficulty) || difficulty < 1 || difficulty > 5) {
      errors.push('Difficulty level must be a number between 1 and 5');
    }
  }

  if (params.limit) {
    const limit = parseInt(params.limit);
    if (isNaN(limit) || limit < 1 || limit > 100) {
      errors.push('Limit must be a number between 1 and 100');
    }
  }

  if (params.offset) {
    const offset = parseInt(params.offset);
    if (isNaN(offset) || offset < 0) {
      errors.push('Offset must be a non-negative number');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Get Problems function invoked:', {
    method: event.httpMethod,
    path: event.path,
    queryParams: event.queryStringParameters,
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Only allow GET requests
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use GET to retrieve problems.',
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
    await initializeProblemsTable();

    // Get query parameters with defaults
    const queryParams = event.queryStringParameters || {};
    
    // Set default grade if not provided - use grade1-6 instead of kindergarten for broader appeal
    if (!queryParams.grade) {
      queryParams.grade = 'grade1-6';
    }

    // Validate query parameters
    const validation = validateQueryParams(queryParams);
    if (!validation.isValid) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'Invalid query parameters',
          details: validation.errors,
        }),
      };
    }

    // Extract and process parameters
    const filters = {
      grade: queryParams.grade,
      subject: queryParams.subject,
      difficulty_level: queryParams.difficulty_level,
      topic: queryParams.topic,
      limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
      offset: queryParams.offset ? parseInt(queryParams.offset) : 0,
      random: queryParams.random === 'true',
    };

    // Handle different request types
    if (queryParams.action === 'random') {
      // Get single random problem
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
      
    } else {
      // Get list of problems
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
    }

  } catch (error) {
    console.error('Function execution error:', error);
    
    // Return a proper JSON error response instead of HTML
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred while fetching problems',
        timestamp: new Date().toISOString(),
        debug: {
          errorType: error.constructor.name,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      }),
    };
  }
};