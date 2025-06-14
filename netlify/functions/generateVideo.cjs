/**
 * Enhanced Tavus Video Generation Netlify Function with AI Tutor Support
 * Handles AI-powered personalized video generation with premium subscription gating and social sharing
 * Supports AI tutor with tone selection and social sharing features
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://faphnxotbuwiwfatuok.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGhueG90YnV3aXdmYXR1b2siLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNzQ5MjIwMTEzLCJleHAiOjIwNjQ3OTYxMTN9.Ej8nQJhQJGqkKJqKJqKJqKJqKJqKJqKJqKJqKJqKJqK';

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Tavus API configuration
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_BASE_URL = 'https://tavusapi.com/v2';

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
 * AI Tutor tone configurations with voice settings
 */
const TUTOR_TONES = {
  friendly: {
    name: 'Friendly',
    description: 'Warm and encouraging',
    voice_settings: {
      stability: 0.7,
      similarity_boost: 0.8,
      style: 0.6,
      speaking_rate: 1.0,
      pitch: 1.1
    },
    persona_traits: 'warm, encouraging, supportive, patient'
  },
  professional: {
    name: 'Professional',
    description: 'Clear and structured',
    voice_settings: {
      stability: 0.8,
      similarity_boost: 0.9,
      style: 0.3,
      speaking_rate: 0.9,
      pitch: 1.0
    },
    persona_traits: 'clear, structured, authoritative, precise'
  },
  enthusiastic: {
    name: 'Enthusiastic',
    description: 'Energetic and motivating',
    voice_settings: {
      stability: 0.6,
      similarity_boost: 0.7,
      style: 0.8,
      speaking_rate: 1.1,
      pitch: 1.2
    },
    persona_traits: 'energetic, motivating, exciting, dynamic'
  },
  patient: {
    name: 'Patient',
    description: 'Calm and understanding',
    voice_settings: {
      stability: 0.9,
      similarity_boost: 0.8,
      style: 0.2,
      speaking_rate: 0.8,
      pitch: 0.9
    },
    persona_traits: 'calm, understanding, gentle, reassuring'
  },
  playful: {
    name: 'Playful',
    description: 'Fun and interactive',
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.6,
      style: 0.9,
      speaking_rate: 1.0,
      pitch: 1.3
    },
    persona_traits: 'fun, interactive, playful, engaging'
  }
};

/**
 * Make HTTP request using Node.js built-in modules
 * @param {string} url - Request URL
 * @param {Object} options - Request options
 * @param {string|Buffer} data - Request body data
 * @returns {Promise<Object>} Response data
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
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        try {
          const responseBuffer = Buffer.concat(chunks);
          let parsedData;
          
          if (res.headers['content-type']?.includes('application/json')) {
            parsedData = JSON.parse(responseBuffer.toString());
          } else {
            parsedData = responseBuffer;
          }
          
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
      return false;
    }

    if (response.statusCode === 200 && response.data) {
      const { subscriber } = response.data;
      
      if (subscriber && subscriber.entitlements && subscriber.entitlements.premium) {
        const premium = subscriber.entitlements.premium;
        
        if (!premium.expires_date) {
          return true;
        }
        
        const expirationTime = new Date(premium.expires_date).getTime();
        const currentTime = new Date().getTime();
        
        return expirationTime > currentTime;
      }
    }

    return false;

  } catch (error) {
    console.error('Premium access check failed:', error.message);
    return false;
  }
}

/**
 * Create a new video generation request with Tavus API
 * @param {Object} videoParams - Video generation parameters
 * @returns {Promise<Object>} Video generation response from Tavus
 */
