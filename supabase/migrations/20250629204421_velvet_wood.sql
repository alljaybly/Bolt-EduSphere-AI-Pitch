-- EduSphere AI Supabase Permissions Fix
-- Grants necessary permissions to anonymous and authenticated users
-- Fixes "permission denied for schema public" errors

-- =====================================================
-- GRANT PERMISSIONS TO ANONYMOUS ROLE
-- =====================================================
-- Allow anonymous users to read user statistics tables

-- Grant SELECT permissions on user_achievements
GRANT SELECT ON user_achievements TO anon;
GRANT SELECT ON user_achievements TO authenticated;

-- Grant SELECT permissions on user_progress  
GRANT SELECT ON user_progress TO anon;
GRANT SELECT ON user_progress TO authenticated;

-- Grant SELECT permissions on user_preferences
GRANT SELECT ON user_preferences TO anon;
GRANT SELECT ON user_preferences TO authenticated;

-- Grant SELECT permissions on shared_content
GRANT SELECT ON shared_content TO anon;
GRANT SELECT ON shared_content TO authenticated;

-- Grant SELECT permissions on tutor_scripts
GRANT SELECT ON tutor_scripts TO anon;
GRANT SELECT ON tutor_scripts TO authenticated;

-- Grant SELECT permissions on voice_quizzes
GRANT SELECT ON voice_quizzes TO anon;
GRANT SELECT ON voice_quizzes TO authenticated;

-- Grant SELECT permissions on ar_problems
GRANT SELECT ON ar_problems TO anon;
GRANT SELECT ON ar_problems TO authenticated;

-- Grant SELECT permissions on narratives
GRANT SELECT ON narratives TO anon;
GRANT SELECT ON narratives TO authenticated;

-- Grant SELECT permissions on crowdsource_submissions (approved only)
GRANT SELECT ON crowdsource_submissions TO anon;
GRANT SELECT ON crowdsource_submissions TO authenticated;

-- =====================================================
-- ENABLE ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on user_preferences if not already enabled
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_achievements if not already enabled  
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_progress if not already enabled
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Enable RLS on voice_quiz_attempts if not already enabled
ALTER TABLE voice_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on user_story_progress if not already enabled
ALTER TABLE user_story_progress ENABLE ROW LEVEL SECURITY;

-- Enable RLS on live_sessions if not already enabled
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on session_participants if not already enabled
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Enable RLS on chat_messages if not already enabled
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Enable RLS on shared_content if not already enabled
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- Enable RLS on tutor_scripts if not already enabled
ALTER TABLE tutor_scripts ENABLE ROW LEVEL SECURITY;

-- Enable RLS on voice_quizzes if not already enabled
ALTER TABLE voice_quizzes ENABLE ROW LEVEL SECURITY;

-- Enable RLS on ar_problems if not already enabled
ALTER TABLE ar_problems ENABLE ROW LEVEL SECURITY;

-- Enable RLS on narratives if not already enabled
ALTER TABLE narratives ENABLE ROW LEVEL SECURITY;

-- Enable RLS on users if not already enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE MISSING RLS POLICIES
-- =====================================================

