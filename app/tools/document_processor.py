import os
import json
import logging
import mimetypes
from google.cloud import storage
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def extract_data_from_document(gcs_uri: str, candidate_id: str) -> dict:
    """
    Reads a document (PDF or Image) from GCS and extracts fields for the Job Application Form (JAF).
    
    Args:
        gcs_uri: The GCS path to the document (e.g., gs://bucket/file.pdf or .jpg).
        candidate_id: To track who this is for.
        
    Returns:
        Structured JAF data extracted from the document.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    # Determine vertex ai usage based on environment variable
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    
    if not gcs_uri.startswith("gs://"):
        return {"error": "Invalid GCS URI"}

    # Identify Mime Type
    mime_type, _ = mimetypes.guess_type(gcs_uri)
    if not mime_type:
        # Fallback to standard types based on extension or octet-stream
        if gcs_uri.lower().endswith(".pdf"):
            mime_type = "application/pdf"
        elif gcs_uri.lower().endswith((".jpg", ".jpeg")):
            mime_type = "image/jpeg"
        elif gcs_uri.lower().endswith(".png"):
            mime_type = "image/png"
        elif gcs_uri.lower().endswith(".docx"):
            mime_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif gcs_uri.lower().endswith(".doc"):
            mime_type = "application/msword"
        else:
            mime_type = "application/pdf" # Default fallback
            
    logger.info(f"Processing document {gcs_uri} with mime_type {mime_type}")

    try:
        # Initialize GenAI Client
        model_id = os.getenv("DEMO_AGENT_MODEL", "gemini-2.5-flash")
        if use_vertex:
            client = genai.Client(vertexai=True, project=project_id, location=location)
        else:
            client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        # Load the schema reference
        schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "subagents", "job_application", "job_application_form.yaml")
        with open(schema_path, "r") as f:
            schema_text = f.read()

        prompt = f"""
        You are an expert HR data extractor for Cymbal Bank.
        Analyze the attached document (which could be a PDF, a Word document, or a photo) and extract all relevant information to populate the Job Application Form (JAF).
        
        The target structure is defined in this YAML schema:
        {schema_text}
        
        RULES:
        1. Extract data into the nested JSON structure matching the schema.
        2. If a field is not found, do NOT invent data; omit it.
        3. For boolean fields, infer based on the document content if possible.
        4. Return ONLY valid JSON.
        5. **SEQUENTIAL EDUCATION EXTRACTION**: Carefully identify EVERY educational qualification mentioned (e.g., 10th, 12th, Bachelor's, Master's, Certifications).
        6. **STRUCTURE**: Store multiple qualifications in the `educational_details.education_history` list sequentially.
        7. **CRITICAL**: If the document is a PAN Card or contains a PAN Number, ENSURE the 'pan_number' field in 'personal_details' is populated.
        8. **COMPREHENSIVE EXTRACTION**: Extract data for ALL sections defined in the schema: `personal_details`, `employment_details`, `educational_details`, and `additional_details`. Treat the document as the primary source of truth.
        """

        # Prepare the file part for Gemini
        parts = [
            types.Part.from_uri(file_uri=gcs_uri, mime_type=mime_type),
            types.Part.from_text(text=prompt)
        ]

        response = client.models.generate_content(
            model=model_id,
            contents=parts,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )

        extraction = json.loads(response.text)
        logger.info(f"Successfully extracted data from {gcs_uri} for {candidate_id}")
        
        # Force recruiter analysis if it looks like a resume
        has_employment = extraction.get("employment_details", {}).get("employment_history")
        has_education = extraction.get("educational_details", {}).get("education_history")
        
        if has_employment or has_education:
            logger.info(f"Forcing recruiter analysis for resume-like document {gcs_uri}")
            try:
                analysis = generate_recruiter_analysis(gcs_uri)
                extraction['notes'] = analysis
                logger.info("Recruiter analysis added to extraction notes.")
            except Exception as e:
                logger.error(f"Failed to generate recruiter analysis: {e}")
                extraction['notes'] = f"Error generating analysis: {e}"
                
        return extraction

    except Exception as e:
        logger.error(f"Error extracting data from document: {e}")
        return {"error": str(e)}

def generate_recruiter_analysis(gcs_uri: str) -> str:
    """
    Generates a recruiter analysis for the document at the given GCS URI.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    use_vertex = os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "false").lower() == "true"
    location = os.getenv("GOOGLE_CLOUD_LOCATION", "us-central1")
    
    # Identify Mime Type
    import mimetypes
    mime_type, _ = mimetypes.guess_type(gcs_uri)
    if not mime_type:
        if gcs_uri.lower().endswith(".pdf"):
            mime_type = "application/pdf"
        elif gcs_uri.lower().endswith((".jpg", ".jpeg")):
            mime_type = "image/jpeg"
        elif gcs_uri.lower().endswith(".png"):
            mime_type = "image/png"
        else:
            mime_type = "application/pdf" # Default fallback
            
    logger.info(f"Generating recruiter analysis for {gcs_uri} with mime_type {mime_type}")

    try:
        model_id = os.getenv("DEMO_AGENT_MODEL", "gemini-2.5-flash")
        if use_vertex:
            client = genai.Client(vertexai=True, project=project_id, location=location)
        else:
            client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))

        schema_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "subagents", "recruiter_analyzer", "prompt.yaml")
        import yaml
        with open(schema_path, "r") as f:
            prompt_data = yaml.safe_load(f)
            prompt = prompt_data.get("instruction", "")

        parts = [
            types.Part.from_uri(file_uri=gcs_uri, mime_type=mime_type),
            types.Part.from_text(text=prompt)
        ]

        response = client.models.generate_content(
            model=model_id,
            contents=parts,
        )

        return response.text
    except Exception as e:
        logger.error(f"Error generating recruiter analysis: {e}")
        return f"Error: {e}"

from google.adk.tools import FunctionTool

extract_data_from_document_tool = FunctionTool(
    func=extract_data_from_document,
)

generate_recruiter_analysis_tool = FunctionTool(
    func=generate_recruiter_analysis,
)
