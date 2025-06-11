/**
 * Tavus Video Generation Netlify Function with RevenueCat Integration
 * Handles AI-powered personalized video generation with premium subscription gating
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');

// Tavus API configuration
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_BASE_URL = 'https://tavusapi.com/v2';

// RevenueCat configuration (matching src/lib/revenuecat.js)
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
 * Check user's subscription status via RevenueCat REST API
 * Determines if user has premium access for Tavus video generation
 * @param {string} userId - User identifier from headers or request
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
 * Create a new video generation request with Tavus API
 * Generates personalized educational videos using AI avatars
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
      video_name: videoParams.video_name
    });

    // Prepare Tavus API request
    const url = `${TAVUS_BASE_URL}/videos`;
    const requestData = JSON.stringify({
      background: videoParams.background || '#f0f8ff',
      script: videoParams.script,
      persona_id: videoParams.persona_id || 'default',
      video_name: videoParams.video_name || `EduSphere Video ${Date.now()}`,
      callback_url: videoParams.callback_url,
      properties: {
        voice_settings: {
          stability: videoParams.voice_stability || 0.7,
          similarity_boost: videoParams.voice_similarity || 0.8,
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

    // Make request to Tavus API
    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200 || response.statusCode === 201) {
      console.log('Tavus video creation successful:', {
        video_id: response.data.video_id,
        status: response.data.status
      });
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
 * Get video status from Tavus API
 * Checks the processing status of a previously created video
 * @param {string} videoId - Video ID to check status for
 * @returns {Promise<Object>} Video status response from Tavus
 */
