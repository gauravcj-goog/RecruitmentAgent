"""Recruitment Agent definition for Cymbal Bank."""

import os
import yaml
from pathlib import Path
from google.adk.agents import Agent
from subagents.job_application.agent import agent as job_application
from tools.vertex_search import search_hr_policies
from tools.bigtable_tools import get_candidate_profile

# Load instruction from YAML
prompt_path = Path(__file__).parent / "prompt.yaml"
with open(prompt_path, "r") as f:
    prompt_config = yaml.safe_load(f)
    base_instruction = prompt_config.get("instruction", "")

lifecycle_instruction = """
CANDIDATE LIFECYCLE MANAGEMENT:
1. At the VERY BEGINNING of every session, you MUST politely ask the user for their Email ID (Candidate ID).
2. Once provided, use the 'get_candidate_profile' tool to check if they have an existing profile.
3. If profile found, summarize their progress (e.g., 'I see you've already provided your graduation details!'). 
4. SERVICE OFFERING (MANDATORY): Once the ID is confirmed, explicitly offer both of these services:
   - **HR & Company Policies**: Search for information on employer policies, benefits, culture, etc. (using search_hr_policies).
   - **Job Application Support**: Continue or start the formal application process (using the job_application sub-agent).
5. Transition naturally between these modes based on user interest.
6. If the user asks for any information related to HR policies, use the `search_hr_policies` tool to answer them directly. Branch employees have policies relevant for them.
"""
combined_instruction = f"{base_instruction}\n\n{lifecycle_instruction}"

agent = Agent(
    name="recruitment_agent",
    model=os.getenv(
        "DEMO_AGENT_MODEL",
        "gemini-3.1-pro-preview"
    ),
    sub_agents=[job_application],
    tools=[search_hr_policies, get_candidate_profile], 
    instruction=combined_instruction,
)
root_agent = agent