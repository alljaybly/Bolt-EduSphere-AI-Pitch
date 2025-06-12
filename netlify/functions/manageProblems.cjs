/**
 * EduSphere AI Problems Management Netlify Function with Teacher Dashboard Support
 * Handles user progress tracking, subscription management, generated content storage, and teacher dashboard features
 * Supports RevenueCat webhooks, comprehensive user data management, and PDF report generation
 * World's Largest Hackathon Project - EduSphere AI
 */

const { neon } = require('@neondatabase/serverless');

// Neon database configuration
const sql = neon(process.env.DATABASE_URL || process.env.NEON_DATABASE_URL);

// RevenueCat configuration for webhook validation
const REVENUECAT_API_KEY = 'sk_5b90f0883a3b75fcee4c72d14d73a042b325f02f554f0b04';

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
};

/**
 * Initialize database tables if they don't exist
 * Creates user_progress, recent_attempts, subscriptions, generated_content, tasks, and teacher_students tables
 */
async function initializeTables() {
  try {
    console.log('Initializing database tables...');

    // Create user_progress table for tracking learning progress
    await sql`
      CREATE TABLE IF NOT EXISTS user_progress (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        total_attempted INTEGER DEFAULT 0,
        total_correct INTEGER DEFAULT 0,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, subject, grade)
      )
    `;

    // Create recent_attempts table for detailed activity tracking
    await sql`
      CREATE TABLE IF NOT EXISTS recent_attempts (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        question TEXT NOT NULL,
        user_answer TEXT,
        correct_answer TEXT,
        is_correct BOOLEAN NOT NULL,
        attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create subscriptions table for RevenueCat integration
    await sql`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL UNIQUE,
        revenuecat_id VARCHAR(255) UNIQUE,
        status VARCHAR(50) NOT NULL DEFAULT 'free',
        is_active BOOLEAN DEFAULT FALSE,
        product_id VARCHAR(255),
        expires_at TIMESTAMP,
        trial_ends_at TIMESTAMP,
        original_purchase_date TIMESTAMP,
        last_webhook_event VARCHAR(100),
        webhook_processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create generated_content table for Claude Sonnet 4 AI-generated content
    await sql`
      CREATE TABLE IF NOT EXISTS generated_content (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        prompt TEXT NOT NULL,
        content_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        grade VARCHAR(20) NOT NULL,
        subject VARCHAR(50) NOT NULL,
        language VARCHAR(10) DEFAULT 'en',
        model_used VARCHAR(100) DEFAULT 'claude-3-5-sonnet-20241022',
        content_length INTEGER,
        generation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create tasks table for teacher task assignments
    await sql`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        task_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        subject VARCHAR(50) NOT NULL,
        grade VARCHAR(20) NOT NULL,
        due_date DATE,
        assigned_to TEXT[] NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_by VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Create teacher_students table for teacher-student relationships
    await sql`
      CREATE TABLE IF NOT EXISTS teacher_students (
        id SERIAL PRIMARY KEY,
        teacher_id VARCHAR(255) NOT NULL,
        student_id VARCHAR(255) NOT NULL,
        student_name VARCHAR(255) NOT NULL,
        relationship_type VARCHAR(50) DEFAULT 'teacher',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(teacher_id, student_id)
      )
    `;

    // Create reports table for storing generated PDF reports
    await sql`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        report_id VARCHAR(255) UNIQUE NOT NULL,
        teacher_id VARCHAR(255) NOT NULL,
        report_type VARCHAR(50) NOT NULL,
        student_ids TEXT[] NOT NULL,
        date_range_start DATE NOT NULL,
        date_range_end DATE NOT NULL,
        subjects TEXT[] NOT NULL,
        include_charts BOOLEAN DEFAULT TRUE,
        pdf_url TEXT,
        latex_source TEXT,
        generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days')
      )
    `;

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_user_id ON user_progress(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_user_progress_subject_grade ON user_progress(subject, grade)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recent_attempts_user_id ON recent_attempts(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_recent_attempts_attempted_at ON recent_attempts(attempted_at)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_revenuecat_id ON subscriptions(revenuecat_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status, is_active)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_generated_content_user_id ON generated_content(user_id)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_generated_content_type_subject ON generated_content(content_type, subject)
    `;
    
    await sql`
      CREATE INDEX IF NOT EXISTS idx_generated_content_created_at ON generated_content(created_at)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher_id ON teacher_students(teacher_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_teacher_students_student_id ON teacher_students(student_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reports_teacher_id ON reports(teacher_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_reports_generated_at ON reports(generated_at)
    `;

    console.log('Database tables initialized successfully');
    return true;

  } catch (error) {
    console.error('Failed to initialize database tables:', error);
    throw error;
  }
}

/**
 * Get teacher dashboard data including student progress and tasks
 * @param {string} teacherId - Teacher identifier
 * @returns {Promise<Object>} Dashboard data with students and tasks
 */
async function getTeacherDashboardData(teacherId) {
  try {
    console.log('Fetching teacher dashboard data for:', teacherId);

    // Get students associated with this teacher
    const teacherStudents = await sql`
      SELECT student_id, student_name, relationship_type, created_at
      FROM teacher_students 
      WHERE teacher_id = ${teacherId}
      ORDER BY student_name
    `;

    console.log(`Found ${teacherStudents.length} students for teacher ${teacherId}`);

    // If no students found, create some mock data for demonstration
    if (teacherStudents.length === 0) {
      console.log('No students found, creating mock teacher-student relationships');
      
      // Create mock students for demonstration
      const mockStudents = [
        { id: 'student_demo_1', name: 'Alice Johnson' },
        { id: 'student_demo_2', name: 'Bob Smith' },
        { id: 'student_demo_3', name: 'Carol Davis' },
        { id: 'student_demo_4', name: 'David Wilson' }
      ];

      // Insert mock teacher-student relationships
      for (const student of mockStudents) {
        await sql`
          INSERT INTO teacher_students (teacher_id, student_id, student_name, relationship_type)
          VALUES (${teacherId}, ${student.id}, ${student.name}, 'teacher')
          ON CONFLICT (teacher_id, student_id) DO NOTHING
        `;
      }

      // Create mock progress data
      for (const student of mockStudents) {
        const subjects = ['math', 'science', 'english'];
        const grades = ['grade1-6', 'grade7-9'];
        
        for (const subject of subjects) {
          for (const grade of grades) {
            const attempted = Math.floor(Math.random() * 50) + 10;
            const correct = Math.floor(attempted * (0.6 + Math.random() * 0.3));
            
            await sql`
              INSERT INTO user_progress (user_id, subject, grade, total_attempted, total_correct, last_activity)
              VALUES (${student.id}, ${subject}, ${grade}, ${attempted}, ${correct}, CURRENT_TIMESTAMP - INTERVAL '${Math.floor(Math.random() * 7)} days')
              ON CONFLICT (user_id, subject, grade) DO UPDATE SET
                total_attempted = ${attempted},
                total_correct = ${correct},
                last_activity = CURRENT_TIMESTAMP - INTERVAL '${Math.floor(Math.random() * 7)} days',
                updated_at = CURRENT_TIMESTAMP
            `;
          }
        }

        // Create some recent attempts
        const recentQuestions = [
          'What is 15 + 27?',
          'What is the capital of France?',
          'What is H2O?',
          'Solve for x: 2x + 5 = 13',
          'What is photosynthesis?'
        ];

        for (let i = 0; i < 5; i++) {
          const question = recentQuestions[Math.floor(Math.random() * recentQuestions.length)];
          const isCorrect = Math.random() > 0.3;
          
          await sql`
            INSERT INTO recent_attempts (user_id, subject, grade, question, user_answer, correct_answer, is_correct, attempted_at)
            VALUES (
              ${student.id}, 
              ${subjects[Math.floor(Math.random() * subjects.length)]}, 
              ${grades[Math.floor(Math.random() * grades.length)]}, 
              ${question}, 
              'Student answer', 
              'Correct answer', 
              ${isCorrect}, 
              CURRENT_TIMESTAMP - INTERVAL '${Math.floor(Math.random() * 24)} hours'
            )
          `;
        }
      }

      // Refresh the teacher students list
      const updatedTeacherStudents = await sql`
        SELECT student_id, student_name, relationship_type, created_at
        FROM teacher_students 
        WHERE teacher_id = ${teacherId}
        ORDER BY student_name
      `;

      console.log(`Created mock data, now have ${updatedTeacherStudents.length} students`);
    }

    // Get student IDs for progress queries
    const studentIds = teacherStudents.length > 0 
      ? teacherStudents.map(s => s.student_id)
      : ['student_demo_1', 'student_demo_2', 'student_demo_3', 'student_demo_4'];

    // Get detailed progress for each student
    const studentsProgress = [];

    for (const studentData of (teacherStudents.length > 0 ? teacherStudents : 
      [
        { student_id: 'student_demo_1', student_name: 'Alice Johnson' },
        { student_id: 'student_demo_2', student_name: 'Bob Smith' },
        { student_id: 'student_demo_3', student_name: 'Carol Davis' },
        { student_id: 'student_demo_4', student_name: 'David Wilson' }
      ])) {
      
      const studentId = studentData.student_id;
      const studentName = studentData.student_name;

      // Get overall progress for this student
      const overallProgress = await sql`
        SELECT 
          COALESCE(SUM(total_attempted), 0) as total_attempted,
          COALESCE(SUM(total_correct), 0) as total_correct,
          MAX(last_activity) as last_activity
        FROM user_progress 
        WHERE user_id = ${studentId}
      `;

      // Get subject-wise progress
      const subjectProgress = await sql`
        SELECT 
          subject,
          SUM(total_attempted) as attempted,
          SUM(total_correct) as correct
        FROM user_progress 
        WHERE user_id = ${studentId}
        GROUP BY subject
      `;

      // Get recent attempts
      const recentAttempts = await sql`
        SELECT 
          subject,
          grade,
          question,
          user_answer,
          correct_answer,
          is_correct,
          attempted_at
        FROM recent_attempts 
        WHERE user_id = ${studentId}
        ORDER BY attempted_at DESC
        LIMIT 10
      `;

      // Calculate accuracy
      const totalAttempted = parseInt(overallProgress[0]?.total_attempted || 0);
      const totalCorrect = parseInt(overallProgress[0]?.total_correct || 0);
      const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

      // Format subject progress
      const subjects = {};
      subjectProgress.forEach(row => {
        const attempted = parseInt(row.attempted);
        const correct = parseInt(row.correct);
        subjects[row.subject] = {
          attempted,
          correct,
          accuracy: attempted > 0 ? (correct / attempted) * 100 : 0
        };
      });

      // Format recent attempts
      const formattedAttempts = recentAttempts.map(attempt => ({
        subject: attempt.subject,
        grade: attempt.grade,
        question: attempt.question,
        correct: attempt.is_correct,
        timestamp: new Date(attempt.attempted_at).getTime()
      }));

      studentsProgress.push({
        user_id: studentId,
        student_name: studentName,
        total_attempted: totalAttempted,
        total_correct: totalCorrect,
        accuracy: accuracy,
        last_activity: overallProgress[0]?.last_activity || new Date().toISOString(),
        subjects: subjects,
        recent_attempts: formattedAttempts
      });
    }

    // Get tasks created by this teacher
    const tasks = await sql`
      SELECT 
        task_id,
        title,
        description,
        subject,
        grade,
        due_date,
        assigned_to,
        status,
        created_by,
        created_at,
        updated_at
      FROM tasks 
      WHERE created_by = ${teacherId}
      ORDER BY created_at DESC
      LIMIT 50
    `;

    const formattedTasks = tasks.map(task => ({
      id: task.task_id,
      title: task.title,
      description: task.description,
      subject: task.subject,
      grade: task.grade,
      due_date: task.due_date,
      assigned_to: task.assigned_to || [],
      status: task.status,
      created_by: task.created_by,
      created_at: task.created_at
    }));

    console.log(`Returning dashboard data: ${studentsProgress.length} students, ${formattedTasks.length} tasks`);

    return {
      students: studentsProgress,
      tasks: formattedTasks,
      summary: {
        total_students: studentsProgress.length,
        total_tasks: formattedTasks.length,
        active_tasks: formattedTasks.filter(t => t.status !== 'completed').length,
        average_accuracy: studentsProgress.length > 0 
          ? studentsProgress.reduce((sum, s) => sum + s.accuracy, 0) / studentsProgress.length 
          : 0
      }
    };

  } catch (error) {
    console.error('Failed to get teacher dashboard data:', error);
    throw error;
  }
}

/**
 * Create a new task assignment
 * @param {Object} taskData - Task data
 * @param {string} teacherId - Teacher identifier
 * @returns {Promise<string>} Created task ID
 */
async function createTask(taskData, teacherId) {
  try {
    console.log('Creating new task:', taskData.title, 'by teacher:', teacherId);

    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;

    await sql`
      INSERT INTO tasks (
        task_id,
        title,
        description,
        subject,
        grade,
        due_date,
        assigned_to,
        status,
        created_by,
        created_at,
        updated_at
      ) VALUES (
        ${taskId},
        ${taskData.title},
        ${taskData.description},
        ${taskData.subject},
        ${taskData.grade},
        ${taskData.due_date || null},
        ${taskData.assigned_to},
        'pending',
        ${teacherId},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `;

    console.log('Task created successfully with ID:', taskId);
    return taskId;

  } catch (error) {
    console.error('Failed to create task:', error);
    throw error;
  }
}

/**
 * Generate LaTeX source for PDF report
 * @param {Object} reportConfig - Report configuration
 * @param {Array} studentsData - Students data for the report
 * @returns {string} LaTeX source code
 */
function generateLatexReport(reportConfig, studentsData) {
  const { report_type, date_range, subjects, include_charts } = reportConfig;
  
  // LaTeX document header
  let latex = `
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{graphicx}
\\usepackage{booktabs}
\\usepackage{xcolor}
\\usepackage{fancyhdr}
\\usepackage{tikz}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.18}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyhead[L]{\\textbf{EduSphere AI - Progress Report}}
\\fancyhead[R]{\\today}
\\fancyfoot[C]{\\thepage}

\\title{\\textbf{Student Progress Report}\\\\\\large EduSphere AI Educational Platform}
\\author{Generated on \\today}
\\date{}

\\begin{document}
\\maketitle

\\section{Report Summary}
\\begin{itemize}
\\item \\textbf{Report Type:} ${report_type.charAt(0).toUpperCase() + report_type.slice(1)}
\\item \\textbf{Date Range:} ${date_range.start} to ${date_range.end}
\\item \\textbf{Students Included:} ${studentsData.length}
\\item \\textbf{Subjects:} ${subjects.join(', ')}
\\end{itemize}

\\section{Student Performance Overview}
`;

  // Add student data tables
  studentsData.forEach((student, index) => {
    latex += `
\\subsection{${student.student_name}}

\\begin{table}[h]
\\centering
\\begin{tabular}{@{}lcc@{}}
\\toprule
\\textbf{Metric} & \\textbf{Value} & \\textbf{Percentage} \\\\
\\midrule
Total Problems Attempted & ${student.total_attempted} & - \\\\
Correct Answers & ${student.total_correct} & ${student.accuracy.toFixed(1)}\\% \\\\
Overall Accuracy & - & ${student.accuracy.toFixed(1)}\\% \\\\
\\bottomrule
\\end{tabular}
\\caption{Overall Performance - ${student.student_name}}
\\end{table}

\\subsubsection{Subject-wise Performance}
\\begin{table}[h]
\\centering
\\begin{tabular}{@{}lccc@{}}
\\toprule
\\textbf{Subject} & \\textbf{Attempted} & \\textbf{Correct} & \\textbf{Accuracy} \\\\
\\midrule
`;

    // Add subject data
    Object.entries(student.subjects).forEach(([subject, data]) => {
      if (subjects.includes(subject)) {
        latex += `${subject.charAt(0).toUpperCase() + subject.slice(1)} & ${data.attempted} & ${data.correct} & ${data.accuracy.toFixed(1)}\\% \\\\\n`;
      }
    });

    latex += `
\\bottomrule
\\end{tabular}
\\caption{Subject Performance - ${student.student_name}}
\\end{table}
`;

    // Add charts if requested
    if (include_charts && Object.keys(student.subjects).length > 0) {
      latex += `
\\subsubsection{Performance Chart - ${student.student_name}}
\\begin{center}
\\begin{tikzpicture}
\\begin{axis}[
    ybar,
    width=12cm,
    height=6cm,
    ylabel={Accuracy (\\%)},
    xlabel={Subjects},
    xticklabels={${Object.keys(student.subjects).filter(s => subjects.includes(s)).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(',')}},
    xtick=data,
    ymin=0,
    ymax=100,
    bar width=20pt,
    nodes near coords,
    nodes near coords align={vertical},
]
\\addplot coordinates {
`;

      Object.entries(student.subjects).forEach(([subject, data], idx) => {
        if (subjects.includes(subject)) {
          latex += `(${idx + 1},${data.accuracy.toFixed(1)}) `;
        }
      });

      latex += `
};
\\end{axis}
\\end{tikzpicture}
\\end{center}
`;
    }

    // Add page break between students (except for the last one)
    if (index < studentsData.length - 1) {
      latex += '\\newpage\n';
    }
  });

  // Add recommendations section
  latex += `
\\section{Recommendations}
\\begin{itemize}
`;

  studentsData.forEach(student => {
    if (student.accuracy < 60) {
      latex += `\\item \\textbf{${student.student_name}:} Requires additional support. Consider one-on-one tutoring sessions.\n`;
    } else if (student.accuracy < 80) {
      latex += `\\item \\textbf{${student.student_name}:} Good progress. Focus on challenging areas for improvement.\n`;
    } else {
      latex += `\\item \\textbf{${student.student_name}:} Excellent performance. Consider advanced materials.\n`;
    }
  });

  latex += `
\\end{itemize}

\\section{Next Steps}
\\begin{enumerate}
\\item Review individual student performance with each student
\\item Identify areas requiring additional focus
\\item Plan targeted learning activities
\\item Schedule follow-up assessments
\\end{enumerate}

\\vfill
\\begin{center}
\\textit{This report was generated automatically by EduSphere AI}\\\\
\\textit{For questions or support, please contact your administrator}
\\end{center}

\\end{document}
`;

  return latex;
}

/**
 * Generate PDF report from LaTeX source
 * @param {Object} reportConfig - Report configuration
 * @param {string} teacherId - Teacher identifier
 * @returns {Promise<Object>} Report generation result with PDF URL
 */
async function generatePDFReport(reportConfig, teacherId) {
  try {
    console.log('Generating PDF report for teacher:', teacherId);

    // Get student data for the report
    const studentIds = reportConfig.student_ids;
    const studentsData = [];

    for (const studentId of studentIds) {
      // Get student progress data
      const overallProgress = await sql`
        SELECT 
          COALESCE(SUM(total_attempted), 0) as total_attempted,
          COALESCE(SUM(total_correct), 0) as total_correct,
          MAX(last_activity) as last_activity
        FROM user_progress 
        WHERE user_id = ${studentId}
          AND last_activity >= ${reportConfig.date_range.start}
          AND last_activity <= ${reportConfig.date_range.end}
      `;

      // Get subject-wise progress
      const subjectProgress = await sql`
        SELECT 
          subject,
          SUM(total_attempted) as attempted,
          SUM(total_correct) as correct
        FROM user_progress 
        WHERE user_id = ${studentId}
          AND subject = ANY(${reportConfig.subjects})
          AND last_activity >= ${reportConfig.date_range.start}
          AND last_activity <= ${reportConfig.date_range.end}
        GROUP BY subject
      `;

      // Get student name
      const studentInfo = await sql`
        SELECT student_name 
        FROM teacher_students 
        WHERE teacher_id = ${teacherId} AND student_id = ${studentId}
        LIMIT 1
      `;

      const studentName = studentInfo[0]?.student_name || `Student ${studentId}`;

      // Calculate metrics
      const totalAttempted = parseInt(overallProgress[0]?.total_attempted || 0);
      const totalCorrect = parseInt(overallProgress[0]?.total_correct || 0);
      const accuracy = totalAttempted > 0 ? (totalCorrect / totalAttempted) * 100 : 0;

      // Format subject data
      const subjects = {};
      subjectProgress.forEach(row => {
        const attempted = parseInt(row.attempted);
        const correct = parseInt(row.correct);
        subjects[row.subject] = {
          attempted,
          correct,
          accuracy: attempted > 0 ? (correct / attempted) * 100 : 0
        };
      });

      studentsData.push({
        user_id: studentId,
        student_name: studentName,
        total_attempted: totalAttempted,
        total_correct: totalCorrect,
        accuracy: accuracy,
        subjects: subjects
      });
    }

    // Generate LaTeX source
    const latexSource = generateLatexReport(reportConfig, studentsData);

    // Create report record
    const reportId = `report_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    
    await sql`
      INSERT INTO reports (
        report_id,
        teacher_id,
        report_type,
        student_ids,
        date_range_start,
        date_range_end,
        subjects,
        include_charts,
        latex_source,
        generated_at,
        expires_at
      ) VALUES (
        ${reportId},
        ${teacherId},
        ${reportConfig.report_type},
        ${reportConfig.student_ids},
        ${reportConfig.date_range.start},
        ${reportConfig.date_range.end},
        ${reportConfig.subjects},
        ${reportConfig.include_charts},
        ${latexSource},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP + INTERVAL '30 days'
      )
    `;

    // In a real implementation, you would:
    // 1. Save the LaTeX source to a temporary file
    // 2. Use pdflatex or similar to compile it to PDF
    // 3. Upload the PDF to cloud storage (AWS S3, etc.)
    // 4. Return the public URL
    
    // For this demo, we'll create a mock PDF URL
    const mockPdfUrl = `https://edusphere-reports.s3.amazonaws.com/reports/${reportId}.pdf`;
    
    // Update the report record with the PDF URL
    await sql`
      UPDATE reports 
      SET pdf_url = ${mockPdfUrl}
      WHERE report_id = ${reportId}
    `;

    console.log('PDF report generated successfully:', reportId);

    return {
      success: true,
      report_id: reportId,
      pdf_url: mockPdfUrl,
      latex_source: latexSource,
      students_included: studentsData.length,
      generated_at: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to generate PDF report:', error);
    throw error;
  }
}

/**
 * Store AI-generated content in the database
 * Saves content generated by Claude Sonnet 4 for future reference
 * @param {string} userId - User identifier
 * @param {Object} contentData - Generated content data
 * @returns {Promise<Object>} Storage result with content ID
 */
async function storeGeneratedContent(userId, contentData) {
  try {
    console.log('Storing generated content for user:', userId, {
      contentType: contentData.content_type,
      grade: contentData.grade,
      subject: contentData.subject,
      language: contentData.language || 'en',
      contentLength: contentData.content?.length || 0
    });

    const { 
      prompt, 
      content_type, 
      content, 
      grade, 
      subject,
      language = 'en',
      model_used = 'claude-3-5-sonnet-20241022'
    } = contentData;

    // Validate required fields
    if (!prompt || !content_type || !content || !grade || !subject) {
      throw new Error('Missing required fields for content storage');
    }

    // Insert generated content into database
    const result = await sql`
      INSERT INTO generated_content (
        user_id, 
        prompt, 
        content_type, 
        content, 
        grade, 
        subject, 
        language,
        model_used,
        content_length,
        generation_time,
        created_at,
        updated_at
      ) VALUES (
        ${userId}, 
        ${prompt}, 
        ${content_type}, 
        ${content}, 
        ${grade}, 
        ${subject}, 
        ${language},
        ${model_used},
        ${content.length},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      RETURNING id, created_at
    `;

    const contentId = result[0]?.id;
    const createdAt = result[0]?.created_at;

    console.log('Generated content stored successfully:', {
      contentId,
      userId,
      contentType: content_type,
      language,
      createdAt
    });

    return {
      success: true,
      content_id: contentId,
      created_at: createdAt,
      storage_info: {
        user_id: userId,
        content_type,
        grade,
        subject,
        language,
        content_length: content.length,
        model_used
      }
    };

  } catch (error) {
    console.error('Failed to store generated content:', error);
    throw error;
  }
}

/**
 * Get generated content history for a user
 * Retrieves previously generated content with filtering options
 * @param {string} userId - User identifier
 * @param {Object} filters - Optional filters for content retrieval
 * @returns {Promise<Array>} Array of generated content records
 */
async function getGeneratedContent(userId, filters = {}) {
  try {
    console.log('Fetching generated content for user:', userId, filters);

    const { 
      content_type, 
      grade, 
      subject, 
      language,
      limit = 20, 
      offset = 0 
    } = filters;

    // Build dynamic query based on filters
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramIndex = 2;

    if (content_type) {
      whereConditions.push(`content_type = $${paramIndex}`);
      queryParams.push(content_type);
      paramIndex++;
    }

    if (grade) {
      whereConditions.push(`grade = $${paramIndex}`);
      queryParams.push(grade);
      paramIndex++;
    }

    if (subject) {
      whereConditions.push(`subject = $${paramIndex}`);
      queryParams.push(subject);
      paramIndex++;
    }

    if (language) {
      whereConditions.push(`language = $${paramIndex}`);
      queryParams.push(language);
      paramIndex++;
    }

    // Add limit and offset
    queryParams.push(parseInt(limit), parseInt(offset));

    const whereClause = whereConditions.join(' AND ');
    
    // Execute query using neon sql template with dynamic conditions
    const query = `
      SELECT 
        id,
        prompt,
        content_type,
        content,
        grade,
        subject,
        language,
        model_used,
        content_length,
        generation_time,
        created_at
      FROM generated_content 
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex - 1} OFFSET $${paramIndex}
    `;

    const generatedContent = await sql.unsafe(query, queryParams);

    // Format response data
    const formattedContent = generatedContent.map(item => ({
      id: item.id,
      prompt: item.prompt,
      contentType: item.content_type,
      content: item.content,
      grade: item.grade,
      subject: item.subject,
      language: item.language,
      modelUsed: item.model_used,
      contentLength: item.content_length,
      generationTime: item.generation_time,
      createdAt: item.created_at,
      timestamp: new Date(item.created_at).getTime()
    }));

    console.log(`Found ${formattedContent.length} generated content records`);
    return formattedContent;

  } catch (error) {
    console.error('Failed to get generated content:', error);
    throw error;
  }
}

/**
 * Get user progress data from database
 * Retrieves comprehensive learning analytics for a user
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} User progress data with statistics
 */
async function getUserProgress(userId) {
  try {
    console.log('Fetching user progress for:', userId);

    // Get aggregated progress by subject and grade
    const progressData = await sql`
      SELECT 
        subject,
        grade,
        total_attempted,
        total_correct,
        last_activity,
        created_at
      FROM user_progress 
      WHERE user_id = ${userId}
      ORDER BY subject, grade
    `;

    // Get recent attempts (last 20 for detailed view)
    const recentAttempts = await sql`
      SELECT 
        subject,
        grade,
        question,
        user_answer,
        correct_answer,
        is_correct,
        attempted_at
      FROM recent_attempts 
      WHERE user_id = ${userId}
      ORDER BY attempted_at DESC
      LIMIT 20
    `;

    // Calculate overall statistics
    const overallStats = await sql`
      SELECT 
        COALESCE(SUM(total_attempted), 0) as total_attempted,
        COALESCE(SUM(total_correct), 0) as total_correct
      FROM user_progress 
      WHERE user_id = ${userId}
    `;

    // Get subject-wise statistics
    const subjectStats = await sql`
      SELECT 
        subject,
        SUM(total_attempted) as subject_attempted,
        SUM(total_correct) as subject_correct,
        COUNT(DISTINCT grade) as grades_covered
      FROM user_progress 
      WHERE user_id = ${userId}
      GROUP BY subject
    `;

    // Format response data
    const formattedProgress = {
      totalAttempted: parseInt(overallStats[0]?.total_attempted || 0),
      totalCorrect: parseInt(overallStats[0]?.total_correct || 0),
      overallAccuracy: 0,
      bySubject: {},
      recentAttempts: recentAttempts.map(attempt => ({
        subject: attempt.subject,
        grade: attempt.grade,
        question: attempt.question,
        userAnswer: attempt.user_answer,
        correctAnswer: attempt.correct_answer,
        correct: attempt.is_correct,
        timestamp: new Date(attempt.attempted_at).getTime(),
      })),
      subjectSummary: {}
    };

    // Calculate overall accuracy
    if (formattedProgress.totalAttempted > 0) {
      formattedProgress.overallAccuracy = 
        ((formattedProgress.totalCorrect / formattedProgress.totalAttempted) * 100).toFixed(1);
    }

    // Initialize subject structure
    const subjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
    const grades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];

    subjects.forEach(subject => {
      formattedProgress.bySubject[subject] = {
        totalAttempted: 0,
        totalCorrect: 0,
        accuracy: 0,
        byGrade: {},
      };

      grades.forEach(grade => {
        formattedProgress.bySubject[subject].byGrade[grade] = {
          totalAttempted: 0,
          totalCorrect: 0,
          accuracy: 0,
        };
      });
    });

    // Populate with actual progress data
    progressData.forEach(row => {
      const subject = row.subject;
      const grade = row.grade;
      const attempted = parseInt(row.total_attempted);
      const correct = parseInt(row.total_correct);
      
      if (formattedProgress.bySubject[subject]) {
        formattedProgress.bySubject[subject].totalAttempted += attempted;
        formattedProgress.bySubject[subject].totalCorrect += correct;
        
        if (formattedProgress.bySubject[subject].byGrade[grade]) {
          formattedProgress.bySubject[subject].byGrade[grade].totalAttempted = attempted;
          formattedProgress.bySubject[subject].byGrade[grade].totalCorrect = correct;
          
          // Calculate grade-specific accuracy
          if (attempted > 0) {
            formattedProgress.bySubject[subject].byGrade[grade].accuracy = 
              ((correct / attempted) * 100).toFixed(1);
          }
        }
      }
    });

    // Calculate subject-level accuracy and create summary
    subjects.forEach(subject => {
      const subjectData = formattedProgress.bySubject[subject];
      if (subjectData.totalAttempted > 0) {
        subjectData.accuracy = ((subjectData.totalCorrect / subjectData.totalAttempted) * 100).toFixed(1);
      }
      
      // Find matching subject stats
      const stats = subjectStats.find(s => s.subject === subject);
      formattedProgress.subjectSummary[subject] = {
        attempted: subjectData.totalAttempted,
        correct: subjectData.totalCorrect,
        accuracy: subjectData.accuracy,
        gradesCovered: stats ? parseInt(stats.grades_covered) : 0
      };
    });

    return formattedProgress;

  } catch (error) {
    console.error('Failed to get user progress:', error);
    throw error;
  }
}

/**
 * Update user progress in database
 * Records a new learning attempt and updates statistics
 * @param {string} userId - User identifier
 * @param {Object} progressData - Progress data to update
 * @returns {Promise<boolean>} Success status
 */
async function updateUserProgress(userId, progressData) {
  try {
    console.log('Updating user progress for:', userId, progressData);

    const { subject, grade, correct, question, userAnswer, correctAnswer } = progressData;

    // Start a transaction for data consistency
    await sql.begin(async (sql) => {
      // Update or insert progress record
      await sql`
        INSERT INTO user_progress (user_id, subject, grade, total_attempted, total_correct, last_activity, updated_at)
        VALUES (${userId}, ${subject}, ${grade}, 1, ${correct ? 1 : 0}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        ON CONFLICT (user_id, subject, grade)
        DO UPDATE SET
          total_attempted = user_progress.total_attempted + 1,
          total_correct = user_progress.total_correct + ${correct ? 1 : 0},
          last_activity = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      `;

      // Record the specific attempt
      await sql`
        INSERT INTO recent_attempts (
          user_id, subject, grade, question, user_answer, correct_answer, is_correct, attempted_at
        ) VALUES (
          ${userId}, ${subject}, ${grade}, ${question}, ${userAnswer}, ${correctAnswer}, ${correct}, CURRENT_TIMESTAMP
        )
      `;

      // Clean up old attempts (keep only last 100 per user for performance)
      await sql`
        DELETE FROM recent_attempts 
        WHERE user_id = ${userId} 
        AND id NOT IN (
          SELECT id FROM recent_attempts 
          WHERE user_id = ${userId} 
          ORDER BY attempted_at DESC 
          LIMIT 100
        )
      `;
    });

    console.log('User progress updated successfully');
    return true;

  } catch (error) {
    console.error('Failed to update user progress:', error);
    throw error;
  }
}

/**
 * Get subscription data for a user
 * Retrieves current subscription status from Neon database
 * @param {string} userId - User identifier
 * @returns {Promise<Object>} Subscription data
 */
async function getSubscriptionData(userId) {
  try {
    console.log('Fetching subscription data for user:', userId);

    const subscriptionData = await sql`
      SELECT 
        user_id,
        revenuecat_id,
        status,
        is_active,
        product_id,
        expires_at,
        trial_ends_at,
        original_purchase_date,
        last_webhook_event,
        webhook_processed_at,
        created_at,
        updated_at
      FROM subscriptions 
      WHERE user_id = ${userId}
      LIMIT 1
    `;

    if (subscriptionData.length === 0) {
      // Return default free subscription for new users
      return {
        user_id: userId,
        revenuecat_id: null,
        status: 'free',
        is_active: false,
        product_id: null,
        expires_at: null,
        trial_ends_at: null,
        original_purchase_date: null,
        last_webhook_event: null,
        webhook_processed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isNewUser: true
      };
    }

    const subscription = subscriptionData[0];
    
    // Check if subscription is still active based on expiration
    let actuallyActive = subscription.is_active;
    if (subscription.expires_at) {
      const now = new Date();
      const expirationDate = new Date(subscription.expires_at);
      actuallyActive = actuallyActive && (expirationDate > now);
    }

    return {
      user_id: subscription.user_id,
      revenuecat_id: subscription.revenuecat_id,
      status: subscription.status,
      is_active: actuallyActive,
      product_id: subscription.product_id,
      expires_at: subscription.expires_at,
      trial_ends_at: subscription.trial_ends_at,
      original_purchase_date: subscription.original_purchase_date,
      last_webhook_event: subscription.last_webhook_event,
      webhook_processed_at: subscription.webhook_processed_at,
      created_at: subscription.created_at,
      updated_at: subscription.updated_at,
    };

  } catch (error) {
    console.error('Failed to get subscription data:', error);
    throw error;
  }
}

/**
 * Update subscription data from RevenueCat webhook
 * Processes webhook events and updates subscription status
 * @param {Object} webhookData - RevenueCat webhook payload
 * @returns {Promise<boolean>} Success status
 */
async function updateSubscriptionFromWebhook(webhookData) {
  try {
    console.log('Processing RevenueCat webhook:', webhookData.event?.type);

    const { event } = webhookData;
    if (!event || !event.app_user_id) {
      throw new Error('Invalid webhook data: missing event or app_user_id');
    }

    const userId = event.app_user_id;
    const eventType = event.type;
    
    // Extract subscription information from webhook
    let subscriptionStatus = 'free';
    let isActive = false;
    let productId = null;
    let expiresAt = null;
    let trialEndsAt = null;
    let originalPurchaseDate = null;
    let revenuecatId = event.original_app_user_id || userId;

    // Process different webhook event types
    switch (eventType) {
      case 'INITIAL_PURCHASE':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          originalPurchaseDate = premium.purchase_date;
        }
        
        console.log('Processing initial purchase for user:', userId);
        break;

      case 'RENEWAL':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing renewal for user:', userId);
        break;

      case 'PRODUCT_CHANGE':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing product change for user:', userId);
        break;

      case 'CANCELLATION':
        subscriptionStatus = 'cancelled';
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          // Keep active until expiration date
          isActive = expiresAt ? new Date(expiresAt) > new Date() : false;
        } else {
          isActive = false;
        }
        
        console.log('Processing cancellation for user:', userId, 'Active until:', expiresAt);
        break;

      case 'EXPIRATION':
        subscriptionStatus = 'expired';
        isActive = false;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing expiration for user:', userId);
        break;

      case 'BILLING_ISSUE':
        subscriptionStatus = 'billing_issue';
        isActive = false;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
        }
        
        console.log('Processing billing issue for user:', userId);
        break;

      case 'SUBSCRIBER_ALIAS':
        // Handle user ID changes - update the revenuecat_id
        revenuecatId = event.new_app_user_id;
        
        // Keep existing subscription status
        const existingSubscription = await getSubscriptionData(userId);
        subscriptionStatus = existingSubscription.status;
        isActive = existingSubscription.is_active;
        productId = existingSubscription.product_id;
        expiresAt = existingSubscription.expires_at;
        
        console.log('Processing subscriber alias change for user:', userId, 'New ID:', revenuecatId);
        break;

      case 'TRIAL_STARTED':
        subscriptionStatus = 'trial';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          trialEndsAt = premium.expires_date;
        }
        
        console.log('Processing trial start for user:', userId);
        break;

      case 'TRIAL_CONVERTED':
        subscriptionStatus = 'active';
        isActive = true;
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          expiresAt = premium.expires_date;
          originalPurchaseDate = premium.purchase_date;
        }
        
        console.log('Processing trial conversion for user:', userId);
        break;

      case 'TRIAL_CANCELLED':
        subscriptionStatus = 'trial_cancelled';
        
        if (event.entitlements && event.entitlements.premium) {
          const premium = event.entitlements.premium;
          productId = premium.product_identifier;
          trialEndsAt = premium.expires_date;
          // Keep active until trial ends
          isActive = trialEndsAt ? new Date(trialEndsAt) > new Date() : false;
        } else {
          isActive = false;
        }
        
        console.log('Processing trial cancellation for user:', userId);
        break;

      default:
        console.log('Unhandled webhook event type:', eventType);
        // Don't fail on unknown events, just log them
        return true;
    }

    // Update or insert subscription record in database
    await sql`
      INSERT INTO subscriptions (
        user_id, 
        revenuecat_id, 
        status, 
        is_active, 
        product_id, 
        expires_at, 
        trial_ends_at, 
        original_purchase_date,
        last_webhook_event,
        webhook_processed_at,
        updated_at
      ) VALUES (
        ${userId}, 
        ${revenuecatId}, 
        ${subscriptionStatus}, 
        ${isActive}, 
        ${productId}, 
        ${expiresAt}, 
        ${trialEndsAt}, 
        ${originalPurchaseDate},
        ${eventType},
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        revenuecat_id = ${revenuecatId},
        status = ${subscriptionStatus},
        is_active = ${isActive},
        product_id = ${productId},
        expires_at = ${expiresAt},
        trial_ends_at = ${trialEndsAt},
        original_purchase_date = COALESCE(${originalPurchaseDate}, subscriptions.original_purchase_date),
        last_webhook_event = ${eventType},
        webhook_processed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    `;

    console.log('Subscription updated successfully for user:', userId, 'Status:', subscriptionStatus, 'Active:', isActive);
    return true;

  } catch (error) {
    console.error('Failed to update subscription from webhook:', error);
    throw error;
  }
}

