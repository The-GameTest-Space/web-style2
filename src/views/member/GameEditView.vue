<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ExternalLink, ImagePlus, Plus, X } from 'lucide-vue-next'
import { myApi } from '@/api/my'
import { ApiError } from '@/api/signed'
import type { OwnGame } from '@/api/types'
import { askConfirm } from '@/composables/useConfirm'
import { useMember } from '@/composables/useMember'
import { gameStatusLabel, time } from '@/utils/format'
import { toCoverImage } from '@/utils/image'
import { t } from '@/i18n'
import FormField from '@/components/FormField.vue'
import MemberGate from '@/components/MemberGate.vue'
import StateBlock from '@/components/StateBlock.vue'
import {
  PLATFORMS,
  STATUSES,
  blankGame,
  blankNote,
  fieldId,
  fromGame,
  labelOf,
  reason,
  slugify,
  toInput,
} from './gameForm'
import '@/styles/forms.css'

// No slug: a new game (/games/new). After it is created the page moves to
// its own address (/games/:slug/edit), keeping what was typed.
const props = defineProps<{ slug?: string }>()
const router = useRouter()
const isNew = computed(() => !props.slug)
const { status: memberStatus } = useMember()

const form = reactive(blankGame())
const saved = ref<OwnGame | null>(null)
const loadState = ref<'loading' | 'ready' | 'missing' | 'error'>(props.slug ? 'loading' : 'ready')
const saving = ref(false)
const uploading = ref(false)
const fieldErrors = ref<Record<string, string>>({})
// Set by the redirect after creating a game (router state, gone on reload).
const status = ref<{ kind: 'ok' | 'error'; text: string } | null>(
  typeof history.state?.flash === 'string' ? { kind: 'ok', text: history.state.flash } : null,
)

const snapshot = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== snapshot.value)
let leaving = false

function apply(g: OwnGame) {
  saved.value = g
  Object.assign(form, fromGame(g))
  snapshot.value = JSON.stringify(form)
}

async function load() {
  loadState.value = 'loading'
  try {
    apply((await myApi.game(props.slug!)).item)
    loadState.value = 'ready'
  } catch (e) {
    console.error(e)
    loadState.value = e instanceof ApiError && e.status === 404 ? 'missing' : 'error'
  }
}
// Once the gate lets the visitor in, and again if the page moves to another game.
watch(
  [memberStatus, () => props.slug],
  ([s, slug]) => {
    if (s === 'member' && slug && slug !== saved.value?.slug) load()
  },
  { immediate: true },
)

// The URL name follows the English title until someone types their own.
const slugTouched = ref(false)
watch(
  () => form.titleEn,
  (title) => {
    if (isNew.value && !slugTouched.value) form.slug = slugify(title)
  },
)

// Editing a field clears the errors shown: a text field on input, a checkbox
// or radio on change. A checkbox can't use input: re-rendering between its
// input and change events (as a real click allows) makes v-model on an array
// reset `checked` and undo the click. A text field can't use change: it fires
// on blur, as focus moves to the field an error names.
function clearErrors(e: Event) {
  const toggle = ['checkbox', 'radio'].includes((e.target as HTMLInputElement).type)
  if ((e.type === 'change') !== toggle) return
  if (Object.keys(fieldErrors.value).length) fieldErrors.value = {}
}

const aria = (id: string) => ({
  'aria-invalid': fieldErrors.value[id] ? ('true' as const) : undefined,
  'aria-describedby': `${id}-msg`,
})

