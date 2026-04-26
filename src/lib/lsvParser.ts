import type { LSVCardData } from '../types';

const CORS_PROXY = 'https://corsproxy.io/?url=';

function normalizeCardName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "'")   // curly single quotes → straight
    .replace(/[""]/g, '"')   // curly double quotes → straight
    .replace(/\s+/g, ' ');
}

function findBestMatch(text: string, cardNames: string[]): string | null {
  const normalized = normalizeCardName(text);
  // When the pasted line itself is a DFC, extract its front face for matching
  const normalizedFront = normalized.split(' // ')[0];
  return (
    // Exact match
    cardNames.find(n => normalizeCardName(n) === normalized) ??
    // Front face of a DFC: article heading only shows front face name
    cardNames.find(n => normalizeCardName(n).split(' // ')[0] === normalized) ??
    // Pasted line is a DFC "Front // Back" — match its front face against full Scryfall name
    (normalizedFront !== normalized
      ? cardNames.find(n => normalizeCardName(n).split(' // ')[0] === normalizedFront)
      : undefined) ??
    // TCGPlayer "Card Name - Set Name - magic" lines: card name is the prefix before " - "
    cardNames.find(n => normalized.startsWith(normalizeCardName(n) + ' - ')) ??
    null
  );
}

// Lines in TCGPlayer / article pages that are noise, not card names or review text
const NOISE_PATTERNS = [
  /^buy product$/i,
  /^details\s*price\s*graph/i,
  /^product details$/i,
  /^mana cost:?$/i,
  /^card type:/i,
  /^current price points$/i,
  /^price point\s/i,
  /^market price/i,
  /^listed median/i,
  /^\$/,
  /- magic$/i,
  /^\d*(white|blue|black|red|green|colorless|phyrexian)/i,
  /^(trample|flying|haste|vigilance|deathtouch|lifelink|first strike|double strike|reach|menace|flash|hexproof|indestructible)$/i,
];

function isNoiseLine(line: string): boolean {
  return NOISE_PATTERNS.some(p => p.test(line));
}

export interface ParseResult {
  results: LSVCardData[];
  notFound: string[];
  totalCards: number;
}

/**
 * Parse pasted article text (works for TCGPlayer, ChannelFireball, any site).
 * Algorithm: find every "Limited: X.XX" line, then look backwards for the card
 * name and forwards for the review paragraph.
 */
