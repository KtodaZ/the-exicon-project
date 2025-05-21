// build.js - Helper script to ensure web app is built
const { execSync } = require('child_process');

try {
  console.log('Building web app...');
  execSync('cd apps/web && pnpm build', { stdio: 'inherit' });
  console.log('Web app built successfully!');
} catch (error) {
  console.error('Error building web app:', error);
  process.exit(1);
} 