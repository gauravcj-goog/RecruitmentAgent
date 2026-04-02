import os
import json
import logging
import mimetypes
from google.cloud import storage
from google import genai
from google.genai import types
from datetime import datetime

logger = logging.getLogger(__name__)

def extract_data_from_document(gcs_uri: str, candidate_id: str, force_analysis: bool = False) -> dict:
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
        model_id = os.getenv("DEMO_AGENT_MODEL", "gemini-3.1-pro-preview")
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
        1. **STRUCTURE**: Extract data into the nested JSON structure matching the schema.
        2. **LISTS ARE CRITICAL**: For `employment_details.employment_history` and `educational_details.education_history`, you MUST identify and extract *multiple* entries if present. Do not just take the most recent one.
        3. **SEQUENTIAL EXTRACTION**: For employment and education history, extract items in chronological order (or as they appear). Ensure each item has `company_name`/`institute` and `designation`/`course`.
        4. **INCOMPLETE DATA**: If a field (like start_date or end_date) is missing but the event (job or degree) is mentioned, STILL extract the item and fill the available fields. Use "N/A" or leave empty only if completely unknown.
        5. **NO HALLUCINATION**: If a field is not found in the document, do NOT invent data; omit it.
        6. **BOOLEAN OMISSION**: For fields in `additional_details` (usually booleans), if the document does not mention the information, DO NOT include the field in the JSON output. Do not default to false. Omission is required to prevent overwriting previously saved data.
        7. Return ONLY valid JSON.
        8. **CRITICAL**: If the document is a PAN Card or contains a PAN Number, ENSURE the 'pan_number' field in 'personal_details' is populated.
        9. **COMPREHENSIVE EXTRACTION**: Extract data for ALL sections defined in the schema: `personal_details`, `employment_details`, `educational_details`, and `additional_details`. Treat the document as the primary source of truth.
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
        
        # Force recruiter analysis if requested or if it looks like a resume
        has_employment = extraction.get("employment_details", {}).get("employment_history")
        has_education = extraction.get("educational_details", {}).get("education_history")
        
        if force_analysis or has_employment or has_education:
            logger.info(f"Forcing recruiter analysis for resume-like document {gcs_uri}")
            try:
                # Fetch existing notes from BigTable
                from tools.bigtable_tools import get_candidate_profile
                existing_notes = None
                try:
                    profile_json = get_candidate_profile(candidate_id)
                    profile = json.loads(profile_json).get("jaf1_pre_offer_document", {})
                    existing_notes = profile.get("notes")
                    if existing_notes:
                        logger.info(f"Found existing notes for {candidate_id}, passing to analyzer.")
                except Exception as e:
                    logger.warning(f"Could not fetch existing profile/notes: {e}")

                analysis = generate_recruiter_analysis(gcs_uri, existing_notes)
                if "jaf1_pre_offer_document" in extraction:
                    extraction["jaf1_pre_offer_document"]["notes"] = analysis
                else:
                    extraction["notes"] = analysis
                logger.info("Recruiter analysis added to extraction notes.")
            except Exception as e:
                logger.error(f"Failed to generate recruiter analysis: {e}")
                if "jaf1_pre_offer_document" in extraction:
                    extraction["jaf1_pre_offer_document"]["notes"] = f"Error generating analysis: {e}"
                else:
                    extraction["notes"] = f"Error generating analysis: {e}"
                
        return extraction

    except Exception as e:
        logger.error(f"Error extracting data from document: {e}")
        return {"error": str(e)}

def generate_recruiter_analysis(gcs_uri: str, existing_notes: str = None) -> str:
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
        model_id = os.getenv("DEMO_AGENT_MODEL", "gemini-3.1-pro-preview")
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
        ]
        
        current_date = datetime.now().strftime("%Y-%m-%d")
        full_prompt = f"Today's Date: {current_date}\n\n{prompt}"
        if existing_notes:
            full_prompt += f"\n\nExisting Recruiter Notes for reference:\n{existing_notes}\n\nPlease update the analysis based on the new document provided above. Preserve the existing analysis if the new document doesn't add any new critical information or anomalies."
            
        parts.append(types.Part.from_text(text=full_prompt))

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