function showError(e: unknown) {
  console.error(e)
  if (e instanceof ApiError && e.field) {
    const id = fieldId(e.field)
    const message = reason(e)
    const label = labelOf(id)
    fieldErrors.value = { [id]: message }
    status.value = { kind: 'error', text: label ? t('form.errorAt', { field: label, message }) : message }
    nextTick(() => document.getElementById(id)?.focus())
    return
  }
  const code = e instanceof ApiError ? e.status : 0
  status.value = {
    kind: 'error',
    text:
      e instanceof ApiError && e.code === 'too_many_games'
        ? t('gameForm.errorTooMany', { n: e.params.max ?? 0 })
        : code === 401
          ? t('gameForm.errorExpired')
          : code === 403
            ? t('gameForm.errorNotMember')
            : code === 404
              ? t('gameForm.missing')
              : code === 503
                ? t('member.unavailable')
                : t('gameForm.errorSave'),
  }
}

async function save() {
  // Updates left completely empty are dropped instead of rejected.
  form.buildLog = form.buildLog.filter((n) => n.version.trim() || n.note.trim())
  if (!form.buildLog.length) form.buildLog.push(blankNote())
  fieldErrors.value = {}
  status.value = null
  saving.value = true
  try {
    if (isNew.value) {
      const { item } = await myApi.create(toInput(form))
      apply(item)
      leaving = true
      const flash = t('gameForm.created')
      await router.replace({ name: 'game-edit', params: { slug: item.slug }, state: { flash } })
      leaving = false
      status.value = { kind: 'ok', text: flash }
      return
    }
    apply((await myApi.update(toInput(form))).item)
    status.value = { kind: 'ok', text: t('gameForm.saved', { time: time(new Date().toISOString()) }) }
  } catch (e) {
    showError(e)
  } finally {
    saving.value = false
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
    form.cover = (await myApi.uploadCover(await toCoverImage(file))).url
  } catch (err) {
    console.error(err)
    fieldErrors.value = { 'f-cover': err instanceof ApiError && err.field ? reason(err) : t('form.error.imageRead') }
  } finally {
    uploading.value = false
  }
}

// Newest first: a new update goes on top.
async function addNote() {
  form.buildLog.unshift(blankNote())
  await nextTick()
  document.getElementById('f-log-0-version')?.focus()
}

// On the router rather than the route (onBeforeRouteLeave): after an upload
// this page moves to the game's own address and stays the same page, and a
// route guard would stay behind on /games/new.
const stopGuard = router.beforeEach(async (to, from) => {
  if (to.path === from.path || leaving || !dirty.value) return
  const ok = await askConfirm({
    title: t('form.leave.title'),
    message: t('form.leave.text'),
    confirmLabel: t('form.leave.confirm'),
    cancelLabel: t('form.leave.stay'),
  })
  if (!ok) return false
})
onBeforeUnmount(stopGuard)
function onBeforeUnload(e: BeforeUnloadEvent) {
  if (dirty.value) e.preventDefault()
}
onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))
</script>

