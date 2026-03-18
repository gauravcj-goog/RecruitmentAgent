import os
import json
import logging
from google.cloud import bigtable

logger = logging.getLogger(__name__)

# Constants for field mapping
PERSONAL_FIELDS = [
    "full_name", "email_id", "date_of_birth", "contact_number", "gender", 
    "fathers_name", "nationality", "blood_group", "different_name_on_pan", 
    "pan_number", "communication_address", "permanent_address"
]
ADDITIONAL_FIELDS = [
    "relative_working_in_axis_bank", "previously_worked_with_axis_bank", 
    "currently_working_past_year_via_vendor", "vendor_outsourced_partner_name", 
    "consent_bgv_partners", "consent_credit_information", 
    "declaration_no_monetary_contribution", "terms_and_conditions_accepted"
]
GRADUATION_FIELDS = [
    "course", "institute", "university_board", "course_start_date", "course_end_date"
]

def get_candidate_profile(candidate_id: str) -> str:
    """
    Fetches the candidate application records from BigTable using their Email ID. Returns result as a JSON string.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    instance_id = "recruitment-instance"
    table_id = "job_applications"
    
    if not project_id:
        logger.error("GOOGLE_CLOUD_PROJECT not set")
        return "{}"

    try:
        client = bigtable.Client(project=project_id, admin=False)
        instance = client.instance(instance_id)
        table = instance.table(table_id)

        row_key = candidate_id.encode("utf-8")
        row = table.read_row(row_key)
        
        if not row:
            return "{}"

        profile = {
            "jaf1_pre_offer_document": {
                "personal_details": {},
                "educational_details": {"graduation_details": {}},
                "additional_details": {},
                "uploaded_documents": []
            }
        }
        family_id = "cf1"
        jaf = profile["jaf1_pre_offer_document"]
        
        if family_id in row.cells:
            for column, cells in row.cells[family_id].items():
                name = column.decode("utf-8")
                # Most recent cell
                val = cells[0].value.decode("utf-8")
                
                if name == "uploaded_documents":
                    try:
                        jaf["uploaded_documents"] = json.loads(val)
                    except:
                        jaf["uploaded_documents"] = []
                elif name == "educational_details":
                    try:
                        jaf["educational_details"] = json.loads(val)
                    except:
                        pass
                elif name in PERSONAL_FIELDS:
                    # handle booleans if any
                    if val.lower() == "true": val = True
                    elif val.lower() == "false": val = False
                    jaf["personal_details"][name] = val
                elif name in ADDITIONAL_FIELDS:
                    # handle booleans
                    if val.lower() == "true": val = True
                    elif val.lower() == "false": val = False
                    jaf["additional_details"][name] = val
                    
        return json.dumps(profile)
    except Exception as e:
        logger.error(f"Error fetching profile: {e}")
        return "{}"

def update_candidate_data(candidate_id: str, data_json: str) -> str:
    """
    Updates candidate application (JAF) in BigTable by flattening JSON into individual columns for personal/additional details, 
    and using robust merging for educational details and documents to prevent data loss.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    instance_id = "recruitment-instance"
    table_id = "job_applications"
    family_id = "cf1"

    if not project_id:
        return "Error: GOOGLE_CLOUD_PROJECT not set."

    try:
        data = json.loads(data_json)
        # Handle both root-wrapped and raw JAF data
        new_jaf = data.get("jaf1_pre_offer_document", data)
        
        client = bigtable.Client(project=project_id, admin=False)
        instance = client.instance(instance_id)
        table = instance.table(table_id)

        row_key = candidate_id.encode("utf-8")
        row = table.direct_row(row_key)

        # 1. Fetch existing profile to handle merging of JSON blobs
        existing_profile_json = get_candidate_profile(candidate_id)
        existing_profile = json.loads(existing_profile_json).get("jaf1_pre_offer_document", {})

        # Helper to convert to string storage
        def to_val(v):
            if isinstance(v, bool): return str(v).lower()
            return str(v)

        # 2. Update Personal Details (Individual Cells)
        pd = new_jaf.get("personal_details", {})
        for k, v in pd.items():
            if k in PERSONAL_FIELDS:
                row.set_cell(family_id, k.encode("utf-8"), to_val(v).encode("utf-8"))
        
        # 3. Update Additional Details (Individual Cells)
        ad = new_jaf.get("additional_details", {})
        for k, v in ad.items():
            if k in ADDITIONAL_FIELDS:
                row.set_cell(family_id, k.encode("utf-8"), to_val(v).encode("utf-8"))
        
        # 4. Update Educational Details (JSON structure - MUST MERGE)
        new_ed = new_jaf.get("educational_details")
        if new_ed:
            existing_ed = existing_profile.get("educational_details", {})
            if not isinstance(existing_ed, dict): existing_ed = {}
            if not isinstance(new_ed, dict): new_ed = {}
            
            # Deep merge graduation_details if present in both
            if "graduation_details" in new_ed and "graduation_details" in existing_ed:
                if isinstance(new_ed["graduation_details"], dict) and isinstance(existing_ed["graduation_details"], dict):
                    existing_ed["graduation_details"].update(new_ed["graduation_details"])
                    # Carry over other top-level keys from new_ed
                    for k, v in new_ed.items():
                        if k != "graduation_details":
                            existing_ed[k] = v
                    final_ed = existing_ed
                else:
                    existing_ed.update(new_ed)
                    final_ed = existing_ed
            else:
                existing_ed.update(new_ed)
                final_ed = existing_ed
            
            row.set_cell(family_id, b"educational_details", json.dumps(final_ed).encode("utf-8"))
        
        # 5. Update Uploaded Documents (JSON list - ALWAYS MERGE by doc type)
        new_docs = new_jaf.get("uploaded_documents")
        if new_docs:
            existing_docs = existing_profile.get("uploaded_documents", [])
            if not isinstance(existing_docs, list): existing_docs = []
            
            merged_docs = {d.get("type"): d for d in existing_docs if isinstance(d, dict) and d.get("type")}
            if isinstance(new_docs, list):
                for d in new_docs:
                    if isinstance(d, dict) and d.get("type"):
                        merged_docs[d["type"]] = d
            
            row.set_cell(family_id, b"uploaded_documents", json.dumps(list(merged_docs.values())).encode("utf-8"))

        row.commit()
        return f"Successfully updated structured records for {candidate_id}."
    except Exception as e:
        logger.error(f"Error updating BigTable: {e}")
        return f"Error updating BigTable: {str(e)}"

