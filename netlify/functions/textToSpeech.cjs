/**
 * ElevenLabs Text-to-Speech Netlify Function with RevenueCat Integration
 * Handles AI-powered narration with premium subscription gating
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice (default)

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
 * Compatible with Netlify Functions environment
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
      const chunks = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        try {
          // Combine all chunks into a single buffer
          const responseBuffer = Buffer.concat(chunks);
          
          // Parse JSON if content-type indicates JSON, otherwise return buffer
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
 * Check user's subscription status via RevenueCat REST API
 * Determines if user has premium access for ElevenLabs features
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
 * Generate speech using ElevenLabs API
 * Converts text to high-quality AI speech with specified voice settings
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - ElevenLabs voice ID to use
 * @param {Object} settings - Voice generation settings
 * @returns {Promise<Buffer>} Audio data as MP3 buffer
 */
async function generateSpeech(text, voiceId = DEFAULT_VOICE_ID, settings = {}) {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured in environment variables');
    }

    console.log('Generating speech with ElevenLabs:', {
      textLength: text.length,
      voiceId: voiceId,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    // Prepare ElevenLabs API request
    const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`;
    const requestData = JSON.stringify({
      text: text.trim(),
      model_id: settings.model_id || 'eleven_monolingual_v1',
      voice_settings: {
        stability: settings.stability || 0.5,
        similarity_boost: settings.similarity_boost || 0.5,
        style: settings.style || 0.0,
        use_speaker_boost: settings.use_speaker_boost !== false, // Default to true
      },
    });

    const options = {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
    };

    // Make request to ElevenLabs
    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200) {
      // Ensure we have a proper Buffer
      const audioBuffer = Buffer.isBuffer(response.data) 
        ? response.data 
        : Buffer.from(response.data);
      
      console.log('ElevenLabs speech generation successful:', {
        audioSize: audioBuffer.length,
        contentType: response.headers['content-type']
      });
      
      return audioBuffer;
    } else {
      throw new Error(`ElevenLabs API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('ElevenLabs speech generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate fallback speech response using browser's Speech Synthesis API
 * Provides instructions for client-side text-to-speech when premium is unavailable
 * @param {string} text - Text to convert to speech
 * @returns {Object} Fallback response with browser TTS instructions
 */
function generateFallbackSpeech(text) {
  console.log('Generating fallback speech response for text:', text.substring(0, 50) + '...');
  
  return {
    success: true,
    fallback: true,
    message: 'Using browser speech synthesis as fallback',
    text: text,
    instructions: {
      method: 'speechSynthesis',
      description: 'Use browser\'s built-in text-to-speech',
      code: `
        const utterance = new SpeechSynthesisUtterance("${text.replace(/"/g, '\\"')}");
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        utterance.voice = speechSynthesis.getVoices().find(voice => 
          voice.name.includes('Google') || voice.name.includes('Microsoft')
        ) || speechSynthesis.getVoices()[0];
        window.speechSynthesis.speak(utterance);
      `,
    },
    usage: {
      description: 'Execute the provided JavaScript code in your browser console or application',
      note: 'Browser TTS quality may vary depending on the device and browser'
    }
  };
}

/**
 * Validate text-to-speech request parameters
 * Ensures all required parameters are present and valid
 * @param {Object} body - Request body from client
 * @returns {Object} Validation result with errors if any
 */
function validateRequest(body) {
  const errors = [];

  // Validate text parameter
  if (!body.text || typeof body.text !== 'string') {
    errors.push('Text parameter is required and must be a string');
  } else if (body.text.trim().length === 0) {
    errors.push('Text parameter cannot be empty');
  } else if (body.text.length > 5000) {
    errors.push('Text parameter cannot exceed 5000 characters');
  }

  // Validate voice ID if provided
  if (body.voiceId && typeof body.voiceId !== 'string') {
    errors.push('Voice ID must be a string');
  }

  // Validate settings if provided
  if (body.settings && typeof body.settings !== 'object') {
    errors.push('Settings must be an object');
  }

  // Validate specific settings values
  if (body.settings) {
    const { stability, similarity_boost, style } = body.settings;
    
    if (stability !== undefined && (typeof stability !== 'number' || stability < 0 || stability > 1)) {
      errors.push('Stability must be a number between 0 and 1');
    }
    
    if (similarity_boost !== undefined && (typeof similarity_boost !== 'number' || similarity_boost < 0 || similarity_boost > 1)) {
      errors.push('Similarity boost must be a number between 0 and 1');
    }
    
    if (style !== undefined && (typeof style !== 'number' || style < 0 || style > 1)) {
      errors.push('Style must be a number between 0 and 1');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
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
 * Processes text-to-speech requests with RevenueCat subscription gating
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object with audio data or fallback instructions
 */
exports.handler = async (event, context) => {
  console.log('Text-to-Speech function invoked:', {
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

  // Only allow POST requests for text-to-speech generation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST for text-to-speech generation.',
        allowedMethods: ['POST', 'OPTIONS']
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

    // Extract parameters from request
    const { 
      text, 
      voiceId = DEFAULT_VOICE_ID, 
      settings = {}
    } = requestBody;

    // Extract user ID for subscription checking
    const userId = extractUserId(event, requestBody);

    console.log('Processing TTS request:', {
      textLength: text.length,
      voiceId,
      userId: userId || '[Not provided]',
      hasCustomSettings: Object.keys(settings).length > 0
    });

    // Check subscription status via RevenueCat
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    console.log('Subscription check result:', {
      isPremium: subscriptionStatus.isPremium,
      isActive: subscriptionStatus.isActive,
      hasError: !!subscriptionStatus.error,
      userId: subscriptionStatus.userId
    });

    // Gate premium ElevenLabs features behind subscription
    if (!subscriptionStatus.isPremium || !subscriptionStatus.isActive) {
      console.log('User does not have premium access, providing fallback TTS');
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          premium_required: true,
          message: 'Premium subscription required for AI-powered narration with ElevenLabs',
          subscription_status: subscriptionStatus,
          fallback: generateFallbackSpeech(text),
          upgrade_info: {
            description: 'Upgrade to premium for high-quality AI voices',
            features: [
              'Professional AI voices from ElevenLabs',
              'Multiple voice options and accents',
              'Adjustable speech settings',
              'Higher quality audio output',
              'Faster processing times'
            ]
          }
        }),
      };
    }

    // User has premium access, proceed with ElevenLabs generation
    try {
      console.log('User has premium access, generating speech with ElevenLabs');
      
      const audioBuffer = await generateSpeech(text, voiceId, settings);
      
      // Convert audio buffer to base64 for JSON response
      const audioBase64 = audioBuffer.toString('base64');
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          premium: true,
          audio_data: audioBase64,
          audio_format: 'mp3',
          audio_size: audioBuffer.length,
          text_length: text.length,
          voice_id: voiceId,
          settings_used: settings,
          generation_time: new Date().toISOString(),
          subscription_status: subscriptionStatus,
          usage_info: {
            provider: 'ElevenLabs',
            quality: 'High',
            voice: voiceId
          }
        }),
      };

    } catch (elevenlabsError) {
      console.error('ElevenLabs generation failed, providing fallback:', elevenlabsError.message);
      
      // Even premium users get fallback if ElevenLabs fails
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          premium: true,
          elevenlabs_error: elevenlabsError.message,
          fallback: generateFallbackSpeech(text),
          message: 'ElevenLabs temporarily unavailable, using browser fallback',
          subscription_status: subscriptionStatus,
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
        message: 'An unexpected error occurred while processing your text-to-speech request',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `tts_${Date.now()}`
        }
      }),
    };
  }
};