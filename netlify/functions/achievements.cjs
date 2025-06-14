/**
 * EduSphere AI Achievements and Gamification Netlify Function
 * Handles badge awards, leaderboard, and gamification features using Supabase
 * World's Largest Hackathon Project - EduSphere AI
 */

const { createClient } = require('@supabase/supabase-js');

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
 * Achievement badge definitions
 */
const ACHIEVEMENT_BADGES = {
  first_lesson: {
    name: 'First Steps',
    description: 'Completed your first lesson',
    icon: '🎯',
    points: 10,
    category: 'milestone',
    requirements: { lessons_completed: 1 }
  },
  streak_3: {
    name: '3-Day Streak',
    description: 'Learned for 3 days in a row',
    icon: '🔥',
    points: 25,
    category: 'streak',
    requirements: { streak_days: 3 }
  },
  streak_7: {
    name: 'Week Warrior',
    description: 'Learned for 7 days in a row',
    icon: '⚡',
    points: 50,
    category: 'streak',
    requirements: { streak_days: 7 }
  },
  streak_30: {
    name: 'Monthly Master',
    description: 'Learned for 30 days in a row',
    icon: '👑',
    points: 200,
    category: 'streak',
    requirements: { streak_days: 30 }
  },
  perfect_score: {
    name: 'Perfect Score',
    description: 'Got 100% on a lesson',
    icon: '⭐',
    points: 30,
    category: 'performance',
    requirements: { perfect_lessons: 1 }
  },
  accuracy_master: {
    name: 'Accuracy Master',
    description: 'Maintained 90%+ accuracy over 10 lessons',
    icon: '🎖️',
    points: 75,
    category: 'performance',
    requirements: { high_accuracy_lessons: 10, min_accuracy: 90 }
  },
  social_sharer: {
    name: 'Social Butterfly',
    description: 'Shared your first creation',
    icon: '🦋',
    points: 20,
    category: 'social',
    requirements: { shares_made: 1 }
  },
  community_star: {
    name: 'Community Star',
    description: 'Received 10 likes on shared content',
    icon: '🌟',
    points: 50,
    category: 'social',
    requirements: { likes_received: 10 }
  },
  ai_tutor_fan: {
    name: 'AI Tutor Fan',
    description: 'Used AI tutor 5 times',
    icon: '🤖',
    points: 40,
    category: 'feature',
    requirements: { ai_tutor_sessions: 5 }
  },
  problem_solver: {
    name: 'Problem Solver',
    description: 'Solved 100 problems',
    icon: '🧩',
    points: 100,
    category: 'milestone',
    requirements: { problems_solved: 100 }
  },
  subject_explorer: {
    name: 'Subject Explorer',
    description: 'Tried all 7 subjects',
    icon: '🗺️',
    points: 60,
    category: 'exploration',
    requirements: { subjects_tried: 7 }
  },
  early_bird: {
    name: 'Early Bird',
    description: 'Completed lessons before 9 AM',
    icon: '🌅',
    points: 15,
    category: 'habit',
    requirements: { early_sessions: 5 }
  },
  night_owl: {
    name: 'Night Owl',
    description: 'Completed lessons after 9 PM',
    icon: '🦉',
    points: 15,
    category: 'habit',
    requirements: { late_sessions: 5 }
  },
  speed_learner: {
    name: 'Speed Learner',
    description: 'Completed 5 lessons in one day',
    icon: '💨',
    points: 35,
    category: 'intensity',
    requirements: { daily_lessons: 5 }
  }
};

/**
 * Initialize Supabase tables for achievements and gamification
 */
