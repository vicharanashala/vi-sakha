/**
 * Validator to prevent AI hallucinations by cross-checking 
 * LLM-generated text against deterministic backend data.
 */
export class ConsistencyValidator {
  /**
   * Validates if the numbers mentioned in the text are consistent 
   * with the provided ground truth metadata.
   * 
   * @param text The AI generated explanation
   * @param groundTruth Key-value pairs of authoritative data (e.g., { "change": 18, "category_impact": 12 })
   * @param tolerance Allowed difference (e.g. 1% for rounding)
   */
  static validate(
    text: string,
    groundTruth: Record<string, number>,
    tolerance: number = 0.5
  ): { isValid: boolean; mismatches: string[] } {
    const mismatches: string[] = [];
    
    // Extract all percentages and numbers from the text
    // Matches "18%", "+12%", "down 5", etc.
    const numberRegex = /([-+]?\d+\.?\d*)\s*%/g;
    let match;
    const foundNumbers: number[] = [];
    
    while ((match = numberRegex.exec(text)) !== null) {
      foundNumbers.push(parseFloat(match[1]));
    }

    // Check if each ground truth value is present in the text (within tolerance)
    for (const [key, expectedValue] of Object.entries(groundTruth)) {
      const isPresent = foundNumbers.some(
        val => Math.abs(val - expectedValue) <= tolerance
      );
      
      if (!isPresent) {
        mismatches.push(`Ground truth value for '${key}' (${expectedValue}%) not found or mismatched in AI text.`);
      }
    }

    return {
      isValid: mismatches.length === 0,
      mismatches
    };
  }
}
