import type { Country } from '@/api/types'
import { t } from '@/i18n'

// Must match COUNTRIES in worker/src/events.ts. Their names are in the
// messages (country.TW and so on).
export const COUNTRIES: Country[] = ['TW', 'JP', 'KR', 'CN', 'SG', 'MY', 'TH', 'VN', 'PH', 'ID', 'STEAM']

export const countryLabel = (c: Country) => t(`country.${c}`)

/** Where an event takes place. Events saved before countries were recorded are all in Taiwan. */
export const countryOf = (e: { country?: Country }): Country => e.country ?? 'TW'
