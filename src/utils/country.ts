import type { Country } from '@/api/types'

// Must match COUNTRIES in worker/src/events.ts.
export const COUNTRY_LABEL: Record<Country, string> = {
  TW: '台灣',
  JP: '日本',
  KR: '韓國',
  CN: '中國',
  SG: '新加坡',
  MY: '馬來西亞',
  TH: '泰國',
  VN: '越南',
  PH: '菲律賓',
  ID: '印尼',
}

export const COUNTRIES = Object.keys(COUNTRY_LABEL) as Country[]

/** Where an event takes place. Events saved before countries were recorded are all in Taiwan. */
export const countryOf = (e: { country?: Country }): Country => e.country ?? 'TW'
