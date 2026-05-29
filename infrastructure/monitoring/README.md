# Monitoring Infrastructure

Observability stack for the Vi-Sakha platform.

## Components

- **Prometheus** — Metrics collection and storage
- **Grafana** — Visualization dashboards
- **LangSmith** — Agentic trace debugging (external)
- **OpenTelemetry** — Distributed tracing and metrics

## Configuration

- `prometheus.yml` — Scrape targets for services
- `grafana/` — Dashboard JSON definitions

## Dashboard Layouts

- **System Health** — CPU, RAM, Latency per service
- **Agent Performance** — Success rate, reflection count, tool usage
- **RAG Metrics** — Retrieval precision, reranking latency, token usage
- **Cost Tracking** — LLM token costs per user/agent
