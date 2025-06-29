/*
  # Fix Supabase permissions for anonymous users

  1. Security Updates
    - Grant SELECT permissions to anonymous role for user_achievements table
    - Grant SELECT permissions to anonymous role for user_progress table
    - Grant SELECT permissions to anonymous role for user_preferences table
    - This allows the frontend to fetch user statistics for unauthenticated users

  2. Notes
    - These permissions are necessary for the PlayLearnPage to function properly
    - Anonymous users can only read data, not modify it
    - This resolves the "permission denied for schema public" errors
*/

-- Grant SELECT permissions to anonymous role for user statistics tables
GRANT SELECT ON user_achievements TO anon;
GRANT SELECT ON user_progress TO anon;
GRANT SELECT ON user_preferences TO anon;

-- Also grant to authenticated users to ensure they have access
GRANT SELECT ON user_achievements TO authenticated;
GRANT SELECT ON user_progress TO authenticated;
GRANT SELECT ON user_preferences TO authenticated;

-- Grant usage on sequences if they exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'user_achievements_id_seq') THEN
        GRANT USAGE ON SEQUENCE user_achievements_id_seq TO anon;
        GRANT USAGE ON SEQUENCE user_achievements_id_seq TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'user_progress_id_seq') THEN
        GRANT USAGE ON SEQUENCE user_progress_id_seq TO anon;
        GRANT USAGE ON SEQUENCE user_progress_id_seq TO authenticated;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.sequences WHERE sequence_name = 'user_preferences_id_seq') THEN
        GRANT USAGE ON SEQUENCE user_preferences_id_seq TO anon;
        GRANT USAGE ON SEQUENCE user_preferences_id_seq TO authenticated;
    END IF;
END $$;