async function createTavusVideo(videoParams) {
  try {
    if (!TAVUS_API_KEY) {
      throw new Error('Tavus API key not configured in environment variables');
    }

    console.log('Creating Tavus video with parameters:', {
      script: videoParams.script?.substring(0, 100) + '...',
      background: videoParams.background,
      persona_id: videoParams.persona_id,
      video_name: videoParams.video_name,
      tone: videoParams.tone
    });

    // Get tone-specific settings
    const toneConfig = TUTOR_TONES[videoParams.tone] || TUTOR_TONES.friendly;

    // Prepare Tavus API request with enhanced settings
    const url = `${TAVUS_BASE_URL}/videos`;
    const requestData = JSON.stringify({
      background: videoParams.background || '#f0f8ff',
      script: videoParams.script,
      persona_id: videoParams.persona_id || 'default',
      video_name: videoParams.video_name || `EduSphere Video ${Date.now()}`,
      callback_url: videoParams.callback_url,
      properties: {
        voice_settings: {
          ...toneConfig.voice_settings,
          use_speaker_boost: true,
        },
        video_settings: {
          quality: videoParams.quality || 'high',
          format: videoParams.format || 'mp4',
          resolution: '1080p',
          fps: 30,
        },
        persona_settings: {
          tone: videoParams.tone,
          traits: toneConfig.persona_traits,
          educational_context: true,
          age_appropriate: true,
        },
      },
      metadata: {
        created_by: 'EduSphere AI',
        content_type: videoParams.content_type || 'educational',
        subject: videoParams.subject,
        grade: videoParams.age_group,
        tone: videoParams.tone,
        language: videoParams.language || 'en',
      },
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVUS_API_KEY,
      },
    };

    // Make request to Tavus API
    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('Tavus video creation successful:', {
        video_id: response.data.video_id,
        status: response.data.status,
        tone: videoParams.tone
      });
      
      return {
        ...response.data,
        tone_used: videoParams.tone,
        voice_settings: toneConfig.voice_settings,
        estimated_processing_time: '2-5 minutes'
      };
    } else {
      throw new Error(`Tavus API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('Tavus video creation failed:', error.message);
    throw error;
  }
}

/**
 * Save tutor script to Supabase
 * @param {Object} scriptData - Script data to save
 * @returns {Promise<string|null>} Script ID or null if failed
 */
async function saveTutorScript(scriptData) {
  try {
    console.log('Saving tutor script to Supabase');

    const { data, error } = await supabase
      .from('tutor_scripts')
      .insert({
        tone: scriptData.tone,
        script: scriptData.script,
        grade: scriptData.grade,
        subject: scriptData.subject,
        topic: scriptData.topic,
        duration_minutes: scriptData.duration_minutes || 5,
        voice_settings: scriptData.voice_settings || {},
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving tutor script:', error);
      return null;
    }

    console.log('Tutor script saved successfully:', data.id);
    return data.id;

  } catch (error) {
    console.error('Failed to save tutor script:', error);
    return null;
  }
}

/**
 * Save shared content to Supabase
 * @param {Object} contentData - Content data to save
 * @returns {Promise<string|null>} Content ID or null if failed
 */
async function saveSharedContent(contentData) {
  try {
    console.log('Saving shared content to Supabase');

    const { data, error } = await supabase
      .from('shared_content')
      .insert({
        user_id: contentData.user_id,
        content_type: contentData.content_type,
        content_title: contentData.content_title,
        share_url: contentData.share_url,
        thumbnail_url: contentData.thumbnail_url,
        description: contentData.description,
        views: 0,
        likes: 0,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error saving shared content:', error);
      return null;
    }

    console.log('Shared content saved successfully:', data.id);
    return data.id;

  } catch (error) {
    console.error('Failed to save shared content:', error);
    return null;
  }
}

/**
 * Generate educational video script based on topic and parameters
 * @param {string} topic - Educational topic for the video
 * @param {string} ageGroup - Target age group
 * @param {string} tone - AI tutor tone
 * @param {string} language - Target language
 * @returns {string} Generated educational script
 */
function generateEducationalScript(topic, ageGroup = 'grade1-6', tone = 'friendly', language = 'en') {
  const toneConfig = TUTOR_TONES[tone] || TUTOR_TONES.friendly;
  
  // Base scripts by age group and language
  const scripts = {
    'kindergarten': {
      en: {
        'Numbers 1-10': `Hi there, little learners! I'm your ${toneConfig.name.toLowerCase()} AI tutor, and I'm so excited to explore numbers with you today! Let's count together from 1 to 10. One is like having one special toy. Two is like your two hands clapping together. Three is like a triangle with three corners. Four is like a table with four legs. Five is like all the fingers on one hand. Six is like an insect with six legs. Seven is like the days in a week. Eight is like an octopus with eight arms. Nine is like a cat with nine lives. And ten is like all your fingers together! Great job learning numbers with me!`,
        
        'Alphabet A-Z': `Welcome to our alphabet adventure! I'm here to help you learn your letters in a ${toneConfig.name.toLowerCase()} way. A is for Apple, red and sweet to eat. B is for Ball, bouncy and fun to play with. C is for Cat, soft and cuddly. D is for Dog, loyal and friendly. Let's sing the alphabet song together: A-B-C-D-E-F-G, H-I-J-K-L-M-N-O-P, Q-R-S-T-U-V, W-X-Y and Z! Now you know your ABCs! Practice writing each letter and you'll be reading amazing stories soon!`,
        
        'Colors and Shapes': `Let's discover colors and shapes around us! I'm your ${toneConfig.name.toLowerCase()} guide for this colorful journey. Red like a fire truck, blue like the sky, yellow like the sun, and green like grass. Circles are round like wheels, squares have four equal sides, triangles have three corners, and rectangles are like doors. Look around and find these colors and shapes everywhere!`
      },
      es: {
        'Numbers 1-10': `¡Hola pequeños estudiantes! Soy tu tutor de IA ${toneConfig.name.toLowerCase()} y estoy muy emocionado de explorar los números contigo hoy. Contemos juntos del 1 al 10. Uno es como tener un juguete especial. Dos es como tus dos manos aplaudiendo juntas. ¡Excelente trabajo aprendiendo números conmigo!`,
        
        'Alphabet A-Z': `¡Bienvenidos a nuestra aventura del alfabeto! Estoy aquí para ayudarte a aprender tus letras de manera ${toneConfig.name.toLowerCase()}. A es de Árbol, B es de Bola, C es de Casa. ¡Cantemos la canción del alfabeto juntos!`
      }
    },
    
    'grade1-6': {
      en: {
        'Numbers 1-10': `Hello young mathematicians! I'm your ${toneConfig.name.toLowerCase()} AI tutor, and today we're exploring numbers from 1 to 10 and how they help us every day! Numbers help us count, measure, and solve problems. Let's practice: 1 plus 1 equals 2. 2 plus 2 equals 4. Can you see the pattern? Numbers are everywhere around us - in clocks showing time, in money we use to buy things, in games we play! Practice counting every day and you'll become a number expert!`,
        
        'Solar System': `Welcome to our amazing journey through the solar system! I'm your ${toneConfig.name.toLowerCase()} guide to the cosmos. The Sun is our closest star, giving us light and warmth. Eight planets orbit around the Sun. Mercury is closest and hottest. Earth is our home, the perfect distance for life. Jupiter is the biggest planet. Can you imagine exploring space? Let's learn about each planet and discover the wonders of our cosmic neighborhood!`,
        
        'AI Tutor Session': `Hello there! I'm your personal AI tutor, and I'm here to make learning fun and exciting! Today we're going to explore new concepts together. I'll be your ${toneConfig.name.toLowerCase()} guide, helping you understand complex ideas in simple ways. Remember, every question you have is important, and there's no such thing as a silly question. Let's embark on this learning adventure together!`
      },
      es: {
        'Numbers 1-10': `¡Hola jóvenes matemáticos! Soy tu tutor de IA ${toneConfig.name.toLowerCase()}, y hoy estamos explorando los números del 1 al 10 y cómo nos ayudan todos los días. ¡Los números nos ayudan a contar, medir y resolver problemas!`,
        
        'Solar System': `¡Bienvenidos a nuestro increíble viaje por el sistema solar! Soy tu guía ${toneConfig.name.toLowerCase()} al cosmos. El Sol es nuestra estrella más cercana, dándonos luz y calor.`
      }
    }
  };
  
  // Get appropriate script or use default
  const ageScripts = scripts[ageGroup] || scripts['grade1-6'];
  const languageScripts = ageScripts[language] || ageScripts.en;
  const script = languageScripts[topic] || languageScripts['AI Tutor Session'] || 
                `Hello! I'm your ${toneConfig.name.toLowerCase()} AI tutor. Let's learn about ${topic} together! This is an exciting topic that will help you grow and discover new things. Learning is a wonderful adventure that opens up endless possibilities. Practice makes perfect, so keep exploring and asking questions!`;
  
  return script;
}

