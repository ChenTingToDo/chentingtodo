---
title: "LangGraph 入门：构建第一个 AI Agent"
date: "2025-06-01"
tags: ["LangGraph", "AI Agent", "Python", "LangChain"]
category: "Learning Notes"
description: "记录 LangGraph 的学习过程，从基础概念到构建第一个可用的 AI Agent。"
published: true
---

## Background

最近在学习 AI Agent 相关的技术，LangGraph 是 LangChain 团队推出的一个用于构建有状态、多步骤 AI 工作流的框架。与传统 Chain 不同，LangGraph 支持循环、分支和状态管理，更适合构建复杂的 Agent 系统。

主要学习目标：
- 理解 LangGraph 的核心概念
- 掌握 StateGraph 的构建方法
- 构建一个可用的 Agent 原型

## Environment

- Python 3.11+
- LangGraph >= 0.1.0
- LangChain >= 0.2.0
- OpenAI API Key

## Steps

### 安装依赖

```bash
pip install langgraph langchain-openai
```

### 定义状态

LangGraph 的核心是状态图（StateGraph）。首先定义状态类型：

```python
from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END

class AgentState(TypedDict):
    messages: list
    next_step: str
    completed: bool
```

### 定义节点

每个节点代表一个处理步骤：

```python
def process_input(state: AgentState):
    # 处理输入
    return {"next_step": "analyze"}

def analyze(state: AgentState):
    # 分析内容
    return {"next_step": "respond", "completed": True}
```

### 构建图

```python
workflow = StateGraph(AgentState)

workflow.add_node("input", process_input)
workflow.add_node("analyze", analyze)
workflow.add_node("respond", generate_response)

workflow.add_edge("input", "analyze")
workflow.add_conditional_edges(
    "analyze",
    lambda state: "respond" if state["completed"] else "input"
)
workflow.set_entry_point("input")

app = workflow.compile()
```

## Problems

1. **状态管理**：初始版本没有正确管理状态，导致节点间的数据传递出错。
2. **循环控制**：条件边（conditional edges）的配置花了一些时间理解。

## Solutions

1. **状态合并**：使用 `Annotated` 类型和 reducer 函数来正确处理状态合并。
2. **调试工具**：使用 LangGraph 的调试模式查看每一步的状态变化。

## Summary

LangGraph 是一个强大的框架，适合构建复杂的 AI Agent 工作流。下一步计划学习更高级的模式，如 Human-in-the-loop 和并行执行。

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [LangChain Official Docs](https://python.langchain.com/)
