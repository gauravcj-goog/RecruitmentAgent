# Cymbal Bank Recruitment Assistant (V2)

A multimodal AI assistant designed for **Cymbal Bank, India**. This application leverages the **Gemini 3.1 Pro Preview** model to provide real-time interactions for recruitment and HR queries, featuring structured data extraction from resumes and robust data persistence in BigTable.

## 🌟 Key Features

-   **Intelligent Policy Search**: Real-time answers to employee and candidate queries (e.g., leave policies, insurance) using **Vertex AI Search** (RAG).
-   **Structured Data Extraction**: Automatically extracts personal, educational, and employment details from uploaded resumes, with improved handling of lists and incomplete data.
-   **Asynchronous Recruiter Analysis**: Offloads heavy document analysis to background tasks, ensuring fast UI response times during uploads.
-   **Date-Aware Analysis**: Recruiter analyzer is aware of the current date for accurate gap and timeline calculations.
-   **Data Loss Prevention**: Prevents overwriting valid profile data with defaults when parsing partial documents.
-   **Multi-Format Document Support**: Processes PDF and image (JPEG, PNG) documents.
-   **Robust JSON Parsing**: Uses a custom stack-based extractor to handle nested JSON objects and ignore trailing text, ensuring reliable extraction even when models output extra text.
-   **Deep-Merge Persistence in BigTable**: Merges new document uploads (like PAN cards) without losing previously captured resume data.
-   **Live Candidate Profile UI**: Dedicated tab showing the full candidate profile, including auto-expanding Recruiter Notes.
-   **Enforced Rebranding**: Automatically replaces any backend or data mentions of "Axis Bank" with "Cymbal Bank" to maintain consistent branding.

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Generative AI** | Gemini 3.1 Pro Preview |
| **Knowledge Engine** | Vertex AI Search (RAG) |
| **Database** | Google Cloud BigTable |
| **Storage** | Google Cloud Storage |
| **Backend** | Python 3.11, FastAPI |
| **Frontend** | Vanilla HTML5 / CSS (Modern Glassmorphism) / Vanilla JS |
| **Deployment** | Google Cloud Run (`asia-south1`) |


## 🌐 Hosted Solution Endpoints

-   **Candidate Portal (Frontend)**: [https://recruitment-agent-v2-frontend-787798151876.asia-south1.run.app](https://recruitment-agent-v2-frontend-787798151876.asia-south1.run.app)
-   **API Backend**: [https://recruitment-agent-v2-backend-787798151876.asia-south1.run.app](https://recruitment-agent-v2-backend-787798151876.asia-south1.run.app)
-   **GCS Document Storage**: `gs://<YOUR_UPLOADS_BUCKET>`

## 🚀 Recent Stability & Quality Improvements

-   **UI Optimizations**: The "Agent is thinking..." message no longer flashes on load. The "Recruiter Notes" section now defaults to expanded state on the profile tab.
-   **Privacy Controls**: Internal recruiter notes and backend status messages are strictly filtered from candidate-facing chat views.
-   **Robust JSON Extraction**: Replaced brittle regex matching with stack-based parsing in `bigtable_tools.py` to prevent data persistence failures on malformed LLM outputs.
-   **Branding Interceptor**: Added a string-replacement filter at the edge of BigTable reads and writes to enforce "Cymbal Bank" as the exclusive brand.

---

## 💻 Local Development & Deployment

### 1. Environment Configuration

Create an `app/.env` file with the following critical variables:

```bash
GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT_ID>
GOOGLE_CLOUD_LOCATION=us-central1
DEMO_AGENT_MODEL=gemini-2.5-flash
DATA_STORE_ID=recruitment-policies-ds
SEARCH_LOCATION=global
UPLOADS_BUCKET=<YOUR_UPLOADS_BUCKET>
BIGTABLE_INSTANCE=recruitment-instance
```

## 🚀 How to Deploy

### Cloud Run Deployment

To deploy the backend to Cloud Run, use the following command from the project root directory:

```bash
gcloud run deploy recruitment-agent-backend \
  --source . \
  --region asia-south1 \
  --allow-unauthenticated \
  --set-env-vars GOOGLE_GENAI_USE_VERTEXAI=TRUE,DEMO_AGENT_MODEL=gemini-3.1-pro-preview,GOOGLE_CLOUD_PROJECT=<YOUR_PROJECT_ID>,GOOGLE_CLOUD_LOCATION=global,DATA_STORE_ID=<YOUR_DATA_STORE_ID>,SEARCH_LOCATION=global,ALLOWED_ORIGINS="*"
```

*Note: Ensure you have the Google Cloud SDK installed and authenticated, and that your active project is set correctly or specified in the environment variables.*

