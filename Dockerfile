FROM python:3.11-slim

WORKDIR /app

# Install dependencies
# We use pip directly, assuming requirements from pyproject.toml or manually specified
# Since pyproject.toml is used, we can install it using pip if it supports it, or manual.
# Let's extract dependencies manually to be safe or install .
# "google-adk>=1.20.0", "fastapi>=0.115.0", "python-dotenv>=1.0.0", "uvicorn[standard]>=0.32.0"

RUN pip install --no-cache-dir "google-adk>=1.20.0" "fastapi>=0.115.0" "python-dotenv>=1.0.0" "uvicorn[standard]>=0.32.0" "google-genai" "google-cloud-discoveryengine>=0.11.0" "google-cloud-bigtable" "python-multipart" "google-cloud-storage"

# Copy application code
COPY app /app/app

# Set working directory to where main.py is
WORKDIR /app/app

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run the application
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
