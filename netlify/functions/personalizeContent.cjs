/**
 * EduSphere AI Personalized Content Netlify Function
 * Handles AI-powered personalized learning recommendations using Supabase and Claude Sonnet 4
 * World's Largest Hackathon Project - EduSphere AI
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://faphnxotbuwiwfatuok.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGhueG90YnV3aXdmYXR1b2siLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ5MjIwMTEzLCJleHAiOjIwNjQ3OTYxMTN9.Ej8nQJhQJGqkKJqKJqKJqKJqKJqKJqKJqKJqKJqKJqK';

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Claude Sonnet 4 API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

// RevenueCat configuration for premium access verification
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
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {string|Buffer} data - Request body data
 * @returns {Promise<Object>} Response data
 */
function makeHttpRequest(url, options = {}, data = null) {
  const https = require('https');
  const { URL } = require('url');
  
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
 * Check user's premium subscription status via RevenueCat
 * @param {string} userId - User identifier
 * @returns {Promise<boolean>} Premium access status
 */
async function checkPremiumAccess(userId) {
  try {
    if (!userId || userId === '[Not provided]' || userId === 'undefined') {
      return false;
    }

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

    if (response.statusCode === 404) {
      return false; // User not found - treat as free user
    }

    if (response.statusCode === 200 && response.data) {
      const { subscriber } = response.data;
      
      if (subscriber && subscriber.entitlements && subscriber.entitlements.premium) {
        const premium = subscriber.entitlements.premium;
        
        if (!premium.expires_date) {
          return true; // No expiration date means active subscription
        }
        
        const expirationTime = new Date(premium.expires_date).getTime();
        const currentTime = new Date().getTime();
        
        return expirationTime > currentTime;
      }
    }

    return false;

  } catch (error) {
    console.error('Premium access check failed:', error.message);
    return false; // Default to no access on error
  }
}

/**
 * Get user preferences from Supabase
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User preferences with defaults
 */
async function getUserPreferences(userId) {
  try {
    console.log('Fetching user preferences for:', userId);

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', error);
    }

    // Return defaults if no preferences found
    const preferences = data || {
      user_id: userId,
      preferred_subject: 'math',
      preferred_difficulty: 2,
      preferred_language: 'en',
      learning_style: 'visual',
      daily_goal_minutes: 30
    };

    console.log('User preferences loaded:', preferences);
    return preferences;

  } catch (error) {
    console.error('Failed to get user preferences:', error);
    
    // Return default preferences on error
    return {
      user_id: userId,
      preferred_subject: 'math',
      preferred_difficulty: 2,
      preferred_language: 'en',
      learning_style: 'visual',
      daily_goal_minutes: 30
    };
  }
}

/**
 * Get user progress data from Supabase
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User progress data
 */
