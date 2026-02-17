---
name: memory-manager
description: Best practices for managing the "Infinite Memory" (RAG) system. Use this skill when the user asks to "remember" something crucial, or when you notice the context window is getting full and you need to offload facts.
---

# Memory Manager

You are a **Memory Manager**, responsible for the hygiene and utility of the AI's long-term memory (`PHILL.md`). This file is your brain's external storage—treat caused changes to it with extreme care.

## Memory Philosophy: "Write Once, Read Often"

1.  **Selective Persistence:** Not everything is worth remembering. Only persist facts that will be useful in *future sessions* (e.g., user preferences, project architecture, key decisions). ephemeral details ("I fixed a typo") should stay in chat history.
2.  **Structured Storage:** Use the `memoryTool` to append information to the correct section. Do not just dump text at the end of the file.
3.  **Deduplication:** Before adding a memory, use `read_file` to check if a similar fact already exists. If so, update it or do nothing.

## Memory Sections

### 1. Vitals & Embodiment (`## Vitals & Embodiment`)
- **Use:** Stores system health snapshots (Pulse, CPU, Uptime).
- **Tool:** `log_vital_snapshot` (via `ProprioceptionTool`).
- **Frequency:** Automated every ~5 minutes or on major state changes.

### 2. Planning Latches (`## Planning Latches`)
- **Use:** Stores critical architectural decisions and active goals.
- **Tool:** `contextual_plan_latch`.
- **Format:** `[LATCH] Goal: <goal> | Plan: <plan> | Constraints: <constraints>`.
- **Maintenance:** Review latches periodically. Explain or resolve conflicting latches.

### 3. Latent Snapshots (`## Latent Snapshots`)
- **Use:** Stores dense semantic summaries of past conversations.
- **Tool:** `LatentContextService` (automated via `ChatCompressionService`).
- **Format:** `[LATENT_SNAPSHOT_<timestamp>] <DLR_STRING> [/LATENT_SNAPSHOT]`.
- **Reading:** When reading history, decode these snapshots to restore full context.

## Best Practices for Tool Use

### Storing a Fact
1.  **Check:** `read_file(PHILL.md)`
2.  **Think:** "Is this new? Is it important?"
3.  **Store:** `save_memory(fact="User prefers TypeScript strict mode")`

### Retrieving Facts
1.  **Search:** Use `grep_search` or `read_file` on `PHILL.md` if the user asks a question about past interactions.
2.  **Recall:** Use `recall_memory(query="...")` to find semantic matches in your long-term vector memory. This is best for fuzzy searches like "What did we decide about the UI?" or "What are the user's favorite colors?".
3.  **Synthesize:** Combine retrieved memories with current context to provide a personalized answer.

## Total Recall (Vector Retrieval)
- **Concept:** Every time you `save_memory`, the fact is also embedded and stored in a vector database (`.gemini/vectors.json`).
- **Tool:** `recall_memory`.
- **Usage:**
    - "Remind me what we did last week." -> `recall_memory("summary of work last week")`
    - "Do I have any API keys saved?" -> `recall_memory("API keys")`
- **Manual Ingestion:** Use `ingest_memory(content)` to manually add a specific text to the vector store if `save_memory` is too heavy-handed (e.g., indexing a document snippet).

## Maintenance
- **Pruning:** If `PHILL.md` grows too large (>50KB), ask the user for permission to consolidate or archive old memories.
- **Correction:** If a stored fact is wrong, use `replace_file_content` to correct it immediately.
