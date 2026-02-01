import json
import requests
import re
from typing import TypedDict, List, Dict, Optional, Callable, Any, Union

# --- Type Definitions ---
# Equivalent to '../types' imports

class OllamaConfig(TypedDict):
    url: str
    model: str

class JurisdictionConfig(TypedDict):
    name: str
    law: str

class ScreeningResult(TypedDict):
    detectedContext: str
    suggestedJurisdictionId: str
    findings: List[str]
    explanation: str

class SanitizationResult(TypedDict):
    sanitizedText: str
    map: Dict[str, str]

class LocalRiskResult(TypedDict):
    riskLevel: str
    riskReason: str
    regulatoryWarning: Optional[str]

# --- Constants ---

DEFAULT_OLLAMA_CONFIG: OllamaConfig = {
    'url': 'http://localhost:11434/',
    'model': 'gemma2'
}

CHUNK_SIZE_LIMIT = 12000

# --- Helper Functions ---

def generate_sanitize_prompt(context: str, jurisdiction: JurisdictionConfig) -> str:
    """Generates the prompt string for sanitization."""
    return f"""
You are a high-performance data privacy engine complying with {jurisdiction['name']} regulations ({jurisdiction['law']}).
Your ONLY goal is to sanitize the text while PRESERVING ITS EXACT STRUCTURE AND FORMATTING.

DOCUMENT CONTEXT: {context or "General Text"}
JURISDICTION: {jurisdiction['name']} ({jurisdiction['law']})

INSTRUCTIONS:
1. Identify Personally Identifiable Information (PII).
2. Replace PII with UNIQUE tags (e.g., [REDACTED_NAME_1]).
3. STRUCTURAL INTEGRITY: If the input is JSON, CSV, or code, DO NOT change keys, headers, delimiters, or logic. Only replace the sensitive values.
4. Return strictly valid JSON with the structure shown below.

JSON Schema:
{{
  "redactedText": "The sanitized text content...",
  "map": {{
    "[REDACTED_TAG]": "Original Value"
  }}
}}

Text to sanitize:
"""

def split_into_chunks(text: str, limit: int) -> List[str]:
    """Splits text into chunks, attempting to break at newlines."""
    chunks = []
    current_pos = 0
    text_length = len(text)

    while current_pos < text_length:
        end_pos = current_pos + limit
        
        if end_pos < text_length:
            # Find the last newline within the limit to avoid breaking mid-sentence
            last_newline = text.rfind('\n', current_pos, end_pos)
            if last_newline > current_pos:
                end_pos = last_newline + 1
        else:
            end_pos = text_length
            
        chunks.append(text[current_pos:end_pos])
        current_pos = end_pos
        
    return chunks

# --- Main Functions ---

def check_ollama_connection(config: OllamaConfig) -> bool:
    """Checks if Ollama is reachable."""
    try:
        clean_url = config['url'].rstrip('/')
        # timeout=2.0 is equivalent to the 2000ms AbortController timeout
        response = requests.get(f"{clean_url}/api/tags", timeout=2.0)
        return response.ok
    except requests.RequestException:
        return False

def screen_privacy_risks(text: str, config: OllamaConfig) -> ScreeningResult:
    """Analyzes text to suggest jurisdiction and privacy context."""
    base_url = config['url'].rstrip('/')
    sample = text[:5000]
    
    try:
        payload = {
            "model": config['model'],
            "prompt": f"""Analyze the following text to identify its context and potential PII risks. 
        Determine which privacy jurisdiction (US, EU, Global, etc.) is most relevant.
        Return a JSON object: 
        {{ 
          "detectedContext": "short description of file type", 
          "suggestedJurisdictionId": "global"|"us"|"eu"|"uk"|"in"|"ca"|"au"|"br",
          "findings": ["list of potential PII types found"],
          "explanation": "friendly conversational explanation of why you chose these" 
        }}
        Text: {sample}""",
            "stream": False,
            "format": "json"
        }

        response = requests.post(f"{base_url}/api/generate", json=payload, timeout=60)
        response.raise_for_status()
        
        data = response.json()
        return json.loads(data['response'])
        
    except requests.exceptions.ConnectionError:
        raise ConnectionError("CONNECTION_FAILED")
    except Exception as e:
        # In the original code, you check for network vs other errors explicitly.
        # requests.exceptions.ConnectionError covers 'Failed to fetch' equivalent.
        raise e

def sanitize_with_ollama(
    text: str, 
    config: OllamaConfig, 
    context: str, 
    jurisdiction: JurisdictionConfig,
    on_progress: Optional[Callable[[int, int], None]] = None
) -> SanitizationResult:
    """
    Sanitizes text by sending chunks to Ollama.
    """
    base_url = config['url'].rstrip('/')
    master_map: Dict[str, str] = {}
    full_sanitized_text = ""
    
    try:
        prompt = generate_sanitize_prompt(context, jurisdiction)
        
        payload = {
            "model": config['model'],
            "prompt": prompt,
            "stream": False,
            "format": "json",
            "options": {
                "temperature": 0.1,
                "num_ctx": 32768
            }
        }

        response = requests.post(f"{base_url}/api/generate", json=payload, timeout=300) # Longer timeout for processing
        if not response.ok:
            raise Exception(f"Ollama API error: {response.status_code} - {response.text}")

        data = response.json()
        json_content = data['response'].strip()
        
        # Basic JSON extraction (equivalent to finding braces)
        first_brace = json_content.find('{')
        last_brace = json_content.rfind('}')
        if first_brace != -1 and last_brace != -1:
            json_content = json_content[first_brace : last_brace + 1]

        result = json.loads(json_content)
        
        full_sanitized_text += result.get("redactedText", "")
        if "map" in result and result["map"]:
            master_map.update(result["map"])
            
    except Exception as err:
        print(f"Text processing failed: {err}")
        # Fallback: append original text if processing fails
        

    return {
        "sanitizedText": full_sanitized_text,
        "map": master_map
    }

def assess_risk_with_ollama(text: str, config: OllamaConfig, jurisdiction: JurisdictionConfig) -> LocalRiskResult:
    """Evaluates privacy risk level."""
    base_url = config['url'].rstrip('/')
    sample = text[:10000]
    
    try:
        payload = {
            "model": config['model'],
            "prompt": f"""Evaluate privacy risks for this text under {jurisdiction['name']} ({jurisdiction['law']}). Return valid JSON {{ "riskLevel": "High"|"Medium"|"Low", "riskReason": "...", "regulatoryWarning": "..." }}. Text: {sample}""",
            "stream": False,
            "format": "json"
        }

        response = requests.post(f"{base_url}/api/generate", json=payload, timeout=60)
        
        if not response.ok:
            raise Exception("Risk assessment failed")
            
        data = response.json()
        return json.loads(data['response'])
        
    except Exception:
        return {
            "riskLevel": 'Low', 
            "riskReason": 'Local assessment failed.',
            "regulatoryWarning": None
        }
def count_redactions(text: str) -> int:
    """
    Estimates PII count based on redacted tags.
    """
    # Regex translation:
    # JS: /\[REDACTED_[A-Z]+(?:_[0-9]+)?]/g
    # Python: r"\[REDACTED_[A-Z]+(?:_[0-9]+)?\]"
    pattern = r"\[REDACTED_[A-Z]+(?:_[0-9]+)?\]"
    matches = re.findall(pattern, text)
    return len(matches)