async function getTavusVideoStatus(videoId) {
  try {
    if (!TAVUS_API_KEY) {
      throw new Error('Tavus API key not configured in environment variables');
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
      console.log('Tavus video status retrieved:', {
        video_id: videoId,
        status: response.data.status,
        progress: response.data.progress
      });
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
 * Generate educational video script based on topic and age group
 * Creates age-appropriate content for different learning levels
 * @param {string} topic - Educational topic for the video
 * @param {string} ageGroup - Target age group (kindergarten, grade1-6, etc.)
 * @returns {string} Generated educational script
 */
function generateEducationalScript(topic, ageGroup = 'grade1-6') {
  const scripts = {
    'kindergarten': {
      'Numbers 1-10': `Hi there, little learners! Let's explore numbers together! 
        One is like having one special toy. Two is like your two hands clapping together. 
        Three is like a triangle with three corners. Four is like a table with four legs. 
        Five is like all the fingers on one hand. Six is like an insect with six legs. 
        Seven is like the days in a week. Eight is like an octopus with eight arms. 
        Nine is like a cat with nine lives. And ten is like all your fingers together! 
        Great job learning numbers with me!`,
      
      'Alphabet A-Z': `Welcome to our alphabet adventure! 
        A is for Apple, red and sweet to eat. B is for Ball, bouncy and fun to play with. 
        C is for Cat, soft and cuddly. D is for Dog, loyal and friendly. 
        Let's sing the alphabet song together: A-B-C-D-E-F-G, H-I-J-K-L-M-N-O-P, 
        Q-R-S-T-U-V, W-X-Y and Z! Now you know your ABCs! 
        Practice writing each letter and you'll be reading amazing stories soon!`,
        
      'Colors and Shapes': `Let's discover colors and shapes around us! 
        Red like a fire truck, blue like the sky, yellow like the sun, and green like grass. 
        Circles are round like wheels, squares have four equal sides, 
        triangles have three corners, and rectangles are like doors. 
        Look around and find these colors and shapes everywhere!`
    },
    
    'grade1-6': {
      'Numbers 1-10': `Today we're exploring numbers from 1 to 10 and how they help us every day! 
        Numbers help us count, measure, and solve problems. 
        Let's practice: 1 plus 1 equals 2. 2 plus 2 equals 4. 
        Can you see the pattern? Numbers are everywhere around us - 
        in clocks showing time, in money we use to buy things, in games we play! 
        Practice counting every day and you'll become a number expert!`,
      
      'Alphabet A-Z': `The alphabet is the foundation of reading and writing! 
        Each letter has a special sound, and when we put letters together, 
        they make words. Words make sentences. Sentences tell amazing stories! 
        Practice writing each letter and saying its sound. 
        Soon you'll be reading incredible books and writing your own stories!`,
        
      'Solar System': `Let's take a journey through our amazing solar system! 
        The Sun is our closest star, giving us light and warmth. 
        Eight planets orbit around the Sun. Mercury is closest and hottest. 
        Earth is our home, the perfect distance for life. 
        Jupiter is the biggest planet. Can you imagine exploring space?`
    },
    
    'grade7-9': {
      'Mathematics': `Mathematics is the language of patterns and problem-solving! 
        From simple arithmetic to algebra, math helps us understand our world. 
        Variables like 'x' and 'y' represent unknown numbers we can discover. 
        Equations are like puzzles waiting to be solved. 
        Math is everywhere - in music, art, sports, and technology!`,
        
      'Science Experiments': `Science is about asking questions and finding answers through experiments! 
        The scientific method helps us test our ideas: observe, hypothesize, experiment, and conclude. 
        Every great discovery started with curiosity. 
        From understanding gravity to exploring atoms, science reveals the secrets of our universe!`
    },
    
    'grade10-12': {
      'Advanced Mathematics': `Welcome to advanced mathematics where abstract thinking meets real-world applications! 
        Calculus helps us understand change and motion. 
        Statistics help us make sense of data and probability. 
        These mathematical tools are used in engineering, medicine, economics, and technology. 
        Master these concepts and unlock countless career possibilities!`,
        
      'Physics Concepts': `Physics reveals the fundamental laws governing our universe! 
        From Newton's laws of motion to Einstein's theory of relativity, 
        physics explains everything from falling apples to black holes. 
        Understanding energy, forces, and matter helps us innovate and create technology 
        that improves our lives every day!`
    },
    
    'matric': {
      'Exam Preparation': `Success in matric requires strategic preparation and consistent effort! 
        Create a study schedule that balances all subjects. 
        Practice past papers to understand exam patterns. 
        Form study groups to discuss difficult concepts. 
        Remember: preparation, practice, and persistence lead to success. 
        You have the potential to achieve your dreams!`,
        
      'Career Guidance': `Your matric results open doors to exciting career opportunities! 
        Whether you choose university, college, or enter the workforce, 
        focus on developing skills that match your interests and strengths. 
        The world needs problem-solvers, innovators, and leaders. 
        Your education is the foundation for making a positive impact!`
    }
  };

  // Get age-appropriate scripts
  const ageScripts = scripts[ageGroup] || scripts['grade1-6'];
  
  // Find matching topic or use a default educational script
  const matchingScript = ageScripts[topic] || 
                        Object.values(ageScripts)[0] || 
                        `Let's learn about ${topic}! This is an exciting topic that will help you grow and discover new things. Learning is a wonderful adventure that opens up endless possibilities. Practice makes perfect, so keep exploring and asking questions!`;
  
  return matchingScript;
}

/**
 * Generate fallback video response for free users
 * Provides educational content without AI video generation
 * @param {string} topic - Video topic
 * @param {string} ageGroup - Target age group
 * @returns {Object} Fallback response with educational content
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
      implementation: 'Create slides or cards with the provided script content'
    },
    upgrade_info: {
      description: 'Upgrade to premium for AI-generated personalized videos',
      features: [
        'Personalized AI avatars with Tavus',
        'Custom voice settings and accents',
        'Interactive video elements',
        'Multiple video formats and qualities',
        'Faster video generation',
        'Advanced customization options'
      ]
    }
  };
}

/**
 * Validate video generation request parameters
 * Ensures all required parameters are present and valid
 * @param {Object} body - Request body from client
 * @returns {Object} Validation result with errors if any
 */
function validateVideoRequest(body) {
  const errors = [];

  // Validate topic parameter
  if (!body.topic || typeof body.topic !== 'string') {
    errors.push('Topic parameter is required and must be a string');
  } else if (body.topic.trim().length === 0) {
    errors.push('Topic parameter cannot be empty');
  } else if (body.topic.length > 200) {
    errors.push('Topic parameter cannot exceed 200 characters');
  }

  // Validate script if provided
  if (body.script && typeof body.script !== 'string') {
    errors.push('Script must be a string');
  } else if (body.script && body.script.length > 10000) {
    errors.push('Script cannot exceed 10000 characters');
  }

  // Validate age group
  const validAgeGroups = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];
  if (body.age_group && !validAgeGroups.includes(body.age_group)) {
    errors.push(`Invalid age group. Must be one of: ${validAgeGroups.join(', ')}`);
  }

  // Validate video settings if provided
  if (body.quality && !['low', 'medium', 'high', 'ultra'].includes(body.quality)) {
    errors.push('Quality must be one of: low, medium, high, ultra');
  }

  if (body.voice_stability && (typeof body.voice_stability !== 'number' || body.voice_stability < 0 || body.voice_stability > 1)) {
    errors.push('Voice stability must be a number between 0 and 1');
  }

  if (body.voice_similarity && (typeof body.voice_similarity !== 'number' || body.voice_similarity < 0 || body.voice_similarity > 1)) {
    errors.push('Voice similarity must be a number between 0 and 1');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract user ID from various sources in the request
 * Checks headers, query parameters, and request body for user identification
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Parsed request body
 * @returns {string|null} User ID or null if not found
 */
function extractUserId(event, requestBody) {
  // Try multiple sources for user ID
  const userId = requestBody.userId || 
                 event.headers['x-user-id'] || 
                 event.headers['X-User-ID'] ||
                 event.queryStringParameters?.user_id ||
                 event.queryStringParameters?.userId;
  
  return userId || null;
}

/**
 * Main Netlify function handler
 * Processes video generation requests with RevenueCat subscription gating
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object with video data or fallback content
 */
exports.handler = async (event, context) => {
  console.log('Video Generation function invoked:', {
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
      // Check subscription status for video status access
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
            message: 'Premium subscription required for video status checking',
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
          subscription_status: subscriptionStatus,
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
      voice_stability,
      voice_similarity
    } = requestBody;

    // Extract user ID for subscription checking
    const userId = extractUserId(event, requestBody);

    console.log('Processing video generation request:', {
      topic,
      age_group,
      userId: userId || '[Not provided]',
      hasCustomScript: !!script,
      quality
    });

    // Check subscription status via RevenueCat
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    console.log('Subscription check result:', {
      isPremium: subscriptionStatus.isPremium,
      isActive: subscriptionStatus.isActive,
      hasError: !!subscriptionStatus.error,
      userId: subscriptionStatus.userId
    });

    // Gate premium Tavus features behind subscription
    if (!subscriptionStatus.isPremium || !subscriptionStatus.isActive) {
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
          message: 'Premium subscription required for AI-powered video generation with Tavus',
          subscription_status: subscriptionStatus,
          fallback: generateFallbackVideo(topic, age_group),
        }),
      };
    }

    // User has premium access, proceed with Tavus video generation
    try {
      console.log('User has premium access, generating video with Tavus');
      
      // Generate script if not provided
      const finalScript = script || generateEducationalScript(topic, age_group);
      
      // Prepare video parameters for Tavus
      const videoParams = {
        script: finalScript,
        background: background || '#f0f8ff',
        persona_id: persona_id || 'default',
        video_name: `EduSphere: ${topic} (${age_group})`,
        quality,
        voice_stability: voice_stability || 0.7,
        voice_similarity: voice_similarity || 0.8,
      };

      // Create video with Tavus API
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
          subscription_status: subscriptionStatus,
          message: 'Video generation started successfully with Tavus',
          usage_info: {
            provider: 'Tavus',
            quality: quality,
            estimated_processing_time: '2-5 minutes'
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
          fallback: generateFallbackVideo(topic, age_group),
          subscription_status: subscriptionStatus,
          message: 'Tavus temporarily unavailable, using fallback content',
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