async function initializeTables() {
  try {
    console.log('Initializing achievements tables...');

    // Create user_achievements table
    const { error: achievementsError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'user_achievements',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        badge_name VARCHAR(100) NOT NULL,
        badge_description TEXT NOT NULL,
        badge_icon VARCHAR(10) NOT NULL,
        earned_date TIMESTAMP DEFAULT NOW(),
        points INTEGER DEFAULT 0,
        category VARCHAR(50) DEFAULT 'general',
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, badge_name)
      `
    });

    // Create user_preferences table
    const { error: preferencesError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'user_preferences',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        preferred_subject VARCHAR(50) DEFAULT 'math',
        preferred_difficulty INTEGER DEFAULT 2,
        preferred_language VARCHAR(10) DEFAULT 'en',
        learning_style VARCHAR(50) DEFAULT 'visual',
        daily_goal_minutes INTEGER DEFAULT 30,
        updated_at TIMESTAMP DEFAULT NOW()
      `
    });

    // Create shared_content table
    const { error: sharedError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'shared_content',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        content_title VARCHAR(255) NOT NULL,
        share_url TEXT NOT NULL,
        thumbnail_url TEXT,
        description TEXT,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    // Create tutor_scripts table
    const { error: tutorError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'tutor_scripts',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        tone VARCHAR(50) NOT NULL,
        script TEXT NOT NULL,
        grade VARCHAR(20) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        topic VARCHAR(255) NOT NULL,
        duration_minutes INTEGER DEFAULT 5,
        voice_settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      `
    });

    // Create user_progress table
    const { error: progressError } = await supabase.rpc('create_table_if_not_exists', {
      table_name: 'user_progress',
      table_definition: `
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        total_attempted INTEGER DEFAULT 0,
        total_correct INTEGER DEFAULT 0,
        streak_days INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, subject, grade)
      `
    });

    // Note: In a real implementation, you would use proper SQL DDL
    // For this demo, we'll assume tables exist or create them manually

    console.log('Achievement tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize tables:', error);
    // Continue execution even if table creation fails
    return false;
  }
}

/**
 * Get user achievements from Supabase
 * @param {string} userId - User identifier
 * @returns {Promise<Array>} User achievements
 */
async function getUserAchievements(userId) {
  try {
    console.log('Fetching achievements for user:', userId);

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_date', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    console.log(`Found ${data?.length || 0} achievements for user`);
    return data || [];

  } catch (error) {
    console.error('Failed to get user achievements:', error);
    return [];
  }
}

/**
 * Award achievement to user
 * @param {string} userId - User identifier
 * @param {string} badgeName - Badge name to award
 * @returns {Promise<boolean>} Success status
 */
async function awardAchievement(userId, badgeName) {
  try {
    const badge = ACHIEVEMENT_BADGES[badgeName];
    if (!badge) {
      console.error('Unknown badge:', badgeName);
      return false;
    }

    console.log('Awarding achievement:', badgeName, 'to user:', userId);

    // Check if user already has this achievement
    const { data: existing } = await supabase
      .from('user_achievements')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_name', badgeName)
      .single();

    if (existing) {
      console.log('User already has this achievement');
      return false; // Already awarded
    }

    // Award the achievement
    const { error } = await supabase
      .from('user_achievements')
      .insert({
        user_id: userId,
        badge_name: badge.name,
        badge_description: badge.description,
        badge_icon: badge.icon,
        points: badge.points,
        category: badge.category,
        earned_date: new Date().toISOString()
      });

    if (error) {
      console.error('Error awarding achievement:', error);
      return false;
    }

    console.log('Achievement awarded successfully');
    return true;

  } catch (error) {
    console.error('Failed to award achievement:', error);
    return false;
  }
}

/**
 * Check for new achievements based on user activity
 * @param {string} userId - User identifier
 * @returns {Promise<Array>} Newly awarded achievements
 */
async function checkForNewAchievements(userId) {
  try {
    console.log('Checking for new achievements for user:', userId);

    const newAchievements = [];

    // Get user progress data
    const { data: progressData } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId);

    // Get user achievements
    const { data: achievementsData } = await supabase
      .from('user_achievements')
      .select('badge_name')
      .eq('user_id', userId);

    // Get shared content count
    const { data: sharedData } = await supabase
      .from('shared_content')
      .select('id, likes')
      .eq('user_id', userId);

    const existingBadges = new Set(achievementsData?.map(a => a.badge_name) || []);
    
    // Calculate user stats
    const totalAttempted = progressData?.reduce((sum, p) => sum + p.total_attempted, 0) || 0;
    const totalCorrect = progressData?.reduce((sum, p) => sum + p.total_correct, 0) || 0;
    const maxStreak = Math.max(...(progressData?.map(p => p.streak_days) || [0]));
    const subjectsTried = new Set(progressData?.map(p => p.subject) || []).size;
    const sharesCount = sharedData?.length || 0;
    const totalLikes = sharedData?.reduce((sum, s) => sum + s.likes, 0) || 0;

    // Check each achievement
    for (const [badgeKey, badge] of Object.entries(ACHIEVEMENT_BADGES)) {
      if (existingBadges.has(badge.name)) {
        continue; // Already has this badge
      }

      let shouldAward = false;

      // Check requirements based on badge type
      switch (badgeKey) {
        case 'first_lesson':
          shouldAward = totalAttempted >= 1;
          break;
        case 'streak_3':
          shouldAward = maxStreak >= 3;
          break;
        case 'streak_7':
          shouldAward = maxStreak >= 7;
          break;
        case 'streak_30':
          shouldAward = maxStreak >= 30;
          break;
        case 'perfect_score':
          shouldAward = progressData?.some(p => p.total_attempted > 0 && p.total_correct === p.total_attempted) || false;
          break;
        case 'accuracy_master':
          shouldAward = progressData?.some(p => p.total_attempted >= 10 && (p.total_correct / p.total_attempted) >= 0.9) || false;
          break;
        case 'social_sharer':
          shouldAward = sharesCount >= 1;
          break;
        case 'community_star':
          shouldAward = totalLikes >= 10;
          break;
        case 'problem_solver':
          shouldAward = totalCorrect >= 100;
          break;
        case 'subject_explorer':
          shouldAward = subjectsTried >= 7;
          break;
        default:
          // For other badges, use simpler logic or skip
          break;
      }

      if (shouldAward) {
        const awarded = await awardAchievement(userId, badgeKey);
        if (awarded) {
          newAchievements.push({
            badge_name: badge.name,
            badge_description: badge.description,
            badge_icon: badge.icon,
            points: badge.points,
            category: badge.category
          });
        }
      }
    }

    console.log(`Awarded ${newAchievements.length} new achievements`);
    return newAchievements;

  } catch (error) {
    console.error('Failed to check for new achievements:', error);
    return [];
  }
}

/**
 * Get leaderboard data
 * @param {number} limit - Number of top users to return
 * @returns {Promise<Array>} Leaderboard data
 */
async function getLeaderboard(limit = 10) {
  try {
    console.log('Fetching leaderboard data');

    // Get top users by total points
    const { data, error } = await supabase
      .from('user_achievements')
      .select('user_id, points')
      .order('points', { ascending: false });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    // Aggregate points by user
    const userPoints = {};
    data?.forEach(achievement => {
      if (!userPoints[achievement.user_id]) {
        userPoints[achievement.user_id] = 0;
      }
      userPoints[achievement.user_id] += achievement.points;
    });

    // Convert to leaderboard format
    const leaderboard = Object.entries(userPoints)
      .map(([userId, points]) => ({
        user_id: userId,
        display_name: `User ${userId.substring(0, 8)}`, // In real app, get actual names
        total_points: points,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}` // Generate avatar
      }))
      .sort((a, b) => b.total_points - a.total_points)
      .slice(0, limit)
      .map((user, index) => ({
        ...user,
        rank: index + 1
      }));

    console.log(`Generated leaderboard with ${leaderboard.length} users`);
    return leaderboard;

  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return [];
  }
}

