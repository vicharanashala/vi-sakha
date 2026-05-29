/**
 * Web Scraper & HP API Client
 * 
 * Provides live data fetching from the VInternship GitHub Pages site
 * and Google Apps Script HP APIs. No content is hardcoded — everything
 * is fetched at query time.
 */

import { createLogger } from "@visakha/shared-utils";

const log = createLogger("web-scraper");

// ── HP API endpoints per cohort (public URLs from GitHub Pages HTML source) ──
const COHORT_HP_APIS: Record<string, string> = {
  aksians: "https://script.google.com/macros/s/AKfycby4uj1yr4KhQdiZeWlm2zYX96ypW--IdtNhu7ZXwStCp8A-WK_vJMWYH2rhkzFAz3Cg/exec",
  rsaians: "https://script.google.com/macros/s/AKfycbzAloowHilBMPpp_Y2RXgK0y_kh2xdDrLMKDCHTE8sW22Zql6shrdfvVZP3jd8NGVrw/exec",
  kruskalians: "https://script.google.com/macros/s/AKfycbxC7wOlHq2yZZFn3qy7k_t898qRN51rUsKJruefs2Pj2WLMDEu3P8Ah_SCvuPkIpLnqrQ/exec",
  dijkstrians: "https://script.google.com/macros/s/AKfycbwmLsHh3-tf5Ikvn7gVf14cKcDM0V33g20cyBBU-ped0zIyNEYlUlZIhV0oO2CgM8AvBA/exec",
  euclideans: "https://script.google.com/macros/s/AKfycbwq_M-IDZlZUlDMJ7gXuhLhNq304qdCLs60plmJ90TtLtnZURKPxnrRVeS3kwLzZ2Hg/exec",
};

// ── VInternship base URL ──
const VINTERNSHIP_BASE = "https://sudarshansudarshan.github.io/vinternship";

// ── Keyword → page path mapping for intelligent page selection ──
const PAGE_KEYWORDS: Record<string, string[]> = {
  "/faq/": ["faq", "frequently asked", "question"],
  "/hp/": ["health point", "hp system", "hp rule", "how hp works", "hp policy"],
  "/intro/": ["introduction", "about vinternship", "what is vinternship", "program overview"],
  "/case-studies/": ["case study", "case studies", "practice problem"],
  "/projects/": ["project", "project selection"],
  "/linkedin_post/": ["linkedin", "linkedin post", "linkedin activity"],
  "/blogs/": ["blog", "blog writing", "blog activity"],
  "/vlogs/": ["vlog", "vlog activity", "video"],
  "/endorsements/": ["endorsement", "endorse"],
  "/vibe/": ["vibe", "vibe platform"],
  "/git-guide/": ["git", "github", "git guide", "repository"],
  "/protocols_and_policies/": ["protocol", "policy", "policies", "rules", "code of conduct"],
  "/milestones/": ["milestone", "deadline", "due date", "submission date"],
  "/aksians/": ["aksians", "aksian"],
  "/rsaians/": ["rsaians", "rsaian", "rsa"],
  "/kruskalians/": ["kruskalians", "kruskalian", "kruskal"],
  "/dijkstrians/": ["dijkstrians", "dijkstrian", "dijkstra"],
  "/euclideans/": ["euclideans", "euclidean", "euclid"],
  "/founders-keepers/": ["founders", "founders keepers", "founder"],
  "/vled-connect/": ["vled connect", "vled"],
};

export interface HPStudentData {
  name: string;
  email: string;
  baseHP: number;
  currentHP: number;
  status: string;
  rank: number;
}

export interface HPLookupResult {
  found: boolean;
  student?: HPStudentData;
  cohort: string;
  totalStudents: number;
  error?: string;
}

export interface PageScrapeResult {
  url: string;
  title: string;
  content: string;
  success: boolean;
  error?: string;
}

/**
 * Recursive DOM to Markdown parser that preserves hierarchy, statuses, and links.
 */
