import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Amplify } from 'aws-amplify'
import { ThemeProvider } from '@aws-amplify/ui-react'
import amplifyOutputs from './amplify_outputs.json'
import { AuthProvider, NotificationProvider } from './contexts'
import { DashboardLayout, ProtectedRoute, ErrorBoundary, LoadingSpinner } from './components'
import './App.css'
import '@aws-amplify/ui-react/styles.css'

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProjectListPage = lazy(() => import('./pages/ProjectListPage'))
const CreateProjectPage = lazy(() => import('./pages/CreateProjectPage'))
const ProjectDetailPage = lazy(() => import('./pages/ProjectDetailPage'))

// Configure Amplify
Amplify.configure(amplifyOutputs)

function App() {

  return (
    <ThemeProvider>
      <ErrorBoundary>
        <NotificationProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  {/* Public route for login */}
                  <Route path="/login" element={<LoginPage />} />
                
                {/* Protected routes wrapped in DashboardLayout */}
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <DashboardPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/projects" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ProjectListPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/create-project" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <CreateProjectPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                <Route path="/projects/:id" element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <ProjectDetailPage />
                    </DashboardLayout>
                  </ProtectedRoute>
                } />
                
                {/* Default redirect to dashboard */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                
                  {/* Catch all route - redirect to dashboard */}
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Suspense>
            </Router>
          </AuthProvider>
        </NotificationProvider>
      </ErrorBoundary>
    </ThemeProvider>
  )
}

export default App
