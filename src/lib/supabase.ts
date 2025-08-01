/**
    * Supabase Client Configuration for EduSphere AI
    * Handles database connections and authentication
    * World's Largest Hackathon Project - EduSphere AI
    */

   import { createClient } from '@supabase/supabase-js';

   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

   if (!supabaseUrl || !supabaseAnonKey) {
     throw new Error('Supabase URL and Anon Key must be provided in environment variables');
   }

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

   export const supabaseHelpers = {
     async getUserPreferences(userId: string): Promise<UserPreferences> {
       const { data, error } = await supabase
         .from('user_preferences')
         .select('*')
         .eq('user_id', userId)
         .single();

       if (error && error.code !== 'PGRST116') {
         console.error('Error fetching user preferences:', error);
       }

       return data || {
         user_id: userId,
         preferred_subject: 'math',
         preferred_difficulty: 2,
         preferred_language: 'en',
         learning_style: 'visual',
         daily_goal_minutes: 30
       };
     },

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
     },

     async hasActiveSubscription(userId: string): Promise<boolean> {
       try {
         const { data, error } = await supabase
           .from('users')
           .select('is_premium')
           .eq('id', userId)
           .single();

         if (error) {
           console.error('Error checking premium status:', error);
           return false;
         }

         return data?.is_premium || false;
       } catch (error) {
         console.error('Error checking premium status:', error);
         return false;
       }
     }
   };

   export default supabase;