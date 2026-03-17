#!/bin/bash
# Script to set up BigTable for the Recruitment Agent using gcloud

PROJECT_ID=${GOOGLE_CLOUD_PROJECT:-$(gcloud config get-value project)}
INSTANCE_ID="recruitment-instance"
CLUSTER_ID="recruitment-cluster"
ZONE="asia-south1-a"
TABLE_ID="job_applications"
COL_FAMILY="cf1"

echo "Setting up BigTable in project: $PROJECT_ID..."

# Check if instance exists
if gcloud bigtable instances describe $INSTANCE_ID --project $PROJECT_ID > /dev/null 2>&1; then
    echo "Instance $INSTANCE_ID already exists."
else
    echo "Creating BigTable instance $INSTANCE_ID..."
    # Note: DEVELOPMENT type is a good choice for this demo/test.
    # If it fails due to regional restrictions, PROVISIONED with 1 node might be needed.
    gcloud bigtable instances create $INSTANCE_ID \
        --project=$PROJECT_ID \
        --cluster=$CLUSTER_ID \
        --cluster-zone=$ZONE \
        --display-name="Recruitment Instance" \
        --instance-type=DEVELOPMENT
fi

# Check if table exists
if gcloud bigtable tables describe $TABLE_ID --instance=$INSTANCE_ID --project $PROJECT_ID > /dev/null 2>&1; then
    echo "Table $TABLE_ID already exists."
else
    echo "Creating BigTable table $TABLE_ID..."
    gcloud bigtable tables create $TABLE_ID --instance=$INSTANCE_ID --project $PROJECT_ID --column-families=$COL_FAMILY
fi

echo "BigTable setup complete."
