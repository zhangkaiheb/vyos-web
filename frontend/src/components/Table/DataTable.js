import { defineComponent, ref, computed, watch, inject } from '/src/utils/vue-import.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

const ACTION_LABEL_KEYS = {
  create: 'app.create',
  edit: 'app.edit',
  delete: 'app.delete',
  move: 'app.move',
  moveUp: 'app.moveUp',
  moveDown: 'app.moveDown',
  copy: 'app.copy',
  insert: 'app.insert',
  conflict: 'app.conflict',
  validity: 'app.validity',
  batch: 'app.batch',
  search: 'app.search',
  refresh: 'app.refresh',
  columnSetting: 'app.columnSetting',
  filter: 'app.filter',
};

const NEEDS_SELECTION = ['edit', 'delete', 'move', 'moveUp', 'moveDown', 'copy'];

export default defineComponent({
  name: 'DataTable',
  props: {
    columns: { type: Array, required: true },
    data: { type: Array, required: true },
    selectable: { type: Boolean, default: true },
    pageSize: { type: Number, default: 20 },
    loading: { type: Boolean, default: false },
    rowKey: { type: String, default: 'id' },
    actions: { type: Array, default: () => ['create', 'edit', 'delete', 'moveUp', 'moveDown', 'copy', 'refresh'] },
    disabled: { type: Boolean, default: false },
    tableKey: { type: String, default: '' },
    filterFields: { type: Array, default: null },
    externalToolbar: { type: Boolean, default: false },
  },
  emits: ['create', 'edit', 'delete', 'move', 'move-up', 'move-down', 'copy', 'refresh', 'selection-change', 'row-click', 'filter-change'],
  setup(props, { emit, expose }) {
    const { t } = inject('i18n');
    const currentPage = ref(1);
    const selectedKeys = ref(new Set());
    const quickFilter = ref('');
    const sortKey = ref('');
    const sortOrder = ref('asc');
    const visibleColumns = ref(props.columns.map(c => c.key));

    const columnSettingOpen = ref(false);
    const availableColumns = ref([]);
    const selectedColumns = ref([]);
    const selectedAvailable = ref(null);
    const selectedSelected = ref(null);

    const filterOpen = ref(false);
    const filterFieldsLocal = computed(() => props.filterFields || props.columns);
    const selectedFilterField = ref(null);
    const filterEntries = ref([]);
    const filterForm = ref({ enabled: true, section: 'contains', not: false, text: '', caseSensitive: false });

    const storageKey = computed(() => `vyos_columns_${props.tableKey || 'default'}`);

    function loadColumnSettings() {
      if (!props.tableKey || !props.columns.length) return;
      try {
        const saved = JSON.parse(localStorage.getItem(storageKey.value));
        if (Array.isArray(saved) && saved.length) {
          const valid = saved.filter(k => props.columns.some(c => c.key === k));
          if (valid.length) visibleColumns.value = valid;
        }
      } catch (e) {}
    }

    function saveColumnSettings() {
      if (!props.tableKey) return;
      localStorage.setItem(storageKey.value, JSON.stringify(visibleColumns.value));
    }

    watch(() => props.columns, (cols) => {
      visibleColumns.value = cols.map(c => c.key);
      loadColumnSettings();
    }, { immediate: true });

    watch(quickFilter, () => { currentPage.value = 1; });

    const filteredByEntries = computed(() => {
      let rows = [...props.data];
      if (quickFilter.value) {
        const q = quickFilter.value.toLowerCase();
        rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
      }
      for (const entry of filterEntries.value) {
        if (!entry.enabled || !entry.text) continue;
        const { field, section, not: invert, text, caseSensitive } = entry;
        rows = rows.filter(r => {
          const val = String(r[field] ?? '');
          const source = caseSensitive ? val : val.toLowerCase();
          const target = caseSensitive ? text : text.toLowerCase();
          let match = false;
          if (section === 'equals') match = source === target;
          else if (section === 'notEqual') match = source !== target;
          else if (section === 'contains') match = source.includes(target);
          else if (section === 'notContains') match = !source.includes(target);
          else if (section === 'startsWith') match = source.startsWith(target);
          else if (section === 'endsWith') match = source.endsWith(target);
          return invert ? !match : match;
        });
      }
      return rows;
    });

    const filteredData = computed(() => {
      let rows = [...filteredByEntries.value];
      if (sortKey.value) {
        rows.sort((a, b) => {
          const av = a[sortKey.value], bv = b[sortKey.value];
          if (av === bv) return 0;
          if (av === undefined || av === null) return 1;
          if (bv === undefined || bv === null) return -1;
          if (av < bv) return sortOrder.value === 'asc' ? -1 : 1;
          if (av > bv) return sortOrder.value === 'asc' ? 1 : -1;
          return 0;
        });
      }
      return rows;
    });

    const totalPages = computed(() => Math.max(1, Math.ceil(filteredData.value.length / props.pageSize)));

    const pagedData = computed(() => {
      const start = (currentPage.value - 1) * props.pageSize;
      return filteredData.value.slice(start, start + props.pageSize);
    });

    const selectedRows = computed(() => props.data.filter(r => selectedKeys.value.has(r[props.rowKey])));

    const pageRange = computed(() => {
      const pages = [];
      const max = totalPages.value;
      const cur = currentPage.value;
      const delta = 2;
      const left = Math.max(1, cur - delta);
      const right = Math.min(max, cur + delta);
      if (left > 1) pages.push(1);
      if (left > 2) pages.push('...');
      for (let i = left; i <= right; i++) pages.push(i);
      if (right < max - 1) pages.push('...');
      if (right < max) pages.push(max);
      return pages;
    });

    function toggleSort(key) {
      if (sortKey.value === key) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
      } else {
        sortKey.value = key;
        sortOrder.value = 'asc';
      }
    }

    function toggleSelect(key) {
      if (selectedKeys.value.has(key)) selectedKeys.value.delete(key);
      else selectedKeys.value.add(key);
      selectedKeys.value = new Set(selectedKeys.value);
      emit('selection-change', Array.from(selectedKeys.value));
    }

    function toggleSelectAll() {
      const pageKeys = pagedData.value.map(r => r[props.rowKey]);
      const allSelected = pageKeys.every(k => selectedKeys.value.has(k));
      if (allSelected) pageKeys.forEach(k => selectedKeys.value.delete(k));
      else pageKeys.forEach(k => selectedKeys.value.add(k));
      selectedKeys.value = new Set(selectedKeys.value);
      emit('selection-change', Array.from(selectedKeys.value));
    }

    function isSelected(row) {
      return selectedKeys.value.has(row[props.rowKey]);
    }

    function allPageSelected() {
      if (!pagedData.value.length) return false;
      return pagedData.value.every(r => selectedKeys.value.has(r[props.rowKey]));
    }

    function actionDisabled(a) {
      if (props.disabled) return true;
      if (!NEEDS_SELECTION.includes(a)) return false;
      if (selectedKeys.value.size === 0) return true;
      if (a === 'edit' && selectedKeys.value.size > 1) return true;
      return false;
    }

    function handleAction(a) {
      if (a === 'refresh') { emit('refresh'); return; }
      if (a === 'moveUp') { emit('move-up', selectedRows.value); return; }
      if (a === 'moveDown') { emit('move-down', selectedRows.value); return; }
      if (a === 'move') { emit('move', selectedRows.value); return; }
      if (a === 'copy') { emit('copy', selectedRows.value); return; }
      if (a === 'delete') { emit('delete', Array.from(selectedKeys.value)); return; }
      if (a === 'edit') { emit('edit', selectedRows.value[0]); return; }
      emit(a);
    }

    function openColumnSetting() {
      selectedColumns.value = visibleColumns.value.map(k => props.columns.find(c => c.key === k)).filter(Boolean);
      availableColumns.value = props.columns.filter(c => !visibleColumns.value.includes(c.key));
      selectedAvailable.value = null;
      selectedSelected.value = null;
      columnSettingOpen.value = true;
    }

    function confirmColumnSetting() {
      visibleColumns.value = selectedColumns.value.map(c => c.key);
      saveColumnSettings();
      columnSettingOpen.value = false;
    }

    function cancelColumnSetting() {
      columnSettingOpen.value = false;
    }

    function addColumn() {
      if (!selectedAvailable.value) return;
      const idx = availableColumns.value.findIndex(c => c.key === selectedAvailable.value);
      if (idx === -1) return;
      const col = availableColumns.value.splice(idx, 1)[0];
      selectedColumns.value.push(col);
      selectedAvailable.value = null;
    }

    function removeColumn() {
      if (!selectedSelected.value) return;
      const idx = selectedColumns.value.findIndex(c => c.key === selectedSelected.value);
      if (idx === -1) return;
      const col = selectedColumns.value.splice(idx, 1)[0];
      availableColumns.value.push(col);
      selectedSelected.value = null;
    }

    function moveSelectedColumn(dir) {
      if (!selectedSelected.value) return;
      const idx = selectedColumns.value.findIndex(c => c.key === selectedSelected.value);
      if (idx === -1) return;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= selectedColumns.value.length) return;
      const item = selectedColumns.value.splice(idx, 1)[0];
      selectedColumns.value.splice(newIdx, 0, item);
    }

    function openFilter() {
      selectedFilterField.value = filterFieldsLocal.value[0]?.key || null;
      filterOpen.value = true;
    }

    function addFilterEntry() {
      if (!selectedFilterField.value || !filterForm.value.text) return;
      filterEntries.value.push({
        field: selectedFilterField.value,
        enabled: filterForm.value.enabled,
        section: filterForm.value.section,
        not: filterForm.value.not,
        text: filterForm.value.text,
        caseSensitive: filterForm.value.caseSensitive,
      });
      filterForm.value.text = '';
    }

    function removeFilterEntry(index) {
      filterEntries.value.splice(index, 1);
    }

    function clearFilters() {
      filterEntries.value = [];
    }

    function confirmFilter() {
      currentPage.value = 1;
      filterOpen.value = false;
      emit('filter-change', filterEntries.value);
    }

    function cancelFilter() {
      filterOpen.value = false;
    }

    function fieldTitle(key) {
      const col = props.columns.find(c => c.key === key);
      return col?.title || key;
    }

    expose({
      setQuickFilter: (value) => { quickFilter.value = value; currentPage.value = 1; },
      openFilter,
      openColumnSetting,
      clearFilters,
    });

    return {
      ACTION_LABEL_KEYS,
      currentPage, selectedKeys, quickFilter, sortKey, sortOrder, visibleColumns,
      filteredData, totalPages, pagedData, pageRange,
      toggleSort, toggleSelect, toggleSelectAll, isSelected, allPageSelected,
      actionDisabled, handleAction,
      columnSettingOpen, availableColumns, selectedColumns, selectedAvailable, selectedSelected,
      openColumnSetting, confirmColumnSetting, cancelColumnSetting, addColumn, removeColumn, moveSelectedColumn,
      filterOpen, filterFieldsLocal, selectedFilterField, filterEntries, filterForm,
      openFilter, addFilterEntry, removeFilterEntry, clearFilters, confirmFilter, cancelFilter, fieldTitle, t,
    };
  },
  template: `
    <div class="data-table-page">
      <div class="toolbar toolbar-split" v-if="!externalToolbar">
        <div class="toolbar-left">
          <ToolbarButton v-for="a in actions" :key="a" :icon="a" @click="handleAction(a)" :disabled="actionDisabled(a)">
            {{ t(ACTION_LABEL_KEYS[a] || 'app.' + a) }}
          </ToolbarButton>
          <slot name="toolbar-left-extra"></slot>
        </div>
        <div class="toolbar-right">
          <slot name="toolbar-right-extra"></slot>
          <input v-model="quickFilter" :placeholder="t('app.search') + '...'" />
          <ToolbarButton icon="filter" @click="openFilter">{{ t('app.filter') }}</ToolbarButton>
          <ToolbarButton icon="columnSetting" @click="openColumnSetting">{{ t('app.columnSetting') }}</ToolbarButton>
        </div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th v-if="selectable" style="width:40px;">
                <input type="checkbox" :checked="allPageSelected()" @change="toggleSelectAll" />
              </th>
              <th v-for="col in columns.filter(c => visibleColumns.includes(c.key))" :key="col.key"
                  @click="toggleSort(col.key)" style="cursor:pointer;" :style="col.width ? { width: col.width } : {}">
                {{ t(col.title) }}
                <span v-if="sortKey === col.key">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pagedData" :key="row[rowKey]" :class="{ selected: isSelected(row) }"
                @click="$emit('row-click', row)">
              <td v-if="selectable" @click="toggleSelect(row[rowKey])">
                <input type="checkbox" :checked="isSelected(row)" @change="toggleSelect(row[rowKey])" @click.stop />
              </td>
              <td v-for="col in columns.filter(c => visibleColumns.includes(c.key))" :key="col.key">
                <slot :name="col.key" :row="row" :value="row[col.key]">
                  {{ col.render ? col.render(row[col.key], row) : row[col.key] }}
                </slot>
              </td>
            </tr>
            <tr v-if="!pagedData.length">
              <td :colspan="columns.filter(c => visibleColumns.includes(c.key)).length + (selectable ? 1 : 0)" class="text-center">
                {{ t('table.noData') }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="pagination">
        <button @click="currentPage = 1" :disabled="currentPage === 1">{{ t('table.firstPage') }}</button>
        <button @click="currentPage--" :disabled="currentPage === 1">{{ t('table.prevPage') }}</button>
        <template v-for="p in pageRange" :key="p">
          <span v-if="p === '...'" style="padding:0 6px;">...</span>
          <button v-else @click="currentPage = p" :class="{ active: p === currentPage }">{{ p }}</button>
        </template>
        <button @click="currentPage++" :disabled="currentPage === totalPages">{{ t('table.nextPage') }}</button>
        <button @click="currentPage = totalPages" :disabled="currentPage === totalPages">{{ t('table.lastPage') }}</button>
        <span style="margin-left:12px;">{{ t('table.total', { total: filteredData.length }) }} / {{ t('table.page', { page: currentPage, pages: totalPages }) }}</span>
      </div>

      <DraggableModal v-model:visible="columnSettingOpen" :title="t('app.columnSetting')" width="640px" @confirm="confirmColumnSetting" @close="cancelColumnSetting">
        <div class="dialog-panes">
          <div class="pane">
            <div class="pane-title">{{ t('table.availableColumns') }}</div>
            <div class="pane-list">
              <div v-for="col in availableColumns" :key="col.key" class="pane-item"
                   :class="{ selected: selectedAvailable === col.key }"
                   @click="selectedAvailable = col.key" @dblclick="addColumn">
                {{ col.title }}
              </div>
            </div>
          </div>
          <div class="pane-actions">
            <button @click="addColumn" :disabled="!selectedAvailable">▶</button>
            <button @click="removeColumn" :disabled="!selectedSelected">◀</button>
            <button @click="moveSelectedColumn(-1)" :disabled="!selectedSelected">▲</button>
            <button @click="moveSelectedColumn(1)" :disabled="!selectedSelected">▼</button>
          </div>
          <div class="pane">
            <div class="pane-title">{{ t('table.selectedColumns') }}</div>
            <div class="pane-list">
              <div v-for="col in selectedColumns" :key="col.key" class="pane-item"
                   :class="{ selected: selectedSelected === col.key }"
                   @click="selectedSelected = col.key" @dblclick="removeColumn">
                {{ col.title }}
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <ToolbarButton icon="cancel" @click="cancelColumnSetting">{{ t('app.cancel') }}</ToolbarButton>
          <ToolbarButton icon="confirm" primary @click="confirmColumnSetting">{{ t('app.confirm') }}</ToolbarButton>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="filterOpen" :title="t('app.filter')" width="640px" @confirm="confirmFilter" @close="cancelFilter">
        <div class="dialog-panes">
          <div class="pane">
            <div class="pane-title">{{ t('filter.fieldList') }}</div>
            <div class="pane-list">
              <div v-for="f in filterFieldsLocal" :key="f.key" class="pane-item"
                   :class="{ selected: selectedFilterField === f.key }"
                   @click="selectedFilterField = f.key">
                {{ f.title || f.key }}
              </div>
            </div>
          </div>
          <div class="pane" style="flex:2;">
            <div class="pane-title">{{ t('filter.conditionConfig') }}</div>
            <div class="pane-list" style="padding:12px;">
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">{{ t('filter.enable') }}</label>
                <input type="checkbox" v-model="filterForm.enabled" />
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">{{ t('filter.matchMode') }}</label>
                <select v-model="filterForm.section" style="flex:1;">
                  <option value="equals">{{ t('filter.equals') }}</option>
                  <option value="notEqual">{{ t('filter.notEqual') }}</option>
                  <option value="contains">{{ t('filter.contains') }}</option>
                  <option value="notContains">{{ t('filter.notContains') }}</option>
                  <option value="startsWith">{{ t('filter.startsWith') }}</option>
                  <option value="endsWith">{{ t('filter.endsWith') }}</option>
                </select>
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">{{ t('filter.negate') }}</label>
                <input type="checkbox" v-model="filterForm.not" />
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">{{ t('filter.text') }}</label>
                <input v-model="filterForm.text" style="flex:1;" :placeholder="t('filter.inputMatchText')" />
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">{{ t('filter.caseSensitive') }}</label>
                <input type="checkbox" v-model="filterForm.caseSensitive" />
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                <ToolbarButton icon="create" @click="addFilterEntry">{{ t('filter.addCondition') }}</ToolbarButton>
              </div>
              <div style="margin-top:12px;border-top:1px solid #ddd;padding-top:8px;">
                <div v-for="(entry, i) in filterEntries" :key="i" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span :style="{ opacity: entry.enabled ? 1 : 0.5 }">{{ fieldTitle(entry.field) }} {{ entry.not ? t('filter.not') : '' }}{{ t('filter.' + entry.section) }} "{{ entry.text }}"</span>
                  <ToolbarButton icon="delete" @click="removeFilterEntry(i)">{{ t('app.delete') }}</ToolbarButton>
                </div>
                <div v-if="!filterEntries.length" style="color:#999;font-size:12px;">{{ t('filter.noConditions') }}</div>
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <ToolbarButton icon="clear" @click="clearFilters">{{ t('filter.clearAll') }}</ToolbarButton>
          <ToolbarButton icon="cancel" @click="cancelFilter">{{ t('app.cancel') }}</ToolbarButton>
          <ToolbarButton icon="confirm" primary @click="confirmFilter">{{ t('app.confirm') }}</ToolbarButton>
        </template>
      </DraggableModal>
    </div>
  `,
  components: { DraggableModal, ToolbarButton },
});