function parseElement($: any, node: any, baseUrl: string): string {
  if (node.type === 'text') {
    return node.data.trim();
  }

  if (node.type !== 'tag') {
    return '';
  }

  const tagName = node.name.toLowerCase();

  // Skip scripts, styles, forms, navigation, footers, headers, sidebars
  if (['script', 'style', 'nav', 'footer', 'header', 'noscript', 'iframe', 'form'].includes(tagName)) {
    return '';
  }
  const className = $(node).attr('class') || '';
  if (className.match(/(sidebar|menu|nav|footer|header|ad-|social-)/i)) {
    return '';
  }

  // Handle links - format as [Text](URL) so the model sees all options and links
  if (tagName === 'a') {
    const href = $(node).attr('href');
    const text = $(node).text().trim().replace(/\s+/g, ' ');
    if (!href || href.startsWith('javascript:') || href.startsWith('#')) {
      return text;
    }
    let absoluteUrl = href;
    try {
      if (!href.startsWith('http://') && !href.startsWith('https://')) {
        absoluteUrl = new URL(href, baseUrl).toString();
      }
    } catch (e) {}
    return `[${text || href}](${absoluteUrl})`;
  }

  const childTexts: string[] = [];
  $(node).contents().each((_: number, child: any) => {
    const parsed = parseElement($, child, baseUrl);
    if (parsed) {
      childTexts.push(parsed);
    }
  });

  const innerText = childTexts.join(' ').trim().replace(/\s+/g, ' ');
  if (!innerText) return '';

  if (tagName.match(/^h[1-6]$/)) {
    const level = tagName.charAt(1);
    return `\n${'#'.repeat(parseInt(level))} ${innerText}\n`;
  }

  if (tagName === 'p') {
    return `\n${innerText}\n`;
  }

  if (tagName === 'li') {
    return `* ${innerText}`;
  }

  if (tagName === 'tr') {
    return `| ${childTexts.join(' | ')} |`;
  }

  if (tagName === 'blockquote') {
    return `> ${innerText}`;
  }

  if (tagName === 'pre' || tagName === 'code') {
    return `\`\`\`\n${$(node).text().trim()}\n\`\`\``;
  }

  if (['div', 'span', 'section', 'article', 'body', 'ul', 'ol', 'table', 'tbody'].includes(tagName)) {
    if (tagName === 'div' || tagName === 'section' || tagName === 'article') {
      return `\n${innerText}\n`;
    }
    return innerText;
  }

  return innerText;
}

/**
 * Fetch and parse a VInternship page, extracting clean text content.
 * Uses dynamic import for cheerio to avoid bundling issues.
 */
export async function scrapePage(pagePath: string): Promise<PageScrapeResult> {
  const url = `${VINTERNSHIP_BASE}${pagePath}`;
  log.info(`Scraping page: ${url}`);

  try {
    const axios = (await import("axios")).default;
    const cheerio = await import("cheerio");

    const response = await axios.get(url, {
      headers: { "User-Agent": "Vi-Sakha-Bot/1.0" },
      timeout: 8000,
    });

    const $ = cheerio.load(response.data);
    const body = $("body")[0];
    
    // Perform robust recursive markdown serialization
    const rawMarkdown = parseElement($, body, VINTERNSHIP_BASE);
    
    // Clean up excessive empty lines
    const content = rawMarkdown
      .split('\n')
      .map(line => line.trim())
      .filter((line, i, arr) => line !== '' || arr[i - 1] !== '')
      .join('\n');

    const title = $("title").text().trim() || pagePath;

    log.info(`Scraped ${content.length} chars from ${url}`);

    return { url, title, content: content.substring(0, 5000), success: true };
  } catch (error) {
    const msg = (error as Error).message;
    log.error(`Failed to scrape ${url}: ${msg}`);
    return { url, title: pagePath, content: "", success: false, error: msg };
  }
}

