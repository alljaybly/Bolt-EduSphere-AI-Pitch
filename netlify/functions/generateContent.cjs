/**
 * Claude Sonnet 4 Content Generation Netlify Function
 * Handles AI-powered educational content generation with RevenueCat integration
 * World's Largest Hackathon Project - EduSphere AI
 */

const https = require('https');
const { URL } = require('url');

// Anthropic Claude API configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

// RevenueCat configuration for subscription verification
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
 * Determines if user has premium access for Claude Sonnet 4 features
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
 * Generate educational content using Claude Sonnet 4
 * Creates age-appropriate content based on user prompts
 * @param {string} prompt - User's content generation prompt
 * @param {string} contentType - Type of content to generate
 * @param {string} grade - Target grade level
 * @param {string} subject - Subject area
 * @returns {Promise<string>} Generated educational content
 */
async function generateContentWithClaude(prompt, contentType, grade, subject) {
  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error('Anthropic API key not configured in environment variables');
    }

    console.log('Generating content with Claude Sonnet 4:', {
      contentType,
      grade,
      subject,
      promptLength: prompt.length
    });

    // Construct system prompt for educational content generation
    const systemPrompt = `You are Claude Sonnet 4, an expert educational content creator for EduSphere AI. 
Your role is to generate high-quality, age-appropriate educational content for students from kindergarten to matric level.

Content Type: ${contentType}
Grade Level: ${grade}
Subject: ${subject}

Guidelines:
1. Create content that is appropriate for the specified grade level
2. Use clear, engaging language that students can understand
3. Include practical examples and real-world applications when relevant
4. For problems: provide clear questions, correct answers, and helpful hints
5. For narration scripts: use conversational, encouraging tone
6. For video scripts: include visual cues and interactive elements
7. For mock exams: create comprehensive assessments with varied question types
8. Ensure content aligns with educational standards for the grade level
9. Make learning fun and engaging while maintaining educational value
10. Include step-by-step explanations where appropriate

Format your response as structured, ready-to-use educational content.`;

    // Prepare Claude API request
    const url = `${ANTHROPIC_BASE_URL}/messages`;
    const requestData = JSON.stringify({
      model: 'claude-3-5-sonnet-20241022', // Latest Claude Sonnet model
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: prompt
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

      console.log('Claude content generation successful:', {
        contentLength: content.length,
        model: response.data.model,
        usage: response.data.usage
      });
      
      return content;
    } else {
      throw new Error(`Claude API error: ${response.statusCode} - ${JSON.stringify(response.data)}`);
    }

  } catch (error) {
    console.error('Claude content generation failed:', error.message);
    throw error;
  }
}

/**
 * Generate fallback content for free users
 * Provides basic educational content without AI generation
 * @param {string} contentType - Type of content requested
 * @param {string} grade - Target grade level
 * @param {string} subject - Subject area
 * @returns {string} Fallback educational content
 */
function generateFallbackContent(contentType, grade, subject) {
  console.log('Generating fallback content for:', { contentType, grade, subject });
  
  const fallbackTemplates = {
    problems: {
      kindergarten: {
        math: "Problem 1: Count the apples. If you have 2 apples and get 1 more, how many apples do you have?\nAnswer: 3 apples\nHint: Use your fingers to count!\n\nProblem 2: What comes after the number 4?\nAnswer: 5\nHint: Count from 1 to 10!",
        english: "Problem 1: What letter does 'Ball' start with?\nAnswer: B\nHint: Say the word slowly and listen to the first sound!\n\nProblem 2: Circle the word that rhymes with 'cat':\nhat, dog, car\nAnswer: hat\nHint: Words that rhyme sound similar at the end!"
      }
    },
    narration: {
      kindergarten: {
        math: "Hello little mathematicians! Today we're going to explore numbers together. Numbers are everywhere around us - on clocks, on houses, and even on your birthday cake! Let's count from 1 to 10 together. Ready? One, two, three... Great job! Numbers help us understand how many things we have.",
        english: "Welcome to our reading adventure! Letters are like building blocks that help us make words. Each letter has its own special sound. When we put letters together, they create words that tell stories. Let's practice saying the sounds of letters together!"
      }
    },
    video: {
      kindergarten: {
        math: "SCENE 1: [Show colorful numbers 1-10]\nNarrator: 'Welcome to Number Land! Today we'll meet our number friends.'\n\nSCENE 2: [Animation of counting objects]\nNarrator: 'Let's count these bouncing balls together! One... two... three...'\n\nSCENE 3: [Interactive counting game]\nNarrator: 'Now it's your turn! Can you count the stars in the sky?'",
        english: "SCENE 1: [Show alphabet letters dancing]\nNarrator: 'Meet the amazing alphabet family! Each letter has a special job.'\n\nSCENE 2: [Letter sounds with visual examples]\nNarrator: 'A says 'ah' like in Apple. B says 'buh' like in Ball.'\n\nSCENE 3: [Simple word building]\nNarrator: 'Let's build our first word together!'"
      }
    },
    exam: {
      kindergarten: {
        math: "Kindergarten Math Assessment\n\n1. Count the dots: • • •\nHow many dots are there?\na) 2  b) 3  c) 4\n\n2. What number comes after 5?\na) 4  b) 6  c) 7\n\n3. Circle the group with MORE objects:\nGroup A: ⭐⭐  Group B: ⭐⭐⭐\n\nAnswer Key: 1-b, 2-b, 3-Group B",
        english: "Kindergarten English Assessment\n\n1. What letter does 'Dog' start with?\na) C  b) D  c) G\n\n2. Which word rhymes with 'sun'?\na) moon  b) fun  c) star\n\n3. How many letters are in the word 'cat'?\na) 2  b) 3  c) 4\n\nAnswer Key: 1-b, 2-b, 3-b"
      }
    }
  };

  // Get appropriate template or create generic content
  const gradeTemplates = fallbackTemplates[contentType]?.[grade] || {};
  const content = gradeTemplates[subject] || 
                 Object.values(gradeTemplates)[0] || 
                 `Here's some educational content about ${subject} for ${grade} students. This content focuses on ${contentType} and provides age-appropriate learning materials.`;

  return content;
}

