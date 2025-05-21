import fs from 'fs-extra';
import path from 'path';
import dotenv from 'dotenv';
import { pathToFileURL } from 'url';

// Load environment variables
dotenv.config();

async function checkDependencies() {
  console.log('Checking dependencies for Exicon Enhancer...');
  
  // Check OpenAI API key
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY not found in environment variables');
    console.log('   Please create a .env file with your OpenAI API key:');
    console.log('   OPENAI_API_KEY=your-api-key-here');
  } else {
    console.log('✅ OpenAI API key found');
  }
  
  // Check required dependencies
  const requiredDependencies = [
    { name: 'OpenAI SDK', importPath: 'openai' },
    { name: 'fs-extra', importPath: 'fs-extra' },
    { name: 'dotenv', importPath: 'dotenv' }
  ];
  
  // Check data directory
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    console.log('ℹ️ Data directory not found. Creating one...');
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('✅ Created data directory');
  } else {
    console.log('✅ Data directory exists');
  }
  
  // Check for required dependencies
  console.log('\nChecking npm dependencies:');
  for (const dep of requiredDependencies) {
    try {
      const moduleUrl = pathToFileURL(require.resolve(dep.importPath)).href;
      await import(moduleUrl);
      console.log(`✅ ${dep.name} is installed`);
    } catch (error: unknown) {
      console.error(`❌ ${dep.name} is not installed. Please run: pnpm add ${dep.importPath}`);
    }
  }
  
  // Check for input file
  const inputFile = path.join(dataDir, 'all-exicon-items.json');
  if (!fs.existsSync(inputFile)) {
    console.log(`\n❌ Input file not found: ${inputFile}`);
    console.log('   Please run "pnpm fetch" first to generate the input file');
  } else {
    console.log(`\n✅ Input file exists: ${inputFile}`);
    // Check if there are any items
    try {
      const items = await fs.readJSON(inputFile);
      console.log(`   Found ${items.length} items in the input file`);
    } catch (error) {
      console.error(`❌ Error reading input file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  console.log('\nFor full functionality, make sure you have run:');
  console.log('1. pnpm install - to install all dependencies');
  console.log('2. pnpm build - to compile the TypeScript code');
  console.log('3. pnpm fetch - to fetch the Exicon data');
  console.log('4. pnpm test - to test the enhancer with a small subset');
  console.log('5. pnpm enhance - to enhance all Exicon data');
}

// Execute if this file is run directly
if (require.main === module) {
  checkDependencies().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export default checkDependencies; 