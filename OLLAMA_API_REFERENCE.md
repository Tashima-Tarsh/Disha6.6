# Ollama Complete API Reference (Docker Local)

**Base URL**: `http://localhost:11434` (or `http://127.0.0.1:11434`)

---

## 1. Chat Completion API (Recommended for Coding & Conversation)

### Endpoint: `POST http://localhost:11434/api/chat`

#### cURL Request:
```bash
curl http://localhost:11434/api/chat -d '{
  "model": "qwen2.5-coder:7b",
  "messages": [
    { "role": "system", "content": "You are a senior software architect." },
    { "role": "user", "content": "Write a TypeScript function to debounce an API call." }
  ],
  "stream": false
}'
```

#### JSON Response Structure:
```json
{
  "model": "qwen2.5-coder:7b",
  "created_at": "2026-10-15T11:40:00Z",
  "message": {
    "role": "assistant",
    "content": "function debounce(fn, delay) { ... }"
  },
  "done": true
}
```

---

## 2. OpenAI-Compatible API (Works with any OpenAI client library)

### Endpoint: `POST http://localhost:11434/v1/chat/completions`

You can use standard OpenAI libraries in Python, Node, Go, Java, or C# simply by setting `base_url="http://localhost:11434/v1"`:

#### Python:
```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")

response = client.chat.completions.create(
    model="qwen2.5-coder:7b", # or "kimi-k2.5:latest", "deepseek-r1:8b"
    messages=[
        {"role": "user", "content": "Write a SQL query for finding duplicate emails."}
    ]
)
print(response.choices[0].message.content)
```

---

## 3. Simple Single Prompt Generate API

### Endpoint: `POST http://localhost:11434/api/generate`

#### cURL Request:
```bash
curl http://localhost:11434/api/generate -d '{
  "model": "kimi-k2.5:latest",
  "prompt": "Explain Docker containers in 2 sentences.",
  "stream": false
}'
```

#### Response:
```json
{
  "model": "kimi-k2.5:latest",
  "response": "Docker containers are lightweight...",
  "done": true
}
```

---

## 4. Vector Embeddings API (For Semantic Search / RAG)

### Endpoint: `POST http://localhost:11434/api/embeddings`

```bash
curl http://localhost:11434/api/embeddings -d '{
  "model": "nomic-embed-text:latest",
  "prompt": "Cyber threat intelligence telemetry"
}'
```

---

## 5. Model Management Endpoints

- **List All Installed Models**: `GET http://localhost:11434/api/tags`
- **Check Currently Running Model in RAM**: `GET http://localhost:11434/api/ps`
- **Version Check**: `GET http://localhost:11434/api/version`
