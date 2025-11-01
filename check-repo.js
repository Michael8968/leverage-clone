const fs = require('fs');
const path = require('path');

const checks = [];
let hasError = false;

function check(message, callback) {
  checks.push({ message, callback });
}

function runChecks() {
  console.log('Running repository checks for TCB deployment...\n');
  checks.forEach(({ message, callback }) => {
    try {
      const result = callback();
      if (result && result.error) {
        console.error(`❌ FAILED: ${message}`);
        console.error(`   └─> ${result.error}\n`);
        hasError = true;
      } else {
        console.log(`✅ PASSED: ${message}\n`);
      }
    } catch (e) {
      console.error(`❌ ERROR during check: ${message}`);
      console.error(`   └─> ${e.message}\n`);
      hasError = true;
    }
  });

  if (hasError) {
    console.error('Check failed. Please fix the issues above before deploying.');
    process.exit(1);
  } else {
    console.log('All checks passed. Repository is ready for deployment.');
  }
}

// 1. Check for Dockerfile
check('Dockerfile exists at the root.', () => {
  if (!fs.existsSync(path.join(__dirname, 'Dockerfile'))) {
    return { error: 'Dockerfile is missing from the project root.' };
  }
});

// 2. Check package.json dependencies
check('package.json contains necessary dependencies.', () => {
  const packageJsonPath = path.join(__dirname, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return { error: 'package.json is missing.' };
  }
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const requiredDeps = ['express', '@cloudbase/node-sdk', 'jsonwebtoken', 'cors'];
  const missingDeps = requiredDeps.filter(dep => !packageJson.dependencies || !packageJson.dependencies[dep]);
  if (missingDeps.length > 0) {
    return { error: `Missing dependencies in package.json: ${missingDeps.join(', ')}` };
  }
});

// 3. Check for .env.example with correct TCB_ENV_ID
check('.env.example exists and contains TCB configuration.', () => {
  const envExamplePath = path.join(__dirname, '.env.example');
  if (!fs.existsSync(envExamplePath)) {
    return { error: '.env.example file is missing. It should be used as a template for .env.' };
  }
  const content = fs.readFileSync(envExamplePath, 'utf8');
  const expectedEnvId = 'leverage-tcb-5gvvzaincb98cd4e';
  const requiredKeys = ['TCB_ENV_ID', 'TCB_SECRET_ID', 'TCB_SECRET_KEY', 'JWT_SECRET', 'SERVER_API_KEY'];

  const missingKeys = requiredKeys.filter(key => !content.includes(`${key}=`));
  if (missingKeys.length > 0) {
    return { error: `.env.example is missing keys: ${missingKeys.join(', ')}` };
  }

  if (!content.includes(`TCB_ENV_ID=${expectedEnvId}`)) {
    return { error: `.env.example TCB_ENV_ID is incorrect. Expected: ${expectedEnvId}` };
  }
});

// 4. Add a check for the health check endpoint in app.js
check('app.js contains a /health endpoint for Docker health checks.', () => {
    const appJsPath = path.join(__dirname, 'app.js');
    if (!fs.existsSync(appJsPath)) {
        return { error: 'app.js is missing.' };
    }
    const content = fs.readFileSync(appJsPath, 'utf8');
    if (!content.includes("app.get('/health'")) {
        return { error: "app.js is missing the required app.get('/health', ...) route for TCB health checks." };
    }
});

runChecks();
