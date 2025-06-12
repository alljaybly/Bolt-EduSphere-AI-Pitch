/**
 * EduSphere AI Text-to-Speech Netlify Function with Multilingual Support
 * Handles AI-powered narration with premium subscription gating and language-specific voices
 * Stores translations in Supabase for caching and reuse
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');
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
  },
  fr: {
    voiceId: process.env.ELEVENLABS_VOICE_FR || 'jsCqWAovK2LkecY7zXl4', // Antoine (French)
    name: 'Antoine',
    language: 'French',
    model: 'eleven_multilingual_v2'
  },
  de: {
    voiceId: process.env.ELEVENLABS_VOICE_DE || '5Q0t7uMcjvnagumLfvZi', // Hans (German)
    name: 'Hans',
    language: 'German',
    model: 'eleven_multilingual_v2'
  }
};

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
 * Initialize multilingual content table in Supabase
 */
async function initializeMultilingualTable() {
  try {
    console.log('Initializing multilingual_content table...');

    // Create multilingual_content table
    const { error: contentError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'multilingual_content',
      table_definition: `
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
      `
    });

    if (contentError) {
      console.error('Error creating multilingual_content table:', contentError);
    }

    // Create audio_cache table
    const { error: cacheError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'audio_cache',
      table_definition: `
        id SERIAL PRIMARY KEY,
        text_hash VARCHAR(64) NOT NULL,
        language VARCHAR(10) NOT NULL,
        voice_id VARCHAR(100) NOT NULL,
        audio_url TEXT,
        audio_size INTEGER,
        duration_seconds DECIMAL(10,2),
        model_used VARCHAR(50),
        user_id VARCHAR(255),
        usage_count INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
        UNIQUE(text_hash, language, voice_id)
      `
    });

    if (cacheError) {
      console.error('Error creating audio_cache table:', cacheError);
    }

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'multilingual_content',
      index_name: 'idx_multilingual_original_language',
      index_definition: 'original_text, language'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'multilingual_content',
      index_name: 'idx_multilingual_user_id',
      index_definition: 'user_id'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'audio_cache',
      index_name: 'idx_audio_cache_hash_lang',
      index_definition: 'text_hash, language'
    });

    console.log('Multilingual tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize multilingual tables:', error);
    Sentry.captureException(error);
    return false;
  }
}

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
    Sentry.captureException(error);
    return false; // Default to no access on error
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
    console.log('Checking for cached translation:', { 
      originalText: originalText.substring(0, 50) + (originalText.length > 50 ? '...' : ''), 
      targetLanguage, 
      sourceLanguage 
    });

    const { data, error } = await supabase
      .from('multilingual_content')
      .select('translated_text, quality_score, translation_method, created_at')
      .eq('original_text', originalText)
      .eq('language', targetLanguage)
      .eq('source_language', sourceLanguage)
      .order('quality_score', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching cached translation:', error);
      return null;
    }

    if (data && data.length > 0) {
      console.log('Found cached translation:', {
        method: data[0].translation_method,
        quality: data[0].quality_score,
        age: new Date() - new Date(data[0].created_at)
      });
      return data[0].translated_text;
    }

    return null;

  } catch (error) {
    console.error('Failed to get cached translation:', error);
    Sentry.captureException(error);
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

    const { error } = await supabase
      .from('multilingual_content')
      .upsert({
        original_text: originalText,
        language: targetLanguage,
        translated_text: translatedText,
        source_language: sourceLanguage,
        translation_method: method,
        quality_score: quality,
        user_id: userId,
        content_type: 'narration',
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'original_text,language,source_language',
        ignoreDuplicates: false
      });

    if (error) {
      console.error('Error storing translation:', error);
      return false;
    }

    console.log('Translation stored successfully');
    return true;

  } catch (error) {
    console.error('Failed to store translation:', error);
    Sentry.captureException(error);
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
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured');
    }

    console.log('Translating with Claude Sonnet 4:', { 
      textLength: text.length, 
      from: sourceLanguage, 
      to: targetLanguage 
    });

    // Language mapping for Claude
    const languageNames = {
      en: 'English',
      es: 'Spanish',
      zh: 'Mandarin Chinese',
      fr: 'French',
      de: 'German'
    };

    const sourceLangName = languageNames[sourceLanguage] || sourceLanguage;
    const targetLangName = languageNames[targetLanguage] || targetLanguage;

    // Construct system prompt for translation
    const systemPrompt = `You are Claude Sonnet 4, an expert translator for EduSphere AI. 
Your task is to translate text from ${sourceLangName} to ${targetLangName}.

Guidelines:
1. Provide ONLY the translation, no explanations or additional text
2. Maintain the original tone and meaning
3. Preserve formatting, including paragraphs and punctuation
4. Adapt idioms and cultural references appropriately
5. Use natural, fluent language appropriate for the target language
6. Ensure age-appropriate language for educational content
7. Maintain any technical terminology accurately

Translate the following text from ${sourceLangName} to ${targetLangName}:`;

    // Prepare Claude API request
    const url = `${ANTHROPIC_BASE_URL}/messages`;
    const requestData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4000,
      temperature: 0.1, // Lower temperature for more accurate translations
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: text
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
      // Extract generated content from Claude's response
      const content = response.data.content?.[0]?.text;
      
      if (!content) {
        throw new Error('No content generated by Claude');
      }

      // Store the translation for future use
      await storeTranslation(text, targetLanguage, content, sourceLanguage, userId, 'claude_sonnet_4', 9);
      return content.trim();
    }

    throw new Error(`Claude API error: ${response.statusCode}`);

  } catch (error) {
    console.error('Claude translation failed:', error);
    Sentry.captureException(error);
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
    },
    fr: {
      'Hello': 'Bonjour',
      'Thank you': 'Merci',
      'Good morning': 'Bonjour',
      'Good night': 'Bonne nuit'
    },
    de: {
      'Hello': 'Hallo',
      'Thank you': 'Danke',
      'Good morning': 'Guten Morgen',
      'Good night': 'Gute Nacht'
    }
  };

  return fallbackTranslations[targetLanguage]?.[text] || null;
}

