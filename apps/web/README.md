# The Exicon Project - Web App

A clean, blank slate web application built with Next.js and MongoDB.

## Features

- **Next.js Framework**: Fast, server-rendered React applications
- **MongoDB Integration**: Ready-to-use database connection
- **Authentication**: Set up with NextAuth.js 
- **Tailwind CSS**: Utility-first CSS framework
- **TypeScript**: Type safety throughout the codebase

## Getting Started

1. **Install dependencies**

```bash
pnpm install
```

2. **Set up environment variables**

Create a `.env` file in the root directory with the following variables:

```
MONGODB_URI=your_mongodb_connection_string
NEXTAUTH_SECRET=your_nextauth_secret
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
```

3. **Run the development server**

```bash
pnpm dev
```

Your application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

- `/pages`: Next.js pages and API routes
- `/components`: Reusable React components
- `/lib`: Utility functions and shared code
- `/styles`: Global CSS and Tailwind configuration
- `/public`: Static assets

## API Routes

The application includes a basic API endpoint:

- `GET /api/hello`: Basic health check, returns MongoDB connection status

## MongoDB Setup

This project uses MongoDB for data storage. The database connection is established in `lib/mongodb.ts` using the MongoDB Node.js driver.