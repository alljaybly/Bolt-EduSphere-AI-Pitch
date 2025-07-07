```tsx
   import React from 'react';
   import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
   import PlayLearnPage from './components/PlayLearnPage';
   import ARProblem from './components/ARProblem';
   import LiveCode from './components/LiveCode';
   import StoryMode from './components/StoryMode';
   import TeacherDashboard from './components/TeacherDashboard';
   import VoiceRecognition from './components/EnhancedVoiceRecognition';
   import Login from './components/Login';

   const App: React.FC = () => {
     return (
       <Router>
         <Routes>
           <Route path="/" element={<PlayLearnPage />} />
           <Route path="/play-learn" element={<PlayLearnPage />} />
           <Route path="/ar-problems" element={<ARProblem />} />
           <Route path="/live-code" element={<LiveCode />} />
           <Route path="/story-mode" element={<StoryMode />} />
           <Route path="/teacher-dashboard" element={<TeacherDashboard />} />
           <Route path="/voice-recognition" element={<VoiceRecognition />} />
           <Route path="/login" element={<Login />} />
         </Routes>
       </Router>
     );
   };

   export default App;
   ```