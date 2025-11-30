# Project Portal

A React-based web application for managing AI-powered document analysis projects using AWS Amplify v2.

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/         # Page components and routing
├── services/      # API and external service integrations
├── types/         # TypeScript type definitions
├── contexts/      # React context providers
├── hooks/         # Custom React hooks
├── utils/         # Utility functions
└── assets/        # Static assets
```

## Technology Stack

- **Frontend**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Components**: AWS Amplify UI React
- **Authentication**: AWS Amplify Auth
- **Routing**: React Router v6
- **Type Checking**: TypeScript with strict mode

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build for production:
   ```bash
   npm run build
   ```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Dependencies

### Core Dependencies
- `react` - React library
- `react-dom` - React DOM rendering
- `react-router-dom` - Client-side routing
- `aws-amplify` - AWS Amplify SDK
- `@aws-amplify/ui-react` - Amplify UI components

### Development Dependencies
- `typescript` - TypeScript compiler
- `vite` - Build tool and dev server
- `eslint` - Code linting
- `@vitejs/plugin-react` - Vite React plugin

## TypeScript Configuration

The project uses strict TypeScript configuration with:
- Strict mode enabled
- No unused locals/parameters
- Exact optional property types
- No implicit returns
- Enhanced type checking rules