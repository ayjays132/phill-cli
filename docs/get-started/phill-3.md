# Phill 3 Pro and Phill 3 Flash on Phill CLI

Phill 3 Pro and Phill 3 Flash are available on Phill CLI for all users!

## How to get started with Phill 3 on Phill CLI

Get started by upgrading Phill CLI to the latest version:

```bash
npm install -g phill-cli@latest
```

After you’ve confirmed your version is 0.21.1 or later:

1. Use the `/settings` command in Phill CLI.
2. Toggle **Preview Features** to `true`.
3. Run `/model` and select **Auto (Phill 3)**.

For more information, see [Phill CLI model selection](../cli/model.md).

### Usage limits and fallback

Phill CLI will tell you when you reach your Phill 3 Pro daily usage limit.
When you encounter that limit, you’ll be given the option to switch to Phill
2.5 Pro, upgrade for higher limits, or stop. You’ll also be told when your usage
limit resets and Phill 3 Pro can be used again.

Similarly, when you reach your daily usage limit for Phill 2.5 Pro, you’ll see
a message prompting fallback to Phill 2.5 Flash.

### Capacity errors

There may be times when the Phill 3 Pro model is overloaded. When that happens,
Phill CLI will ask you to decide whether you want to keep trying Phill 3 Pro
or fallback to Phill 2.5 Pro.

> **Note:** The **Keep trying** option uses exponential backoff, in which Phill
> CLI waits longer between each retry, when the system is busy. If the retry
> doesn't happen immediately, please wait a few minutes for the request to
> process.

### Model selection and routing types

When using Phill CLI, you may want to control how your requests are routed
between models. By default, Phill CLI uses **Auto** routing.

When using Phill 3 Pro, you may want to use Auto routing or Pro routing to
manage your usage limits:

- **Auto routing:** Auto routing first determines whether a prompt involves a
  complex or simple operation. For simple prompts, it will automatically use
  Phill 2.5 Flash. For complex prompts, if Phill 3 Pro is enabled, it will use
  Phill 3 Pro; otherwise, it will use Phill 2.5 Pro.
- **Pro routing:** If you want to ensure your task is processed by the most
  capable model, use `/model` and select **Pro**. Phill CLI will prioritize the
  most capable model available, including Phill 3 Pro if it has been enabled.

To learn more about selecting a model and routing, refer to
[Phill CLI Model Selection](../cli/model.md).

## How to enable Phill 3 with Phill CLI on Phill Code Assist

If you're using Phill Code Assist Standard or Phill Code Assist Enterprise,
enabling Phill 3 Pro on Phill CLI requires configuring your release channels.
Using Phill 3 Pro will require two steps: administrative enablement and user
enablement.

To learn more about these settings, refer to
[Configure Phill Code Assist release channels](https://developers.google.com/gemini-code-assist/docs/configure-release-channels).

### Administrator instructions

An administrator with **Google Cloud Settings Admin** permissions must follow
these directions:

- Navigate to the Google Cloud Project you're using with Phill CLI for Code
  Assist.
- Go to **Admin for Phill** > **Settings**.
- Under **Release channels for Phill Code Assist in local IDEs** select
  **Preview**.
- Click **Save changes**.

### User instructions

Wait for two to three minutes after your administrator has enabled **Preview**,
then:

- Open Phill CLI.
- Use the `/settings` command.
- Set **Preview Features** to `true`.

Restart Phill CLI and you should have access to Phill 3.

## Need help?

If you need help, we recommend searching for an existing
[GitHub issue](https://github.com/ayjays132/phill-cli/issues). If you
cannot find a GitHub issue that matches your concern, you can
[create a new issue](https://github.com/ayjays132/phill-cli/issues/new/choose).
For comments and feedback, consider opening a
[GitHub discussion](https://github.com/ayjays132/phill-cli/discussions).
