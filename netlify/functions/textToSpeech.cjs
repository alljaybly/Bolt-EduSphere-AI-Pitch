/**
 * ElevenLabs Text-to-Speech Netlify Function with Multilingual Support and RevenueCat Integration
 * Handles AI-powered narration with premium subscription gating and language-specific voices
 * Stores translations in Neon database for caching and reuse
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');
const { neon } = require('@neondatabase/serverless');

// Neon database configuration
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);

// ElevenLabs API configuration
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_BASE_URL = 'https://api.elevenlabs.io/v1';

// Language-specific voice configurations
const LANGUAGE_VOICES = {
  en: {
    voiceId: process.env.ELEVENLABS_VOICE_EN || '21m00Tcm4TlvDq8ikWAM', // Rachel (English)
    name: 'Rachel',
    language: 'English',
    model: 'eleven_monolingual_v1'
  },
  es: {
    voiceId: process.env.ELEVENLABS_VOICE_ES || 'XB0fDUnXU5powFXDhCwa', // Charlotte (Spanish)
    name: 'Charlotte',
    language: 'Spanish',
    model: 'eleven_multilingual_v2'
  },
  zh: {
    voiceId: process.env.ELEVENLABS_VOICE_ZH || 'pNInz6obpgDQGcFmaJgB', // Adam (Mandarin)
    name: 'Adam',
    language: 'Mandarin Chinese',
    model: 'eleven_multilingual_v2'
  }
};

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
 * Initialize multilingual content table if it doesn't exist
 * Creates table for storing translations and caching multilingual content
 */
async function initializeMultilingualTable() {
  try {
    console.log('Initializing multilingual_content table...');

    // Create multilingual_content table with comprehensive schema
    await sql`
      CREATE TABLE IF NOT EXISTS multilingual_content (
        id SERIAL PRIMARY KEY,
        original_text TEXT NOT NULL,
        language VARCHAR(10) NOT NULL,
        translated_text TEXT NOT NULL,
        source_language VARCHAR(10) DEFAULT 'en',
        translation_method VARCHAR(50) DEFAULT 'claude_sonnet_4',
        quality_score INTEGER DEFAULT 5,
        user_id VARCHAR(255),
        content_type VARCHAR(50) DEFAULT 'narration',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(original_text, language, source_language)
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_multilingual_original_language ON multilingual_content(original_text, language)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_multilingual_user_id ON multilingual_content(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_multilingual_created_at ON multilingual_content(created_at)
    `;

    // Create audio_cache table for storing generated audio metadata
    await sql`
      CREATE TABLE IF NOT EXISTS audio_cache (
        id SERIAL PRIMARY KEY,
        text_hash VARCHAR(64) NOT NULL,
        language VARCHAR(10) NOT NULL,
        voice_id VARCHAR(100) NOT NULL,
        audio_url TEXT,
        audio_size INTEGER,
        duration_seconds DECIMAL(10,2),
        model_used VARCHAR(50),
        user_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
        UNIQUE(text_hash, language, voice_id)
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audio_cache_hash_lang ON audio_cache(text_hash, language)
    `;

    console.log('Multilingual tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize multilingual tables:', error);
    throw error;
  }
}

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
 * Get cached translation from multilingual_content table
 * @param {string} originalText - Original text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code (default: 'en')
 * @returns {Promise<string|null>} Cached translation or null if not found
 */
async function getCachedTranslation(originalText, targetLanguage, sourceLanguage = 'en') {
  try {
    console.log('Checking for cached translation:', { originalText: originalText.substring(0, 50), targetLanguage, sourceLanguage });

    const result = await sql`
      SELECT translated_text, quality_score, translation_method, created_at
      FROM multilingual_content 
      WHERE original_text = ${originalText} 
        AND language = ${targetLanguage} 
        AND source_language = ${sourceLanguage}
      ORDER BY quality_score DESC, created_at DESC
      LIMIT 1
    `;

    if (result.length > 0) {
      console.log('Found cached translation:', {
        method: result[0].translation_method,
        quality: result[0].quality_score,
        age: new Date() - new Date(result[0].created_at)
      });
      return result[0].translated_text;
    }

    return null;

  } catch (error) {
    console.error('Failed to get cached translation:', error);
    return null;
  }
}

