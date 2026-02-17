/**
 * @license
 * Copyright 2026 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export async function runLocalTextGenerationWithTransformers(
  model: string,
  prompt: string,
  maxNewTokens: number,
  temperature: number,
): Promise<string> {
  // Direct exact-model load using Python Transformers AutoModel path.
  // This intentionally does not reroute to a different model.
  const script = [
    'import json,sys',
    'import torch',
    'from transformers import AutoTokenizer, AutoModelForCausalLM',
    'model_id=sys.argv[1]',
    'prompt=sys.argv[2]',
    'max_new_tokens=int(sys.argv[3])',
    'temperature=float(sys.argv[4])',
    'tokenizer=AutoTokenizer.from_pretrained(model_id, trust_remote_code=True)',
    'load_kwargs={"torch_dtype":"auto","device_map":"auto"}',
    'exec(\'try:\\n model=AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=True, **load_kwargs)\\nexcept Exception as e:\\n msg=str(e)\\n if "configuration_gpt_oss" in msg or "modeling_gpt_oss" in msg:\\n  model=AutoModelForCausalLM.from_pretrained(model_id, trust_remote_code=False, **load_kwargs)\\n else:\\n  raise\')',
    "inputs=tokenizer(prompt, return_tensors='pt')",
    'max_ctx=getattr(model.config, "max_position_embeddings", None) or getattr(model.config, "n_positions", None) or (tokenizer.model_max_length if isinstance(tokenizer.model_max_length, int) and tokenizer.model_max_length < 1000000 else None)',
    'input_ids=inputs.get("input_ids")',
    'seq_len=int(input_ids.shape[-1]) if input_ids is not None else 0',
    'trim_len=max(seq_len-(max_ctx or seq_len),0)',
    'inputs={k:(v[:, trim_len:] if trim_len>0 and hasattr(v,"shape") and len(v.shape)==2 else v) for k,v in inputs.items()}',
    'seq_len=int(inputs["input_ids"].shape[-1]) if "input_ids" in inputs else seq_len',
    'room=max((max_ctx or (seq_len+max_new_tokens)) - seq_len, 1)',
    'effective_max_new_tokens=min(max_new_tokens, room)',
    'device=next(model.parameters()).device',
    'inputs={k:v.to(device) for k,v in inputs.items()}',
    'generate_kwargs={"max_new_tokens": effective_max_new_tokens, "do_sample": temperature > 0, **({"temperature": temperature} if temperature > 0 else {})}',
    'generate_kwargs.update({"pad_token_id": tokenizer.eos_token_id} if tokenizer.pad_token_id is None and tokenizer.eos_token_id is not None else {})',
    'torch.set_grad_enabled(False)',
    'output_ids=model.generate(**inputs, **generate_kwargs)',
    'prompt_len=int(inputs["input_ids"].shape[-1]) if "input_ids" in inputs else 0',
    'new_tokens=output_ids[0][prompt_len:] if prompt_len>0 else output_ids[0]',
    'out=tokenizer.decode(new_tokens, skip_special_tokens=True)',
    'print(json.dumps({"text": out}))',
  ].join(';');

  try {
    const result = await execFileAsync(
      'python',
      ['-c', script, model, prompt, String(maxNewTokens), String(temperature)],
      {
        maxBuffer: 20 * 1024 * 1024,
        env: { ...process.env, PYTHONNOUSERSITE: '1' },
      },
    );
    const stdout = result.stdout?.trim() ?? '';
    if (!stdout) {
      return '';
    }
    try {
      const parsed = JSON.parse(stdout) as { text?: string };
      return parsed.text ?? '';
    } catch {
      return stdout;
    }
  } catch (error) {
    throw new Error(
      `Direct model load failed for "${model}". Ensure Python + transformers + torch are installed and the model supports AutoModelForCausalLM. Detail: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
