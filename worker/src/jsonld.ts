// schema.org Event markup for an event page, so search engines can show its
// date and place (Google's event rich results). It takes the public event
// shape (publicEvent in events.ts).

const text = (v: unknown) => (typeof v === 'string' && v ? v : undefined)

/** A UTC ISO time in Taiwan time, which has no daylight saving: 2026-10-03T09:00:00+08:00. */
function taiwanTime(iso: string) {
  return new Date(new Date(iso).getTime() + 8 * 3600_000).toISOString().replace(/\.\d{3}Z$/, '+08:00')
}

/**
 * The JSON-LD for one event, or null for an ongoing event: it has no single
 * date, and Google wants each occurrence marked up on its own.
 */
export function eventJsonLd(event: Record<string, unknown>, pageUrl: string, origin: string) {
  const startsAt = text(event.startsAt)
  if (event.ongoing || !startsAt) return null
  const endsAt = text(event.endsAt)
  const url = text(event.url) ?? pageUrl
  const cover = text(event.cover)
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.summary,
    url: pageUrl,
    startDate: taiwanTime(startsAt),
    ...(endsAt && { endDate: taiwanTime(endsAt) }),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: `https://schema.org/${event.online ? 'Online' : 'Offline'}EventAttendanceMode`,
    location: event.online
      ? { '@type': 'VirtualLocation', url }
      : {
          '@type': 'Place',
          name: event.venue,
          // Events saved before countries were recorded are in Taiwan (countryOf).
          address: { '@type': 'PostalAddress', addressLocality: event.city, addressCountry: text(event.country) ?? 'TW' },
        },
    ...(cover && { image: [new URL(cover, origin).href] }),
    // The fee is free text, in the page's language; only a free event has a
    // price that is certain.
    ...(/^(免費|free|無料|무료)/i.test(text(event.fee) ?? '') && {
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'TWD', url },
    }),
  }
}

/** A <script> tag for the head; `<` is escaped so the data cannot close the tag. */
export function jsonLdScript(data: unknown) {
  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`
}
