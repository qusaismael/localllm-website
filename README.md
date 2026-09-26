# Local AI — Web-Hosted Version

Client-side only web interface for chatting with Ollama. Can be hosted on any static file host.

## Features

- **Client-side only** — no backend required
- **Host anywhere** — GitHub Pages, Netlify, Vercel, or any static host
- **Local data** — chats stored in browser `localStorage`
- **Local processing** — all inference runs on the user's Ollama instance
- **Download models from the app** — browse and download models directly
- **Manage models** — view installed models and delete unused ones
- **Curated model list** — recommended models for different use cases

## Quick start

### 1. Install Ollama

Download and install Ollama from `https://ollama.com`.

### 2. Start Ollama with CORS enabled

Mac/Linux:

```bash
OLLAMA_ORIGINS="https://localllm.qusai.pro" ollama serve
```

Windows (PowerShell):

```powershell
$env:OLLAMA_ORIGINS="https://localllm.qusai.pro"; ollama serve
```

Windows (CMD):

```cmd
set OLLAMA_ORIGINS=https://localllm.qusai.pro && ollama serve
```

### 3. Open the web app

Visit `https://localllm.qusai.pro`. If you host this app elsewhere, configure Ollama for your site's exact origin instead.

### 4. Download a model

You can download models directly from the app! During setup:
1. Switch to the "Download New" tab
2. Browse recommended models by category
3. Click "Download" on any model

Or use the terminal:

```bash
ollama pull llama3.2
```

## Hosting options



## Common Problems

### CORS settings

For the web app to communicate with your local Ollama, allow only the web app's origin. Keep Ollama bound to loopback; do not expose port 11434 publicly.

Hosted site's origin:

```bash
OLLAMA_ORIGINS="https://localllm.qusai.pro" ollama serve
```

Persistent environment variable (replace this origin if you self-host):

Mac/Linux (`~/.zshrc` or `~/.bashrc`):

```bash
export OLLAMA_ORIGINS="https://localllm.qusai.pro"
```

Windows: set a system environment variable `OLLAMA_ORIGINS=https://localllm.qusai.pro`.

### Custom Ollama URL

If Ollama uses a different loopback port:

1. Open the web app
2. Enter its URL (for example `http://localhost:11435`)
3. Click “Test Connection”

**“Connection failed” error**

1. Make sure Ollama is running: `ollama serve`
2. Check that CORS is enabled: `OLLAMA_ORIGINS="https://localllm.qusai.pro" ollama serve`
3. Try the default URL: `http://localhost:11434`

**"No models found"**

Download a model from the app (switch to "Download New" tab) or via terminal:

```bash
ollama pull llama3.2
```

**CORS errors in browser console**

Ensure `OLLAMA_ORIGINS` is set and Ollama has been restarted with CORS enabled.


## Privacy and security

- No server-side component
- Chats are stored only in the user’s browser
- All inference is handled by the user’s Ollama instance


## License

MIT License.
