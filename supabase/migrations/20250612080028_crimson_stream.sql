-- EduSphere AI Supabase Database Schema
-- Creates tables for enhanced features: personalized learning, gamification, social sharing, and AI tutor
-- World's Largest Hackathon Project - EduSphere AI

-- =====================================================
-- USER PREFERENCES TABLE
-- =====================================================
-- Stores user-specific learning preferences for personalized content

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

-- Index for fast user preference lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- =====================================================
-- USER ACHIEVEMENTS TABLE
-- =====================================================
-- Stores gamification badges and achievements earned by users

CREATE TABLE IF NOT EXISTS user_achievements (
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
);

-- Indexes for achievements queries
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned_date ON user_achievements(earned_date DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_points ON user_achievements(points DESC);
CREATE INDEX IF NOT EXISTS idx_user_achievements_category ON user_achievements(category);

-- =====================================================
-- SHARED CONTENT TABLE
-- =====================================================
-- Stores user-generated content shared with the community

CREATE TABLE IF NOT EXISTS shared_content (
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
);

-- Indexes for shared content queries
CREATE INDEX IF NOT EXISTS idx_shared_content_user_id ON shared_content(user_id);
CREATE INDEX IF NOT EXISTS idx_shared_content_created_at ON shared_content(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_likes ON shared_content(likes DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_views ON shared_content(views DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_type ON shared_content(content_type);

-- =====================================================
-- TUTOR SCRIPTS TABLE
-- =====================================================
-- Stores AI tutor scripts with different tones and settings

CREATE TABLE IF NOT EXISTS tutor_scripts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tone VARCHAR(50) NOT NULL,
    script TEXT NOT NULL,
    grade VARCHAR(20) NOT NULL,
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(255) NOT NULL,
    duration_minutes INTEGER DEFAULT 5,
    voice_settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for tutor scripts queries
CREATE INDEX IF NOT EXISTS idx_tutor_scripts_tone ON tutor_scripts(tone);
CREATE INDEX IF NOT EXISTS idx_tutor_scripts_grade ON tutor_scripts(grade);
CREATE INDEX IF NOT EXISTS idx_tutor_scripts_subject ON tutor_scripts(subject);
CREATE INDEX IF NOT EXISTS idx_tutor_scripts_created_at ON tutor_scripts(created_at DESC);

-- =====================================================
-- USER PROGRESS TABLE (Enhanced)
-- =====================================================
-- Enhanced user progress tracking with streak information

CREATE TABLE IF NOT EXISTS user_progress (
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
);

-- Indexes for user progress queries
CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_subject_grade ON user_progress(subject, grade);
CREATE INDEX IF NOT EXISTS idx_user_progress_last_activity ON user_progress(last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_streak ON user_progress(streak_days DESC);

-- =====================================================
-- MULTILINGUAL CONTENT TABLE (From previous migration)
-- =====================================================
-- Stores translations for multilingual support

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
);

-- Indexes for multilingual content
CREATE INDEX IF NOT EXISTS idx_multilingual_original_language ON multilingual_content(original_text, language);
CREATE INDEX IF NOT EXISTS idx_multilingual_user_id ON multilingual_content(user_id);
CREATE INDEX IF NOT EXISTS idx_multilingual_created_at ON multilingual_content(created_at);

-- =====================================================
-- AUDIO CACHE TABLE (From previous migration)
-- =====================================================
-- Caches audio files metadata for ElevenLabs

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
    usage_count INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    UNIQUE(text_hash, language, voice_id)
);

-- Indexes for audio cache
CREATE INDEX IF NOT EXISTS idx_audio_cache_hash_lang ON audio_cache(text_hash, language);
CREATE INDEX IF NOT EXISTS idx_audio_cache_voice ON audio_cache(voice_id);
CREATE INDEX IF NOT EXISTS idx_audio_cache_expires ON audio_cache(expires_at);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================
-- Insert sample data for testing and demonstration

-- Sample user preferences
INSERT INTO user_preferences (user_id, preferred_subject, preferred_difficulty, preferred_language, learning_style, daily_goal_minutes) VALUES
('demo_user_1', 'math', 3, 'en', 'visual', 45),
('demo_user_2', 'science', 2, 'es', 'auditory', 30),
('demo_user_3', 'english', 4, 'zh', 'kinesthetic', 60)
ON CONFLICT (user_id) DO NOTHING;

-- Sample achievements
INSERT INTO user_achievements (user_id, badge_name, badge_description, badge_icon, points, category) VALUES
('demo_user_1', 'First Steps', 'Completed your first lesson', '🎯', 10, 'milestone'),
('demo_user_1', '3-Day Streak', 'Learned for 3 days in a row', '🔥', 25, 'streak'),
('demo_user_2', 'Perfect Score', 'Got 100% on a lesson', '⭐', 30, 'performance'),
('demo_user_3', 'Social Butterfly', 'Shared your first creation', '🦋', 20, 'social')
ON CONFLICT (user_id, badge_name) DO NOTHING;

-- Sample shared content
INSERT INTO shared_content (user_id, content_type, content_title, share_url, description, views, likes) VALUES
('demo_user_1', 'video', 'My Math Adventure', 'https://edusphere.ai/share/math-adventure-1', 'Learning multiplication tables with AI tutor', 15, 3),
('demo_user_2', 'video', 'Science Experiment Fun', 'https://edusphere.ai/share/science-fun-2', 'Exploring plant growth with friendly AI guide', 8, 2),
('demo_user_3', 'video', 'English Story Time', 'https://edusphere.ai/share/story-time-3', 'Reading comprehension with enthusiastic tutor', 12, 5);

-- Sample tutor scripts
INSERT INTO tutor_scripts (tone, script, grade, subject, topic, duration_minutes, voice_settings) VALUES
('friendly', 'Hello there! I''m your friendly AI tutor, and I''m so excited to explore math with you today!', 'grade1-6', 'math', 'Introduction to Numbers', 3, '{"stability": 0.7, "similarity_boost": 0.8}'),
('professional', 'Welcome to our structured learning session. Today we will examine the fundamental principles of science.', 'grade7-9', 'science', 'Scientific Method', 5, '{"stability": 0.8, "similarity_boost": 0.9}'),
('enthusiastic', 'WOW! Are you ready for an AMAZING adventure in learning? Let''s dive into the exciting world of English!', 'kindergarten', 'english', 'Alphabet Fun', 4, '{"stability": 0.6, "similarity_boost": 0.7}'),
('patient', 'Take your time, there''s no rush. We''ll work through this step by step, and I''m here to help you every step of the way.', 'grade10-12', 'math', 'Advanced Algebra', 7, '{"stability": 0.9, "similarity_boost": 0.8}'),
('playful', 'Hey there, learning buddy! Ready to play some super fun games while we learn? Let''s make this awesome!', 'kindergarten', 'math', 'Counting Games', 2, '{"stability": 0.5, "similarity_boost": 0.6}');

-- Sample user progress
INSERT INTO user_progress (user_id, subject, grade, total_attempted, total_correct, streak_days, last_activity) VALUES
('demo_user_1', 'math', 'grade1-6', 25, 22, 5, NOW() - INTERVAL '1 hour'),
('demo_user_1', 'science', 'grade1-6', 15, 12, 3, NOW() - INTERVAL '2 hours'),
('demo_user_2', 'english', 'kindergarten', 30, 28, 7, NOW() - INTERVAL '30 minutes'),
('demo_user_2', 'math', 'kindergarten', 20, 18, 4, NOW() - INTERVAL '1 day'),
('demo_user_3', 'science', 'grade7-9', 40, 35, 10, NOW() - INTERVAL '3 hours'),
('demo_user_3', 'english', 'grade7-9', 35, 32, 8, NOW() - INTERVAL '2 days')
ON CONFLICT (user_id, subject, grade) DO UPDATE SET
    total_attempted = EXCLUDED.total_attempted,
    total_correct = EXCLUDED.total_correct,
    streak_days = EXCLUDED.streak_days,
    last_activity = EXCLUDED.last_activity,
    updated_at = NOW();

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to calculate user's total points
CREATE OR REPLACE FUNCTION get_user_total_points(p_user_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
    total_points INTEGER;
BEGIN
    SELECT COALESCE(SUM(points), 0) INTO total_points
    FROM user_achievements
    WHERE user_id = p_user_id;
    
    RETURN total_points;
END;
$$ LANGUAGE plpgsql;

-- Function to get user's rank
CREATE OR REPLACE FUNCTION get_user_rank(p_user_id VARCHAR(255))
RETURNS INTEGER AS $$
DECLARE
    user_rank INTEGER;
BEGIN
    WITH user_points AS (
        SELECT user_id, SUM(points) as total_points
        FROM user_achievements
        GROUP BY user_id
    ),
    ranked_users AS (
        SELECT user_id, total_points, 
               ROW_NUMBER() OVER (ORDER BY total_points DESC) as rank
        FROM user_points
    )
    SELECT rank INTO user_rank
    FROM ranked_users
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(user_rank, 0);
END;
$$ LANGUAGE plpgsql;

-- Function to update user streak
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id VARCHAR(255), p_subject VARCHAR(50), p_grade VARCHAR(20))
RETURNS VOID AS $$
DECLARE
    last_activity_date DATE;
    current_date DATE := CURRENT_DATE;
    current_streak INTEGER;
BEGIN
    -- Get the last activity date for this user/subject/grade
    SELECT DATE(last_activity), streak_days INTO last_activity_date, current_streak
    FROM user_progress
    WHERE user_id = p_user_id AND subject = p_subject AND grade = p_grade;
    
    IF last_activity_date IS NULL THEN
        -- First time activity
        current_streak := 1;
    ELSIF last_activity_date = current_date THEN
        -- Same day activity, don't change streak
        RETURN;
    ELSIF last_activity_date = current_date - INTERVAL '1 day' THEN
        -- Consecutive day, increment streak
        current_streak := current_streak + 1;
    ELSE
        -- Streak broken, reset to 1
        current_streak := 1;
    END IF;
    
    -- Update the streak
    UPDATE user_progress
    SET streak_days = current_streak,
        last_activity = NOW(),
        updated_at = NOW()
    WHERE user_id = p_user_id AND subject = p_subject AND grade = p_grade;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE user_preferences IS 'Stores user-specific learning preferences for personalized content delivery';
COMMENT ON COLUMN user_preferences.preferred_difficulty IS 'Difficulty level from 1 (easiest) to 5 (hardest)';
COMMENT ON COLUMN user_preferences.learning_style IS 'Learning style preference: visual, auditory, kinesthetic, or reading';
COMMENT ON COLUMN user_preferences.daily_goal_minutes IS 'Daily learning goal in minutes';

COMMENT ON TABLE user_achievements IS 'Stores gamification badges and achievements earned by users';
COMMENT ON COLUMN user_achievements.badge_icon IS 'Emoji or icon representing the achievement';
COMMENT ON COLUMN user_achievements.points IS 'Points awarded for earning this achievement';
COMMENT ON COLUMN user_achievements.category IS 'Achievement category: milestone, streak, performance, social, feature, exploration, habit, intensity';

COMMENT ON TABLE shared_content IS 'Stores user-generated content shared with the community';
COMMENT ON COLUMN shared_content.content_type IS 'Type of shared content: video, image, text, interactive';
COMMENT ON COLUMN shared_content.views IS 'Number of times this content has been viewed';
COMMENT ON COLUMN shared_content.likes IS 'Number of likes received on this content';

COMMENT ON TABLE tutor_scripts IS 'Stores AI tutor scripts with different personality tones and voice settings';
COMMENT ON COLUMN tutor_scripts.tone IS 'AI tutor personality tone: friendly, professional, enthusiastic, patient, playful';
COMMENT ON COLUMN tutor_scripts.voice_settings IS 'JSON object containing voice generation settings for ElevenLabs/Tavus';
COMMENT ON COLUMN tutor_scripts.duration_minutes IS 'Estimated duration of the script in minutes';

COMMENT ON TABLE user_progress IS 'Enhanced user progress tracking with streak information for gamification';
COMMENT ON COLUMN user_progress.streak_days IS 'Number of consecutive days the user has been active in this subject/grade';

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================
-- Note: In production, set up appropriate RLS policies and user permissions

-- Example RLS policies (uncomment and modify for production):
-- ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tutor_scripts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Users can manage their own preferences" ON user_preferences
--   FOR ALL USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can view their own achievements" ON user_achievements
--   FOR SELECT USING (auth.uid()::text = user_id);

-- CREATE POLICY "Anyone can view shared content" ON shared_content
--   FOR SELECT USING (true);

-- CREATE POLICY "Users can share their own content" ON shared_content
--   FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- =====================================================
-- MAINTENANCE NOTES
-- =====================================================
-- 1. Monitor user_achievements table growth and consider archiving old achievements
-- 2. Implement cleanup for expired audio_cache entries
-- 3. Add analytics queries for popular shared content
-- 4. Monitor tutor_scripts usage patterns for optimization
-- 5. Consider partitioning large tables by date for better performance
-- 6. Regularly backup user preferences and achievements data
-- 7. Monitor streak calculations for accuracy and performance

-- End of EduSphere AI Enhanced Schema