#!/bin/sh

# Environment configuration script for runtime environment variables
# This script runs at container startup to inject environment variables into the built app

set -e

# Define the path to the built JavaScript files
BUILD_PATH="/usr/share/nginx/html"

# Create a runtime config file that can be loaded by the app
cat > "$BUILD_PATH/runtime-config.js" << EOF
window.RUNTIME_CONFIG = {
  API_BASE_URL: "${API_BASE_URL:-http://localhost:3000}",
  FIREBASE_API_KEY: "${FIREBASE_API_KEY:-}",
  FIREBASE_AUTH_DOMAIN: "${FIREBASE_AUTH_DOMAIN:-}",
  FIREBASE_PROJECT_ID: "${FIREBASE_PROJECT_ID:-}",
  FIREBASE_STORAGE_BUCKET: "${FIREBASE_STORAGE_BUCKET:-}",
  FIREBASE_MESSAGING_SENDER_ID: "${FIREBASE_MESSAGING_SENDER_ID:-}",
  FIREBASE_APP_ID: "${FIREBASE_APP_ID:-}",
  REPLICATE_API_TOKEN: "${REPLICATE_API_TOKEN:-}",
  RUNWAYML_API_KEY: "${RUNWAYML_API_KEY:-}",
  SENTRY_DSN: "${SENTRY_DSN:-}",
  GOOGLE_ANALYTICS_ID: "${GOOGLE_ANALYTICS_ID:-}",
  ENVIRONMENT: "${ENVIRONMENT:-production}",
  VERSION: "${VERSION:-1.0.0}",
  BUILD_TIME: "${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
};
EOF

echo "Runtime configuration created successfully"

# Make sure the config file is readable
chmod 644 "$BUILD_PATH/runtime-config.js"

# Log the configuration (without sensitive values)
echo "Runtime configuration:"
echo "- API_BASE_URL: ${API_BASE_URL:-http://localhost:3000}"
echo "- ENVIRONMENT: ${ENVIRONMENT:-production}"
echo "- VERSION: ${VERSION:-1.0.0}"
echo "- BUILD_TIME: ${BUILD_TIME:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"