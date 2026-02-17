# Local Model Server for Gemini CLI

This Python script provides a local inference server for running HuggingFace models with optimal hardware utilization.

## Features

- **Automatic Hardware Optimization**: Follows the priority: bf16 → fp16 → CUDA → CPU
- **OpenAI-Compatible API**: Exposes `/v1/chat/completions` endpoint
- **Easy Integration**: Works seamlessly with the Gemini CLI

## Installation

```bash
pip install fastapi uvicorn transformers torch pydantic
```

## Usage

### Start the Server

```bash
python scripts/local_model_server.py --model meta-llama/Llama-2-7b-chat-hf --port 8000
```

### Configure Gemini CLI

Set the following environment variables:

```bash
export HUGGINGFACE_ENDPOINT=http://localhost:8000
export HUGGINGFACE_MODEL=meta-llama/Llama-2-7b-chat-hf
```

Then select "HuggingFace" when prompted for authentication in the Gemini CLI.

## Options

- `--model`: HuggingFace model ID or local path (required)
- `--host`: Host to bind to (default: 127.0.0.1)
- `--port`: Port to bind to (default: 8000)

## Example

```bash
# Start server with a local model
python scripts/local_model_server.py --model /path/to/local/model --port 8000

# In another terminal, use the Gemini CLI
export HUGGINGFACE_ENDPOINT=http://localhost:8000
export HUGGINGFACE_MODEL=my-model
gemini-cli
```

## Hardware Priority

The server automatically detects and uses the best available hardware:

1. **BFloat16 on CUDA** (if supported)
2. **Float16 on CUDA** (if bf16 not supported)
3. **Float32 on CPU** (fallback)

This ensures optimal performance across different hardware configurations.
