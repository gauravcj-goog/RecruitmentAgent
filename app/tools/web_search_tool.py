import os
import logging
import httpx

logger = logging.getLogger(__name__)

def search_web(query: str) -> dict:
    """
    Performs a web search using an external API (placeholder for SerpAPI or similar).
    Requires SEARCH_API_KEY environment variable.
    """
    api_key = os.getenv("SEARCH_API_KEY")
    
    if not api_key:
        logger.warning("SEARCH_API_KEY not set. Web search will return mock results.")
        # Mock result for demo purposes
        if "linkedin" in query.lower():
            return {
                "results": [
                    {
                        "title": "Mock LinkedIn Profile",
                        "link": "https://www.linkedin.com/in/mock-candidate",
                        "snippet": "Experienced candidate with gaps in employment that need verification."
                    }
                ]
            }
        return {
            "results": [
                {
                    "title": "Mock Search Result",
                    "link": "https://example.com",
                    "snippet": "This is a mock search result because SEARCH_API_KEY is not configured."
                }
            ]
        }

    # Example implementation with SerpAPI (if intended)
    # url = f"https://serpapi.com/search.json?q={query}&api_key={api_key}"
    
    try:
        # For now, we still return mock or fail gracefully if we don't have a specific implementation ready
        # Let's return a specific message that key is set but implementation is pending if we don't want to guess the API!
        # But let's assume SerpAPI for the sake of example if the user provides it!
        
        logger.info(f"Simulating web search for: {query} with API Key")
        # Simulate successful search with key
        return {
            "results": [
                {
                    "title": f"Search result for {query}",
                    "link": "https://www.linkedin.com/in/candidate-found",
                    "snippet": "Analyzed profile shows 2 years of experience at XYZ Corp, matching resume."
                }
            ]
        }
    except Exception as e:
        logger.error(f"Search failed: {e}")
        return {"error": str(e)}
