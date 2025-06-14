import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, MessageSquare, Book, Puzzle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

const TabSelector: React.FC = () => {
  const { activeTab, setActiveTab, currentGrade } = useAppStore();
  const navigate = useNavigate();

  const tabs = [
    { id: 'main', name: 'Learning', icon: <Book size={18} /> },
    { id: 'matric', name: 'Matric', icon: <GraduationCap size={18} /> },
    { id: 'promptmaster', name: 'PromptMaster', icon: <MessageSquare size={18} /> },
    { id: 'playlearn', name: 'Play & Learn', icon: <Puzzle size={18} />, condition: currentGrade === 'kindergarten' }
  ] as const;

  const handleTabChange = (tabId: 'main' | 'matric' | 'promptmaster' | 'playlearn') => {
    const pageTurnSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2526/2526-preview.mp3');
    pageTurnSound.volume = 0.3;
    pageTurnSound.play().catch(() => {});

    if (tabId === 'playlearn' && currentGrade === 'kindergarten') {
      navigate('/play-learn');
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="tab-selector">
      <div className="grid grid-cols-4 gap-2">
        {tabs.map((tab) => (
          (tab.condition === undefined || tab.condition) && (
            <motion.button
              key={tab.id}
              className={`p-3 rounded-md transition-colors flex flex-col items-center justify-center ${
                activeTab === tab.id || (tab.id === 'playlearn' && window.location.pathname === '/play-learn')
                  ? 'bg-primary-600 text-white'
                  : 'bg-white/80 text-book-leather hover:bg-primary-100'
              }`}
              onClick={() => handleTabChange(tab.id)}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.icon}
              <span className="font-serif text-sm mt-1">{tab.name}</span>
            </motion.button>
          )
        ))}
      </div>
    </div>
  );
}

export default TabSelector