/**
 * Validate content generation request parameters
 * Ensures all required parameters are present and valid
 * @param {Object} body - Request body from client
 * @returns {Object} Validation result with errors if any
 */
function validateRequest(body) {
  const errors = [];

  // Validate prompt parameter
  if (!body.prompt || typeof body.prompt !== 'string') {
    errors.push('Prompt parameter is required and must be a string');
  } else if (body.prompt.trim().length === 0) {
    errors.push('Prompt parameter cannot be empty');
  } else if (body.prompt.length > 2000) {
    errors.push('Prompt parameter cannot exceed 2000 characters');
  }

  // Validate content type
  const validContentTypes = ['problems', 'narration', 'video', 'exam'];
  if (!body.content_type || !validContentTypes.includes(body.content_type)) {
    errors.push(`Content type must be one of: ${validContentTypes.join(', ')}`);
  }

  // Validate grade
  const validGrades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];
  if (!body.grade || !validGrades.includes(body.grade)) {
    errors.push(`Grade must be one of: ${validGrades.join(', ')}`);
  }

  // Validate subject
  const validSubjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
  if (!body.subject || !validSubjects.includes(body.subject)) {
    errors.push(`Subject must be one of: ${validSubjects.join(', ')}`);
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Extract user ID from various sources in the request
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Parsed request body
 * @returns {string|null} User ID or null if not found
 */
function extractUserId(event, requestBody) {
  // Try multiple sources for user ID
  const userId = requestBody.user_id || 
                 event.headers['x-user-id'] || 
                 event.headers['X-User-ID'] ||
                 event.queryStringParameters?.user_id ||
                 event.queryStringParameters?.userId;
  
  return userId || null;
}

/**
 * Main Netlify function handler
 * Processes content generation requests with Claude Sonnet 4 and RevenueCat gating
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object with generated content
 */
exports.handler = async (event, context) => {
  console.log('Content Generation function invoked:', {
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

  // Only allow POST requests for content generation
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        success: false,
        error: 'Method not allowed. Use POST for content generation.',
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
      prompt,
      content_type,
      grade,
      subject
    } = requestBody;

    // Extract user ID for subscription checking
    const userId = extractUserId(event, requestBody);

    console.log('Processing content generation request:', {
      contentType: content_type,
      grade,
      subject,
      userId: userId || '[Not provided]',
      promptLength: prompt.length
    });

    // Check subscription status via RevenueCat
    const subscriptionStatus = await checkSubscriptionStatus(userId);
    
    console.log('Subscription check result:', {
      isPremium: subscriptionStatus.isPremium,
      isActive: subscriptionStatus.isActive,
      hasError: !!subscriptionStatus.error,
      userId: subscriptionStatus.userId
    });

    // Gate Claude Sonnet 4 features behind premium subscription
    if (!subscriptionStatus.isPremium || !subscriptionStatus.isActive) {
      console.log('User does not have premium access, providing fallback content');
      
      const fallbackContent = generateFallbackContent(content_type, grade, subject);
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: false,
          premium_required: true,
          message: 'Premium subscription required for AI-powered content generation with Claude Sonnet 4',
          subscription_status: subscriptionStatus,
          fallback_content: fallbackContent,
          upgrade_info: {
            description: 'Upgrade to premium for AI-generated educational content',
            features: [
              'Personalized content generation with Claude Sonnet 4',
              'Custom educational materials for any topic',
              'Age-appropriate content for all grade levels',
              'Multiple content types (problems, scripts, exams)',
              'Unlimited content generation requests'
            ]
          }
        }),
      };
    }

    // User has premium access, proceed with Claude Sonnet 4 generation
    try {
      console.log('User has premium access, generating content with Claude Sonnet 4');
      
      const generatedContent = await generateContentWithClaude(prompt, content_type, grade, subject);
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          premium: true,
          content: generatedContent,
          metadata: {
            content_type,
            grade,
            subject,
            prompt_length: prompt.length,
            content_length: generatedContent.length,
            generation_time: new Date().toISOString(),
            model: 'claude-3-5-sonnet-20241022'
          },
          subscription_status: subscriptionStatus,
          usage_info: {
            provider: 'Anthropic Claude Sonnet 4',
            quality: 'Premium AI-generated',
            personalized: true
          }
        }),
      };

    } catch (claudeError) {
      console.error('Claude content generation failed, providing fallback:', claudeError.message);
      
      // Even premium users get fallback if Claude fails
      const fallbackContent = generateFallbackContent(content_type, grade, subject);
      
      return {
        statusCode: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          premium: true,
          claude_error: claudeError.message,
          content: fallbackContent,
          fallback: true,
          subscription_status: subscriptionStatus,
          message: 'Claude Sonnet 4 temporarily unavailable, using fallback content',
          retry_info: {
            suggestion: 'Please try again in a few moments',
            fallback_provided: true
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
        message: 'An unexpected error occurred while processing your content generation request',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `content_gen_${Date.now()}`
        }
      }),
    };
  }
};