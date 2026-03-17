import os
import json
from google.cloud import bigtable

def store_job_application(jaf_data: dict) -> str:
    """
    Stores the captured Job Application Form (JAF) data into BigTable.
    
    Args:
        jaf_data: A dictionary containing the JAF structure.
    
    Returns:
        A success message or error message.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    instance_id = "recruitment-instance"
    table_id = "job_applications"
    family_id = "cf1"

    if not project_id:
        return "Error: GOOGLE_CLOUD_PROJECT environment variable is not set."

    try:
        client = bigtable.Client(project=project_id, admin=False)
        instance = client.instance(instance_id)
        table = instance.table(table_id)

        # Extract personal details for the row key
        personal = jaf_data.get("jaf1_pre_offer_document", {}).get("personal_details", {})
        email = personal.get("email_id")
        
        if not email:
            return "Error: Email ID is required to store the application."

        row_key = email.encode("utf-8")
        row = table.direct_row(row_key)

        # Flatten and store details
        # We store nested structures as JSON strings for simplicity in this demo
        # or we can flatten them further. Here we'll store main sections.
        
        sections = ["personal_details", "educational_details", "additional_details", "uploaded_documents"]
        jaf_root = jaf_data.get("jaf1_pre_offer_document", {})
        
        for section in sections:
            data = jaf_root.get(section)
            if data:
                row.set_cell(
                    family_id,
                    section.encode("utf-8"),
                    json.dumps(data).encode("utf-8")
                )

        row.commit()
        print(f"Successfully stored application for {email} in BigTable.")
        return f"Application for {email} has been successfully saved to our records."

    except Exception as e:
        print(f"Error storing in BigTable: {e}")
        return f"Error: Could not save application to records. Details: {str(e)}"
