/**
 * EduSphere AI Narrative Storytelling Netlify Function
 * Handles interactive storytelling with AI-generated narratives using Supabase
 * Supports multilingual stories, audio narration, and educational content
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
 * Supported languages for narratives
 */
const SUPPORTED_LANGUAGES = {
  en: {
    name: 'English',
    locale: 'en-US'
  },
  es: {
    name: 'Spanish',
    locale: 'es-ES'
  },
  zh: {
    name: 'Chinese',
    locale: 'zh-CN'
  },
  fr: {
    name: 'French',
    locale: 'fr-FR'
  },
  de: {
    name: 'German',
    locale: 'de-DE'
  }
};

/**
 * Story themes for generation
 */
const STORY_THEMES = [
  'adventure',
  'fantasy',
  'science',
  'history',
  'animals',
  'space',
  'ocean',
  'friendship',
  'courage',
  'mystery'
];

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
 * Initialize narratives table in Supabase
 */
async function initializeNarrativesTable() {
  try {
    console.log('Initializing narratives table...');

    // Create narratives table
    const { error: narrativesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'narratives',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        story_id VARCHAR(100) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        grade VARCHAR(20) NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        theme VARCHAR(50),
        chapters JSONB,
        audio_urls JSONB,
        created_by VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    if (narrativesError) {
      console.error('Error creating narratives table:', narrativesError);
    }

    // Create user_story_progress table
    const { error: progressError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'user_story_progress',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        story_id VARCHAR(100) NOT NULL,
        current_chapter INTEGER DEFAULT 0,
        completed BOOLEAN DEFAULT FALSE,
        last_read_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, story_id)
      `
    });

    if (progressError) {
      console.error('Error creating user_story_progress table:', progressError);
    }

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'narratives',
      index_name: 'idx_narratives_story_id',
      index_definition: 'story_id'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'narratives',
      index_name: 'idx_narratives_grade',
      index_definition: 'grade'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'narratives',
      index_name: 'idx_narratives_language',
      index_definition: 'language'
    });

    // Seed sample stories
    await seedSampleStories();

    console.log('Narratives tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize narratives tables:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Seed sample stories
 */
async function seedSampleStories() {
  try {
    // Check if stories already exist
    const { data: existing } = await supabase
      .from('narratives')
      .select('id')
      .limit(1);

    if (existing && existing.length > 0) {
      console.log('Sample stories already seeded');
      return;
    }

    console.log('Seeding sample stories...');

    const sampleStories = [
      {
        story_id: 'magical_forest',
        title: 'The Magical Forest',
        content: 'Once upon a time, in a magical forest filled with talking animals and glowing flowers, there lived a brave young explorer named Alex. Every day brought new adventures and wonderful discoveries...',
        grade: 'kindergarten',
        language: 'en',
        theme: 'adventure',
        chapters: [
          {
            title: 'The Beginning',
            content: 'Alex stepped into the magical forest for the first time, eyes wide with wonder. The trees were taller than any buildings, with leaves that sparkled like jewels. "Hello?" Alex called out, and to their surprise, the forest answered back with gentle whispers.'
          },
          {
            title: 'Meeting Friends',
            content: 'A friendly rabbit hopped up to Alex and said, "Welcome to our magical home!" Soon, a wise old owl, a playful squirrel, and a shy deer joined them. "We\'ve been waiting for a human friend," they explained. Alex couldn\'t believe their ears - talking animals!'
          },
          {
            title: 'The Adventure',
            content: 'Together, Alex and the forest friends discovered a hidden treasure - not gold or jewels, but a crystal clear pond that showed the future. In its waters, Alex saw themselves growing up, always returning to visit their forest friends. It was the most precious treasure of all - friendship that would last forever.'
          }
        ]
      },
      {
        story_id: 'space_journey',
        title: 'Journey to the Stars',
        content: 'Captain Luna and her crew embarked on an incredible journey through space, discovering new planets and making friends with alien civilizations...',
        grade: 'grade1-6',
        language: 'en',
        theme: 'space',
        chapters: [
          {
            title: 'Blast Off',
            content: 'The spaceship engines roared to life as Captain Luna pressed the launch button. "Three, two, one... blast off!" she called out. The crew felt the powerful push as their ship, the Starseeker, shot up through the clouds and into the darkness of space. Earth became smaller and smaller below them, until it was just a beautiful blue marble.'
          },
          {
            title: 'New Worlds',
            content: 'The Starseeker visited many planets on its journey. On the crystal planet, everything was made of shimmering gems. On the cloud planet, the inhabitants floated on puffy platforms. The water planet was home to intelligent dolphin-like creatures who communicated through musical songs. Each world taught Captain Luna and her crew something new about the universe.'
          },
          {
            title: 'Coming Home',
            content: 'After months of exploration, it was time to return to Earth. The crew was excited to share their discoveries with everyone back home. As they approached Earth, Captain Luna gathered everyone on the bridge. "We\'ve seen amazing things," she said, "but the most precious planet in the universe is still our own." They all agreed as the beautiful blue Earth grew larger in their viewscreen.'
          }
        ]
      }
    ];

    // Insert stories
    for (const story of sampleStories) {
      const { error } = await supabase
        .from('narratives')
        .insert(story);

      if (error) {
        console.error('Error inserting sample story:', error);
      }
    }

    console.log(`Seeded ${sampleStories.length} sample stories`);

  } catch (error) {
    console.error('Failed to seed sample stories:', error);
    Sentry.captureException(error);
  }
}

/**
 * Get stories from Supabase
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Array of stories
 */
async function getStories(filters = {}) {
  try {
    const { 
      grade, 
      language = 'en', 
      theme, 
      limit = 10 
    } = filters;

    console.log('Fetching stories with filters:', filters);

    let query = supabase
      .from('narratives')
      .select('*');

    // Apply filters
    if (grade) {
      query = query.eq('grade', grade);
    }

    if (language) {
      query = query.eq('language', language);
    }

    if (theme) {
      query = query.eq('theme', theme);
    }

    // Apply ordering and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stories:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} stories`);
    return data || [];

  } catch (error) {
    console.error('Failed to get stories:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Get story by ID
 * @param {string} storyId - Story identifier
 * @returns {Promise<Object|null>} Story object or null
 */
async function getStoryById(storyId) {
  try {
    console.log('Fetching story by ID:', storyId);

    const { data, error } = await supabase
      .from('narratives')
      .select('*')
      .eq('id', storyId)
      .single();

    if (error) {
      console.error('Error fetching story by ID:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('Failed to get story by ID:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Get story by story_id
 * @param {string} storyId - Story identifier
 * @returns {Promise<Object|null>} Story object or null
 */
async function getStoryByStoryId(storyId) {
  try {
    console.log('Fetching story by story_id:', storyId);

    const { data, error } = await supabase
      .from('narratives')
      .select('*')
      .eq('story_id', storyId)
      .single();

    if (error) {
      console.error('Error fetching story by story_id:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('Failed to get story by story_id:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Update user story progress
 * @param {Object} progressData - Progress data
 * @returns {Promise<boolean>} Success status
 */
async function updateUserStoryProgress(progressData) {
  try {
    console.log('Updating user story progress:', progressData);

    // Check if progress record exists
    const { data: existingProgress } = await supabase
      .from('user_story_progress')
      .select('id')
      .eq('user_id', progressData.user_id)
      .eq('story_id', progressData.story_id)
      .single();

    if (existingProgress) {
      // Update existing progress
      const { error } = await supabase
        .from('user_story_progress')
        .update({
          current_chapter: progressData.current_chapter,
          completed: progressData.completed || false,
          last_read_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id);

      if (error) {
        console.error('Error updating user story progress:', error);
        return false;
      }
    } else {
      // Create new progress record
      const { error } = await supabase
        .from('user_story_progress')
        .insert({
          user_id: progressData.user_id,
          story_id: progressData.story_id,
          current_chapter: progressData.current_chapter,
          completed: progressData.completed || false
        });

      if (error) {
        console.error('Error creating user story progress:', error);
        return false;
      }
    }

    console.log('User story progress updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user story progress:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Generate story with Claude Sonnet 4
 * @param {Object} storyParams - Story generation parameters
 * @returns {Promise<Object|null>} Generated story or null
 */
async function generateStoryWithClaude(storyParams) {
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    console.log('Generating story with Claude Sonnet 4:', {
      grade: storyParams.grade,
      language: storyParams.language,
      theme: storyParams.theme
    });

    // Get language name
    const languageName = SUPPORTED_LANGUAGES[storyParams.language]?.name || 'English';

    // Construct system prompt for story generation
    const systemPrompt = `You are Claude Sonnet 4, an expert storyteller for EduSphere AI. 
Your role is to create engaging, age-appropriate educational stories for children.

Story Parameters:
- Grade Level: ${storyParams.grade}
- Language: ${languageName}
- Theme: ${storyParams.theme}

Guidelines:
1. Create a story appropriate for ${storyParams.grade} students
2. Write in ${languageName} language
3. Focus on the theme: ${storyParams.theme}
4. Include educational elements that teach valuable lessons
5. Structure the story with a clear beginning, middle, and end
6. Divide the story into 3-5 chapters with titles
7. Keep sentences simple and vocabulary appropriate for the age group
8. Include dialogue and descriptive language
9. Ensure the story promotes positive values like kindness, curiosity, and perseverance
10. Make the story engaging and imaginative

Format your response as a JSON object with:
{
  "title": "Story Title",
  "story_id": "unique_id_for_story",
  "content": "Brief summary of the story",
  "theme": "${storyParams.theme}",
  "grade": "${storyParams.grade}",
  "language": "${storyParams.language}",
  "chapters": [
    {
      "title": "Chapter 1 Title",
      "content": "Full text of chapter 1"
    },
    {
      "title": "Chapter 2 Title",
      "content": "Full text of chapter 2"
    },
    ...
  ]
}`;

    // Prepare Claude API request
    const url = `${ANTHROPIC_BASE_URL}/messages`;
    const requestData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please create an original educational story for ${storyParams.grade} students about ${storyParams.theme} in ${languageName}. Make it engaging, age-appropriate, and divided into chapters.`
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

      // Parse the JSON response
      try {
        const storyData = JSON.parse(content);
        
        console.log('Story generated successfully:', {
          title: storyData.title,
          chapters: storyData.chapters?.length || 0
        });
        
        return storyData;
        
      } catch (parseError) {
        console.error('Failed to parse Claude response as JSON:', parseError);
        throw new Error('Invalid story format returned by Claude');
      }
      
    } else {
      throw new Error(`Claude API error: ${response.statusCode}`);
    }

  } catch (error) {
    console.error('Claude story generation failed:', error.message);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Save generated story to Supabase
 * @param {Object} storyData - Story data
 * @returns {Promise<Object|null>} Saved story or null
 */
async function saveStory(storyData) {
  try {
    console.log('Saving story to Supabase:', storyData.title);

    const { data, error } = await supabase
      .from('narratives')
      .insert({
        story_id: storyData.story_id,
        title: storyData.title,
        content: storyData.content,
        grade: storyData.grade,
        language: storyData.language,
        theme: storyData.theme,
        chapters: storyData.chapters,
        created_by: storyData.created_by
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving story:', error);
      return null;
    }

    console.log('Story saved successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to save story:', error);
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
    const action = body.action || 'generate_story';

    if (action === 'generate_story') {
      if (body.grade && !['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'].includes(body.grade)) {
        errors.push('Invalid grade. Must be one of: kindergarten, grade1-6, grade7-9, grade10-12, matric');
      }

      if (body.language && !SUPPORTED_LANGUAGES[body.language]) {
        errors.push(`Invalid language. Must be one of: ${Object.keys(SUPPORTED_LANGUAGES).join(', ')}`);
      }

      if (body.theme && !STORY_THEMES.includes(body.theme)) {
        errors.push(`Invalid theme. Must be one of: ${STORY_THEMES.join(', ')}`);
      }

    } else if (action === 'update_progress') {
      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!body.story_id || typeof body.story_id !== 'string') {
        errors.push('Story ID is required and must be a string');
      }

      if (typeof body.current_chapter !== 'number' || body.current_chapter < 0) {
        errors.push('Current chapter is required and must be a non-negative number');
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
  console.log('Narrative function invoked:', {
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
    await initializeNarrativesTable();

    // Handle GET requests - fetch stories
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      
      try {
        // Get story by ID
        if (queryParams.id) {
          const story = await getStoryById(queryParams.id);
          
          if (!story) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Story not found',
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
              story: story,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        // Get story by story_id
        if (queryParams.story_id) {
          const story = await getStoryByStoryId(queryParams.story_id);
          
          if (!story) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Story not found',
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
              story: story,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        // Get stories with filters
        const filters = {
          grade: queryParams.grade,
          language: queryParams.language || 'en',
          theme: queryParams.theme,
          limit: queryParams.limit ? parseInt(queryParams.limit) : 10
        };

        const stories = await getStories(filters);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            stories: stories,
            count: stories.length,
            filters: filters,
            supported_languages: Object.keys(SUPPORTED_LANGUAGES),
            supported_themes: STORY_THEMES,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch stories:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch stories',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - generate stories or update progress
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

      const action = requestBody.action || 'generate_story';
      const userId = extractUserId(event, requestBody);

      try {
        if (action === 'generate_story') {
          // Check premium access for story generation
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
                message: 'Premium subscription required for AI-powered story generation',
                timestamp: new Date().toISOString(),
              }),
            };
          }

          // Generate story with Claude Sonnet 4
          const storyParams = {
            grade: requestBody.grade || 'kindergarten',
            language: requestBody.language || 'en',
            theme: requestBody.theme || STORY_THEMES[Math.floor(Math.random() * STORY_THEMES.length)]
          };

          const generatedStory = await generateStoryWithClaude(storyParams);
          
          if (!generatedStory) {
            return {
              statusCode: 500,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Failed to generate story',
                message: 'Story generation service is currently unavailable',
              }),
            };
          }

          // Save story to Supabase
          const savedStory = await saveStory({
            ...generatedStory,
            created_by: userId
          });
          
          if (savedStory) {
            return {
              statusCode: 201,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                story: savedStory,
                message: 'Story generated and saved successfully',
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
                error: 'Failed to save generated story',
              }),
            };
          }

        } else if (action === 'update_progress') {
          // Update user's story progress
          const progressData = {
            user_id: userId || requestBody.user_id,
            story_id: requestBody.story_id,
            current_chapter: requestBody.current_chapter,
            completed: requestBody.completed || false
          };

          const updated = await updateUserStoryProgress(progressData);
          
          if (updated) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                progress: progressData,
                message: 'Story progress updated successfully',
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
                error: 'Failed to update story progress',
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
            allowedActions: ['generate_story', 'update_progress'],
          }),
        };

      } catch (error) {
        console.error('Failed to process narrative request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process narrative request',
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
          GET: 'Fetch stories with optional filters',
          POST: 'Generate stories or update reading progress'
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
        message: 'An unexpected error occurred while processing narratives',
        timestamp: new Date().toISOString()
      }),
    };
  }
};