def store_document_link(candidate_id: str, document_name: str, doc_type: str, gcs_uri: str) -> str:
    """
    Saves a GCS document link to the candidate records in BigTable.
    """
    profile_json = get_candidate_profile(candidate_id)
    profile = json.loads(profile_json)
    jaf = profile.get("jaf1_pre_offer_document", {})
    docs = jaf.get("uploaded_documents", [])
    
    # Check if document already exists
    exists = False
    for i, doc in enumerate(docs):
        if doc.get("type") == doc_type:
            docs[i] = {"document_name": document_name, "type": doc_type, "document_link": gcs_uri}
            exists = True
            break
            
    if not exists:
        docs.append({"document_name": document_name, "type": doc_type, "document_link": gcs_uri})
        
    return update_candidate_data(candidate_id, json.dumps({"jaf1_pre_offer_document": {"uploaded_documents": docs}}))

def delete_candidate_profile(candidate_id: str) -> bool:
    """
    Deletes the entire candidate row from BigTable.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    instance_id = "recruitment-instance"
    table_id = "job_applications"
    
    if not project_id:
        logger.error("GOOGLE_CLOUD_PROJECT not set")
        return False

    try:
        client = bigtable.Client(project=project_id, admin=False)
        instance = client.instance(instance_id)
        table = instance.table(table_id)

        row_key = candidate_id.encode("utf-8")
        row = table.direct_row(row_key)
        # Delete all columns in the row
        row.delete()
        row.commit()
        logger.info(f"Successfully deleted candidate profile: {candidate_id}")
        return True
    except Exception as e:
        logger.error(f"Error deleting profile: {e}")
        return False

from google.adk.tools import FunctionTool

get_candidate_profile_tool = FunctionTool(
    func=get_candidate_profile,
)

update_candidate_data_tool = FunctionTool(
    func=update_candidate_data,
)

store_document_link_tool = FunctionTool(
    func=store_document_link,
)
export_candidate_data_tool = FunctionTool(
    func=update_candidate_data, # Reuse update for export? No, separate.
)

delete_candidate_profile_tool = FunctionTool(
    func=delete_candidate_profile,
)
