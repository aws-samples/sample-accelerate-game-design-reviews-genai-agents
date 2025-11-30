import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  View,
  Heading,
  Text,
  Card,
  Button,
  SearchField,
  SelectField,
  Flex,
  Grid,
  Badge,
  Alert,
  useTheme
} from '@aws-amplify/ui-react';
import { graphqlClient } from '../services/graphqlClient';
import type { Project } from '../types/graphql';
import { ProjectStatus } from '../types/graphql';
import { useDataFetching } from '../hooks';
import { useNotification } from '../contexts';
import { SkeletonLoader } from '../components';

interface ProjectCardProps {
  project: Project;
  'aria-label'?: string;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, 'aria-label': ariaLabel }) => {
  const { tokens } = useTheme();

  const getStatusColor = (status: string) => {
    switch (status) {
      case ProjectStatus.COMPLETED:
        return 'success';
      case ProjectStatus.IN_PROGRESS:
        return 'warning';
      case ProjectStatus.SUBMITTED:
        return 'info';
      default:
        return 'info';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <Card
      padding={tokens.space.medium}
      role="article"
      aria-label={ariaLabel}
      style={{
        cursor: 'pointer',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
    >
      <Flex direction="column" gap={tokens.space.small}>
        <Flex justifyContent="space-between" alignItems="flex-start">
          <Heading level={3} margin="none" style={{ flex: 1 }}>
            {project.name}
          </Heading>
          <Badge 
            variation={getStatusColor(project.status)} 
            size="small"
            aria-label={`Project status: ${project.status.toLowerCase()}`}
          >
            {project.status.toLowerCase()}
          </Badge>
        </Flex>

        {project.description && (
          <Text
            fontSize={tokens.fontSizes.small}
            color={tokens.colors.font.secondary}
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {project.description}
          </Text>
        )}

        <Flex direction="column" gap={tokens.space.xs}>
          <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.tertiary}>
            Created: {formatDate(project.createdAt)}
          </Text>
          
          {project.document && (
            <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.tertiary}>
              Document: {project.document.title}
            </Text>
          )}

          {project.collaborators && project.collaborators.length > 0 && (
            <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.tertiary}>
              Collaborators: {project.collaborators.length}
            </Text>
          )}
        </Flex>

        <Flex justifyContent="space-between" alignItems="center" marginTop={tokens.space.small}>
          <Link to={`/projects/${project.id}`} style={{ textDecoration: 'none' }}>
            <Button 
              size="small" 
              variation="primary"
              aria-label={`View details for ${project.name}`}
            >
              View Details
            </Button>
          </Link>
          
          {project.status === ProjectStatus.COMPLETED && (
            <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.success}>
              ✓ Analysis Complete
            </Text>
          )}
          
          {project.status === ProjectStatus.IN_PROGRESS && (
            <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.warning}>
              🔄 Chat Ready
            </Text>
          )}
          
          {project.status === ProjectStatus.SUBMITTED && (
            <Text fontSize={tokens.fontSizes.xs} color={tokens.colors.font.info}>
              ⏳ Waiting for Chat
            </Text>
          )}
        </Flex>
      </Flex>
    </Card>
  );
};

