<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import { ArrowLeft, Eye, EyeOff, ExternalLink, ImagePlus, Plus, Trash2, X } from 'lucide-vue-next'
import { AdminError, adminApi } from '@/api/admin'
import type { AdminEvent, EventInput, EventType } from '@/api/types'
import { EVENT_TYPE_LABEL, time } from '@/utils/format'
import { asHtml, safeHtml } from '@/utils/html'
import { toCoverImage } from '@/utils/image'
import FormField from '@/components/FormField.vue'
import StateBlock from '@/components/StateBlock.vue'

// No slug: a new event. The layout keys this page by path, so that never
// changes for one instance.
const props = defineProps<{ slug?: string }>()
const router = useRouter()
const isNew = !props.slug
const TYPES = Object.keys(EVENT_TYPE_LABEL) as EventType[]

// What the inputs hold: dates as datetime-local strings (the admin's own
// time zone), lists as plain text.
interface Form {
  slug: string
  title: string
  type: EventType
  summary: string
  startsAt: string
  endsAt: string
  ongoing: boolean
  schedule: string
  hasDeadline: boolean
  deadlineLabel: string
  deadlineAt: string
  city: string
  venue: string
  online: boolean
  fee: string
  description: string
  agenda: { time: string; item: string }[]
  audience: string
  url: string
  cover: string
  published: boolean
}

const blank = (): Form => ({
  slug: '',
  title: '',
  type: 'meetup',
  summary: '',
  startsAt: '',
  endsAt: '',
  ongoing: false,
  schedule: '',
  hasDeadline: false,
  deadlineLabel: '報名截止',
  deadlineAt: '',
  city: '',
  venue: '',
  online: false,
  fee: '免費',
  description: '',
  agenda: [],
  audience: '',
  url: '',
  cover: '',
  published: false,
})

const pad = (n: number) => String(n).padStart(2, '0')
function toLocalInput(iso?: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
const toIso = (local: string) => (local ? new Date(local).toISOString() : undefined)

function fromEvent(e: AdminEvent): Form {
  return {
    slug: e.slug,
    title: e.title,
    type: e.type,
    summary: e.summary,
    startsAt: toLocalInput(e.startsAt),
    endsAt: toLocalInput(e.endsAt),
    ongoing: !!e.ongoing,
    schedule: e.schedule ?? '',
    hasDeadline: !!e.deadline,
    deadlineLabel: e.deadline?.label ?? '報名截止',
    deadlineAt: toLocalInput(e.deadline?.date),
    city: e.city,
    venue: e.venue,
    online: e.online,
    fee: e.fee,
    description: e.description ?? '',
    agenda: (e.agenda ?? []).map((a) => ({ ...a })),
    audience: (e.audience ?? []).join('\n'),
    url: e.url ?? '',
    cover: e.cover ?? '',
    published: e.published,
  }
}

function toInput(f: Form): EventInput {
  return {
    slug: f.slug.trim(),
    title: f.title,
    type: f.type,
    summary: f.summary,
    startsAt: toIso(f.startsAt),
    // An ongoing event keeps no end or deadline, even if they were filled in before the switch.
    endsAt: f.ongoing ? undefined : toIso(f.endsAt),
    ongoing: f.ongoing,
    schedule: f.ongoing ? f.schedule : undefined,
    deadline: !f.ongoing && f.hasDeadline ? { label: f.deadlineLabel, date: toIso(f.deadlineAt) ?? '' } : undefined,
    city: f.city,
    venue: f.venue,
    online: f.online,
    fee: f.fee,
    description: asHtml(f.description) || undefined,
    agenda: f.agenda,
    audience: f.audience
      .split('\n')
      .map((a) => a.trim())
      .filter(Boolean),
    url: f.url.trim() || undefined,
    cover: f.cover.trim() || undefined,
    published: f.published,
  }
}

const form = reactive<Form>(blank())
const saved = ref<AdminEvent | null>(null)
const loadState = ref<'loading' | 'ready' | 'missing' | 'error'>(isNew ? 'ready' : 'loading')
const saving = ref(false)
const deleting = ref(false)
const uploading = ref(false)
const fieldErrors = ref<Record<string, string>>({})
// Set by the redirect after creating an event (router state, gone on reload).
const status = ref<{ kind: 'ok' | 'error'; text: string } | null>(
  typeof history.state?.flash === 'string' ? { kind: 'ok', text: history.state.flash } : null,
)

// The description exactly as the event page will show it.
const showPreview = ref(false)
const previewHtml = computed(() => safeHtml(asHtml(form.description)))

const snapshot = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== snapshot.value)
let leaving = false

