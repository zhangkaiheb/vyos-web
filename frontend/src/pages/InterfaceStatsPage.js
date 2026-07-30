import { defineComponent, ref, onMounted } from '/src/utils/vue-import.js';
import { opModeApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import DataTable from '/src/components/Table/DataTable.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';
import HelpButton from '/src/components/Layout/HelpButton.js';
import TabGroup from '/src/components/Layout/TabGroup.js';

function parseIpStats(output) {
  const interfaces = [];
  const blocks = output.split(/\n(?=\d+:)/);
  
  for (const block of blocks) {
    const headerMatch = block.match(/^\d+:\s+([^:@\s]+)(?:@[^:\s]+)?:/);
    if (!headerMatch) continue;
    const iface = headerMatch[1];
    
    const lines = block.split('\n');
    const stats = { interface: iface };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('RX:')) {
        const values = lines[i + 1]?.trim().split(/\s+/);
        if (values && values.length >= 6) {
          stats.rx_bytes = values[0];
          stats.rx_packets = values[1];
          stats.rx_errors = values[2];
          stats.rx_dropped = values[3];
          stats.rx_missed = values[4];
          stats.multicast = values[5];
        }
      } else if (line.startsWith('TX:')) {
        const values = lines[i + 1]?.trim().split(/\s+/);
        if (values && values.length >= 6) {
          stats.tx_bytes = values[0];
          stats.tx_packets = values[1];
          stats.tx_errors = values[2];
          stats.tx_dropped = values[3];
          stats.tx_carrier = values[4];
          stats.collisions = values[5];
        }
      }
    }
    
    interfaces.push(stats);
  }
  
  return interfaces;
}

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
        const res = await opModeApi.execute('ip -s link show');
        if (!res.success) {
          showError({ message: '获取接口统计失败: ' + (res.output || '') });
          physicalRows.value = [];
          virtualRows.value = [];
          return;
        }
        const allStats = parseIpStats(res.output || '');
        const physical = [];
        const virtual = [];
        for (const s of allStats) {
          if (s.interface === 'lo') continue;
          const isDot = s.interface.includes('.');
          if (!isDot) {
            const row = { interface: s.interface };
            ['rx_packets','tx_packets','rx_bytes','tx_bytes','rx_errors','tx_errors','rx_dropped','tx_dropped','multicast','collisions'].forEach(k => { row[k] = s[k] || '0'; });
            physical.push(row);
          } else {
            const row = { interface: s.interface };
            ['rx_packets','rx_bytes','rx_errors','rx_dropped','tx_packets','tx_bytes','tx_errors','tx_dropped','collisions'].forEach(k => { row[k] = s[k] || '0'; });
            row.rx_overruns = s.rx_missed || '0';
            row.tx_overruns = s.tx_carrier || '0';
            virtual.push(row);
          }
        }
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
