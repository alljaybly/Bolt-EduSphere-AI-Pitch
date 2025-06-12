/**
 * EduSphere AI Voice Quiz Netlify Function
 * Handles voice-based quizzes and speech recognition using Web Speech API
 * Supports multilingual voice quizzes with Supabase integration
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
 * Supported languages for voice quizzes
 */
const SUPPORTED_LANGUAGES = {
  en: {
    name: 'English',
    locale: 'en-US',
    voice: 'en-US-Standard-B'
  },
  es: {
    name: 'Spanish',
    locale: 'es-ES',
    voice: 'es-ES-Standard-A'
  },
  zh: {
    name: 'Chinese',
    locale: 'zh-CN',
    voice: 'zh-CN-Standard-B'
  },
  fr: {
    name: 'French',
    locale: 'fr-FR',
    voice: 'fr-FR-Standard-A'
  },
  de: {
    name: 'German',
    locale: 'de-DE',
    voice: 'de-DE-Standard-A'
  }
};

/**
 * Initialize voice quizzes table in Supabase
 */
async function initializeVoiceQuizzesTable() {
  try {
    console.log('Initializing voice quizzes table...');

    // Create voice_quizzes table
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'voice_quizzes',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        difficulty VARCHAR(20) DEFAULT 'medium',
        grade_level VARCHAR(20) DEFAULT 'grade1-6',
        subject VARCHAR(50) DEFAULT 'language',
        audio_url TEXT,
        alternative_answers TEXT[],
        hint TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by VARCHAR(255)
      `
    });

    if (error) {
      console.error('Error creating voice quizzes table:', error);
    }

    // Create voice_quiz_attempts table
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'voice_quiz_attempts',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        quiz_id UUID NOT NULL,
        user_answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL,
        confidence_score DECIMAL(5,2),
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'voice_quizzes',
      index_name: 'idx_voice_quizzes_language',
      index_definition: 'language'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'voice_quizzes',
      index_name: 'idx_voice_quizzes_grade',
      index_definition: 'grade_level'
    });

    // Seed sample voice quizzes
    await seedVoiceQuizzes();

    console.log('Voice quizzes table initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize voice quizzes table:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Seed voice quizzes table with sample data
 */
async function seedVoiceQuizzes() {
  try {
    // Check if quizzes already exist
    const { data: existing } = await supabase
      .from('voice_quizzes')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Voice quizzes already seeded');
      return;
    }

    console.log('Seeding voice quizzes...');

    const sampleQuizzes = [
      // English quizzes
      {
        question: 'What color is the sky on a clear day?',
        answer: 'blue',
        language: 'en',
        difficulty: 'easy',
        grade_level: 'kindergarten',
        subject: 'science',
        alternative_answers: ['sky blue', 'light blue'],
        hint: 'Look up on a sunny day'
      },
      {
        question: 'How many days are in a week?',
        answer: 'seven',
        language: 'en',
        difficulty: 'easy',
        grade_level: 'kindergarten',
        subject: 'math',
        alternative_answers: ['7'],
        hint: 'Monday through Sunday'
      },
      {
        question: 'What is the capital of France?',
        answer: 'Paris',
        language: 'en',
        difficulty: 'medium',
        grade_level: 'grade1-6',
        subject: 'geography',
        alternative_answers: [],
        hint: 'It has a famous tower'
      },
      
      // Spanish quizzes
      {
        question: '¿De qué color es el cielo en un día despejado?',
        answer: 'azul',
        language: 'es',
        difficulty: 'easy',
        grade_level: 'kindergarten',
        subject: 'science',
        alternative_answers: ['celeste'],
        hint: 'Mira hacia arriba en un día soleado'
      },
      {
        question: '¿Cuántos días hay en una semana?',
        answer: 'siete',
        language: 'es',
        difficulty: 'easy',
        grade_level: 'kindergarten',
        subject: 'math',
        alternative_answers: ['7'],
        hint: 'De lunes a domingo'
      },
      
      // Chinese quizzes
      {
        question: '晴天时天空是什么颜色？',
        answer: '蓝色',
        language: 'zh',
        difficulty: 'easy',
        grade_level: 'kindergarten',
        subject: 'science',
        alternative_answers: ['蓝'],
        hint: '在晴朗的日子抬头看'
      }
    ];

    // Insert quizzes in batches
    const batchSize = 10;
    for (let i = 0; i < sampleQuizzes.length; i += batchSize) {
      const batch = sampleQuizzes.slice(i, i + batchSize);
      
      const { error } = await supabase
        .from('voice_quizzes')
        .insert(batch);

      if (error) {
        console.error('Error inserting voice quizzes batch:', error);
      }
    }

    console.log(`Seeded ${sampleQuizzes.length} voice quizzes`);

  } catch (error) {
    console.error('Failed to seed voice quizzes:', error);
    Sentry.captureException(error);
  }
}

/**
 * Get voice quizzes from Supabase
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Array of voice quizzes
 */
async function getVoiceQuizzes(filters = {}) {
  try {
    const { 
      language = 'en', 
      difficulty, 
      grade_level, 
      subject,
      limit = 10, 
      random = true 
    } = filters;

    console.log('Fetching voice quizzes with filters:', filters);

    let query = supabase
      .from('voice_quizzes')
      .select('*')
      .eq('language', language);

    // Apply additional filters
    if (difficulty) {
      query = query.eq('difficulty', difficulty);
    }

    if (grade_level) {
      query = query.eq('grade_level', grade_level);
    }

    if (subject) {
      query = query.eq('subject', subject);
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
      console.error('Error fetching voice quizzes:', error);
      return [];
    }

    let quizzes = data || [];

    // Shuffle if random requested
    if (random && quizzes.length > 0) {
      quizzes = quizzes.sort(() => Math.random() - 0.5).slice(0, limit);
    }

    console.log(`Found ${quizzes.length} voice quizzes`);
    return quizzes;

  } catch (error) {
    console.error('Failed to get voice quizzes:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Create new voice quiz
 * @param {Object} quizData - Quiz data
 * @returns {Promise<Object|null>} Created quiz or null
 */
async function createVoiceQuiz(quizData) {
  try {
    console.log('Creating new voice quiz:', quizData);

    const { data, error } = await supabase
      .from('voice_quizzes')
      .insert({
        question: quizData.question,
        answer: quizData.answer,
        language: quizData.language || 'en',
        difficulty: quizData.difficulty || 'medium',
        grade_level: quizData.grade_level || 'grade1-6',
        subject: quizData.subject || 'language',
        audio_url: quizData.audio_url,
        alternative_answers: quizData.alternative_answers || [],
        hint: quizData.hint,
        created_by: quizData.created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating voice quiz:', error);
      return null;
    }

    console.log('Voice quiz created successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to create voice quiz:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Save user's voice quiz attempt
 * @param {Object} attemptData - Attempt data
 * @returns {Promise<boolean>} Success status
 */
async function saveVoiceQuizAttempt(attemptData) {
  try {
    console.log('Saving voice quiz attempt:', attemptData);

    const { error } = await supabase
      .from('voice_quiz_attempts')
      .insert({
        user_id: attemptData.user_id,
        quiz_id: attemptData.quiz_id,
        user_answer: attemptData.user_answer,
        is_correct: attemptData.is_correct,
        confidence_score: attemptData.confidence_score || null
      });

    if (error) {
      console.error('Error saving voice quiz attempt:', error);
      return false;
    }

    console.log('Voice quiz attempt saved successfully');
    return true;

  } catch (error) {
    console.error('Failed to save voice quiz attempt:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Check if answer is correct
 * @param {string} userAnswer - User's spoken answer
 * @param {Object} quiz - Quiz object with correct answer
 * @returns {Object} Result with correctness and confidence
 */
function checkVoiceAnswer(userAnswer, quiz) {
  try {
    if (!userAnswer || !quiz) {
      return { isCorrect: false, confidence: 0 };
    }

    // Normalize answers for comparison
    const normalizeAnswer = (answer) => {
      return answer.trim().toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '') // Remove punctuation
        .replace(/\s{2,}/g, ' '); // Remove extra spaces
    };

    const normalizedUserAnswer = normalizeAnswer(userAnswer);
    const normalizedCorrectAnswer = normalizeAnswer(quiz.answer);
    const normalizedAlternatives = (quiz.alternative_answers || [])
      .map(alt => normalizeAnswer(alt));

    // Check exact match
    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      return { isCorrect: true, confidence: 1.0 };
    }

    // Check alternative answers
    if (normalizedAlternatives.includes(normalizedUserAnswer)) {
      return { isCorrect: true, confidence: 0.9 };
    }

    // Check if answer is contained within user's response
    if (normalizedUserAnswer.includes(normalizedCorrectAnswer)) {
      return { isCorrect: true, confidence: 0.8 };
    }

    // Check if user's response is contained within answer (for short answers)
    if (normalizedCorrectAnswer.includes(normalizedUserAnswer) && 
        normalizedUserAnswer.length > 2 && 
        normalizedUserAnswer.length > normalizedCorrectAnswer.length / 2) {
      return { isCorrect: true, confidence: 0.7 };
    }

    // Calculate similarity for fuzzy matching
    const similarity = calculateStringSimilarity(normalizedUserAnswer, normalizedCorrectAnswer);
    
    // Consider similar answers correct with lower confidence
    if (similarity > 0.8) {
      return { isCorrect: true, confidence: similarity };
    }

    return { isCorrect: false, confidence: similarity };

  } catch (error) {
    console.error('Error checking voice answer:', error);
    Sentry.captureException(error);
    return { isCorrect: false, confidence: 0 };
  }
}

/**
 * Calculate string similarity using Levenshtein distance
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} Similarity score between 0 and 1
 */
function calculateStringSimilarity(a, b) {
  if (a.length === 0) return b.length === 0 ? 1 : 0;
  if (b.length === 0) return 0;

  const matrix = [];

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let i = 0; i <= a.length; i++) {
    matrix[0][i] = i;
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  // Calculate similarity score
  const maxLength = Math.max(a.length, b.length);
  const distance = matrix[b.length][a.length];
  return 1 - (distance / maxLength);
}

/**
 * Get user's voice quiz progress
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User's voice quiz progress data
 */
async function getUserVoiceQuizProgress(userId) {
  try {
    console.log('Fetching voice quiz progress for user:', userId);

    const { data, error } = await supabase
      .from('voice_quiz_attempts')
      .select(`
        *,
        voice_quizzes (
          language,
          difficulty,
          grade_level,
          subject
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching voice quiz progress:', error);
      return {
        total_attempts: 0,
        correct_attempts: 0,
        accuracy: 0,
        by_language: {},
        by_subject: {},
        recent_attempts: []
      };
    }

    const attempts = data || [];
    const totalAttempts = attempts.length;
    const correctAttempts = attempts.filter(a => a.is_correct).length;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts) * 100 : 0;

    // Group by language
    const byLanguage = {};
    attempts.forEach(attempt => {
      const language = attempt.voice_quizzes?.language || 'unknown';
      if (!byLanguage[language]) {
        byLanguage[language] = { total: 0, correct: 0 };
      }
      byLanguage[language].total++;
      if (attempt.is_correct) {
        byLanguage[language].correct++;
      }
    });

    // Group by subject
    const bySubject = {};
    attempts.forEach(attempt => {
      const subject = attempt.voice_quizzes?.subject || 'unknown';
      if (!bySubject[subject]) {
        bySubject[subject] = { total: 0, correct: 0 };
      }
      bySubject[subject].total++;
      if (attempt.is_correct) {
        bySubject[subject].correct++;
      }
    });

    return {
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      accuracy: Math.round(accuracy),
      by_language: byLanguage,
      by_subject: bySubject,
      recent_attempts: attempts.slice(0, 10)
    };

  } catch (error) {
    console.error('Failed to get user voice quiz progress:', error);
    Sentry.captureException(error);
    return {
      total_attempts: 0,
      correct_attempts: 0,
      accuracy: 0,
      by_language: {},
      by_subject: {},
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
    const action = body.action || 'check_answer';

    if (action === 'check_answer') {
      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!body.quiz_id || typeof body.quiz_id !== 'string') {
        errors.push('Quiz ID is required and must be a string');
      }

      if (!body.user_answer || typeof body.user_answer !== 'string') {
        errors.push('User answer is required and must be a string');
      }

    } else if (action === 'create_quiz') {
      if (!body.question || typeof body.question !== 'string') {
        errors.push('Question is required and must be a string');
      }

      if (!body.answer || typeof body.answer !== 'string') {
        errors.push('Answer is required and must be a string');
      }

      if (body.language && !SUPPORTED_LANGUAGES[body.language]) {
        errors.push(`Language must be one of: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`);
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
  console.log('Voice Quiz function invoked:', {
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
    await initializeVoiceQuizzesTable();

    // Handle GET requests - fetch voice quizzes
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      const userId = extractUserId(event, {});

      try {
        // Check if requesting user progress
        if (queryParams.action === 'progress' && userId) {
          const progress = await getUserVoiceQuizProgress(userId);
          
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

        // Get voice quizzes with filters
        const filters = {
          language: queryParams.language || 'en',
          difficulty: queryParams.difficulty,
          grade_level: queryParams.grade_level,
          subject: queryParams.subject,
          limit: queryParams.limit ? parseInt(queryParams.limit) : 10,
          random: queryParams.random !== 'false'
        };

        const quizzes = await getVoiceQuizzes(filters);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            quizzes: quizzes,
            count: quizzes.length,
            filters: filters,
            supported_languages: Object.keys(SUPPORTED_LANGUAGES),
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch voice quizzes:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch voice quizzes',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - check answers or create quizzes
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

      const action = requestBody.action || 'check_answer';
      const userId = extractUserId(event, requestBody);

      try {
        if (action === 'check_answer') {
          // Get quiz details
          const { data: quiz } = await supabase
            .from('voice_quizzes')
            .select('*')
            .eq('id', requestBody.quiz_id)
            .single();

          if (!quiz) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Quiz not found',
              }),
            };
          }

          // Check answer
          const result = checkVoiceAnswer(requestBody.user_answer, quiz);
          
          // Save attempt
          if (userId) {
            await saveVoiceQuizAttempt({
              user_id: userId,
              quiz_id: requestBody.quiz_id,
              user_answer: requestBody.user_answer,
              is_correct: result.isCorrect,
              confidence_score: result.confidence
            });
          }

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              is_correct: result.isCorrect,
              confidence: result.confidence,
              correct_answer: quiz.answer,
              user_answer: requestBody.user_answer,
              feedback: result.isCorrect 
                ? 'Correct! Well done!' 
                : `Not quite right. The correct answer is "${quiz.answer}"`,
              timestamp: new Date().toISOString(),
            }),
          };

        } else if (action === 'create_quiz') {
          // Create new voice quiz
          const quiz = await createVoiceQuiz({
            question: requestBody.question,
            answer: requestBody.answer,
            language: requestBody.language || 'en',
            difficulty: requestBody.difficulty || 'medium',
            grade_level: requestBody.grade_level || 'grade1-6',
            subject: requestBody.subject || 'language',
            audio_url: requestBody.audio_url,
            alternative_answers: requestBody.alternative_answers || [],
            hint: requestBody.hint,
            created_by: userId
          });
          
          if (quiz) {
            return {
              statusCode: 201,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                quiz: quiz,
                message: 'Voice quiz created successfully',
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
                error: 'Failed to create voice quiz',
              }),
            };
          }
        }

      } catch (error) {
        console.error('Failed to process voice quiz request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process voice quiz request',
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
          GET: 'Fetch voice quizzes with optional filters',
          POST: 'Check answers or create new voice quizzes'
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
        message: 'An unexpected error occurred while processing voice quizzes',
        timestamp: new Date().toISOString()
      }),
    };
  }
};