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
        options: JSON.stringify(['1', '2', '3', '4']),
        hint: 'Count on your fingers!',
        difficulty_level: 1,
        topic: 'Basic Addition'
      },
      {
        subject: 'english',
        grade: 'kindergarten',
        question: 'What letter does "Apple" start with?',
        answer: 'A',
        options: JSON.stringify(['A', 'B', 'C', 'D']),
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
        options: JSON.stringify(['sunlight', 'darkness', 'cold', 'noise']),
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
      },
      
      // Grade 10-12 problems
      {
        subject: 'math',
        grade: 'grade10-12',
        question: 'What is the derivative of x² + 3x + 2?',
        answer: '2x + 3',
        hint: 'Use the power rule: d/dx(xⁿ) = nxⁿ⁻¹',
        difficulty_level: 4,
        topic: 'Calculus - Derivatives'
      },
      {
        subject: 'coding',
        grade: 'grade10-12',
        question: 'What is the time complexity of binary search?',
        answer: 'O(log n)',
        options: JSON.stringify(['O(1)', 'O(log n)', 'O(n)', 'O(n²)']),
        hint: 'Think about how the search space is divided in each step.',
        difficulty_level: 4,
        topic: 'Algorithm Analysis'
      },
      
      // Matric problems
      {
        subject: 'math',
        grade: 'matric',
        question: 'Find the integral of 2x + 1 dx',
        answer: 'x² + x + C',
        hint: 'Remember to add the constant of integration!',
        difficulty_level: 5,
        topic: 'Calculus - Integration'
      },
      {
        subject: 'english',
        grade: 'matric',
        question: 'Identify the literary device: "The wind whispered through the trees"',
        answer: 'personification',
        options: JSON.stringify(['metaphor', 'simile', 'personification', 'alliteration']),
        hint: 'The wind is given human characteristics.',
        difficulty_level: 4,
        topic: 'Literary Devices'
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
          ${problem.options}, 
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

    let query = `
      SELECT 
        id,
        subject,
        grade,
        question,
        answer,
        options,
        hint,
        difficulty_level,
        topic,
        created_at
      FROM problems
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Add grade filter
    if (grade) {
      query += ` AND grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    // Add subject filter
    if (subject) {
      query += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    // Add difficulty level filter
    if (difficulty_level) {
      query += ` AND difficulty_level = $${paramIndex}`;
      params.push(parseInt(difficulty_level));
      paramIndex++;
    }

    // Add topic filter
    if (topic) {
      query += ` AND topic ILIKE $${paramIndex}`;
      params.push(`%${topic}%`);
      paramIndex++;
    }

    // Add ordering
    if (random) {
      query += ` ORDER BY RANDOM()`;
    } else {
      query += ` ORDER BY created_at DESC`;
    }

    // Add pagination
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    // Execute query using template literal with spread parameters
    const problems = await sql.unsafe(query, params);

    // Parse JSON options if they exist
    const formattedProblems = problems.map(problem => ({
      ...problem,
      options: problem.options ? JSON.parse(problem.options) : null,
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
 * Get problem statistics
 * @param {Object} filters - Query filters
 * @returns {Promise<Object>} Statistics object
 */
async function getProblemStats(filters = {}) {
  try {
    const { grade, subject } = filters;

    let query = `
      SELECT 
        COUNT(*) as total_problems,
        COUNT(DISTINCT subject) as subjects_count,
        COUNT(DISTINCT grade) as grades_count,
        AVG(difficulty_level) as avg_difficulty
      FROM problems
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (grade) {
      query += ` AND grade = $${paramIndex}`;
      params.push(grade);
      paramIndex++;
    }

    if (subject) {
      query += ` AND subject = $${paramIndex}`;
      params.push(subject);
      paramIndex++;
    }

    const stats = await sql.unsafe(query, params);
    
    return {
      total_problems: parseInt(stats[0].total_problems),
      subjects_count: parseInt(stats[0].subjects_count),
      grades_count: parseInt(stats[0].grades_count),
      avg_difficulty: parseFloat(stats[0].avg_difficulty || 0).toFixed(2)
    };

  } catch (error) {
    console.error('Failed to get problem stats:', error);
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
    // Initialize database tables
    await initializeProblemsTable();

    // Get query parameters
    const queryParams = event.queryStringParameters || {};
    
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
    if (queryParams.action === 'stats') {
      // Get statistics
      const stats = await getProblemStats(filters);
      
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
      
    } else if (queryParams.action === 'random') {
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
    
    return {
      statusCode: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching problems',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};