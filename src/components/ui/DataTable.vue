<script setup lang="ts">
// Reusable responsive data table with a sticky header and scrollable body.
//
// Props:
//   columns   – [{ key, label, width?, align?, render? }]  render: (row) => string|VNode
//   rows      – any[]
//   rowKey    – field used as :key (default 'id')
//   emptyText – shown when rows is empty
//
// Slots:
//   actions   – { row } → action buttons (Edit / Delete / ...)
//   cell(key) – optional per-column override: { row }
//
// The wrapper handles the fixed height: the header stays sticky and the
// body scrolls independently.
import type { VNode } from 'vue'

export interface TableColumn<T = unknown> {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  render?: (row: T) => string | number | VNode
}

withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: unknown[]
    rowKey?: string
    emptyText?: string
  }>(),
  {
    rowKey: 'id',
    emptyText: 'No data',
  },
)
</script>

<template>
  <div class="dt">
    <div class="dt__scroll">
      <table class="dt__table">
        <thead class="dt__head">
          <tr>
            <th
              v-for="col in columns"
              :key="col.key"
              :style="{ width: col.width, textAlign: col.align ?? 'left' }"
            >
              {{ col.label }}
            </th>
            <th v-if="$slots.actions" class="dt__actions-head" style="width: 9rem; text-align: right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="dt__body">
          <tr v-for="(row, i) in rows" :key="String((row as Record<string, unknown>)[rowKey] ?? i)">
            <td
              v-for="col in columns"
              :key="col.key"
              :style="{ textAlign: col.align ?? 'left' }"
            >
              <!-- Slot override wins -->
              <slot v-if="$slots[col.key]" :name="col.key" :row="row">
                {{ (row as Record<string, unknown>)[col.key] }}
              </slot>
              <template v-else-if="col.render">
                {{ col.render(row) }}
              </template>
              <template v-else>
                {{ (row as Record<string, unknown>)[col.key] }}
              </template>
            </td>
            <td v-if="$slots.actions" class="dt__actions" :style="{ textAlign: 'right' }">
              <slot name="actions" :row="row" />
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="!rows.length" class="dt__empty">
      <i class="fa-duotone fa-inbox" />
      {{ emptyText }}
    </div>
  </div>
</template>
