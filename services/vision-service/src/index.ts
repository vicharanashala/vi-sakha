import axios from "axios";
import { loadPlatformConfig } from "@visakha/config";
import { createLogger, withRetry, RetryPredicates } from "@visakha/shared-utils";
import type { 
  OCRResult, 
  CaptionResult, 
  VisionAnalysis 
} from "@visakha/shared-types";

const log = createLogger("vision-service");

/**
 * Vision Service
 * 
 * Orchestrates OCR and image captioning by calling the Python sidecar.
 * Processes attachments to extract textual context for the agent.
 */
export class VisionService {
  private config = loadPlatformConfig();

  /**
   * Perform OCR on a base64 encoded image.
   */
  async performOCR(imageBase64: string): Promise<OCRResult> {
    log.info("Performing OCR on image");
    
    try {
      const response = await withRetry(
        () => axios.post<{ text: string, lines: string[] }>(
          `${this.config.embedding.sidecarUrl}/vision/ocr`,
          { image_base64: imageBase64 },
          { timeout: 35000 }
        ),
        { retryIf: RetryPredicates.isTransient }
      );

      return {
        text: response.data.text,
        confidence: 0.9,
        language: 'en',
        metadata: { lines: response.data.lines }
      };
    } catch (error) {
      log.error("OCR failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Generate a caption for a base64 encoded image.
   */
  async generateCaption(imageBase64: string): Promise<CaptionResult> {
    log.info("Generating caption for image");

    try {
      const response = await withRetry(
        () => axios.post<{ caption: string }>(
          `${this.config.embedding.sidecarUrl}/vision/caption`,
          { image_base64: imageBase64 },
          { timeout: 35000 }
        ),
        { retryIf: RetryPredicates.isTransient }
      );

      return {
        caption: response.data.caption,
        confidence: 0.8,
        tags: []
      };
    } catch (error) {
      log.error("Captioning failed", { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Full analysis of an attachment.
   */
  async analyzeImage(imageBase64: string): Promise<VisionAnalysis> {
    log.info("Starting full image analysis");

    const [ocr, caption] = await Promise.all([
      this.performOCR(imageBase64).catch(() => ({ text: "", confidence: 0, language: 'en', metadata: { lines: [] } })),
      this.generateCaption(imageBase64).catch(() => ({ caption: "Failed to generate caption", confidence: 0, tags: [] }))
    ]);

    return {
      ocr: ocr as OCRResult,
      caption: caption as CaptionResult,
      isDocument: (ocr as OCRResult).text.length > 50,
      timestamp: new Date()
    };
  }
}

export const visionService = new VisionService();
