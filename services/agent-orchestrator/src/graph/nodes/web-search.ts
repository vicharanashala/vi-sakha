/**
 * Web Search Node
 *
 * LangGraph node that provides live web search and HP lookup capabilities.
 * Sits between the retriever and synthesizer nodes.
 *
 * Activates in two scenarios:
 * 1. Local KB confidence is low (max score < 0.60) → scrapes relevant VInternship pages
 * 2. HP lookup requested by planner → calls Google Apps Script HP API directly
 */

import { createLogger } from "@visakha/shared-utils";
import type { AgentState } from "../state";
import {
  scrapePage,
  selectPageForQuery,
  lookupStudentHP,
  getLeaderboard,
  getAvailableCohorts,
} from "../../tools/web-scraper";
import type { ContextSource } from "@visakha/shared-types";

const log = createLogger("web-search-node");

const LOW_CONFIDENCE_THRESHOLD = 0.60;

// Known cohort names for extraction
const COHORT_NAMES = ["aksians", "rsaians", "kruskalians", "dijkstrians", "euclideans", "founders-keepers", "vled-connect"];

/**
 * Extract cohort name from query text.
 */
function extractCohort(query: string): string | null {
  const lower = query.toLowerCase();
  for (const cohort of COHORT_NAMES) {
    if (lower.includes(cohort)) return cohort;
  }
  // Also check partial matches
  if (lower.includes("aksian")) return "aksians";
  if (lower.includes("rsaian")) return "rsaians";
  if (lower.includes("kruskal")) return "kruskalians";
  if (lower.includes("dijkstra") || lower.includes("dijkstri")) return "dijkstrians";
  if (lower.includes("euclid")) return "euclideans";
  if (lower.includes("founder")) return "founders-keepers";
  if (lower.includes("vled")) return "vled-connect";
  return null;
}

/**
 * Extract email from query text.
 */
function extractEmail(query: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  const match = query.match(emailRegex);
  return match ? match[0] : null;
}

/**
 * Extract a potential student name from query.
 * Looks for patterns like "HP of <Name>" or "<Name>'s HP" etc.
 */
function extractStudentName(query: string): string | null {
  // Try common patterns
  const patterns = [
    /(?:hp|health\s*points?|score|rank|status)\s+(?:of|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)'s?\s+(?:hp|health\s*points?|score|rank|status)/i,
    /(?:check|find|get|show|tell|what)\s+(?:.*?\s+)?(?:hp|health\s*points?)\s+(?:of|for)\s+(.+?)(?:\s+in\s+|\s*$)/i,
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      // Filter out cohort names and common words
      if (name.length > 2 && !COHORT_NAMES.some(c => name.toLowerCase().includes(c))) {
        return name;
      }
    }
  }
  return null;
}

