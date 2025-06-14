```sql
   -- EduSphere AI Supabase Database Schema
   -- Creates tables for enhanced features: personalized learning, gamification, social sharing, and AI tutor
   -- World's Largest Hackathon Project - EduSphere AI

   -- Enable UUID extension
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

   -- User Preferences Table
   CREATE TABLE IF NOT EXISTS user_preferences (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id VARCHAR(255) NOT NULL UNIQUE,
       preferred_subject VARCHAR(50) DEFAULT 'math',
       preferred_difficulty INTEGER DEFAULT 2 CHECK (preferred_difficulty >= 1 AND preferred_difficulty <= 5),
       preferred_language VARCHAR(10) DEFAULT 'en',
       learning_style VARCHAR(50) DEFAULT 'visual',
       daily_goal_minutes INTEGER DEFAULT 30,
       updated_at TIMESTAMP DEFAULT NOW()
   );

   -- User Achievements Table
   CREATE TABLE IF NOT EXISTS user_achievements (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id VARCHAR(255) NOT NULL,
       achievement_name VARCHAR(100) NOT NULL,
       points INTEGER DEFAULT 0,
       achieved_at TIMESTAMP DEFAULT NOW(),
       UNIQUE(user_id, achievement_name)
   );

   -- Shared Content Table
   CREATE TABLE IF NOT EXISTS shared_content (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id VARCHAR(255) NOT NULL,
       content_type VARCHAR(50) NOT NULL,
       content_url TEXT NOT NULL,
       shared_at TIMESTAMP DEFAULT NOW(),
       visibility VARCHAR(20) DEFAULT 'public'
   );

   -- Tutor Scripts Table
   CREATE TABLE IF NOT EXISTS tutor_scripts (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       subject VARCHAR(50) NOT NULL,
       difficulty INTEGER NOT NULL CHECK (difficulty >= 1 AND difficulty <= 5),
       language VARCHAR(10) DEFAULT 'en',
       script_text TEXT NOT NULL,
       created_at TIMESTAMP DEFAULT NOW()
   );

   -- User Progress Table
   CREATE TABLE IF NOT EXISTS user_progress (
       id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
       user_id VARCHAR(255) NOT NULL,
       subject VARCHAR(50) NOT NULL,
       topic VARCHAR(100) NOT NULL,
       progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
       last_updated TIMESTAMP DEFAULT NOW(),
       UNIQUE(user_id, subject, topic)
   );

   -- Indexes for Performance
   CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);
   CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
   CREATE INDEX IF NOT EXISTS idx_shared_content_user_id ON shared_content(user_id);
   CREATE INDEX IF NOT EXISTS idx_tutor_scripts_subject_difficulty ON tutor_scripts(subject, difficulty);
   CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);

   -- Sample Data
   INSERT INTO user_preferences (user_id, preferred_subject, preferred_difficulty, preferred_language, learning_style, daily_goal_minutes)
   VALUES
       ('user1@example.com', 'math', 3, 'en', 'visual', 45),
       ('user2@example.com', 'science', 2, 'es', 'auditory', 30)
   ON CONFLICT (user_id) DO NOTHING;

   INSERT INTO user_achievements (user_id, achievement_name, points, achieved_at)
   VALUES
       ('user1@example.com', 'Math Master', 100, NOW()),
       ('user2@example.com', 'Science Starter', 50, NOW())
   ON CONFLICT (user_id, achievement_name) DO NOTHING;

   INSERT INTO shared_content (user_id, content_type, content_url, shared_at, visibility)
   VALUES
       ('user1@example.com', 'video', 'https://example.com/video1', NOW(), 'public'),
       ('user2@example.com', 'article', 'https://example.com/article1', NOW(), 'friends')
   ON CONFLICT (id) DO NOTHING;

   INSERT INTO tutor_scripts (subject, difficulty, language, script_text, created_at)
   VALUES
       ('math', 3, 'en', 'Let’s solve quadratic equations step-by-step...', NOW()),
       ('science', 2, 'es', 'Exploremos el ciclo del agua...', NOW())
   ON CONFLICT (id) DO NOTHING;

   INSERT INTO user_progress (user_id, subject, topic, progress_percentage, last_updated)
   VALUES
       ('user1@example.com', 'math', 'algebra', 75, NOW()),
       ('user2@example.com', 'science', 'biology', 50, NOW())
   ON CONFLICT (user_id, subject, topic) DO NOTHING;

   -- Utility Functions
   CREATE OR REPLACE FUNCTION get_user_total_points(user_id_param VARCHAR)
   RETURNS INTEGER AS $$
   BEGIN
       RETURN (
           SELECT COALESCE(SUM(points), 0)
           FROM user_achievements
           WHERE user_id = user_id_param
       );
   END;
   $$ LANGUAGE plpgsql;

   CREATE OR REPLACE FUNCTION get_user_rank(user_id_param VARCHAR)
   RETURNS INTEGER AS $$
   BEGIN
       RETURN (
           SELECT rank
           FROM (
               SELECT user_id, DENSE_RANK() OVER (ORDER BY COALESCE(SUM(points), 0) DESC) as rank
               FROM user_achievements
               GROUP BY user_id
           ) rankings
           WHERE user_id = user_id_param
       );
   END;
   $$ LANGUAGE plpgsql;

   CREATE OR REPLACE FUNCTION update_user_streak()
   RETURNS TRIGGER AS $$
   BEGIN
       UPDATE user_preferences
       SET daily_goal_minutes = daily_goal_minutes + 10
       WHERE user_id = NEW.user_id;
       RETURN NEW;
   END;
   $$ LANGUAGE plpgsql;

   -- Trigger for updating streak
   CREATE TRIGGER trigger_update_streak
   AFTER INSERT ON user_achievements
   FOR EACH ROW
   EXECUTE FUNCTION update_user_streak();

   -- Permissions
   GRANT ALL ON user_preferences TO authenticated;
   GRANT ALL ON user_achievements TO authenticated;
   GRANT ALL ON shared_content TO authenticated;
   GRANT ALL ON tutor_scripts TO authenticated;
   GRANT ALL ON user_progress TO authenticated;
   ```