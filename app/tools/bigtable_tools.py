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

        logger.info(f"Existing profile for {candidate_id}: {json.dumps(existing_profile)}")
        logger.info(f"New update for {candidate_id}: {json.dumps(new_jaf)}")

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
        
        # 4. Update Educational Details (List-based additive merge)
        new_ed = new_jaf.get("educational_details")
        existing_ed = existing_profile.get("educational_details", {})
        if not isinstance(existing_ed, dict): existing_ed = {}
        
        # If new_ed is provided, merge it. If not, we don't touch educational_details column (BigTable persistence)
        if new_ed:
            existing_hist = existing_ed.get("education_history", [])
            if not isinstance(existing_hist, list): existing_hist = []
            
            new_hist = new_ed.get("education_history", [])
            if not isinstance(new_hist, list): new_hist = []
            
            # Use granular key for deduplication: course|institute|start_date
            def get_edu_key(d):
                if not isinstance(d, dict): return "invalid"
                return f"{d.get('course', 'N/A').lower()}|{d.get('institute', 'N/A').lower()}|{d.get('course_start_date', 'N/A')}"

            # Start with EXISTING items
            merged_hist_dict = {get_edu_key(d): d for d in existing_hist if isinstance(d, dict)}
            # Update/Append with NEW items
            for d in new_hist:
                if isinstance(d, dict) and d.get("course") and d.get("institute"):
                    # Merge existing entry if it's the same degree, filling gaps
                    key = get_edu_key(d)
                    if key in merged_hist_dict:
                        merged_hist_dict[key].update({k: v for k, v in d.items() if v})
                    else:
                        merged_hist_dict[key] = d
            
            final_ed = {"education_history": list(merged_hist_dict.values())}
            
            # Deep merge other top-level keys within educational_details (like graduation_details)
            # Carry over EVERYTHING from existing_ed that isn't overridden
            for k, v in existing_ed.items():
                if k != "education_history" and k not in final_ed:
                    final_ed[k] = v
            # Now incorporate new top-level ed fields
            for k, v in new_ed.items():
                if k != "education_history":
                    final_ed[k] = v
            
            logger.info(f"Merged educational_details for {candidate_id}: {json.dumps(final_ed)}")
            row.set_cell(family_id, b"educational_details", json.dumps(final_ed).encode("utf-8"))
        
        # 5. Update Uploaded Documents (JSON list - MERGE by document_link)
        new_docs = new_jaf.get("uploaded_documents")
        if new_docs:
            existing_docs = existing_profile.get("uploaded_documents", [])
            if not isinstance(existing_docs, list): existing_docs = []
            
            # Use URI as unique key
            merged_docs = {d.get("document_link"): d for d in existing_docs if isinstance(d, dict) and d.get("document_link")}
            if isinstance(new_docs, list):
                for d in new_docs:
                    if isinstance(d, dict) and d.get("document_link"):
                        if d["document_link"] in merged_docs:
                            merged_docs[d["document_link"]].update({k: v for k, v in d.items() if v})
                        else:
                            merged_docs[d["document_link"]] = d
            
            final_docs = list(merged_docs.values())
            logger.info(f"Merged uploaded_documents for {candidate_id}: {json.dumps(final_docs)}")
            row.set_cell(family_id, b"uploaded_documents", json.dumps(final_docs).encode("utf-8"))

        row.commit()
        return f"Successfully updated structured records for {candidate_id}."
    except Exception as e:
        logger.error(f"Error updating BigTable: {e}")
        return f"Error updating BigTable: {str(e)}"

def store_document_link(candidate_id: str, document_name: str, doc_type: str, gcs_uri: str) -> str:
    """
    Saves a GCS document link to the candidate records in BigTable.
    Allows multiple files for the same type by appending new URIs.
    """
    profile_json = get_candidate_profile(candidate_id)
    profile = json.loads(profile_json)
    jaf = profile.get("jaf1_pre_offer_document", {})
    docs = jaf.get("uploaded_documents", [])
    if not isinstance(docs, list): docs = []
    
    # Check if this exact URI already exists
    exists = False
    for doc in docs:
        if doc.get("document_link") == gcs_uri:
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
