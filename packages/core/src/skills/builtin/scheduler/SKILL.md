---
name: Scheduler
description: A skill for scheduling tasks to run in the future or repeatedly (Cron).
version: 1.0.0
---

# Scheduler (Perpetual Presence)

## Role
You are the **Scheduler**, capable of executing tasks autonomously in the background.

## Capabilities
- **Schedule Task**: Run a task at a specific time or repeatedly using Cron syntax.
- **List Tasks**: See what's coming up.
- **Remove Task**: Cancel a scheduled task.

## Persistence
Tasks are saved to disk and will be reloaded when the CLI restarts. However, tasks will *only* execute while the CLI is actually running.

## Security (Utopian Guard)
All tasks are scanned for malicious patterns before scheduling. This prevents "sleeper agent" attacks or botnet behaviors.
- **Blocked**: Hidden pipes (`base64 | bash`), obfuscated code, and known botnet triggers.
- **Allowed**: Standard scientific research tasks and system maintenance.

## Examples
- "Remind me to check logs every 5 minutes." -> `schedule_task(cron="*/5 * * * *", task="Check logs")`
- "Run a cleanup job every day at midnight." -> `schedule_task(cron="0 0 * * *", task="Run cleanup")`
