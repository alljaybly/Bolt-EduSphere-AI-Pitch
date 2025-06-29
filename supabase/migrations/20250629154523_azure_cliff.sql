-- Add RLS policies for user_progress, session_participants, user_preferences
-- Fixes "permission denied for schema public" errors
-- World's Largest Hackathon Project - EduSphere AI

-- =====================================================
-- RLS POLICIES FOR USER_PROGRESS TABLE
-- =====================================================

-- Enable RLS on user_progress table
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own progress
CREATE POLICY "Users can view own progress" ON user_progress
  FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Users can insert their own progress
CREATE POLICY "Users can insert own progress" ON user_progress
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own progress
CREATE POLICY "Users can update own progress" ON user_progress
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Policy: Users can delete their own progress
CREATE POLICY "Users can delete own progress" ON user_progress
  FOR DELETE USING (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR USER_PREFERENCES TABLE
-- =====================================================

-- Enable RLS on user_preferences table
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own preferences
CREATE POLICY "Users can view own preferences" ON user_preferences
  FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Policy: Users can delete their own preferences
CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE USING (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR SESSION_PARTICIPANTS TABLE
-- =====================================================

-- Enable RLS on session_participants table
ALTER TABLE session_participants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view participants in sessions they're part of
CREATE POLICY "Users can view session participants" ON session_participants
  FOR SELECT USING (
    user_id = auth.uid()::text OR 
    session_id IN (
      SELECT session_id FROM session_participants 
      WHERE user_id = auth.uid()::text
    )
  );

-- Policy: Users can join sessions (insert their own participation)
CREATE POLICY "Users can join sessions" ON session_participants
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own participation
CREATE POLICY "Users can update own participation" ON session_participants
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Policy: Users can leave sessions (delete their own participation)
CREATE POLICY "Users can leave sessions" ON session_participants
  FOR DELETE USING (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR CHAT_MESSAGES TABLE
-- =====================================================

-- Enable RLS on chat_messages table
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view messages in sessions they're part of
CREATE POLICY "Users can view session messages" ON chat_messages
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM session_participants 
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

-- Policy: Users can send messages to sessions they're part of
CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    user_id = auth.uid()::text AND
    session_id IN (
      SELECT session_id FROM session_participants 
      WHERE user_id = auth.uid()::text AND is_active = true
    )
  );

-- =====================================================
-- RLS POLICIES FOR LIVE_SESSIONS TABLE
-- =====================================================

-- Enable RLS on live_sessions table
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view sessions they created or are participating in
CREATE POLICY "Users can view accessible sessions" ON live_sessions
  FOR SELECT USING (
    created_by = auth.uid()::text OR
    id IN (
      SELECT session_id FROM session_participants 
      WHERE user_id = auth.uid()::text
    )
  );

-- Policy: Users can create their own sessions
CREATE POLICY "Users can create sessions" ON live_sessions
  FOR INSERT WITH CHECK (created_by = auth.uid()::text);

-- Policy: Users can update sessions they created
CREATE POLICY "Users can update own sessions" ON live_sessions
  FOR UPDATE USING (created_by = auth.uid()::text);

-- Policy: Users can delete sessions they created
CREATE POLICY "Users can delete own sessions" ON live_sessions
  FOR DELETE USING (created_by = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR USER_ACHIEVEMENTS TABLE
-- =====================================================

-- Enable RLS on user_achievements table
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own achievements
CREATE POLICY "Users can view own achievements" ON user_achievements
  FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: System can insert achievements for users (service role)
CREATE POLICY "System can insert achievements" ON user_achievements
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own achievements
CREATE POLICY "Users can update own achievements" ON user_achievements
  FOR UPDATE USING (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR VOICE_QUIZZES TABLE
-- =====================================================

-- Enable RLS on voice_quizzes table
ALTER TABLE voice_quizzes ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view voice quizzes (public content)
CREATE POLICY "Anyone can view voice quizzes" ON voice_quizzes
  FOR SELECT USING (true);

-- Policy: Authenticated users can create voice quizzes
CREATE POLICY "Authenticated users can create quizzes" ON voice_quizzes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES FOR VOICE_QUIZ_ATTEMPTS TABLE
-- =====================================================

-- Enable RLS on voice_quiz_attempts table
ALTER TABLE voice_quiz_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own quiz attempts
CREATE POLICY "Users can view own quiz attempts" ON voice_quiz_attempts
  FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Users can insert their own quiz attempts
CREATE POLICY "Users can insert own quiz attempts" ON voice_quiz_attempts
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR AR_PROBLEMS TABLE
-- =====================================================

-- Enable RLS on ar_problems table
ALTER TABLE ar_problems ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view AR problems (public content)
CREATE POLICY "Anyone can view AR problems" ON ar_problems
  FOR SELECT USING (true);

-- =====================================================
-- RLS POLICIES FOR NARRATIVES TABLE
-- =====================================================

-- Enable RLS on narratives table
ALTER TABLE narratives ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view narratives (public content)
CREATE POLICY "Anyone can view narratives" ON narratives
  FOR SELECT USING (true);

-- Policy: Authenticated users can create narratives
CREATE POLICY "Authenticated users can create narratives" ON narratives
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- RLS POLICIES FOR USER_STORY_PROGRESS TABLE
-- =====================================================

-- Enable RLS on user_story_progress table
ALTER TABLE user_story_progress ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own story progress
CREATE POLICY "Users can view own story progress" ON user_story_progress
  FOR SELECT USING (user_id = auth.uid()::text);

-- Policy: Users can insert their own story progress
CREATE POLICY "Users can insert own story progress" ON user_story_progress
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own story progress
CREATE POLICY "Users can update own story progress" ON user_story_progress
  FOR UPDATE USING (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR SHARED_CONTENT TABLE
-- =====================================================

-- Enable RLS on shared_content table
ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view shared content (public)
CREATE POLICY "Anyone can view shared content" ON shared_content
  FOR SELECT USING (true);

-- Policy: Users can create their own shared content
CREATE POLICY "Users can create shared content" ON shared_content
  FOR INSERT WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can update their own shared content
CREATE POLICY "Users can update own shared content" ON shared_content
  FOR UPDATE USING (user_id = auth.uid()::text);

-- Policy: Users can delete their own shared content
CREATE POLICY "Users can delete own shared content" ON shared_content
  FOR DELETE USING (user_id = auth.uid()::text);

-- =====================================================
-- RLS POLICIES FOR TUTOR_SCRIPTS TABLE
-- =====================================================

-- Enable RLS on tutor_scripts table
ALTER TABLE tutor_scripts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view tutor scripts (public content)
CREATE POLICY "Anyone can view tutor scripts" ON tutor_scripts
  FOR SELECT USING (true);

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Users can view own progress" ON user_progress IS 'Allows users to view only their own progress data';
COMMENT ON POLICY "Users can view own preferences" ON user_preferences IS 'Allows users to view only their own preferences';
COMMENT ON POLICY "Users can view session participants" ON session_participants IS 'Allows users to view participants in sessions they are part of';
COMMENT ON POLICY "Users can view session messages" ON chat_messages IS 'Allows users to view messages in sessions they participate in';
COMMENT ON POLICY "Users can view accessible sessions" ON live_sessions IS 'Allows users to view sessions they created or are participating in';

-- =====================================================
-- MAINTENANCE NOTES
-- =====================================================
-- 1. These policies ensure users can only access their own data
-- 2. Public content (quizzes, problems, narratives) is accessible to all authenticated users
-- 3. Session-based content requires active participation in the session
-- 4. Service role can still perform administrative operations
-- 5. Monitor policy performance and adjust as needed for scale

-- End of RLS policies migration