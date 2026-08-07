<script setup lang="ts">
// Reusable responsive data table with a sticky header and scrollable body.
//
// Props:
//   columns       – [{ key, label, width?, align?, sortable?, sortValue?, render? }]
//                   render:   (row) => string | number | VNode   (cell content)
//                   sortable:  true → header becomes a click-to-sort button
//                   sortValue: (row) => value used for sorting when the raw
//                              field isn't the right key (e.g. resolved names)
//   rows          – any[]
//   rowKey        – field used as :key (default 'id')
//   emptyText     – shown when rows is empty
//   defaultSortKey / defaultSortDir – optional initial sort state
//
// Sorting is internal: clicking a sortable header cycles asc → desc → asc.
// Emits `sort-change` ({ key, dir }) so a parent can sync if it needs to.
//
// Slots:
//   actions   – { row } → action buttons (Edit / Delete / ...)
//   cell(key) – optional per-column override: { row }
//
// The wrapper handles the fixed height: the header stays sticky and the
// body scrolls independently.
import { computed, ref } from 'vue'
import type { VNode } from 'vue'

export type SortDir = 'asc' | 'desc'

export interface TableColumn<T = unknown> {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  sortValue?: (row: T) => string | number | null | undefined
  render?: (row: T) => string | number | VNode
}

const props = withDefaults(
  defineProps<{
    columns: TableColumn[]
    rows: unknown[]
    rowKey?: string
    emptyText?: string
    defaultSortKey?: string
    defaultSortDir?: SortDir
  }>(),
  {
    rowKey: 'id',
    emptyText: 'No data',
    defaultSortKey: '',
    defaultSortDir: 'asc',
  },
)

const emit = defineEmits<{ 'sort-change': [payload: { key: string; dir: SortDir }] }>()

const sortKey = ref<string>(props.defaultSortKey)
const sortDir = ref<SortDir>(props.defaultSortDir)

function toggleSort(col: TableColumn) {
  if (!col.sortable) return
  if (sortKey.value === col.key) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortKey.value = col.key
    sortDir.value = 'asc'
  }
  emit('sort-change', { key: sortKey.value, dir: sortDir.value })
}

/** Extract the comparable value for a column on a row. */
function cellValue(row: unknown, col: TableColumn): unknown {
  if (col.sortValue) return col.sortValue(row as never)
  return (row as Record<string, unknown>)[col.key]
}

const sortedRows = computed<unknown[]>(() => {
  const rows = props.rows
  if (!sortKey.value) return rows
  const col = props.columns.find((c) => c.key === sortKey.value && c.sortable)
  if (!col) return rows

  const dir = sortDir.value === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = cellValue(a, col)
    const bv = cellValue(b, col)
    // Empty values always sink to the bottom regardless of direction.
    const aEmpty = av === null || av === undefined || av === ''
    const bEmpty = bv === null || bv === undefined || bv === ''
    if (aEmpty && bEmpty) return 0
    if (aEmpty) return 1
    if (bEmpty) return -1

    let cmp: number
    if (typeof av === 'number' && typeof bv === 'number') {
      cmp = av - bv
    } else if (typeof av === 'boolean' && typeof bv === 'boolean') {
      cmp = Number(av) - Number(bv)
    } else {
      cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' })
    }
    return cmp * dir
  })
})
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
              :aria-sort="
                col.sortable
                  ? sortKey === col.key
                    ? sortDir === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : 'none'
                  : undefined
              "
            >
              <button
                v-if="col.sortable"
                type="button"
                class="dt__sort"
                :style="{
                  justifyContent:
                    col.align === 'center' ? 'center' : col.align === 'right' ? 'flex-end' : 'flex-start',
                }"
                @click="toggleSort(col)"
              >
                {{ col.label }}
                <i
                  v-if="sortKey === col.key"
                  :class="sortDir === 'asc' ? 'fa-duotone fa-sort-up' : 'fa-duotone fa-sort-down'"
                />
                <i v-else class="fa-duotone fa-sort" />
              </button>
              <template v-else>
                {{ col.label }}
              </template>
            </th>
            <th v-if="$slots.actions" class="dt__actions-head" style="width: 9rem; text-align: right">
              Actions
            </th>
          </tr>
        </thead>
        <tbody class="dt__body">
          <tr v-for="(row, i) in sortedRows" :key="String((row as Record<string, unknown>)[rowKey] ?? i)">
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
