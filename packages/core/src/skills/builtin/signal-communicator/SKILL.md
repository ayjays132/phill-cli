---
name: Signal Communicator
description: Manages Signal messaging (linking, sending, receiving).
version: 1.0.0
---

# Signal Communicator

This skill allows you to interact with the Signal messenger network.

## Capabilities

1.  **Link Device**: Connect the CLI to your Signal account.
2.  **Send Messages**: Send text and attachments to contacts.
3.  **Receive Messages**: Check for new messages.

## Instructions

### 1. Linking

If the user asks to "link" or "connect signal":
1.  Ask for a device name (default to "PHILL_CLI").
2.  Call \`signal_link(name)\`.
3.  Display the \`tsdevice:/\` URI.
4.  Tell the user to generate a QR code from it (e.g. using a web tool) and scan it with their phone (Settings > Linked Devices).

### 2. Sending

To send a message:
1.  Identify the recipient (phone number with country code, e.g. +1...).
2.  Call \`signal_send(recipient, message, attachment)\`.

### 3. Receiving

To check messages:
1.  Call \`signal_receive()\`.
2.  Summarize any new messages for the user.
