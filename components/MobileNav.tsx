import React from 'react';

export type TabType = 'home' | 'favorites' | 'categories' | 'languages' | 'info';

interface Props {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
}

const MobileNav: React.FC<Props> = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'home', icon: 'fa-house', label: 'Home' },
    { id: 'favorites', icon: 'fa-heart', label: 'Saved' },
    { id: 'categories', icon: 'fa-layer-group', label: 'Topics' },
    { id: 'languages', icon: 'fa-language', label: 'Lang' },
    { id: 'info', icon: 'fa-circle-info', label: 'About' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 theme-nav backdrop-blur-lg border-t theme-border safe-pb z-50 transition-colors duration-300">
      <div className="flex justify-around items-center py-2 px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex flex-col items-center gap-1 min-w-[55px] transition-all ${
              activeTab === tab.id ? 'nav-item-active font-black' : 'theme-text-muted opacity-50'
            }`}
          >
            <i className={`fas ${tab.icon} text-lg ${activeTab === tab.id ? 'scale-110' : ''}`}></i>
            <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default MobileNav;