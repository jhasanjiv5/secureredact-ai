import json
from fastapi import HTTPException
import requests
from typing import TypedDict, List, Dict, Optional
from langchain_core.prompts import ChatPromptTemplate
from src.api.api_services.pdfUtils import process_pdf_to_context
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings
from langchain_core.runnables import RunnablePassthrough
from langchain_core.output_parsers import StrOutputParser
from langchain_ollama import OllamaLLM as Ollama
import traceback

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

screening_template = """ You are a high-performance data privacy assistant helping to complying with privacy regulations and analyzing risks for the users.
                
        context: {context}
        Question: {question}
        Answer:
            {{ 
            "detectedContext": "short description of file type", 
            "suggestedJurisdictionId": "global"|"us"|"eu"|"uk"|"in"|"ca"|"au"|"br",
            "findings": ["list of potential PII types found"],
            "explanation": "friendly conversational explanation of why you chose these" 
            }}"""
    
DB_DIR = "./chroma_db"
EMBEDDINGS = OllamaEmbeddings(model=DEFAULT_OLLAMA_CONFIG["model"], num_ctx=8192)


# --- Helper Functions ---

async def upload_files(files):
    try:
        all_documents = []
        for file in files:
            file_data = await file.read()
            
            docs = process_pdf_to_context(file_data, file.filename)
            all_documents.extend(docs)

            Chroma.from_documents(
            documents = all_documents, 
            embedding = EMBEDDINGS, 
            persist_directory = DB_DIR
            )

            return {"message": f"Successfully indexed {len(all_documents)} chunks from {len(files)} files."}
        
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error processing files: {str(e)}")     


def format_docs_for_screening(docs):
    return "\n\n".join([f"Source: {d.metadata['title']}\nContent: {d.page_content}" for d in docs])
# --- Main Functions ---

def screen_privacy_risks(config: OllamaConfig) -> ScreeningResult:
    
    try:
        vector_db = Chroma(persist_directory=DB_DIR, embedding_function=EMBEDDINGS)
        retriever = vector_db.as_retriever(search_kwargs={"k": 15})
        llm = Ollama(model=config['model'], temperature=0.1, num_ctx=32768, num_threads=4)
        prompt = ChatPromptTemplate.from_template(screening_template)
    
        chain = ({"context":retriever | format_docs_for_screening, "question": RunnablePassthrough()} | prompt | llm | StrOutputParser())
        result = chain.invoke("Analyze the text to identify its context and potential PII risks. Determine which privacy jurisdiction (US, EU, Global, etc.) is most relevant.")
        return {"response": result}
    except Exception as e:
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error querying Ollama: {str(e)}")       


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
