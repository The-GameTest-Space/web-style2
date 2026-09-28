import type { Country, EventFormat } from '@/api/types'
import { t } from '@/i18n'

// The countries in worker/src/events.ts, which also takes STEAM (an event on
// Steam, below). Their names are in the messages (country.TW and so on).
export const COUNTRIES: Country[] = ['TW', 'JP', 'KR', 'CN', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID']

export const countryLabel = (c: Country) => t(`country.${c}`)

type Place = { country?: Country | 'STEAM'; online: boolean }

/**
 * Where an event takes place: none for an event on Steam (stored as the
 * country STEAM). Events saved before countries were recorded are all in Taiwan.
 */
export const countryOf = (e: Pick<Place, 'country'>): Country | null =>
  e.country === 'STEAM' ? null : (e.country ?? 'TW')

/** Names in the messages (format.steam and so on). */
export const FORMATS: EventFormat[] = ['steam', 'online', 'offline']

/** An event on Steam is online too, but counts only as Steam. */
export const formatOf = (e: Place): EventFormat => (e.country === 'STEAM' ? 'steam' : e.online ? 'online' : 'offline')

export const formatLabel = (f: EventFormat) => t(`format.${f}`)
