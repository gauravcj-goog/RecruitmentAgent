import os
import yaml
import logging
from pathlib import Path
from google.adk.agents import Agent
from tools.web_search_tool import search_web

logger = logging.getLogger(__name__)

def load_prompt() -> str:
    """Loads prompt from YAML."""
    dir_path = os.path.dirname(os.path.realpath(__file__))
    prompt_path = os.path.join(dir_path, "prompt.yaml")
    with open(prompt_path, "r") as file:
        prompt_data = yaml.safe_load(file)
    return prompt_data.get("instruction", "").strip()

agent = Agent(
    name="recruiter_analyzer",
    description="Use this sub-agent to critically examine resumes for anomalies and verify links.",
    model=os.getenv(
        "DEMO_AGENT_MODEL",
        "gemini-3.1-pro-preview"
    ),
    instruction=load_prompt(),
    tools=[search_web],
)