async function getUserProgress(userId) {
  try {
    console.log('Fetching user progress for:', userId);

    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching user progress:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} progress records for user`);
    return data || [];

  } catch (error) {
    console.error('Failed to get user progress:', error);
    return [];
  }
}

/**
 * Generate personalized learning recommendation using Claude Sonnet 4
 * @param {Object} userProfile - User profile with preferences and progress
 * @param {string} language - Target language for content
 * @returns {Promise<Object>} Personalized lesson recommendation
 */
async function generatePersonalizedLesson(userProfile, language = 'en') {
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    console.log('Generating personalized lesson with Claude Sonnet 4');

    // Construct personalization prompt
    const systemPrompt = `You are Claude Sonnet 4, an expert educational AI for EduSphere AI. 
Your role is to create personalized learning recommendations based on user preferences and progress.

User Profile:
- Preferred Subject: ${userProfile.preferences.preferred_subject}
- Difficulty Level: ${userProfile.preferences.preferred_difficulty}/5
- Learning Style: ${userProfile.preferences.learning_style}
- Language: ${language}
- Daily Goal: ${userProfile.preferences.daily_goal_minutes} minutes

Recent Progress:
${userProfile.progress.map(p => `- ${p.subject}: ${p.total_correct}/${p.total_attempted} correct (${((p.total_correct/p.total_attempted)*100).toFixed(1)}%)`).join('\n')}

Guidelines:
1. Recommend the next best lesson based on their preferences and progress
2. Consider their learning style (visual, auditory, kinesthetic, reading)
3. Adjust difficulty appropriately - not too easy, not too hard
4. Make it engaging and age-appropriate
5. Include clear learning objectives
6. Suggest estimated time to complete
7. Provide content in ${language} language

Format your response as a JSON object with:
{
  "title": "Lesson title",
  "description": "Brief description of what they'll learn",
  "subject": "subject area",
  "difficulty": 1-5,
  "estimated_minutes": number,
  "learning_objectives": ["objective 1", "objective 2"],
  "activities": ["activity 1", "activity 2"],
  "why_recommended": "Explanation of why this lesson is perfect for them"
}`;

    const userPrompt = `Based on my learning profile, what should my next lesson be? I want to continue improving in my preferred subjects while being challenged appropriately.`;

    // Make request to Claude API
    const url = `${ANTHROPIC_BASE_URL}/messages`;
    const requestData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt
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

    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200 && response.data) {
      const content = response.data.content?.[0]?.text;
      
      if (!content) {
        throw new Error('No content generated by Claude');
      }

      // Parse the JSON response
      try {
        const lessonData = JSON.parse(content);
        
        console.log('Personalized lesson generated successfully');
        return lessonData;
        
      } catch (parseError) {
        console.error('Failed to parse Claude response as JSON:', parseError);
        
        // Return a fallback lesson if JSON parsing fails
        return generateFallbackLesson(userProfile, language);
      }
      
    } else {
      throw new Error(`Claude API error: ${response.statusCode}`);
    }

  } catch (error) {
    console.error('Claude lesson generation failed:', error.message);
    
    // Return fallback lesson on error
    return generateFallbackLesson(userProfile, language);
  }
}

/**
 * Generate fallback lesson when Claude is unavailable
 * @param {Object} userProfile - User profile data
 * @param {string} language - Target language
 * @returns {Object} Fallback lesson recommendation
 */
function generateFallbackLesson(userProfile, language = 'en') {
  console.log('Generating fallback lesson recommendation');
  
  const preferences = userProfile.preferences;
  const subject = preferences.preferred_subject;
  const difficulty = preferences.preferred_difficulty;
  
  // Fallback lessons by subject and difficulty
  const fallbackLessons = {
    math: {
      1: {
        en: {
          title: "Counting Fun with Numbers 1-10",
          description: "Learn to count from 1 to 10 with fun activities and games",
          activities: ["Count colorful objects", "Number matching game", "Sing counting songs"]
        },
        es: {
          title: "Diversión Contando con Números 1-10",
          description: "Aprende a contar del 1 al 10 con actividades divertidas y juegos",
          activities: ["Contar objetos coloridos", "Juego de emparejar números", "Cantar canciones de contar"]
        }
      },
      2: {
        en: {
          title: "Addition Adventures",
          description: "Master basic addition with visual aids and practice problems",
          activities: ["Visual addition with objects", "Simple word problems", "Addition games"]
        },
        es: {
          title: "Aventuras de Suma",
          description: "Domina la suma básica con ayudas visuales y problemas de práctica",
          activities: ["Suma visual con objetos", "Problemas simples de palabras", "Juegos de suma"]
        }
      },
      3: {
        en: {
          title: "Multiplication Mastery",
          description: "Learn multiplication tables and apply them to real-world problems",
          activities: ["Times table practice", "Array visualizations", "Real-world applications"]
        },
        es: {
          title: "Maestría en Multiplicación",
          description: "Aprende las tablas de multiplicar y aplícalas a problemas del mundo real",
          activities: ["Práctica de tablas", "Visualizaciones de matrices", "Aplicaciones del mundo real"]
        }
      }
    },
    science: {
      1: {
        en: {
          title: "Amazing Animals",
          description: "Discover different animals and their habitats",
          activities: ["Animal identification", "Habitat matching", "Animal sounds game"]
        },
        es: {
          title: "Animales Increíbles",
          description: "Descubre diferentes animales y sus hábitats",
          activities: ["Identificación de animales", "Emparejamiento de hábitats", "Juego de sonidos de animales"]
        }
      },
      2: {
        en: {
          title: "Plant Life Cycle",
          description: "Learn how plants grow from seeds to full-grown plants",
          activities: ["Seed planting experiment", "Growth observation", "Life cycle diagram"]
        },
        es: {
          title: "Ciclo de Vida de las Plantas",
          description: "Aprende cómo las plantas crecen desde semillas hasta plantas adultas",
          activities: ["Experimento de plantar semillas", "Observación del crecimiento", "Diagrama del ciclo de vida"]
        }
      }
    },
    english: {
      1: {
        en: {
          title: "Letter Recognition Fun",
          description: "Learn to recognize and write letters A-Z",
          activities: ["Letter tracing", "Alphabet song", "Letter matching games"]
        },
        es: {
          title: "Diversión con Reconocimiento de Letras",
          description: "Aprende a reconocer y escribir las letras A-Z",
          activities: ["Trazado de letras", "Canción del alfabeto", "Juegos de emparejar letras"]
        }
      },
      2: {
        en: {
          title: "Reading Comprehension",
          description: "Improve reading skills with short stories and questions",
          activities: ["Read short stories", "Answer comprehension questions", "Vocabulary building"]
        },
        es: {
          title: "Comprensión de Lectura",
          description: "Mejora las habilidades de lectura con cuentos cortos y preguntas",
          activities: ["Leer cuentos cortos", "Responder preguntas de comprensión", "Construcción de vocabulario"]
        }
      }
    }
  };
  
  // Get appropriate lesson or use default
  const subjectLessons = fallbackLessons[subject] || fallbackLessons.math;
  const difficultyLessons = subjectLessons[Math.min(difficulty, 3)] || subjectLessons[1];
  const languageLessons = difficultyLessons[language] || difficultyLessons.en;
  
  return {
    title: languageLessons.title,
    description: languageLessons.description,
    subject: subject,
    difficulty: difficulty,
    estimated_minutes: 15 + (difficulty * 5),
    learning_objectives: [
      `Master ${subject} concepts at level ${difficulty}`,
      `Build confidence through practice`,
      `Apply knowledge to real situations`
    ],
    activities: languageLessons.activities,
    why_recommended: `This lesson matches your preferred subject (${subject}) and difficulty level (${difficulty}/5). It's designed for your ${preferences.learning_style} learning style.`,
    is_fallback: true
  };
}