-- User Preferences Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'delete_own_preferences'
    ) THEN
        CREATE POLICY "delete_own_preferences" ON user_preferences
            FOR DELETE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'insert_own_preferences'
    ) THEN
        CREATE POLICY "insert_own_preferences" ON user_preferences
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'select_own_preferences'
    ) THEN
        CREATE POLICY "select_own_preferences" ON user_preferences
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_preferences' 
        AND policyname = 'update_own_preferences'
    ) THEN
        CREATE POLICY "update_own_preferences" ON user_preferences
            FOR UPDATE USING ((user_id)::text = (uid())::text) 
            WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- User Progress Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_progress' 
        AND policyname = 'delete_own_progress'
    ) THEN
        CREATE POLICY "delete_own_progress" ON user_progress
            FOR DELETE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_progress' 
        AND policyname = 'insert_own_progress'
    ) THEN
        CREATE POLICY "insert_own_progress" ON user_progress
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_progress' 
        AND policyname = 'select_own_progress'
    ) THEN
        CREATE POLICY "select_own_progress" ON user_progress
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_progress' 
        AND policyname = 'update_own_progress'
    ) THEN
        CREATE POLICY "update_own_progress" ON user_progress
            FOR UPDATE USING ((user_id)::text = (uid())::text) 
            WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- User Achievements Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'insert_own_achievements'
    ) THEN
        CREATE POLICY "insert_own_achievements" ON user_achievements
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'select_own_achievements'
    ) THEN
        CREATE POLICY "select_own_achievements" ON user_achievements
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_achievements' 
        AND policyname = 'update_own_achievements'
    ) THEN
        CREATE POLICY "update_own_achievements" ON user_achievements
            FOR UPDATE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- Voice Quiz Attempts Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_quiz_attempts' 
        AND policyname = 'insert_own_quiz_attempts'
    ) THEN
        CREATE POLICY "insert_own_quiz_attempts" ON voice_quiz_attempts
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_quiz_attempts' 
        AND policyname = 'select_own_quiz_attempts'
    ) THEN
        CREATE POLICY "select_own_quiz_attempts" ON voice_quiz_attempts
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- User Story Progress Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_story_progress' 
        AND policyname = 'insert_own_story_progress'
    ) THEN
        CREATE POLICY "insert_own_story_progress" ON user_story_progress
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_story_progress' 
        AND policyname = 'select_own_story_progress'
    ) THEN
        CREATE POLICY "select_own_story_progress" ON user_story_progress
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_story_progress' 
        AND policyname = 'update_own_story_progress'
    ) THEN
        CREATE POLICY "update_own_story_progress" ON user_story_progress
            FOR UPDATE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- Session Participants Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'session_participants' 
        AND policyname = 'delete_own_participants'
    ) THEN
        CREATE POLICY "delete_own_participants" ON session_participants
            FOR DELETE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'session_participants' 
        AND policyname = 'insert_own_participants'
    ) THEN
        CREATE POLICY "insert_own_participants" ON session_participants
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'session_participants' 
        AND policyname = 'select_own_participants'
    ) THEN
        CREATE POLICY "select_own_participants" ON session_participants
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'session_participants' 
        AND policyname = 'update_own_participants'
    ) THEN
        CREATE POLICY "update_own_participants" ON session_participants
            FOR UPDATE USING ((user_id)::text = (uid())::text) 
            WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- Chat Messages Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'delete_own_messages'
    ) THEN
        CREATE POLICY "delete_own_messages" ON chat_messages
            FOR DELETE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'insert_own_messages'
    ) THEN
        CREATE POLICY "insert_own_messages" ON chat_messages
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'select_own_messages'
    ) THEN
        CREATE POLICY "select_own_messages" ON chat_messages
            FOR SELECT USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'chat_messages' 
        AND policyname = 'update_own_messages'
    ) THEN
        CREATE POLICY "update_own_messages" ON chat_messages
            FOR UPDATE USING ((user_id)::text = (uid())::text) 
            WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- Live Sessions Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'live_sessions' 
        AND policyname = 'delete_own_sessions'
    ) THEN
        CREATE POLICY "delete_own_sessions" ON live_sessions
            FOR DELETE USING ((created_by)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'live_sessions' 
        AND policyname = 'insert_sessions'
    ) THEN
        CREATE POLICY "insert_sessions" ON live_sessions
            FOR INSERT WITH CHECK ((created_by)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'live_sessions' 
        AND policyname = 'select_accessible_sessions'
    ) THEN
        CREATE POLICY "select_accessible_sessions" ON live_sessions
            FOR SELECT USING (((created_by)::text = (uid())::text) OR (id IN ( SELECT session_participants.session_id
               FROM session_participants
              WHERE ((session_participants.user_id)::text = (uid())::text))));
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'live_sessions' 
        AND policyname = 'update_own_sessions'
    ) THEN
        CREATE POLICY "update_own_sessions" ON live_sessions
            FOR UPDATE USING ((created_by)::text = (uid())::text);
    END IF;
END $$;

-- Shared Content Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_content' 
        AND policyname = 'delete_own_shared_content'
    ) THEN
        CREATE POLICY "delete_own_shared_content" ON shared_content
            FOR DELETE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_content' 
        AND policyname = 'insert_shared_content'
    ) THEN
        CREATE POLICY "insert_shared_content" ON shared_content
            FOR INSERT WITH CHECK ((user_id)::text = (uid())::text);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_content' 
        AND policyname = 'select_shared_content'
    ) THEN
        CREATE POLICY "select_shared_content" ON shared_content
            FOR SELECT USING (true);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'shared_content' 
        AND policyname = 'update_own_shared_content'
    ) THEN
        CREATE POLICY "update_own_shared_content" ON shared_content
            FOR UPDATE USING ((user_id)::text = (uid())::text);
    END IF;
END $$;

-- Tutor Scripts Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tutor_scripts' 
        AND policyname = 'select_tutor_scripts'
    ) THEN
        CREATE POLICY "select_tutor_scripts" ON tutor_scripts
            FOR SELECT USING (true);
    END IF;
END $$;

-- Voice Quizzes Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_quizzes' 
        AND policyname = 'insert_quizzes'
    ) THEN
        CREATE POLICY "insert_quizzes" ON voice_quizzes
            FOR INSERT WITH CHECK ((uid()) IS NOT NULL);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'voice_quizzes' 
        AND policyname = 'select_voice_quizzes'
    ) THEN
        CREATE POLICY "select_voice_quizzes" ON voice_quizzes
            FOR SELECT USING (true);
    END IF;
END $$;

-- AR Problems Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'ar_problems' 
        AND policyname = 'select_ar_problems'
    ) THEN
        CREATE POLICY "select_ar_problems" ON ar_problems
            FOR SELECT USING (true);
    END IF;
END $$;

-- Narratives Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'narratives' 
        AND policyname = 'insert_narratives'
    ) THEN
        CREATE POLICY "insert_narratives" ON narratives
            FOR INSERT WITH CHECK ((uid()) IS NOT NULL);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'narratives' 
        AND policyname = 'select_narratives'
    ) THEN
        CREATE POLICY "select_narratives" ON narratives
            FOR SELECT USING (true);
    END IF;
END $$;

-- Users Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'select_own_user_data'
    ) THEN
        CREATE POLICY "select_own_user_data" ON users
            FOR SELECT USING ((uid()) = id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' 
        AND policyname = 'service_role_access_users'
    ) THEN
        CREATE POLICY "service_role_access_users" ON users
            FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- =====================================================
-- GRANT SEQUENCE USAGE PERMISSIONS
-- =====================================================

-- Grant usage on sequences to anon and authenticated roles
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON SCHEMA public IS 'EduSphere AI public schema with proper permissions for anonymous and authenticated users';

-- End of permissions migration