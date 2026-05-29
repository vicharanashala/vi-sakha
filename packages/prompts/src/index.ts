/**
 * @visakha/prompts
 *
 * Externalized, versioned prompt templates for all agent nodes.
 */

// System prompts for agent nodes
export { PLANNER_SYSTEM_PROMPT } from './system-prompts/planner';
export { SYNTHESIZER_SYSTEM_PROMPT } from './system-prompts/synthesizer';
export { REFLECTOR_SYSTEM_PROMPT } from './system-prompts/reflector';

// Template strings and renderer
export {
  QA_EXTRACTION_TEMPLATE,
  CONTEXT_ASSEMBLY_TEMPLATE,
  MEMORY_SUMMARY_TEMPLATE,
  renderTemplate,
} from './templates/index';
