#!/bin/bash

# Pet Card Generator Project Scaffolding Script
# This script creates a complete pet card generator project structure
# with all necessary files, documentation, and code components.

# Enhanced error handling and script safety (Requirement 4.1, 4.4, 4.5)
set -e          # Exit immediately if a command exits with a non-zero status
set -u          # Exit if an undefined variable is used
set -o pipefail # Exit if any command in a pipeline fails

# Ensure script portability across different bash environments
export LC_ALL=C
export LANG=C

# Define the root directory for the project
ROOT="pet-card-generator"

# Trap to cleanup on script exit (Requirement 4.4)
cleanup() {
    local exit_code=$?
    if [ $exit_code -ne 0 ]; then
        info "Script failed with exit code $exit_code. Cleaning up temporary files..."
        # Remove any temporary files that might have been created
        find "${ROOT:-}" -name "*.tmp.*" -type f -delete 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Function to display error messages and exit
error_exit() {
    echo "ERROR: $1" >&2
    exit 1
}

# Function to display informational messages
info() {
    echo "INFO: $1"
}

# Safe file writing function with validation (Requirement 4.4)
safe_write_file() {
    local file_path="$1"
    local content="$2"
    local backup_suffix=".backup.$(date +%s)"
    
    # Validate input parameters
    if [ -z "$file_path" ]; then
        error_exit "safe_write_file: file path is required"
    fi
    
    # Create backup if file exists
    if [ -f "$file_path" ]; then
        info "Creating backup of existing file: $file_path$backup_suffix"
        if ! cp "$file_path" "$file_path$backup_suffix"; then
            error_exit "Failed to create backup of $file_path"
        fi
    fi
    
    # Ensure parent directory exists
    local parent_dir
    parent_dir=$(dirname "$file_path")
    if [ ! -d "$parent_dir" ]; then
        if ! mkdir -p "$parent_dir"; then
            error_exit "Failed to create parent directory: $parent_dir"
        fi
    fi
    
    # Write content to temporary file first
    local temp_file="$file_path.tmp.$$"
    if ! echo "$content" > "$temp_file"; then
        error_exit "Failed to write to temporary file: $temp_file"
    fi
    
    # Verify temporary file was created and has content
    if [ ! -f "$temp_file" ] || [ ! -s "$temp_file" ]; then
        rm -f "$temp_file" 2>/dev/null
        error_exit "Temporary file creation failed or file is empty: $temp_file"
    fi
    
    # Atomically move temporary file to final location
    if ! mv "$temp_file" "$file_path"; then
        rm -f "$temp_file" 2>/dev/null
        error_exit "Failed to move temporary file to final location: $file_path"
    fi
    
    # Verify final file exists and is readable
    if [ ! -f "$file_path" ] || [ ! -r "$file_path" ]; then
        error_exit "File verification failed after creation: $file_path"
    fi
    
    # Set appropriate permissions (readable by owner and group)
    if ! chmod 644 "$file_path"; then
        error_exit "Failed to set permissions on file: $file_path"
    fi
}

# Validate generated file content (Requirement 4.4)
validate_generated_file() {
    local file_path="$1"
    local expected_type="$2"  # js, jsx, md, etc.
    
    if [ ! -f "$file_path" ]; then
        error_exit "Generated file does not exist: $file_path"
    fi
    
    if [ ! -s "$file_path" ]; then
        error_exit "Generated file is empty: $file_path"
    fi
    
    # Basic syntax validation for different file types
    case "$expected_type" in
        "js"|"jsx")
            # Check for basic JavaScript/JSX syntax issues
            if grep -q "undefined\|null\|NaN" "$file_path" && ! grep -q "// Expected" "$file_path"; then
                info "Warning: Generated JavaScript file may contain undefined values: $file_path"
            fi
            ;;
        "md")
            # Check for basic Markdown structure
            if ! grep -q "^#" "$file_path"; then
                info "Warning: Generated Markdown file may be missing headers: $file_path"
            fi
            ;;
    esac
    
    info "File validation passed: $file_path"
}

# Enhanced file writing with heredoc and validation (Requirement 4.3, 4.4)
safe_write_heredoc() {
    local file_path="$1"
    local expected_type="$2"
    local heredoc_content="$3"
    
    # Write using heredoc with quoted delimiter to prevent shell interpretation
    if ! cat > "$file_path" << 'SAFE_EOF'
$heredoc_content
SAFE_EOF
    then
        error_exit "Failed to write file using heredoc: $file_path"
    fi
    
    # Validate the generated file
    validate_generated_file "$file_path" "$expected_type"
}

# Validate script environment and ensure portability
validate_environment() {
    info "Validating environment..."
    
    # Check if we're running in a bash-compatible shell (Requirement 4.5)
    if [ -z "$BASH_VERSION" ]; then
        error_exit "This script requires bash to run properly"
    fi
    
    # Check bash version compatibility (minimum bash 3.2 for macOS compatibility)
    if [ "${BASH_VERSINFO[0]}" -lt 3 ] || ([ "${BASH_VERSINFO[0]}" -eq 3 ] && [ "${BASH_VERSINFO[1]}" -lt 2 ]); then
        error_exit "This script requires bash version 3.2 or higher (current: $BASH_VERSION)"
    fi
    
    # Check if we have write permissions in current directory (Requirement 4.4)
    if [ ! -w "." ]; then
        error_exit "No write permission in current directory"
    fi
    
    # Check for required commands (Requirement 4.5)
    local required_commands=("mkdir" "cat" "touch" "chmod")
    for cmd in "${required_commands[@]}"; do
        if ! command -v "$cmd" >/dev/null 2>&1; then
            error_exit "Required command '$cmd' not found in PATH"
        fi
    done
    
    # Validate ROOT directory name (prevent path traversal)
    if [[ "$ROOT" =~ \.\./|^/|^\~ ]]; then
        error_exit "Invalid ROOT directory name: $ROOT (contains path traversal or absolute path)"
    fi
    
    info "Environment validation completed successfully"
}

# Create the main project directory structure with enhanced safety checks
create_directory_structure() {
    info "Creating project directory structure..."
    
    # Check if root directory already exists and warn user (Requirement 4.2)
    if [ -d "$ROOT" ]; then
        info "Warning: Directory '$ROOT' already exists. Files may be overwritten."
        read -p "Do you want to continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error_exit "Operation cancelled by user"
        fi
    fi
    
    # Create root directory (Requirement 4.2 - use mkdir -p for safe creation)
    if ! mkdir -p "$ROOT"; then
        error_exit "Failed to create root directory: $ROOT"
    fi
    
    # Verify root directory was created and is writable
    if [ ! -d "$ROOT" ] || [ ! -w "$ROOT" ]; then
        error_exit "Root directory '$ROOT' is not accessible or writable"
    fi
    
    # Define subdirectories array for easier management
    local subdirs=(
        "$ROOT/functions"
        "$ROOT/src/components"
        "$ROOT/src/pages"
        "$ROOT/docs"
    )
    
    # Create subdirectories with error checking
    for dir in "${subdirs[@]}"; do
        if ! mkdir -p "$dir"; then
            error_exit "Failed to create directory: $dir"
        fi
        
        # Verify directory was created successfully
        if [ ! -d "$dir" ]; then
            error_exit "Directory creation verification failed: $dir"
        fi
    done
    
    info "Directory structure created successfully"
}

