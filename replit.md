# Student GPA Calculator Application

## Overview

This is a modern full-stack student application built with React/TypeScript frontend and Node.js/Express backend. The application provides comprehensive GPA and CGPA management with persistence, history tracking, AI-powered study assistance, and additional academic tools. The system features a clean, iOS-inspired UI design and includes user authentication, profile management, and various student-focused utilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing with protected route patterns
- **UI Framework**: shadcn/ui components with Radix UI primitives and Tailwind CSS
- **State Management**: TanStack Query (React Query) for server state management
- **Authentication**: Context-based auth provider with JWT token handling
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Mobile-First Design**: Responsive design with bottom navigation pattern

### Backend Architecture
- **Runtime**: Node.js with Express.js REST API
- **Authentication**: Passport.js with local strategy using scrypt password hashing
- **Session Management**: Express sessions with PostgreSQL store
- **Database ORM**: Drizzle ORM with type-safe schema definitions
- **API Design**: RESTful endpoints with consistent error handling
- **Rate Limiting**: Express rate limiter for authentication and AI endpoints
- **Development**: Hot-reload with Vite middleware integration

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless with connection pooling
- **ORM**: Drizzle ORM with automatic migrations via drizzle-kit
- **Session Store**: PostgreSQL-backed session storage using connect-pg-simple
- **Schema**: Type-safe database schemas with Zod validation integration

### Authentication and Authorization
- **Strategy**: Passport.js Local Strategy with email/password authentication
- **Password Security**: Scrypt-based password hashing with random salt generation
- **Session Management**: Secure HTTP-only cookies with configurable expiration
- **Route Protection**: Middleware-based authentication checks for protected routes
- **User Roles**: Support for student and teacher roles with extensible permission system

### External Dependencies
- **AI Integration**: OpenAI API for study assistance and career recommendations
- **UI Components**: Radix UI primitives for accessible component foundation
- **Icons**: Lucide React for consistent iconography
- **Fonts**: Google Fonts integration (DM Sans, Geist Mono, Fira Code)
- **Development Tools**: 
  - Replit integration for development environment
  - ESBuild for production bundling
  - TypeScript for type safety
  - PostCSS with Autoprefixer for CSS processing

### Key Features Architecture
- **GPA Management**: Semester-based GPA calculation with CGPA tracking and historical records
- **AI Study Assistant**: OpenAI-powered chat interface with conversation history
- **Task Management**: Study planner with due dates and completion tracking
- **Profile System**: User profile management with completion tracking
- **Tools Integration**: Career predictor, class management, and future mobile app support via shared API

### API Structure
- **RESTful Design**: Consistent HTTP methods and status codes
- **Route Organization**: Feature-based route grouping (/api/auth, /api/gpa, /api/ai, etc.)
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Request Validation**: Zod schema validation for request payloads
- **Response Format**: Consistent JSON response structure across all endpoints