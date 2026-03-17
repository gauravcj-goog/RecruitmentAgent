"""Recruitment Agent definition for Cymbal Bank."""

import os

from google.adk.agents import Agent
from google.adk.tools import google_search
from google.genai import types
from subagents.job_application.agent import agent as job_application
from tools.vertex_search import vertex_search_tool

# Default models for Live API with native audio support:
# - Gemini Live API: gemini-2.5-flash-native-audio-preview-12-2025
# - Vertex AI Live API: gemini-live-2.5-flash-native-audio
import yaml
from pathlib import Path

# Load instruction from YAML
prompt_path = Path(__file__).parent / "prompt.yaml"
with open(prompt_path, "r") as f:
    prompt_config = yaml.safe_load(f)
    instruction = prompt_config.get("instruction", "")

agent = Agent(
    name="recruitment_agent",
    model=os.getenv(
        "DEMO_AGENT_MODEL",
        "gemini-live-2.5-flash-native-audio" if os.getenv("GOOGLE_GENAI_USE_VERTEXAI", "").upper() == "TRUE" else "gemini-2.5-flash-native-audio-preview-12-2025"
    ),
    sub_agents=[job_application],
    tools=[vertex_search_tool], 
    instruction=instruction,
)
root_agent = agent