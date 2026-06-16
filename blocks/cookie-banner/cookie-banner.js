const CONSENT_KEY = 'cookie-consent';

function hasConsent() {
  try {
    return window.localStorage.getItem(CONSENT_KEY) === 'true' || window.cookieConsent === true;
  } catch {
    return window.cookieConsent === true;
  }
}

function setConsent() {
  window.cookieConsent = true;
  try {
    window.localStorage.setItem(CONSENT_KEY, 'true');
  } catch {
    // storage unavailable; consent kept in memory for this session
  }
}

/**
 * Decorates the cookie banner block.
 * Expected content rows: [title], [body text], [settings link].
 * The close (X) button is generated here and accepts all cookies.
 * @param {Element} block
 */
export default function decorate(block) {
  const [titleRow, bodyRow, settingsRow] = [...block.children];

  const text = document.createElement('div');
  text.className = 'cookie-banner-text';

  const heading = titleRow?.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    heading.className = 'cookie-banner-title';
    text.append(heading);
  } else if (titleRow) {
    const title = document.createElement('p');
    title.className = 'cookie-banner-title';
    title.textContent = titleRow.textContent.trim();
    text.append(title);
  }

  if (bodyRow) {
    const body = document.createElement('div');
    body.className = 'cookie-banner-body';
    const source = bodyRow.firstElementChild || bodyRow;
    body.append(...source.childNodes);
    text.append(body);
  }

  const actions = document.createElement('div');
  actions.className = 'cookie-banner-actions';

  const settingsLink = settingsRow?.querySelector('a');
  if (settingsLink) {
    settingsLink.className = 'cookie-banner-settings';
    actions.append(settingsLink);
  }

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'cookie-banner-close';
  closeButton.setAttribute('aria-label', 'Accept all cookies and close');
  closeButton.textContent = 'X';
  closeButton.addEventListener('click', () => {
    setConsent();
    block.closest('.cookie-banner-wrapper, .cookie-banner')?.remove();
  });
  actions.append(closeButton);

  block.replaceChildren(text, actions);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-label', 'Cookie consent');
}

export { hasConsent };
