# Data Cleanup Package

A flexible MongoDB data cleanup system using OpenAI APIs for The Exicon Project.

## Overview

This package provides a systematic approach to improving data quality in the exercise database while preserving the original author's voice and F3 culture. It uses OpenAI to suggest improvements, requires human review, and safely applies approved changes.

## Features

- **Flexible Field Cleanup**: Configure cleanup for any field (description, instructions, etc.)
- **AI-Powered Suggestions**: Uses OpenAI to generate contextual improvements
- **Review Workflow**: All changes require human approval before application
- **Batch Processing**: Efficiently process multiple exercises
- **Preserve Culture**: Designed to maintain F3 terminology and community voice

## Setup

1. Install dependencies:
```bash
npm install
```

2. Ensure `.env` file is present with:
```
OPENAI_API_KEY=your_openai_api_key
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=your_database_name
```

3. Build the project:
```bash
npm run build
```

## Usage

### 1. Run Cleanup (Generate Proposals)
```bash
npm run cleanup
```
This analyzes exercises and creates improvement proposals stored in the database.

### 2. Review Proposals
```bash
npm run review
```
Interactive review of pending proposals. You can approve, reject, or skip each suggestion.

### 3. Apply Approved Changes
```bash
npm run apply
```
Applies all approved proposals to the database.

## Configuration

Edit `src/cleanup.ts` to configure different cleanup operations:

```typescript
const cleanupConfig: CleanupConfig = {
  field: 'description',
  prompt: 'Your cleanup instructions...',
  model: 'gpt-4o-mini',
  maxTokens: 300,
  temperature: 0.3,
  batchSize: 5
};
```

## Safety Features

- **Review Required**: All changes require human approval
- **Batch Limits**: Process small batches to avoid overwhelming the system
- **Preserve Original**: Only suggests changes when genuinely beneficial
- **Cultural Awareness**: Prompts specifically preserve F3 culture and terminology

## Example Workflow

```bash
# Generate improvement proposals for descriptions
npm run cleanup

# Review and approve/reject proposals
npm run review

# Apply approved changes to database
npm run apply
```

## Database Collections

- `exercises`: Main exercise collection
- `cleanup_proposals`: Stores pending/approved/rejected proposals

## Development

```bash
# Watch mode for development
npm run dev

# Type checking
npm run check-types

# Linting
npm run lint
```