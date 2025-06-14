-- EduSphere AI Enhanced Supabase Database Schema
-- Creates tables for advanced features: AR, crowdsourcing, voice quizzes, auth, real-time, and storytelling
-- World's Largest Hackathon Project - EduSphere AI

-- =====================================================
-- AR PROBLEMS TABLE
-- =====================================================
-- Stores augmented reality problems for WebXR-based learning

CREATE TABLE IF NOT EXISTS ar_problems (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    object_type VARCHAR(50) NOT NULL,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    hint TEXT,
    explanation TEXT,
    difficulty VARCHAR(20) DEFAULT 'easy',
    grade_level VARCHAR(20) DEFAULT 'kindergarten',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for AR problems
CREATE INDEX IF NOT EXISTS idx_ar_problems_object_type ON ar_problems(object_type);
CREATE INDEX IF NOT EXISTS idx_ar_problems_difficulty ON ar_problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_ar_problems_grade ON ar_problems(grade_level);

-- =====================================================
-- CROWDSOURCE SUBMISSIONS TABLE
-- =====================================================
-- Stores community-generated educational content

CREATE TABLE IF NOT EXISTS crowdsource_submissions (
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
);

-- Indexes for crowdsource submissions
CREATE INDEX IF NOT EXISTS idx_crowdsource_user_id ON crowdsource_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_crowdsource_content_type ON crowdsource_submissions(content_type);
CREATE INDEX IF NOT EXISTS idx_crowdsource_status ON crowdsource_submissions(status);
CREATE INDEX IF NOT EXISTS idx_crowdsource_created_at ON crowdsource_submissions(created_at DESC);

-- User votes tracking for crowdsourced content
CREATE TABLE IF NOT EXISTS user_votes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    submission_id UUID NOT NULL,
    vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, submission_id)
);

-- =====================================================
-- VOICE QUIZZES TABLE
-- =====================================================
-- Stores voice-based quizzes for speech recognition learning

CREATE TABLE IF NOT EXISTS voice_quizzes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    difficulty VARCHAR(20) DEFAULT 'medium',
    grade_level VARCHAR(20) DEFAULT 'grade1-6',
    subject VARCHAR(50) DEFAULT 'language',
    audio_url TEXT,
    alternative_answers TEXT[],
    hint TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255)
);

-- Indexes for voice quizzes
CREATE INDEX IF NOT EXISTS idx_voice_quizzes_language ON voice_quizzes(language);
CREATE INDEX IF NOT EXISTS idx_voice_quizzes_grade ON voice_quizzes(grade_level);
CREATE INDEX IF NOT EXISTS idx_voice_quizzes_subject ON voice_quizzes(subject);

-- Voice quiz attempts tracking
CREATE TABLE IF NOT EXISTS voice_quiz_attempts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    quiz_id UUID NOT NULL,
    user_answer TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    confidence_score DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- USERS TABLE
-- =====================================================
-- Stores user information for authentication and profiles

CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clerk_id VARCHAR(255),
    email VARCHAR(255) NOT NULL UNIQUE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    display_name VARCHAR(100),
    avatar_url TEXT,
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_clerk_id ON users(clerk_id);

-- =====================================================
-- NARRATIVES TABLE
-- =====================================================
-- Stores interactive storytelling content

CREATE TABLE IF NOT EXISTS narratives (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    story_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    grade VARCHAR(20) NOT NULL,
    language VARCHAR(10) DEFAULT 'en',
    theme VARCHAR(50),
    chapters JSONB,
    audio_urls JSONB,
    created_by VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for narratives
CREATE INDEX IF NOT EXISTS idx_narratives_story_id ON narratives(story_id);
CREATE INDEX IF NOT EXISTS idx_narratives_grade ON narratives(grade);
CREATE INDEX IF NOT EXISTS idx_narratives_language ON narratives(language);

-- User story progress tracking
CREATE TABLE IF NOT EXISTS user_story_progress (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    story_id VARCHAR(100) NOT NULL,
    current_chapter INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    last_read_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, story_id)
);

-- =====================================================
-- REAL-TIME COLLABORATION TABLES
-- =====================================================
-- Supports live coding and collaborative learning

CREATE TABLE IF NOT EXISTS live_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    code TEXT,
    content JSONB,
    created_by VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    max_participants INTEGER DEFAULT 10,
    password VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE TABLE IF NOT EXISTS session_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'participant',
    is_active BOOLEAN DEFAULT TRUE,
    joined_at TIMESTAMP DEFAULT NOW(),
    last_active_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(100),
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for real-time collaboration
CREATE INDEX IF NOT EXISTS idx_live_sessions_type ON live_sessions(session_type);
CREATE INDEX IF NOT EXISTS idx_live_sessions_created_by ON live_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_session_participants_session ON session_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(session_id);