function apply(e: AdminEvent) {
  saved.value = e
  Object.assign(form, fromEvent(e))
  snapshot.value = JSON.stringify(form)
}

async function load() {
  loadState.value = 'loading'
  try {
    apply((await adminApi.event(props.slug!)).item)
    loadState.value = 'ready'
  } catch (e) {
    console.error(e)
    loadState.value = e instanceof AdminError && e.status === 404 ? 'missing' : 'error'
  }
}
if (!isNew) load()

const LABELS: Record<string, string> = {
  'f-slug': '網址代稱',
  'f-title': '活動名稱',
  'f-type': '活動類型',
  'f-summary': '一句話摘要',
  'f-startsAt': '開始時間',
  'f-endsAt': '結束時間',
  'f-schedule': '時間說明',
  'f-deadlineLabel': '截止標籤',
  'f-deadlineAt': '截止時間',
  'f-city': '城市',
  'f-venue': '場地',
  'f-fee': '費用',
  'f-description': '活動說明',
  'f-audience': '適合對象',
  'f-url': '活動頁面網址',
  'f-cover': '封面圖片',
}

/** The input for a field path the Worker rejected, e.g. deadline.date or agenda.2.item. */
function fieldId(field: string) {
  const [head, i, sub] = field.split('.')
  if (head === 'deadline') return i === 'label' ? 'f-deadlineLabel' : 'f-deadlineAt'
  if (head === 'agenda' && sub) return `f-agenda-${i}-${sub}`
  return `f-${head}`
}

const aria = (id: string) => ({
  'aria-invalid': fieldErrors.value[id] ? ('true' as const) : undefined,
  'aria-describedby': `${id}-msg`,
})

function showError(e: unknown) {
  console.error(e)
  if (e instanceof AdminError && e.field) {
    const id = fieldId(e.field)
    const label = LABELS[id] ?? (id.startsWith('f-agenda-') ? `活動流程第 ${Number(id.split('-')[2]) + 1} 項` : '')
    fieldErrors.value = { [id]: e.message }
    status.value = { kind: 'error', text: label ? `${label}：${e.message}` : e.message }
    nextTick(() => document.getElementById(id)?.focus())
    return
  }
  const code = e instanceof AdminError ? e.status : 0
  status.value = {
    kind: 'error',
    text:
      code === 401
        ? '登入已過期，請重新整理頁面後再登入一次。'
        : code === 403
          ? '此帳號已沒有管理權限。'
          : code === 404
            ? '此活動已被刪除。'
            : '儲存失敗，可能是網路連線不穩定，請稍後再試。',
  }
}

async function save() {
  // Rows left completely empty are dropped instead of rejected.
  form.agenda = form.agenda.filter((a) => a.time.trim() || a.item.trim())
  fieldErrors.value = {}
  status.value = null
  saving.value = true
  try {
    if (isNew) {
      const { item } = await adminApi.create(toInput(form))
      leaving = true
      await router.replace({
        name: 'admin-event',
        params: { slug: item.slug },
        state: { flash: item.published ? '已建立並發布。' : '已建立草稿。' },
      })
      return
    }
    apply((await adminApi.update(toInput(form))).item)
    status.value = { kind: 'ok', text: `已儲存（${time(new Date().toISOString())}）` }
  } catch (e) {
    showError(e)
  } finally {
    saving.value = false
  }
}

async function remove() {
  const title = saved.value?.title ?? form.title
  if (!confirm(`確定要刪除「${title}」嗎？刪除後無法復原。`)) return
  status.value = null
  deleting.value = true
  try {
    await adminApi.remove(props.slug!)
    leaving = true
    await router.replace({ name: 'admin', state: { flash: `已刪除「${title}」。` } })
  } catch (e) {
    showError(e)
  } finally {
    deleting.value = false
  }
}

async function pickCover(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploading.value = true
  fieldErrors.value = {}
  try {
    form.cover = (await adminApi.uploadCover(await toCoverImage(file))).url
  } catch (err) {
    console.error(err)
    fieldErrors.value = {
      'f-cover': err instanceof AdminError && err.field ? err.message : '無法讀取或上傳這張圖片，請換一張試試。',
    }
  } finally {
    uploading.value = false
  }
}

