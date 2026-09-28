<script setup lang="ts">
import { t } from '@/i18n'

// A labelled form control. The message (error, else hint) has the id
// `${id}-msg`; point the control's aria-describedby at it.
defineProps<{ id: string; label: string; hint?: string; error?: string; optional?: boolean }>()
</script>

<template>
  <div class="field">
    <label :for="id" class="field__label">{{ label }}<span v-if="optional" class="field__opt">{{ t('form.optional') }}</span></label>
    <slot />
    <p v-if="error || hint" :id="`${id}-msg`" class="field__msg" :class="{ 'is-error': error }">{{ error || hint }}</p>
  </div>
</template>
