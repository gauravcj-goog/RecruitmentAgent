import os
import json
import logging
from google.cloud import storage
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

def extract_data_from_document(gcs_uri: str, candidate_id: str) -> dict:
    """
    Reads a document from GCS and extracts fields for the Job Application Form (JAF).
    
    Args:
        gcs_uri: The GCS path to the document (e.g., gs://bucket/file.pdf).
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

    try:
        # Initialize GenAI Client
        model_id = os.getenv("DEMO_AGENT_MODEL", "gemini-2.0-flash")
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
        Analyze the attached document and extract all relevant information to populate the Job Application Form (JAF).
        
        The target structure is defined in this YAML schema:
        {schema_text}
        
        RULES:
        1. Extract data into the nested JSON structure matching the schema.
        2. If a field is not found, do NOT invent data; omit it.
        3. For boolean fields, infer based on the document content if possible.
        4. Return ONLY valid JSON.
        5. **CRITICAL**: If the document is a PAN Card or contains a PAN Number, ENSURE the 'pan_number' field in 'personal_details' is populated.
        6. Focus especially on 'personal_details' and 'educational_details'.
        """

        # Prepare the file part for Gemini
        # We can pass GCS URI directly to Gemini if using Vertex AI and the URI is accessible
        # For simplicity across both AI Studio and Vertex, we'll pass the GCS part
        parts = [
            types.Part.from_uri(file_uri=gcs_uri, mime_type="application/pdf"),
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
        return extraction

    except Exception as e:
        logger.error(f"Error extracting data from document: {e}")
        return {"error": str(e)}

from google.adk.tools import FunctionTool

extract_data_from_document_tool = FunctionTool(
    func=extract_data_from_document,
)
