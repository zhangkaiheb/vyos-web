import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

function parseInterfaceNames(output) {
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  const names = [];
  const re = /^\d+:\s+([^:@\s]+)(?:@[^:\s]+)?:/;
  for (const line of lines) {
    const m = line.match(re);
    if (m && !names.includes(m[1])) names.push(m[1]);
  }
  return names;
}

function parseKeyValueStats(output) {
  const map = {};
  const lines = String(output || '').split('\n').map(s => s.replace(/\r$/, ''));
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value !== '') map[key] = value;
  }
  return map;
}

function parseIfconfig(output) {
  const text = String(output || '');
  const map = {};
  const rx = text.match(/RX\s+packets\s+(\d+)\s+bytes\s+(\d+)\s+\(.*?\)\s*\n\s+RX\s+errors\s+(\d+)\s+dropped\s+(\d+)\s+overruns\s+(\d+)\s+frame\s+(\d+)/i);
  const tx = text.match(/TX\s+packets\s+(\d+)\s+bytes\s+(\d+)\s+\(.*?\)\s*\n\s+TX\s+errors\s+(\d+)\s+dropped\s+(\d+)\s+overruns\s+(\d+)\s+carrier\s+(\d+)\s+collisions\s+(\d+)/i);
  if (rx) {
    map.rx_packets = rx[1];
    map.rx_bytes = rx[2];
    map.rx_errors = rx[3];
    map.rx_dropped = rx[4];
    map.rx_overruns = rx[5];
  }
  if (tx) {
    map.tx_packets = tx[1];
    map.tx_bytes = tx[2];
    map.tx_errors = tx[3];
    map.tx_dropped = tx[4];
    map.tx_overruns = tx[5];
    map.collisions = tx[7];
  }
  return map;
}

const PHYSICAL_KEYS = ['rx_packets', 'tx_packets', 'rx_bytes', 'tx_bytes', 'rx_errors', 'tx_errors', 'rx_dropped', 'tx_dropped', 'multicast', 'collisions'];
const VIRTUAL_KEYS = ['rx_packets', 'rx_bytes', 'rx_errors', 'rx_dropped', 'rx_overruns', 'tx_packets', 'tx_bytes', 'tx_errors', 'tx_dropped', 'tx_overruns', 'collisions'];

export default defineComponent({
  name: 'InterfaceStatsPage',
  setup() {
    const loading = ref(false);
    const activeTab = ref('physical');
    const physicalRows = ref([]);
    const virtualRows = ref([]);

    const tabs = [
      { key: 'physical', title: '物理接口' },
      { key: 'virtual', title: '非物理接口' },
    ];

    const physicalColumns = [
      { key: 'interface', title: '接口' },
      { key: 'rx_packets', title: 'RX 包' },
      { key: 'tx_packets', title: 'TX 包' },
      { key: 'rx_bytes', title: 'RX 字节' },
      { key: 'tx_bytes', title: 'TX 字节' },
      { key: 'rx_errors', title: 'RX 错误' },
      { key: 'tx_errors', title: 'TX 错误' },
      { key: 'rx_dropped', title: 'RX 丢弃' },
      { key: 'tx_dropped', title: 'TX 丢弃' },
      { key: 'multicast', title: '组播' },
      { key: 'collisions', title: '冲突' },
    ];

    const virtualColumns = [
      { key: 'interface', title: '接口' },
      { key: 'rx_packets', title: 'RX 包' },
      { key: 'rx_bytes', title: 'RX 字节' },
      { key: 'rx_errors', title: 'RX 错误' },
      { key: 'rx_dropped', title: 'RX 丢弃' },
      { key: 'rx_overruns', title: 'RX 溢出' },
      { key: 'tx_packets', title: 'TX 包' },
      { key: 'tx_bytes', title: 'TX 字节' },
      { key: 'tx_errors', title: 'TX 错误' },
      { key: 'tx_dropped', title: 'TX 丢弃' },
      { key: 'tx_overruns', title: 'TX 溢出' },
      { key: 'collisions', title: '冲突' },
    ];

    async function load() {
      loading.value = true;
      try {
        const linkRes = await opModeApi.execute('ip link show');
        const names = parseInterfaceNames(linkRes.output || '');

        const physical = [];
        const virtual = [];

        await Promise.all(names.map(async (iface) => {
          const isDot = iface.includes('.');
          if (!isDot) {
            try {
              const ethRes = await opModeApi.execute(`ethtool -S ${iface}`);
              if (ethRes.success) {
                const map = parseKeyValueStats(ethRes.output || '');
                const row = { interface: iface };
                PHYSICAL_KEYS.forEach(k => { row[k] = map[k] || ''; });
                physical.push(row);
                return;
              }
            } catch (e) {}
          }
          try {
            const ifcRes = await opModeApi.execute(`ifconfig ${iface}`);
            const map = parseIfconfig(ifcRes.output || '');
            const row = { interface: iface };
            VIRTUAL_KEYS.forEach(k => { row[k] = map[k] || ''; });
            virtual.push(row);
          } catch (e) {}
        }));

        physicalRows.value = physical.sort((a, b) => a.interface.localeCompare(b.interface));
        virtualRows.value = virtual.sort((a, b) => a.interface.localeCompare(b.interface));
      } catch (e) {
        showError(e);
        physicalRows.value = [];
        virtualRows.value = [];
      } finally {
        loading.value = false;
      }
    }

    onMounted(load);

    return {
      loading,
      activeTab,
      tabs,
      physicalRows,
      virtualRows,
      physicalColumns,
      virtualColumns,
      load,
    };
  },
  components: { DataTable, ToolbarButton, HelpButton, TabGroup },
  template: `
    <div class="page-container interface-stats-page">
      <div class="toolbar toolbar-compact">
        <div class="toolbar-left">
          <ToolbarButton icon="refresh" @click="load">刷新</ToolbarButton>
          <HelpButton routePath="/monitor/interface-traffic/interface-stats" />
        </div>
      </div>
      <TabGroup v-model="activeTab" :tabs="tabs">
        <template #physical>
          <DataTable
            :columns="physicalColumns"
            :data="physicalRows"
            :loading="loading"
            :selectable="false"
            :actions="[]"
            rowKey="interface"
          />
        </template>
        <template #virtual>
          <DataTable
            :columns="virtualColumns"
            :data="virtualRows"
            :loading="loading"
            :selectable="false"
            :actions="[]"
            rowKey="interface"
          />
        </template>
      </TabGroup>
    </div>
  `,
});