-- =====================================================
-- SAMPLE DATA INSERTION
-- =====================================================
-- Insert sample data for testing and demonstration

-- Sample AR problems
INSERT INTO ar_problems (object_type, question, answer, hint, explanation, difficulty, grade_level) VALUES
('cube', 'How many faces does this cube have?', '6', 'Count each flat surface of the cube', 'A cube has 6 faces: top, bottom, front, back, left, and right.', 'easy', 'kindergarten'),
('cube', 'How many corners (vertices) does this cube have?', '8', 'Count where the edges meet', 'A cube has 8 vertices where three edges meet at each corner.', 'easy', 'kindergarten'),
('cube', 'How many edges does this cube have?', '12', 'Count the lines where faces meet', 'A cube has 12 edges where two faces meet.', 'easy', 'kindergarten'),
('sphere', 'How many faces does this sphere have?', '1', 'A sphere is one continuous curved surface', 'A sphere has one continuous curved face with no edges or vertices.', 'easy', 'kindergarten'),
('pyramid', 'How many faces does this triangular pyramid have?', '4', 'Count the triangular base and the three triangular sides', 'A triangular pyramid has 4 triangular faces: 1 base + 3 sides.', 'easy', 'kindergarten')
ON CONFLICT DO NOTHING;

-- Sample voice quizzes
INSERT INTO voice_quizzes (question, answer, language, difficulty, grade_level, subject, alternative_answers, hint) VALUES
('What color is the sky on a clear day?', 'blue', 'en', 'easy', 'kindergarten', 'science', ARRAY['sky blue', 'light blue']::TEXT[], 'Look up on a sunny day'),
('How many days are in a week?', 'seven', 'en', 'easy', 'kindergarten', 'math', ARRAY['7']::TEXT[], 'Monday through Sunday'),
('What is the capital of France?', 'Paris', 'en', 'medium', 'grade1-6', 'geography', ARRAY[]::TEXT[], 'It has a famous tower'),
('¿De qué color es el cielo en un día despejado?', 'azul', 'es', 'easy', 'kindergarten', 'science', ARRAY['celeste']::TEXT[], 'Mira hacia arriba en un día soleado'),
('¿Cuántos días hay en una semana?', 'siete', 'es', 'easy', 'kindergarten', 'math', ARRAY['7']::TEXT[], 'De lunes a domingo'),
('晴天时天空是什么颜色？', '蓝色', 'zh', 'easy', 'kindergarten', 'science', ARRAY['蓝']::TEXT[], '在晴朗的日子抬头看')
ON CONFLICT DO NOTHING;

-- Sample narratives
INSERT INTO narratives (story_id, title, content, grade, language, theme, chapters) VALUES
('magical_forest', 'The Magical Forest', 'Once upon a time, in a magical forest filled with talking animals and glowing flowers, there lived a brave young explorer named Alex. Every day brought new adventures and wonderful discoveries...', 'kindergarten', 'en', 'adventure', 
  '[
    {
      "title": "The Beginning",
      "content": "Alex stepped into the magical forest for the first time, eyes wide with wonder. The trees were taller than any buildings, with leaves that sparkled like jewels. \"Hello?\" Alex called out, and to their surprise, the forest answered back with gentle whispers."
    },
    {
      "title": "Meeting Friends",
      "content": "A friendly rabbit hopped up to Alex and said, \"Welcome to our magical home!\" Soon, a wise old owl, a playful squirrel, and a shy deer joined them. \"We\'ve been waiting for a human friend,\" they explained. Alex couldn\'t believe their ears - talking animals!"
    },
    {
      "title": "The Adventure",
      "content": "Together, Alex and the forest friends discovered a hidden treasure - not gold or jewels, but a crystal clear pond that showed the future. In its waters, Alex saw themselves growing up, always returning to visit their forest friends. It was the most precious treasure of all - friendship that would last forever."
    }
  ]'::jsonb
),
('space_journey', 'Journey to the Stars', 'Captain Luna and her crew embarked on an incredible journey through space, discovering new planets and making friends with alien civilizations...', 'grade1-6', 'en', 'space', 
  '[
    {
      "title": "Blast Off",
      "content": "The spaceship engines roared to life as Captain Luna pressed the launch button. \"Three, two, one... blast off!\" she called out. The crew felt the powerful push as their ship, the Starseeker, shot up through the clouds and into the darkness of space. Earth became smaller and smaller below them, until it was just a beautiful blue marble."
    },
    {
      "title": "New Worlds",
      "content": "The Starseeker visited many planets on its journey. On the crystal planet, everything was made of shimmering gems. On the cloud planet, the inhabitants floated on puffy platforms. The water planet was home to intelligent dolphin-like creatures who communicated through musical songs. Each world taught Captain Luna and her crew something new about the universe."
    },
    {
      "title": "Coming Home",
      "content": "After months of exploration, it was time to return to Earth. The crew was excited to share their discoveries with everyone back home. As they approached Earth, Captain Luna gathered everyone on the bridge. \"We\'ve seen amazing things,\" she said, \"but the most precious planet in the universe is still our own.\" They all agreed as the beautiful blue Earth grew larger in their viewscreen."
    }
  ]'::jsonb
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- UTILITY FUNCTIONS
-- =====================================================

