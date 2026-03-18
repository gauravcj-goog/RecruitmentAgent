#!/bin/bash
# Script to recreate BigTable for the Recruitment Agent

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
INSTANCE_ID="recruitment-instance"
TABLE_ID="job_applications"
COL_FAMILY="cf1"

echo "Recreating BigTable in project: $PROJECT_ID..."

# Check if table exists, if so delete it
if gcloud bigtable tables describe $TABLE_ID --instance=$INSTANCE_ID --project $PROJECT_ID > /dev/null 2>&1; then
    echo "Deleting existing table $TABLE_ID..."
    gcloud bigtable tables delete $TABLE_ID --instance=$INSTANCE_ID --project $PROJECT_ID --quiet
fi

# Create table
echo "Creating fresh BigTable table $TABLE_ID..."
gcloud bigtable tables create $TABLE_ID --instance=$INSTANCE_ID --project $PROJECT_ID --column-families=$COL_FAMILY

echo "BigTable recreation complete."
