#!/usr/bin/env node

/**
 * Development Environment Test Script
 * Verifies that all components of the Pet Card Generator are properly set up
 */

import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Pet Card Generator Development Environment...\n');

// Test 1: Check if all required files exist
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'src/config/firebase.ts',
  'src/App.tsx',
  'src/main.tsx',
  'firebase.json',
  'functions/package.json',
  'functions/index.js',
  '.env.example',
  '.env.development',
  'n8n-workflows/README.md',
  'scripts/setup-dev.sh'
];

console.log('📁 Checking required files...');
let missingFiles = [];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file}`);
    missingFiles.push(file);
  }
});

// Test 2: Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = ['dev', 'build', 'test', 'lint', 'dev:emulators'];

requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`  ✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`  ❌ ${script}: missing`);
  }
});

// Test 3: Check essential dependencies
console.log('\n📚 Checking essential dependencies...');
const requiredDeps = [
  'react',
  'firebase',
  'tailwindcss',
  'typescript',
  'vite',
  '@sentry/react'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies[dep] || packageJson.devDependencies[dep]) {
    console.log(`  ✅ ${dep}`);
  } else {
    console.log(`  ❌ ${dep}: missing`);
  }
});

// Test 4: Check Firebase Functions setup
console.log('\n🔥 Checking Firebase Functions setup...');
if (fs.existsSync('functions/package.json')) {
  const functionsPackage = JSON.parse(fs.readFileSync('functions/package.json', 'utf8'));
  const requiredFunctionsDeps = ['firebase-functions', 'firebase-admin', 'express'];
  
  requiredFunctionsDeps.forEach(dep => {
    if (functionsPackage.dependencies[dep]) {
      console.log(`  ✅ ${dep}`);
    } else {
      console.log(`  ❌ ${dep}: missing`);
    }
  });
} else {
  console.log('  ❌ functions/package.json: missing');
}

// Test 5: Check environment configuration
console.log('\n🌍 Checking environment configuration...');
const envFiles = ['.env.example', '.env.development'];
envFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    const hasFirebaseConfig = content.includes('VITE_FIREBASE_API_KEY');
    const hasN8nConfig = content.includes('VITE_N8N_WEBHOOK_URL');
    
    console.log(`  ✅ ${file} exists`);
    console.log(`    ${hasFirebaseConfig ? '✅' : '❌'} Firebase configuration`);
    console.log(`    ${hasN8nConfig ? '✅' : '❌'} n8n configuration`);
  } else {
    console.log(`  ❌ ${file}: missing`);
  }
});

// Test 6: Check n8n workflows
console.log('\n🤖 Checking n8n workflows...');
if (fs.existsSync('n8n-workflows')) {
  const workflowFiles = fs.readdirSync('n8n-workflows').filter(f => f.endsWith('.json'));
  if (workflowFiles.length > 0) {
    console.log(`  ✅ Found ${workflowFiles.length} workflow template(s)`);
    workflowFiles.forEach(file => {
      console.log(`    📄 ${file}`);
    });
  } else {
    console.log('  ⚠️  No workflow templates found');
  }
} else {
  console.log('  ❌ n8n-workflows directory: missing');
}

// Summary
console.log('\n📊 Setup Summary:');
if (missingFiles.length === 0) {
  console.log('✅ All required files are present');
} else {
  console.log(`❌ Missing ${missingFiles.length} required files`);
}

console.log('\n🚀 Next Steps:');
console.log('1. Copy .env.example to .env.local and configure your Firebase settings');
console.log('2. Run "npm run dev:emulators" to start Firebase emulators');
console.log('3. Run "npm run dev" to start the development server');
console.log('4. Set up your n8n Cloud account and import workflows');

console.log('\n✨ Development environment test complete!');