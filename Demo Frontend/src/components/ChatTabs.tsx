import React from 'react';
import { Button, Flex, useTheme } from '@aws-amplify/ui-react';

export type AgentTopic = 'gameplay' | 'lore' | 'strategic' | 'analyst';

interface ChatTabsProps {
  activeTab: AgentTopic;
  onTabChange: (tab: AgentTopic) => void;
  disabled?: boolean;
  enabledAgents?: AgentTopic[]; // Which agents to show tabs for
}

const AGENT_LABELS: Record<AgentTopic, string> = {
  gameplay: 'Gameplay',
  lore: 'Lore',
  strategic: 'Strategic',
  analyst: 'Analyst'
};

const ChatTabs: React.FC<ChatTabsProps> = ({ 
  activeTab, 
  onTabChange, 
  disabled = false,
  enabledAgents 
}) => {
  const { tokens } = useTheme();
  
  // If enabledAgents is provided, only show those tabs; otherwise show all
  const allTabs: AgentTopic[] = ['gameplay', 'lore', 'strategic', 'analyst'];
  const tabs = enabledAgents && enabledAgents.length > 0 ? enabledAgents : allTabs;

  const handleKeyDown = (event: React.KeyboardEvent, tab: AgentTopic, index: number) => {
    if (disabled) return;

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        if (index > 0) {
          onTabChange(tabs[index - 1]);
        }
        break;
      case 'ArrowRight':
        event.preventDefault();
        if (index < tabs.length - 1) {
          onTabChange(tabs[index + 1]);
        }
        break;
      case 'Home':
        event.preventDefault();
        onTabChange(tabs[0]);
        break;
      case 'End':
        event.preventDefault();
        onTabChange(tabs[tabs.length - 1]);
        break;
    }
  };

  return (
    <Flex
      role="tablist"
      aria-label="Agent conversation tabs"
      style={{
        borderBottom: `1px solid ${tokens.colors.border.primary.value}`,
        gap: 0
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab;
        
        return (
          <Button
            key={tab}
            role="tab"
            aria-selected={isActive}
            aria-controls={`${tab}-panel`}
            id={`${tab}-tab`}
            tabIndex={isActive ? 0 : -1}
            variation={isActive ? 'primary' : 'link'}
            onClick={() => !disabled && onTabChange(tab)}
            onKeyDown={(e) => handleKeyDown(e, tab, index)}
            disabled={disabled}
            style={{
              borderRadius: 0,
              borderBottom: isActive ? '2px solid' : 'none',
              minWidth: '100px'
            }}
          >
            {AGENT_LABELS[tab]}
          </Button>
        );
      })}
    </Flex>
  );
};

export default ChatTabs;
