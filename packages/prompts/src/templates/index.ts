/**
 * Q&A Extraction Template
 *
 * Used by the pipeline to extract FAQ pairs from Discord transcripts.
 * Migrated from the existing hard-coded prompt in pipeline.orchestrator.ts
 */

export const QA_EXTRACTION_TEMPLATE = `You are analyzing a Discord support ticket from a student internship program (VInternship).
Extract reusable FAQ pairs that would help future students with similar questions.

CONVERSATION (ticket #{{ticketNumber}}):
{{transcript}}

Generate up to 5 high-quality Q&A pairs. Focus on:
- Specific questions students asked
- Clear, actionable answers given by mentors/agents
- Knowledge transferable to future cohorts

Return ONLY a valid JSON array — no prose, no markdown fences:
[
  {"question": "...", "answer": "..."}
]
If no useful Q&A can be extracted return an empty array: []`;

/**
 * Context Assembly Template
 *
 * Used by the synthesizer to format retrieved context for the LLM.
 */
export const CONTEXT_ASSEMBLY_TEMPLATE = `Aggregated Context (sorted by relevance):

{{#each contexts}}
[Relevance: {{this.score}}] [Source: {{this.source}}] [Type: {{this.type}}]
{{this.content}}

{{/each}}
---

User Query: {{query}}

Provide a helpful answer based on the knowledge base above.`;

/**
 * Memory Summarization Template
 *
 * Used by the episodic memory service to summarize conversations.
 */
export const MEMORY_SUMMARY_TEMPLATE = `Summarize the following conversation between a student and Vi-Sakha (AI assistant).

CONVERSATION:
{{transcript}}

Produce a JSON summary:
{
  "summary": "2-3 sentence summary of what was discussed and resolved",
  "topics": ["topic1", "topic2"],
  "preferences": [{"key": "preference_name", "value": "preference_value"}],
  "resolution": "resolved" | "escalated" | "abandoned"
}`;

/**
 * Simple template variable substitution.
 * Replaces {{variable}} with values from the context object.
 * Supports simple {{#each list}}...{{/each}} loops for RAG context rendering.
 */
export function renderTemplate(
  template: string,
  context: Record<string, unknown>,
): string {
  // First, process any {{#each list}} ... {{/each}} blocks
  let rendered = template.replace(/\{\{#each (\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_: string, listKey: string, innerTemplate: string) => {
    const list = context[listKey];
    if (!Array.isArray(list)) {
      return "";
    }
    
    return list.map((item: any) => {
      // For each item in the list, replace {{this.field}} or {{field}} with item[field]
      return innerTemplate.replace(/\{\{(?:this\.)?(\w+)\}\}/g, (__: string, propKey: string) => {
        const val = item[propKey];
        return val !== undefined ? String(val) : "";
      });
    }).join("");
  });

  // Then process simple variable substitutions like {{query}}
  rendered = rendered.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context[key];
    return value !== undefined ? String(value) : `{{${key}}}`;
  });

  return rendered;
}
