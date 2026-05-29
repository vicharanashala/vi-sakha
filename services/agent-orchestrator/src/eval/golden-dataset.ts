/**
 * Golden Dataset for Evaluation
 * 
 * Curated set of questions and ideal answers used to benchmark
 * the agent's retrieval and synthesis performance.
 */

export interface GoldenTest {
  id: string;
  query: string;
  expectedAnswer: string;
  expectedSources: string[];
  tags: string[];
}

export const GOLDEN_DATASET: GoldenTest[] = [
  {
    id: "vinter-001",
    query: "What is the VInternship program?",
    expectedAnswer: "VInternship is a student internship program by IIT Ropar focusing on practical skills, industrial projects, and mentorship.",
    expectedSources: ["program_overview", "faq"],
    tags: ["general", "intro"]
  },
  {
    id: "vinter-002",
    query: "How do I earn Health Points (HP)?",
    expectedAnswer: "HP can be earned by completing courses on ViBe, attending live sessions, and submitting case studies on time.",
    expectedSources: ["hp_system", "grading_policy"],
    tags: ["hp", "grading"]
  },
  {
    id: "vinter-003",
    query: "When is the deadline for case study submission?",
    expectedAnswer: "Check the ViBe platform dashboard for specific deadlines for your cohort; generally, it's 2 weeks after the project release.",
    expectedSources: ["deadlines", "case_study_guide"],
    tags: ["deadlines", "submissions"]
  }
];

/**
 * Evaluation metrics logic would go here:
 * - Cosine similarity (expected vs actual)
 * - Source recall (were expected sources retrieved?)
 * - Hallucination detection
 */