async function addAgendaRow() {
  form.agenda.push({ time: '', item: '' })
  await nextTick()
  document.getElementById(`f-agenda-${form.agenda.length - 1}-time`)?.focus()
}

onBeforeRouteLeave(() => {
  if (!leaving && dirty.value && !confirm('有尚未儲存的變更，確定要離開嗎？')) return false
})
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <RouterLink :to="{ name: 'admin' }" class="admin-back"><ArrowLeft :size="18" aria-hidden="true" />返回活動管理</RouterLink>

  <StateBlock v-if="loadState === 'loading'" kind="loading" message="正在載入活動…" />
  <StateBlock v-else-if="loadState === 'missing'" kind="missing" message="此活動可能已被刪除。">
    <RouterLink :to="{ name: 'admin' }" class="sticker-btn sticker-btn--paper">返回活動管理</RouterLink>
  </StateBlock>
  <StateBlock v-else-if="loadState === 'error'" kind="error" @retry="load" />

  <form v-else class="editor" @submit.prevent="save" @input="fieldErrors = {}">
    <header class="editor__head">
      <p class="editor__kicker hand">{{ isNew ? '新增活動' : '編輯活動' }}</p>
      <h1 class="editor__title">{{ isNew ? '新的活動' : saved?.title }}</h1>
    </header>

    <div class="editor__grid">
      <div class="editor__sheet">
        <section class="part" aria-labelledby="part-basic">
          <h2 id="part-basic" class="part__title">基本資訊</h2>
          <FormField id="f-title" label="活動名稱" :error="fieldErrors['f-title']">
            <input id="f-title" v-model="form.title" class="input" required maxlength="120" v-bind="aria('f-title')" />
          </FormField>
          <FormField
            id="f-slug"
            label="網址代稱"
            :hint="isNew ? '小寫英文、數字與連字號，例如 taipei-game-jam-2026。建立後無法修改。' : '建立後無法修改。'"
            :error="fieldErrors['f-slug']"
          >
            <div class="slug">
              <span class="slug__prefix" aria-hidden="true">/events/</span>
              <input
                id="f-slug"
                v-model.trim="form.slug"
                class="input"
                required
                maxlength="80"
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                autocomplete="off"
                spellcheck="false"
                :readonly="!isNew"
                v-bind="aria('f-slug')"
              />
            </div>
          </FormField>
          <fieldset class="field fieldset">
            <legend class="field__label">活動類型</legend>
            <div class="pills">
              <label v-for="(t, i) in TYPES" :key="t" class="pill">
                <input :id="i === 0 ? 'f-type' : undefined" v-model="form.type" type="radio" name="type" :value="t" />
                <span>{{ EVENT_TYPE_LABEL[t] }}</span>
              </label>
            </div>
          </fieldset>
          <FormField id="f-summary" label="一句話摘要" hint="顯示在活動頁的標題下方。" :error="fieldErrors['f-summary']">
            <textarea
              id="f-summary"
              v-model="form.summary"
              class="input input--short"
              rows="2"
              required
              maxlength="300"
              v-bind="aria('f-summary')"
            ></textarea>
          </FormField>
          <div class="field">
            <p id="cover-label" class="field__label">封面圖片<span class="field__opt">選填</span></p>
            <div class="cover">
              <img v-if="form.cover" :src="form.cover" alt="目前的封面" class="cover__img" />
              <p v-else class="cover__empty">還沒有封面</p>
              <div class="cover__actions">
                <label class="outline-btn cover__pick" :class="{ 'is-busy': uploading }">
                  <ImagePlus aria-hidden="true" />{{ uploading ? '上傳中…' : form.cover ? '更換圖片' : '上傳圖片' }}
                  <input
                    type="file"
                    accept="image/*"
                    class="visually-hidden"
                    aria-describedby="f-cover-msg"
                    :disabled="uploading"
                    @change="pickCover"
                  />
                </label>
                <button v-if="form.cover" type="button" class="outline-btn" :disabled="uploading" @click="form.cover = ''">
                  移除封面
                </button>
              </div>
            </div>
            <p id="f-cover-msg" class="field__msg" :class="{ 'is-error': fieldErrors['f-cover'] }" role="status">
              {{ fieldErrors['f-cover'] || '建議用 16:9 的橫式圖片。上傳前會自動縮小並轉成 WebP，也會移除相片的拍攝資訊。' }}
            </p>
            <details class="cover__url">
              <summary>改用其他網站的圖片網址</summary>
              <input
                id="f-cover"
                v-model.trim="form.cover"
                class="input"
                maxlength="500"
                placeholder="https://"
                aria-label="封面圖片網址"
                :aria-invalid="fieldErrors['f-cover'] ? 'true' : undefined"
              />
            </details>
          </div>
        </section>

        <section class="part" aria-labelledby="part-time">
          <h2 id="part-time" class="part__title">時間</h2>
          <label class="check"><input v-model="form.ongoing" type="checkbox" />長期活動（沒有結束日，會一直顯示在活動資訊頁）</label>
          <template v-if="form.ongoing">
            <FormField id="f-schedule" label="時間說明" hint="例如：每週五 20:00、隨時可報名。" :error="fieldErrors['f-schedule']">
              <input
                id="f-schedule"
                v-model="form.schedule"
                class="input"
                required
                maxlength="60"
                placeholder="每週五 20:00"
                v-bind="aria('f-schedule')"
              />
            </FormField>
            <FormField id="f-startsAt" label="開始日期" optional hint="從哪天開始舉辦，可以留空。" :error="fieldErrors['f-startsAt']">
              <input id="f-startsAt" v-model="form.startsAt" type="datetime-local" class="input part__narrow" v-bind="aria('f-startsAt')" />
            </FormField>
          </template>
          <template v-else>
            <div class="part__row">
              <FormField id="f-startsAt" label="開始" :error="fieldErrors['f-startsAt']">
                <input id="f-startsAt" v-model="form.startsAt" type="datetime-local" class="input" required v-bind="aria('f-startsAt')" />
              </FormField>
              <FormField id="f-endsAt" label="結束" optional :error="fieldErrors['f-endsAt']">
                <input
                  id="f-endsAt"
                  v-model="form.endsAt"
                  type="datetime-local"
                  class="input"
                  :min="form.startsAt || undefined"
                  v-bind="aria('f-endsAt')"
                />
              </FormField>
            </div>
            <label class="check"><input v-model="form.hasDeadline" type="checkbox" />有報名或徵件截止日</label>
            <div v-if="form.hasDeadline" class="part__row">
              <FormField id="f-deadlineLabel" label="截止標籤" hint="例如：報名截止、徵件截止。" :error="fieldErrors['f-deadlineLabel']">
                <input id="f-deadlineLabel" v-model="form.deadlineLabel" class="input" required maxlength="20" v-bind="aria('f-deadlineLabel')" />
              </FormField>
              <FormField id="f-deadlineAt" label="截止時間" :error="fieldErrors['f-deadlineAt']">
                <input id="f-deadlineAt" v-model="form.deadlineAt" type="datetime-local" class="input" required v-bind="aria('f-deadlineAt')" />
              </FormField>
            </div>
          </template>
        </section>

        <section class="part" aria-labelledby="part-place">
          <h2 id="part-place" class="part__title">地點與費用</h2>
          <div class="part__row">
            <FormField id="f-city" label="城市" hint="線上活動可以填「線上」。" :error="fieldErrors['f-city']">
              <input id="f-city" v-model="form.city" class="input" required maxlength="40" v-bind="aria('f-city')" />
            </FormField>
            <FormField id="f-venue" label="場地" :error="fieldErrors['f-venue']">
              <input
                id="f-venue"
                v-model="form.venue"
                class="input"
                required
                maxlength="120"
                placeholder="例如：Discord 語音頻道"
                v-bind="aria('f-venue')"
              />
            </FormField>
          </div>
          <label class="check"><input v-model="form.online" type="checkbox" />線上活動</label>
          <FormField id="f-fee" label="費用" :error="fieldErrors['f-fee']">
            <input
              id="f-fee"
              v-model="form.fee"
              class="input part__narrow"
              required
              maxlength="60"
              placeholder="例如：免費、NT$ 300"
              v-bind="aria('f-fee')"
            />
          </FormField>
        </section>

        <section class="part" aria-labelledby="part-body">
          <h2 id="part-body" class="part__title">活動內容</h2>
          <FormField
            id="f-description"
            label="活動說明"
            optional
            hint="可以寫 HTML，例如 <p>、<h3>、<strong>、<a href>、<ul><li>、<img>，也可以貼上 YouTube 影片或 Discord 伺服器小工具的嵌入碼（iframe）。純文字則以空行分段。script、style、表單與其他網站的 iframe 會被移除。"
            :error="fieldErrors['f-description']"
          >
            <textarea
              id="f-description"
              v-model="form.description"
              class="input input--code"
              rows="10"
              spellcheck="false"
              placeholder="<p>活動介紹…</p>"
              v-bind="aria('f-description')"
            ></textarea>
          </FormField>
          <div class="preview">
            <button
              type="button"
              class="outline-btn preview__toggle"
              :aria-expanded="showPreview"
              aria-controls="description-preview"
              @click="showPreview = !showPreview"
            >
              <component :is="showPreview ? EyeOff : Eye" aria-hidden="true" />{{ showPreview ? '收起預覽' : '預覽活動說明' }}
            </button>
            <div v-if="showPreview" id="description-preview" class="preview__box">
              <div v-if="previewHtml" class="prose" v-html="previewHtml"></div>
              <p v-else class="preview__empty">還沒有內容。</p>
            </div>
          </div>

          <div class="field">
            <p id="agenda-label" class="field__label">活動流程<span class="field__opt">選填</span></p>
            <ol v-if="form.agenda.length" class="agenda" aria-labelledby="agenda-label">
              <li v-for="(row, i) in form.agenda" :key="i" class="agenda__row">
                <input
                  :id="`f-agenda-${i}-time`"
                  v-model="row.time"
                  class="input"
                  maxlength="40"
                  placeholder="20:00"
                  :aria-label="`第 ${i + 1} 項的時間`"
                  :aria-invalid="fieldErrors[`f-agenda-${i}-time`] ? 'true' : undefined"
                />
                <input
                  :id="`f-agenda-${i}-item`"
                  v-model="row.item"
                  class="input"
                  maxlength="200"
                  placeholder="開場、介紹今晚的遊戲"
                  :aria-label="`第 ${i + 1} 項的內容`"
                  :aria-invalid="fieldErrors[`f-agenda-${i}-item`] ? 'true' : undefined"
                />
                <button type="button" class="icon-btn" :aria-label="`移除第 ${i + 1} 項`" @click="form.agenda.splice(i, 1)">
                  <X :size="20" aria-hidden="true" />
                </button>
              </li>
            </ol>
            <button type="button" class="outline-btn agenda__add" @click="addAgendaRow"><Plus aria-hidden="true" />新增一項</button>
          </div>

          <FormField id="f-audience" label="適合對象" optional hint="一行一個，例如：學生。" :error="fieldErrors['f-audience']">
            <textarea id="f-audience" v-model="form.audience" class="input input--short" rows="3" v-bind="aria('f-audience')"></textarea>
          </FormField>
          <FormField
            id="f-url"
            label="活動頁面網址"
            optional
            hint="主辦單位的報名或介紹頁面，會在活動頁顯示為「前往活動頁面」按鈕。"
            :error="fieldErrors['f-url']"
          >
            <input
              id="f-url"
              v-model="form.url"
              type="url"
              class="input"
              maxlength="500"
              placeholder="https://"
              v-bind="aria('f-url')"
            />
          </FormField>
        </section>
      </div>

      <aside class="editor__side">
        <div class="panel">
          <span class="tape tape-bit panel__tape" aria-hidden="true"></span>
          <p class="panel__label">發布</p>
          <label class="check"><input v-model="form.published" type="checkbox" />發布到活動資訊頁</label>
          <p class="panel__hint">
            {{ form.published ? '儲存後所有人都看得到。公開頁面最多約 30 秒後更新。' : '儲存為草稿，只有管理員看得到。' }}
          </p>
          <button type="submit" class="sticker-btn sticker-btn--ink panel__save" :disabled="saving || deleting">
            {{ saving ? '儲存中…' : isNew ? '建立活動' : '儲存變更' }}
          </button>
          <p class="panel__status" :class="status && `is-${status.kind}`" role="status">{{ status?.text }}</p>
          <p v-if="!isNew && dirty" class="panel__dirty">有尚未儲存的變更</p>
          <RouterLink
            v-if="saved?.published"
            :to="{ name: 'event', params: { slug: saved.slug } }"
            target="_blank"
            class="text-link panel__view"
          >
            查看公開頁面<ExternalLink :size="16" aria-hidden="true" /><span class="visually-hidden">（在新分頁開啟）</span>
          </RouterLink>
        </div>
        <button v-if="!isNew" type="button" class="outline-btn panel__delete" :disabled="saving || deleting" @click="remove">
          <Trash2 aria-hidden="true" />{{ deleting ? '刪除中…' : '刪除活動' }}
        </button>
      </aside>
    </div>
  </form>
