#!/usr/bin/env python3
"""
Local Model Inference Server for Gemini CLI
Implements bf16 -> fp16 -> cuda -> cpu priority loading
Exposes an OpenAI-compatible API endpoint
"""

import argparse
import logging
import sys
from typing import Optional, Dict, Any
import torch

try:
    from fastapi import FastAPI, HTTPException
    from fastapi.responses import StreamingResponse
    from pydantic import BaseModel
    import uvicorn
    from transformers import AutoTokenizer, AutoModelForCausalLM
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("Please install required packages:")
    print("  pip install fastapi uvicorn transformers torch pydantic")
    sys.exit(1)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Local Model Inference Server")

# Global model and tokenizer
model = None
tokenizer = None
model_config = {}


class Message(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: Optional[str] = None
    messages: list[Message]
    stream: bool = False
    max_tokens: Optional[int] = None
    temperature: Optional[float] = 0.7


class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: str


class ChatCompletionResponse(BaseModel):
    id: str
    choices: list[ChatCompletionChoice]
    usage: Dict[str, int]


def determine_dtype_and_device():
    """
    Determine the best dtype and device based on availability.
    Priority: bf16 -> fp16 -> cuda (fp32) -> cpu
    """
    if torch.cuda.is_available():
        # Check for bf16 support
        if torch.cuda.is_bf16_supported():
            logger.info("Using bfloat16 on CUDA")
            return torch.bfloat16, "cuda"
        else:
            logger.info("Using float16 on CUDA")
            return torch.float16, "cuda"
    else:
        logger.info("CUDA not available, using CPU with float32")
        return torch.float32, "cpu"


def load_model(model_id: str):
    """Load the model with optimal settings"""
    global model, tokenizer, model_config
    
    logger.info(f"Loading model: {model_id}")
    
    dtype, device = determine_dtype_and_device()
    model_config = {
        "model_id": model_id,
        "dtype": str(dtype),
        "device": device,
    }
    
    try:
        # Load tokenizer
        tokenizer = AutoTokenizer.from_pretrained(model_id)
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token
        
        # Load model with optimal settings
        model = AutoModelForCausalLM.from_pretrained(
            model_id,
            torch_dtype=dtype,
            device_map=device if device == "cuda" else None,
            low_cpu_mem_usage=True,
        )
        
        if device == "cpu":
            model = model.to(device)
        
        model.eval()
        logger.info(f"Model loaded successfully on {device} with dtype {dtype}")
        
    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatCompletionRequest):
    """OpenAI-compatible chat completions endpoint"""
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    try:
        # Convert messages to prompt
        prompt = ""
        for msg in request.messages:
            if msg.role == "system":
                prompt += f"System: {msg.content}\n"
            elif msg.role == "user":
                prompt += f"User: {msg.content}\n"
            elif msg.role == "assistant":
                prompt += f"Assistant: {msg.content}\n"
        prompt += "Assistant:"
        
        # Tokenize
        inputs = tokenizer(prompt, return_tensors="pt", padding=True)
        inputs = {k: v.to(model.device) for k, v in inputs.items()}
        
        # Generate
        max_new_tokens = request.max_tokens or 512
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                temperature=request.temperature,
                do_sample=request.temperature > 0,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )
        
        # Decode
        generated_text = tokenizer.decode(
            outputs[0][inputs["input_ids"].shape[1]:],
            skip_special_tokens=True
        )
        
        # Return response
        return ChatCompletionResponse(
            id="local-" + str(hash(prompt)),
            choices=[
                ChatCompletionChoice(
                    index=0,
                    message=Message(role="assistant", content=generated_text),
                    finish_reason="stop"
                )
            ],
            usage={
                "prompt_tokens": inputs["input_ids"].shape[1],
                "completion_tokens": outputs.shape[1] - inputs["input_ids"].shape[1],
                "total_tokens": outputs.shape[1],
            }
        )
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "config": model_config,
    }


def main():
    parser = argparse.ArgumentParser(description="Local Model Inference Server")
    parser.add_argument(
        "--model",
        type=str,
        required=True,
        help="HuggingFace model ID or local path"
    )
    parser.add_argument(
        "--host",
        type=str,
        default="127.0.0.1",
        help="Host to bind to (default: 127.0.0.1)"
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Port to bind to (default: 8000)"
    )
    
    args = parser.parse_args()
    
    # Load model
    load_model(args.model)
    
    # Start server
    logger.info(f"Starting server on {args.host}:{args.port}")
    uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