export function parseTextReview(rawText: string, cardNames: string[]): ParseResult {
  const lines = rawText.split('\n').map(l => l.trim());
  const results: LSVCardData[] = [];
  const foundNames = new Set<string>();

  // Matches any grade line. Accepted label forms:
  //   "Limited: ..."              (standard LSV)
  //   "Sealed: ..."  /  "Draft: ..."   (format-specific grades)
  //   "In <Archetype>: ..."       (archetype-conditional, e.g. "In Silverquill")
  //   "Not <Archetype>: ..."
  // Accepts a single grade or a split (two numbers joined by // / em-dash / en-dash / " - ").
  // Each grade value can also be a "N^M" power expression (mythic joke grades,
  // e.g. "Limited: 2^1" for Mathemagics).
  const NUM = String.raw`\d+\.?\d*(?:\s*\^\s*\d+\.?\d*)?`;
  const GRADE_LINE = new RegExp(
    `^(Limited|Sealed|Draft|Elsewhere|In\\s+[A-Za-z][\\w\\s-]*?|Not\\s+[A-Za-z][\\w\\s-]*?)` +
      `[:\\s]+(${NUM})(?:(?:\\s*(?:\\/\\/|–|—)\\s*|\\s+-\\s+)(${NUM}))?\\s*$`,
    'i'
  );

  const evalNum = (s: string): number => {
    const m = s.match(/^(\d+\.?\d*)\s*\^\s*(\d+\.?\d*)$/);
    return m ? Math.pow(parseFloat(m[1]), parseFloat(m[2])) : parseFloat(s);
  };

  type ParsedGrade = { label: string; nums: number[] };
  const parseGradeLine = (line: string): ParsedGrade | null => {
    const m = line.match(GRADE_LINE);
    if (!m) return null;
    const nums = [evalNum(m[2])];
    if (m[3] !== undefined) nums.push(evalNum(m[3]));
    if (nums.some(n => isNaN(n) || n < 0 || n > 5)) return null;
    return { label: m[1].trim(), nums };
  };

  for (let i = 0; i < lines.length; i++) {
    const first = parseGradeLine(lines[i]);
    if (!first) continue;

    // Collect adjacent grade lines (blank lines between are OK). This handles
    // "In Silverquill: 2.0 - 2.5" followed by "Not Silverquill: 1.5".
    const grades: ParsedGrade[] = [first];
    let lastGradeIdx = i;
    for (let j = i + 1; j < Math.min(lines.length, i + 5); j++) {
      if (!lines[j]) continue;
      const next = parseGradeLine(lines[j]);
      if (!next) break;
      grades.push(next);
      lastGradeIdx = j;
    }

    const allNums = grades.flatMap(g => g.nums);
    const grade = Math.round((allNums.reduce((a, b) => a + b, 0) / allNums.length) * 100) / 100;

    // Build a prefix describing the original grades when there's more than just
    // a single plain "Limited: X" grade.
    const isSimple = grades.length === 1 && grades[0].nums.length === 1 && /^limited$/i.test(grades[0].label);
    const splitPrefix = isSimple
      ? ''
      : `[${grades.map(g => `${g.label}: ${g.nums.join(' / ')}`).join('; ')}] `;

    // Search backwards up to 60 lines for a card name.
    // 60 handles DFCs which have two full price-table blocks (~32 lines of noise).
    // IMPORTANT: try findBestMatch BEFORE isNoiseLine so that lines like
    // "Card Name // Back - Set - magic" (which match /- magic$/) are still found.
    let cardName: string | null = null;
    for (let j = i - 1; j >= Math.max(0, i - 60); j--) {
      const line = lines[j];
      if (!line) continue;
      const matched = findBestMatch(line, cardNames);
      if (matched && !foundNames.has(normalizeCardName(matched))) {
        cardName = matched;
        break;
      }
      // Skip noise lines only after confirming they don't contain a card name
      if (isNoiseLine(line)) continue;
    }
    if (!cardName) continue;

    // Collect review text (lines after the last grade line until the next grade block)
    const reviewParts: string[] = [];
    for (let j = lastGradeIdx + 1; j < Math.min(lines.length, lastGradeIdx + 20); j++) {
      const line = lines[j];
      if (!line) continue;
      if (parseGradeLine(line)) break;
      if (isNoiseLine(line)) continue;
      if (line.length > 20) reviewParts.push(line);
    }

    results.push({ cardName, grade, review: splitPrefix + reviewParts.join(' ').trim() });
    foundNames.add(normalizeCardName(cardName));
    i = lastGradeIdx; // skip past the consumed grade lines
  }

  const notFound = cardNames.filter(n => !foundNames.has(normalizeCardName(n)));
  return { results, notFound, totalCards: cardNames.length };
}

/**
 * URL-based parsing — fetches via CORS proxy then runs the same text parser.
 * Works for SSR sites (e.g. ChannelFireball). Will NOT work for JS-rendered
 * sites like TCGPlayer — use parseTextReview instead.
 */
export async function parseURLReview(url: string, cardNames: string[]): Promise<ParseResult> {
  const proxyUrl = `${CORS_PROXY}${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);

  if (!response.ok) {
    throw new Error(
      `Could not fetch article (status ${response.status}). ` +
      `This site may require JavaScript — use the Paste Text method instead.`
    );
  }

  const html = await response.text();
  const domParser = new DOMParser();
  const doc = domParser.parseFromString(html, 'text/html');

  const article =
    doc.querySelector('article') ??
    doc.querySelector('main') ??
    doc.querySelector('.entry-content') ??
    doc.body;

  const text = (article as HTMLElement).innerText ?? article.textContent ?? '';
  return parseTextReview(text, cardNames);
}
