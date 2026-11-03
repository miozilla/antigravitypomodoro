# Google Developer Knowledge

Equip your agent with direct access to Google's official developer
documentation and knowledge base. Search documentation, retrieve full reference
pages, and get grounded answers across Google's developer ecosystem.

## Overview

The **Google Developer Knowledge** plugin connects your coding agent to the
official [Google Developer Knowledge API][dk-docs] and Model Context Protocol
(MCP) server. Instead of relying on model training cutoffs or unverified web
search results, your agent can directly query authoritative documentation
across:

- **Google Cloud & Apigee** (`cloud.google.com`, `docs.cloud.google.com`,
  `docs.apigee.com`)
- **Google AI, Gemini & ML** (`ai.google.dev`, `adk.dev`, `genkit.dev`,
  `antigravity.google`, `geminicli.com`, `www.tensorflow.org`)
- **Android** (`developer.android.com`)
- **Firebase** (`firebase.google.com`)
- **Flutter & Dart** (`docs.flutter.dev`, `dart.dev`)
- **Chrome & Web** (`developer.chrome.com`, `web.dev`)
- **Google Developers, Workspace & Home** (`developers.google.com`,
  `knowledge.workspace.google.com`, `developers.home.google.com`)
- **Go, Google Maps Platform & Fuchsia** (`go.dev`, `mapsplatform.google.com`,
  `fuchsia.dev`)

## Authentication & Setup

Using the Google Developer Knowledge API and MCP server requires a Google Cloud
project with the **Developer Knowledge API**
(`developerknowledge.googleapis.com`) enabled. You can authenticate using
either **Application Default Credentials (ADC)** or an **API key**.

### 1. Enable the Developer Knowledge API

Enable the API on your Google Cloud project using the
[Google Cloud Console][dk-console] or the `gcloud` CLI:

```bash
gcloud services enable developerknowledge.googleapis.com \
  --project=YOUR_PROJECT_ID
```

### 2. Configure Credentials

Choose one of the following authentication methods:

#### Option 1: Application Default Credentials (Recommended for MCP)

The bundled `google-developer-knowledge` MCP server configuration uses local
Google Cloud Application Default Credentials (`google_credentials`)
automatically:

```bash
gcloud auth application-default login
gcloud auth application-default set-quota-project YOUR_PROJECT_ID
```

Ensure your account has the **Service Usage Consumer**
(`roles/serviceusage.serviceUsageConsumer`) IAM role on `YOUR_PROJECT_ID`.

#### Option 2: Developer Knowledge API Key

Alternatively, create an API key in the
[Google Cloud Console Credentials page][gcp-credentials] (restricted to the
**Developer Knowledge API**) and export it in your environment for the skill's
REST API fallback:

```bash
export DEVELOPER_KNOWLEDGE_API_KEY="your-api-key"
export DEVELOPERKNOWLEDGE_API_KEY="your-api-key"
```

To authenticate the remote MCP server directly with an API key instead of ADC,
configure the `X-Goog-Api-Key` header in your MCP server configuration:

```json
{
  "mcpServers": {
    "google-developer-knowledge": {
      "serverUrl": "https://developerknowledge.googleapis.com/mcp",
      "headers": {
        "X-Goog-Api-Key": "YOUR_API_KEY"
      }
    }
  }
}
```

## Included Components

### Remote MCP Server (`google-developer-knowledge`)

Connects to `https://developerknowledge.googleapis.com/mcp` and provides tools
for documentation retrieval:

- **`answer_query`**: Ask natural-language technical questions and receive
  synthesized answers grounded in official Google documentation with source
  citations.
- **`search_documents`**: Search across official Google developer documentation
  for matching pages and snippets.
- **`get_documents`**: Fetch the full Markdown content of one or more
  documentation pages by document name (accepts up to 20 document names in a
  single call).

### Agent Skill (`retrieving-developer-knowledge`)

Provides structured workflows and domain filter guidance so the agent selects
the best query strategy, scopes searches to the right Google product domains,
verifies version-sensitive API details, and falls back cleanly when needed.

## Example Prompts

- *"Look up the exact `gcloud` CLI command and IAM roles needed to deploy a
  Cloud Run service with Secret Manager."*
- *"Search official Google documentation for how to implement structured
  outputs with the Gemini API."*
- *"Compare Cloud Run, GKE Autopilot, and App Engine based on official Google
  Cloud architecture guides."*
- *"What are the latest Compose navigation best practices according to official
  Android developer docs?"*

## Resources

- [Google Developer Knowledge Documentation][dk-docs]
- [Developer Knowledge MCP Server Guide][dk-mcp]

[dk-docs]: https://developers.google.com/knowledge
[dk-mcp]: https://developers.google.com/knowledge/mcp
[dk-console]: https://console.cloud.google.com/apis/library/developerknowledge.googleapis.com
[gcp-credentials]: https://console.cloud.google.com/apis/credentials
