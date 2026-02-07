from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from typing import Optional
from model_loader import ModelLoader
from curriculum_controller import CurriculumController
import uvicorn

# Global instances
model_loader = None
curriculum_controller = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global model_loader, curriculum_controller
    # Startup
    print("Initializing components...")
    model_loader = ModelLoader()
    curriculum_controller = CurriculumController()
    yield
    # Shutdown
    print("Shutting down...")

app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow browser extension requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ExplanationRequest(BaseModel):
    text: str
    syllabus: str
    mode: str = "concept" # concept, guided, concise, detailed
    depth: str = "high"   # low, high
    language: str = "English"

class ExplanationResponse(BaseModel):
    explanation: str
    syllabus_used: str

@app.get("/")
def health_check():
    return {"status": "ok", "model_loaded": model_loader.llm is not None if model_loader else False}

@app.post("/explain", response_model=ExplanationResponse)
def explain_text(request: ExplanationRequest):
    if not model_loader or not model_loader.llm:
        raise HTTPException(status_code=503, detail="Model is not loaded.")
    
    # 1. Get Curriculum Context
    print(f"\n--- [CogniLens] New Request ---")
    print(f"Syllabus: {request.syllabus}, Mode: {request.mode}, Depth: {request.depth}, Language: {request.language}")
    
    system_prompt = curriculum_controller.construct_system_prompt(
        request.syllabus, request.mode, request.depth, request.language
    )
    print(f"System Prompt Built (Size: {len(system_prompt)} chars)")

    # 2. Generate Explanation
    try:
        print(f"Calling Model Generator for text: '{request.text[:50]}...'")
        result = model_loader.generate_explanation(system_prompt, request.text)
        print("Generation Request Finished.")
        return ExplanationResponse(
            explanation=result,
            syllabus_used=request.syllabus
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
