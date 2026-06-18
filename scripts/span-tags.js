/**
 * Bracket syntax: [[class1,class2]text] → <span class="class1 class2">text</span>
 * Only alphanumeric, hyphen, and underscore are allowed in class names.
 * Malformed patterns (empty class list, invalid chars) are left unchanged.
 */

/**
 * Parses a comma-separated class string into a validated list.
 * Returns an empty array if any name is invalid or missing.
 * @param {string} raw
 * @returns {string[]}
 */
function parseClasses(raw) {
  const names = raw.split(',').map((c) => c.trim());
  if (names.some((c) => !c || !/^[a-zA-Z0-9_-]+$/.test(c))) return [];
  return names;
}

/**
 * Validates class names for the split-boundary pass (lowercase, digits, hyphens only).
 * @param {string} raw Comma-separated class string captured from the opening tag
 * @returns {string[]} Valid class names, or empty array if any are invalid
 */
function parseSplitClasses(raw) {
  const names = raw.split(',').map((c) => c.trim());
  if (names.some((c) => !c || !/^[a-z0-9-]+$/.test(c))) return [];
  return names;
}

/** Inline element tag names eligible for split-boundary wrapping. */
const SPLIT_INLINE_TAGS = new Set(['STRONG', 'EM', 'A', 'BR']);

/** Matches [[classes] at the end of a text node value (split-boundary opener). */
// eslint-disable-next-line sonarjs/slow-regex
const SPLIT_OPEN_RE = /\[\[([a-z0-9,-]+)\]$/;

/**
 * Split-boundary pass: handles [[classes]<inline>] patterns where DA has rendered
 * the opening bracket in one text node, the content as a sibling inline element
 * (<strong>, <em>, <a>, <br>), and the closing ] in the following text node.
 *
 * Scans direct child nodes of `el` for the three-node sequence:
 *   [Text ending "[[classes]"] [inline element] [Text starting "]"]
 *
 * When found, wraps the inline element in a <span class="classes"> and trims
 * the bracket syntax from the surrounding text nodes. If the sequence is
 * malformed or any class name is invalid, those nodes are left unchanged.
 *
 * @param {Element} el A heading, paragraph, or list-item element
 */
function applySplitBoundaryPass(el) {
  // Snapshot before any mutations so index arithmetic stays stable.
  const children = [...el.childNodes];

  for (let i = 0; i < children.length - 2; i += 1) {
    const prev = children[i];
    const mid = children[i + 1];
    const next = children[i + 2];

    const isPrevText = prev.nodeType === Node.TEXT_NODE;
    // eslint-disable-next-line secure-coding/detect-object-injection
    const isMidInline = mid.nodeType === Node.ELEMENT_NODE && SPLIT_INLINE_TAGS.has(mid.nodeName);
    const isNextText = next.nodeType === Node.TEXT_NODE;

    if (isPrevText && isMidInline && isNextText) {
      const openMatch = prev.nodeValue.match(SPLIT_OPEN_RE);
      const classes = openMatch ? parseSplitClasses(openMatch[1]) : [];

      if (openMatch && classes.length && next.nodeValue.startsWith(']')) {
        // Build the wrapping span and move the inline element into it.
        // appendChild transfers mid out of el automatically — no removeChild needed.
        const span = document.createElement('span');
        span.className = classes.join(' ');
        span.appendChild(mid);

        // Insert the span at mid's former position (next is now the next sibling).
        el.insertBefore(span, next);

        // Strip the opening-tag suffix from the preceding text node.
        prev.nodeValue = prev.nodeValue.slice(0, -openMatch[0].length);

        // Strip the leading ] from the following text node.
        next.nodeValue = next.nodeValue.slice(1);
      }
    }
  }
}

/**
 * Transforms bracket syntax in a plain-text string to an HTML string.
 * @param {string} text Plain text (not HTML)
 * @returns {string} HTML string with <span> replacements applied
 */
export function applySpanTags(text) {
  // eslint-disable-next-line sonarjs/slow-regex
  return text.replace(/\[\[([^\]]+)\]([^\]]*)\]/g, (match, raw, content) => {
    const classes = parseClasses(raw);
    if (!classes.length) return match;
    // eslint-disable-next-line secure-coding/no-improper-sanitization
    const safe = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    return `<span class="${classes.join(' ')}">${safe}</span>`;
  });
}

/**
 * Replaces a text node in place with a DocumentFragment containing
 * plain text nodes and <span> elements for each matched pattern.
 * Unmatched text and malformed patterns are preserved as-is.
 * @param {Text} textNode
 */
function replaceTextNode(textNode) {
  const text = textNode.nodeValue;
  const frag = document.createDocumentFragment();
  let lastIndex = 0;
  let match;

  // eslint-disable-next-line sonarjs/slow-regex
  const re = /\[\[([^\]]+)\]([^\]]*)\]/g;

  // eslint-disable-next-line no-cond-assign
  while ((match = re.exec(text)) !== null) {
    const [full, raw, content] = match;
    const classes = parseClasses(raw);

    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }

    if (!classes.length) {
      frag.appendChild(document.createTextNode(full));
    } else {
      const span = document.createElement('span');
      span.className = classes.join(' ');
      span.textContent = content;
      frag.appendChild(span);
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex === 0) return; // no pattern found — leave node untouched

  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  textNode.parentNode.replaceChild(frag, textNode);
}

/**
 * Walks heading, paragraph, and list-item text nodes inside `element`
 * and applies the bracket-to-span transformation where the pattern is found.
 * @param {Element} element
 */
export function decorateSpanTags(element) {
  element.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li').forEach((el) => {
    // Pass 1 — single-text-node patterns: [[classes]text]
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue.includes('[[')) nodes.push(node);
      node = walker.nextNode();
    }
    nodes.forEach(replaceTextNode);

    // Pass 2 — split-boundary patterns: [[classes]<inline>]
    applySplitBoundaryPass(el);
  });
}
