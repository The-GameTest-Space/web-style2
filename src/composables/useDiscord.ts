import { ref } from 'vue'

export const DISCORD_INVITE = 'https://discord.gg/yXfKQpAPN'
const INVITE_CODE = 'yXfKQpAPN'

export interface DiscordPresence {
  guildName: string
  members: number
  online: number
}

// Shared across every component: the public invite endpoint is fetched once.
const presence = ref<DiscordPresence | null>(null)
const status = ref<'idle' | 'loading' | 'ready' | 'unavailable'>('idle')

async function load() {
  status.value = 'loading'
  try {
    const res = await fetch(`https://discord.com/api/v10/invites/${INVITE_CODE}?with_counts=true`)
    if (!res.ok) throw new Error(String(res.status))
    const body = await res.json()
    const members = Number(body.approximate_member_count)
    const online = Number(body.approximate_presence_count)
    if (!Number.isFinite(members) || !Number.isFinite(online)) throw new Error('no counts')
    presence.value = { guildName: body.guild?.name ?? 'The Game Test Space', members, online }
    status.value = 'ready'
  } catch {
    // No numbers is better than made-up numbers.
    status.value = 'unavailable'
  }
}

/** Real member and online counts from Discord's public invite API. */
export function useDiscord() {
  if (status.value === 'idle') load()
  return { presence, status }
}