const ProjectListPage: React.FC = () => {
  const { tokens } = useTheme();
  const { showError, showSuccess } = useNotification();
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);

  // Memoize the error handler to prevent infinite loops
  const handleError = useCallback((error: any) => {
    showError('Failed to Load Projects', error.message);
  }, [showError]);

  // Use data fetching hook
  const { 
    isLoading, 
    error, 
    data: projects, 
    fetchData, 
    refetch 
  } = useDataFetching<Project[]>({
    initialData: [],
    onError: handleError
  });

  // Memoize the load projects function
  const loadProjects = useCallback(async () => {
    const result = await graphqlClient.listProjects();
    const projectsData = 'data' in result ? result.data : null;
    
    if (projectsData?.listProjects?.items) {
      const projectsList = projectsData.listProjects.items.filter(Boolean) as Project[];
      return projectsList;
    } else {
      return [];
    }
  }, []);

  // Load projects on component mount
  useEffect(() => {
    fetchData(loadProjects);
  }, [fetchData, loadProjects]);

  // Filter projects based on search term and status
  useEffect(() => {
    if (!projects) return;
    
    let filtered = projects;

    // Apply search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((project: Project) =>
        project.name.toLowerCase().includes(searchLower) ||
        (project.description && project.description.toLowerCase().includes(searchLower)) ||
        (project.document?.title && project.document.title.toLowerCase().includes(searchLower))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((project: Project) => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleStatusFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
  };

  const getProjectStats = () => {
    if (!projects) return { total: 0, completed: 0, inProgress: 0, submitted: 0 };
    
    const total = projects.length;
    const completed = projects.filter((p: Project) => p.status === ProjectStatus.COMPLETED).length;
    const inProgress = projects.filter((p: Project) => p.status === ProjectStatus.IN_PROGRESS).length;
    const submitted = projects.filter((p: Project) => p.status === ProjectStatus.SUBMITTED).length;

    return { total, completed, inProgress, submitted };
  };

  const stats = getProjectStats();

  // Handle delete all projects
  const handleDeleteAll = async () => {
    if (!projects || projects.length === 0) return;

    setIsDeletingAll(true);
    try {
      // Delete all projects in parallel
      const deletePromises = projects.map((project: Project) => 
        graphqlClient.deleteProjectCascade(project.id)
      );
      
      await Promise.all(deletePromises);
      
      showSuccess('All Projects Deleted', `Successfully deleted ${projects.length} project(s)`);
      
      // Refresh the project list
      await refetch(loadProjects);
      
      setShowDeleteAllDialog(false);
    } catch (error: any) {
      console.error('Error deleting all projects:', error);
      showError('Delete Failed', 'Failed to delete all projects. Some projects may have been deleted.');
      
      // Refresh to show current state
      await refetch(loadProjects);
    } finally {
      setIsDeletingAll(false);
    }
  };

  return (
    <View>
      <Flex justifyContent="space-between" alignItems="center" marginBottom={tokens.space.large}>
        <Heading level={2} margin="none">
          Projects
        </Heading>
        <Flex gap={tokens.space.small}>
          {projects && projects.length > 0 && (
            <Button 
              variation="destructive" 
              isDisabled={isLoading}
              onClick={() => setShowDeleteAllDialog(true)}
            >
              Delete All Projects
            </Button>
          )}
          <Link to="/create-project" style={{ textDecoration: 'none' }}>
            <Button variation="primary" isDisabled={isLoading}>
              Create New Project
            </Button>
          </Link>
        </Flex>
      </Flex>

      {error && (
        <Alert 
          variation="error" 
          marginBottom={tokens.space.medium}
          isDismissible={true}
          onDismiss={() => refetch(async () => {
            const result = await graphqlClient.listProjects();
            const projectsData = 'data' in result ? result.data : null;
            
            if (projectsData?.listProjects?.items) {
              return projectsData.listProjects.items.filter(Boolean) as Project[];
            } else {
              return [];
            }
          })}
        >
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading ? (
        <View>
          {/* Stats skeleton */}
          <Grid
            templateColumns="repeat(auto-fit, minmax(200px, 1fr))"
            gap={tokens.space.medium}
            marginBottom={tokens.space.large}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonLoader key={i} variant="card" />
            ))}
          </Grid>
          
          {/* Search skeleton */}
          <Card padding={tokens.space.medium} marginBottom={tokens.space.large}>
            <SkeletonLoader variant="text" />
          </Card>
          
          {/* Projects skeleton */}
          <Grid
            templateColumns="repeat(auto-fill, minmax(350px, 1fr))"
            gap={tokens.space.medium}
          >
            <SkeletonLoader variant="project" count={6} />
          </Grid>
        </View>
      ) : (
        <>
          {/* Project Statistics */}
          <Grid
            templateColumns="repeat(auto-fit, minmax(200px, 1fr))"
            gap={tokens.space.medium}
            marginBottom={tokens.space.large}
          >
            <Card padding={tokens.space.medium}>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Total Projects
              </Text>
              <Heading level={3} margin="none" color={tokens.colors.font.primary}>
                {stats.total}
              </Heading>
            </Card>
            
            <Card padding={tokens.space.medium}>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Completed
              </Text>
              <Heading level={3} margin="none" color={tokens.colors.font.success}>
                {stats.completed}
              </Heading>
            </Card>
            
            <Card padding={tokens.space.medium}>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Chat Ready
              </Text>
              <Heading level={3} margin="none" color={tokens.colors.font.warning}>
                {stats.inProgress}
              </Heading>
            </Card>
            
            <Card padding={tokens.space.medium}>
              <Text fontSize={tokens.fontSizes.small} color={tokens.colors.font.secondary}>
                Waiting for Chat
              </Text>
              <Heading level={3} margin="none" color={tokens.colors.font.info}>
                {stats.submitted}
              </Heading>
            </Card>
          </Grid>

          {/* Search and Filter Controls */}
          <Card padding={tokens.space.medium} marginBottom={tokens.space.large}>
            <form role="search" aria-label="Search and filter projects">
              <Flex direction={{ base: 'column', medium: 'row' }} gap={tokens.space.medium}>
                <SearchField
                  label="Search projects"
                  placeholder="Search by name, description, or document..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  style={{ flex: 1 }}
                  aria-describedby="search-help"
                />
                
                <SelectField
                  label="Filter by status"
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  style={{ minWidth: '200px' }}
                  aria-label="Filter projects by status"
                >
                  <option value="all">All Statuses</option>
                  <option value={ProjectStatus.SUBMITTED}>Waiting for Chat</option>
                  <option value={ProjectStatus.IN_PROGRESS}>Chat Ready</option>
                  <option value={ProjectStatus.COMPLETED}>Completed</option>
                </SelectField>
              </Flex>
              
              <Text 
                id="search-help"
                fontSize={tokens.fontSizes.xs} 
                color={tokens.colors.font.tertiary}
                marginTop={tokens.space.xs}
              >
                Search across project names, descriptions, and document titles
              </Text>
            </form>
          </Card>

          {/* Projects Grid */}
          {filteredProjects.length === 0 ? (
            <Card padding={tokens.space.large} textAlign="center" role="region" aria-label="No projects message">
              {projects && projects.length === 0 ? (
                <View>
                  <Heading level={3} marginBottom={tokens.space.medium}>
                    No Projects Yet
                  </Heading>
                  <Text marginBottom={tokens.space.medium} color={tokens.colors.font.secondary}>
                    Get started by creating your first project for AI analysis.
                  </Text>
                  <Link to="/create-project" style={{ textDecoration: 'none' }}>
                    <Button variation="primary" aria-label="Create your first project">
                      Create Your First Project
                    </Button>
                  </Link>
                </View>
              ) : (
                <View>
                  <Heading level={3} marginBottom={tokens.space.medium}>
                    No Projects Found
                  </Heading>
                  <Text color={tokens.colors.font.secondary}>
                    No projects match your current search and filter criteria.
                  </Text>
                </View>
              )}
            </Card>
          ) : (
            <Grid
              templateColumns="repeat(auto-fill, minmax(min(350px, 100%), 1fr))"
              gap={tokens.space.medium}
              role="region"
              aria-label={`${filteredProjects.length} projects found`}
            >
              {filteredProjects.map((project, index) => (
                <ProjectCard 
                  key={project.id} 
                  project={project}
                  aria-label={`Project ${index + 1} of ${filteredProjects.length}: ${project.name}`}
                />
              ))}
            </Grid>
          )}

          {/* Results Summary */}
          {filteredProjects.length > 0 && projects && (
            <Text
              fontSize={tokens.fontSizes.small}
              color={tokens.colors.font.secondary}
              textAlign="center"
              marginTop={tokens.space.large}
            >
              Showing {filteredProjects.length} of {projects.length} projects
            </Text>
          )}
        </>
      )}

      {/* Delete All Confirmation Dialog */}
      {showDeleteAllDialog && (
        <View
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          backgroundColor="rgba(0, 0, 0, 0.5)"
          style={{ zIndex: 1000 }}
          onClick={() => !isDeletingAll && setShowDeleteAllDialog(false)}
        >
          <Flex
            justifyContent="center"
            alignItems="center"
            height="100%"
            padding={tokens.space.medium}
          >
            <Card
              padding={tokens.space.large}
              maxWidth="500px"
              onClick={(e) => e.stopPropagation()}
            >
              <Heading level={3} marginBottom={tokens.space.medium}>
                Delete All Projects?
              </Heading>
              
              <Alert variation="warning" marginBottom={tokens.space.medium}>
                This action cannot be undone!
              </Alert>
              
              <Text marginBottom={tokens.space.medium}>
                You are about to permanently delete <strong>{projects?.length || 0} project(s)</strong> and all associated data including:
              </Text>
              
              <View
                as="ul"
                marginBottom={tokens.space.medium}
                paddingLeft={tokens.space.large}
              >
                <li>Documents</li>
                <li>Chat sessions</li>
                <li>Messages</li>
                <li>Session summaries</li>
              </View>
              
              <Text marginBottom={tokens.space.large} fontWeight="bold">
                Are you absolutely sure you want to delete all {projects?.length || 0} projects?
              </Text>
              
              <Flex gap={tokens.space.small} justifyContent="flex-end">
                <Button
                  variation="link"
                  onClick={() => setShowDeleteAllDialog(false)}
                  isDisabled={isDeletingAll}
                >
                  Cancel
                </Button>
                <Button
                  variation="destructive"
                  onClick={handleDeleteAll}
                  isLoading={isDeletingAll}
                  loadingText="Deleting..."
                >
                  Delete All Projects
                </Button>
              </Flex>
            </Card>
          </Flex>
        </View>
      )}
    </View>
  );
};

export default ProjectListPage;