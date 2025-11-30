import React from 'react';
import {
  View,
  Flex,
  Text,
  Button,
  Alert,
  useTheme,
  Heading
} from '@aws-amplify/ui-react';
import type { Project } from '../types/graphql';

interface DeleteProjectDialogProps {
  project: Project;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteProjectDialog: React.FC<DeleteProjectDialogProps> = ({
  project,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel
}) => {
  const { tokens } = useTheme();

  if (!isOpen) return null;

  return (
    <View
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      backgroundColor="rgba(0, 0, 0, 0.5)"
      style={{
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      onClick={onCancel}
    >
      <View
        backgroundColor={tokens.colors.background.primary}
        padding={tokens.space.large}
        borderRadius={tokens.radii.medium}
        maxWidth="500px"
        width="90%"
        style={{ boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <Heading level={4} marginBottom={tokens.space.medium}>
          Delete Project
        </Heading>

        <Alert variation="error" marginBottom={tokens.space.medium}>
          <Text fontWeight="bold">Warning: This action cannot be undone!</Text>
        </Alert>

        <Text marginBottom={tokens.space.medium}>
          Are you sure you want to delete the project <strong>"{project.name}"</strong>?
        </Text>

        <Text 
          fontSize={tokens.fontSizes.small} 
          color={tokens.colors.font.secondary}
          marginBottom={tokens.space.large}
        >
          This will permanently delete:
        </Text>

        <View 
          marginBottom={tokens.space.large}
          paddingLeft={tokens.space.medium}
        >
          <Text fontSize={tokens.fontSizes.small}>• The project</Text>
          <Text fontSize={tokens.fontSizes.small}>• All documents</Text>
          <Text fontSize={tokens.fontSizes.small}>• All chat sessions</Text>
          <Text fontSize={tokens.fontSizes.small}>• All messages</Text>
          <Text fontSize={tokens.fontSizes.small}>• All summaries</Text>
        </View>

        <Flex gap={tokens.space.small} justifyContent="flex-end">
          <Button
            variation="link"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variation="destructive"
            onClick={onConfirm}
            isLoading={isDeleting}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Project'}
          </Button>
        </Flex>
      </View>
    </View>
  );
};

export default DeleteProjectDialog;
