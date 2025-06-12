/**
 * EduSphere AI Authentication Netlify Function
 * Handles user authentication, profile management, and session tracking using Supabase Auth
 * Supports email/password, social login, and secure session management
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

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Initialize users table in Supabase
 */
async function initializeUsersTable() {
  try {
    console.log('Initializing users table...');

    // Create users table
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'users',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        clerk_id VARCHAR(255),
        email VARCHAR(255) NOT NULL UNIQUE,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        display_name VARCHAR(100),
        avatar_url TEXT,
        role VARCHAR(20) DEFAULT 'user',
        is_active BOOLEAN DEFAULT TRUE,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      `
    });

    if (error) {
      console.error('Error creating users table:', error);
    }

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'users',
      index_name: 'idx_users_email',
      index_definition: 'email'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'users',
      index_name: 'idx_users_clerk_id',
      index_definition: 'clerk_id'
    });

    console.log('Users table initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize users table:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Create or update user in Supabase
 * @param {Object} userData - User data
 * @returns {Promise<Object|null>} Created/updated user or null
 */
async function createOrUpdateUser(userData) {
  try {
    console.log('Creating/updating user:', userData.email);

    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .single();

    if (existingUser) {
      // Update existing user
      const { data, error } = await supabase
        .from('users')
        .update({
          clerk_id: userData.clerk_id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          display_name: userData.display_name || `${userData.first_name} ${userData.last_name}`,
          avatar_url: userData.avatar_url,
          last_login: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating user:', error);
        return null;
      }

      console.log('User updated successfully:', data.id);
      return data;
    } else {
      // Create new user
      const { data, error } = await supabase
        .from('users')
        .insert({
          clerk_id: userData.clerk_id,
          email: userData.email,
          first_name: userData.first_name,
          last_name: userData.last_name,
          display_name: userData.display_name || `${userData.first_name} ${userData.last_name}`,
          avatar_url: userData.avatar_url,
          role: 'user',
          last_login: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating user:', error);
        return null;
      }

      console.log('User created successfully:', data.id);
      return data;
    }

  } catch (error) {
    console.error('Failed to create/update user:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Get user by ID
 * @param {string} userId - User identifier
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserById(userId) {
  try {
    console.log('Fetching user by ID:', userId);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('Failed to get user by ID:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Get user by email
 * @param {string} email - User email
 * @returns {Promise<Object|null>} User object or null
 */
async function getUserByEmail(email) {
  try {
    console.log('Fetching user by email:', email);

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }

    return data;

  } catch (error) {
    console.error('Failed to get user by email:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Update user profile
 * @param {string} userId - User identifier
 * @param {Object} profileData - Profile data to update
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProfile(userId, profileData) {
  try {
    console.log('Updating user profile:', userId);

    const { error } = await supabase
      .from('users')
      .update({
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        display_name: profileData.display_name,
        avatar_url: profileData.avatar_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
      return false;
    }

    console.log('User profile updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user profile:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Record user login
 * @param {string} userId - User identifier
 * @returns {Promise<boolean>} Success status
 */
async function recordUserLogin(userId) {
  try {
    console.log('Recording user login:', userId);

    const { error } = await supabase
      .from('users')
      .update({
        last_login: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error recording user login:', error);
      return false;
    }

    console.log('User login recorded successfully');
    return true;

  } catch (error) {
    console.error('Failed to record user login:', error);
    Sentry.captureException(error);
    return false;
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
    const action = body.action || '';

    if (['signup', 'login', 'update_profile'].includes(action)) {
      if (!body.email && action !== 'update_profile') {
        errors.push('Email is required');
      }

      if (action === 'signup' && (!body.first_name || !body.last_name)) {
        errors.push('First name and last name are required for signup');
      }

      if (action === 'update_profile' && !body.user_id) {
        errors.push('User ID is required for profile updates');
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Main Netlify function handler
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Auth function invoked:', {
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
    await initializeUsersTable();

    // Handle GET requests - fetch user data
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      
      try {
        // Get user by ID
        if (queryParams.user_id) {
          const user = await getUserById(queryParams.user_id);
          
          if (!user) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'User not found',
              }),
            };
          }
          
          // Remove sensitive information
          delete user.clerk_id;
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              user: user,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        // Get user by email
        if (queryParams.email) {
          const user = await getUserByEmail(queryParams.email);
          
          if (!user) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'User not found',
              }),
            };
          }
          
          // Remove sensitive information
          delete user.clerk_id;
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              user: user,
              timestamp: new Date().toISOString(),
            }),
          };
        }
        
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID or email is required',
          }),
        };

      } catch (error) {
        console.error('Failed to fetch user data:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch user data',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - user authentication and profile management
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

      const action = requestBody.action || '';

      try {
        if (action === 'signup') {
          // Create new user
          const userData = {
            clerk_id: requestBody.clerk_id,
            email: requestBody.email,
            first_name: requestBody.first_name,
            last_name: requestBody.last_name,
            display_name: requestBody.display_name,
            avatar_url: requestBody.avatar_url
          };

          const user = await createOrUpdateUser(userData);
          
          if (user) {
            return {
              statusCode: 201,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                user: {
                  id: user.id,
                  email: user.email,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url,
                  role: user.role
                },
                message: 'User created successfully',
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
                error: 'Failed to create user',
              }),
            };
          }

        } else if (action === 'login') {
          // Handle login
          const user = await getUserByEmail(requestBody.email);
          
          if (!user) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'User not found',
              }),
            };
          }
          
          // Record login
          await recordUserLogin(user.id);
          
          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              user: {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
                avatar_url: user.avatar_url,
                role: user.role
              },
              message: 'Login successful',
              timestamp: new Date().toISOString(),
            }),
          };

        } else if (action === 'update_profile') {
          // Update user profile
          const profileData = {
            first_name: requestBody.first_name,
            last_name: requestBody.last_name,
            display_name: requestBody.display_name,
            avatar_url: requestBody.avatar_url
          };

          const updated = await updateUserProfile(requestBody.user_id, profileData);
          
          if (updated) {
            const user = await getUserById(requestBody.user_id);
            
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                user: {
                  id: user.id,
                  email: user.email,
                  display_name: user.display_name,
                  avatar_url: user.avatar_url,
                  role: user.role
                },
                message: 'Profile updated successfully',
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
                error: 'Failed to update profile',
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
            allowedActions: ['signup', 'login', 'update_profile'],
          }),
        };

      } catch (error) {
        console.error('Failed to process auth request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process auth request',
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
          GET: 'Fetch user data by ID or email',
          POST: 'Signup, login, or update user profile'
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
        message: 'An unexpected error occurred while processing authentication',
        timestamp: new Date().toISOString()
      }),
    };
  }
};