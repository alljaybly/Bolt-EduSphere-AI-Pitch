/**
 * Supabase Client Configuration for EduSphere AI
 * Handles database connections and authentication
 * World's Largest Hackathon Project - EduSphere AI
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://faphnxotbuwiiwfatuok.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZhcGhueG90YnV3aXdmYXR1b2siLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0OTIyMDExMywiZXhwIjoyMDY0Nzk2MTEzfQ.8zUIKQj4FB1CoD-tFpFh6k5DVmjROCDc51cldO87Nes';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
});

// Database types for TypeScript
export interface UserPreferences {
  id?: string;
  user_id: string;
  preferred_subject: string;
  preferred_difficulty: number;
  preferred_language: string;
  learning_style: string;
  daily_goal_minutes: number;
  updated_at?: string;
}

export interface UserAchievements {
  id?: string;
  user_id: string;
  badge_name: string;
  badge_description: string;
  badge_icon: string;
  earned_date: string;
  points: number;
  category: string;
}

export interface SharedContent {
  id?: string;
  user_id: string;
  content_type: string;
  content_title: string;
  share_url: string;
  thumbnail_url?: string;
  description?: string;
  views: number;
  likes: number;
  created_at?: string;
}

export interface TutorScripts {
  id?: string;
  tone: string;
  script: string;
  grade: string;
  subject: string;
  topic: string;
  duration_minutes: number;
  voice_settings: any;
  created_at?: string;
}

export interface UserProgress {
  id?: string;
  user_id: string;
  subject: string;
  grade: string;
  total_attempted: number;
  total_correct: number;
  streak_days: number;
  last_activity: string;
  created_at?: string;
  updated_at?: string;
}

// Helper functions for database operations
export const supabaseHelpers = {
  /**
   * Get user preferences with defaults
   */
  async getUserPreferences(userId: string): Promise<UserPreferences> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user preferences:', error);
    }

    // Return defaults if no preferences found
    return data || {
      user_id: userId,
      preferred_subject: 'math',
      preferred_difficulty: 2,
      preferred_language: 'en',
      learning_style: 'visual',
      daily_goal_minutes: 30
    };
  },

  /**
   * Update user preferences
   */
  async updateUserPreferences(preferences: UserPreferences): Promise<boolean> {
    const { error } = await supabase
      .from('user_preferences')
      .upsert(preferences, { onConflict: 'user_id' });

    if (error) {
      console.error('Error updating user preferences:', error);
      return false;
    }

    return true;
  },

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string): Promise<UserAchievements[]> {
    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .order('earned_date', { ascending: false });

    if (error) {
      console.error('Error fetching user achievements:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Award achievement to user
   */
  async awardAchievement(achievement: UserAchievements): Promise<boolean> {
    const { error } = await supabase
      .from('user_achievements')
      .insert(achievement);

    if (error) {
      console.error('Error awarding achievement:', error);
      return false;
    }

    return true;
  },

  /**
   * Get shared content
   */
  async getSharedContent(limit: number = 20): Promise<SharedContent[]> {
    const { data, error } = await supabase
      .from('shared_content')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching shared content:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Share content
   */
  async shareContent(content: SharedContent): Promise<string | null> {
    const { data, error } = await supabase
      .from('shared_content')
      .insert(content)
      .select('id')
      .single();

    if (error) {
      console.error('Error sharing content:', error);
      return null;
    }

    return data?.id || null;
  },

  /**
   * Get tutor scripts
   */
  async getTutorScripts(filters: { tone?: string; grade?: string; subject?: string } = {}): Promise<TutorScripts[]> {
    let query = supabase.from('tutor_scripts').select('*');

    if (filters.tone) query = query.eq('tone', filters.tone);
    if (filters.grade) query = query.eq('grade', filters.grade);
    if (filters.subject) query = query.eq('subject', filters.subject);

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching tutor scripts:', error);
      return [];
    }

    return data || [];
  },

  /**
   * Save tutor script
   */
  async saveTutorScript(script: TutorScripts): Promise<string | null> {
    const { data, error } = await supabase
      .from('tutor_scripts')
      .insert(script)
      .select('id')
      .single();

    if (error) {
      console.error('Error saving tutor script:', error);
      return null;
    }

    return data?.id || null;
  }
};

export default supabase;