import type { GameEvent } from '@/api/types'

// SAMPLE DATA. Fictional events for the local-only fallback (../fallback.ts).
// Dates are generated relative to today so the D-day board always has
// something upcoming.

type Seed = Omit<GameEvent, 'startsAt' | 'endsAt' | 'deadline'> & {
  start?: [days: number, hour: number, minute?: number]
  end?: [days: number, hour: number, minute?: number]
  deadline?: { label: string; days: number }
}

const seeds: Seed[] = [
  {
    slug: 'friday-playtest-night',
    title: 'GTSpace 週五試玩夜',
    type: 'playtest',
    ongoing: true,
    schedule: '每週五 20:00–23:00',
    city: '線上',
    venue: 'Discord 語音頻道',
    online: true,
    fee: '免費',
    summary: '帶著你的 build 上台，其他人當場玩、當場給回饋。',
    description:
      '<p>每位開發者有 <strong>20 分鐘</strong>：先用兩分鐘介紹遊戲，接著分享畫面讓大家試玩或看你玩，最後大家直接在語音裡給回饋。</p>' +
      '<h3>要準備什麼</h3><ul><li>一個能跑起來的 build</li><li>一個你最想知道的問題</li></ul>' +
      '<p>沒有作品的人也歡迎來當測試者。</p>',
    agenda: [
      { time: '20:00', item: '開場、介紹今晚的遊戲' },
      { time: '20:10', item: '第一輪試玩（三款遊戲）' },
      { time: '21:30', item: '休息、自由聊天' },
      { time: '21:45', item: '第二輪試玩（三款遊戲）' },
      { time: '23:00', item: '散會' },
    ],
    audience: ['想找人測試的開發者', '想玩到還沒上架遊戲的玩家'],
  },
  {
    slug: 'taipei-48h-jam',
    title: '48 小時 Game Jam：台北場',
    type: 'jam',
    start: [12, 18],
    end: [14, 18],
    city: '台北',
    venue: '中山區共享空間（示範地點）',
    online: false,
    fee: 'NT$ 300',
    deadline: { label: '報名截止', days: 5 },
    summary: '週五晚上公布主題，週日晚上交出一款能玩的遊戲。',
    description:
      '<p>現場組隊或自帶隊伍都可以。程式、美術、音樂、企劃都歡迎，第一次參加 Jam 的人我們會幫你找隊友。</p><p>週日晚上所有作品現場試玩，大家互相投票選出最喜歡的遊戲。</p>',
    agenda: [
      { time: '週五 18:00', item: '報到、公布主題、組隊' },
      { time: '週六 全天', item: '開發' },
      { time: '週日 15:00', item: '停止開發、上傳作品' },
      { time: '週日 16:00', item: '全場試玩與投票' },
    ],
    audience: ['程式', '美術', '音樂音效', '企劃', '第一次參加 Jam 的人'],
  },
  {
    slug: 'taichung-dev-meetup',
    title: '台中獨立遊戲開發者聚會',
    type: 'meetup',
    start: [19, 14],
    end: [19, 17],
    city: '台中',
    venue: '西區咖啡館包場（示範地點）',
    online: false,
    fee: '低消一杯飲料',
    summary: '中部的開發者見面聊天，帶筆電來秀你正在做的東西。',
    description:
      '<p>沒有講者、沒有議程，就是一群做遊戲的人坐下來聊天。可以帶筆電或 Switch 讓大家玩你的作品。</p><p>常見話題：怎麼找美術、怎麼上 Steam、怎麼撐過開發中期的倦怠。</p>',
    audience: ['中部的開發者', '想認識同好的學生'],
  },
  {
    slug: 'playtest-design-talk',
    title: '講座：怎麼辦一場有用的試玩',
    type: 'talk',
    start: [26, 19, 30],
    end: [26, 21],
    city: '線上',
    venue: 'Discord Stage',
    online: true,
    fee: '免費',
    summary: '找到對的人、問對的問題、看懂回饋。從觀察玩家到整理回饋的實戰方法。',
    description:
      '<p>「好玩嗎？」是試玩時最沒用的問題。這場講座會分享怎麼設計試玩流程、怎麼在旁邊觀察而不插手、怎麼把一堆回饋變成下一版的待辦清單。</p><p>講座後半段是 Q&A，可以帶著你自己的試玩問題來問。</p>',
    agenda: [
      { time: '19:30', item: '為什麼大部分的試玩回饋都沒用' },
      { time: '20:00', item: '觀察、提問、紀錄：三個技巧' },
      { time: '20:30', item: 'Q&A' },
    ],
    audience: ['正在準備第一次試玩的開發者', '想學怎麼給好回饋的測試者'],
  },
  {
    slug: 'indie-expo-booth-call',
    title: '南部獨立遊戲展：攤位徵件',
    type: 'expo',
    start: [45, 10],
    end: [46, 18],
    city: '高雄',
    venue: '駁二藝術特區倉庫（示範地點）',
    online: false,
    fee: '入選免攤位費',
    deadline: { label: '徵件截止', days: 16 },
    summary: '兩天的獨立遊戲展，開放開發團隊申請免費攤位，現場讓玩家試玩。',
    description:
      '<p>展覽徵求可以現場試玩的獨立遊戲，完成度不限，但需要能讓玩家在 10 分鐘內玩到核心玩法。</p><p>入選團隊會拿到一個攤位、一張桌子和兩張椅子，螢幕和電腦需要自備。</p>',
    audience: ['有可試玩 demo 的團隊', '想看台灣獨立遊戲的玩家'],
  },
  {
    slug: 'kaohsiung-jam',
    title: '高雄一日 Jam',
    type: 'jam',
    start: [33, 9],
    end: [33, 21],
    city: '高雄',
    venue: '大學設計學院（示範地點）',
    online: false,
    fee: '免費',
    deadline: { label: '報名截止', days: 24 },
    summary: '十二小時做一款小遊戲，適合想試試 Jam 但不想熬夜的人。',
    description:
      '<p>只有一天，不熬夜。早上九點公布主題，晚上九點前交件。</p><p>現場提供午餐和晚餐，名額 40 人。</p>',
    audience: ['學生', '第一次參加 Jam 的人', '想練習快速原型的開發者'],
  },
]

function at(base: Date, [days, hour, minute = 0]: [number, number, number?]) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function buildEvents(now = new Date()): GameEvent[] {
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  return seeds
    .map(({ start, end, deadline, ...rest }) => ({
      ...rest,
      startsAt: start ? at(today, start) : undefined,
      endsAt: end ? at(today, end) : undefined,
      deadline: deadline ? { label: deadline.label, date: at(today, [deadline.days, 23, 59]) } : undefined,
    }))
    .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? '')) as GameEvent[]
}
