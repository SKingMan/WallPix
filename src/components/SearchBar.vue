<template>
  <div class="relative w-full sm:max-w-xs">
    <span
      class="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
        />
      </svg>
    </span>
    <input
      :value="modelValue"
      type="search"
      :placeholder="placeholder"
      class="w-full rounded-full bg-slate-800/60 py-2 pl-9 pr-9 text-sm text-slate-100 placeholder:text-slate-500 ring-1 ring-white/5 focus:outline-none focus:ring-2 focus:ring-brand-500"
      @input="$emit('update:modelValue', $event.target.value)"
      @keyup.enter="$emit('search', modelValue)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200"
      @click="$emit('update:modelValue', '')"
      aria-label="清空"
    >
      <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </button>
  </div>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '搜索标题或分类…' },
})

defineEmits(['update:modelValue', 'search'])
</script>
