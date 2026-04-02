---
description: How to redeploy the Recruitment Agent application
---

# Recruitment Agent Deployment Workflow

This workflow ensures the recruitment agent is deployed with the correct non-audio model (`gemini-2.5-flash`) and project settings.

## 1. Deploy Backend
Redeploy the backend service to Cloud Run. This service handles the ADK agent logic, BigTable integration, and Vertex AI Search.

// turbo
```bash
gcloud run deploy recruitment-agent-backend \
  --source /usr/local/google/home/gauravcj/dev/recruitment-agent \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=TRUE,DEMO_AGENT_MODEL=gemini-3.1-pro-preview,GOOGLE_CLOUD_PROJECT=learn-361304,GOOGLE_CLOUD_LOCATION=global,DATA_STORE_ID=recruitment-policies-ds,SEARCH_LOCATION=global,ALLOWED_ORIGINS="*"
```

## 2. Deploy Frontend
If the static assets in `app/static` have changed, redeploy the frontend portal.

// turbo
```bash
# Sync static assets to frontend directory
mkdir -p /usr/local/google/home/gauravcj/dev/recruitment-agent/frontend/app && \
cp -r /usr/local/google/home/gauravcj/dev/recruitment-agent/app/static /usr/local/google/home/gauravcj/dev/recruitment-agent/frontend/app/static

# Deploy to Cloud Run
gcloud run deploy recruitment-agent-frontend \
  --source /usr/local/google/home/gauravcj/dev/recruitment-agent/frontend \
  --region asia-south1 \
  --allow-unauthenticated
```
