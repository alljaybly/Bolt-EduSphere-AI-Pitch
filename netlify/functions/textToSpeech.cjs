/**
 * ElevenLabs Text-to-Speech Netlify Function
 * Handles AI-powered narration with premium subscription gating
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel voice (default)

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
 * Generate speech using ElevenLabs API
 * @param {string} text - Text to convert to speech
 * @param {string} voiceId - Voice ID to use
 * @param {Object} settings - Voice settings
 * @returns {Promise<Buffer>} Audio data
 */
async function generateSpeech(text, voiceId = DEFAULT_VOICE_ID, settings = {}) {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
    }

    console.log('Generating speech with ElevenLabs for text:', text.substring(0, 50) + '...');

    const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`;
    const requestData = JSON.stringify({
      text: text.trim(),
      model_id: 'eleven_monolingual_v1',
      voice_settings: {
        stability: settings.stability || 0.5,
        similarity_boost: settings.similarity_boost || 0.5,
        style: settings.style || 0.0,
        use_speaker_boost: settings.use_speaker_boost || true,
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

    const response = await makeHttpRequest(url, options, requestData);

    if (response.statusCode === 200) {
      // Convert response data to Buffer if it's not already
      const audioBuffer = Buffer.isBuffer(response.data) 
        ? response.data 
        : Buffer.from(response.data, 'binary');
      
      console.log('Speech generation successful, audio size:', audioBuffer.length, 'bytes');
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
 * Generate fallback speech using browser's Speech Synthesis API
 * @param {string} text - Text to convert to speech
 * @returns {Object} Fallback response
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
      code: `
        const utterance = new SpeechSynthesisUtterance("${text.replace(/"/g, '\\"')}");
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      `,
    },
  };
}

/**
 * Validate request parameters
 * @param {Object} body - Request body
 * @returns {Object} Validation result
 */
function validateRequest(body) {
  const errors = [];

  if (!body.text || typeof body.text !== 'string') {
    errors.push('Text parameter is required and must be a string');
  } else if (body.text.trim().length === 0) {
    errors.push('Text parameter cannot be empty');
  } else if (body.text.length > 5000) {
    errors.push('Text parameter cannot exceed 5000 characters');
  }

  if (body.voiceId && typeof body.voiceId !== 'string') {
    errors.push('Voice ID must be a string');
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
  console.log('Text-to-Speech function invoked:', {
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

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST.',
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
    const { 
      text, 
      voiceId = DEFAULT_VOICE_ID, 
      settings = {},
      userId 
    } = requestBody;

    // Get user ID from headers if not in body
    const finalUserId = userId || event.headers['x-user-id'] || event.headers['X-User-ID'];

    console.log('Processing TTS request:', {
      textLength: text.length,
      voiceId,
      userId: finalUserId || '[Not provided]',
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
          message: 'Premium subscription required for AI-powered narration',
          subscription_status: subscriptionStatus,
          fallback: generateFallbackSpeech(text),
        }),
      };
    }

    // User has premium access, proceed with ElevenLabs generation
    try {
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
          text_length: text.length,
          voice_id: voiceId,
          generation_time: new Date().toISOString(),
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
          message: 'ElevenLabs temporarily unavailable, using fallback',
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