-- Function to create hash for text content
CREATE OR REPLACE FUNCTION create_text_hash(p_text TEXT)
RETURNS VARCHAR(64) AS $$  
BEGIN
    RETURN encode(sha256(p_text::bytea), 'hex');
END;
  $$ LANGUAGE plpgsql;

-- Function to check if user has completed a voice quiz
CREATE OR REPLACE FUNCTION has_completed_voice_quiz(p_user_id VARCHAR(255), p_quiz_id UUID)
RETURNS BOOLEAN AS $$  
DECLARE
    has_completed BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM voice_quiz_attempts
        WHERE user_id = p_user_id AND quiz_id = p_quiz_id AND is_correct = TRUE
    ) INTO has_completed;
    
    RETURN has_completed;
END;
  $$ LANGUAGE plpgsql;

-- Function to get user's AR progress summary
CREATE OR REPLACE FUNCTION get_ar_progress_summary(p_user_id VARCHAR(255))
RETURNS TABLE(
    total_attempts INTEGER,
    correct_attempts INTEGER,
    accuracy DECIMAL(5,2),
    object_types TEXT[]
) AS $$  
BEGIN
    RETURN QUERY
    WITH attempts AS (
        SELECT 
            COUNT(*) AS total,
            COUNT(*) FILTER (WHERE is_correct) AS correct,
            ARRAY_AGG(DISTINCT ar.object_type) AS objects
        FROM ar_attempts a
        JOIN ar_problems ar ON a.problem_id = ar.id
        WHERE a.user_id = p_user_id
    )
    SELECT 
        total,
        correct,
        CASE WHEN total > 0 THEN (correct::DECIMAL / total) * 100 ELSE 0 END,
        objects
    FROM attempts;
END;
  $$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS AND DOCUMENTATION
-- =====================================================

COMMENT ON TABLE ar_problems IS 'Stores augmented reality problems for WebXR-based learning';
COMMENT ON TABLE crowdsource_submissions IS 'Stores community-generated educational content';
COMMENT ON TABLE voice_quizzes IS 'Stores voice-based quizzes for speech recognition learning';
COMMENT ON TABLE users IS 'Stores user information for authentication and profiles';
COMMENT ON TABLE narratives IS 'Stores interactive storytelling content';
COMMENT ON TABLE live_sessions IS 'Supports real-time collaborative coding and learning';

-- =====================================================
-- GRANTS AND PERMISSIONS
-- =====================================================
-- Note: In production, set up appropriate RLS policies and user permissions

-- Example RLS policies (uncomment and modify for production):
-- ALTER TABLE ar_problems ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE crowdsource_submissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE voice_quizzes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE narratives ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY "Anyone can view approved crowdsource submissions" ON crowdsource_submissions
--   FOR SELECT USING (status = 'approved');

-- CREATE POLICY "Users can view their own submissions" ON crowdsource_submissions
--   FOR SELECT USING (auth.uid()::text = user_id);

-- CREATE POLICY "Users can create submissions" ON crowdsource_submissions
--   FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- =====================================================
-- MAINTENANCE NOTES
-- =====================================================
-- 1. Set up a scheduled job to clean up expired live_sessions
-- 2. Monitor crowdsource_submissions for moderation needs
-- 3. Regularly backup user data and progress information
-- 4. Consider partitioning large tables by date for better performance
-- 5. Implement analytics queries for usage patterns and optimization

-- End of EduSphere AI Enhanced Schema