/**
 * HTMLCleaner — strip non-educational HTML before LLM prompts.
 * Re-exports notes/htmlCleaner for the token-optimized pipeline.
 */
export {
  stripNonEducationalHtml,
  cleanHtml,
  htmlToMarkdown,
  htmlToEducationalText,
  removeUnwantedTags,
} from "../notes/htmlCleaner.js";

import * as htmlCleanerImpl from "../notes/htmlCleaner.js";

export const htmlCleaner = {
  stripNonEducationalHtml: htmlCleanerImpl.stripNonEducationalHtml,
  cleanHtml: htmlCleanerImpl.cleanHtml,
  htmlToMarkdown: htmlCleanerImpl.htmlToMarkdown,
  htmlToEducationalText: htmlCleanerImpl.htmlToEducationalText,
  removeUnwantedTags: htmlCleanerImpl.removeUnwantedTags,
};

export default htmlCleaner;
