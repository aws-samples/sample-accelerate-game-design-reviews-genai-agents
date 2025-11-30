import React, { useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  View,
  Flex,
  Heading,
  Button,
  Menu,
  MenuItem,
  MenuButton,
  Text,
  Divider,
  useTheme,
  Icon,
  VisuallyHidden
} from '@aws-amplify/ui-react';
import { useAuth } from '../hooks/useAuth';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { user, signOut } = useAuth();
  const { tokens } = useTheme();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const skipLinkRef = useRef<HTMLAnchorElement>(null);

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      
      // Auto-close sidebar on mobile when screen becomes small
      if (mobile && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    handleResize(); // Check initial size
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  // Handle keyboard navigation for sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Close sidebar with Escape key
      if (event.key === 'Escape' && isSidebarOpen) {
        setIsSidebarOpen(false);
        // Focus the sidebar toggle button
        const toggleButton = document.querySelector('[aria-label="Toggle sidebar"]') as HTMLButtonElement;
        toggleButton?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSidebarOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const handleSkipToMain = () => {
    mainContentRef.current?.focus();
  };

  return (
    <Flex direction="column" height="100vh">
      {/* Skip to main content link for screen readers */}
      <a
        ref={skipLinkRef}
        href="#main-content"
        onClick={handleSkipToMain}
        style={{
          position: 'absolute',
          top: '-40px',
          left: '6px',
          background: tokens.colors.background.primary.value,
          color: tokens.colors.font.primary.value,
          padding: '8px',
          textDecoration: 'none',
          borderRadius: '4px',
          zIndex: 1000,
          transition: 'top 0.3s'
        }}
        onFocus={(e) => {
          e.currentTarget.style.top = '6px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.top = '-40px';
        }}
      >
        Skip to main content
      </a>

      {/* Header */}
      <header
        role="banner"
        style={{
          backgroundColor: tokens.colors.background.primary.value,
          padding: tokens.space.medium.value,
          borderBottom: `1px solid ${tokens.colors.border.primary.value}`,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Flex justifyContent="space-between" alignItems="center">
          <Flex alignItems="center" gap={tokens.space.medium}>
            <Button
              variation="link"
              onClick={toggleSidebar}
              aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
              aria-expanded={isSidebarOpen}
              aria-controls="sidebar-navigation"
              style={{ padding: tokens.space.small.value }}
            >
              <Icon
                ariaLabel=""
                pathData="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"
              />
              <VisuallyHidden>
                {isSidebarOpen ? 'Close' : 'Open'} navigation menu
              </VisuallyHidden>
            </Button>
            <Heading level={1} margin="none" fontSize={tokens.fontSizes.xl}>
              Project Portal
            </Heading>
          </Flex>

          <Flex alignItems="center" gap={tokens.space.medium}>
            <Flex direction="column" alignItems="flex-end">
              <Text 
                fontSize={tokens.fontSizes.small}
                aria-label={`Signed in as ${user?.username || 'User'}`}
              >
                Welcome, {user?.username || 'User'}
              </Text>
              {(import.meta.env['VITE_BYPASS_AUTH'] === 'true' || import.meta.env.DEV) && (
                <Text 
                  fontSize={tokens.fontSizes.xs}
                  color={tokens.colors.font.warning}
                  style={{ fontStyle: 'italic' }}
                >
                  (Dev Mode)
                </Text>
              )}
            </Flex>
            <Menu>
              <MenuButton 
                variation="primary" 
                size="small"
                aria-label="Account menu"
              >
                Account
              </MenuButton>
              <MenuItem 
                onClick={handleSignOut}
                role="menuitem"
              >
                Sign Out
              </MenuItem>
            </Menu>
          </Flex>
        </Flex>
      </header>

      {/* Main Content Area */}
      <Flex flex="1" overflow="hidden" position="relative">
        {/* Sidebar */}
        {isSidebarOpen && (
          <>
            {/* Mobile overlay */}
            {isMobile && (
              <View
                position="fixed"
                top="0"
                left="0"
                right="0"
                bottom="0"
                backgroundColor="rgba(0, 0, 0, 0.5)"
                style={{ zIndex: 998 }}
                onClick={() => setIsSidebarOpen(false)}
                aria-hidden="true"
              />
            )}
            
            <aside
              ref={sidebarRef}
              id="sidebar-navigation"
              role="navigation"
              aria-label="Main navigation"
              style={{
                width: isMobile ? '280px' : '250px',
                backgroundColor: tokens.colors.background.secondary.value,
                padding: tokens.space.medium.value,
                borderRight: `1px solid ${tokens.colors.border.primary.value}`,
                overflowY: 'auto',
                position: isMobile ? 'fixed' : 'relative',
                top: isMobile ? '0' : 'auto',
                left: isMobile ? '0' : 'auto',
                height: isMobile ? '100vh' : 'auto',
                zIndex: isMobile ? 999 : 'auto',
                transform: isMobile && !isSidebarOpen ? 'translateX(-100%)' : 'translateX(0)',
                transition: 'transform 0.3s ease-in-out'
              }}
            >
              <nav>
                <View marginBottom={tokens.space.large}>
                  <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.medium}>
                    <Heading level={2} margin="none" fontSize={tokens.fontSizes.large}>
                      Navigation
                    </Heading>
                    {isMobile && (
                      <Button
                        variation="link"
                        onClick={() => setIsSidebarOpen(false)}
                        aria-label="Close navigation menu"
                        size="small"
                      >
                        <Icon
                          ariaLabel=""
                          pathData="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
                        />
                      </Button>
                    )}
                  </Flex>
                  <Divider marginBottom={tokens.space.medium} />
                  
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    <li style={{ marginBottom: tokens.space.small.value }}>
                      <Link to="/dashboard" style={{ textDecoration: 'none', display: 'block' }}>
                        <Button
                          variation={location.pathname === '/dashboard' ? 'primary' : 'link'}
                          size="large"
                          aria-current={location.pathname === '/dashboard' ? 'page' : undefined}
                          style={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            width: '100%',
                            padding: tokens.space.small.value
                          }}
                        >
                          Dashboard
                        </Button>
                      </Link>
                    </li>
                    
                    <li style={{ marginBottom: tokens.space.small.value }}>
                      <Link to="/projects" style={{ textDecoration: 'none', display: 'block' }}>
                        <Button
                          variation={location.pathname === '/projects' ? 'primary' : 'link'}
                          size="large"
                          aria-current={location.pathname === '/projects' ? 'page' : undefined}
                          style={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            width: '100%',
                            padding: tokens.space.small.value
                          }}
                        >
                          Projects
                        </Button>
                      </Link>
                    </li>
                    
                    <li style={{ marginBottom: tokens.space.small.value }}>
                      <Link to="/create-project" style={{ textDecoration: 'none', display: 'block' }}>
                        <Button
                          variation={location.pathname === '/create-project' ? 'primary' : 'link'}
                          size="large"
                          aria-current={location.pathname === '/create-project' ? 'page' : undefined}
                          style={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            width: '100%',
                            padding: tokens.space.small.value
                          }}
                        >
                          Create Project
                        </Button>
                      </Link>
                    </li>
                  </ul>
                </View>
              </nav>
            </aside>
          </>
        )}

        {/* Main Content */}
        <main
          ref={mainContentRef}
          id="main-content"
          role="main"
          tabIndex={-1}
          style={{
            flex: 1,
            padding: isMobile ? tokens.space.medium.value : tokens.space.large.value,
            overflowY: 'auto',
            backgroundColor: tokens.colors.background.tertiary.value,
            outline: 'none'
          }}
        >
          {children}
        </main>
      </Flex>
    </Flex>
  );
};

export default DashboardLayout;