export async function webSearchNode(state: AgentState): Promise<Partial<AgentState>> {
  const plan = state.plan;
  const query = state.query;
  const startTime = new Date();

  // ── Path 1: HP Lookup ──
  if (plan?.needs_hp_lookup) {
    log.info("HP lookup requested by planner");

    const cohort = extractCohort(query) || state.cohort;
    const email = extractEmail(query) || state.studentEmail;
    const studentName = extractStudentName(query) || state.studentName;
    const identifier = email || studentName;

    if (!cohort) {
      // No cohort specified — provide helpful message as context
      const availableCohorts = getAvailableCohorts().join(", ");
      const context: ContextSource = {
        content: `The user asked about Health Points but did not specify a cohort. Available cohorts are: ${availableCohorts}. Please ask the user to specify their cohort name so we can look up their HP.`,
        score: 0.95,
        source: "hp-api:cohort-missing",
        type: "web",
        metadata: { timestamp: new Date(), availableCohorts },
      };
      return buildResult(state, [context], startTime, "hp_lookup_missing_cohort");
    }

    if (!identifier) {
      // Check if user is asking for the leaderboard/top students
      const lower = query.toLowerCase();
      if (lower.includes("leaderboard") || lower.includes("top") || lower.includes("ranking") || lower.includes("all")) {
        log.info(`Fetching leaderboard for cohort ${cohort}`);
        const result = await getLeaderboard(cohort, 10);

        if (result.students.length > 0) {
          const leaderboardText = result.students
            .map(s => `#${s.rank} ${s.name} — HP: ${Math.round(s.currentHP * 100) / 100} (Base: ${s.baseHP}, Status: ${s.status})`)
            .join("\n");

          const context: ContextSource = {
            content: `Live HP Leaderboard for ${cohort} (Top ${result.students.length} of ${result.total} students, fetched just now):\n\n${leaderboardText}`,
            score: 1.0,
            source: `hp-api:${cohort}:leaderboard`,
            type: "web",
            metadata: { timestamp: new Date(), cohort, total: result.total },
          };
          return buildResult(state, [context], startTime, "hp_leaderboard");
        }
      }

      // No identifier — ask user for email
      const context: ContextSource = {
        content: `The user asked about Health Points in the ${cohort} cohort but did not specify a student email or name. Please ask the user to provide the student's email address for an accurate HP lookup.`,
        score: 0.95,
        source: `hp-api:${cohort}:identifier-missing`,
        type: "web",
        metadata: { timestamp: new Date(), cohort },
      };
      return buildResult(state, [context], startTime, "hp_lookup_missing_id");
    }

    // Perform the HP lookup
    log.info(`Looking up HP: identifier="${identifier}", cohort="${cohort}"`);
    const result = await lookupStudentHP(cohort, identifier);

    if (result.found && result.student) {
      const s = result.student;
      const context: ContextSource = {
        content: `Live HP Data for ${s.name} in ${cohort} cohort (fetched just now from the live dashboard):\n\n` +
          `- **Name**: ${s.name}\n` +
          `- **Email**: ${s.email}\n` +
          `- **Current HP**: ${Math.round(s.currentHP * 100) / 100}\n` +
          `- **Base HP**: ${s.baseHP}\n` +
          `- **Status**: ${s.status}\n` +
          `- **Rank**: #${s.rank} out of ${result.totalStudents} students\n`,
        score: 1.0,
        source: `hp-api:${cohort}:${s.email}`,
        type: "web",
        metadata: { timestamp: new Date(), student: s, cohort, totalStudents: result.totalStudents },
      };
      return buildResult(state, [context], startTime, "hp_lookup_success");
    } else {
      const context: ContextSource = {
        content: `HP lookup result: ${result.error || "Student not found."} (Searched in ${cohort} cohort with ${result.totalStudents} students)`,
        score: 0.90,
        source: `hp-api:${cohort}:not-found`,
        type: "web",
        metadata: { timestamp: new Date(), cohort, searchedFor: identifier },
      };
      return buildResult(state, [context], startTime, "hp_lookup_not_found");
    }
  }

  // ── Path 2: General Web Search (low confidence or planner requested) ──
  const maxLocalScore = state.retrievedContext.length > 0
    ? Math.max(...state.retrievedContext.map((c: any) => c.score || 0))
    : 0;

  const shouldSearch = plan?.needs_web_search || maxLocalScore < LOW_CONFIDENCE_THRESHOLD;

  if (!shouldSearch) {
    log.info(`Local KB confidence sufficient (${maxLocalScore.toFixed(2)}). Skipping web search.`);
    return {};
  }

  log.info(`Activating web search — local score: ${maxLocalScore.toFixed(2)}, planner requested: ${plan?.needs_web_search}`);

  // Determine the best page to scrape based on the query
  const pagePath = selectPageForQuery(query);
  const result = await scrapePage(pagePath);

  if (!result.success || !result.content) {
    log.warn(`Page scrape failed for ${pagePath}, trying homepage`);
    // Fallback: try the homepage
    if (pagePath !== "/") {
      const fallback = await scrapePage("/");
      if (fallback.success && fallback.content) {
        const context: ContextSource = {
          content: `Live information from the VInternship website (${fallback.url}):\n\n${fallback.content}`,
          score: 0.75,
          source: `web:${fallback.url}`,
          type: "web",
          metadata: { timestamp: new Date(), url: fallback.url, title: fallback.title },
        };
        return buildResult(state, [context], startTime, "web_scrape_fallback");
      }
    }
    return {};
  }

  const context: ContextSource = {
    content: `Live information from the VInternship website (${result.url}):\n\n${result.content}`,
    score: 0.85,
    source: `web:${result.url}`,
    type: "web",
    metadata: { timestamp: new Date(), url: result.url, title: result.title },
  };

  return buildResult(state, [context], startTime, "web_scrape_success");
}

/**
 * Helper to build the return payload with execution trace.
 */
function buildResult(
  state: AgentState,
  newContexts: ContextSource[],
  startTime: Date,
  action: string,
): Partial<AgentState> {
  return {
    retrievedContext: [...state.retrievedContext, ...newContexts],
    executionTrace: {
      ...state.executionTrace,
      nodes: [
        ...state.executionTrace.nodes,
        {
          nodeName: "web_search",
          startTime,
          endTime: new Date(),
          tokensUsed: 0,
          status: "success" as const,
          metadata: { action, contextsAdded: newContexts.length },
        },
      ],
    },
  };
}
