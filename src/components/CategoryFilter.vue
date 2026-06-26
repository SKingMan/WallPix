<template>
  <div class="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
    <button
      v-for="item in items"
      :key="item"
      type="button"
      class="shrink-0 rounded-full px-4 py-1.5 text-sm transition ring-1"
      :class="
        modelValue === item
          ? 'bg-brand-600 text-white ring-brand-500'
          : 'bg-slate-800/60 text-slate-300 ring-white/5 hover:bg-slate-800'
      "
      @click="$emit('update:modelValue', item)"
    >
      {{ labelOf(item) }}
    </button>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: 'all' },
  categories: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue'])

// 'all' 渲染为「全部」，其余原样
function labelOf(value) {
  if (value === 'all') return '全部'
  return value
}
</script>
