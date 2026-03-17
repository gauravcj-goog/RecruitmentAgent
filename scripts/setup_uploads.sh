#!/bin/bash
# Script to set up GCS bucket for document uploads

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
BUCKET_NAME="${PROJECT_ID}-recruitment-uploads"
LOCATION="asia-south1"

echo "Setting up Uploads Bucket in project: $PROJECT_ID..."

if gsutil ls gs://$BUCKET_NAME > /dev/null 2>&1; then
    echo "Bucket gs://$BUCKET_NAME already exists."
else
    echo "Creating bucket gs://$BUCKET_NAME in $LOCATION..."
    gsutil mb -l $LOCATION gs://$BUCKET_NAME
fi

echo "Uploads Bucket setup complete."
