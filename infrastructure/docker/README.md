# Docker Infrastructure

This directory contains Dockerfiles and container configurations for all services in the Vi-Sakha platform.

## Service Dockerfiles

Each service should have its own multi-stage Dockerfile optimized for production:

- `Dockerfile.api` — NestJS API Server
- `Dockerfile.bot` — Discord Bot
- `Dockerfile.vision` — Python Vision/Embedding service
- `Dockerfile.agent` — Agent Orchestrator service

## Multi-stage Pattern

We use a 3-stage build process:
1. **Build** — Install devDependencies, copy source, compile TS
2. **Prune** — Install only production dependencies
3. **Runtime** — Copy compiled code and production node_modules to a slim base image

## Usage

Build from root workspace:
```bash
docker build -f infrastructure/docker/Dockerfile.api -t visakha-api .
```
