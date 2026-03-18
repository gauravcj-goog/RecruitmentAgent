"""FastAPI application for Recruitment Portal using standard HTTP."""

import logging
import os
import json
import warnings
from pathlib import Path
from typing import List, Optional

import yaml
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from google.cloud import storage
from google.adk.agents.run_config import RunConfig
from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types
from fastapi.responses import StreamingResponse, JSONResponse
from tools.bigtable_tools import get_candidate_profile, delete_candidate_profile

# Load environment variables from .env file BEFORE importing agent
env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

# Import agent after loading environment variables
from recruitment_agent.agent import agent as recruitment_agent

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Suppress Pydantic serialization warnings
warnings.filterwarnings("ignore", category=UserWarning, module="pydantic")

# Application name constant
APP_NAME = "recruitment-portal"

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Session Service & Runner
session_service = InMemorySessionService()
runner = Runner(
    app_name=APP_NAME,
    agent=recruitment_agent,
    session_service=session_service,
)

# Serve static files
static_path = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=str(static_path)), name="static")

@app.get("/")
async def root():
    return {"message": "Recruitment Portal API is running"}

# ========================================
# Chat Endpoint (HTTP Replace WebSocket)
# ========================================

@app.post("/api/chat")
async def chat(
    user_id: str = Body(...),
    session_id: str = Body(...),
    message: str = Body(...)
):
    """Standard HTTP Chat Endpoint with robust logging."""
    logger.info(f"Chat request starting: user={user_id}, session={session_id}")
    try:
        # Ensure session exists
        logger.info("Checking session...")
        session = await session_service.get_session(
            app_name=APP_NAME, 
            user_id=user_id, 
            session_id=session_id
        )
        if not session:
            logger.info("Creating new session...")
            await session_service.create_session(
                app_name=APP_NAME, 
                user_id=user_id, 
                session_id=session_id
            )

        # Prepare message for ADK
        logger.info(f"Preparing message: {message[:20]}...")
        new_message = types.Content(
            parts=[types.Part(text=message)],
            role="user"
        )

        # Run the agent
        logger.info("Starting runner.run_async...")
        responses = []
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=new_message
        ):
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if part.text:
                        responses.append(part.text)
                    if part.function_call:
                        logger.info(f"Tool Call Detected: {part.function_call.name}")

        final_response = "".join(responses).strip()
        logger.info(f"Response generated: {final_response[:50]}...")
        return {
            "response": final_response,
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"CRITICAL CHAT ERROR: {e}", exc_info=True)
        return {"error": str(e), "session_id": session_id}

# ========================================
# File Upload Endpoint
# ========================================

@app.post("/upload/{session_uuid}")
async def upload_file(session_uuid: str, file: UploadFile = File(...)):
    """Uploads a file to GCS Asia-South1 regional bucket."""
    logger.info(f"Upload: {file.filename}, Session: {session_uuid}")
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    # Using the NEW regional bucket
    bucket_name = f"{project_id}-recruitment-uploads"
    
    try:
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob_name = f"{session_uuid}/{file.filename}"
        blob = bucket.blob(blob_name)
        
        content = await file.read()
        blob.upload_from_string(content, content_type=file.content_type)
        
        gcs_uri = f"gs://{bucket_name}/{blob_name}"
        return {"filename": file.filename, "gcs_uri": gcs_uri}
    except Exception as e:
        logger.error(f"Upload failed: {e}")
        return {"error": str(e)}

# ========================================
# Candidate Profile & Download Endpoints
# ========================================

@app.get("/api/candidate/{email}")
async def get_candidate(email: str):
    """Fetches candidate profile from BigTable."""
    logger.info(f"Fetching profile for: {email}")
    try:
        profile_json = get_candidate_profile(email)
        profile = json.loads(profile_json)
        return profile
    except Exception as e:
        logger.error(f"Error fetching candidate: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.delete("/api/candidate/{email}")
async def delete_candidate(email: str):
    """Deletes candidate profile from BigTable."""
    logger.info(f"Deleting profile for: {email}")
    try:
        success = delete_candidate_profile(email)
        if success:
            return {"message": f"Successfully deleted profile for {email}"}
        else:
            return JSONResponse(status_code=500, content={"error": "Failed to delete profile from BigTable"})
    except Exception as e:
        logger.error(f"Error deleting candidate: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

@app.get("/api/download")
async def download_file(uri: str):
    """Proxies GCS file downloads."""
    if not uri.startswith("gs://"):
        return JSONResponse(status_code=400, content={"error": "Invalid GCS URI"})
    
    logger.info(f"Proxying download for: {uri}")
    try:
        parts = uri.replace("gs://", "").split("/")
        bucket_name = parts[0]
        blob_name = "/".join(parts[1:])
        
        storage_client = storage.Client()
        bucket = storage_client.bucket(bucket_name)
        blob = bucket.blob(blob_name)
        
        # Check if blob exists
        if not blob.exists():
            return JSONResponse(status_code=404, content={"error": "File not found in GCS"})

        content = blob.download_as_bytes()
        filename = blob_name.split("/")[-1]
        
        from io import BytesIO
        return StreamingResponse(
            BytesIO(content),
            media_type="application/octet-stream",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        logger.error(f"Download failed: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
