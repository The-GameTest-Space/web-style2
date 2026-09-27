import DOMPurify from 'dompurify'

// The only frames event text may embed: YouTube videos and Discord's server
// widget, as pasted from their "embed" buttons. Any other iframe is dropped.
const EMBEDS: [kind: string, src: RegExp][] = [
  ['youtube', /^https:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/[\w-]+(?:[?#]|$)/],
  ['discord', /^https:\/\/(?:discord|discordapp)\.com\/widget\?id=\d+(?:&|$)/],
]
const embedKind = (src: string) => EMBEDS.find(([, re]) => re.test(src))?.[0]

DOMPurify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe' && !embedKind((node as Element).getAttribute('src') ?? '')) {
    node.parentNode?.removeChild(node)
  }
})

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Links in admin-written text lead off the site: open them in a new tab
  // without giving that tab a handle on this page.
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
  // Whatever the pasted embed code asked for, a frame gets these and no more.
  if (node.tagName === 'IFRAME') {
    const kind = embedKind(node.getAttribute('src') ?? '')
    for (const name of [...node.getAttributeNames()]) if (name !== 'src' && name !== 'title') node.removeAttribute(name)
    node.setAttribute('class', `embed embed--${kind}`)
    node.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-presentation')
    node.setAttribute('allow', 'encrypted-media; picture-in-picture; fullscreen')
    node.setAttribute('allowfullscreen', '')
    node.setAttribute('loading', 'lazy')
    // YouTube refuses to play in frames that send no referrer.
    node.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin')
  }
})

/**
 * Admin-written HTML made safe for v-html: scripts, event handlers and
 * javascript: URLs are removed, and so are styles and form controls, so the
 * text keeps the site's own look. YouTube and Discord embeds are kept.
 */
export function safeHtml(html: string) {
  return DOMPurify.sanitize(html, {
    ADD_TAGS: ['iframe'],
    FORBID_TAGS: ['style', 'form', 'input', 'button', 'textarea', 'select', 'option'],
    FORBID_ATTR: ['style'],
  })
}

const escape = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** Text with no tags becomes paragraphs (split on blank lines); anything with tags is kept as HTML. */
export function asHtml(text: string) {
  const t = text.trim()
  if (!t || /<\/?[a-z][^>]*>/i.test(t)) return t
  return t
    .split(/\n\s*\n/)
    .map((p) => `<p>${escape(p.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('')
}