<template>
  <div class="member shell">
    <RouterLink :to="{ name: 'my-games' }" class="admin-back"><ArrowLeft :size="18" aria-hidden="true" />{{ t('gameForm.back') }}</RouterLink>

    <MemberGate>
      <StateBlock v-if="loadState === 'loading'" kind="loading" :message="t('gameForm.loading')" />
      <StateBlock v-else-if="loadState === 'missing'" kind="missing" :message="t('gameForm.missing')">
        <RouterLink :to="{ name: 'my-games' }" class="sticker-btn sticker-btn--paper">{{ t('gameForm.back') }}</RouterLink>
      </StateBlock>
      <StateBlock v-else-if="loadState === 'error'" kind="error" @retry="load" />

      <form v-else class="editor" @submit.prevent="save" @input="clearErrors" @change="clearErrors">
        <header class="editor__head">
          <p class="editor__kicker hand">{{ isNew ? t('gameForm.newKicker') : t('gameForm.editKicker') }}</p>
          <h1 class="editor__title" lang="zh-Hant-TW">{{ isNew ? t('gameForm.newTitle') : saved?.title }}</h1>
          <p v-if="saved?.hidden" class="editor__hidden" role="note">{{ t('gameForm.hidden') }}</p>
        </header>

        <div class="editor__grid">
          <div class="editor__sheet">
            <section class="part" aria-labelledby="part-basic">
              <h2 id="part-basic" class="part__title">{{ t('gameForm.basic') }}</h2>
              <div class="part__row">
                <FormField id="f-title" :label="t('gameForm.title')" :error="fieldErrors['f-title']">
                  <input id="f-title" v-model="form.title" class="input" required maxlength="60" v-bind="aria('f-title')" />
                </FormField>
                <FormField id="f-titleEn" :label="t('gameForm.titleEn')" optional :error="fieldErrors['f-titleEn']">
                  <input id="f-titleEn" v-model="form.titleEn" class="input" lang="en" maxlength="80" v-bind="aria('f-titleEn')" />
                </FormField>
              </div>
              <FormField
                id="f-slug"
                :label="t('gameForm.slug')"
                :hint="isNew ? t('gameForm.slugHint') : t('gameForm.slugLocked')"
                :error="fieldErrors['f-slug']"
              >
                <div class="slug">
                  <span class="slug__prefix" aria-hidden="true">/games/</span>
                  <input
                    id="f-slug"
                    v-model.trim="form.slug"
                    class="input"
                    required
                    maxlength="60"
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    autocomplete="off"
                    autocapitalize="off"
                    spellcheck="false"
                    :readonly="!isNew"
                    v-bind="aria('f-slug')"
                    @input="slugTouched = true"
                  />
                </div>
              </FormField>
              <div class="part__row">
                <FormField id="f-studio" :label="t('gameForm.studio')" :error="fieldErrors['f-studio']">
                  <input id="f-studio" v-model="form.studio" class="input" required maxlength="60" v-bind="aria('f-studio')" />
                </FormField>
                <FormField id="f-team" :label="t('gameForm.team')" optional :hint="t('gameForm.teamHint')" :error="fieldErrors['f-team']">
                  <input id="f-team" v-model="form.team" class="input" maxlength="30" v-bind="aria('f-team')" />
                </FormField>
              </div>
              <fieldset class="field fieldset">
                <legend class="field__label">{{ t('gameForm.status') }}</legend>
                <div class="pills">
                  <label v-for="(s, i) in STATUSES" :key="s" class="pill">
                    <input :id="i === 0 ? 'f-status' : undefined" v-model="form.status" type="radio" name="status" :value="s" />
                    <span>{{ gameStatusLabel(s) }}</span>
                  </label>
                </div>
              </fieldset>
              <FormField id="f-genres" :label="t('gameForm.genres')" :hint="t('gameForm.genresHint')" :error="fieldErrors['f-genres']">
                <input id="f-genres" v-model="form.genres" class="input" required maxlength="100" v-bind="aria('f-genres')" />
              </FormField>
              <fieldset class="field fieldset" aria-describedby="f-platforms-msg">
                <legend class="field__label">{{ t('gameForm.platforms') }}</legend>
                <div class="pills">
                  <label v-for="(p, i) in PLATFORMS" :key="p" class="pill">
                    <input :id="i === 0 ? 'f-platforms' : undefined" v-model="form.platforms" type="checkbox" :value="p" />
                    <span>{{ p }}</span>
                  </label>
                </div>
                <p v-if="fieldErrors['f-platforms']" id="f-platforms-msg" class="field__msg is-error">{{ fieldErrors['f-platforms'] }}</p>
              </fieldset>

              <div class="field">
                <p id="cover-label" class="field__label">{{ t('gameForm.cover') }}</p>
                <div class="cover">
                  <img v-if="form.cover" :src="form.cover" :alt="t('gameForm.coverCurrent')" class="cover__img" />
                  <p v-else class="cover__empty">{{ t('gameForm.coverNone') }}</p>
                  <div class="cover__actions">
                    <label class="outline-btn cover__pick" :class="{ 'is-busy': uploading }">
                      <ImagePlus aria-hidden="true" />{{
                        uploading ? t('gameForm.coverUploading') : form.cover ? t('gameForm.coverReplace') : t('gameForm.coverUpload')
                      }}
                      <input
                        type="file"
                        accept="image/*"
                        class="visually-hidden"
                        aria-describedby="f-cover-msg"
                        :disabled="uploading"
                        @change="pickCover"
                      />
                    </label>
                  </div>
                </div>
                <p id="f-cover-msg" class="field__msg" :class="{ 'is-error': fieldErrors['f-cover'] }" role="status">
                  {{ fieldErrors['f-cover'] || t('gameForm.coverHint') }}
                </p>
                <details class="cover__url" :open="!!fieldErrors['f-cover'] && !form.cover.startsWith('/api/')">
                  <summary>{{ t('gameForm.coverUrl') }}</summary>
                  <input
                    id="f-cover"
                    v-model.trim="form.cover"
                    class="input"
                    maxlength="500"
                    placeholder="https://"
                    :aria-label="t('gameForm.coverUrlLabel')"
                    :aria-invalid="fieldErrors['f-cover'] ? 'true' : undefined"
                    aria-describedby="f-cover-msg"
                  />
                </details>
              </div>
            </section>

            <section class="part" aria-labelledby="part-about">
              <h2 id="part-about" class="part__title">{{ t('gameForm.about') }}</h2>
              <FormField id="f-pitch" :label="t('gameForm.pitch')" :hint="t('gameForm.pitchHint')" :error="fieldErrors['f-pitch']">
                <textarea
                  id="f-pitch"
                  v-model="form.pitch"
                  class="input input--short"
                  rows="2"
                  required
                  maxlength="120"
                  v-bind="aria('f-pitch')"
                ></textarea>
              </FormField>
              <FormField
                id="f-description"
                :label="t('gameForm.description')"
                :hint="t('gameForm.descriptionHint')"
                :error="fieldErrors['f-description']"
              >
                <textarea id="f-description" v-model="form.description" class="input" rows="8" required v-bind="aria('f-description')"></textarea>
              </FormField>
              <FormField id="f-feedback" :label="t('gameForm.feedback')" :hint="t('gameForm.feedbackHint')" :error="fieldErrors['f-feedback']">
                <textarea
                  id="f-feedback"
                  v-model="form.feedbackWanted"
                  class="input input--short"
                  rows="4"
                  required
                  v-bind="aria('f-feedback')"
                ></textarea>
              </FormField>
              <FormField id="f-thread" :label="t('gameForm.thread')" optional :hint="t('gameForm.threadHint')" :error="fieldErrors['f-thread']">
                <input
                  id="f-thread"
                  v-model="form.thread"
                  type="url"
                  class="input"
                  maxlength="200"
                  placeholder="https://discord.com/channels/…"
                  v-bind="aria('f-thread')"
                />
              </FormField>
            </section>

            <section class="part" aria-labelledby="part-log">
              <h2 id="part-log" class="part__title">{{ t('gameForm.log') }}</h2>
              <p class="part__lede">{{ t('gameForm.logLede') }}</p>
              <button id="f-log-add" type="button" class="outline-btn log__add" aria-describedby="f-log-add-msg" @click="addNote">
                <Plus aria-hidden="true" />{{ t('gameForm.logAdd') }}
              </button>
              <p v-if="fieldErrors['f-log-add']" id="f-log-add-msg" class="field__msg is-error">{{ fieldErrors['f-log-add'] }}</p>
              <ol class="log">
                <li v-for="(n, i) in form.buildLog" :key="i" class="log__row">
                  <fieldset class="fieldset log__set">
                    <legend class="log__legend">{{ t('gameForm.logRow', { n: i + 1 }) }}</legend>
                    <FormField :id="`f-log-${i}-version`" :label="t('gameForm.version')" :error="fieldErrors[`f-log-${i}-version`]">
                      <input
                        :id="`f-log-${i}-version`"
                        v-model="n.version"
                        class="input num"
                        maxlength="24"
                        placeholder="v0.1.0"
                        v-bind="aria(`f-log-${i}-version`)"
                      />
                    </FormField>
                    <FormField :id="`f-log-${i}-date`" :label="t('gameForm.date')" :error="fieldErrors[`f-log-${i}-date`]">
                      <input :id="`f-log-${i}-date`" v-model="n.date" type="date" class="input" required v-bind="aria(`f-log-${i}-date`)" />
                    </FormField>
                    <FormField :id="`f-log-${i}-note`" :label="t('gameForm.note')" :error="fieldErrors[`f-log-${i}-note`]" class="log__note">
                      <textarea
                        :id="`f-log-${i}-note`"
                        v-model="n.note"
                        class="input input--short"
                        rows="2"
                        maxlength="300"
                        v-bind="aria(`f-log-${i}-note`)"
                      ></textarea>
                    </FormField>
                  </fieldset>
                  <button
                    v-if="form.buildLog.length > 1"
                    type="button"
                    class="icon-btn log__remove"
                    :aria-label="t('gameForm.logRemove', { n: i + 1 })"
                    @click="form.buildLog.splice(i, 1)"
                  >
                    <X :size="20" aria-hidden="true" />
                  </button>
                </li>
              </ol>
            </section>
          </div>

          <aside class="editor__side">
            <div class="panel">
              <span class="tape tape-bit panel__tape" aria-hidden="true"></span>
              <p class="panel__label">{{ isNew ? t('gameForm.newPanel') : t('gameForm.editPanel') }}</p>
              <p class="panel__hint">{{ isNew ? t('gameForm.newHint') : t('gameForm.editHint') }}</p>
              <button type="submit" class="sticker-btn sticker-btn--ink panel__save" :disabled="saving || uploading">
                {{ saving ? t('gameForm.saving') : isNew ? t('gameForm.create') : t('gameForm.save') }}
              </button>
              <p class="panel__status" :class="status && `is-${status.kind}`" role="status">{{ status?.text }}</p>
              <p v-if="!isNew && dirty" class="panel__dirty">{{ t('form.unsaved') }}</p>
              <RouterLink
                v-if="saved && !saved.hidden"
                :to="{ name: 'game', params: { slug: saved.slug } }"
                target="_blank"
                class="text-link panel__view"
              >
                {{ t('gameForm.view') }}<ExternalLink :size="16" aria-hidden="true" /><span class="visually-hidden">{{ t('common.newTab') }}</span>
              </RouterLink>
            </div>
          </aside>
        </div>
      </form>
    </MemberGate>
  </div>
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
.editor__hidden {
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: 40em;
  margin-top: 16px;
  padding: 12px 16px;
  border: 2px dashed var(--ink);
  border-radius: 10px;
  font-weight: 700;
}
.editor__hidden::before {
  content: '';
  flex: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dot);
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
.part__lede {
  margin-top: -8px;
  color: var(--ink-2);
}
.part__row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.fieldset {
  margin: 0;
  padding: 0;
  border: 0;
  min-width: 0;
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
  aspect-ratio: 4 / 3;
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

.log__add {
  justify-self: start;
}
.log {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.log__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 8px;
  align-items: start;
  padding: 16px;
  border: 2px dashed var(--rule);
  border-radius: 10px;
}
.log__set {
  display: grid;
  grid-template-columns: minmax(0, 10rem) minmax(0, 12rem);
  gap: 12px 16px;
}
.log__legend {
  grid-column: 1 / -1;
  font-weight: 900;
}
.log__note {
  grid-column: 1 / -1;
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
  .log__set {
    grid-template-columns: minmax(0, 1fr);
  }
  .log__row {
    padding: 12px;
  }
  .editor__sheet {
    margin-inline: -4px;
  }
}
</style>