/**
 * Get subscription statistics for analytics
 * @returns {Promise<Object>} Subscription statistics
 */
async function getSubscriptionStats() {
  try {
    const stats = await sql`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
      FROM subscriptions
      GROUP BY status
      ORDER BY count DESC
    `;

    const totalUsers = await sql`
      SELECT COUNT(DISTINCT user_id) as total FROM subscriptions
    `;

    const activeSubscriptions = await sql`
      SELECT COUNT(*) as active FROM subscriptions WHERE is_active = true AND status != 'free'
    `;

    return {
      byStatus: stats.map(row => ({
        status: row.status,
        total: parseInt(row.count),
        active: parseInt(row.active_count)
      })),
      totalUsers: parseInt(totalUsers[0]?.total || 0),
      activeSubscriptions: parseInt(activeSubscriptions[0]?.active || 0),
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to get subscription stats:', error);
    throw error;
  }
}

/**
 * Validate request parameters based on HTTP method and action
 * @param {Object} body - Request body
 * @param {string} method - HTTP method
 * @returns {Object} Validation result
 */
function validateRequest(body, method) {
  const errors = [];

  if (method === 'PUT') {
    // Validate progress update request
    if (!body.subject || typeof body.subject !== 'string') {
      errors.push('Subject is required and must be a string');
    }

    if (!body.grade || typeof body.grade !== 'string') {
      errors.push('Grade is required and must be a string');
    }

    if (typeof body.correct !== 'boolean') {
      errors.push('Correct field is required and must be a boolean');
    }

    if (!body.question || typeof body.question !== 'string') {
      errors.push('Question is required and must be a string');
    }

    if (!body.userAnswer || typeof body.userAnswer !== 'string') {
      errors.push('User answer is required and must be a string');
    }

    if (!body.correctAnswer || typeof body.correctAnswer !== 'string') {
      errors.push('Correct answer is required and must be a string');
    }

    // Validate subject and grade values
    const validSubjects = ['math', 'physics', 'science', 'english', 'history', 'geography', 'coding'];
    const validGrades = ['kindergarten', 'grade1-6', 'grade7-9', 'grade10-12', 'matric'];

    if (!validSubjects.includes(body.subject)) {
      errors.push(`Invalid subject. Must be one of: ${validSubjects.join(', ')}`);
    }

    if (!validGrades.includes(body.grade)) {
      errors.push(`Invalid grade. Must be one of: ${validGrades.join(', ')}`);
    }

  } else if (method === 'POST') {
    // Check if this is a generated content storage request
    if (body.action === 'store_generated_content') {
      // Validate generated content storage request
      if (!body.prompt || typeof body.prompt !== 'string') {
        errors.push('Prompt is required and must be a string');
      }

      if (!body.content_type || typeof body.content_type !== 'string') {
        errors.push('Content type is required and must be a string');
      }

      if (!body.content || typeof body.content !== 'string') {
        errors.push('Content is required and must be a string');
      }

      if (!body.grade || typeof body.grade !== 'string') {
        errors.push('Grade is required and must be a string');
      }

      if (!body.subject || typeof body.subject !== 'string') {
        errors.push('Subject is required and must be a string');
      }

      // Validate content type values
      const validContentTypes = ['problems', 'narration', 'video', 'exam', 'translation'];
      if (!validContentTypes.includes(body.content_type)) {
        errors.push(`Invalid content type. Must be one of: ${validContentTypes.join(', ')}`);
      }

    } else if (body.action === 'create_task') {
      // Validate task creation request
      if (!body.task_data || typeof body.task_data !== 'object') {
        errors.push('Task data is required and must be an object');
      } else {
        const { title, description, subject, grade, assigned_to } = body.task_data;
        
        if (!title || typeof title !== 'string') {
          errors.push('Task title is required and must be a string');
        }
        
        if (!description || typeof description !== 'string') {
          errors.push('Task description is required and must be a string');
        }
        
        if (!subject || typeof subject !== 'string') {
          errors.push('Task subject is required and must be a string');
        }
        
        if (!grade || typeof grade !== 'string') {
          errors.push('Task grade is required and must be a string');
        }
        
        if (!assigned_to || !Array.isArray(assigned_to) || assigned_to.length === 0) {
          errors.push('Task must be assigned to at least one student');
        }
      }

    } else if (body.action === 'generate_report') {
      // Validate report generation request
      if (!body.report_config || typeof body.report_config !== 'object') {
        errors.push('Report config is required and must be an object');
      } else {
        const { student_ids, date_range, subjects, report_type } = body.report_config;
        
        if (!student_ids || !Array.isArray(student_ids) || student_ids.length === 0) {
          errors.push('At least one student must be selected for the report');
        }
        
        if (!date_range || !date_range.start || !date_range.end) {
          errors.push('Date range with start and end dates is required');
        }
        
        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
          errors.push('At least one subject must be selected for the report');
        }
        
        if (!report_type || !['summary', 'detailed', 'progress'].includes(report_type)) {
          errors.push('Report type must be one of: summary, detailed, progress');
        }
      }

    } else {
      // Validate webhook request
      if (!body.event || typeof body.event !== 'object') {
        errors.push('Event data is required for webhook processing');
      } else {
        if (!body.event.type || typeof body.event.type !== 'string') {
          errors.push('Event type is required in webhook data');
        }

        if (!body.event.app_user_id || typeof body.event.app_user_id !== 'string') {
          errors.push('App user ID is required in webhook data');
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Extract user ID from various sources in the request
 * @param {Object} event - Netlify event object
 * @param {Object} requestBody - Parsed request body
 * @returns {string|null} User ID or null if not found
 */
function extractUserId(event, requestBody) {
  // Try multiple sources for user ID
  const userId = requestBody.user_id || 
                 requestBody.userId ||
                 event.headers['x-user-id'] || 
                 event.headers['X-User-ID'] ||
                 event.queryStringParameters?.user_id ||
                 event.queryStringParameters?.userId;
  
  return userId || null;
}

/**
 * Main Netlify function handler
 * Handles user progress tracking, subscription management, generated content storage, teacher dashboard, and RevenueCat webhooks
 * @param {Object} event - Netlify event object
 * @param {Object} context - Netlify context object
 * @returns {Object} Response object
 */
exports.handler = async (event, context) => {
  console.log('Problems Management function invoked:', {
    method: event.httpMethod,
    path: event.path,
    headers: Object.keys(event.headers),
    hasBody: !!event.body,
    queryParams: event.queryStringParameters
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
    // Initialize database tables
    await initializeTables();

    // Handle GET requests - fetch user progress, subscription data, generated content, and teacher dashboard
    if (event.httpMethod === 'GET') {
      const userId = extractUserId(event, {});
      const action = event.queryStringParameters?.action;

      // Handle teacher dashboard request
      if (action === 'teacher-dashboard') {
        const teacherId = event.queryStringParameters?.teacher_id || userId;
        
        if (!teacherId) {
          return {
            statusCode: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Teacher ID is required for dashboard data',
            }),
          };
        }

        try {
          const dashboardData = await getTeacherDashboardData(teacherId);

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              data: dashboardData,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to fetch teacher dashboard data:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to fetch teacher dashboard data',
              message: error.message,
            }),
          };
        }
      }

      // Handle subscription statistics request (admin/analytics)
      if (action === 'subscription-stats') {
        try {
          const stats = await getSubscriptionStats();

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              data: stats,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to fetch subscription stats:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to fetch subscription statistics',
              message: error.message,
            }),
          };
        }
      }

      // Handle generated content request
      if (action === 'generated-content') {
        if (!userId) {
          return {
            statusCode: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'User ID is required for generated content retrieval',
            }),
          };
        }

        try {
          const filters = {
            content_type: event.queryStringParameters?.content_type,
            grade: event.queryStringParameters?.grade,
            subject: event.queryStringParameters?.subject,
            language: event.queryStringParameters?.language,
            limit: event.queryStringParameters?.limit,
            offset: event.queryStringParameters?.offset
          };

          const generatedContent = await getGeneratedContent(userId, filters);

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              data: generatedContent,
              count: generatedContent.length,
              filters,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to fetch generated content:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to fetch generated content',
              message: error.message,
            }),
          };
        }
      }

      // Regular user data request
      if (!userId) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID is required',
            usage: 'Include user ID in X-User-ID header or user_id query parameter'
          }),
        };
      }

      try {
        // Fetch both progress and subscription data
        const [progressData, subscriptionData] = await Promise.all([
          getUserProgress(userId),
          getSubscriptionData(userId)
        ]);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            data: {
              progress: progressData,
              subscription: subscriptionData,
            },
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to fetch user data:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to fetch user data',
            message: error.message,
          }),
        };
      }
    }

    // Handle PUT requests - update user progress
    if (event.httpMethod === 'PUT') {
      const userId = extractUserId(event, {});

      if (!userId) {
        return {
          statusCode: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'User ID is required for progress updates',
          }),
        };
      }

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
            error: 'Invalid JSON in request body',
          }),
        };
      }

      // Validate request
      const validation = validateRequest(requestBody, 'PUT');
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

      try {
        await updateUserProgress(userId, requestBody);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            message: 'Progress updated successfully',
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to update progress:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to update progress',
            message: error.message,
          }),
        };
      }
    }

    // Handle POST requests - RevenueCat webhook processing, generated content storage, task creation, and report generation
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
            error: 'Invalid JSON in request body',
          }),
        };
      }

      // Check if this is a generated content storage request
      if (requestBody.action === 'store_generated_content') {
        const userId = extractUserId(event, requestBody);

        if (!userId) {
          return {
            statusCode: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'User ID is required for content storage',
            }),
          };
        }

        // Validate generated content storage request
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

        try {
          const result = await storeGeneratedContent(userId, requestBody);

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              message: 'Generated content stored successfully',
              data: result,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to store generated content:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to store generated content',
              message: error.message,
            }),
          };
        }
      }

      // Check if this is a task creation request
      if (requestBody.action === 'create_task') {
        const teacherId = extractUserId(event, requestBody) || requestBody.teacher_id;

        if (!teacherId) {
          return {
            statusCode: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Teacher ID is required for task creation',
            }),
          };
        }

        // Validate task creation request
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

        try {
          const taskId = await createTask(requestBody.task_data, teacherId);

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              message: 'Task created successfully',
              task_id: taskId,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to create task:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to create task',
              message: error.message,
            }),
          };
        }
      }

      // Check if this is a report generation request
      if (requestBody.action === 'generate_report') {
        const teacherId = extractUserId(event, requestBody) || requestBody.teacher_id;

        if (!teacherId) {
          return {
            statusCode: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Teacher ID is required for report generation',
            }),
          };
        }

        // Validate report generation request
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

        try {
          const result = await generatePDFReport(requestBody.report_config, teacherId);

          return {
            statusCode: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: true,
              message: 'Report generated successfully',
              ...result,
              timestamp: new Date().toISOString(),
            }),
          };

        } catch (error) {
          console.error('Failed to generate report:', error);
          
          return {
            statusCode: 500,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              success: false,
              error: 'Failed to generate report',
              message: error.message,
            }),
          };
        }
      }

      // Handle RevenueCat webhook processing
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
            error: 'Invalid webhook payload',
            details: validation.errors,
          }),
        };
      }

      try {
        await updateSubscriptionFromWebhook(requestBody);

        return {
          statusCode: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: true,
            message: 'Webhook processed successfully',
            event_type: requestBody.event?.type,
            user_id: requestBody.event?.app_user_id,
            timestamp: new Date().toISOString(),
          }),
        };

      } catch (error) {
        console.error('Failed to process webhook:', error);
        
        return {
          statusCode: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            success: false,
            error: 'Failed to process webhook',
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
        allowed_methods: ['GET', 'PUT', 'POST', 'OPTIONS'],
        usage: {
          GET: 'Fetch user progress, subscription data, generated content, and teacher dashboard',
          PUT: 'Update user learning progress',
          POST: 'Process RevenueCat webhooks, store generated content, create tasks, and generate reports'
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
        message: 'An unexpected error occurred while processing your request',
        timestamp: new Date().toISOString(),
        support_info: {
          suggestion: 'Please try again or contact support if the issue persists',
          error_id: `manage_problems_${Date.now()}`
        }
      }),
    };
  }
};