/**
 * Generate speech using ElevenLabs API with language-specific voices
 * @param {string} text - Text to convert to speech
 * @param {string} language - Language code for voice selection
 * @param {Object} settings - Voice generation settings
 * @returns {Promise<Buffer>} Audio data as MP3 buffer
 */
async function generateMultilingualSpeech(text, language = 'en', settings = {}) {
  try {
    if (!ELEVENLABS_API_KEY) {
      throw new Error('ElevenLabs API key not configured');
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
      throw new Error(`ElevenLabs API error: ${response.statusCode}`);
    }

  } catch (error) {
    console.error('ElevenLabs multilingual speech generation failed:', error.message);
    Sentry.captureException(error);
    throw error;
  }
}

/**
 * Generate fallback speech response using browser's Speech Synthesis API
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
    zh: 'zh-CN',
    fr: 'fr-FR',
    de: 'de-DE'
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
 * @param {Object} body - Request body
 * @returns {Object} Validation result
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
  if (body.language && !Object.keys(LANGUAGE_VOICES).includes(body.language)) {
    errors.push(`Language must be one of: ${Object.keys(LANGUAGE_VOICES).join(', ')}`);
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
  console.log('Multilingual Text-to-Speech function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body
  });

  // Add Sentry context
  Sentry.configureScope(scope => {
    scope.setTag('function', 'textToSpeech');
    scope.setTag('method', event.httpMethod);
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
            const isPremium = await checkPremiumAccess(userId);
            if (isPremium) {
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
        Sentry.captureException(translationError);
        finalText = text; // Fallback to original text
      }
    }

    // Check premium access for ElevenLabs
    const isPremium = await checkPremiumAccess(userId);
    
    console.log('Premium access check result:', {
      isPremium,
      userId: userId || '[Not provided]'
    });

    // Gate premium ElevenLabs features behind subscription
    if (!isPremium) {
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
      Sentry.captureException(elevenlabsError);
      
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