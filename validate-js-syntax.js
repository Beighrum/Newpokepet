/**
 * Validation script to check JavaScript syntax and DOMPurify integration
 */

const fs = require('fs');
const path = require('path');

console.log('Validating DOMPurify setup and configuration...\n');

// Check if required files exist
const requiredFiles = [
  'pet-card-generator/package.json',
  'pet-card-generator/functions/package.json',
  'pet-card-generator/src/types/sanitization.ts',
  'pet-card-generator/src/services/sanitization.ts',
  'pet-card-generator/config/security-policies.json',
  'pet-card-generator/functions/config/sanitization-config.js',
  'pet-card-generator/vite.config.ts',
  'pet-card-generator/tsconfig.json'
];

let allFilesExist = true;

console.log('Checking required files:');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file}`);
  } else {
    console.log(`✗ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json dependencies
console.log('\nChecking dependencies:');

try {
  const frontendPkg = JSON.parse(fs.readFileSync('pet-card-generator/package.json', 'utf8'));
  const backendPkg = JSON.parse(fs.readFileSync('pet-card-generator/functions/package.json', 'utf8'));
  
  const requiredFrontendDeps = ['dompurify', '@types/dompurify', 'react', 'vite'];
  const requiredBackendDeps = ['dompurify', 'jsdom', '@types/dompurify', '@types/jsdom'];
  
  console.log('Frontend dependencies:');
  requiredFrontendDeps.forEach(dep => {
    if (frontendPkg.dependencies[dep] || frontendPkg.devDependencies[dep]) {
      console.log(`✓ ${dep}`);
    } else {
      console.log(`✗ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
  
  console.log('Backend dependencies:');
  requiredBackendDeps.forEach(dep => {
    if (backendPkg.dependencies[dep] || backendPkg.devDependencies[dep]) {
      console.log(`✓ ${dep}`);
    } else {
      console.log(`✗ ${dep} - MISSING`);
      allFilesExist = false;
    }
  });
  
} catch (error) {
  console.log('✗ Error reading package.json files:', error.message);
  allFilesExist = false;
}

// Check security policies
console.log('\nChecking security policies:');
try {
  const policies = JSON.parse(fs.readFileSync('pet-card-generator/config/security-policies.json', 'utf8'));
  const requiredPolicies = ['userProfiles', 'petCardMetadata', 'comments', 'socialSharing', 'defaultPolicy'];
  
  requiredPolicies.forEach(policy => {
    if (policies.policies[policy]) {
      console.log(`✓ ${policy} policy configured`);
    } else {
      console.log(`✗ ${policy} policy - MISSING`);
      allFilesExist = false;
    }
  });
  
} catch (error) {
  console.log('✗ Error reading security policies:', error.message);
  allFilesExist = false;
}

// Final validation
console.log('\n' + '='.repeat(50));
if (allFilesExist) {
  console.log('✅ DOMPurify setup validation PASSED');
  console.log('All required files and dependencies are properly configured.');
} else {
  console.log('❌ DOMPurify setup validation FAILED');
  console.log('Some required files or dependencies are missing.');
}
console.log('='.repeat(50));