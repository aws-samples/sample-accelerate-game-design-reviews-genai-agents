import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  View,
  Heading,
  Text,
  Card,
  TextField,
  TextAreaField,
  SelectField,
  Button,
  Flex,
  Alert,
  Divider,
  useTheme
} from '@aws-amplify/ui-react';
import { graphqlClient } from '../services/graphqlClient';
import { ProjectStatus, DocumentType } from '../types/graphql';
import type { CreateProjectInput, CreateDocumentInput } from '../types/graphql';
import { useFormSubmission } from '../hooks';
import { useNotification } from '../contexts';
import { ProgressIndicator } from '../components';

interface FormData {
  name: string;
  description: string;
  documentTitle: string;
  documentContent: string;
  documentType: DocumentType;
  collaborators: string;
  memoryEnabled: boolean;
  selectedAgents: string[];
}

interface FormErrors {
  name?: string;
  documentTitle?: string;
  documentContent?: string;
  collaborators?: string;
  general?: string;
}

const CreateProjectPage: React.FC = () => {
  const { tokens } = useTheme();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [formData, setFormData] = useState<FormData>({
    name: 'New World: Elven Expansion Design Document',
    description: `The introduction of Elves represents a major expansion to New Worlds playable races. This addition will enrich Aeternum's existing setting while providing players with new gameplay opportunities and deeper lore connections to the ancient history of the island.`,
    documentTitle: 'New World: Elven Expansion Design Document',
    documentContent: '',
    documentType: DocumentType.TEXT,
    collaborators: '',
    memoryEnabled: true,
    selectedAgents: ['analyst'] // Default to analyst agent
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('');

  // Memoize callback functions to prevent infinite loops
  const handleSuccess = useCallback((result: any) => {
    showSuccess('Project Created', `Project "${result.name}" created successfully!`);
    navigate('/projects');
  }, [showSuccess, navigate]);

  const handleError = useCallback((error: any) => {
    showError('Creation Failed', error.message);
  }, [showError]);

  // Use the form submission hook
  const { isLoading: isSubmitting, submitForm } = useFormSubmission({
    onSuccess: handleSuccess,
    onError: handleError
  });

  // Progress steps for project creation
  const progressSteps = [
    { id: 'validate', label: 'Validating form data', status: 'pending' as const },
    { id: 'create-project', label: 'Creating project', status: 'pending' as const },
    { id: 'upload-document', label: 'Processing document', status: 'pending' as const },
    { id: 'start-analysis', label: 'Starting AI analysis', status: 'pending' as const }
  ];

  // Form validation
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Project name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 3) {
      newErrors.name = 'Project name must be at least 3 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Project name must be less than 100 characters';
    }

    // Document title validation
    if (!formData.documentTitle.trim()) {
      newErrors.documentTitle = 'Document title is required';
    } else if (formData.documentTitle.trim().length > 200) {
      newErrors.documentTitle = 'Document title must be less than 200 characters';
    }

    // Document content validation
    if (!formData.documentContent.trim() && !uploadedFile) {
      newErrors.documentContent = 'Document content or file upload is required';
    } else if (formData.documentContent.trim().length > 50000) {
      newErrors.documentContent = 'Document content must be less than 50,000 characters';
    }

    // Collaborators validation (optional but must be valid emails if provided)
    if (formData.collaborators.trim()) {
      const emails = formData.collaborators.split(',').map(email => email.trim());
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      for (const email of emails) {
        if (email && !emailRegex.test(email)) {
          newErrors.collaborators = 'Please enter valid email addresses separated by commas';
          break;
        }
      }
    }

    // Agent selection validation
    if (formData.selectedAgents.length === 0) {
      newErrors.general = 'Please select at least one agent for initial analysis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form field changes
  const handleInputChange = (field: keyof FormData, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field-specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
    
    // Clear general error when agents are selected
    if (field === 'selectedAgents' && Array.isArray(value) && value.length > 0) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.general;
        return newErrors;
      });
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(prev => ({ 
        ...prev, 
        documentContent: 'File size must be less than 10MB' 
      }));
      return;
    }

    // Validate file type
    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ 
        ...prev, 
        documentContent: 'Only text, PDF, and Word documents are supported' 
      }));
      return;
    }

    setUploadedFile(file);
    setFormData(prev => ({ 
      ...prev, 
      documentType: DocumentType.FILE,
      documentTitle: prev.documentTitle || file.name
    }));

    // Read file content for text files
    if (file.type === 'text/plain') {
      try {
        const content = await file.text();
        setFormData(prev => ({ ...prev, documentContent: content }));
      } catch (error) {
        console.error('Error reading file:', error);
        setErrors(prev => ({ 
          ...prev, 
          documentContent: 'Error reading file content' 
        }));
      }
    } else {
      // For non-text files, we'll store the file name as content placeholder
      setFormData(prev => ({ 
        ...prev, 
        documentContent: `Uploaded file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)` 
      }));
    }

    // Clear any previous errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.documentContent;
      return newErrors;
    });
  };

  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setErrors({});

    await submitForm(formData, async (data: FormData) => {
      // Step 1: Validate
      setCurrentStep('validate');
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate validation time

      // Step 2: Create project
      setCurrentStep('create-project');
      const collaborators = data.collaborators
        .split(',')
        .map(email => email.trim())
        .filter(email => email.length > 0);

      const projectInput: CreateProjectInput = {
        name: data.name.trim(),
        description: data.description.trim() || null,
        status: ProjectStatus.SUBMITTED,
        collaborators: collaborators.length > 0 ? collaborators : null,
        memoryEnabled: data.memoryEnabled,
        selectedAgents: data.selectedAgents
      };

      const projectResult = await graphqlClient.createProject(projectInput);
      const projectData = 'data' in projectResult ? projectResult.data : null;

      if (!projectData?.createProject) {
        throw new Error('Failed to create project');
      }

      const newProject = projectData.createProject;

      // Step 3: Process document
      setCurrentStep('upload-document');
      const documentInput: CreateDocumentInput = {
        title: data.documentTitle.trim(),
        content: data.documentContent.trim(),
        type: data.documentType,
        uploadedAt: new Date().toISOString(),
        projectID: newProject.id
      };

      const documentResult = await graphqlClient.createDocument(documentInput);
      const documentData = 'data' in documentResult ? documentResult.data : null;

      let documentId: string | undefined;
      if (!documentData?.createDocument) {
        // Document creation failed, continuing without document
      } else {
        documentId = documentData.createDocument.id;
        
        // Update project with documentID for efficient lookups
        if (documentId) {
          await graphqlClient.updateProject(newProject.id, {
            documentID: documentId
          });
        }
      }

      // Step 4: Start analysis with selected agents
      // The startAgentSession Lambda will invoke each selected agent and store their responses
      if (data.documentContent.trim() && documentId && data.selectedAgents.length > 0) {
        setCurrentStep('start-analysis');
        try {
          await graphqlClient.startAgentSession(
            newProject.id,
            data.selectedAgents,
            data.memoryEnabled,
            'INITIAL' // Mark as initial session
          );
          console.log(`Session started with ${data.selectedAgents.length} agent(s)`);
          // Note: Project status will be automatically updated to IN_PROGRESS 
          // by the Lambda function after agents complete initial analysis
        } catch (sessionError) {
          console.error('Could not start agent session:', sessionError);
          // Continue even if session start fails
        }
      }

      return newProject;
    });
  };

  // Handle cancel
  const handleCancel = () => {
    navigate('/projects');
  };

  return (
    <View>
      <Heading level={2} marginBottom={tokens.space.large}>
        Create New Project
      </Heading>

      <Card padding={tokens.space.large}>
        <form onSubmit={handleSubmit} noValidate aria-label="Create new project form">
          {/* Progress Indicator */}
          {isSubmitting && (
            <Card marginBottom={tokens.space.medium} padding={tokens.space.medium}>
              <ProgressIndicator
                steps={progressSteps.map(step => ({
                  ...step,
                  status: step.id === currentStep ? 'active' : 
                          progressSteps.findIndex(s => s.id === currentStep) > progressSteps.findIndex(s => s.id === step.id) ? 'completed' : 'pending'
                }))}
                currentStep={currentStep}
                variant="steps"
                aria-label="Project creation progress"
              />
            </Card>
          )}

          {/* General Error Alert */}
          {errors.general && (
            <Alert variation="error" marginBottom={tokens.space.medium}>
              {errors.general}
            </Alert>
          )}

          {/* Project Information Section */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <Heading level={3} marginBottom={tokens.space.medium}>
                Project Information
              </Heading>
            </legend>

            <TextField
              label="Project Name"
              placeholder="Enter a descriptive name for your project"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              hasError={!!errors.name}
              errorMessage={errors.name}
              isRequired
              marginBottom={tokens.space.medium}
            />

            <TextAreaField
              label="Description (Optional)"
              placeholder="Provide additional context about your project and what you want to analyze"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              marginBottom={tokens.space.medium}
            />

            <TextField
              label="Collaborators (Optional)"
              placeholder="Enter email addresses separated by commas"
              value={formData.collaborators}
              onChange={(e) => handleInputChange('collaborators', e.target.value)}
              hasError={!!errors.collaborators}
              errorMessage={errors.collaborators}
              descriptiveText="Add team members who should have access to this project"
            />
          </fieldset>

          <Divider marginBottom={tokens.space.large} />

          {/* Document Section */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <Heading level={3} marginBottom={tokens.space.medium}>
                Document for Analysis
              </Heading>
            </legend>

            <TextField
              label="Document Title"
              placeholder="Enter a title for your document"
              value={formData.documentTitle}
              onChange={(e) => handleInputChange('documentTitle', e.target.value)}
              hasError={!!errors.documentTitle}
              errorMessage={errors.documentTitle}
              isRequired
              marginBottom={tokens.space.medium}
            />

            <SelectField
              label="Document Type"
              value={formData.documentType}
              onChange={(e) => handleInputChange('documentType', e.target.value as DocumentType)}
              marginBottom={tokens.space.medium}
            >
              <option value={DocumentType.TEXT}>Text Content</option>
              <option value={DocumentType.FILE}>File Upload</option>
            </SelectField>

            {formData.documentType === DocumentType.TEXT ? (
              <TextAreaField
                label="Document Content"
                placeholder="Paste or type your document content here for AI analysis"
                value={formData.documentContent}
                onChange={(e) => handleInputChange('documentContent', e.target.value)}
                hasError={!!errors.documentContent}
                errorMessage={errors.documentContent}
                isRequired
                rows={10}
                descriptiveText="Maximum 50,000 characters"
              />
            ) : (
              <View>
                <Text fontSize={tokens.fontSizes.medium} fontWeight="bold" marginBottom={tokens.space.small}>
                  Upload Document
                </Text>
                <input
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  style={{
                    padding: tokens.space.small.value,
                    border: `1px solid ${tokens.colors.border.primary.value}`,
                    borderRadius: tokens.radii.small.value,
                    width: '100%',
                    marginBottom: tokens.space.small.value
                  }}
                />
                <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                  Supported formats: TXT, PDF, DOC, DOCX (max 10MB)
                </Text>
                
                {uploadedFile && (
                  <Alert variation="info" marginTop={tokens.space.small}>
                    File selected: {uploadedFile.name} ({(uploadedFile.size / 1024).toFixed(1)} KB)
                  </Alert>
                )}
                
                {errors.documentContent && (
                  <Text color={tokens.colors.font.error} fontSize={tokens.fontSizes.small} marginTop={tokens.space.xs}>
                    {errors.documentContent}
                  </Text>
                )}
              </View>
            )}
          </fieldset>

          <Divider marginBottom={tokens.space.large} />

          {/* Agent Configuration Section */}
          <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
            <legend>
              <Heading level={3} marginBottom={tokens.space.medium}>
                Agent Configuration
              </Heading>
            </legend>

            {/* Agent Selection - Compact Row Layout */}
            <View marginBottom={tokens.space.medium}>
              <Text fontSize={tokens.fontSizes.medium} fontWeight="bold" marginBottom={tokens.space.small}>
                Select Agents for Initial Analysis
              </Text>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                Choose which specialized agents should analyze your document
              </Text>
              
              <Flex 
                direction="row" 
                wrap="wrap" 
                gap={tokens.space.small}
                marginBottom={tokens.space.small}
              >
                {[
                  { value: 'gameplay', label: 'Gameplay', icon: '🎮' },
                  { value: 'lore', label: 'Lore', icon: '📖' },
                  { value: 'strategic', label: 'Strategic', icon: '🔍' },
                  { value: 'analyst', label: 'Analyst', icon: '📊' },
                ].map((agent) => {
                  const isSelected = formData.selectedAgents.includes(agent.value);
                  const isAnalyst = agent.value === 'analyst';
                  const analystSelected = formData.selectedAgents.includes('analyst');
                  
                  // Disable other agents if Analyst is selected
                  // Disable Analyst if other agents are selected
                  const isDisabled = isAnalyst 
                    ? formData.selectedAgents.some(a => a !== 'analyst')
                    : analystSelected;
                  
                  return (
                    <label 
                      key={agent.value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        border: isSelected ? '2px solid' : '1px solid',
                        borderColor: isSelected 
                          ? tokens.colors.border.focus.value 
                          : tokens.colors.border.primary.value,
                        borderRadius: tokens.radii.small.value,
                        backgroundColor: isSelected
                          ? tokens.colors.background.secondary.value
                          : tokens.colors.background.primary.value,
                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        flex: '1 1 auto',
                        minWidth: '140px',
                        opacity: isDisabled ? 0.3 : (isSelected ? 1 : 0.5)
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        disabled={isDisabled}
                        onChange={(e) => {
                          if (isAnalyst) {
                            // If selecting Analyst, clear all other selections
                            handleInputChange('selectedAgents', e.target.checked ? ['analyst'] : []);
                          } else {
                            // For other agents, normal multi-select behavior
                            const newAgents = e.target.checked
                              ? [...formData.selectedAgents, agent.value]
                              : formData.selectedAgents.filter(a => a !== agent.value);
                            handleInputChange('selectedAgents', newAgents);
                          }
                        }}
                        style={{ 
                          width: '18px', 
                          height: '18px', 
                          cursor: isDisabled ? 'not-allowed' : 'pointer' 
                        }}
                      />
                      <span style={{ fontSize: '20px', opacity: isDisabled ? 0.3 : (isSelected ? 1 : 0.6) }}>{agent.icon}</span>
                      <Text fontWeight="bold" fontSize={tokens.fontSizes.small}>
                        {agent.label}
                      </Text>
                    </label>
                  );
                })}
              </Flex>

              <Flex justifyContent="space-between" alignItems="center">
                <Flex gap={tokens.space.small}>
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => handleInputChange('selectedAgents', ['gameplay', 'lore', 'strategic'])}
                    isDisabled={formData.selectedAgents.includes('analyst')}
                  >
                    Select All (except Analyst)
                  </Button>
                  <Button
                    size="small"
                    variation="link"
                    onClick={() => handleInputChange('selectedAgents', [])}
                  >
                    Clear
                  </Button>
                </Flex>
                {formData.selectedAgents.length > 0 && (
                  <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                    {formData.selectedAgents.length} agent{formData.selectedAgents.length > 1 ? 's' : ''} selected
                  </Text>
                )}
              </Flex>

              {formData.selectedAgents.length === 0 && (
                <Alert variation="warning" marginTop={tokens.space.small}>
                  Please select at least one agent
                </Alert>
              )}
            </View>

            {/* Memory Toggle */}
            <View>
              <Text fontSize={tokens.fontSizes.medium} fontWeight="bold" marginBottom={tokens.space.small}>
                Memory Configuration
              </Text>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginBottom={tokens.space.medium}>
                Control how agents maintain conversation context
              </Text>
              
              <Flex direction="row" gap={tokens.space.small}>
                {[
                  { 
                    value: true, 
                    label: 'Memory Enabled', 
                    icon: '🧠',
                    description: 'Agents remember context automatically'
                  },
                  { 
                    value: false, 
                    label: 'Full Context', 
                    icon: '📄',
                    description: 'Send full history each time'
                  },
                ].map((option) => {
                  const isSelected = formData.memoryEnabled === option.value;
                  return (
                    <label 
                      key={String(option.value)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        border: isSelected ? '2px solid' : '1px solid',
                        borderColor: isSelected 
                          ? tokens.colors.border.focus.value 
                          : tokens.colors.border.primary.value,
                        borderRadius: tokens.radii.small.value,
                        backgroundColor: isSelected
                          ? tokens.colors.background.secondary.value
                          : tokens.colors.background.primary.value,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        flex: '1 1 auto',
                        opacity: isSelected ? 1 : 0.5
                      }}
                    >
                      <input
                        type="radio"
                        name="memoryEnabled"
                        checked={isSelected}
                        onChange={() => handleInputChange('memoryEnabled', option.value)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '20px', opacity: isSelected ? 1 : 0.6 }}>{option.icon}</span>
                      <Flex direction="column" flex="1">
                        <Text fontWeight="bold" fontSize={tokens.fontSizes.small}>
                          {option.label}
                        </Text>
                        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                          {option.description}
                        </Text>
                      </Flex>
                    </label>
                  );
                })}
              </Flex>
            </View>
          </fieldset>

          {/* Action Buttons */}
          <Flex justifyContent="flex-end" gap={tokens.space.medium}>
            <Button
              type="button"
              variation="link"
              onClick={handleCancel}
              isDisabled={isSubmitting}
            >
              Cancel
            </Button>
            
            <Button
              type="submit"
              variation="primary"
              isLoading={isSubmitting}
              loadingText="Creating Project..."
              isDisabled={isSubmitting}
            >
              Create Project
            </Button>
          </Flex>
        </form>
      </Card>

      {/* Help Section */}
      <Card padding={tokens.space.medium} marginTop={tokens.space.medium}>
        <Heading level={5} marginBottom={tokens.space.small}>
          What happens next?
        </Heading>
        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
          After creating your project, the selected AI agents will analyze your document and provide specialized insights. 
          Each agent brings unique expertise:
        </Text>
        <ul style={{ marginTop: '8px', marginLeft: '20px', fontSize: tokens.fontSizes.small.value }}>
          <li><strong>Gameplay Agent:</strong> Analyzes game mechanics, balance, and player experience</li>
          <li><strong>Lore Agent:</strong> Evaluates narrative, world-building, and storytelling</li>
          <li><strong>Strategic Agent:</strong> Provides strategic insights and competitive analysis</li>
          <li><strong>Analyst Agent:</strong> Performs detailed technical and design analysis</li>
        </ul>
        <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary} marginTop={tokens.space.small}>
          You can chat with any agent, switch between them, and toggle memory mode at any time during your session.
        </Text>
      </Card>
    </View>
  );
};

export default CreateProjectPage;