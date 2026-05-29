"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MEMORY_SUMMARY_TEMPLATE = exports.CONTEXT_ASSEMBLY_TEMPLATE = exports.QA_EXTRACTION_TEMPLATE = void 0;
exports.renderTemplate = renderTemplate;
exports.QA_EXTRACTION_TEMPLATE = `You are analyzing a Discord support ticket from a student internship program (VInternship).
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
exports.CONTEXT_ASSEMBLY_TEMPLATE = `Aggregated Context (sorted by relevance):

{{#each contexts}}
[Relevance: {{this.score}}] [Source: {{this.source}}] [Type: {{this.type}}]
{{this.content}}

{{/each}}
---

User Query: {{query}}

Provide a helpful answer based on the knowledge base above.`;
exports.MEMORY_SUMMARY_TEMPLATE = `Summarize the following conversation between a student and Vi-Sakha (AI assistant).

CONVERSATION:
{{transcript}}

Produce a JSON summary:
{
  "summary": "2-3 sentence summary of what was discussed and resolved",
  "topics": ["topic1", "topic2"],
  "preferences": [{"key": "preference_name", "value": "preference_value"}],
  "resolution": "resolved" | "escalated" | "abandoned"
}`;
function renderTemplate(template, context) {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
        const value = context[key];
        return value !== undefined ? String(value) : `{{${key}}}`;
    });
}
//# sourceMappingURL=index.js.map