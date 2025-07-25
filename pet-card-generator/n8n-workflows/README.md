# n8n Workflow Templates

This directory contains n8n workflow templates for the Pet Card Generator application.

## Setup Instructions

1. **Create n8n Cloud Account**: Sign up at https://n8n.cloud
2. **Import Workflows**: Import the JSON files from this directory into your n8n instance
3. **Configure Credentials**: Set up the required credentials in n8n:
   - Replicate API credentials
   - RunwayML API credentials
   - Firebase Admin SDK credentials
   - Webhook URLs

## Workflows

### 1. Pet Card Generation Workflow (`pet-card-generation.json`)
- Triggers: HTTP webhook from frontend
- Steps:
  1. Receive image upload and user preferences
  2. Call Replicate API for AI image generation
  3. Generate multiple style variants
  4. Assign rarity based on weighted algorithm
  5. Create GIF animation using FFMpeg
  6. Store results in Firebase Storage
  7. Update Firestore with card metadata
  8. Send response back to frontend

### 2. Card Evolution Workflow (`card-evolution.json`)
- Triggers: HTTP webhook for premium users
- Steps:
  1. Validate premium subscription status
  2. Retrieve original card data
  3. Call enhanced AI model for evolution
  4. Generate higher quality animations
  5. Update card with evolution stage
  6. Store evolution history

### 3. Video Generation Workflow (`video-generation.json`)
- Triggers: HTTP webhook for premium video requests
- Steps:
  1. Validate premium subscription
  2. Call RunwayML API for video generation
  3. Process and optimize video file
  4. Store in Firebase Storage
  5. Update card metadata

## Environment Variables

Configure these in your n8n instance:

```
REPLICATE_API_TOKEN=your_token
RUNWAYML_API_TOKEN=your_token
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email
```

## Webhook URLs

After importing workflows, update these URLs in your frontend environment:

- Card Generation: `https://your-n8n-instance.app.n8n.cloud/webhook/generate-card`
- Card Evolution: `https://your-n8n-instance.app.n8n.cloud/webhook/evolve-card`
- Video Generation: `https://your-n8n-instance.app.n8n.cloud/webhook/generate-video`