/**
 * EduSphere AI Crowdsourcing Netlify Function
 * Handles community-generated content submissions and moderation using Supabase
 * Supports user-generated problems, stories, and educational content
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

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Content types supported for crowdsourcing
 */
const SUPPORTED_CONTENT_TYPES = [
  'problem',
  'story',
  'quiz',
  'lesson',
  'video_script',
  'activity',
  'game',
  'worksheet'
];

/**
 * Content status options
 */
const CONTENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_REVIEW: 'needs_review'
};

/**
 * Initialize crowdsource submissions table in Supabase
 */
async function initializeCrowdsourceTable() {
  try {
    console.log('Initializing crowdsource submissions table...');

    // Create crowdsource_submissions table
    const { error } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'crowdsource_submissions',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        content JSONB NOT NULL,
        description TEXT,
        subject VARCHAR(50),
        grade_level VARCHAR(20),
        difficulty VARCHAR(20) DEFAULT 'medium',
        language VARCHAR(10) DEFAULT 'en',
        tags TEXT[],
        status VARCHAR(20) DEFAULT 'pending',
        moderator_notes TEXT,
        upvotes INTEGER DEFAULT 0,
        downvotes INTEGER DEFAULT 0,
        usage_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        approved_at TIMESTAMP,
        approved_by VARCHAR(255)
      `
    });

    if (error) {
      console.error('Error creating crowdsource submissions table:', error);
    }

    // Create indexes for better performance
    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'crowdsource_submissions',
      index_name: 'idx_crowdsource_user_id',
      index_definition: 'user_id'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'crowdsource_submissions',
      index_name: 'idx_crowdsource_content_type',
      index_definition: 'content_type'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'crowdsource_submissions',
      index_name: 'idx_crowdsource_status',
      index_definition: 'status'
    });

    await supabase.rpc('create_index_if_not_exists', {
      table_name: 'crowdsource_submissions',
      index_name: 'idx_crowdsource_created_at',
      index_definition: 'created_at DESC'
    });

    // Create user_votes table for tracking votes
    await supabase.rpc('create_table_if_not_exists', {
      table_name: 'user_votes',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        submission_id UUID NOT NULL,
        vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, submission_id)
      `
    });

    console.log('Crowdsource tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize crowdsource tables:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Submit new crowdsourced content
 * @param {Object} submissionData - Content submission data
 * @returns {Promise<Object|null>} Created submission or null
 */
async function submitContent(submissionData) {
  try {
    console.log('Submitting new crowdsourced content:', {
      contentType: submissionData.content_type,
      title: submissionData.title,
      userId: submissionData.user_id
    });

    // Validate content structure based on type
    const validatedContent = validateContentStructure(submissionData.content_type, submissionData.content);
    
    if (!validatedContent.isValid) {
      throw new Error(`Invalid content structure: ${validatedContent.errors.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('crowdsource_submissions')
      .insert({
        user_id: submissionData.user_id,
        content_type: submissionData.content_type,
        title: submissionData.title,
        content: submissionData.content,
        description: submissionData.description,
        subject: submissionData.subject,
        grade_level: submissionData.grade_level,
        difficulty: submissionData.difficulty || 'medium',
        language: submissionData.language || 'en',
        tags: submissionData.tags || [],
        status: CONTENT_STATUS.PENDING
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting content:', error);
      return null;
    }

    console.log('Content submitted successfully:', data.id);
    return data;

  } catch (error) {
    console.error('Failed to submit content:', error);
    Sentry.captureException(error);
    return null;
  }
}

/**
 * Validate content structure based on type
 * @param {string} contentType - Type of content
 * @param {Object} content - Content data
 * @returns {Object} Validation result
 */
function validateContentStructure(contentType, content) {
  const errors = [];

  switch (contentType) {
    case 'problem':
      if (!content.question || typeof content.question !== 'string') {
        errors.push('Problem must have a question');
      }
      if (!content.answer || typeof content.answer !== 'string') {
        errors.push('Problem must have an answer');
      }
      break;

    case 'story':
      if (!content.story_text ||  typeof content.story_text !== 'string') {
        errors.push('Story must have story text');
      }
      if (!content.chapters || !Array.isArray(content.chapters) || content.chapters.length === 0) {
        errors.push('Story must have at least one chapter');
      }
      break;

    case 'quiz':
      if (!content.questions || !Array.isArray(content.questions) || content.questions.length === 0) {
        errors.push('Quiz must have at least one question');
      } else {
        content.questions.forEach((question, index) => {
          if (!question.text) {
            errors.push(`Question ${index + 1} must have text`);
          }
          if (!question.answer) {
            errors.push(`Question ${index + 1} must have an answer`);
          }
        });
      }
      break;

    case 'lesson':
      if (!content.objectives || !Array.isArray(content.objectives) || content.objectives.length === 0) {
        errors.push('Lesson must have learning objectives');
      }
      if (!content.content_sections || !Array.isArray(content.content_sections) || content.content_sections.length === 0) {
        errors.push('Lesson must have content sections');
      }
      break;

    default:
      // Basic validation for other types
      if (!content || typeof content !== 'object' || Object.keys(content).length === 0) {
        errors.push('Content must be a non-empty object');
      }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Get crowdsourced content submissions
 * @param {Object} filters - Query filters
 * @returns {Promise<Array>} Array of submissions
 */
async function getSubmissions(filters = {}) {
  try {
    const { 
      content_type, 
      status, 
      user_id,
      subject,
      grade_level,
      limit = 20, 
      offset = 0 
    } = filters;

    console.log('Fetching crowdsourced submissions with filters:', filters);

    let query = supabase
      .from('crowdsource_submissions')
      .select('*');

    // Apply filters
    if (content_type) {
      query = query.eq('content_type', content_type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (user_id) {
      query = query.eq('user_id', user_id);
    }

    if (subject) {
      query = query.eq('subject', subject);
    }

    if (grade_level) {
      query = query.eq('grade_level', grade_level);
    }

    // Apply pagination
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching submissions:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} submissions`);
    return data || [];

  } catch (error) {
    console.error('Failed to get submissions:', error);
    Sentry.captureException(error);
    return [];
  }
}

/**
 * Vote on a submission
 * @param {Object} voteData - Vote data
 * @returns {Promise<boolean>} Success status
 */
async function voteOnSubmission(voteData) {
  try {
    console.log('Processing vote on submission:', voteData);

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('user_votes')
      .select('id, vote_type')
      .eq('user_id', voteData.user_id)
      .eq('submission_id', voteData.submission_id)
      .single();

    // Begin transaction
    if (existingVote) {
      // User already voted, update if vote type changed
      if (existingVote.vote_type !== voteData.vote_type) {
        // Update vote type
        const { error: updateError } = await supabase
          .from('user_votes')
          .update({ vote_type: voteData.vote_type })
          .eq('id', existingVote.id);

        if (updateError) {
          console.error('Error updating vote:', updateError);
          return false;
        }

        // Update submission vote counts
        if (voteData.vote_type === 'upvote') {
          // Changed from downvote to upvote
          await supabase
            .from('crowdsource_submissions')
            .update({
              upvotes: supabase.rpc('increment', { inc: 1 }),
              downvotes: supabase.rpc('decrement', { dec: 1 })
            })
            .eq('id', voteData.submission_id);
        } else {
          // Changed from upvote to downvote
          await supabase
            .from('crowdsource_submissions')
            .update({
              upvotes: supabase.rpc('decrement', { dec: 1 }),
              downvotes: supabase.rpc('increment', { inc: 1 })
            })
            .eq('id', voteData.submission_id);
        }
      }
    } else {
      // New vote
      const { error: insertError } = await supabase
        .from('user_votes')
        .insert({
          user_id: voteData.user_id,
          submission_id: voteData.submission_id,
          vote_type: voteData.vote_type
        });

      if (insertError) {
        console.error('Error inserting vote:', insertError);
        return false;
      }

      // Update submission vote count
      if (voteData.vote_type === 'upvote') {
        await supabase
          .from('crowdsource_submissions')
          .update({ upvotes: supabase.rpc('increment', { inc: 1 }) })
          .eq('id', voteData.submission_id);
      } else {
        await supabase
          .from('crowdsource_submissions')
          .update({ downvotes: supabase.rpc('increment', { inc: 1 }) })
          .eq('id', voteData.submission_id);
      }
    }

    console.log('Vote processed successfully');
    return true;

  } catch (error) {
    console.error('Failed to process vote:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Moderate a submission
 * @param {Object} moderationData - Moderation data
 * @returns {Promise<boolean>} Success status
 */
async function moderateSubmission(moderationData) {
  try {
    console.log('Moderating submission:', moderationData);

    const { error } = await supabase
      .from('crowdsource_submissions')
      .update({
        status: moderationData.status,
        moderator_notes: moderationData.notes,
        approved_at: moderationData.status === CONTENT_STATUS.APPROVED ? new Date().toISOString() : null,
        approved_by: moderationData.status === CONTENT_STATUS.APPROVED ? moderationData.moderator_id : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', moderationData.submission_id);

    if (error) {
      console.error('Error moderating submission:', error);
      return false;
    }

    console.log('Submission moderated successfully');
    return true;

  } catch (error) {
    console.error('Failed to moderate submission:', error);
    Sentry.captureException(error);
    return false;
  }
}

/**
 * Get submission details
 * @param {string} submissionId - Submission identifier
 * @returns {Promise<Object|null>} Submission details or null
 */
async function getSubmissionDetails(submissionId) {
  try {
    console.log('Fetching submission details for:', submissionId);

    const { data, error } = await supabase
      .from('crowdsource_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();

    if (error) {
      console.error('Error fetching submission details:', error);
      return null;
    }

    console.log('Submission details retrieved successfully');
    return data;

  } catch (error) {
    console.error('Failed to get submission details:', error);
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
    const action = body.action || 'submit';

    if (action === 'submit') {
      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!body.content_type || !SUPPORTED_CONTENT_TYPES.includes(body.content_type)) {
        errors.push(`Content type must be one of: ${SUPPORTED_CONTENT_TYPES.join(', ')}`);
      }

      if (!body.title || typeof body.title !== 'string') {
        errors.push('Title is required and must be a string');
      }

      if (!body.content || typeof body.content !== 'object') {
        errors.push('Content is required and must be an object');
      }

    } else if (action === 'vote') {
      if (!body.user_id || typeof body.user_id !== 'string') {
        errors.push('User ID is required and must be a string');
      }

      if (!body.submission_id || typeof body.submission_id !== 'string') {
        errors.push('Submission ID is required and must be a string');
      }

      if (!body.vote_type || !['upvote', 'downvote'].includes(body.vote_type)) {
        errors.push('Vote type must be either "upvote" or "downvote"');
      }

    } else if (action === 'moderate') {
      if (!body.moderator_id || typeof body.moderator_id !== 'string') {
        errors.push('Moderator ID is required and must be a string');
      }

      if (!body.submission_id || typeof body.submission_id !== 'string') {
        errors.push('Submission ID is required and must be a string');
      }

      if (!body.status || !Object.values(CONTENT_STATUS).includes(body.status)) {
        errors.push(`Status must be one of: ${Object.values(CONTENT_STATUS).join(', ')}`);
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
  console.log('Crowdsource function invoked:', {
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
    await initializeCrowdsourceTable();

    // Handle GET requests - fetch submissions
    if (event.httpMethod === 'GET') {
      const queryParams = event.queryStringParameters || {};
      const userId = extractUserId(event, {});

      try {
        // Check if requesting specific submission
        if (queryParams.submission_id) {
          const submission = await getSubmissionDetails(queryParams.submission_id);
          
          if (!submission) {
            return {
              statusCode: 404,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: false,
                error: 'Submission not found',
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
              submission: submission,
              timestamp: new Date().toISOString(),
            }),
          };
        }

        // Get submissions with filters
        const filters = {
          content_type: queryParams.content_type,
          status: queryParams.status || CONTENT_STATUS.APPROVED, // Default to approved
          user_id: queryParams.user_id || userId,
          subject: queryParams.subject,
          grade_level: queryParams.grade_level,
          limit: queryParams.limit ? parseInt(queryParams.limit) : 20,
          offset: queryParams.offset ? parseInt(queryParams.offset) : 0
        };

        const submissions = await getSubmissions(filters);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            submissions: submissions,
            count: submissions.length,
            filters: filters,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch submissions:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch submissions',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - submit content, vote, or moderate
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

      const action = requestBody.action || 'submit';

      try {
        if (action === 'submit') {
          // Submit new content
          const submission = await submitContent(requestBody);
          
          if (submission) {
            return {
              statusCode: 201,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                submission: submission,
                message: 'Content submitted successfully for review',
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
                error: 'Failed to submit content',
              }),
            };
          }

        } else if (action === 'vote') {
          // Vote on submission
          const voteData = {
            user_id: requestBody.user_id,
            submission_id: requestBody.submission_id,
            vote_type: requestBody.vote_type
          };

          const voted = await voteOnSubmission(voteData);
          
          if (voted) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                vote_recorded: true,
                vote_type: voteData.vote_type,
                message: `${voteData.vote_type === 'upvote' ? 'Upvote' : 'Downvote'} recorded successfully`,
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
                error: 'Failed to record vote',
              }),
            };
          }

        } else if (action === 'moderate') {
          // Moderate submission
          const moderationData = {
            moderator_id: requestBody.moderator_id,
            submission_id: requestBody.submission_id,
            status: requestBody.status,
            notes: requestBody.notes
          };

          const moderated = await moderateSubmission(moderationData);
          
          if (moderated) {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                moderation_applied: true,
                status: moderationData.status,
                message: `Submission ${moderationData.status}`,
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
                error: 'Failed to moderate submission',
              }),
            };
          }
        }

      } catch (error) {
        console.error('Failed to process crowdsource request:', error);
        Sentry.captureException(error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process crowdsource request',
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
          GET: 'Fetch submissions with optional filters',
          POST: 'Submit content, vote on submissions, or moderate content'
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
        message: 'An unexpected error occurred while processing crowdsource submissions',
        timestamp: new Date().toISOString()
      }),
    };
  }
};