/**
 * Determine which VInternship page to scrape based on query keywords.
 * Returns the most relevant page path, or "/" for the homepage.
 */
export function selectPageForQuery(query: string): string {
  const lowerQuery = query.toLowerCase();

  let bestMatch = "/";
  let bestScore = 0;

  for (const [path, keywords] of Object.entries(PAGE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerQuery.includes(keyword)) {
        const score = keyword.length; // Longer keyword = more specific match
        if (score > bestScore) {
          bestScore = score;
          bestMatch = path;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Look up a student's HP from the live Google Apps Script API.
 * Searches by email (exact match, case-insensitive) or by name (partial match).
 */
export async function lookupStudentHP(
  cohort: string,
  studentIdentifier: string,
): Promise<HPLookupResult> {
  const cohortKey = cohort.toLowerCase().replace(/[^a-z-]/g, "");
  const apiUrl = COHORT_HP_APIS[cohortKey];

  if (!apiUrl) {
    const availableCohorts = Object.keys(COHORT_HP_APIS).join(", ");
    return {
      found: false,
      cohort: cohortKey,
      totalStudents: 0,
      error: `Unknown cohort "${cohort}". Available cohorts: ${availableCohorts}`,
    };
  }

  log.info(`Looking up HP for "${studentIdentifier}" in cohort ${cohortKey}`);

  try {
    const axios = (await import("axios")).default;
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const data = response.data;

    const leaderboard: HPStudentData[] = data.leaderboard || data || [];

    if (!Array.isArray(leaderboard) || leaderboard.length === 0) {
      return {
        found: false,
        cohort: cohortKey,
        totalStudents: 0,
        error: "HP leaderboard data is currently unavailable.",
      };
    }

    const identifier = studentIdentifier.toLowerCase().trim();

    // Try exact email match first
    let student = leaderboard.find(
      (s) => s.email?.toLowerCase().trim() === identifier,
    );

    // Fallback to partial name match
    if (!student) {
      student = leaderboard.find(
        (s) => s.name?.toLowerCase().includes(identifier) ||
               identifier.includes(s.name?.toLowerCase()),
      );
    }

    if (student) {
      return {
        found: true,
        student,
        cohort: cohortKey,
        totalStudents: leaderboard.length,
      };
    }

    return {
      found: false,
      cohort: cohortKey,
      totalStudents: leaderboard.length,
      error: `Student "${studentIdentifier}" not found in ${cohortKey} leaderboard (${leaderboard.length} students).`,
    };
  } catch (error) {
    const msg = (error as Error).message;
    log.error(`HP API call failed for ${cohortKey}: ${msg}`);
    return {
      found: false,
      cohort: cohortKey,
      totalStudents: 0,
      error: `Failed to fetch HP data: ${msg}`,
    };
  }
}

/**
 * Get the full HP leaderboard for a cohort (top N students).
 */
export async function getLeaderboard(
  cohort: string,
  topN = 10,
): Promise<{ students: HPStudentData[]; cohort: string; total: number; error?: string }> {
  const cohortKey = cohort.toLowerCase().replace(/[^a-z-]/g, "");
  const apiUrl = COHORT_HP_APIS[cohortKey];

  if (!apiUrl) {
    return { students: [], cohort: cohortKey, total: 0, error: `Unknown cohort "${cohort}"` };
  }

  try {
    const axios = (await import("axios")).default;
    const response = await axios.get(apiUrl, { timeout: 10000 });
    const leaderboard: HPStudentData[] = response.data.leaderboard || response.data || [];

    return {
      students: leaderboard.slice(0, topN),
      cohort: cohortKey,
      total: leaderboard.length,
    };
  } catch (error) {
    return {
      students: [],
      cohort: cohortKey,
      total: 0,
      error: (error as Error).message,
    };
  }
}

/**
 * Returns available cohort names.
 */
export function getAvailableCohorts(): string[] {
  return Object.keys(COHORT_HP_APIS);
}
