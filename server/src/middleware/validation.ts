/**
 * middleware/validation.ts
 *
 * Input Sanitization and Validation
 * 
 * Why this matters:
 * You can NEVER trust data coming from a client (mobile app or browser).
 * A malicious user could send HTML/JavaScript scripts (XSS attacks), huge
 * strings to exhaust database limits, or unexpected categories.
 * This checks that the incoming data follows the rules before it touches the database.
 */

import sanitizeHtml from "sanitize-html";
import Filter from "bad-words";

const profanityFilter = new Filter();

export function sanitizeText(text: string): string {
  if (!text) return "";

  // 1. Strip all HTML tags
  const clean = sanitizeHtml(text, {
    allowedTags: [],
    allowedAttributes: {},
  });

  // 2. Filter profanity
  try {
    return profanityFilter.clean(clean.trim());
  } catch (e) {
    // bad-words sometimes throws on certain weird characters
    return clean.trim();
  }
}

export function validateQuestionInput(text: string, category: string) {
  const validCategories = ["lifestyle", "career", "relationships", "controversial"];
  
  if (!text || text.length < 5 || text.length > 250) {
    throw new Error("Question text must be between 5 and 250 characters");
  }

  if (!validCategories.includes(category)) {
    throw new Error("Invalid category");
  }
}

export function validateCommentInput(content: string) {
  if (!content || content.length < 1 || content.length > 500) {
    throw new Error("Comment content must be between 1 and 500 characters");
  }
}
