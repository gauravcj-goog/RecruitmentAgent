"""Job Application Agent definition for Cymbal Bank."""

import os
import yaml
from google.adk.agents import Agent

def load_prompt():
    """Load the prompt, document requirements, and JAF fields from YAML files."""
    dir_path = os.path.dirname(__file__)
    
    # Load prompt
    prompt_path = os.path.join(dir_path, "prompt.yaml")
    with open(prompt_path, "r") as file:
        prompt_data = yaml.safe_load(file)
    
    # Load document requirements
    req_path = os.path.join(dir_path, "document_requirements.yaml")
    with open(req_path, "r") as file:
        req_data = yaml.safe_load(file)
    
    # Load JAF fields
    jaf_path = os.path.join(dir_path, "job_application_form.yaml")
    with open(jaf_path, "r") as file:
        jaf_data = yaml.safe_load(file)
    
    requirements_text = "Document Requirements:\n"
    for req in req_data.get("document_requirements", []):
        status = req.get("status", "Optional")
        doc_type = req.get("document_type", "Unknown")
        desc = req.get("description", "")
        requirements_text += f"- {doc_type} ({status}): {desc}\n"

    jaf_text = f"Job Application Form (JAF) Structure:\n{yaml.dump(jaf_data, default_flow_style=False)}"

    content = prompt_data.get("job_application_prompt", "")
    output_format = prompt_data.get("output_format", "")
    
    return f"{content}\n\n{requirements_text}\n\n{jaf_text}\n\n{output_format}".strip()

# Import raw functions instead of FunctionTool wrappers
from tools.bigtable_tools import update_candidate_data, store_document_link, get_candidate_profile
from tools.document_processor import extract_data_from_document
from tools.vertex_search import search_hr_policies
from subagents.recruiter_analyzer.agent import agent as recruiter_analyzer

agent = Agent(
    name="job_application",
    description="Use this sub-agent to help candidates with job applications and process their documents.",
    model=os.getenv(
        "DEMO_AGENT_MODEL",
        "gemini-2.5-flash"
    ),
    instruction=load_prompt(),
    sub_agents=[recruiter_analyzer],
    tools=[update_candidate_data, store_document_link, extract_data_from_document, get_candidate_profile, search_hr_policies],
)