/**
 * Generate fallback video response for free users or when Tavus fails
 * @param {string} topic - Video topic
 * @param {string} ageGroup - Target age group
 * @param {string} tone - AI tutor tone
 * @param {string} language - Target language
 * @returns {Object} Fallback response
 */
function generateFallbackVideo(topic, ageGroup, tone = 'friendly', language = 'en') {
  console.log('Generating fallback video response for topic:', topic);
  
  const script = generateEducationalScript(topic, ageGroup, tone, language);
  const toneConfig = TUTOR_TONES[tone] || TUTOR_TONES.friendly;
  
  return {
    success: true,
    fallback: true,
    message: 'Using static educational content as fallback',
    video_data: {
      topic,
      age_group: ageGroup,
      script,
      tone: tone,
      tone_description: toneConfig.description,
      duration_estimate: '2-3 minutes',
      format: 'educational_content',
      voice_settings: toneConfig.voice_settings,
    },
    instructions: {
      method: 'static_content',
      description: `Display educational content with ${toneConfig.name.toLowerCase()} tone`,
      content_type: 'text_based_learning',
      implementation: 'Create slides or cards with the provided script content',
      tone_guidance: `Present content in a ${toneConfig.description} manner`
    },
    upgrade_info: {
      description: 'Upgrade to premium for AI-generated personalized videos with Tavus',
      features: [
        'Personalized AI avatars with multiple tones',
        'Custom voice settings and accents',
        'Interactive video elements',
        'Multiple video formats and qualities',
        'Faster video generation',
        'Advanced customization options',
        'Social sharing capabilities'
      ]
    }
  };
}

