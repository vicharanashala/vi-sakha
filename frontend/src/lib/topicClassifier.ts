/**
 * Rule-based topic classifier for chatbot message content.
 * Used to tag feedback with a topic for analytics hotspot detection.
 */
export class TopicClassifier {
  static classify(text: string): string {
    const t = text.toLowerCase();
    if (/\bdeadline/.test(t)) return 'Deadlines';
    if (/\bhp\b|health\s*point/.test(t)) return 'HP System';
    if (/login|error|issue|bug|fail|crash|not\s+work/.test(t)) return 'Technical Issue';
    if (/case\s*study|casestudy/.test(t)) return 'Case Studies';
    if (/\bvibe\b|module/.test(t)) return 'ViBe Modules';
    if (/ejection|eject/.test(t)) return 'Ejection Policy';
    if (/discord|channel|server/.test(t)) return 'Discord';
    if (/submission|submit|upload/.test(t)) return 'Submissions';
    return 'General';
  }
}