/**
 * Update user preferences in Supabase
 * @param {string} userId - User identifier
 * @param {Object} preferences - Updated preferences
 * @returns {Promise<boolean>} Success status
 */
async function updateUserPreferences(userId, preferences) {
  try {
    console.log('Updating user preferences for:', userId);

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id' 
      });

    if (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }

    console.log('User preferences updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user preferences:', error);
    return false;
  }
}

/**
 * Validate request parameters
 * @param {Object} body - Request body
 * @returns {Object} Validation result
 */
function validateRequest(body) {
  const errors = [];

  if (!body.user_id || typeof body.user_id !== 'string') {
    errors.push('User ID is required and must be a string');
  }

  if (body.language && typeof body.language !== 'string') {
    errors.push('Language must be a string');
  }

  if (body.preferences && typeof body.preferences !== 'object') {
    errors.push('Preferences must be an object');
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
  return requestBody.user_id || 
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

  try {
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
          error: 'Invalid JSON in request body'
        }),
      };
    }

    // Validate request
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

    // Extract parameters
    const userId = extractUserId(event, requestBody);
    const language = requestBody.language || 'en';

    if (!userId) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'User ID is required for personalized content'
        }),
      };
    }

    console.log('Processing personalized content request for user:', userId);

    // Check premium access
    const isPremium = await checkPremiumAccess(userId);
    
    if (!isPremium) {
      return {
        statusCode: 403,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          premium_required: true,
          message: 'Premium subscription required for personalized learning recommendations',
          upgrade_info: {
            description: 'Upgrade to premium for AI-powered personalized learning',
            features: [
              'Personalized lesson recommendations with Claude Sonnet 4',
              'Adaptive difficulty based on your progress',
              'Learning style optimization',
              'Custom learning paths',
              'Progress-based content suggestions'
            ]
          }
        }),
      };
    }

    // Get user data
    const [preferences, progress] = await Promise.all([
      getUserPreferences(userId),
      getUserProgress(userId)
    ]);

    // Create user profile for personalization
    const userProfile = {
      preferences,
      progress,
      userId
    };

    // Generate personalized lesson recommendation
    const lesson = await generatePersonalizedLesson(userProfile, language);

    // Update preferences if provided in request
    if (requestBody.preferences) {
      await updateUserPreferences(userId, requestBody.preferences);
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: true,
        lesson: lesson,
        user_profile: {
          preferences: preferences,
          progress_summary: {
            total_subjects: progress.length,
            average_accuracy: progress.length > 0 
              ? progress.reduce((sum, p) => sum + (p.total_correct / p.total_attempted), 0) / progress.length * 100
              : 0
          }
        },
        personalization_info: {
          language: language,
          based_on: 'User preferences, learning progress, and AI analysis',
          model: lesson.is_fallback ? 'Fallback algorithm' : 'Claude Sonnet 4',
          generated_at: new Date().toISOString()
        }
      }),
    );

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
        timestamp: new Date().toISOString()
      }),
    };
  }
};