# Generate Complete-PRD.md documentation (Requirement 2.1, 2.2)
generate_complete_prd() {
    info "Generating Complete-PRD.md documentation..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/docs/Complete-PRD.md" << 'EOF'
# Pet Card Generator - Product Requirements Document

## Vision Statement

Create an innovative web application that transforms ordinary pet photos into collectible trading cards with unique rarities, evolution mechanics, and AI-generated enhancements. The platform combines the nostalgia of trading cards with modern AI technology to create engaging, shareable digital collectibles for pet owners.

## Problem Statement

Pet owners love sharing photos of their pets but lack creative ways to make these memories more engaging and collectible. Traditional photo sharing is static and doesn't capture the unique personality and characteristics that make each pet special. There's a gap in the market for a platform that transforms pet photos into interactive, gamified experiences.

### Pain Points
- Static pet photo sharing lacks engagement
- No way to showcase pet personalities through creative formats
- Limited options for creating memorable pet-related content
- Absence of gamification elements in pet photo platforms

## Target Audience

### Primary Users
- **Pet Owners (Ages 25-45)**: Tech-savvy individuals who actively share pet content on social media
- **Families with Children**: Parents looking for fun, creative activities involving their pets
- **Pet Enthusiasts**: People who collect pet-related memorabilia and digital content

### Secondary Users
- **Social Media Influencers**: Content creators focusing on pet-related content
- **Pet Communities**: Online groups and forums dedicated to specific pet breeds or types

## Success Metrics

### User Engagement
- **Monthly Active Users**: Target 10,000+ MAU within 6 months
- **Card Generation Rate**: Average 5+ cards generated per user per month
- **Session Duration**: Average session time of 8+ minutes
- **Return Rate**: 60%+ user return rate within 30 days

### Technical Performance
- **Generation Speed**: Card generation completed within 30 seconds
- **Uptime**: 99.5% application availability
- **Error Rate**: Less than 2% failed card generations

### Business Metrics
- **User Acquisition Cost**: Under $15 per acquired user
- **User Retention**: 40%+ retention rate after 3 months
- **Feature Adoption**: 70%+ of users try evolution feature

## Core Features

### 1. Photo Upload and Processing
- **Drag-and-drop interface** for easy photo uploads
- **Automatic image optimization** and cropping
- **Multi-format support** (JPEG, PNG, HEIC)
- **Batch upload capability** for multiple photos

### 2. AI-Powered Card Generation
- **Rarity assignment** based on photo characteristics
- **Automatic stat generation** (Cuteness, Energy, Loyalty, etc.)
- **Background enhancement** with themed environments
- **Text overlay** with pet names and descriptions

### 3. Evolution System
- **Multi-stage evolution** with visual transformations
- **Stat progression** through evolution stages
- **Unlock conditions** based on user engagement
- **Evolution animation** and visual effects

### 4. Card Collection Management
- **Personal gallery** with filtering and sorting
- **Rarity indicators** and collection statistics
- **Sharing capabilities** to social media platforms
- **Download options** in multiple formats

### 5. User Authentication
- **Secure login system** with email/password
- **Social media integration** (Google, Facebook)
- **Profile management** with user preferences
- **Collection privacy settings**

## Technical Requirements

### Frontend
- **React.js** with modern hooks and state management
- **Responsive design** for mobile and desktop
- **Progressive Web App** capabilities
- **Offline functionality** for viewing saved cards

### Backend
- **Firebase Functions** for serverless architecture
- **Cloud Storage** for image and card data
- **Firestore** for user data and card metadata
- **Authentication** with Firebase Auth

### External Integrations
- **n8n Workflow** for AI image processing
- **Social Media APIs** for sharing functionality
- **Analytics platform** for user behavior tracking

## Assumptions

### Technical Assumptions
- Users have stable internet connections for uploads
- Modern browsers with JavaScript enabled
- Mobile devices support camera access for photo capture
- Firebase services maintain reliable uptime

### Business Assumptions
- Pet owners are willing to engage with gamified content
- AI-generated enhancements add perceived value
- Social sharing drives organic user acquisition
- Evolution mechanics increase user retention

### User Behavior Assumptions
- Users will upload multiple photos per session
- Card collection appeals to target demographic
- Social sharing is a primary use case
- Mobile usage will exceed desktop usage

## Risks and Mitigation

### Technical Risks
- **AI Processing Delays**: Implement queue system and progress indicators
- **Storage Costs**: Optimize image compression and implement cleanup policies
- **API Rate Limits**: Implement caching and request throttling
- **Browser Compatibility**: Extensive cross-browser testing and fallbacks

### Business Risks
- **Low User Adoption**: Implement referral programs and social media marketing
- **High Churn Rate**: Develop engagement features and push notifications
- **Competition**: Focus on unique evolution mechanics and AI quality
- **Monetization Challenges**: Plan premium features and subscription tiers

### Operational Risks
- **Data Privacy Concerns**: Implement GDPR compliance and clear privacy policies
- **Content Moderation**: Automated filtering and user reporting systems
- **Scalability Issues**: Auto-scaling infrastructure and performance monitoring
- **Support Overhead**: Self-service help center and automated support tools

## Dependencies

### External Services
- Firebase platform availability and pricing
- n8n workflow service reliability
- Third-party AI processing capabilities
- Social media platform API stability

### Internal Resources
- Development team with React and Firebase expertise
- UI/UX design resources for card templates
- QA testing across multiple devices and browsers
- DevOps support for deployment and monitoring

## Timeline and Milestones

### Phase 1: Core Functionality (Weeks 1-4)
- Basic photo upload and card generation
- User authentication and profile management
- Simple card gallery and viewing

### Phase 2: Enhanced Features (Weeks 5-8)
- Evolution system implementation
- Social sharing capabilities
- Mobile responsiveness optimization

### Phase 3: Polish and Launch (Weeks 9-12)
- Performance optimization and testing
- User feedback integration
- Marketing and launch preparation

## Acceptance Criteria

### Minimum Viable Product
- Users can upload pet photos and generate cards
- Cards display with appropriate rarity and stats
- Users can view and manage their card collection
- Basic sharing functionality works correctly

### Success Criteria
- All core features function as specified
- Performance meets defined metrics
- User feedback indicates positive reception
- Technical infrastructure scales appropriately

---

*This document serves as the foundation for the Pet Card Generator project development and should be referenced throughout the implementation process.*
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/docs/Complete-PRD.md" "md"
    
    info "Complete-PRD.md generated successfully"
}

# Generate Firebase Cloud Functions index.js entry point (Requirement 1.4, 3.1, 3.2)
generate_functions_index() {
    info "Generating Firebase Functions index.js entry point..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/functions/index.js" << 'EOF'
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const { generateCard } = require('./generate');
const { evolveCard } = require('./evolve');

// Initialize Express app
const app = express();

// Configure CORS middleware
app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Configure JSON parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'pet-card-generator-functions'
    });
});

// Card generation endpoint
app.post('/generate', async (req, res) => {
    try {
        console.log('Generate card request received');
        const result = await generateCard(req, res);
        return result;
    } catch (error) {
        console.error('Error in generate endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate card',
            timestamp: new Date().toISOString()
        });
    }
});

// Card evolution endpoint
app.post('/evolve', async (req, res) => {
    try {
        console.log('Evolve card request received');
        const result = await evolveCard(req, res);
        return result;
    } catch (error) {
        console.error('Error in evolve endpoint:', error);
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to evolve card',
            timestamp: new Date().toISOString()
        });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message || 'An unexpected error occurred',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
    });
});

// Export the Express app as a Firebase Function
exports.api = functions.https.onRequest(app);

// Export individual functions for direct access if needed
exports.generateCard = functions.https.onCall(async (data, context) => {
    try {
        // Validate authentication if required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        console.log('Direct generateCard function called');
        return await generateCard({ body: data }, { json: (result) => result });
    } catch (error) {
        console.error('Error in direct generateCard function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to generate card');
    }
});

exports.evolveCard = functions.https.onCall(async (data, context) => {
    try {
        // Validate authentication if required
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        console.log('Direct evolveCard function called');
        return await evolveCard({ body: data }, { json: (result) => result });
    } catch (error) {
        console.error('Error in direct evolveCard function:', error);
        throw new functions.https.HttpsError('internal', 'Failed to evolve card');
    }
});
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/functions/index.js" "js"
    
    info "Firebase Functions index.js generated successfully"
}

# Generate Firebase Cloud Functions generate.js endpoint (Requirement 1.4, 3.1, 3.2, 3.4)
generate_functions_generate() {
    info "Generating Firebase Functions generate.js endpoint..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/functions/generate.js" << 'EOF'
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const storage = new Storage();
const bucket = storage.bucket();
const db = admin.firestore();

// Configuration constants
const N8N_WORKFLOW_URL = process.env.N8N_WORKFLOW_URL || '<workflow_endpoint>';
const N8N_API_KEY = process.env.N8N_API_KEY || '<api_key>';
const UPLOAD_TIMEOUT = 30000; // 30 seconds
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Rarity levels and their probabilities
const RARITY_LEVELS = [
    { name: 'Common', probability: 0.5, multiplier: 1.0 },
    { name: 'Uncommon', probability: 0.3, multiplier: 1.2 },
    { name: 'Rare', probability: 0.15, multiplier: 1.5 },
    { name: 'Epic', probability: 0.04, multiplier: 2.0 },
    { name: 'Legendary', probability: 0.01, multiplier: 3.0 }
];

// Generate random stats based on rarity
function generateStats(rarity) {
    const baseStats = {
        cuteness: Math.floor(Math.random() * 50) + 50,
        energy: Math.floor(Math.random() * 50) + 50,
        loyalty: Math.floor(Math.random() * 50) + 50,
        intelligence: Math.floor(Math.random() * 50) + 50,
        playfulness: Math.floor(Math.random() * 50) + 50
    };

    const multiplier = rarity.multiplier;
    return Object.keys(baseStats).reduce((stats, key) => {
        stats[key] = Math.min(100, Math.floor(baseStats[key] * multiplier));
        return stats;
    }, {});
}

// Determine rarity based on probability
function determineRarity() {
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const rarity of RARITY_LEVELS) {
        cumulativeProbability += rarity.probability;
        if (random <= cumulativeProbability) {
            return rarity;
        }
    }

    // Fallback to common if something goes wrong
    return RARITY_LEVELS[0];
}

