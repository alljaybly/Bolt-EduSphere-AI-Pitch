/**
 * Tavus Video Generation Netlify Function
 * Handles AI-powered personalized video generation with premium subscription gating
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');

// Tavus API configuration
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_BASE_URL = 'https://tavusapi.com/v2';

// RevenueCat configuration
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
 * @param {string} data - Request body data
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
 * Check user's subscription status via RevenueCat
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Subscription status
 */
async function checkSubscriptionStatus(userId) {
  try {
    console.log('Checking subscription status for user:', userId);

    if (!userId || userId === '[Not provided]') {
      console.log('No user ID provided, treating as free user');
      return {
        isPremium: false,
        isActive: false,
        error: 'No user ID provided',
      };
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

    if (response.statusCode === 200 && response.data) {
      const { subscriber } = response.data;
      
      if (subscriber && subscriber.entitlements) {
        const premiumEntitlement = subscriber.entitlements.premium;
        
        if (premiumEntitlement) {
          const isActive = !premiumEntitlement.expires_date || 
                          new Date(premiumEntitlement.expires_date) > new Date();
          
          return {
            isPremium: true,
            isActive,
            expirationDate: premiumEntitlement.expires_date,
            productId: premiumEntitlement.product_identifier,
          };
        }
      }
    }

    // User exists but no premium subscription
    return {
      isPremium: false,
      isActive: false,
    };

  } catch (error) {
    console.error('RevenueCat subscription check failed:', error.message);
    
    // On error, default to free tier for security
    return {
      isPremium: false,
      isActive: false,
      error: error.message,
    };
  }
}

/**
 * Create a new video generation request with Tavus
 * @param {Object} videoParams - Video generation parameters
 * @returns {Promise<Object>} Video generation response
 */
async function createTavusVideo(videoParams) {
  try {
    if (!TAVUS_API_KEY) {
      throw new Error('Tavus API key not configured');
    }

    console.log('Creating Tavus video with parameters:', {
      script: videoParams.script?.substring(0, 100) + '...',
      background: videoParams.background,
      persona_id: videoParams.persona_id,
    });

    const url = `${TAVUS_BASE_URL}/videos`;
    const requestData = JSON.stringify({
      background: videoParams.background || '#f0f0f0',
      script: videoParams.script,
      persona_id: videoParams.persona_id || 'default',
      video_name: videoParams.video_name || `EduSphere Video ${Date.now()}`,
      callback_url: videoParams.callback_url,
      properties: {
        voice_settings: {
          stability: videoParams.voice_stability || 0.5,
          similarity_boost: videoParams.voice_similarity || 0.5,
        },
        video_settings: {
          quality: videoParams.quality || 'high',
          format: videoParams.format || 'mp4',
        },
      },
    });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVUS_API_KEY,
      },
    };

    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('Tavus video creation successful:', response.data);
      return response.data;
    } else {
      throw new Error(`Tavus API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('Tavus video creation failed:', error.message);
    throw error;
  }
}

/**
 * Get video status from Tavus
 * @param {string} videoId - Video ID to check
 * @returns {Promise<Object>} Video status response
 */
async function getTavusVideoStatus(videoId) {
  try {
    if (!TAVUS_API_KEY) {
      throw new Error('Tavus API key not configured');
    }

    console.log('Checking Tavus video status for ID:', videoId);

    const url = `${TAVUS_BASE_URL}/videos/${videoId}`;
    const options = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TAVUS_API_KEY,
      },
    };

    const response = await makeHttpRequest(url, options);

    if (response.statusCode === 200) {
      console.log('Tavus video status retrieved:', response.data);
      return response.data;
    } else {
      throw new Error(`Tavus API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('Tavus video status check failed:', error.message);
    throw error;
  }
}

/**
 * Generate educational video script based on topic
 * @param {string} topic - Educational topic
 * @param {string} ageGroup - Target age group
 * @returns {string} Generated script
 */
