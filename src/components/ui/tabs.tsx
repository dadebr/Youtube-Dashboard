import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TabsContextType {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  defaultValue: string;
  children: ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ defaultValue, children, className }) => {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

interface TabsListProps {
  children: ReactNode;
  className?: string;
}

export const TabsList: React.FC<TabsListProps> = ({ children, className }) => {
  return (
    <div className={`flex space-x-1 bg-youtube-gray p-1 rounded-lg ${className}`}>
      {children}
    </div>
  );
};

interface TabsTriggerProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsTrigger: React.FC<TabsTriggerProps> = ({ value, children, className }) => {
  const { activeTab, setActiveTab } = useContext(TabsContext)!;

  return (
    <button
      onClick={() => setActiveTab(value)}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
        activeTab === value
          ? 'bg-youtube-red text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-700'
      } ${className}`}
    >
      {children}
    </button>
  );
};

interface TabsContentProps {
  value: string;
  children: ReactNode;
  className?: string;
}

export const TabsContent: React.FC<TabsContentProps> = ({ value, children, className }) => {
  const { activeTab } = useContext(TabsContext)!;

  if (activeTab !== value) {
    return null;
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};