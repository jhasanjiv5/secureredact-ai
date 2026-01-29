from pydantic import BaseModel
from fastapi import FastAPI, APIRouter, HTTPException

app = FastAPI()
router = APIRouter()

@app.get("/")
async def root():
    return {"message": "Hello World"}

class RedactRequest(BaseModel):
    text: str
    redact_words: list[str]
class RedactResponse(BaseModel):
    redacted_text: str
@router.post("/redact", response_model=RedactResponse)
async def redact_text(request: RedactRequest):
    redacted_text = request.text
    for word in request.redact_words:
        redacted_text = redacted_text.replace(word, "[REDACTED]")
    return RedactResponse(redacted_text=redacted_text)
app.include_router(router, prefix="/api")