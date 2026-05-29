import { Client } from "langsmith";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger } from "@visakha/shared-utils";

const log = createLogger("observability");
const config = loadPlatformConfig();

/**
 * Observability & Tracing
 * 
 * Configures LangSmith for agentic trace debugging and 
 * OpenTelemetry for production metrics.
 */
export class ObservabilityManager {
  private static langsmithClient: Client;

  static initialize() {
    const { observability } = config;

    if (observability.langsmithEnabled) {
      log.info("Initializing LangSmith tracing", { project: observability.langsmithProject });
      
      // These environment variables are picked up by LangChain automatically
      process.env.LANGCHAIN_TRACING_V2 = "true";
      process.env.LANGCHAIN_ENDPOINT = "https://api.smith.langchain.com";
      process.env.LANGCHAIN_API_KEY = observability.langsmithApiKey;
      process.env.LANGCHAIN_PROJECT = observability.langsmithProject;

      this.langsmithClient = new Client({
        apiKey: observability.langsmithApiKey,
      });
    }

    if (observability.otelEnabled) {
      log.info("Initializing OpenTelemetry metrics");
      // TODO: Configure OTLP exporter for Prometheus/Grafana
    }
  }

  /**
   * Helper to manually log a trace event to LangSmith if needed.
   */
  static async logEvent(name: string, inputs: any, outputs: any) {
    if (!this.langsmithClient) return;

    try {
      await this.langsmithClient.createRun({
        name,
        run_type: "chain",
        inputs,
        outputs,
      });
    } catch (error) {
      log.warn("Failed to log LangSmith event", { error: (error as Error).message });
    }
  }
}
