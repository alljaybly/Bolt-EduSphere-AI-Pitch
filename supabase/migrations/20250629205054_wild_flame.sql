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

-- Grant SELECT permissions on voice_quiz_attempts
GRANT SELECT ON voice_quiz_attempts TO anon;
GRANT SELECT ON voice_quiz_attempts TO authenticated;

-- Grant SELECT permissions on user_story_progress
GRANT SELECT ON user_story_progress TO anon;
GRANT SELECT ON user_story_progress TO authenticated;

-- Grant SELECT permissions on live_sessions
GRANT SELECT ON live_sessions TO anon;
GRANT SELECT ON live_sessions TO authenticated;

-- Grant SELECT permissions on session_participants
GRANT SELECT ON session_participants TO anon;
GRANT SELECT ON session_participants TO authenticated;

-- Grant SELECT permissions on chat_messages
GRANT SELECT ON chat_messages TO anon;
GRANT SELECT ON chat_messages TO authenticated;

-- Grant SELECT permissions on users
GRANT SELECT ON users TO anon;
GRANT SELECT ON users TO authenticated;

-- Grant INSERT permissions for user data creation
GRANT INSERT ON user_achievements TO authenticated;
GRANT INSERT ON user_progress TO authenticated;
GRANT INSERT ON user_preferences TO authenticated;
GRANT INSERT ON shared_content TO authenticated;
GRANT INSERT ON voice_quiz_attempts TO authenticated;
GRANT INSERT ON user_story_progress TO authenticated;
GRANT INSERT ON live_sessions TO authenticated;
GRANT INSERT ON session_participants TO authenticated;
GRANT INSERT ON chat_messages TO authenticated;
GRANT INSERT ON users TO authenticated;

-- Grant UPDATE permissions for user data modification
GRANT UPDATE ON user_achievements TO authenticated;
GRANT UPDATE ON user_progress TO authenticated;
GRANT UPDATE ON user_preferences TO authenticated;
GRANT UPDATE ON shared_content TO authenticated;
GRANT UPDATE ON user_story_progress TO authenticated;
GRANT UPDATE ON live_sessions TO authenticated;
GRANT UPDATE ON session_participants TO authenticated;
GRANT UPDATE ON chat_messages TO authenticated;
GRANT UPDATE ON users TO authenticated;

-- Grant DELETE permissions for user data removal
GRANT DELETE ON user_achievements TO authenticated;
GRANT DELETE ON user_progress TO authenticated;
GRANT DELETE ON user_preferences TO authenticated;
GRANT DELETE ON shared_content TO authenticated;
GRANT DELETE ON user_story_progress TO authenticated;
GRANT DELETE ON live_sessions TO authenticated;
GRANT DELETE ON session_participants TO authenticated;
GRANT DELETE ON chat_messages TO authenticated;

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
-- DROP EXISTING POLICIES TO AVOID CONFLICTS
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "delete_own_preferences" ON user_preferences;
DROP POLICY IF EXISTS "insert_own_preferences" ON user_preferences;
DROP POLICY IF EXISTS "select_own_preferences" ON user_preferences;
DROP POLICY IF EXISTS "update_own_preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;

DROP POLICY IF EXISTS "delete_own_progress" ON user_progress;
DROP POLICY IF EXISTS "insert_own_progress" ON user_progress;
DROP POLICY IF EXISTS "select_own_progress" ON user_progress;
DROP POLICY IF EXISTS "update_own_progress" ON user_progress;
DROP POLICY IF EXISTS "Users can delete own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can insert own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON user_progress;
DROP POLICY IF EXISTS "Users can update own progress" ON user_progress;

DROP POLICY IF EXISTS "insert_own_achievements" ON user_achievements;
DROP POLICY IF EXISTS "select_own_achievements" ON user_achievements;
DROP POLICY IF EXISTS "update_own_achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can update own achievements" ON user_achievements;
DROP POLICY IF EXISTS "Users can view own achievements" ON user_achievements;
DROP POLICY IF EXISTS "System can insert achievements" ON user_achievements;

DROP POLICY IF EXISTS "insert_own_quiz_attempts" ON voice_quiz_attempts;
DROP POLICY IF EXISTS "select_own_quiz_attempts" ON voice_quiz_attempts;
DROP POLICY IF EXISTS "Users can insert own quiz attempts" ON voice_quiz_attempts;
DROP POLICY IF EXISTS "Users can view own quiz attempts" ON voice_quiz_attempts;