/**
 * Validate video generation request parameters
 * @param {Object} body - Request body
 * @returns {Object} Validation result
 */
function validateVideoRequest(body) {
  const errors = [];

  if (!body.topic || typeof body.topic !== 'string') {
    errors.push('Topic parameter is required and must be a string');
  } else if (body.topic.trim().length === 0) {
    errors.push('Topic parameter cannot be empty');
  } else if (body.topic.length > 200) {
    errors.push('Topic parameter cannot exceed 200 characters');
  }

  if (body.script && typeof body.script !== 'string') {
    errors.push('Script must be a string');
  } else if (body.script && body.script.length > 10000) {
    errors.push('Script cannot exceed 10000 characters');
  }

  if (body.age_group && !['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'].includes(body.age_group)) {
    errors.push('Invalid age group. Must be one of: kindergarten, grade1-6, grade7-9, grade10-12, matric');
  }

  if (body.tone && !Object.keys(TUTOR_TONES).includes(body.tone)) {
    errors.push(`Invalid tone. Must be one of: ${Object.keys(TUTOR_TONES).join(', ')}`);
  }

  if (body.quality && !['low', 'medium', 'high', 'ultra'].includes(body.quality)) {
    errors.push('Quality must be one of: low, medium, high, ultra');
  }

  if (body.language && typeof body.language !== 'string') {
    errors.push('Language must be a string');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract user ID from request
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Request body
 * @returns {string|null} User ID
 */
function extractUserId(event, requestBody) {
  return requestBody.userId || 
         requestBody.user_id ||
         event.headers['x-user-id'] || 
         event.headers['X-User-ID'] ||
         event.queryStringParameters?.user_id ||
         event.queryStringParameters?.userId ||
         null;
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Enhanced Video Generation function invoked:', {
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

  // Handle GET requests for video status checking
  if (event.httpMethod === 'GET') {
    const videoId = event.queryStringParameters?.video_id;
    const userId = event.headers['x-user-id'] || event.headers['X-User-ID'];

    if (!videoId) {
      return {
        statusCode: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'Video ID parameter is required for status check',
          usage: 'GET /.netlify/functions/generateVideo?video_id=your_video_id'
        }),
      };
    }

    try {
      // Check premium access for video status
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
            message: 'Premium subscription required for video status checking',
          }),
        };
      }

      // In a real implementation, you would check video status with Tavus
      // For now, return a mock status
      const mockStatus = {
        video_id: videoId,
        status: 'completed',
        progress: 100,
        video_url: `https://tavus-videos.s3.amazonaws.com/${videoId}.mp4`,
        thumbnail_url: `https://tavus-videos.s3.amazonaws.com/${videoId}_thumb.jpg`,
        duration: 120,
        created_at: new Date().toISOString()
      };
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          video_status: mockStatus,
          timestamp: new Date().toISOString(),
        }),
      };

    } catch (error) {
      console.error('Video status check error:', error);
      
      return {
        statusCode: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          error: 'Failed to check video status',
          message: error.message,
          video_id: videoId
        }),
      };
    }
  }

  // Only allow POST requests for video generation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST for video generation or GET for status check.',
        allowedMethods: ['POST', 'GET', 'OPTIONS']
      }),
    };
  }

  try {
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
    const validation = validateVideoRequest(requestBody);
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
    const { 
      topic,
      script,
      age_group = 'grade1-6',
      background,
      persona_id,
      quality = 'high',
      tone = 'friendly',
      language = 'en',
      content_type = 'educational',
      subject = 'general',
      share_content = false
    } = requestBody;

    // Extract user ID for subscription checking
    const userId = extractUserId(event, requestBody);

    console.log('Processing enhanced video generation request:', {
      topic,
      age_group,
      tone,
      language,
      userId: userId || '[Not provided]',
      hasCustomScript: !!script,
      quality,
      shareContent: share_content
    });

    // Check subscription status via RevenueCat
    const isPremium = await checkPremiumAccess(userId);
    
    console.log('Premium access check result:', {
      isPremium,
      userId: userId || '[Not provided]'
    });

    // Gate premium Tavus features behind subscription
    if (!isPremium) {
      console.log('User does not have premium access, providing fallback content');
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          premium_required: true,
          message: `Premium subscription required for AI-powered video generation with Tavus`,
          fallback: generateFallbackVideo(topic, age_group, tone, language),
          tone_info: {
            selected_tone: tone,
            tone_description: TUTOR_TONES[tone]?.description || 'Friendly and encouraging',
            available_tones: Object.keys(TUTOR_TONES)
          }
        }),
      };
    }

    // User has premium access, proceed with Tavus video generation
    try {
      console.log('User has premium access, generating video with Tavus');
      
      // Generate script if not provided
      const finalScript = script || generateEducationalScript(topic, age_group, tone, language);
      
      // Prepare video parameters for Tavus with enhanced settings
      const videoParams = {
        script: finalScript,
        background: background || '#f0f8ff',
        persona_id: persona_id || 'default',
        video_name: `EduSphere: ${topic} (${age_group}) - ${tone} tone`,
        quality,
        tone,
        language,
        content_type,
        subject,
        age_group,
      };

      // Create video with Tavus API
      const videoResponse = await createTavusVideo(videoParams);
      
      // Save tutor script to Supabase
      if (userId) {
        await saveTutorScript({
          tone,
          script: finalScript,
          grade: age_group,
          subject,
          topic,
          duration_minutes: Math.ceil(finalScript.length / 150), // Estimate based on reading speed
          voice_settings: TUTOR_TONES[tone]?.voice_settings || {}
        });
      }

      // Save shared content if requested
      let shareId = null;
      if (share_content && userId) {
        shareId = await saveSharedContent({
          user_id: userId,
          content_type: 'video',
          content_title: `${topic} - ${tone} AI Tutor`,
          share_url: videoResponse.video_url || `https://edusphere.ai/video/${videoResponse.video_id}`,
          thumbnail_url: videoResponse.thumbnail_url,
          description: `AI-generated educational video about ${topic} with ${tone} tone`,
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
          premium: true,
          video_data: {
            ...videoResponse,
            share_id: shareId,
            share_url: shareId ? `https://edusphere.ai/share/${shareId}` : null
          },
          topic,
          age_group,
          tone_used: tone,
          tone_description: TUTOR_TONES[tone]?.description,
          script_length: finalScript.length,
          generation_time: new Date().toISOString(),
          message: 'Video generation started successfully with Tavus',
          usage_info: {
            provider: 'Tavus',
            quality: quality,
            tone: tone,
            estimated_processing_time: '2-5 minutes',
            ai_tutor_enabled: true
          }
        }),
      };

    } catch (tavusError) {
      console.error('Tavus video generation failed, providing fallback:', tavusError.message);
      
      // Even premium users get fallback if Tavus fails
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          premium: true,
          tavus_error: tavusError.message,
          fallback: generateFallbackVideo(topic, age_group, tone, language),
          message: 'Tavus temporarily unavailable, using enhanced fallback content',
          tone_info: {
            selected_tone: tone,
            tone_description: TUTOR_TONES[tone]?.description,
            voice_settings: TUTOR_TONES[tone]?.voice_settings
          },
          retry_info: {
            suggestion: 'Please try again in a few moments',
            fallback_available: true
          }
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
        message: 'An unexpected error occurred while processing your video generation request',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `video_${Date.now()}`
        }
      }),
    };
  }
};