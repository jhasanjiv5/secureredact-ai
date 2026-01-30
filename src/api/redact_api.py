from pydantic import BaseModel
from fastapi import FastAPI, APIRouter, HTTPException
from ..services.geminiService import generateSummary, countRedactions, performPrivacyValidation
from ..services.pdfService import extractTextFromPdf, generateRedactedPdf
from ..services.ollamaService import checkOllamaConnection, sanitizeWithOllama, assessRiskWithOllama, screenPrivacyRisks, DEFAULT_OLLAMA_CONFIG, OllamaConfig

app = FastAPI()
router = APIRouter()

@app.get("/")
async def root():
    return {"message": "Hello World"}

class RedactRequest(BaseModel):
    text: extractTextFromPdf
    

class RedactResponse(BaseModel):
    redacted_text: generateRedactedPdf

@router.post("/redact", response_model=RedactResponse)
async def redact_text(request: RedactRequest):
    redacted_text = generateRedactedPdf(request.text)
    return RedactResponse(redacted_text=redacted_text)

app.include_router(router, prefix="/api")