/**
 * Get user's rank and stats
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User rank and stats
 */
async function getUserRankAndStats(userId) {
  try {
    console.log('Getting rank and stats for user:', userId);

    // Get user's total points
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('points')
      .eq('user_id', userId);

    const totalPoints = achievements?.reduce((sum, a) => sum + a.points, 0) || 0;

    // Get user's streak
    const { data: progress } = await supabase
      .from('user_progress')
      .select('streak_days')
      .eq('user_id', userId)
      .order('streak_days', { ascending: false })
      .limit(1);

    const maxStreak = progress?.[0]?.streak_days || 0;

    // Get all users' points to calculate rank
    const { data: allAchievements } = await supabase
      .from('user_achievements')
      .select('user_id, points');

    const userPoints = {};
    allAchievements?.forEach(achievement => {
      if (!userPoints[achievement.user_id]) {
        userPoints[achievement.user_id] = 0;
      }
      userPoints[achievement.user_id] += achievement.points;
    });

    // Calculate rank
    const sortedUsers = Object.entries(userPoints)
      .sort(([,a], [,b]) => b - a);
    
    const userRank = sortedUsers.findIndex(([id]) => id === userId) + 1;

    return {
      totalPoints,
      rank: userRank || null,
      streak: maxStreak,
      totalUsers: sortedUsers.length
    };

  } catch (error) {
    console.error('Failed to get user rank and stats:', error);
    return {
      totalPoints: 0,
      rank: null,
      streak: 0,
      totalUsers: 0
    };
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
    if (!body.user_id || typeof body.user_id !== 'string') {
      errors.push('User ID is required and must be a string');
    }

    if (body.action && !['check_achievements', 'award_achievement'].includes(body.action)) {
      errors.push('Action must be either "check_achievements" or "award_achievement"');
    }

    if (body.action === 'award_achievement' && !body.achievement_type) {
      errors.push('Achievement type is required for award_achievement action');
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
  console.log('Achievements function invoked:', {
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
    await initializeTables();

    // Handle GET requests - fetch leaderboard and user stats
    if (event.httpMethod === 'GET') {
      const userId = extractUserId(event, {});

      try {
        const [leaderboard, userStats] = await Promise.all([
          getLeaderboard(20),
          userId ? getUserRankAndStats(userId) : Promise.resolve(null)
        ]);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            leaderboard: leaderboard,
            userRank: userStats?.rank || null,
            userStreak: userStats?.streak || 0,
            userPoints: userStats?.totalPoints || 0,
            totalUsers: userStats?.totalUsers || 0,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch leaderboard data:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch leaderboard data',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - check achievements or award specific achievement
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

      const userId = extractUserId(event, requestBody);
      const action = requestBody.action || 'check_achievements';

      if (!userId) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID is required'
          }),
        };
      }

      try {
        if (action === 'check_achievements') {
          // Check for new achievements
          const newAchievements = await checkForNewAchievements(userId);
          const userAchievements = await getUserAchievements(userId);
          const userStats = await getUserRankAndStats(userId);

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              newAchievements: newAchievements,
              totalAchievements: userAchievements.length,
              userStats: userStats,
              message: newAchievements.length > 0 
                ? `Congratulations! You earned ${newAchievements.length} new achievement${newAchievements.length > 1 ? 's' : ''}!`
                : 'Keep learning to unlock more achievements!',
              timestamp: new Date().toISOString(),
            }),
          };

        } else if (action === 'award_achievement') {
          // Award specific achievement
          const achievementType = requestBody.achievement_type;
          const awarded = await awardAchievement(userId, achievementType);

          if (awarded) {
            const badge = ACHIEVEMENT_BADGES[achievementType];
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                awarded: true,
                achievement: {
                  name: badge.name,
                  description: badge.description,
                  icon: badge.icon,
                  points: badge.points,
                  category: badge.category
                },
                message: `Achievement "${badge.name}" awarded successfully!`,
                timestamp: new Date().toISOString(),
              }),
            };
          } else {
            return {
              statusCode: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                success: true,
                awarded: false,
                message: 'Achievement already earned or requirements not met',
                timestamp: new Date().toISOString(),
              }),
            };
          }
        }

      } catch (error) {
        console.error('Failed to process achievement request:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process achievement request',
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
          GET: 'Fetch leaderboard and user stats',
          POST: 'Check for new achievements or award specific achievement'
        }
      }),
    };

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
        message: 'An unexpected error occurred while processing achievements',
        timestamp: new Date().toISOString()
      }),
    };
  }
};