// Upload image to Firebase Storage
async function uploadImageToStorage(imageBuffer, filename, contentType) {
    try {
        const file = bucket.file(`pet-images/${filename}`);
        
        await file.save(imageBuffer, {
            metadata: {
                contentType: contentType,
                metadata: {
                    uploadedAt: new Date().toISOString(),
                    source: 'pet-card-generator'
                }
            }
        });

        // Generate signed URL for access
        const [signedUrl] = await file.getSignedUrl({
            action: 'read',
            expires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        return {
            filename,
            url: signedUrl,
            gsUrl: `gs://${bucket.name}/pet-images/${filename}`
        };
    } catch (error) {
        console.error('Error uploading image to storage:', error);
        throw new Error('Failed to upload image to storage');
    }
}

// Process image with n8n workflow
async function processImageWithN8N(imageUrl, petName, petType) {
    try {
        const response = await axios.post(N8N_WORKFLOW_URL, {
            imageUrl: imageUrl,
            petName: petName || 'Unknown Pet',
            petType: petType || 'Pet',
            timestamp: new Date().toISOString()
        }, {
            headers: {
                'Authorization': `Bearer ${N8N_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: UPLOAD_TIMEOUT
        });

        if (response.status !== 200) {
            throw new Error(`n8n workflow returned status ${response.status}`);
        }

        return response.data;
    } catch (error) {
        console.error('Error processing image with n8n:', error);
        
        // Return fallback data if n8n fails
        return {
            processedImageUrl: imageUrl, // Use original image as fallback
            enhancedBackground: false,
            processingStatus: 'fallback'
        };
    }
}

// Save card data to Firestore
async function saveCardToFirestore(cardData, userId) {
    try {
        const cardRef = db.collection('cards').doc();
        const cardWithMetadata = {
            ...cardData,
            id: cardRef.id,
            userId: userId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            version: 1
        };

        await cardRef.set(cardWithMetadata);
        return cardRef.id;
    } catch (error) {
        console.error('Error saving card to Firestore:', error);
        throw new Error('Failed to save card data');
    }
}

// Main generate card function
async function generateCard(req, res) {
    try {
        console.log('Starting card generation process');

        // Validate request body
        const { imageData, petName, petType, userId } = req.body;

        if (!imageData) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Image data is required'
            });
        }

        if (!userId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'User ID is required'
            });
        }

        // Process base64 image data
        let imageBuffer;
        let contentType = 'image/jpeg';

        try {
            // Handle base64 data URL format
            if (imageData.startsWith('data:')) {
                const matches = imageData.match(/^data:([^;]+);base64,(.+)$/);
                if (!matches) {
                    throw new Error('Invalid base64 data URL format');
                }
                contentType = matches[1];
                imageBuffer = Buffer.from(matches[2], 'base64');
            } else {
                // Assume raw base64
                imageBuffer = Buffer.from(imageData, 'base64');
            }

            // Validate file size
            if (imageBuffer.length > MAX_FILE_SIZE) {
                return res.status(400).json({
                    error: 'Bad request',
                    message: 'Image file too large (max 10MB)'
                });
            }
        } catch (error) {
            console.error('Error processing image data:', error);
            return res.status(400).json({
                error: 'Bad request',
                message: 'Invalid image data format'
            });
        }

        // Generate unique filename
        const filename = `${uuidv4()}.${contentType.split('/')[1]}`;

        // Upload image to Firebase Storage
        console.log('Uploading image to Firebase Storage');
        const uploadResult = await uploadImageToStorage(imageBuffer, filename, contentType);

        // Determine card rarity and generate stats
        const rarity = determineRarity();
        const stats = generateStats(rarity);

        console.log(`Generated ${rarity.name} rarity card with stats:`, stats);

        // Process image with n8n workflow
        console.log('Processing image with n8n workflow');
        const n8nResult = await processImageWithN8N(uploadResult.url, petName, petType);

        // Create card data object
        const cardData = {
            petName: petName || 'Unknown Pet',
            petType: petType || 'Pet',
            rarity: rarity.name,
            stats: stats,
            images: {
                original: uploadResult.url,
                processed: n8nResult.processedImageUrl || uploadResult.url
            },
            metadata: {
                filename: uploadResult.filename,
                contentType: contentType,
                fileSize: imageBuffer.length,
                processingStatus: n8nResult.processingStatus || 'completed',
                enhancedBackground: n8nResult.enhancedBackground || false
            },
            evolution: {
                stage: 1,
                maxStage: 3,
                canEvolve: true,
                evolutionRequirements: {
                    minLevel: 10,
                    requiredStats: {
                        cuteness: 70,
                        energy: 60
                    }
                }
            }
        };

        // Save card to Firestore
        console.log('Saving card to Firestore');
        const cardId = await saveCardToFirestore(cardData, userId);

        // Return success response
        const response = {
            success: true,
            cardId: cardId,
            card: {
                ...cardData,
                id: cardId
            },
            message: 'Card generated successfully',
            timestamp: new Date().toISOString()
        };

        console.log('Card generation completed successfully');
        return res.status(200).json(response);

    } catch (error) {
        console.error('Error in generateCard function:', error);
        
        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to generate card',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { generateCard };
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/functions/generate.js" "js"
    
    info "Firebase Functions generate.js generated successfully"
}

# Generate Firebase Cloud Functions evolve.js endpoint (Requirement 1.4, 3.1, 3.2, 3.4)
generate_functions_evolve() {
    info "Generating Firebase Functions evolve.js endpoint..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/functions/evolve.js" << 'EOF'
const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    admin.initializeApp();
}

const storage = new Storage();
const bucket = storage.bucket();
const db = admin.firestore();

// Configuration constants
const N8N_EVOLUTION_WORKFLOW_URL = process.env.N8N_EVOLUTION_WORKFLOW_URL || process.env.N8N_WORKFLOW_URL || '<evolution_workflow_endpoint>';
const N8N_API_KEY = process.env.N8N_API_KEY || '<api_key>';
const EVOLUTION_TIMEOUT = 45000; // 45 seconds for evolution processing

// Evolution stage configurations
const EVOLUTION_STAGES = {
    1: {
        name: 'Baby',
        statMultiplier: 1.0,
        nextStage: 2,
        requirements: {
            minLevel: 10,
            requiredStats: { cuteness: 70, energy: 60 }
        }
    },
    2: {
        name: 'Adult',
        statMultiplier: 1.5,
        nextStage: 3,
        requirements: {
            minLevel: 25,
            requiredStats: { cuteness: 85, energy: 80, loyalty: 75 }
        }
    },
    3: {
        name: 'Elder',
        statMultiplier: 2.0,
        nextStage: null,
        requirements: null
    }
};

// Validate evolution requirements
function canEvolve(cardData) {
    const currentStage = cardData.evolution?.stage || 1;
    const maxStage = cardData.evolution?.maxStage || 3;

    // Check if already at max stage
    if (currentStage >= maxStage) {
        return {
            canEvolve: false,
            reason: 'Card is already at maximum evolution stage'
        };
    }

    const stageConfig = EVOLUTION_STAGES[currentStage];
    if (!stageConfig || !stageConfig.requirements) {
        return {
            canEvolve: false,
            reason: 'Invalid evolution stage configuration'
        };
    }

    const requirements = stageConfig.requirements;
    const cardStats = cardData.stats || {};

    // Check level requirement (if implemented)
    const currentLevel = cardData.level || 1;
    if (currentLevel < requirements.minLevel) {
        return {
            canEvolve: false,
            reason: `Card level ${currentLevel} is below required level ${requirements.minLevel}`
        };
    }

    // Check stat requirements
    for (const [statName, requiredValue] of Object.entries(requirements.requiredStats)) {
        const currentValue = cardStats[statName] || 0;
        if (currentValue < requiredValue) {
            return {
                canEvolve: false,
                reason: `${statName} stat ${currentValue} is below required ${requiredValue}`
            };
        }
    }

    return {
        canEvolve: true,
        nextStage: stageConfig.nextStage
    };
}

// Calculate evolved stats
function calculateEvolvedStats(currentStats, fromStage, toStage) {
    const fromMultiplier = EVOLUTION_STAGES[fromStage]?.statMultiplier || 1.0;
    const toMultiplier = EVOLUTION_STAGES[toStage]?.statMultiplier || 1.5;
    
    const evolutionBonus = toMultiplier / fromMultiplier;
    const evolvedStats = {};

    for (const [statName, currentValue] of Object.entries(currentStats)) {
        // Apply evolution bonus with some randomness
        const bonus = Math.floor(currentValue * (evolutionBonus - 1)) + Math.floor(Math.random() * 10);
        evolvedStats[statName] = Math.min(100, currentValue + bonus);
    }

    return evolvedStats;
}

// Process evolution with n8n workflow
async function processEvolutionWithN8N(cardData, targetStage) {
    try {
        const evolutionRequest = {
            cardId: cardData.id,
            currentStage: cardData.evolution?.stage || 1,
            targetStage: targetStage,
            petName: cardData.petName,
            petType: cardData.petType,
            currentImageUrl: cardData.images?.processed || cardData.images?.original,
            stats: cardData.stats,
            timestamp: new Date().toISOString()
        };

        console.log('Sending evolution request to n8n:', evolutionRequest);

        const response = await axios.post(N8N_EVOLUTION_WORKFLOW_URL, evolutionRequest, {
            headers: {
                'Authorization': `Bearer ${N8N_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: EVOLUTION_TIMEOUT
        });

        if (response.status !== 200) {
            throw new Error(`n8n evolution workflow returned status ${response.status}`);
        }

        return response.data;
    } catch (error) {
        console.error('Error processing evolution with n8n:', error);
        
        // Return fallback data if n8n fails
        return {
            evolvedImageUrl: cardData.images?.processed || cardData.images?.original,
            evolutionEffects: [],
            processingStatus: 'fallback',
            message: 'Evolution completed with basic processing'
        };
    }
}

// Retrieve card data from Firestore
async function getCardFromFirestore(cardId, userId) {
    try {
        const cardRef = db.collection('cards').doc(cardId);
        const cardDoc = await cardRef.get();

        if (!cardDoc.exists) {
            throw new Error('Card not found');
        }

        const cardData = cardDoc.data();

        // Verify ownership
        if (cardData.userId !== userId) {
            throw new Error('Unauthorized: Card does not belong to user');
        }

        return cardData;
    } catch (error) {
        console.error('Error retrieving card from Firestore:', error);
        throw error;
    }
}

// Update card data in Firestore
async function updateCardInFirestore(cardId, updatedData) {
    try {
        const cardRef = db.collection('cards').doc(cardId);
        
        const updateData = {
            ...updatedData,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            version: admin.firestore.FieldValue.increment(1)
        };

        await cardRef.update(updateData);
        
        // Return updated card data
        const updatedDoc = await cardRef.get();
        return updatedDoc.data();
    } catch (error) {
        console.error('Error updating card in Firestore:', error);
        throw new Error('Failed to update card data');
    }
}

// Log evolution event
async function logEvolutionEvent(cardId, userId, fromStage, toStage, success, error = null) {
    try {
        const evolutionLogRef = db.collection('evolutionLogs').doc();
        
        await evolutionLogRef.set({
            cardId: cardId,
            userId: userId,
            fromStage: fromStage,
            toStage: toStage,
            success: success,
            error: error,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
    } catch (logError) {
        console.error('Error logging evolution event:', logError);
        // Don't throw here as this is just logging
    }
}

// Main evolve card function
async function evolveCard(req, res) {
    let cardId, userId, currentStage;
    
    try {
        console.log('Starting card evolution process');

        // Validate request body
        const { cardId: requestCardId, userId: requestUserId } = req.body;

        if (!requestCardId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'Card ID is required'
            });
        }

        if (!requestUserId) {
            return res.status(400).json({
                error: 'Bad request',
                message: 'User ID is required'
            });
        }

        cardId = requestCardId;
        userId = requestUserId;

        // Retrieve card data from Firestore
        console.log('Retrieving card data from Firestore');
        const cardData = await getCardFromFirestore(cardId, userId);
        currentStage = cardData.evolution?.stage || 1;

        // Validate evolution requirements
        console.log('Validating evolution requirements');
        const evolutionCheck = canEvolve(cardData);

        if (!evolutionCheck.canEvolve) {
            await logEvolutionEvent(cardId, userId, currentStage, null, false, evolutionCheck.reason);
            
            return res.status(400).json({
                error: 'Evolution not allowed',
                message: evolutionCheck.reason,
                currentStage: currentStage,
                requirements: EVOLUTION_STAGES[currentStage]?.requirements
            });
        }

        const targetStage = evolutionCheck.nextStage;
        console.log(`Evolving card from stage ${currentStage} to stage ${targetStage}`);

        // Process evolution with n8n workflow
        console.log('Processing evolution with n8n workflow');
        const evolutionResult = await processEvolutionWithN8N(cardData, targetStage);

        // Calculate evolved stats
        const evolvedStats = calculateEvolvedStats(cardData.stats, currentStage, targetStage);

        // Prepare updated card data
        const updatedCardData = {
            stats: evolvedStats,
            evolution: {
                ...cardData.evolution,
                stage: targetStage,
                canEvolve: targetStage < (cardData.evolution?.maxStage || 3),
                evolutionHistory: [
                    ...(cardData.evolution?.evolutionHistory || []),
                    {
                        fromStage: currentStage,
                        toStage: targetStage,
                        timestamp: new Date().toISOString(),
                        statsGained: Object.keys(evolvedStats).reduce((gains, statName) => {
                            gains[statName] = evolvedStats[statName] - (cardData.stats[statName] || 0);
                            return gains;
                        }, {})
                    }
                ]
            },
            images: {
                ...cardData.images,
                evolved: evolutionResult.evolvedImageUrl || cardData.images?.processed
            },
            metadata: {
                ...cardData.metadata,
                lastEvolution: new Date().toISOString(),
                evolutionProcessingStatus: evolutionResult.processingStatus || 'completed'
            }
        };

        // Update card in Firestore
        console.log('Updating card in Firestore');
        const finalCardData = await updateCardInFirestore(cardId, updatedCardData);

        // Log successful evolution
        await logEvolutionEvent(cardId, userId, currentStage, targetStage, true);

        // Return success response
        const response = {
            success: true,
            cardId: cardId,
            card: finalCardData,
            evolution: {
                fromStage: currentStage,
                toStage: targetStage,
                stageName: EVOLUTION_STAGES[targetStage]?.name || `Stage ${targetStage}`,
                statsGained: Object.keys(evolvedStats).reduce((gains, statName) => {
                    gains[statName] = evolvedStats[statName] - (cardData.stats[statName] || 0);
                    return gains;
                }, {}),
                effects: evolutionResult.evolutionEffects || []
            },
            message: `Card successfully evolved to ${EVOLUTION_STAGES[targetStage]?.name || `Stage ${targetStage}`}`,
            timestamp: new Date().toISOString()
        };

        console.log('Card evolution completed successfully');
        return res.status(200).json(response);

    } catch (error) {
        console.error('Error in evolveCard function:', error);
        
        // Log failed evolution
        if (cardId && userId && currentStage) {
            await logEvolutionEvent(cardId, userId, currentStage, null, false, error.message);
        }

        // Handle specific error types
        if (error.message === 'Card not found') {
            return res.status(404).json({
                error: 'Not found',
                message: 'Card not found',
                timestamp: new Date().toISOString()
            });
        }

        if (error.message.includes('Unauthorized')) {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'You do not have permission to evolve this card',
                timestamp: new Date().toISOString()
            });
        }

        return res.status(500).json({
            error: 'Internal server error',
            message: 'Failed to evolve card',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
}

module.exports = { evolveCard };
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/functions/evolve.js" "js"
    
    info "Firebase Functions evolve.js generated successfully"
}

# Generate Navbar.jsx React component (Requirement 1.5, 3.1, 3.2)
generate_navbar_component() {
    info "Generating Navbar.jsx React component..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/src/components/Navbar.jsx" << 'EOF'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  User, 
  LogOut, 
  Settings, 
  Home, 
  Upload, 
  Sparkles,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, signOut, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  const navigationItems = [
    {
      label: 'Home',
      path: '/',
      icon: Home,
      active: location.pathname === '/'
    },
    {
      label: 'Generate',
      path: '/upload',
      icon: Upload,
      active: location.pathname === '/upload',
      requiresAuth: true
    },
    {
      label: 'Evolve',
      path: '/evolution',
      icon: Sparkles,
      active: location.pathname === '/evolution',
      requiresAuth: true
    }
  ];

  const visibleNavItems = navigationItems.filter(item => 
    !item.requiresAuth || (item.requiresAuth && user)
  );

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span>Pet Cards</span>
            </button>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* User Authentication */}
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                      <AvatarFallback>
                        {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user.displayName || 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={handleSignIn} variant="default" size="sm">
                Sign In
              </Button>
            )}

            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2"
              >
                {isMobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {visibleNavItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-2 w-full px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      item.active
                        ? 'text-blue-600 bg-blue-50'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/src/components/Navbar.jsx" "jsx"
    
    info "Navbar.jsx React component generated successfully"
}

# Generate ImageCard.jsx React component (Requirement 1.5, 3.1, 3.2)
generate_imagecard_component() {
    info "Generating ImageCard.jsx React component..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/src/components/ImageCard.jsx" << 'EOF'
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Heart, 
  Zap, 
  Shield, 
  Brain, 
  Gamepad2,
  Star,
  Sparkles,
  Download,
  Share2,
  Eye
} from 'lucide-react';

// Rarity color mappings
const RARITY_COLORS = {
  Common: 'bg-gray-500',
  Uncommon: 'bg-green-500',
  Rare: 'bg-blue-500',
  Epic: 'bg-purple-500',
  Legendary: 'bg-yellow-500'
};

// Rarity text colors
const RARITY_TEXT_COLORS = {
  Common: 'text-gray-700',
  Uncommon: 'text-green-700',
  Rare: 'text-blue-700',
  Epic: 'text-purple-700',
  Legendary: 'text-yellow-700'
};

// Stat icon mappings
const STAT_ICONS = {
  cuteness: Heart,
  energy: Zap,
  loyalty: Shield,
  intelligence: Brain,
  playfulness: Gamepad2
};

// Stat display names
const STAT_NAMES = {
  cuteness: 'Cuteness',
  energy: 'Energy',
  loyalty: 'Loyalty',
  intelligence: 'Intelligence',
  playfulness: 'Playfulness'
};

const ImageCard = ({ 
  card, 
  onClick, 
  onShare, 
  onDownload,
  showStats = true,
  showActions = true,
  className = '',
  size = 'default' // 'small', 'default', 'large'
}) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  if (!card) {
    return null;
  }

  const {
    id,
    petName = 'Unknown Pet',
    petType = 'Pet',
    rarity = 'Common',
    stats = {},
    images = {},
    evolution = {},
    createdAt
  } = card;

  const imageUrl = images.processed || images.original || '/placeholder-pet.jpg';
  const rarityColor = RARITY_COLORS[rarity] || RARITY_COLORS.Common;
  const rarityTextColor = RARITY_TEXT_COLORS[rarity] || RARITY_TEXT_COLORS.Common;

  // Calculate size classes
  const sizeClasses = {
    small: 'w-48',
    default: 'w-64',
    large: 'w-80'
  };

  const imageSizeClasses = {
    small: 'h-32',
    default: 'h-48',
    large: 'h-64'
  };

  const handleCardClick = () => {
    if (onClick) {
      onClick(card);
    } else {
      setIsDetailModalOpen(true);
    }
  };

  const handleShare = async (e) => {
    e.stopPropagation();
    if (onShare) {
      onShare(card);
    } else {
      // Default share functionality
      if (navigator.share) {
        try {
          await navigator.share({
            title: `${petName} - ${rarity} Pet Card`,
            text: `Check out my ${rarity} ${petType} card!`,
            url: window.location.href
          });
        } catch (error) {
          console.log('Error sharing:', error);
        }
      } else {
        // Fallback: copy to clipboard
        navigator.clipboard.writeText(window.location.href);
      }
    }
  };

  const handleDownload = (e) => {
    e.stopPropagation();
    if (onDownload) {
      onDownload(card);
    } else {
      // Default download functionality
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = `${petName}-${rarity}-card.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const renderStats = () => {
    if (!showStats || !stats || Object.keys(stats).length === 0) {
      return null;
    }

    return (
      <div className="space-y-2">
        {Object.entries(stats).map(([statKey, value]) => {
          const Icon = STAT_ICONS[statKey];
          const statName = STAT_NAMES[statKey] || statKey;
          
          if (!Icon) return null;

          return (
            <div key={statKey} className="flex items-center space-x-2">
              <Icon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700 flex-1">
                {statName}
              </span>
              <div className="flex items-center space-x-2 flex-1">
                <Progress value={value} className="flex-1" />
                <span className="text-sm font-bold text-gray-900 w-8 text-right">
                  {value}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderEvolutionInfo = () => {
    if (!evolution || !evolution.stage) {
      return null;
    }

    const { stage, maxStage, canEvolve } = evolution;

    return (
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-1">
          <Star className="w-4 h-4 text-yellow-500" />
          <span className="text-gray-600">
            Stage {stage}/{maxStage}
          </span>
        </div>
        {canEvolve && (
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Can Evolve
          </Badge>
        )}
      </div>
    );
  };

  return (
    <>
      <Card 
        className={`${sizeClasses[size]} cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-105 ${className}`}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold truncate">
              {petName}
            </CardTitle>
            <Badge className={`${rarityColor} text-white`}>
              {rarity}
            </Badge>
          </div>
          <p className="text-sm text-gray-600">{petType}</p>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Pet Image */}
          <div className={`relative ${imageSizeClasses[size]} bg-gray-100 rounded-lg overflow-hidden`}>
            {!imageError ? (
              <img
                src={imageUrl}
                alt={`${petName} - ${rarity} card`}
                className="w-full h-full object-cover"
                loading="lazy"
                onLoad={() => setImageLoading(false)}
                onError={() => {
                  setImageError(true);
                  setImageLoading(false);
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Heart className="w-8 h-8" />
              </div>
            )}
            
            {imageLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Rarity overlay */}
            <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${rarityColor} shadow-lg`}></div>
          </div>

          {/* Evolution Info */}
          {renderEvolutionInfo()}

          {/* Stats */}
          {size !== 'small' && renderStats()}

          {/* Actions */}
          {showActions && size !== 'small' && (
            <div className="flex space-x-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1"
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <span>{petName}</span>
              <Badge className={`${rarityColor} text-white`}>
                {rarity}
              </Badge>
            </DialogTitle>
            <DialogDescription>
              {petType} • Created {createdAt ? new Date(createdAt.toDate()).toLocaleDateString() : 'Recently'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Image */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={imageUrl}
                  alt={`${petName} - ${rarity} card`}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div className="flex space-x-2">
                <Button onClick={handleShare} className="flex-1">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
                <Button onClick={handleDownload} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-4">
              {renderEvolutionInfo()}
              
              <div>
                <h4 className="font-semibold mb-3">Stats</h4>
                {renderStats()}
              </div>

              {evolution?.canEvolve && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Ready to Evolve!</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This card meets the requirements for evolution to the next stage.
                  </p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ImageCard;
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/src/components/ImageCard.jsx" "jsx"
    
    info "ImageCard.jsx React component generated successfully"
}

# Generate UploadPage.jsx React page component (Requirement 1.6, 3.1, 3.2, 3.4)
generate_uploadpage_component() {
    info "Generating UploadPage.jsx React page component..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/src/pages/UploadPage.jsx" << 'EOF'
import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Share2,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ImageCard from '@/components/ImageCard';

const UploadPage = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedCard, setGeneratedCard] = useState(null);
  const [error, setError] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  
  const fileInputRef = useRef(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (JPEG, PNG, etc.)');
      return;
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);
    setSelectedFile(file);

    // Create preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle drag and drop
  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Clear selected file
  const clearFile = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Convert file to base64
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  // Generate card
  const handleGenerateCard = async () => {
    if (!selectedFile || !user) {
      setError('Please select an image and ensure you are logged in');
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    setError(null);

    try {
      // Convert file to base64
      setGenerationProgress(20);
      const base64Data = await fileToBase64(selectedFile);

      // Prepare request data
      const requestData = {
        imageData: base64Data,
        petName: petName.trim() || 'Unknown Pet',
        petType: petType.trim() || 'Pet',
        userId: user.uid
      };

      setGenerationProgress(40);

      // Call the generate API
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(requestData)
      });

      setGenerationProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate card');
      }

      const result = await response.json();
      setGenerationProgress(100);

      if (result.success) {
        setGeneratedCard(result.card);
        // Clear form after successful generation
        clearFile();
        setPetName('');
        setPetType('');
      } else {
        throw new Error(result.message || 'Card generation failed');
      }

    } catch (error) {
      console.error('Error generating card:', error);
      setError(error.message || 'An unexpected error occurred while generating the card');
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
    }
  };

  // Download generated card
  const handleDownloadCard = async () => {
    if (!generatedCard?.images?.processed) return;

    try {
      const response = await fetch(generatedCard.images.processed);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${generatedCard.petName}-card.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading card:', error);
      setError('Failed to download card');
    }
  };

  // Share generated card
  const handleShareCard = async () => {
    if (!generatedCard) return;

    const shareData = {
      title: `Check out my ${generatedCard.rarity} ${generatedCard.petName} card!`,
      text: `I just generated an awesome ${generatedCard.rarity} trading card for my pet ${generatedCard.petName}!`,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(`${shareData.title} ${shareData.url}`);
        // You could show a toast notification here
        alert('Card link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing card:', error);
    }
  };

  // Generate another card
  const handleGenerateAnother = () => {
    setGeneratedCard(null);
    setError(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Generate Pet Trading Card
          </h1>
          <p className="text-lg text-gray-600">
            Transform your pet photos into unique collectible trading cards
          </p>
        </div>

        {!generatedCard ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Pet Photo
                </CardTitle>
                <CardDescription>
                  Select or drag and drop a photo of your pet to get started
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload Area */}
                <div
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50'
                      : selectedFile
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  {previewUrl ? (
                    <div className="relative">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-w-full max-h-48 mx-auto rounded-lg"
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={clearFile}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="w-12 h-12 mx-auto text-gray-400" />
                      <div>
                        <p className="text-sm text-gray-600">
                          Drag and drop your image here, or{' '}
                          <button
                            type="button"
                            className="text-blue-600 hover:text-blue-500 font-medium"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            browse
                          </button>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Supports JPEG, PNG (max 10MB)
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>

                {/* Pet Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="petName">Pet Name</Label>
                    <Input
                      id="petName"
                      value={petName}
                      onChange={(e) => setPetName(e.target.value)}
                      placeholder="Enter your pet's name"
                      maxLength={50}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="petType">Pet Type</Label>
                    <Input
                      id="petType"
                      value={petType}
                      onChange={(e) => setPetType(e.target.value)}
                      placeholder="e.g., Dog, Cat, Bird, etc."
                      maxLength={30}
                    />
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateCard}
                  disabled={!selectedFile || isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Card...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Trading Card
                    </>
                  )}
                </Button>

                {/* Progress Bar */}
                {isGenerating && (
                  <div className="space-y-2">
                    <Progress value={generationProgress} className="w-full" />
                    <p className="text-sm text-gray-600 text-center">
                      {generationProgress < 30 && 'Processing image...'}
                      {generationProgress >= 30 && generationProgress < 70 && 'Generating card...'}
                      {generationProgress >= 70 && 'Finalizing...'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Instructions/Tips */}
            <Card>
              <CardHeader>
                <CardTitle>Tips for Best Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Clear, well-lit photos</p>
                      <p className="text-sm text-gray-600">
                        Use good lighting and avoid blurry or dark images
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Focus on your pet</p>
                      <p className="text-sm text-gray-600">
                        Make sure your pet is the main subject of the photo
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">High resolution</p>
                      <p className="text-sm text-gray-600">
                        Higher quality images produce better trading cards
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Unique poses</p>
                      <p className="text-sm text-gray-600">
                        Action shots and personality-filled poses work great
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Card Features</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Rarity</Badge>
                      <span className="text-gray-600">Auto-assigned</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Stats</Badge>
                      <span className="text-gray-600">AI-generated</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Evolution</Badge>
                      <span className="text-gray-600">3 stages</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">Sharing</Badge>
                      <span className="text-gray-600">Social ready</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          /* Generated Card Display */
          <div className="space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full mb-4">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Card Generated Successfully!</span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="max-w-sm">
                <ImageCard
                  card={generatedCard}
                  onClick={() => {}}
                  showStats={true}
                />
              </div>
            </div>

            <div className="flex justify-center gap-4">
              <Button onClick={handleDownloadCard} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
              <Button onClick={handleShareCard} variant="outline">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button onClick={handleGenerateAnother}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Another
              </Button>
            </div>

            <Card className="max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle>Your {generatedCard.rarity} Card</CardTitle>
                <CardDescription>
                  {generatedCard.petName} • {generatedCard.petType}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {Object.entries(generatedCard.stats || {}).map(([stat, value]) => (
                    <div key={stat} className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{value}</div>
                      <div className="text-sm text-gray-600 capitalize">{stat}</div>
                    </div>
                  ))}
                </div>
                
                {generatedCard.evolution && (
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Evolution Stage</span>
                      <Badge variant="outline">
                        Stage {generatedCard.evolution.stage} of {generatedCard.evolution.maxStage}
                      </Badge>
                    </div>
                    {generatedCard.evolution.canEvolve && (
                      <p className="text-sm text-gray-600 mt-1">
                        This card can be evolved! Visit the Evolution page to upgrade it.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/src/pages/UploadPage.jsx" "jsx"
    
    info "UploadPage.jsx React page component generated successfully"
}

# Generate EvolutionPage.jsx React page component (Requirement 1.6, 3.1, 3.2, 3.4)
generate_evolutionpage_component() {
    info "Generating EvolutionPage.jsx React page component..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/src/pages/EvolutionPage.jsx" << 'EOF'
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Loader2,
  Sparkles,
  ArrowRight,
  Star,
  Trophy,
  Zap,
  Heart,
  Brain,
  Play,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import ImageCard from '@/components/ImageCard';

const EvolutionPage = () => {
  const [userCards, setUserCards] = useState([]);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEvolving, setIsEvolving] = useState(false);
  const [evolutionProgress, setEvolutionProgress] = useState(0);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, canEvolve, maxLevel
  const [searchTerm, setSearchTerm] = useState('');
  const [evolutionResult, setEvolutionResult] = useState(null);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  // Load user's cards
  useEffect(() => {
    if (user) {
      loadUserCards();
    }
  }, [user]);

  const loadUserCards = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/cards?userId=${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${await user.getIdToken()}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load cards');
      }

      const data = await response.json();
      setUserCards(data.cards || []);
    } catch (error) {
      console.error('Error loading cards:', error);
      setError('Failed to load your cards. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and search cards
  const filteredCards = userCards.filter(card => {
    // Apply search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      if (!card.petName.toLowerCase().includes(searchLower) &&
          !card.petType.toLowerCase().includes(searchLower) &&
          !card.rarity.toLowerCase().includes(searchLower)) {
        return false;
      }
    }

    // Apply evolution filter
    switch (filter) {
      case 'canEvolve':
        return card.evolution?.canEvolve && card.evolution.stage < card.evolution.maxStage;
      case 'maxLevel':
        return card.evolution?.stage === card.evolution?.maxStage;
      default:
        return true;
    }
  });

  // Check if card can evolve
  const canEvolve = (card) => {
    if (!card.evolution) return false;
    if (card.evolution.stage >= card.evolution.maxStage) return false;
    if (!card.evolution.canEvolve) return false;

    // Check evolution requirements
    const requirements = card.evolution.evolutionRequirements;
    if (!requirements) return true;

    // Check level requirement
    const currentLevel = card.level || 1;
    if (requirements.minLevel && currentLevel < requirements.minLevel) {
      return false;
    }

    // Check stat requirements
    if (requirements.requiredStats) {
      for (const [stat, requiredValue] of Object.entries(requirements.requiredStats)) {
        const currentValue = card.stats?.[stat] || 0;
        if (currentValue < requiredValue) {
          return false;
        }
      }
    }

    return true;
  };

  // Get evolution requirements text
  const getEvolutionRequirements = (card) => {
    if (!card.evolution?.evolutionRequirements) return null;

    const requirements = card.evolution.evolutionRequirements;
    const reqText = [];

    if (requirements.minLevel) {
      const currentLevel = card.level || 1;
      const levelMet = currentLevel >= requirements.minLevel;
      reqText.push({
        text: `Level ${requirements.minLevel}`,
        met: levelMet,
        current: currentLevel
      });
    }

    if (requirements.requiredStats) {
      Object.entries(requirements.requiredStats).forEach(([stat, requiredValue]) => {
        const currentValue = card.stats?.[stat] || 0;
        const statMet = currentValue >= requiredValue;
        reqText.push({
          text: `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${requiredValue}`,
          met: statMet,
          current: currentValue
        });
      });
    }

    return reqText;
  };

  // Evolve card
  const handleEvolveCard = async (card) => {
    if (!canEvolve(card)) {
      setError('This card cannot be evolved at this time');
      return;
    }

    setIsEvolving(true);
    setEvolutionProgress(0);
    setError(null);
    setEvolutionResult(null);

    try {
      setEvolutionProgress(20);

      const response = await fetch('/api/evolve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          cardId: card.id,
          userId: user.uid
        })
      });

      setEvolutionProgress(60);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to evolve card');
      }

      const result = await response.json();
      setEvolutionProgress(100);

      if (result.success) {
        setEvolutionResult({
          originalCard: card,
          evolvedCard: result.card
        });

        // Update the card in the local state
        setUserCards(prevCards => 
          prevCards.map(c => c.id === card.id ? result.card : c)
        );

        // Clear selected card to show the result
        setSelectedCard(null);
      } else {
        throw new Error(result.message || 'Evolution failed');
      }

    } catch (error) {
      console.error('Error evolving card:', error);
      setError(error.message || 'An unexpected error occurred during evolution');
    } finally {
      setIsEvolving(false);
      setEvolutionProgress(0);
    }
  };

  // Get rarity color
  const getRarityColor = (rarity) => {
    switch (rarity?.toLowerCase()) {
      case 'common': return 'text-gray-600 bg-gray-100';
      case 'uncommon': return 'text-green-600 bg-green-100';
      case 'rare': return 'text-blue-600 bg-blue-100';
      case 'epic': return 'text-purple-600 bg-purple-100';
      case 'legendary': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Get stage name
  const getStageName = (stage) => {
    switch (stage) {
      case 1: return 'Baby';
      case 2: return 'Adult';
      case 3: return 'Elder';
      default: return `Stage ${stage}`;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Card Evolution Center
          </h1>
          <p className="text-lg text-gray-600">
            Evolve your pet cards to unlock new stages and enhanced abilities
          </p>
        </div>

        {/* Evolution Result Display */}
        {evolutionResult && (
          <Card className="mb-8 border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle className="w-5 h-5" />
                Evolution Successful!
              </CardTitle>
              <CardDescription>
                Your {evolutionResult.originalCard.petName} has evolved to the next stage!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-8">
                <div className="text-center">
                  <div className="mb-2">
                    <ImageCard
                      card={evolutionResult.originalCard}
                      onClick={() => {}}
                      showStats={false}
                      className="max-w-48"
                    />
                  </div>
                  <Badge variant="outline">
                    {getStageName(evolutionResult.originalCard.evolution?.stage)}
                  </Badge>
                </div>
                
                <ArrowRight className="w-8 h-8 text-green-600" />
                
                <div className="text-center">
                  <div className="mb-2">
                    <ImageCard
                      card={evolutionResult.evolvedCard}
                      onClick={() => {}}
                      showStats={false}
                      className="max-w-48"
                    />
                  </div>
                  <Badge variant="outline">
                    {getStageName(evolutionResult.evolvedCard.evolution?.stage)}
                  </Badge>
                </div>
              </div>
              
              <div className="mt-6 text-center">
                <Button onClick={() => setEvolutionResult(null)}>
                  Continue Evolving
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Loading your cards...</p>
          </div>
        ) : (
          <Tabs defaultValue="cards" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="cards">My Cards</TabsTrigger>
              <TabsTrigger value="evolution">Evolution Lab</TabsTrigger>
            </TabsList>

            {/* Cards Tab */}
            <TabsContent value="cards" className="space-y-6">
              {/* Filters and Search */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Search cards by name, type, or rarity..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant={filter === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('all')}
                      >
                        All Cards
                      </Button>
                      <Button
                        variant={filter === 'canEvolve' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('canEvolve')}
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Can Evolve
                      </Button>
                      <Button
                        variant={filter === 'maxLevel' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter('maxLevel')}
                      >
                        <Trophy className="w-4 h-4 mr-1" />
                        Max Level
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Cards Grid */}
              {filteredCards.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {userCards.length === 0 ? 'No Cards Yet' : 'No Cards Match Your Filter'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {userCards.length === 0 
                        ? 'Generate your first pet card to get started with evolution!'
                        : 'Try adjusting your search or filter criteria.'
                      }
                    </p>
                    {userCards.length === 0 && (
                      <Button onClick={() => navigate('/upload')}>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate First Card
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredCards.map((card) => (
                    <div key={card.id} className="relative">
                      <ImageCard
                        card={card}
                        onClick={() => setSelectedCard(card)}
                        showStats={true}
                        className="cursor-pointer hover:shadow-lg transition-shadow"
                      />
                      
                      {/* Evolution Status Overlay */}
                      <div className="absolute top-2 right-2 flex flex-col gap-1">
                        <Badge className={getRarityColor(card.rarity)}>
                          {card.rarity}
                        </Badge>
                        
                        {card.evolution && (
                          <Badge variant="outline" className="text-xs">
                            {getStageName(card.evolution.stage)} 
                            {card.evolution.stage < card.evolution.maxStage && (
                              <ArrowRight className="w-3 h-3 ml-1" />
                            )}
                          </Badge>
                        )}
                        
                        {canEvolve(card) && (
                          <Badge className="bg-green-100 text-green-800 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Ready
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Evolution Lab Tab */}
            <TabsContent value="evolution" className="space-y-6">
              {selectedCard ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Selected Card Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Selected Card</CardTitle>
                      <CardDescription>
                        {selectedCard.petName} • {selectedCard.petType}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex justify-center">
                        <ImageCard
                          card={selectedCard}
                          onClick={() => {}}
                          showStats={true}
                          className="max-w-sm"
                        />
                      </div>

                      {/* Current Stats */}
                      <div>
                        <h4 className="font-medium mb-2">Current Stats</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(selectedCard.stats || {}).map(([stat, value]) => (
                            <div key={stat} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm capitalize">{stat}</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Evolution Status */}
                      {selectedCard.evolution && (
                        <div>
                          <h4 className="font-medium mb-2">Evolution Status</h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm">Current Stage</span>
                              <Badge variant="outline">
                                {getStageName(selectedCard.evolution.stage)} 
                                ({selectedCard.evolution.stage}/{selectedCard.evolution.maxStage})
                              </Badge>
                            </div>
                            
                            {selectedCard.evolution.stage < selectedCard.evolution.maxStage && (
                              <div className="space-y-2">
                                <span className="text-sm font-medium">Requirements for Next Stage:</span>
                                {getEvolutionRequirements(selectedCard)?.map((req, index) => (
                                  <div key={index} className="flex items-center justify-between text-sm">
                                    <span className={req.met ? 'text-green-600' : 'text-red-600'}>
                                      {req.met ? <CheckCircle className="w-4 h-4 inline mr-1" /> : <AlertCircle className="w-4 h-4 inline mr-1" />}
                                      {req.text}
                                    </span>
                                    {req.current !== undefined && (
                                      <span className="text-gray-500">({req.current})</span>
                                    )}
                                  </div>
                                )) || (
                                  <p className="text-sm text-green-600">
                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                    Ready to evolve!
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Evolution Action */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Evolution Lab</CardTitle>
                      <CardDescription>
                        Transform your card to the next evolution stage
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedCard.evolution?.stage >= selectedCard.evolution?.maxStage ? (
                        <div className="text-center py-8">
                          <Trophy className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
                          <h3 className="text-lg font-medium mb-2">Maximum Evolution Reached!</h3>
                          <p className="text-gray-600">
                            This card has reached its final evolution stage.
                          </p>
                        </div>
                      ) : canEvolve(selectedCard) ? (
                        <div className="space-y-4">
                          <div className="text-center">
                            <Sparkles className="w-12 h-12 mx-auto text-blue-500 mb-4" />
                            <h3 className="text-lg font-medium mb-2">Ready to Evolve!</h3>
                            <p className="text-gray-600 mb-4">
                              Your {selectedCard.petName} meets all requirements for evolution.
                            </p>
                          </div>

                          {/* Evolution Preview */}
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Evolution Preview</h4>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span>Stage:</span>
                                <span>{getStageName(selectedCard.evolution.stage)} → {getStageName(selectedCard.evolution.stage + 1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Stat Boost:</span>
                                <span className="text-green-600">+15-25% to all stats</span>
                              </div>
                              <div className="flex justify-between">
                                <span>New Abilities:</span>
                                <span>Enhanced visual effects</span>
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={() => handleEvolveCard(selectedCard)}
                            disabled={isEvolving}
                            className="w-full"
                            size="lg"
                          >
                            {isEvolving ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Evolving...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Evolve Card
                              </>
                            )}
                          </Button>

                          {/* Evolution Progress */}
                          {isEvolving && (
                            <div className="space-y-2">
                              <Progress value={evolutionProgress} className="w-full" />
                              <p className="text-sm text-gray-600 text-center">
                                {evolutionProgress < 30 && 'Preparing evolution...'}
                                {evolutionProgress >= 30 && evolutionProgress < 70 && 'Processing transformation...'}
                                {evolutionProgress >= 70 && 'Finalizing evolution...'}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="w-12 h-12 mx-auto text-orange-500 mb-4" />
                          <h3 className="text-lg font-medium mb-2">Requirements Not Met</h3>
                          <p className="text-gray-600 mb-4">
                            Your card needs to meet certain requirements before it can evolve.
                          </p>
                          
                          <div className="text-left bg-orange-50 p-4 rounded-lg">
                            <h4 className="font-medium mb-2">Missing Requirements:</h4>
                            {getEvolutionRequirements(selectedCard)?.filter(req => !req.met).map((req, index) => (
                              <div key={index} className="text-sm text-orange-700 mb-1">
                                • {req.text} {req.current !== undefined && `(currently ${req.current})`}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="pt-4 border-t">
                        <Button
                          variant="outline"
                          onClick={() => setSelectedCard(null)}
                          className="w-full"
                        >
                          Select Different Card
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Sparkles className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a Card to Evolve
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Choose a card from the "My Cards" tab to begin the evolution process.
                    </p>
                    <Button variant="outline" onClick={() => document.querySelector('[value="cards"]').click()}>
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Browse My Cards
                    </Button>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default EvolutionPage;
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/src/pages/EvolutionPage.jsx" "jsx"
    
    info "EvolutionPage.jsx React page component generated successfully"
}

# Generate README.md with comprehensive setup instructions (Requirement 1.7, 2.3, 2.4)
generate_readme() {
    info "Generating README.md with setup instructions..."
    
    # Use heredoc with quoted delimiter to prevent shell interpretation (Requirement 4.3)
    cat > "$ROOT/README.md" << 'EOF'
# Pet Card Generator

Transform your pet photos into collectible trading cards with AI-powered enhancements, rarity systems, and evolution mechanics.

## 🎯 Project Overview

The Pet Card Generator is a full-stack web application that combines modern React frontend with Firebase backend services to create an engaging pet photo transformation experience. Users can upload pet photos, generate unique trading cards with randomized stats and rarities, and evolve their cards through multiple stages.

### Key Features

- **AI-Powered Card Generation**: Transform pet photos into trading cards with enhanced backgrounds
- **Rarity System**: Cards are assigned rarities (Common, Uncommon, Rare, Epic, Legendary) with corresponding stat bonuses
- **Evolution Mechanics**: Cards can evolve through multiple stages with improved stats and visual effects
- **User Authentication**: Secure user accounts with Firebase Auth
- **Cloud Storage**: Reliable image storage and retrieval with Firebase Storage
- **Real-time Database**: Card data persistence with Firestore

## 🏗️ Project Structure

```
pet-card-generator/
├── functions/                 # Firebase Cloud Functions
│   ├── index.js              # Main function entry point with Express app
│   ├── generate.js           # Card generation endpoint
│   └── evolve.js             # Card evolution endpoint
├── src/                      # React frontend source code
│   ├── components/           # Reusable React components
│   │   ├── Navbar.jsx        # Navigation component with auth
│   │   └── ImageCard.jsx     # Card display component
│   └── pages/                # Page-level components
│       ├── UploadPage.jsx    # Photo upload and generation interface
│       └── EvolutionPage.jsx # Card evolution interface
├── docs/                     # Project documentation
│   ├── Complete-PRD.md       # Product Requirements Document
│   └── Stage10-Closure.md    # Project closure documentation
└── README.md                 # This file
```

## 🚀 Quick Start

### Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- **Firebase CLI** (`npm install -g firebase-tools`)
- **Git** for version control

### Environment Setup

1. **Clone or extract the project**:
   ```bash
   cd pet-card-generator
   ```

2. **Install dependencies**:
   ```bash
   # Install Firebase Functions dependencies
   cd functions
   npm install
   
   # Install frontend dependencies (if using React app)
   cd ../
   npm install
   ```

3. **Configure Firebase**:
   ```bash
   # Login to Firebase
   firebase login
   
   # Initialize Firebase project (if not already done)
   firebase init
   ```

### Environment Variables

Create the following environment files with your specific configuration:

#### Firebase Functions Environment (`.env` in functions directory)

```bash
# n8n Workflow Configuration
N8N_WORKFLOW_URL=https://your-n8n-instance.com/webhook/your-workflow-id
N8N_API_KEY=your-n8n-api-key

# n8n Evolution Workflow (optional, falls back to main workflow)
N8N_EVOLUTION_WORKFLOW_URL=https://your-n8n-instance.com/webhook/evolution-workflow-id

# Sentry Error Tracking (optional)
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id

# Firebase Configuration (automatically provided by Firebase)
FIREBASE_CONFIG=auto
GCLOUD_PROJECT=your-firebase-project-id
```

#### Frontend Environment (`.env.local` in root directory)

```bash
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-firebase-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef123456

# API Endpoints
NEXT_PUBLIC_API_BASE_URL=https://your-region-your-project.cloudfunctions.net/api

# Sentry Error Tracking (optional)
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
```

### Firebase Configuration

1. **Create a Firebase project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project or select existing one
   - Enable Authentication, Firestore, and Storage

2. **Configure Firebase services**:
   ```bash
   # Enable required services
   firebase projects:list
   firebase use your-project-id
   
   # Deploy Firestore security rules (create firestore.rules)
   firebase deploy --only firestore:rules
   
   # Deploy storage security rules (create storage.rules)
   firebase deploy --only storage
   ```

3. **Set up Authentication**:
   - Enable Email/Password authentication in Firebase Console
   - Configure authorized domains for your application

## 🔧 Development

### Running Locally

1. **Start Firebase Emulators** (recommended for development):
   ```bash
   firebase emulators:start
   ```

2. **Run Firebase Functions locally**:
   ```bash
   cd functions
   npm run serve
   ```

3. **Run React development server** (if using Create React App):
   ```bash
   npm start
   ```

### Testing

#### Firebase Functions Testing

```bash
cd functions
npm test

# Test specific endpoints
curl -X POST http://localhost:5001/your-project/us-central1/api/generate \
  -H "Content-Type: application/json" \
  -d '{"imageData":"base64-image-data","petName":"Fluffy","userId":"test-user"}'
```

#### Frontend Testing

```bash
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🚀 Deployment

### Firebase Functions Deployment

1. **Deploy all functions**:
   ```bash
   firebase deploy --only functions
   ```

2. **Deploy specific function**:
   ```bash
   firebase deploy --only functions:api
   ```

3. **Set environment variables**:
   ```bash
   firebase functions:config:set n8n.workflow_url="your-workflow-url"
   firebase functions:config:set n8n.api_key="your-api-key"
   ```

### Frontend Deployment

#### Option 1: Firebase Hosting

```bash
# Build the React app
npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

#### Option 2: Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy to Vercel
vercel --prod
```

#### Option 3: Netlify Deployment

```bash
# Build the app
npm run build

# Deploy build folder to Netlify
# (Use Netlify dashboard or CLI)
```

## 🔌 API Endpoints

### Card Generation

**POST** `/api/generate`

Generate a new pet card from uploaded image.

```json
{
  "imageData": "base64-encoded-image-data",
  "petName": "Fluffy",
  "petType": "Cat",
  "userId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "cardId": "generated-card-id",
  "card": {
    "petName": "Fluffy",
    "rarity": "Rare",
    "stats": {
      "cuteness": 85,
      "energy": 72,
      "loyalty": 90
    }
  }
}
```

### Card Evolution

**POST** `/api/evolve`

Evolve an existing card to the next stage.

```json
{
  "cardId": "existing-card-id",
  "userId": "user-id"
}
```

**Response:**
```json
{
  "success": true,
  "evolvedCard": {
    "id": "card-id",
    "evolution": {
      "stage": 2,
      "stageName": "Adult"
    },
    "stats": {
      "cuteness": 95,
      "energy": 88
    }
  }
}
```

## 🛠️ Configuration

### Firebase Security Rules

#### Firestore Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cards collection - users can only access their own cards
    match /cards/{cardId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
    
    // Evolution logs - read-only for card owners
    match /evolutionLogs/{logId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
  }
}
```

#### Storage Rules (`storage.rules`)

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pet-images/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```

### n8n Workflow Setup

The application integrates with n8n workflows for AI image processing. Set up your n8n workflow with the following endpoints:

1. **Image Generation Workflow**:
   - Receives: `imageUrl`, `petName`, `petType`
   - Returns: `processedImageUrl`, `enhancedBackground`

2. **Evolution Workflow** (optional):
   - Receives: `cardId`, `currentStage`, `targetStage`, `currentImageUrl`
   - Returns: `evolvedImageUrl`, `evolutionEffects`

## 📊 Monitoring and Analytics

### Error Tracking with Sentry

1. **Install Sentry**:
   ```bash
   npm install @sentry/react @sentry/node
   ```

2. **Configure Sentry** in your application initialization

3. **Monitor errors** in Sentry dashboard

### Firebase Analytics

Enable Firebase Analytics in your Firebase project to track:
- Card generation events
- Evolution success rates
- User engagement metrics
- Performance monitoring

## 🔍 Troubleshooting

### Common Issues

#### Firebase Functions Deployment Errors

```bash
# Check function logs
firebase functions:log

# Test functions locally
firebase emulators:start --only functions

# Verify environment variables
firebase functions:config:get
```

#### Image Upload Issues

- **File size limit**: Maximum 10MB per image
- **Supported formats**: JPEG, PNG, HEIC
- **CORS issues**: Ensure proper CORS configuration in Firebase Functions

#### n8n Integration Issues

- **Timeout errors**: Increase timeout values in function configuration
- **API key issues**: Verify n8n API key and workflow URL
- **Fallback handling**: Application provides fallback when n8n is unavailable

#### Authentication Issues

- **Unauthorized errors**: Check Firebase Auth configuration
- **CORS issues**: Verify authorized domains in Firebase Console
- **Token expiration**: Implement token refresh logic

### Performance Optimization

1. **Image Optimization**:
   - Compress images before upload
   - Use appropriate image formats
   - Implement lazy loading for card galleries

2. **Function Optimization**:
   - Use connection pooling for database connections
   - Implement caching for frequently accessed data
   - Optimize cold start times

3. **Frontend Optimization**:
   - Code splitting and lazy loading
   - Image optimization and caching
   - Bundle size optimization

## 📚 Additional Resources

### Documentation

- [Complete Product Requirements Document](./docs/Complete-PRD.md)
- [Project Closure Documentation](./docs/Stage10-Closure.md)
- [Firebase Documentation](https://firebase.google.com/docs)
- [React Documentation](https://reactjs.org/docs)

### Support

For issues and questions:

1. Check the troubleshooting section above
2. Review Firebase Console for error logs
3. Check n8n workflow status and logs
4. Monitor Sentry for application errors

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

---

**Happy card generating! 🎴✨**

*Transform your pet photos into magical trading cards and watch them evolve!*
EOF
    
    # Validate the generated file
    validate_generated_file "$ROOT/README.md" "md"
    
    info "README.md with comprehensive setup instructions generated successfully"
}

# Validate entire project structure (Requirement 4.4)
validate_project_structure() {
    info "Validating complete project structure..."
    
    # Define expected files and their types
    local -A expected_files=(
        ["$ROOT/docs/Complete-PRD.md"]="md"
        ["$ROOT/functions/index.js"]="js"
        ["$ROOT/functions/generate.js"]="js"
        ["$ROOT/functions/evolve.js"]="js"
        ["$ROOT/src/components/Navbar.jsx"]="jsx"
        ["$ROOT/src/components/ImageCard.jsx"]="jsx"
        ["$ROOT/src/pages/UploadPage.jsx"]="jsx"
        ["$ROOT/src/pages/EvolutionPage.jsx"]="jsx"
        ["$ROOT/README.md"]="md"
    )
    
    # Check each expected file
    local validation_errors=0
    for file_path in "${!expected_files[@]}"; do
        if [ ! -f "$file_path" ]; then
            error_exit "Missing expected file: $file_path"
            ((validation_errors++))
        elif [ ! -s "$file_path" ]; then
            error_exit "Empty file detected: $file_path"
            ((validation_errors++))
        fi
    done
    
    # Check directory structure
    local expected_dirs=(
        "$ROOT"
        "$ROOT/functions"
        "$ROOT/src"
        "$ROOT/src/components"
        "$ROOT/src/pages"
        "$ROOT/docs"
    )
    
    for dir_path in "${expected_dirs[@]}"; do
        if [ ! -d "$dir_path" ]; then
            error_exit "Missing expected directory: $dir_path"
            ((validation_errors++))
        fi
    done
    
    if [ $validation_errors -eq 0 ]; then
        info "Project structure validation completed successfully"
        info "Generated files:"
        find "$ROOT" -type f -name "*.js" -o -name "*.jsx" -o -name "*.md" | sort
    else
        error_exit "Project structure validation failed with $validation_errors errors"
    fi
}

# Main execution function
main() {
    info "Starting Pet Card Generator project scaffolding..."
    
    # Validate environment before proceeding
    validate_environment
    
    # Create the directory structure
    create_directory_structure
    
    # Generate documentation
    generate_complete_prd
    
    # Generate Firebase Cloud Functions
    generate_functions_index
    generate_functions_generate
    generate_functions_evolve
    
    # Generate React components
    generate_navbar_component
    generate_imagecard_component
    
    # Generate React page components
    generate_uploadpage_component
    generate_evolutionpage_component
    
    # Generate README.md and setup instructions
    generate_readme
    
    # Validate the complete project structure
    validate_project_structure
    
    info "Pet Card Generator project scaffolding completed successfully!"
    info "Project root directory: $ROOT"
    info "All files have been generated and validated"
    info "Next steps:"
    info "  1. cd $ROOT"
    info "  2. Follow the setup instructions in README.md"
    info "  3. Configure environment variables"
    info "  4. Deploy Firebase functions"
}

# Execute main function if script is run directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi