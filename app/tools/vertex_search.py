import os
import logging
from typing import Optional
from google.cloud import discoveryengine_v1beta as discoveryengine

logger = logging.getLogger(__name__)

def search_hr_policies(query: str) -> str:
    """
    Search for Cymbal Bank HR and onboarding policies using Vertex AI Search.
    
    Args:
        query: The search query.
        
    Returns:
        A summary of the search results or a message if no results are found.
    """
    project_id = os.getenv("GOOGLE_CLOUD_PROJECT")
    location = os.getenv("SEARCH_LOCATION", "global")
    data_store_id = os.getenv("DATA_STORE_ID")
    
    if not data_store_id:
        logger.warning("DATA_STORE_ID not set. Vertex AI Search will not work.")
        return "Sorry, I cannot access the HR policies right now as the search engine is not configured."

    logger.debug(f"Searching for: {query} in data store: {data_store_id}")
    
    client = discoveryengine.SearchServiceClient()
    
    serving_config = client.serving_config_path(
        project=project_id,
        location=location,
        data_store=data_store_id,
        serving_config="default_search",
    )
    
    request = discoveryengine.SearchRequest(
        serving_config=serving_config,
        query=query,
        page_size=3,
    )
    
    try:
        response = client.search(request)
        
        results = []
        logger.debug(f"Search results count: {len(response.results)}")
        
        for result in response.results:
            doc = result.document
            derived_data = doc.derived_struct_data
            
            # 1. Try Extractive Answers (best for PDFs)
            extractive_answers = derived_data.get("extractive_answers", [])
            if extractive_answers:
                content = extractive_answers[0].get("content", "")
                if content:
                    results.append(content)
                    continue

            # 2. Try Summary
            summary = derived_data.get("summary", "")
            if summary:
                results.append(summary)
                continue

            # 3. Fallback to Snippets
            snippets = derived_data.get("snippets", [])
            if snippets:
                snippet = snippets[0].get("snippet", "")
                if snippet:
                    results.append(snippet)
                    continue
            
            # 4. Final Fallback to Document Title/Metadata if available
            title = derived_data.get("title", "Untitled Policy")
            results.append(f"Found policy: {title} (no snippet available)")
            
        if not results:
            logger.info("Search returned results but no usable snippets were extracted.")
            return "No specific policies found for your query. Please contact HR directly."
            
        final_answer = "\n\n".join(results)
        logger.debug(f"Final search tool answer length: {len(final_answer)}")
        return final_answer
        
    except Exception as e:
        logger.error(f"Error searching Vertex AI Search: {e}")
        return f"An error occurred while searching for policies: {str(e)}"

# Define the tool for ADK
from google.adk.tools import FunctionTool
vertex_search_tool = FunctionTool(
    func=search_hr_policies,
)
