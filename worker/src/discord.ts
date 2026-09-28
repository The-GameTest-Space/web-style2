// Whether someone is in the community's Discord server, asked of Discord by
// the app's bot (game-test-space-bot) each time it matters, so leaving the
// server takes effect without signing out. The bot must be in the server;
// its token is the Worker secret DISCORD_BOT_TOKEN. Get Guild Member needs no
// privileged intent (List Guild Members would need Server Members).

/** 遊戲測試的地方 GameTestSpace, the server behind the invite in src/composables/useDiscord.ts. */
export const GUILD_ID = '1260814281222520842'

const DISCORD_API = 'https://discord.com/api/v10'
// Discord's JSON error codes that answer the question: this user is not in
// the server, or has no Discord account (anymore).
const UNKNOWN_MEMBER = 10007
const UNKNOWN_USER = 10013
// …and the one that means the bot itself is not in the server.
const UNKNOWN_GUILD = 10004

/**
 * Discord gave no answer: the Worker is set up wrong (no or a bad bot token,
 * the bot not in the server) or Discord is down or limiting the bot. The
 * message says which, for the logs; people see "can't check right now".
 */
export class MemberCheckUnavailable extends Error {}

/**
 * Whether the Discord user `discordId` is a member of the server. Someone who
 * joined but has not yet passed the server's membership screening (`pending`)
 * is not one yet.
 */
export async function isGuildMember(discordId: string, botToken: string | undefined): Promise<boolean> {
  // A secret piped in with `echo` can end in a newline.
  const token = botToken?.trim()
  if (!token) throw new MemberCheckUnavailable('DISCORD_BOT_TOKEN is not set')
  let res: Response
  try {
    res = await fetch(`${DISCORD_API}/guilds/${GUILD_ID}/members/${discordId}`, {
      headers: { Authorization: `Bot ${token}` },
    })
  } catch (e) {
    throw new MemberCheckUnavailable(`Discord unreachable: ${e}`)
  }
  if (res.ok) return !(await res.json<{ pending?: boolean }>()).pending

  const body = await res.text()
  let code: unknown
  try {
    code = (JSON.parse(body) as { code?: unknown }).code
  } catch {
    // Not JSON: an outage page, say.
  }
  if (res.status === 404 && (code === UNKNOWN_MEMBER || code === UNKNOWN_USER)) return false
  const why =
    res.status === 401
      ? 'DISCORD_BOT_TOKEN is not a valid bot token'
      : res.status === 403 || code === UNKNOWN_GUILD
        ? 'the bot is not in the server'
        : res.status === 429
          ? 'Discord is rate limiting the bot'
          : 'Discord failed'
  throw new MemberCheckUnavailable(`Discord member lookup: ${why} (${res.status} ${body.slice(0, 200)})`)
}
