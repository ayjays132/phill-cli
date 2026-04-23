/**
 * Test script for Ollama tool calling and stability.
 * Usage: node scripts/test_ollama.js
 * Environment variables:
 *   OLLAMA_ENDPOINT (default: http://localhost:11434)
 *   OLLAMA_MODEL (default: llama3.1)
 */

const endpoint = process.env.OLLAMA_ENDPOINT || 'http://localhost:11434';
const requestedModel = process.env.OLLAMA_MODEL || 'llama3.1';
const concurrentCount = Number(process.env.OLLAMA_CONCURRENCY || 3);

function normalizeInstalledModels(payload) {
  return (payload.models || []).map((model) => ({
    name: model.name || model.model,
    remoteHost: model.remote_host || null,
    isCloud: Boolean(model.remote_host) || String(model.name || '').endsWith(':cloud'),
  })).filter((model) => model.name);
}

function resolveTestModel(installedModels, requested) {
  const exact = installedModels.find((model) => model.name === requested);
  if (exact) {
    return exact;
  }

  const prefixMatch = installedModels.find((model) => model.name.startsWith(`${requested}:`));
  if (prefixMatch) {
    return prefixMatch;
  }

  return installedModels[0] || null;
}

async function testOllama() {
  console.log(`--- Ollama Stability & Tool Test ---`);
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Requested model: ${requestedModel}\n`);

  let passed = true;
  let selectedModel = null;

  // 1. Connection Check
  console.log(`[1/3] Checking Ollama connection...`);
  try {
    const tagsRes = await fetch(`${endpoint}/api/tags`).catch(e => ({ ok: false, error: e }));
    if (!tagsRes.ok) {
      console.error(`❌ Ollama not reachable at ${endpoint}. Ensure it is running.`);
      if (tagsRes.error) console.error(`Error: ${tagsRes.error.message}`);
      return;
    }
    const tags = await tagsRes.json();
    const installedModels = normalizeInstalledModels(tags);

    if (installedModels.length === 0) {
      console.error(`❌ No Ollama models are available.`);
      process.exitCode = 1;
      return;
    }

    console.log(`✅ Available models: ${installedModels.map(m => `${m.name}${m.isCloud ? ' [cloud]' : ' [local]'}`).join(', ')}`);

    selectedModel = resolveTestModel(installedModels, requestedModel);
    if (!selectedModel) {
      console.error(`❌ Could not select a model for testing.`);
      process.exitCode = 1;
      return;
    }

    if (selectedModel.name !== requestedModel) {
      console.warn(`⚠️ Requested model '${requestedModel}' is not installed. Using '${selectedModel.name}' instead.`);
    }

    console.log(`ℹ️ Test model: ${selectedModel.name}${selectedModel.isCloud ? ' (cloud-backed)' : ' (local)'}`);
  } catch (e) {
    console.error(`❌ Ollama connection failed: ${e.message}`);
    process.exitCode = 1;
    return;
  }

  // 2. Tool Calling Test
  const toolRequest = {
    model: selectedModel.name,
    messages: [
      { role: 'user', content: 'What is the current weather in London?' }
    ],
    tools: [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Get weather for a location',
          parameters: {
            type: 'object',
            properties: {
              location: { type: 'string', description: 'The city name' }
            },
            required: ['location']
          }
        }
      }
    ],
    stream: false
  };

  console.log(`\n[2/3] Testing tool calling (native + fallback)...`);
  try {
    const startTime = Date.now();
    const response = await fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(toolRequest)
    });
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ Response received in ${duration}ms (status: ${response.status})`);

    if (!response.ok) {
      passed = false;
      console.error(`❌ API Error: ${response.status} ${await response.text()}`);
    } else {
      const data = await response.json();
      console.log('--- Model Response ---');
      console.log(`Text: "${data.message.content || '(empty)'}"`);
      
      if (data.message.tool_calls && data.message.tool_calls.length > 0) {
        console.log('✅ NATIVE tool calls detected:');
        console.log(JSON.stringify(data.message.tool_calls, null, 2));
      } else {
        console.log('ℹ️ No native tool calls.');
        const text = data.message.content || '';
        if (text.includes('"tool"') || text.includes('"name"') || text.includes('get_weather')) {
          console.log('✅ Fallback: Detected potential JSON tool call in text output.');
        } else {
          passed = false;
          console.log('❌ No tool usage detected. This model might not handle tools well.');
        }
      }
    }
  } catch (e) {
    passed = false;
    console.error(`❌ Request failed: ${e.message}`);
  }

  // 3. Stress/Stability Test (Simplified)
  console.log(`\n[3/3] Running quick stability test (${concurrentCount} concurrent requests)...`);
  const tests = Array(concurrentCount).fill(0).map((_, i) => 
    fetch(`${endpoint}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: selectedModel.name,
        messages: [{ role: 'user', content: `Repeat the number ${i+1}` }],
        stream: false
      })
    }).then(r => ({ i: i+1, status: r.status, ok: r.ok }))
      .catch(e => ({ i: i+1, ok: false, error: e.message }))
  );

  const results = await Promise.all(tests);
  results.forEach(res => {
    if (res.ok) {
      console.log(`✅ Request ${res.i}: Success (${res.status})`);
    } else {
      passed = false;
      console.log(`❌ Request ${res.i}: FAILED - ${res.error}`);
    }
  });

  console.log(`\n--- Test Completed: ${passed ? 'PASS' : 'FAIL'} ---`);
  process.exitCode = passed ? 0 : 1;
}

testOllama();