DROP POLICY IF EXISTS "insert_own_story_progress" ON user_story_progress;
DROP POLICY IF EXISTS "select_own_story_progress" ON user_story_progress;
DROP POLICY IF EXISTS "update_own_story_progress" ON user_story_progress;
DROP POLICY IF EXISTS "Users can insert own story progress" ON user_story_progress;
DROP POLICY IF EXISTS "Users can view own story progress" ON user_story_progress;
DROP POLICY IF EXISTS "Users can update own story progress" ON user_story_progress;

DROP POLICY IF EXISTS "delete_own_participants" ON session_participants;
DROP POLICY IF EXISTS "insert_own_participants" ON session_participants;
DROP POLICY IF EXISTS "select_own_participants" ON session_participants;
DROP POLICY IF EXISTS "update_own_participants" ON session_participants;
DROP POLICY IF EXISTS "Users can join sessions" ON session_participants;
DROP POLICY IF EXISTS "Users can leave sessions" ON session_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON session_participants;
DROP POLICY IF EXISTS "Users can view session participants" ON session_participants;

DROP POLICY IF EXISTS "delete_own_messages" ON chat_messages;
DROP POLICY IF EXISTS "insert_own_messages" ON chat_messages;
DROP POLICY IF EXISTS "select_own_messages" ON chat_messages;
DROP POLICY IF EXISTS "update_own_messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can send messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view session messages" ON chat_messages;

DROP POLICY IF EXISTS "delete_own_sessions" ON live_sessions;
DROP POLICY IF EXISTS "insert_sessions" ON live_sessions;
DROP POLICY IF EXISTS "select_accessible_sessions" ON live_sessions;
DROP POLICY IF EXISTS "update_own_sessions" ON live_sessions;
DROP POLICY IF EXISTS "Users can create sessions" ON live_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON live_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON live_sessions;
DROP POLICY IF EXISTS "Users can view accessible sessions" ON live_sessions;

DROP POLICY IF EXISTS "delete_own_shared_content" ON shared_content;
DROP POLICY IF EXISTS "insert_shared_content" ON shared_content;
DROP POLICY IF EXISTS "select_shared_content" ON shared_content;
DROP POLICY IF EXISTS "update_own_shared_content" ON shared_content;
DROP POLICY IF EXISTS "Anyone can view shared content" ON shared_content;
DROP POLICY IF EXISTS "Users can create shared content" ON shared_content;
DROP POLICY IF EXISTS "Users can delete own shared content" ON shared_content;
DROP POLICY IF EXISTS "Users can update own shared content" ON shared_content;

DROP POLICY IF EXISTS "select_tutor_scripts" ON tutor_scripts;
DROP POLICY IF EXISTS "Anyone can view tutor scripts" ON tutor_scripts;

DROP POLICY IF EXISTS "insert_quizzes" ON voice_quizzes;
DROP POLICY IF EXISTS "select_voice_quizzes" ON voice_quizzes;
DROP POLICY IF EXISTS "Anyone can view voice quizzes" ON voice_quizzes;
DROP POLICY IF EXISTS "Authenticated users can create quizzes" ON voice_quizzes;

DROP POLICY IF EXISTS "select_ar_problems" ON ar_problems;
DROP POLICY IF EXISTS "Anyone can view AR problems" ON ar_problems;

DROP POLICY IF EXISTS "insert_narratives" ON narratives;
DROP POLICY IF EXISTS "select_narratives" ON narratives;
DROP POLICY IF EXISTS "Anyone can view narratives" ON narratives;
DROP POLICY IF EXISTS "Authenticated users can create narratives" ON narratives;

DROP POLICY IF EXISTS "select_own_user_data" ON users;
DROP POLICY IF EXISTS "service_role_access_users" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "Allow service role access to users" ON users;

-- =====================================================
-- CREATE NEW RLS POLICIES WITH PROPER AUTH FUNCTIONS
-- =====================================================

