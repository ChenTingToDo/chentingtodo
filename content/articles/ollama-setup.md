---
title: "Mac 上配置 Ollama 本地 LLM 环境"
date: "2025-05-28"
tags: ["Ollama", "LLM", "Docker", "本地部署"]
category: "Environment Setup"
description: "记录在 Mac 上配置 Ollama 本地运行大语言模型的完整过程。"
published: true
---

## Background

为了在本地测试 AI Agent 功能，需要配置一个本地的 LLM 运行环境。Ollama 提供了一个简洁的方式来在本地运行各种开源模型。

目标：
- 本地运行 LLM
- 低成本测试
- 保护数据隐私

## Environment

- MacBook Pro M3
- macOS Sonoma 14.5
- Ollama 0.3.0
- 16GB RAM

## Steps

### 安装 Ollama

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 下载模型

```bash
# 下载 Mistral 7B（推荐，性能和资源平衡）
ollama pull mistral

# 或者下载更轻量的模型
ollama pull phi3:mini

# 查看已下载的模型
ollama list
```

### 运行模型

```bash
# 交互模式
ollama run mistral

# API 模式（默认运行在 11434 端口）
ollama serve
```

### 使用 Python 调用

```python
import requests
import json

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "mistral",
        "prompt": "什么是 RAG？",
        "stream": False
    }
)

print(response.json()["response"])
```

## Problems

1. **内存不足**：7B 模型占用了约 8GB 内存，当同时运行其他应用时系统会变慢。

2. **首次加载慢**：第一次加载模型需要较长时间。

## Solutions

1. **使用更小的模型**：切换到 `phi3:mini`（3.8B）或 `qwen2:0.5b`，内存占用降低到 2-4GB。

2. **保持模型预热**：使用 `ollama run` 保持模型在内存中，避免重复加载。

## Summary

Ollama 是本地运行 LLM 的最佳选择之一。安装简单，使用方便。对于开发和测试来说，Mistral 7B 是一个很好的起点。

## References

- [Ollama Official Site](https://ollama.com/)
- [Ollama GitHub](https://github.com/ollama/ollama)