</template>

<style scoped>
.editor__head {
  margin-top: 20px;
}
.editor__kicker {
  font-size: 1.25rem;
}
.editor__title {
  margin-top: 4px;
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(2rem, 4.5vw, 3.25rem);
  letter-spacing: -0.03em;
  overflow-wrap: anywhere;
}
.editor__grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 32px clamp(24px, 4vw, 48px);
  align-items: start;
  margin-top: clamp(24px, 4vh, 40px);
}
.editor__sheet {
  padding: clamp(24px, 4vw, 48px);
  background: var(--card);
  box-shadow: var(--shadow-paper);
}
.part {
  display: grid;
  gap: 20px;
}
.part + .part {
  margin-top: 40px;
  padding-top: 32px;
  border-top: 3px solid var(--ink);
}
.part__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.375rem;
}
.part__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.part__narrow {
  max-width: 20rem;
}
.fieldset {
  margin: 0;
  padding: 0;
  border: 0;
}
.fieldset legend {
  padding: 0;
  margin-bottom: 6px;
}
.input--short {
  min-height: 0;
}
.slug {
  display: flex;
  align-items: center;
  gap: 8px;
}
.slug__prefix {
  flex: none;
  font-weight: 700;
  color: var(--ink-3);
}
.cover {
  display: grid;
  grid-template-columns: minmax(0, 240px) minmax(0, 1fr);
  gap: 16px 20px;
  align-items: center;
}
.cover__img,
.cover__empty {
  width: 100%;
  aspect-ratio: 16 / 9;
  border-radius: 6px;
}
.cover__img {
  object-fit: cover;
  box-shadow: var(--shadow-paper);
}
.cover__empty {
  display: grid;
  place-items: center;
  border: 2px dashed var(--rule);
  font-size: 0.875rem;
  color: var(--ink-3);
}
.cover__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.cover__pick:focus-within {
  outline: 3px solid var(--dot);
  outline-offset: 3px;
}
.cover__pick.is-busy {
  cursor: progress;
  opacity: 0.6;
}
.cover__url summary {
  width: fit-content;
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--ink-2);
  cursor: pointer;
}
.cover__url .input {
  margin-top: 8px;
}
.input--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, var(--font-body);
  font-size: 0.9375rem;
}
.preview {
  display: grid;
  gap: 12px;
  margin-top: -8px;
}
.preview__toggle {
  justify-self: start;
}
.preview__box {
  padding: 20px 24px;
  border: 2px dashed var(--rule);
  border-radius: 10px;
}
.preview__empty {
  color: var(--ink-3);
}
.agenda {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.agenda__row {
  display: grid;
  grid-template-columns: 8.5rem minmax(0, 1fr) 44px;
  gap: 8px;
  align-items: center;
}
.agenda__add {
  justify-self: start;
}
.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 999px;
  background: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.icon-btn:hover {
  background: var(--wall);
}

.editor__side {
  position: sticky;
  top: 100px;
  display: grid;
  gap: 16px;
}
.panel {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 28px 24px 24px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
}
.panel__tape {
  top: -11px;
  left: 50%;
  translate: -50% 0;
  rotate: -3deg;
}
.panel__label {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: 1.25rem;
}
.panel__hint {
  font-size: 0.875rem;
  color: var(--ink-2);
}
.panel__save {
  justify-content: center;
  margin-top: 4px;
}
.panel__save:disabled {
  opacity: 0.6;
  cursor: progress;
  transform: none;
}
.panel__status:empty {
  display: none;
}
.panel__status {
  font-weight: 700;
  font-size: 0.9375rem;
}
.panel__status.is-ok::before,
.panel__status.is-error::before {
  content: '';
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 8px;
  border-radius: 50%;
  background: var(--ink);
  vertical-align: 0.05em;
}
.panel__status.is-error::before {
  background: var(--dot);
}
.panel__dirty {
  font-size: 0.875rem;
  color: var(--ink-3);
}
.panel__view {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  justify-self: start;
}
.panel__delete {
  justify-self: start;
}
.panel__delete:disabled {
  opacity: 0.6;
  cursor: progress;
}

@media (max-width: 900px) {
  .editor__grid {
    grid-template-columns: 1fr;
  }
  .editor__side {
    position: static;
  }
}
@media (max-width: 600px) {
  .part__row,
  .cover {
    grid-template-columns: 1fr;
  }
  .agenda__row {
    grid-template-columns: 5.5rem minmax(0, 1fr) 44px;
  }
  .editor__sheet {
    margin-inline: -4px;
  }
}
</style>
