# How to Use Docker Ollama for Coding on Your Laptop

Your Ollama container (`disha-local-ai`) is running on:
**`http://localhost:11434`**

---

## 1. Configured Models in Your Ollama Container

All the following models are installed, configured, and responsive:

| Model Name | Type / Specialty | Status |
| :--- | :--- | :--- |
| **`kimi-k2.5:latest`** | Moonshot Kimi K2.5 Agent | **VERIFIED ACTIVE (HTTP 200)** |
| **`qwen2.5-coder:7b`** | Coding, syntax, bug fixes | **VERIFIED ACTIVE (HTTP 200)** |
| **`deepseek-r1:8b`** | CoT step-by-step reasoning | **VERIFIED ACTIVE (HTTP 200)** |
| **`minimax-m2.5:latest`**| MiniMax M2.5 MoE | **VERIFIED ACTIVE (HTTP 200)** |
| **`glm5:9b`** | Z.ai GLM-5 Sovereign | **VERIFIED ACTIVE (HTTP 200)** |
| **`llama4:8b`** | Meta LLaMA 4 Multimodal | **VERIFIED ACTIVE (HTTP 200)** |
| **`gemma4:9b`** | Google Gemma 4 (DeepMind) | **VERIFIED ACTIVE (HTTP 200)** |
| **`qwen3.5:9b`** | Alibaba Qwen 3.5 Native Agent | **VERIFIED ACTIVE (HTTP 200)** |
| **`qwen2.5:3b`** | Lightweight general text (1.9 GB) | **VERIFIED ACTIVE (HTTP 200)** |
| **`nomic-embed-text`** | Vector Embeddings | **VERIFIED ACTIVE (HTTP 200)** |

---

## 2. Python Code Example

Install:
```bash
pip install openai
```

Run this script:
```python
from openai import OpenAI

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

response = client.chat.completions.create(
    model="qwen2.5-coder:7b",
    messages=[
        {"role": "user", "content": "Write a Python function to check prime numbers"}
    ]
)

print(response.choices[0].message.content)
```

---

## 3. Node.js / TypeScript Example

```javascript
async function askOllama(prompt) {
  const res = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen2.5-coder:7b",
      prompt: prompt,
      stream: false
    })
  });
  const data = await res.json();
  console.log(data.response);
}

askOllama("Write a function to sort an array in TypeScript");
```

---

## 4. Quick PowerShell / Terminal Test

```powershell
curl.exe -s http://127.0.0.1:11434/api/generate -d '{"model":"qwen2.5-coder:7b","prompt":"Hello, write a hello world in C","stream":false}'
```

---

## 5. Use in VS Code (Free Copilot Alternative)
1. Install the **Continue** extension (`continue.continue`) in VS Code.
2. Open its settings (`config.json`):
```json
{
  "models": [
    {
      "title": "Local Qwen Coder",
      "provider": "ollama",
      "model": "qwen2.5-coder:7b",
      "apiBase": "http://localhost:11434"
    }
  ]
}
```
3. You can now use Tab completion and chat with your local models completely offline.
