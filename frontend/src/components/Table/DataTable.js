import { defineComponent, ref, computed, watch } from '/src/utils/vue-import.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

const ACTION_LABELS = {
  create: '创建',
  edit: '编辑',
  delete: '删除',
  move: '移动',
  moveUp: '上移',
  moveDown: '下移',
  copy: '复制',
  insert: '插入',
  conflict: '冲突检查',
  validity: '有效性',
  batch: '批处理',
  search: '搜索',
  refresh: '刷新',
  columnSetting: '列设定',
  filter: '边界过滤',
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
  },
  emits: ['create', 'edit', 'delete', 'move', 'move-up', 'move-down', 'copy', 'refresh', 'selection-change', 'row-click', 'filter-change'],
  setup(props, { emit }) {
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
      if (NEEDS_SELECTION.includes(a)) return selectedKeys.value.size === 0;
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

    return {
      ACTION_LABELS,
      currentPage, selectedKeys, quickFilter, sortKey, sortOrder, visibleColumns,
      filteredData, totalPages, pagedData, pageRange,
      toggleSort, toggleSelect, toggleSelectAll, isSelected, allPageSelected,
      actionDisabled, handleAction,
      columnSettingOpen, availableColumns, selectedColumns, selectedAvailable, selectedSelected,
      openColumnSetting, confirmColumnSetting, cancelColumnSetting, addColumn, removeColumn, moveSelectedColumn,
      filterOpen, filterFieldsLocal, selectedFilterField, filterEntries, filterForm,
      openFilter, addFilterEntry, removeFilterEntry, clearFilters, confirmFilter, cancelFilter, fieldTitle,
    };
  },
  template: `
    <div>
      <div class="toolbar">
        <div class="toolbar-left">
          <button v-for="a in actions" :key="a" @click="handleAction(a)"
                  :class="{ danger: a === 'delete' }" :disabled="actionDisabled(a)">
            {{ a === 'moveUp' ? '上移' : a === 'moveDown' ? '下移' : (ACTION_LABELS[a] || a) }}
          </button>
        </div>
        <div class="toolbar-right">
          <input v-model="quickFilter" placeholder="搜索..." />
          <button @click="openFilter">边界过滤</button>
          <button @click="openColumnSetting">列设定</button>
        </div>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th v-if="selectable" style="width:40px;">
              <input type="checkbox" :checked="allPageSelected()" @change="toggleSelectAll" />
            </th>
            <th v-for="col in columns.filter(c => visibleColumns.includes(c.key))" :key="col.key"
                @click="toggleSort(col.key)" style="cursor:pointer;">
              {{ col.title }}
              <span v-if="sortKey === col.key">{{ sortOrder === 'asc' ? '▲' : '▼' }}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in pagedData" :key="row[rowKey]" :class="{ selected: isSelected(row) }"
              @click="$emit('row-click', row)">
            <td v-if="selectable" @click.stop>
              <input type="checkbox" :checked="isSelected(row)" @change="toggleSelect(row[rowKey])" />
            </td>
            <td v-for="col in columns.filter(c => visibleColumns.includes(c.key))" :key="col.key">
              <slot :name="col.key" :row="row" :value="row[col.key]">
                {{ row[col.key] }}
              </slot>
            </td>
          </tr>
          <tr v-if="!pagedData.length">
            <td :colspan="columns.filter(c => visibleColumns.includes(c.key)).length + (selectable ? 1 : 0)" class="text-center">
              暂无数据
            </td>
          </tr>
        </tbody>
      </table>
      <div class="pagination">
        <button @click="currentPage = 1" :disabled="currentPage === 1">首页</button>
        <button @click="currentPage--" :disabled="currentPage === 1">上一页</button>
        <template v-for="p in pageRange" :key="p">
          <span v-if="p === '...'" style="padding:0 6px;">...</span>
          <button v-else @click="currentPage = p" :class="{ active: p === currentPage }">{{ p }}</button>
        </template>
        <button @click="currentPage++" :disabled="currentPage === totalPages">下一页</button>
        <button @click="currentPage = totalPages" :disabled="currentPage === totalPages">末页</button>
        <span style="margin-left:12px;">共 {{ filteredData.length }} 条 / {{ totalPages }} 页</span>
      </div>

      <DraggableModal v-model:visible="columnSettingOpen" title="列设定" width="640px" @confirm="confirmColumnSetting" @close="cancelColumnSetting">
        <div class="dialog-panes">
          <div class="pane">
            <div class="pane-title">可用字段</div>
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
            <div class="pane-title">已选字段</div>
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
          <button @click="cancelColumnSetting">取消</button>
          <button class="primary" @click="confirmColumnSetting">确定</button>
        </template>
      </DraggableModal>

      <DraggableModal v-model:visible="filterOpen" title="边界过滤器" width="640px" @confirm="confirmFilter" @close="cancelFilter">
        <div class="dialog-panes">
          <div class="pane">
            <div class="pane-title">字段列表</div>
            <div class="pane-list">
              <div v-for="f in filterFieldsLocal" :key="f.key" class="pane-item"
                   :class="{ selected: selectedFilterField === f.key }"
                   @click="selectedFilterField = f.key">
                {{ f.title || f.key }}
              </div>
            </div>
          </div>
          <div class="pane" style="flex:2;">
            <div class="pane-title">条件配置</div>
            <div class="pane-list" style="padding:12px;">
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">启用</label>
                <input type="checkbox" v-model="filterForm.enabled" />
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">匹配方式</label>
                <select v-model="filterForm.section" style="flex:1;">
                  <option value="equals">等于</option>
                  <option value="notEqual">不等于</option>
                  <option value="contains">包含</option>
                  <option value="notContains">不包含</option>
                  <option value="startsWith">开头是</option>
                  <option value="endsWith">结尾是</option>
                </select>
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">取反</label>
                <input type="checkbox" v-model="filterForm.not" />
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">文本</label>
                <input v-model="filterForm.text" style="flex:1;" placeholder="输入匹配文本" />
              </div>
              <div class="form-row" style="margin-bottom:8px;">
                <label class="form-label" style="width:80px;">区分大小写</label>
                <input type="checkbox" v-model="filterForm.caseSensitive" />
              </div>
              <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                <button @click="addFilterEntry">添加条件</button>
              </div>
              <div style="margin-top:12px;border-top:1px solid #ddd;padding-top:8px;">
                <div v-for="(entry, i) in filterEntries" :key="i" style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                  <span :style="{ opacity: entry.enabled ? 1 : 0.5 }">{{ fieldTitle(entry.field) }} {{ entry.not ? '不' : '' }}{{ entry.section }} "{{ entry.text }}"</span>
                  <button @click="removeFilterEntry(i)" class="danger" style="padding:2px 6px;">删除</button>
                </div>
                <div v-if="!filterEntries.length" style="color:#999;font-size:12px;">暂无过滤条件</div>
              </div>
            </div>
          </div>
        </div>
        <template #footer>
          <button @click="clearFilters">清除所有</button>
          <button @click="cancelFilter">取消</button>
          <button class="primary" @click="confirmFilter">确定</button>
        </template>
      </DraggableModal>
    </div>
  `,
  components: { DraggableModal },
});
