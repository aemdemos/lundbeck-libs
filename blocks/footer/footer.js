import { getMetadata, DOMPURIFY } from '../../scripts/aem.js';
import { ensureDOMPurify } from '../../scripts/scripts.js';

/**
 * Fetches footer fragment HTML with dual-fetch pattern.
 * @returns {Promise<Element|null>} container element with footer sections
 */
async function fetchFooterFragment() {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta
    ? new URL(footerMeta, window.location).pathname
    : '/footer';

  let resp = await fetch('/footer.plain.html');
  if (!resp.ok) {
    resp = await fetch(`${footerPath}.plain.html`);
  }
  if (!resp.ok) return null;

  await ensureDOMPurify();
  const raw = await resp.text();
  const container = document.createElement('div');
  container.innerHTML = window.DOMPurify.sanitize(raw, DOMPURIFY);
  return container;
}

/**
 * Builds the teal legal-links bar from the first section div.
 * @param {Element} section - first div from footer fragment
 * @returns {Element} decorated teal strip element
 */
function buildLegalLinksBar(section) {
  const strip = document.createElement('div');
  strip.className = 'footer-legal-strip';

  const inner = document.createElement('div');
  inner.className = 'footer-legal-strip-inner';

  const links = section.querySelectorAll('a');
  links.forEach((link) => {
    const a = document.createElement('a');
    a.textContent = link.textContent.trim();
    a.href = link.getAttribute('href') || '#';
    if (a.textContent === 'Cookie Settings') {
      a.href = '#';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.COI) window.COI.openPreferences();
      });
    }
    if (a.href.startsWith('http') && !a.href.includes(window.location.hostname)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    inner.append(a);
  });

  strip.append(inner);
  return strip;
}

/**
 * Builds the main footer area from the second section div.
 * @param {Element} section - second div from footer fragment
 * @returns {Element} decorated main footer element
 */
function buildMainFooter(section) {
  const main = document.createElement('div');
  main.className = 'footer-main';

  const inner = document.createElement('div');
  inner.className = 'footer-main-inner';

  const leftCol = document.createElement('div');
  leftCol.className = 'footer-main-left';

  const rightCol = document.createElement('div');
  rightCol.className = 'footer-main-right';

  const items = section.querySelectorAll(':scope > p, :scope > a');
  const socialLinks = [];
  let brandLogoLink = null;

  items.forEach((item) => {
    const link = item.tagName === 'A' ? item : item.querySelector('a');
    const img = item.querySelector('img');

    if (link && img) {
      const alt = (img.getAttribute('alt') || '').toLowerCase();
      if (alt.includes('lundbeck') || alt.includes('logo')) {
        brandLogoLink = link.cloneNode(true);
      } else {
        socialLinks.push(link.cloneNode(true));
      }
    } else if (!img && item.textContent.trim()) {
      const cp = document.createElement('p');
      cp.textContent = item.textContent.trim();
      leftCol.append(cp);
    }
  });

  const socialRow = document.createElement('div');
  socialRow.className = 'footer-social-row';

  if (socialLinks.length) {
    const socialContainer = document.createElement('div');
    socialContainer.className = 'footer-social-icons';
    socialLinks.forEach((link) => {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      socialContainer.append(link);
    });
    socialRow.append(socialContainer);
  }

  if (brandLogoLink) {
    brandLogoLink.className = 'footer-brand-logo';
    brandLogoLink.target = '_blank';
    brandLogoLink.rel = 'noopener noreferrer';
    socialRow.append(brandLogoLink);
  }

  rightCol.append(socialRow);
  inner.append(leftCol);
  inner.append(rightCol);
  main.append(inner);
  return main;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const doc = await fetchFooterFragment();
  if (!doc) return;

  block.textContent = '';

  const sections = doc.querySelectorAll(':scope > div');
  if (sections.length >= 2) {
    block.append(buildLegalLinksBar(sections[0]));
    block.append(buildMainFooter(sections[1]));
  }
}
