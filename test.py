from google import genai
from google.genai.errors import APIError

# Your specific project ID is inserted here
PROJECT_ID = "learn-361304"
LOCATION = "global"

print(f"Checking access to gemini-3.1-pro-preview for project '{PROJECT_ID}'...")

# Initialize the Vertex AI client
client = genai.Client(vertexai=True, project=PROJECT_ID, location=LOCATION)

try:
    # Attempt a very small generation request
    response = client.models.generate_content(
        model='gemini-3.1-pro-preview',
        contents='Hello'
    )
    print("✅ SUCCESS! Your project is whitelisted and can access the model.")
    
except APIError as e:
    if e.code == 404:
        print("❌ FAILED (404): The model was not found. Your project is likely not whitelisted for this preview model.")
    elif e.code == 403:
        print("❌ FAILED (403): Permission denied. Ensure your account has the 'Vertex AI User' role in the IAM settings for this project.")
    else:
        print(f"⚠️ Error occurred: {e.message}")
except Exception as e:
    print(f"⚠️ An unexpected error occurred: {e}")
