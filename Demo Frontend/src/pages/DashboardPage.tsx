import React from 'react';
import { View, Heading, Text, Card, useTheme } from '@aws-amplify/ui-react';

const DashboardPage: React.FC = () => {
  const { tokens } = useTheme();

  return (
    <View>
      <Heading level={2} marginBottom={tokens.space.large}>
        Dashboard
      </Heading>
      
      <Card padding={tokens.space.large}>
        <Heading level={3} marginBottom={tokens.space.medium}>
          Welcome to Project Portal
        </Heading>
        <Text>
          This is your dashboard where you can view an overview of your projects and recent activity.
          Use the navigation menu to access different sections of the application.
        </Text>
      </Card>
    </View>
  );
};

export default DashboardPage;