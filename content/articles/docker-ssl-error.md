---
title: "Docker 容器中 Python SSL 证书错误解决方法"
date: "2025-05-20"
tags: ["Docker", "Python", "SSL", "Debug"]
category: "Problem Solving"
description: "记录在 Docker 容器中使用 Python requests 时遇到 SSL 证书错误的解决方案。"
published: true
---

## Background

在 Docker 容器中运行 Python 应用，使用 `requests` 库发起 HTTPS 请求时遇到 SSL 证书验证错误：

```
requests.exceptions.SSLError: 
HTTPSConnectionPool(host='api.example.com', port=443): 
Max retries exceeded with url: / (Caused by SSLError(
    CertificateError("hostname 'api.example.com' doesn't match '*.example.com'")
))
```

## Environment

- Docker 25.0.3
- Python 3.12-slim (Alpine-based)
- requests 2.31.0

## Steps

### 问题复现

```dockerfile
FROM python:3.12-slim
RUN pip install requests
COPY app.py /app.py
CMD ["python", "/app.py"]
```

### 排查过程

1. 检查容器内的证书：

```bash
docker exec -it <container> ls -la /etc/ssl/certs/
```

2. 发现 Alpine 镜像的证书路径与 Debian 不同。

## Problems

Alpine 镜像使用 `ca-certificates-bundle` 而不是标准的 `ca-certificates` 包。某些 Docker 构建缓存可能导致证书不完整。

## Solutions

### 方案一：安装完整的 CA 证书

```dockerfile
FROM python:3.12-slim

# 安装 CA 证书
RUN apt-get update && \
    apt-get install -y ca-certificates && \
    update-ca-certificates && \
    rm -rf /var/lib/apt/lists/*

RUN pip install requests
COPY app.py /app.py
CMD ["python", "/app.py"]
```

### 方案二：使用 Alpine 版本（适用于 slim 镜像）

```dockerfile
FROM python:3.12-alpine

RUN apk add --no-cache ca-certificates && \
    update-ca-certificates

RUN pip install requests
COPY app.py /app.py
CMD ["python", "/app.py"]
```

### 方案三：设置环境变量

```dockerfile
ENV REQUESTS_CA_BUNDLE=/etc/ssl/certs/ca-certificates.crt
```

## Summary

SSL 证书问题通常是由于基础镜像缺少完整的 CA 证书包。最佳实践是始终在 Dockerfile 中显式安装 `ca-certificates` 包，并运行 `update-ca-certificates`。

## References

- [Python requests SSL Verification](https://docs.python-requests.org/en/latest/user/advanced/#ssl-cert-verification)
- [Docker Official Images: Python](https://hub.docker.com/_/python)
