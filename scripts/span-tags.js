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
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node = walker.nextNode();
    while (node) {
      if (node.nodeValue.includes('[[')) nodes.push(node);
      node = walker.nextNode();
    }
    nodes.forEach(replaceTextNode);
  });
}
