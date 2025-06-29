# EduSphere AI: Learn Without Limits

![EduSphere AI](https://images.pexels.com/photos/3184292/pexels-photo-3184292.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2)

## 🚀 World's Largest Hackathon Project

EduSphere AI is a revolutionary educational platform designed for students ages 5-18, providing personalized learning experiences across all subjects through cutting-edge AI technology. Our mission is to make quality education accessible to everyone, everywhere.

## ✨ Key Features

### 🎮 Interactive Learning
- **AR Problem Solving**: Augmented reality experiences that bring math and science concepts to life
- **Voice Recognition Quizzes**: Practice pronunciation and language skills with speech recognition
- **Interactive Storytelling**: AI-generated stories with voice narration and adaptive content
- **Live Collaborative Coding**: Real-time code collaboration with voice/video chat

### 🧠 Personalized Learning
- **Adaptive Difficulty**: Content that adjusts to each student's skill level
- **Multi-language Support**: Learn in your preferred language with AI translation
- **Progress Tracking**: Comprehensive analytics and achievement system
- **Custom Learning Paths**: Tailored educational journeys based on interests and goals

### 👨‍👩‍👧‍👦 Social Learning
- **Teacher Dashboard**: Monitor student progress and assign personalized tasks
- **Real-time Collaboration**: Work together on problems and projects
- **Content Sharing**: Share creations and achievements with the community
- **Global Classroom**: Connect with learners worldwide

## 🛠️ Technology Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for lightning-fast builds
- **Framer Motion** for fluid animations
- **Tailwind CSS** for responsive design
- **Lucide React** for beautiful icons

### Backend
- **Supabase** for database, authentication, and real-time features
- **Netlify Functions** for serverless backend logic
- **Clerk** for authentication and user management

### AI & Media
- **PayPal** for subscription and payment processing
- **Dappier** for AI content generation
- **Anthropic Claude** for intelligent tutoring
- **ElevenLabs** for natural voice synthesis
- **WebXR** for augmented reality experiences

### DevOps & Monitoring
- **Sentry** for error tracking and performance monitoring
- **Netlify** for hosting and continuous deployment
- **Bolt.new** for AI-assisted development

## 📊 Database Schema

EduSphere AI uses a comprehensive Supabase database with the following key tables:

- **users**: User profiles and authentication data
- **user_preferences**: Personalized learning settings
- **user_achievements**: Gamification and progress tracking
- **user_progress**: Subject-specific learning progress
- **voice_quizzes**: Speech recognition learning content
- **ar_problems**: Augmented reality problem definitions
- **narratives**: Interactive storytelling content
- **live_sessions**: Real-time collaboration sessions
- **chat_messages**: Communication within live sessions
- **multilingual_content**: Translations for global accessibility

All tables implement Row Level Security (RLS) to ensure data privacy and security.

## 🔧 Setup Instructions

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account
- PayPal Developer account

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/alljaybly/Bolt-EduSphere-AI.git
   cd Bolt-EduSphere-AI
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file with the following:
   ```
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
   VITE_PAYPAL_SECRET_KEY=your_paypal_secret_key
   VITE_SENTRY_DSN=your_sentry_dsn
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Deploy to Netlify:
   ```bash
   npm run build
   netlify deploy --prod
   ```

## 🎮 Usage Guide

### Learning Journey
1. **Sign up/Login**: Create an account or continue as a guest
2. **Select Subject**: Choose from math, science, language, coding, and more
3. **Choose Grade Level**: Content adapts to your educational level
4. **Explore Features**: Try AR problems, voice quizzes, storytelling, or live coding
5. **Track Progress**: View your achievements and learning statistics

### Premium Features
- **AR Problem Solving**: Interact with 3D objects to solve math and science problems
- **Voice Recognition**: Practice pronunciation and language skills with speech feedback
- **Interactive Stories**: Immersive storytelling with voice narration and choices
- **Live Coding**: Collaborate in real-time with voice/video chat

## 🏆 Hackathon Submission Details

### Project Information
- **Team Name**: EduSphere AI
- **Submission URL**: https://bolt.new/~/sb1-fvrp1dsh
- **GitHub Repository**: https://github.com/alljaybly/Bolt-EduSphere-AI
- **Development Platform**: Built with Bolt.new

### Demonstrated Features
- **AI-Powered Education**: Personalized learning with Claude Sonnet 4
- **Multilingual Support**: Content translation and voice synthesis
- **WebXR Integration**: Augmented reality learning experiences
- **Real-time Collaboration**: Live coding and interactive sessions
- **Voice Recognition**: Speech-based learning and assessment
- **Subscription Management**: PayPal integration for premium features

## 🐛 Known Issues

- **PayPal Integration**: Requires valid PayPal Developer credentials for full functionality
- **Supabase RLS**: Some permissions may need adjustment for production use
- **AR Features**: Best experienced on devices with WebXR support

## 🤝 Contributing

We welcome contributions to EduSphere AI! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Bolt.new](https://bolt.new) - AI-assisted development
- Powered by [Supabase](https://supabase.com) - The open source Firebase alternative
- Deployed on [Netlify](https://netlify.com) - Modern web development platform
- Icons by [Lucide](https://lucide.dev) - Beautiful & consistent icons
- Stock photos from [Pexels](https://pexels.com) - Free stock photos

---

© 2025 EduSphere AI. All rights reserved.