-- User Preferences Policies
CREATE POLICY "Users can delete own preferences" ON user_preferences
    FOR DELETE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own preferences" ON user_preferences
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own preferences" ON user_preferences
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own preferences" ON user_preferences
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text) 
    WITH CHECK ((user_id)::text = (auth.uid())::text);

-- User Progress Policies
CREATE POLICY "Users can delete own progress" ON user_progress
    FOR DELETE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own progress" ON user_progress
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own progress" ON user_progress
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own progress" ON user_progress
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text) 
    WITH CHECK ((user_id)::text = (auth.uid())::text);

-- User Achievements Policies
CREATE POLICY "Users can insert own achievements" ON user_achievements
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own achievements" ON user_achievements
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own achievements" ON user_achievements
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

-- Voice Quiz Attempts Policies
CREATE POLICY "Users can insert own quiz attempts" ON voice_quiz_attempts
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own quiz attempts" ON voice_quiz_attempts
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

-- User Story Progress Policies
CREATE POLICY "Users can insert own story progress" ON user_story_progress
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own story progress" ON user_story_progress
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own story progress" ON user_story_progress
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

-- Session Participants Policies
CREATE POLICY "Users can delete own participants" ON session_participants
    FOR DELETE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own participants" ON session_participants
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own participants" ON session_participants
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own participants" ON session_participants
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text) 
    WITH CHECK ((user_id)::text = (auth.uid())::text);

-- Chat Messages Policies
CREATE POLICY "Users can delete own messages" ON chat_messages
    FOR DELETE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can insert own messages" ON chat_messages
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can view own messages" ON chat_messages
    FOR SELECT TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can update own messages" ON chat_messages
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text) 
    WITH CHECK ((user_id)::text = (auth.uid())::text);

-- Live Sessions Policies
CREATE POLICY "Users can delete own sessions" ON live_sessions
    FOR DELETE TO authenticated
    USING ((created_by)::text = (auth.uid())::text);

CREATE POLICY "Users can create sessions" ON live_sessions
    FOR INSERT TO authenticated
    WITH CHECK ((created_by)::text = (auth.uid())::text);

CREATE POLICY "Users can view accessible sessions" ON live_sessions
    FOR SELECT TO authenticated
    USING (((created_by)::text = (auth.uid())::text) OR (id IN ( 
        SELECT session_participants.session_id
        FROM session_participants
        WHERE ((session_participants.user_id)::text = (auth.uid())::text)
    )));

CREATE POLICY "Users can update own sessions" ON live_sessions
    FOR UPDATE TO authenticated
    USING ((created_by)::text = (auth.uid())::text);

-- Shared Content Policies
CREATE POLICY "Users can delete own shared content" ON shared_content
    FOR DELETE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Users can create shared content" ON shared_content
    FOR INSERT TO authenticated
    WITH CHECK ((user_id)::text = (auth.uid())::text);

CREATE POLICY "Anyone can view shared content" ON shared_content
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "Users can update own shared content" ON shared_content
    FOR UPDATE TO authenticated
    USING ((user_id)::text = (auth.uid())::text);

-- Tutor Scripts Policies
CREATE POLICY "Anyone can view tutor scripts" ON tutor_scripts
    FOR SELECT TO anon, authenticated
    USING (true);

-- Voice Quizzes Policies
CREATE POLICY "Authenticated users can create quizzes" ON voice_quizzes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view voice quizzes" ON voice_quizzes
    FOR SELECT TO anon, authenticated
    USING (true);

-- AR Problems Policies
CREATE POLICY "Anyone can view AR problems" ON ar_problems
    FOR SELECT TO anon, authenticated
    USING (true);

-- Narratives Policies
CREATE POLICY "Authenticated users can create narratives" ON narratives
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Anyone can view narratives" ON narratives
    FOR SELECT TO anon, authenticated
    USING (true);

-- Users Policies
CREATE POLICY "Users can view own data" ON users
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Allow service role access to users" ON users
    FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- =====================================================
-- GRANT SEQUENCE USAGE PERMISSIONS
-- =====================================================

-- Grant usage on sequences to anon and authenticated roles
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant select on sequences for nextval operations
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- GRANT FUNCTION EXECUTION PERMISSIONS
-- =====================================================

-- Grant execute permissions on utility functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON SCHEMA public IS 'EduSphere AI public schema with proper permissions for anonymous and authenticated users';

-- End of permissions migration