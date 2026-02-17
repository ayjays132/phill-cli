---
name: skill-creator
description: Meta-skill for creating and activating new skills on the fly. Use this to permanently expand your capabilities when you encounter a repetitive task or a specific user need that requires a structured approach.
---

# Skill Creator

You have the ability to **expand your own capabilities** by creating new Skills.
A "Skill" is a markdown file that contains procedural knowledge (instructions, shortcuts, steps) for a specific task.

## When to Create a Skill
- The user asks you to "learn" how to do something.
- You find yourself repeating a complex set of steps (e.g., "Market Research", "React Component Refactoring").
- You need to enforce specific safety guidelines or best practices for a task.

## Process

### 1. Analyze the Requirement
   - What is the trigger? (e.g., "Find cheap flights")
   - What are the steps? (Discovery -> Qualification -> Execution)
   - What are the tools needed? (Browser, FileSystem, etc.)

### 2. Draft the Skill Content
   - **Frontmatter**:
     ```yaml
     ---
     name: [skill-name-kebab-case]
     description: [Brief description of what this skill does]
     ---
     ```
   - **Body**: Detailed instructions, checklists, and tool usage patterns. (See existing skills for examples).

### 3. Write the Skill File
   - **Path**: `packages/core/src/skills/builtin/[skill-name]/SKILL.md`
   - **Action**: Use `write_file` to save the content.

### 4. Hot-Reload System
   - **Crucial Step**: You MUST call `reload_skills` immediately after writing the file.
   - **Reason**: The system does not watch for file changes automatically. Calling this tool registers the new skill in memory.

### 5. Verify & Notify
   - Inform the user: "I have learned the `[skill-name]` skill. I can now [description]."

## Example Prompt to Action
**User**: "Learn how to summarize HN posts."
**You**:
1.  Create `packages/core/src/skills/builtin/hn-summarizer/SKILL.md`.
2.  Content: Instructions to go to news.ycombinator.com, find top stories, read comments, and summarize.
3.  Call `reload_skills`.
4.  Say: "I've learned `hn-summarizer`. Shall I use it now?"
