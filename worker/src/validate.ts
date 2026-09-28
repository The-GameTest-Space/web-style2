// Checks for what people send the Worker (events from admins, games from
// members). Everything stored in Firestore passes through here first.

/**
 * A rejected field, named by its path in the request body. `message` is the
 * zh-TW text the admin pages show; `code` and `params` let the member pages
 * say it in their own language (form.error.* in src/i18n/messages).
 */
export class Invalid extends Error {
  constructor(
    readonly field: string,
    message: string,
    readonly code = 'format',
    readonly params: Record<string, number> = {},
  ) {
    super(message)
  }
}

export function text(v: unknown, field: string, max: number): string
export function text(v: unknown, field: string, max: number, optional: true): string | undefined
export function text(v: unknown, field: string, max: number, optional = false) {
  if (v !== undefined && v !== null && typeof v !== 'string') throw new Invalid(field, '格式不正確')
  const s = (v ?? '').trim()
  if (!s) {
    if (optional) return undefined
    throw new Invalid(field, '此欄位為必填', 'required')
  }
  if (s.length > max) throw new Invalid(field, `最多 ${max} 個字`, 'tooLong', { max })
  return s
}

export function date(v: unknown, field: string): Date
export function date(v: unknown, field: string, optional: true): Date | undefined
export function date(v: unknown, field: string, optional = false) {
  const s = optional ? text(v, field, 40, true) : text(v, field, 40)
  if (!s) return undefined
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) throw new Invalid(field, '日期格式不正確', 'date')
  return d
}

export function array(v: unknown, field: string, max: number): unknown[] {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v)) throw new Invalid(field, '格式不正確')
  if (v.length > max) throw new Invalid(field, `最多 ${max} 項`, 'tooMany', { max })
  return v
}

export function bool(v: unknown, field: string) {
  if (typeof v !== 'boolean') throw new Invalid(field, '格式不正確')
  return v
}

export const record = (v: unknown, field: string) => {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new Invalid(field, '格式不正確')
  return v as Record<string, unknown>
}

export function isWebUrl(s: string, protocols: string[]) {
  try {
    return protocols.includes(new URL(s).protocol)
  } catch {
    return false
  }
}