function generateEducationalScript(topic, ageGroup = 'grade1-6') {
  const scripts = {
    'kindergarten': {
      'Numbers 1-10': `Hi there! Let's learn about numbers together! 
        One is like having one toy. Two is like having two hands. 
        Three is like a triangle with three sides. Four is like a table with four legs. 
        Five is like the fingers on one hand. Six is like an insect with six legs. 
        Seven is like the days in a week. Eight is like an octopus with eight arms. 
        Nine is like a cat with nine lives. And ten is like all your fingers together! 
        Great job learning numbers!`,
      
      'Alphabet A-Z': `Welcome to the alphabet adventure! 
        A is for Apple, red and sweet. B is for Ball, bouncy and fun. 
        C is for Cat, soft and cuddly. D is for Dog, loyal and friendly. 
        Let's sing the alphabet song together: A-B-C-D-E-F-G, H-I-J-K-L-M-N-O-P, 
        Q-R-S-T-U-V, W-X-Y and Z! Now you know your ABCs!`,
    },
    'grade1-6': {
      'Numbers 1-10': `Today we're exploring numbers from 1 to 10! 
        Numbers help us count, measure, and solve problems. 
        Let's practice: 1 plus 1 equals 2. 2 plus 2 equals 4. 
        Can you see the pattern? Numbers are everywhere around us - 
        in clocks, in money, in games! Practice counting every day!`,
      
      'Alphabet A-Z': `The alphabet is the foundation of reading and writing! 
        Each letter has a special sound. When we put letters together, 
        they make words. Words make sentences. Sentences tell stories! 
        Practice writing each letter and saying its sound. 
        Soon you'll be reading amazing books!`,
    },
  };

  const ageScripts = scripts[ageGroup] || scripts['grade1-6'];
  return ageScripts[topic] || `Let's learn about ${topic}! This is an exciting topic that will help you grow and learn new things. Practice makes perfect!`;
}

/**
 * Generate fallback video response
 * @param {string} topic - Video topic
 * @param {string} ageGroup - Target age group
 * @returns {Object} Fallback response
 */
function generateFallbackVideo(topic, ageGroup) {
  console.log('Generating fallback video response for topic:', topic);
  
  const script = generateEducationalScript(topic, ageGroup);
  
  return {
    success: true,
    fallback: true,
    message: 'Using static educational content as fallback',
    video_data: {
      topic,
      age_group: ageGroup,
      script,
      duration_estimate: '2-3 minutes',
      format: 'educational_content',
    },
    instructions: {
      method: 'static_content',
      description: 'Display educational content with text and images',
      content_type: 'text_based_learning',
    },
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
  }

  if (body.script && typeof body.script !== 'string') {
    errors.push('Script must be a string');
  } else if (body.script && body.script.length > 10000) {
    errors.push('Script cannot exceed 10000 characters');
  }

  if (body.age_group && !['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'].includes(body.age_group)) {
    errors.push('Invalid age group specified');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Video Generation function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
  });

  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: '',
    };
  }

  // Handle GET requests for video status
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
        }),
      };
    }

    try {
      // Check subscription status
      const subscriptionStatus = await checkSubscriptionStatus(userId);
      
      if (!subscriptionStatus.isPremium || !subscriptionStatus.isActive) {
        return {
          statusCode: 403,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            premium_required: true,
            message: 'Premium subscription required for video generation',
            subscription_status: subscriptionStatus,
          }),
        };
      }

      // Get video status from Tavus
      const videoStatus = await getTavusVideoStatus(videoId);
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          video_status: videoStatus,
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

    // Extract parameters
    const { 
      topic,
      script,
      age_group = 'grade1-6',
      background,
      persona_id,
      quality = 'high',
      userId 
    } = requestBody;

    // Get user ID from headers if not in body
    const finalUserId = userId || event.headers['x-user-id'] || event.headers['X-User-ID'];

    console.log('Processing video generation request:', {
      topic,
      age_group,
      userId: finalUserId || '[Not provided]',
      hasCustomScript: !!script,
    });

    // Check subscription status
    const subscriptionStatus = await checkSubscriptionStatus(finalUserId);
    
    console.log('Subscription check result:', {
      isPremium: subscriptionStatus.isPremium,
      isActive: subscriptionStatus.isActive,
      hasError: !!subscriptionStatus.error,
    });

    // Gate premium features behind subscription
    if (!subscriptionStatus.isPremium || !subscriptionStatus.isActive) {
      console.log('User does not have premium access, providing fallback');
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          premium_required: true,
          message: 'Premium subscription required for AI-powered video generation',
          subscription_status: subscriptionStatus,
          fallback: generateFallbackVideo(topic, age_group),
        }),
      };
    }

    // User has premium access, proceed with Tavus video generation
    try {
      // Generate script if not provided
      const finalScript = script || generateEducationalScript(topic, age_group);
      
      // Prepare video parameters
      const videoParams = {
        script: finalScript,
        background: background || '#f0f8ff',
        persona_id: persona_id || 'default',
        video_name: `EduSphere: ${topic} (${age_group})`,
        quality,
        voice_stability: 0.7,
        voice_similarity: 0.8,
      };

      // Create video with Tavus
      const videoResponse = await createTavusVideo(videoParams);
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          premium: true,
          video_data: videoResponse,
          topic,
          age_group,
          script_length: finalScript.length,
          generation_time: new Date().toISOString(),
          message: 'Video generation started successfully',
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
          fallback: generateFallbackVideo(topic, age_group),
          message: 'Tavus temporarily unavailable, using fallback content',
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
        message: 'An unexpected error occurred while processing your request',
        timestamp: new Date().toISOString(),
      }),
    };
  }
};