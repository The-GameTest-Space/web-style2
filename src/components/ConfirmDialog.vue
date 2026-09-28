<script setup lang="ts">
import { ref, watch } from 'vue'
import { answerConfirm, confirmQuestion as q } from '@/composables/useConfirm'

// The one confirm dialog, asked through askConfirm(). A native modal <dialog>
// keeps focus inside it, shuts the page behind it off from clicks and screen
// readers, and closes on Escape.
const dialog = ref<HTMLDialogElement | null>(null)
let returnFocus: HTMLElement | null = null

watch(
  q,
  (question) => {
    const el = dialog.value
    if (!el) return
    if (question && !el.open) {
      returnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      el.showModal()
    } else if (!question && el.open) {
      el.close()
    }
  },
  { flush: 'post' },
)

// Every way out ends here: a button, Escape or the backdrop.
function onClose() {
  answerConfirm(false)
  // The button that asked may have left with the page it was on.
  if (returnFocus?.isConnected) returnFocus.focus()
  returnFocus = null
}

// The dialog box is the card's size, so a press on the dialog itself is on the
// backdrop. Both ends of the press: a drag out of the card doesn't count.
let downOnBackdrop = false
function onPointerDown(e: PointerEvent) {
  downOnBackdrop = e.target === dialog.value
}
function onClick(e: MouseEvent) {
  if (downOnBackdrop && e.target === dialog.value) answerConfirm(false)
}
</script>

<template>
  <dialog
    ref="dialog"
    class="confirm"
    role="alertdialog"
    aria-labelledby="confirm-title"
    :aria-describedby="q?.message ? 'confirm-text' : undefined"
    @close="onClose"
    @pointerdown="onPointerDown"
    @click="onClick"
  >
    <div v-if="q" class="confirm__card">
      <span class="tape tape-bit confirm__tape" aria-hidden="true"></span>
      <h2 id="confirm-title" class="confirm__title">{{ q.title }}</h2>
      <p v-if="q.message" id="confirm-text" class="confirm__text">{{ q.message }}</p>
      <div class="confirm__actions">
        <!-- Focused first: Enter keeps things as they are. -->
        <button type="button" class="sticker-btn sticker-btn--paper confirm__cancel" autofocus @click="answerConfirm(false)">
          {{ q.cancelLabel }}
        </button>
        <button type="button" class="sticker-btn sticker-btn--ink" @click="answerConfirm(true)">{{ q.confirmLabel }}</button>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
.confirm {
  width: min(100% - 32px, 460px);
  max-width: none;
  max-height: none;
  margin: auto;
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  /* The tape and the tilted card reach past the box. */
  overflow: visible;
}
.confirm[open] {
  animation: confirm-in 0.45s var(--ease-slap);
}
/* ::backdrop may not inherit the page's colours: spelled out. */
.confirm::backdrop {
  background: rgb(23 22 27 / 0.5);
}
.confirm[open]::backdrop {
  animation: confirm-fade 0.2s ease-out;
}

/* A sheet taped over the page. */
.confirm__card {
  position: relative;
  display: grid;
  gap: 12px;
  padding: 36px 28px 24px;
  background: var(--card);
  box-shadow: var(--shadow-lift);
  rotate: -1deg;
}
.confirm__tape {
  top: -11px;
  left: 50%;
  translate: -50% 0;
  rotate: 3deg;
}
.confirm__title {
  font-family: var(--font-body);
  font-weight: 900;
  font-size: clamp(1.375rem, 3.5vw, 1.625rem);
  line-height: 1.35;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}
.confirm__text {
  color: var(--ink-2);
}
.confirm__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}
.confirm__actions > * {
  justify-content: center;
}
.confirm__cancel {
  border: 2px solid var(--ink);
}
@media (max-width: 480px) {
  .confirm__card {
    padding-inline: 20px;
  }
  .confirm__actions > * {
    flex: 1 1 auto;
  }
}

@keyframes confirm-in {
  from {
    opacity: 0;
    transform: translateY(-16px) rotate(-3deg) scale(1.03);
  }
}
@keyframes confirm-fade {
  from {
    opacity: 0;
  }
}
</style>

<style>
/* The page stays put behind an open dialog. */
html:has(dialog.confirm[open]) {
  overflow: hidden;
  scrollbar-gutter: stable;
}
</style>
