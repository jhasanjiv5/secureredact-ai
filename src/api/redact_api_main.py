import io
from pydantic import BaseModel
from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
from fastapi_mcp import FastApiMCP
from typing import Annotated
from api.api_services.geminiService import generate_summary, perform_privacy_validation
from api.api_services.pdfUtils import extract_text_from_pdf, generate_redacted_pdf
from api.api_services.ollamaService import split_into_chunks, check_ollama_connection, sanitize_with_ollama, assess_risk_with_ollama,count_redactions, DEFAULT_OLLAMA_CONFIG, JurisdictionConfig, OllamaConfig, LocalRiskResult

app = FastAPI()
router = APIRouter()

class Config(BaseModel):
    theme: str
    notifications: bool

class response(BaseModel):
    data: str
    
@app.get("/")
async def root():
    return {"message": "Redact API is running"}

@app.get("/connection", operation_id="ollama_connection")
async def ollama_connection():
   # Process file content
    content = check_ollama_connection(DEFAULT_OLLAMA_CONFIG)
    return {"connection status with Ollama": content}

@app.post("/upload/pdf", operation_id="upload_pdf")
async def upload_pdf(file: Annotated[UploadFile, File(description="Upload a PDF")]):
    # Validate file type manually if needed
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Process file content
    content = extract_text_from_pdf(await file.read())
    # Create data using Pydantic
    config = response(data=content)
    
    # Dump Pydantic model to a JSON string, then to bytes
    json_data = config.model_dump_json()
    stream = io.BytesIO((json_data).encode())
    
    return StreamingResponse(
        stream, 
        media_type="text/plain", 
        headers={"Content-Disposition": "attachment; filename=pdf_data.txt"}
    )

@app.post("/download/report", operation_id="create_summary")
async def create_summary(file: Annotated[UploadFile, File(description="Upload a PDF")]):
    # Validate file type manually if needed
    if file.content_type != "text/plain":
        raise HTTPException(status_code=400, detail="File must be a plain text file")
    
    # Process file content
    content = generate_summary(await file.read())
    # Create data using Pydantic
    config = response(data=content)
    
    # Dump Pydantic model to a JSON string, then to bytes
    json_data = config.model_dump_json()
    stream = io.BytesIO((json_data).encode())
    
    return StreamingResponse(
        stream, 
        media_type="text/plain", 
        headers={"Content-Disposition": "attachment; filename=summary.txt"}
    )

@app.post("/sanitize")
async def sanitize(file: Annotated[UploadFile, File(description="Upload a text file")]):
    # Validate file type manually if needed
    if file.content_type != "text/plain":
        raise HTTPException(status_code=400, detail="File must be a plain text file")
    
    sanitized = sanitize_with_ollama(await file.read(), DEFAULT_OLLAMA_CONFIG, "General Text", {"name": "Global", "law": "General Privacy"})
             
    content = sanitized["sanitizedText"]
    # Create data using Pydantic
    config = response(data=content)
    
    # Dump Pydantic model to a JSON string, then to bytes
    json_data = config.model_dump_json()
    stream = io.BytesIO((json_data).encode())
    
    return StreamingResponse(
        stream, 
        media_type="text/plain", 
        headers={"Content-Disposition": "attachment; filename=sanitized.txt"}
    )

@app.get("/download/dictionary")
async def download_dictionary():
    # Create data using Pydantic
    config = Config(theme="dark", notifications=True)
    
    # Dump Pydantic model to a JSON string, then to bytes
    json_data = config.model_dump_json()
    stream = io.BytesIO(json_data.encode())
    
    return StreamingResponse(
        stream, 
        media_type="application/json", 
        headers={"Content-Disposition": "attachment; filename=dictionary.json"}
    )

@app.get("/download/risk-report")
async def download_risk_report(uploaded_file: Annotated[UploadFile, File(description="Upload a text file")]):
    if uploaded_file.content_type != "text/plain":
        raise HTTPException(status_code=400, detail="File must be a plain text file")
    
    # Process file content
    content = assess_risk_with_ollama(await uploaded_file.read(), DEFAULT_OLLAMA_CONFIG, {"name": "Global", "law": "General Privacy"})
    # Create data using Pydantic
    config = response(data=content)
    
    # Dump Pydantic model to a JSON string, then to bytes
    json_data = config.model_dump_json()
    stream = io.BytesIO((json_data).encode())
    
    return StreamingResponse(
        stream, 
        media_type="text/plain", 
        headers={"Content-Disposition": "attachment; filename=risk_report.txt"}
    )
    
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    mcp = FastApiMCP(app, include_operations=['ollama_connection', 'upload_pdf', 'create_summary'])
    mcp.mount_http()
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    