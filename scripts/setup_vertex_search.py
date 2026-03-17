import os
import sys
import time
from google.api_core.exceptions import AlreadyExists, NotFound
from google.api_core.client_options import ClientOptions
from google.oauth2 import credentials
from google.cloud import discoveryengine_v1 as discoveryengine
from google.cloud import storage

def get_credentials():
    """Gets credentials from gcloud."""
    token = os.popen('gcloud auth print-access-token').read().strip()
    if not token:
        print("Warning: Could not retrieve gcloud access token. Falling back to ADC.")
        return None
    return credentials.Credentials(token)

def create_data_store(project_id, location, data_store_id, display_name, creds=None):
    """Creates a Discovery Engine Data Store."""
    options = ClientOptions(quota_project_id=project_id)
    client = discoveryengine.DataStoreServiceClient(credentials=creds, client_options=options)
    parent = f"projects/{project_id}/locations/{location}/collections/default_collection"

    # Define the data store
    data_store = discoveryengine.DataStore(
        display_name=display_name,
        industry_vertical=discoveryengine.IndustryVertical.GENERIC,
        content_config=discoveryengine.DataStore.ContentConfig.CONTENT_REQUIRED,
        solution_types=[discoveryengine.SolutionType.SOLUTION_TYPE_SEARCH],
    )

    print(f"Creating Data Store: {data_store_id}...")
    try:
        operation = client.create_data_store(
            parent=parent,
            data_store=data_store,
            data_store_id=data_store_id,
        )
        # Wait for the operation to complete
        response = operation.result()
        print(f"Data Store created successfully: {response.name}")
        return response
    except AlreadyExists:
        print(f"Data Store {data_store_id} already exists.")
        return client.get_data_store(name=f"{parent}/dataStores/{data_store_id}")

def create_engine(project_id, location, data_store_id, engine_id, display_name, creds=None):
    """Creates a Discovery Engine Engine."""
    options = ClientOptions(quota_project_id=project_id)
    client = discoveryengine.EngineServiceClient(credentials=creds, client_options=options)
    parent = f"projects/{project_id}/locations/{location}/collections/default_collection"

    # Define the engine
    engine = discoveryengine.Engine(
        display_name=display_name,
        solution_type=discoveryengine.SolutionType.SOLUTION_TYPE_SEARCH,
        data_store_ids=[data_store_id],
        search_engine_config=discoveryengine.Engine.SearchEngineConfig(
            search_tier=discoveryengine.SearchTier.SEARCH_TIER_ENTERPRISE,
            search_add_ons=[discoveryengine.SearchAddOn.SEARCH_ADD_ON_LLM],
        ),
    )

    print(f"Creating Engine: {engine_id}...")
    try:
        operation = client.create_engine(
            parent=parent,
            engine=engine,
            engine_id=engine_id,
        )
        # Wait for the operation to complete
        response = operation.result()
        print(f"Engine created successfully: {response.name}")
        return response
    except AlreadyExists:
        print(f"Engine {engine_id} already exists.")
        return client.get_engine(name=f"{parent}/engines/{engine_id}")

def ensure_bucket_exists(bucket_name, project_id, creds=None):
    """Ensures a GCS bucket exists."""
    storage_client = storage.Client(project=project_id, credentials=creds)
    try:
        bucket = storage_client.get_bucket(bucket_name)
        print(f"Bucket {bucket_name} already exists.")
        return bucket
    except NotFound:
        print(f"Creating bucket {bucket_name}...")
        bucket = storage_client.create_bucket(bucket_name)
        print(f"Bucket {bucket_name} created.")
        return bucket

def upload_to_gcs(bucket_name, source_file_path, destination_blob_name, project_id, creds=None):
    """Uploads a file to GCS."""
    storage_client = storage.Client(project=project_id, credentials=creds)
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(destination_blob_name)
    print(f"Uploading {source_file_path} to gs://{bucket_name}/{destination_blob_name}...")
    blob.upload_from_filename(source_file_path)
    print("Upload complete.")
    return f"gs://{bucket_name}/{destination_blob_name}"

def import_documents(project_id, location, data_store_id, gcs_uri, creds=None):
    """Imports documents from GCS to a Data Store."""
    options = ClientOptions(quota_project_id=project_id)
    client = discoveryengine.DocumentServiceClient(credentials=creds, client_options=options)
    parent = f"projects/{project_id}/locations/{location}/collections/default_collection/dataStores/{data_store_id}/branches/0"

    request = discoveryengine.ImportDocumentsRequest(
        parent=parent,
        gcs_source=discoveryengine.GcsSource(
            input_uris=[gcs_uri],
        ),
        # Wait for the import to finish is too long, we just trigger it
        reconciliation_mode=discoveryengine.ImportDocumentsRequest.ReconciliationMode.INCREMENTAL,
    )

    print(f"Initiating import from {gcs_uri}...")
    operation = client.import_documents(request=request)
    print(f"Import triggered. Operation name: {operation.operation.name}")
    return operation

if __name__ == "__main__":
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    if not project_id:
        print("Error: GOOGLE_CLOUD_PROJECT environment variable is not set.")
        sys.exit(1)

    location = os.getenv("SEARCH_LOCATION", "global")
    data_store_id = os.getenv("DATA_STORE_ID", "recruitment-policies-ds")
    engine_id = os.getenv("ENGINE_ID", "recruitment-policies-engine")
    display_name = "Recruitment Policies"
    
    # GCS Config
    bucket_name = f"{project_id}-recruitment-assets"
    pdf_path = os.path.join(os.path.dirname(__file__), "../assets/Leave Policy.pdf")

    try:
        # 0. Get Credentials
        creds = get_credentials()

        # 1. Infrastructure
        create_data_store(project_id, location, data_store_id, display_name, creds=creds)
        create_engine(project_id, location, data_store_id, engine_id, display_name, creds=creds)
        
        # 2. Document Import
        if os.path.exists(pdf_path):
            ensure_bucket_exists(bucket_name, project_id, creds=creds)
            gcs_uri = upload_to_gcs(bucket_name, pdf_path, "Leave Policy.pdf", project_id, creds=creds)
            import_documents(project_id, location, data_store_id, gcs_uri, creds=creds)
        else:
            print(f"Warning: File not found at {pdf_path}. Skipping document import.")

        print("\nVertex AI Search RAG Engine setup complete.")
        print(f"DATA_STORE_ID: {data_store_id}")
        print(f"ENGINE_ID: {engine_id}")
    except Exception as e:
        print(f"Error during setup: {e}")
        sys.exit(1)

