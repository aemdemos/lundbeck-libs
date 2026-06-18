import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * Builds the teal legal-links bar from the first section of the footer fragment.
 * @param {Element} section - first decorated section from the fragment
 * @returns {Element} decorated teal strip element
 */
function buildLegalLinksBar(section) {
  const strip = document.createElement('div');
  strip.className = 'footer-legal-strip';

  const inner = document.createElement('div');
  inner.className = 'footer-legal-strip-inner';

  section.querySelectorAll('a').forEach((link) => {
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
 * Groups the phone label paragraph and the phone button paragraph into a single
 * row so they sit on the same horizontal line (they are authored on separate
 * lines so the link can be buttonized).
 * @param {Element} container - element whose child paragraphs hold the phone content
 */
function groupPhoneRow(container) {
  const buttonP = [...container.children].find(
    (el) => el.tagName === 'P' && el.querySelector('a.button'),
  );
  if (!buttonP) return;

  const labelP = buttonP.previousElementSibling;
  const row = document.createElement('div');
  row.className = 'footer-phone-row';
  buttonP.before(row);
  if (labelP && labelP.tagName === 'P' && !labelP.querySelector('img')) {
    row.append(labelP);
  }
  row.append(buttonP);
}

/**
 * Detects the brand logo by its shape: social icons are square, the brand
 * wordmark is markedly wider than tall. Uses the authored width/height
 * attributes so it works without the image loading and without depending on
 * alt text or DOM position.
 * @param {HTMLImageElement} img
 * @returns {boolean}
 */
function isBrandLogo(img) {
  const w = parseInt(img.getAttribute('width'), 10);
  const h = parseInt(img.getAttribute('height'), 10);
  if (!w || !h) return false;
  return w / h >= 1.8;
}

/**
 * Groups consecutive image paragraphs (social icons + brand logo) into one row
 * and tags the brand-logo paragraph so CSS can size/position it independently.
 * @param {Element} container - element whose child paragraphs hold the icons/logo
 */
function groupSocialRow(container) {
  const imgParas = [...container.children].filter(
    (el) => el.tagName === 'P' && el.querySelector('img'),
  );
  if (!imgParas.length) return;

  const row = document.createElement('div');
  row.className = 'footer-social-row';
  imgParas[0].before(row);
  imgParas.forEach((p) => {
    if (isBrandLogo(p.querySelector('img'))) p.classList.add('footer-brand-logo');
    row.append(p);
  });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  block.textContent = '';

  const sections = [...fragment.querySelectorAll(':scope > .section')];
  if (!sections.length) return;

  // first section: teal legal-links strip
  block.append(buildLegalLinksBar(sections[0]));

  // remaining sections: decorated main content (responsive phone text + columns block)
  const main = document.createElement('div');
  main.className = 'footer-main';
  sections.slice(1).forEach((section) => {
    while (section.firstElementChild) main.append(section.firstElementChild);
  });

  // mobile-only phone block (shown above the columns on small screens)
  const mobilePhone = main.querySelector(':scope > .default-content-wrapper');
  if (mobilePhone) groupPhoneRow(mobilePhone);

  // desktop right column inside the columns block: phone row + social/logo row
  const rightCell = main.querySelector('.columns > div > div:last-child');
  if (rightCell) {
    groupPhoneRow(rightCell);
    groupSocialRow(rightCell);
  }

  block.append(main);
}
