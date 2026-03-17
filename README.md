# Cymbal Bank Recruitment Assistant

A multimodal voice assistant designed for **Cymbal Bank, India**. This application leverages **Google's Agent Development Kit (ADK)** and the **Gemini 2.5 Flash Native Audio** model to provide real-time, bidirectional voice interactions for recruitment and HR queries.

![Recruitment Assistant Portfolio Interface](assets/ScreenShot.png)

## 🌟 Domain Solution: Hybrid Recruitment Agent

The Cymbal Bank Recruitment Assistant is a comprehensive AI solution for modernizing the candidate experience. It combines conversational AI with structured data capture and document management to streamline the recruitment funnel.

### Core Capabilities
-   **Intelligent Policy Search**: Real-time answers to employee and candidate queries (e.g., maternity leave, medical insurance) using **Vertex AI Search** indexed over official PDF policies.
-   **Automated Job Application**: A specialized sub-agent that guides candidates through the application process, capturing personal, educational, and professional details.
-   **Seamless Document Upload**: Integrated support for uploading mandatory documents (Resume, PAN Card, Salary Slips) directly through the chat interface.
-   **Persistence & Persistence**: Structured data is extracted and stored in **Google Cloud BigTable** for downstream HR processing.
-   **Multimodal Interaction**: Supports high-fidelity voice (Native Audio), text, and image/camera interactions.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Generative AI** | Gemini 2.5 Flash (Native Audio) via Multimodal Live API |
| **Agent Framework** | Google Agent Development Kit (ADK) |
| **Knowledge Engine** | Vertex AI Search (RAG over PDF policies) |
| **Database** | Google Cloud BigTable (for structured application data) |
| **Storage** | Google Cloud Storage (for uploaded documents) |
| **Backend** | Python 3.11, FastAPI, WebSockets |
| **Frontend** | Vanilla HTML5 / Modern CSS (Glassmorphism) / Vanilla JS |
| **Deployment** | Google Cloud Run (Mumbai Region: `asia-south1`) |

---

## 🌐 Hosted Solution Endpoints

Access the live recruitment portal and backend services at the following URLs:

-   **Candidate Portal (Frontend)**: [https://recruitment-agent-ui-787798151876.asia-south1.run.app](https://recruitment-agent-ui-787708151876.asia-south1.run.app)
-   **API Backend**: [https://recruitment-agent-backend-787798151876.asia-south1.run.app](https://recruitment-agent-backend-787798151876.asia-south1.run.app)
-   **GCS Document Storage**: `gs://learn-361304-recruitment-uploads`

---

## 🚀 Deployment & Infrastructure Guide

### 1. Project Infrastructure Setup

Run the provided automation scripts to provision the necessary Google Cloud resources in the Mumbai region (`asia-south1`):

```bash
export GOOGLE_CLOUD_PROJECT=your-project-id

# 1. Setup Vertex AI Search (Global/Location specific)
./scripts/setup_vertex_search.sh

# 2. Setup BigTable (Table: job_applications, Family: cf1)
./scripts/setup_bigtable.sh

# 3. Setup GCS Uploads Bucket
./scripts/setup_uploads.sh
```

### 2. Environment Configuration

Create an `app/.env` file with the following critical variables:

```bash
# Core Configuration
GOOGLE_CLOUD_PROJECT=learn-361304
GOOGLE_CLOUD_LOCATION=us-central1 # Model location for Native Audio
DEMO_AGENT_MODEL=gemini-live-2.5-flash-native-audio

# Vertex AI Search
DATA_STORE_ID=recruitment-policies-ds
SEARCH_LOCATION=global

# Storage & Database
UPLOADS_BUCKET=learn-361304-recruitment-uploads
BIGTABLE_INSTANCE=recruitment-instance
```

### 3. Cloud Run Deployment

**Deploy the Backend:**
```bash
gcloud run deploy recruitment-agent-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=TRUE,DEMO_AGENT_MODEL=gemini-live-2.5-flash-native-audio,GOOGLE_CLOUD_PROJECT=learn-361304,GOOGLE_CLOUD_LOCATION=us-central1,DATA_STORE_ID=recruitment-policies-ds,SEARCH_LOCATION=global
```

**Deploy the Frontend:**
```bash
# Prepare the static bundle
mkdir -p frontend/app && cp -r app/static frontend/app/static

gcloud run deploy recruitment-agent-ui \
  --source ./frontend \
  --region asia-south1 \
  --allow-unauthenticated
```