/**
 * Store translation in multilingual_content table
 * @param {string} originalText - Original text
 * @param {string} targetLanguage - Target language code
 * @param {string} translatedText - Translated text
 * @param {string} sourceLanguage - Source language code
 * @param {string} userId - User ID
 * @param {string} method - Translation method used
 * @param {number} quality - Quality score (1-10)
 * @returns {Promise<boolean>} Success status
 */
async function storeTranslation(originalText, targetLanguage, translatedText, sourceLanguage = 'en', userId = null, method = 'claude_sonnet_4', quality = 8) {
  try {
    console.log('Storing translation:', { 
      originalLength: originalText.length, 
      targetLanguage, 
      method, 
      quality 
    });

    await sql`
      INSERT INTO multilingual_content (
        original_text, 
        language, 
        translated_text, 
        source_language, 
        translation_method, 
        quality_score, 
        user_id, 
        content_type,
        created_at,
        updated_at
      ) VALUES (
        ${originalText}, 
        ${targetLanguage}, 
        ${translatedText}, 
        ${sourceLanguage}, 
        ${method}, 
        ${quality}, 
        ${userId}, 
        'narration',
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (original_text, language, source_language)
      DO UPDATE SET
        translated_text = ${translatedText},
        translation_method = ${method},
        quality_score = GREATEST(multilingual_content.quality_score, ${quality}),
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log('Translation stored successfully');
    return true;

  } catch (error) {
    console.error('Failed to store translation:', error);
    return false;
  }
}

/**
 * Translate text using Claude Sonnet 4 (premium feature)
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @param {string} sourceLanguage - Source language code
 * @param {string} userId - User ID for premium check
 * @returns {Promise<string>} Translated text
 */
async function translateWithClaude(text, targetLanguage, sourceLanguage = 'en', userId = null) {
  try {
    console.log('Translating with Claude Sonnet 4:', { 
      textLength: text.length, 
      from: sourceLanguage, 
      to: targetLanguage 
    });

    // Language mapping for Claude
    const languageNames = {
      en: 'English',
      es: 'Spanish',
      zh: 'Mandarin Chinese'
    };

    const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    // Call Claude Sonnet 4 via generateContent function
    const response = await fetch('/.netlify/functions/generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-ID': userId || 'system'
      },
      body: JSON.stringify({
        prompt: `Translate the following text from ${sourceLangName} to ${targetLangName}. Provide only the translation, no explanations or additional text. Maintain the original tone and meaning. Text to translate: "${text}"`,
        content_type: 'translation',
        grade: 'general',
        subject: 'language',
        user_id: userId || 'system'
      })
    });

    const result = await response.json();

    if (result.success && result.content) {
      // Store the translation for future use
      await storeTranslation(text, targetLanguage, result.content, sourceLanguage, userId, 'claude_sonnet_4', 9);
      return result.content.trim();
    }

    throw new Error('Claude translation failed: ' + (result.message || 'Unknown error'));

  } catch (error) {
    console.error('Claude translation failed:', error);
    throw error;
  }
}

/**
 * Get simple fallback translation for common phrases
 * @param {string} text - Text to translate
 * @param {string} targetLanguage - Target language code
 * @returns {string|null} Fallback translation or null
 */
function getFallbackTranslation(text, targetLanguage) {
  const fallbackTranslations = {
    es: {
      'This is a big gray elephant!': '¡Este es un gran elefante gris!',
      'Look at this beautiful red circle!': '¡Mira este hermoso círculo rojo!',
      'Here we have a blue square shape!': '¡Aquí tenemos una forma de cuadrado azul!',
      'Robot is moving!': '¡El robot se está moviendo!',
      'Drawing a shape...': 'Dibujando una forma...',
      'Hello': 'Hola',
      'Thank you': 'Gracias',
      'Good morning': 'Buenos días',
      'Good night': 'Buenas noches'
    },
    zh: {
      'This is a big gray elephant!': '这是一只大灰象！',
      'Look at this beautiful red circle!': '看这个美丽的红圆圈！',
      'Here we have a blue square shape!': '这里我们有一个蓝色的正方形！',
      'Robot is moving!': '机器人在移动！',
      'Drawing a shape...': '正在画形状...',
      'Hello': '你好',
      'Thank you': '谢谢',
      'Good morning': '早上好',
      'Good night': '晚安'
    }
  };

  return fallbackTranslations[targetLanguage]?.[text] || null;
}

/**
 * Generate speech using ElevenLabs API with language-specific voices
 * Converts text to high-quality AI speech with specified voice settings
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code for voice selection
 * @param {Object} settings - Voice generation settings
 * @returns {Promise<Buffer>} Audio data as MP3 buffer
 */
async function generateMultilingualSpeech(text, language = 'en', settings = {}) {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured in environment variables');
    }

    // Get language-specific voice configuration
    const voiceConfig = LANGUAGE_VOICES[language] || LANGUAGE_VOICES.en;
    const voiceId = settings.voiceId || voiceConfig.voiceId;

    console.log('Generating multilingual speech with ElevenLabs:', {
      textLength: text.length,
      language: language,
      voiceId: voiceId,
      voiceName: voiceConfig.name,
      model: voiceConfig.model,
      textPreview: text.substring(0, 50) + (text.length > 50 ? '...' : '')
    });

    // Prepare ElevenLabs API request with language-specific settings
    const url = `${ELEVENLABS_BASE_URL}/text-to-speech/${voiceId}`;
    const requestData = JSON.stringify({
      text: text.trim(),
      model_id: settings.model_id || voiceConfig.model,
      voice_settings: {
        stability: settings.stability || 0.6,
        similarity_boost: settings.similarity_boost || 0.8,
        style: settings.style || 0.2,
        use_speaker_boost: settings.use_speaker_boost !== false,
      },
      // Add language-specific pronunciation guide if available
      pronunciation_dictionary_locators: language !== 'en' ? [{
        pronunciation_dictionary_id: `${language}_pronunciation`,
        version_id: "latest"
      }] : undefined
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
      
      console.log('ElevenLabs multilingual speech generation successful:', {
        language: language,
        voiceName: voiceConfig.name,
        audioSize: audioBuffer.length,
        contentType: response.headers['content-type']
      });
      
      return audioBuffer;
    } else {
      throw new Error(`ElevenLabs API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('ElevenLabs multilingual speech generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate fallback speech response using browser's Speech Synthesis API
 * Provides instructions for client-side text-to-speech when premium is unavailable
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code
 * @returns {Object} Fallback response with browser TTS instructions
 */
function generateFallbackSpeech(text, language = 'en') {
  console.log('Generating fallback speech response for text:', text.substring(0, 50) + '...', 'Language:', language);
  
  // Language locale mapping for browser speech synthesis
  const localeMapping = {
    en: 'en-US',
    es: 'es-ES',
    zh: 'zh-CN'
  };

  const locale = localeMapping[language] || 'en-US';
  
  return {
    success: true,
    fallback: true,
    message: 'Using browser speech synthesis as fallback',
    text: text,
    language: language,
    locale: locale,
    instructions: {
      method: 'speechSynthesis',
      description: `Use browser's built-in text-to-speech for ${language}`,
      code: `
        const utterance = new SpeechSynthesisUtterance("${text.replace(/"/g, '\\"')}");
        utterance.rate = 0.8;
        utterance.pitch = 1.1;
        utterance.volume = 0.8;
        utterance.lang = "${locale}";
        
        // Try to find a voice that matches the language
        const voices = speechSynthesis.getVoices();
        const matchingVoice = voices.find(voice => 
          voice.lang.startsWith("${language}") || 
          voice.lang.startsWith("${locale.split('-')[0]}")
        );
        
        if (matchingVoice) {
          utterance.voice = matchingVoice;
          console.log('Using voice:', matchingVoice.name, matchingVoice.lang);
        }
        
        window.speechSynthesis.speak(utterance);
      `,
    },
    usage: {
      description: 'Execute the provided JavaScript code in your browser console or application',
      note: `Browser TTS quality may vary depending on the device and browser. ${language} voices may not be available on all systems.`
    }
  };
}

/**
 * Validate multilingual text-to-speech request parameters
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

  // Validate language parameter
  const supportedLanguages = Object.keys(LANGUAGE_VOICES);
  if (body.language && !supportedLanguages.includes(body.language)) {
    errors.push(`Language must be one of: ${supportedLanguages.join(', ')}`);
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
 * Processes multilingual text-to-speech requests with RevenueCat subscription gating
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object with audio data or fallback instructions
 */
exports.handler = async (event, context) => {
  console.log('Multilingual Text-to-Speech function invoked:', {
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
    // Initialize database tables
    await initializeMultilingualTable();

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
          allowedMethods: ['POST', 'OPTIONS'],
          supportedLanguages: Object.keys(LANGUAGE_VOICES)
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
          supportedLanguages: Object.keys(LANGUAGE_VOICES)
        }),
      };
    }

    // Extract parameters from request
    const { 
      text, 
      language = 'en',
      voiceId,
      settings = {}
    } = requestBody;

    // Extract user ID for subscription checking
    const userId = extractUserId(event, requestBody);

    console.log('Processing multilingual TTS request:', {
      textLength: text.length,
      language: language,
      voiceId: voiceId || 'default',
      userId: userId || '[Not provided]',
      hasCustomSettings: Object.keys(settings).length > 0
    });

    // Handle translation if text is not in target language
    let finalText = text;
    if (language !== 'en') {
      try {
        // Check for cached translation first
        const cachedTranslation = await getCachedTranslation(text, language, 'en');
        
        if (cachedTranslation) {
          console.log('Using cached translation for', language);
          finalText = cachedTranslation;
        } else {
          // Try fallback translation for common phrases
          const fallbackTranslation = getFallbackTranslation(text, language);
          if (fallbackTranslation) {
            console.log('Using fallback translation for', language);
            finalText = fallbackTranslation;
            // Store fallback translation for future use
            await storeTranslation(text, language, fallbackTranslation, 'en', userId, 'fallback_dictionary', 6);
          } else {
            // For premium users, try Claude translation
            const subscriptionStatus = await checkSubscriptionStatus(userId);
            if (subscriptionStatus.isPremium && subscriptionStatus.isActive) {
              try {
                console.log('Attempting Claude translation for premium user');
                finalText = await translateWithClaude(text, language, 'en', userId);
              } catch (translationError) {
                console.log('Claude translation failed, using original text:', translationError.message);
                finalText = text; // Use original text if translation fails
              }
            } else {
              console.log('Non-premium user, using original text for', language);
              finalText = text; // Non-premium users get original text
            }
          }
        }
      } catch (translationError) {
        console.error('Translation process failed:', translationError);
        finalText = text; // Fallback to original text
      }
    }

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
          message: `Premium subscription required for AI-powered multilingual narration with ElevenLabs`,
          subscription_status: subscriptionStatus,
          fallback: generateFallbackSpeech(finalText, language),
          language_info: {
            requested: language,
            voice: LANGUAGE_VOICES[language]?.name || 'Default',
            text_used: finalText
          },
          upgrade_info: {
            description: 'Upgrade to premium for high-quality multilingual AI voices',
            features: [
              `Professional ${LANGUAGE_VOICES[language]?.language || 'multilingual'} voices from ElevenLabs`,
              'Multiple voice options and accents per language',
              'Adjustable speech settings for each language',
              'Higher quality audio output',
              'Faster processing times',
              'AI-powered translation with Claude Sonnet 4'
            ]
          }
        }),
      };
    }

    // User has premium access, proceed with ElevenLabs generation
    try {
      console.log('User has premium access, generating multilingual speech with ElevenLabs');
      
      const audioBuffer = await generateMultilingualSpeech(finalText, language, {
        ...settings,
        voiceId: voiceId
      });
      
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
          text_length: finalText.length,
          original_text: text,
          final_text: finalText,
          language: language,
          voice_info: {
            voice_id: voiceId || LANGUAGE_VOICES[language]?.voiceId,
            voice_name: LANGUAGE_VOICES[language]?.name,
            language_name: LANGUAGE_VOICES[language]?.language,
            model: LANGUAGE_VOICES[language]?.model
          },
          settings_used: {
            ...settings,
            voiceId: voiceId || LANGUAGE_VOICES[language]?.voiceId
          },
          generation_time: new Date().toISOString(),
          subscription_status: subscriptionStatus,
          translation_info: {
            was_translated: finalText !== text,
            source_language: 'en',
            target_language: language
          },
          usage_info: {
            provider: 'ElevenLabs',
            quality: 'High',
            multilingual: true,
            voice: LANGUAGE_VOICES[language]?.name || 'Custom'
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
          fallback: generateFallbackSpeech(finalText, language),
          message: 'ElevenLabs temporarily unavailable, using browser fallback',
          subscription_status: subscriptionStatus,
          language_info: {
            requested: language,
            text_used: finalText,
            was_translated: finalText !== text
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
        message: 'An unexpected error occurred while processing your multilingual text-to-speech request',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `multilingual_tts_${Date.now()}`
        }
      }),
    };
  }
};