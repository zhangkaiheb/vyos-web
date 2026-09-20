import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { showError } from '/src/components/Layout/ErrorDisplay.js';
import { useConfigStore } from '/src/stores/config.js';
import { useI18n } from '/src/i18n/index.js';
import TabGroup from '/src/components/Layout/TabGroup.js';
import DataTable from '/src/components/Table/DataTable.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';
import ToolbarButton from '/src/components/Button/ToolbarButton.js';

export default defineComponent({
  name: 'HaproxyPage',
  components: { TabGroup, DataTable, DraggableModal, ToolbarButton },
  template: `
    <div>
      <TabGroup v-model="activeTab" :tabs="[
        { key: 'global', title: t('haproxy.tabs.global') },
        { key: 'timeout', title: t('haproxy.tabs.timeout') },
        { key: 'backends', title: t('haproxy.tabs.backends') },
        { key: 'services', title: t('haproxy.tabs.services') },
      ]">
        <template #global>
          <div style="padding: 16px;">
            <div style="max-width: 600px;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.global.maxConnections.title')">{{ t('haproxy.global.maxConnections.label') }}</label>
                <input type="number" v-model.number="globalConfig['max-connections']" min="1" max="2000000" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.global.maxConnections.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.global.tlsVersionMin.title')">{{ t('haproxy.global.tlsVersionMin.label') }}</label>
                <select v-model="globalConfig['tls-version-min']" style="width: 200px;">
                  <option value="1.2">TLS 1.2</option>
                  <option value="1.3">TLS 1.3</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.global.tlsVersionMin.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.global.sslCiphers.title')">{{ t('haproxy.global.sslCiphers.label') }}</label>
                <textarea v-model="globalConfig['ssl-bind-ciphers']" rows="4" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.global.sslCiphers.placeholder')"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.global.sslCiphers.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.global.loggingFacility.title')">{{ t('haproxy.global.loggingFacility.label') }}</label>
                <select v-model="globalConfig['logging-facility']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option v-for="f in LOG_FACILITIES" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.global.loggingFacility.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.global.loggingLevel.title')">{{ t('haproxy.global.loggingLevel.label') }}</label>
                <select v-model="globalConfig['logging-level']" style="width: 200px;">
                  <option v-for="l in LOG_LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.global.loggingLevel.help') }}</div>
            </div>
          </div>
        </template>

        <template #timeout>
          <div style="padding: 16px;">
            <div style="max-width: 600px;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.timeout.client.title')">{{ t('haproxy.timeout.client.label') }}</label>
                <input type="number" v-model.number="timeoutConfig.client" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.timeout.client.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.timeout.connect.title')">{{ t('haproxy.timeout.connect.label') }}</label>
                <input type="number" v-model.number="timeoutConfig.connect" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.timeout.connect.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.timeout.server.title')">{{ t('haproxy.timeout.server.label') }}</label>
                <input type="number" v-model.number="timeoutConfig.server" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.timeout.server.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.timeout.check.title')">{{ t('haproxy.timeout.check.label') }}</label>
                <input type="number" v-model.number="timeoutConfig.check" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.timeout.check.help') }}</div>
            </div>
          </div>
        </template>

        <template #backends>
          <DataTable :columns="[
              { key: 'name', title: t('haproxy.columns.name'), width: 120 },
              { key: 'description', title: t('haproxy.columns.description'), width: 150 },
              { key: 'mode', title: t('haproxy.columns.mode'), width: 80 },
              { key: 'balance', title: t('haproxy.columns.balance'), width: 120 },
              { key: 'serverCount', title: t('haproxy.columns.serverCount'), width: 80 },
              { key: 'actions', title: t('haproxy.columns.actions'), width: 120 },
            ]" :data="backendList.map(b => ({
              name: b.name,
              description: b.description || '-',
              mode: b.mode || 'http',
              balance: b.balance || 'round-robin',
              serverCount: (b.servers || []).length,
              actions: b,
            }))"
            :actions="['create', 'edit', 'delete', 'refresh']"
            @create="openBackendModal(null)"
            @edit="openBackendModal($event)"
            @delete="deleteBackend($event)"
            @refresh="loadConfig">
              <template #actions="{ record }">
                <button class="btn btn-link" @click="openBackendModal(record.actions)">{{ t('haproxy.buttons.edit') }}</button>
                <button class="btn btn-link btn-danger" @click="deleteBackend(record.actions)">{{ t('haproxy.buttons.delete') }}</button>
              </template>
            </DataTable>

        </template>

        <template #services>
          <DataTable :columns="[
              { key: 'name', title: t('haproxy.columns.name'), width: 120 },
              { key: 'description', title: t('haproxy.columns.description'), width: 150 },
              { key: 'mode', title: t('haproxy.columns.mode'), width: 80 },
              { key: 'port', title: t('haproxy.columns.port'), width: 80 },
              { key: 'listenAddress', title: t('haproxy.columns.listenAddress'), width: 150 },
              { key: 'backend', title: t('haproxy.columns.backend'), width: 150 },
              { key: 'actions', title: t('haproxy.columns.actions'), width: 120 },
            ]" :data="serviceList.map(s => ({
              name: s.name,
              description: s.description || '-',
              mode: s.mode || 'http',
              port: s.port || '-',
              listenAddress: Object.keys(s['listen-address'] || {}).join(', ') || '-',
              backend: (s.backend || []).join(', '),
              actions: s,
            }))"
            :actions="['create', 'edit', 'delete', 'refresh']"
            @create="openServiceModal(null)"
            @edit="openServiceModal($event)"
            @delete="deleteService($event)"
            @refresh="loadConfig">
              <template #actions="{ record }">
                <button class="btn btn-link" @click="openServiceModal(record.actions)">{{ t('haproxy.buttons.edit') }}</button>
                <button class="btn btn-link btn-danger" @click="deleteService(record.actions)">{{ t('haproxy.buttons.delete') }}</button>
              </template>
            </DataTable>

        </template>

      </TabGroup>


      <!-- Backend server modal -->
      <DraggableModal v-model:visible="showBackendModal" :title="t('haproxy.modal.backend.title')" width="700px" @ok="saveBackend">
        <TabGroup v-model="activeBackendTab" :tabs="[
          { key: 'basic', title: t('haproxy.modal.backend.tabs.basic') },
          { key: 'servers', title: t('haproxy.modal.backend.tabs.servers') },
          { key: 'health', title: t('haproxy.modal.backend.tabs.health') },
          { key: 'rules', title: t('haproxy.modal.backend.tabs.rules') },
        ]">
          <template #basic>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.name.title')">{{ t('haproxy.modal.backend.basic.name.label') }}</label>
                <input type="text" v-model="editingBackend.name" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.name.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.description.title')">{{ t('haproxy.modal.backend.basic.description.label') }}</label>
                <input type="text" v-model="editingBackend.description" style="width: 300px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.description.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.mode.title')">{{ t('haproxy.modal.backend.basic.mode.label') }}</label>
                <select v-model="editingBackend.mode" style="width: 200px;">
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.mode.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.balance.title')">{{ t('haproxy.modal.backend.basic.balance.label') }}</label>
                <select v-model="editingBackend.balance" style="width: 200px;">
                  <option value="round-robin">{{ t('haproxy.modal.backend.basic.balance.roundRobin') }}</option>
                  <option value="least-connection">{{ t('haproxy.modal.backend.basic.balance.leastConnection') }}</option>
                  <option value="source-address">{{ t('haproxy.modal.backend.basic.balance.sourceAddress') }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.balance.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.healthCheck.title')">{{ t('haproxy.modal.backend.basic.healthCheck.label') }}</label>
                <select v-model="editingBackend['health-check']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option value="ldap">LDAP</option>
                  <option value="mysql">MySQL</option>
                  <option value="pgsql">PostgreSQL</option>
                  <option value="redis">Redis</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.healthCheck.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.loggingFacility.title')">{{ t('haproxy.modal.backend.basic.loggingFacility.label') }}</label>
                <select v-model="editingBackend['logging-facility']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option v-for="f in LOG_FACILITIES" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.loggingFacility.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.loggingLevel.title')">{{ t('haproxy.modal.backend.basic.loggingLevel.label') }}</label>
                <select v-model="editingBackend['logging-level']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option v-for="l in LOG_LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.loggingLevel.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.caCert.title')">{{ t('haproxy.modal.backend.basic.caCert.label') }}</label>
                <input type="text" v-model="editingBackend['ssl-ca-certificate']" style="width: 200px;" :placeholder="t('haproxy.modal.backend.basic.caCert.placeholder')" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.caCert.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.sslNoVerify.title')">{{ t('haproxy.modal.backend.basic.sslNoVerify.label') }}</label>
                <input type="checkbox" v-model="editingBackend['ssl-no-verify']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.sslNoVerify.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.timeoutConnect.title')">{{ t('haproxy.modal.backend.basic.timeoutConnect.label') }}</label>
                <input type="number" v-model.number="editingBackend['timeout-connect']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.timeoutConnect.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.timeoutServer.title')">{{ t('haproxy.modal.backend.basic.timeoutServer.label') }}</label>
                <input type="number" v-model.number="editingBackend['timeout-server']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.timeoutServer.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.basic.timeoutCheck.title')">{{ t('haproxy.modal.backend.basic.timeoutCheck.label') }}</label>
                <input type="number" v-model.number="editingBackend['timeout-check']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.basic.timeoutCheck.help') }}</div>
            </div>
          </template>

          <template #servers>
            <div style="padding: 8px 0;">
              <DataTable :columns="[
                { key: 'name', title: t('haproxy.columns.name'), width: 100 },
                { key: 'address', title: t('haproxy.columns.address'), width: 150 },
                { key: 'port', title: t('haproxy.columns.port'), width: 80 },
                { key: 'backup', title: t('haproxy.columns.backup'), width: 60 },
                { key: 'check', title: t('haproxy.columns.check'), width: 60 },
                { key: 'checkPort', title: t('haproxy.columns.checkPort'), width: 80 },
                { key: 'sendProxy', title: t('haproxy.columns.proxy'), width: 80 },
              ]" rowKey="name" :data="editingBackend.servers.map((s, i) => ({
                name: s.name,
                address: s.address || '-',
                port: s.port || '-',
                backup: s.backup ? t('haproxy.common.yes') : '-',
                check: s.check ? t('haproxy.common.yes') : '-',
                checkPort: s['check-port'] || '-',
                sendProxy: s['send-proxy-v2'] ? 'v2' : (s['send-proxy'] ? 'v1' : '-'),
                _index: i,
              }))"
              :actions="['create', 'edit', 'delete']"
              @create="addServer"
              @edit="editServer($event)"
              @delete="deleteServer($event)">
              </DataTable>
            </div>
          </template>

          <template #health>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.health.checkMethod.title')">{{ t('haproxy.modal.backend.health.checkMethod.label') }}</label>
                <select v-model="editingBackend['http-check-method']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option value="options">OPTIONS</option>
                  <option value="head">HEAD</option>
                  <option value="get">GET</option>
                  <option value="post">POST</option>
                  <option value="put">PUT</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.health.checkMethod.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.health.checkUri.title')">{{ t('haproxy.modal.backend.health.checkUri.label') }}</label>
                <input type="text" v-model="editingBackend['http-check-uri']" style="width: 300px;" :placeholder="t('haproxy.modal.backend.health.checkUri.placeholder')" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.health.checkUri.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.health.expectStatus.title')">{{ t('haproxy.modal.backend.health.expectStatus.label') }}</label>
                <input type="text" v-model="editingBackend['http-check-expect-status']" style="width: 200px;" :placeholder="t('haproxy.modal.backend.health.expectStatus.placeholder')" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.health.expectStatus.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.backend.health.expectString.title')">{{ t('haproxy.modal.backend.health.expectString.label') }}</label>
                <input type="text" v-model="editingBackend['http-check-expect-string']" style="width: 300px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backend.health.expectString.help') }}</div>
            </div>
          </template>

          <template #rules>
            <div style="padding: 8px 0;">
              <DataTable :columns="[
                { key: 'rule', title: t('haproxy.columns.rule'), width: 60 },
                { key: 'domainName', title: t('haproxy.columns.domainName'), width: 150 },
                { key: 'urlPath', title: t('haproxy.columns.urlPath'), width: 150 },
                { key: 'setServer', title: t('haproxy.columns.setServer'), width: 120 },
                { key: 'setRedirect', title: t('haproxy.columns.setRedirect'), width: 120 },
              ]" rowKey="rule" :data="editingBackend.rules.map((r, i) => ({
                rule: r.rule,
                domainName: (r['domain-name'] || []).join(', ') || '-',
                urlPath: r['url-path-exact'] ? (t('haproxy.common.exact') + ': ' + r['url-path-exact'].join(', ')) : (r['url-path-begin'] ? (t('haproxy.common.begin') + ': ' + r['url-path-begin'].join(', ')) : (r['url-path-end'] ? (t('haproxy.common.end') + ': ' + r['url-path-end'].join(', ')) : '-')),
                setServer: r['set-server'] || '-',
                setRedirect: r['set-redirect-location'] || '-',
              }))"
              :actions="['create', 'edit', 'delete']"
              @create="addBackendRule"
              @edit="editBackendRule($event)"
              @delete="deleteBackendRule($event)">
              </DataTable>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>

      <!-- Server edit modal -->
      <DraggableModal v-model:visible="showServerModal" :title="t('haproxy.modal.server.title')" width="500px" @ok="saveServer">
        <div style="padding: 8px 0;">
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.name.label') }}</label>
            <input type="text" v-model="editingServer.name" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.name.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.address.label') }}</label>
            <input type="text" v-model="editingServer.address" style="width: 200px;" :placeholder="t('haproxy.modal.server.address.placeholder')" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.address.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.port.label') }}</label>
            <input type="number" v-model.number="editingServer.port" min="1" max="65535" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.port.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.backup.label') }}</label>
            <input type="checkbox" v-model="editingServer.backup" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.backup.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.check.label') }}</label>
            <input type="checkbox" v-model="editingServer.check" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.check.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.checkPort.label') }}</label>
            <input type="number" v-model.number="editingServer['check-port']" min="1" max="65535" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.checkPort.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.sendProxy.label') }}</label>
            <input type="checkbox" v-model="editingServer['send-proxy']" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.sendProxy.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.server.sendProxyV2.label') }}</label>
            <input type="checkbox" v-model="editingServer['send-proxy-v2']" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.server.sendProxyV2.help') }}</div>
        </div>
      </DraggableModal>

      <!-- Backend rule edit modal -->
      <DraggableModal v-model:visible="showBackendRuleModal" :title="t('haproxy.modal.backendRule.title')" width="600px" @ok="saveBackendRule">
        <div style="padding: 8px 0;">
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.ruleNumber.label') }}</label>
            <input type="number" v-model.number="editingBackendRule.rule" min="1" style="width: 100px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.ruleNumber.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.domainName.label') }}</label>
            <textarea v-model="editingBackendRule.domainNameText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.backendRule.domainName.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.domainName.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.urlPathExact.label') }}</label>
            <textarea v-model="editingBackendRule.urlPathExactText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.backendRule.urlPathExact.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.urlPathExact.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.urlPathBegin.label') }}</label>
            <textarea v-model="editingBackendRule.urlPathBeginText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.backendRule.urlPathBegin.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.urlPathBegin.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.urlPathEnd.label') }}</label>
            <textarea v-model="editingBackendRule.urlPathEndText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.backendRule.urlPathEnd.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.urlPathEnd.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.setServer.label') }}</label>
            <input type="text" v-model="editingBackendRule['set-server']" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.setServer.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.backendRule.redirectUrl.label') }}</label>
            <input type="text" v-model="editingBackendRule['set-redirect-location']" style="width: 300px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.backendRule.redirectUrl.help') }}</div>
        </div>
      </DraggableModal>

      <!-- Frontend service modal -->
      <DraggableModal v-model:visible="showServiceModal" :title="t('haproxy.modal.service.title')" width="700px" @ok="saveService">
        <TabGroup v-model="activeServiceTab" :tabs="[
          { key: 'basic', title: t('haproxy.modal.service.tabs.basic') },
          { key: 'ssl', title: t('haproxy.modal.service.tabs.ssl') },
          { key: 'rules', title: t('haproxy.modal.service.tabs.rules') },
          { key: 'compression', title: t('haproxy.modal.service.tabs.compression') },
        ]">
          <template #basic>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.name.title')">{{ t('haproxy.modal.service.basic.name.label') }}</label>
                <input type="text" v-model="editingService.name" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.name.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.description.title')">{{ t('haproxy.modal.service.basic.description.label') }}</label>
                <input type="text" v-model="editingService.description" style="width: 300px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.description.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.mode.title')">{{ t('haproxy.modal.service.basic.mode.label') }}</label>
                <select v-model="editingService.mode" style="width: 200px;">
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.mode.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.port.title')">{{ t('haproxy.modal.service.basic.port.label') }}</label>
                <input type="number" v-model.number="editingService.port" min="1" max="65535" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.port.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.listenAddress.title')">{{ t('haproxy.modal.service.basic.listenAddress.label') }}</label>
                <textarea v-model="editingService.listenAddressText" rows="3" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.service.basic.listenAddress.placeholder')"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.listenAddress.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.acceptProxy.title')">{{ t('haproxy.modal.service.basic.acceptProxy.label') }}</label>
                <input type="checkbox" v-model="editingService['accept-proxy']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.acceptProxy.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.backend.title')">{{ t('haproxy.modal.service.basic.backend.label') }}</label>
                <textarea v-model="editingService.backendText" rows="3" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.service.basic.backend.placeholder')"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.backend.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.redirectHttp.title')">{{ t('haproxy.modal.service.basic.redirectHttp.label') }}</label>
                <input type="checkbox" v-model="editingService['redirect-http-to-https']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.redirectHttp.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.inspectDelay.title')">{{ t('haproxy.modal.service.basic.inspectDelay.label') }}</label>
                <input type="number" v-model.number="editingService['tcp-inspect-delay']" min="1" max="65535" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.inspectDelay.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.timeoutClient.title')">{{ t('haproxy.modal.service.basic.timeoutClient.label') }}</label>
                <input type="number" v-model.number="editingService['timeout-client']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.timeoutClient.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.loggingFacility.title')">{{ t('haproxy.modal.service.basic.loggingFacility.label') }}</label>
                <select v-model="editingService['logging-facility']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option v-for="f in LOG_FACILITIES" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.loggingFacility.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.basic.loggingLevel.title')">{{ t('haproxy.modal.service.basic.loggingLevel.label') }}</label>
                <select v-model="editingService['logging-level']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option v-for="l in LOG_LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.basic.loggingLevel.help') }}</div>
            </div>
          </template>

          <template #ssl>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.ssl.certificate.title')">{{ t('haproxy.modal.service.ssl.certificate.label') }}</label>
                <textarea v-model="editingService.sslCertificateText" rows="3" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.service.ssl.certificate.placeholder')"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.ssl.certificate.help') }}</div>
            </div>
          </template>

          <template #rules>
            <div style="padding: 8px 0;">
              <DataTable :columns="[
                { key: 'rule', title: t('haproxy.columns.rule'), width: 60 },
                { key: 'domainName', title: t('haproxy.columns.domainName'), width: 150 },
                { key: 'urlPath', title: t('haproxy.columns.urlPath'), width: 150 },
                { key: 'setBackend', title: t('haproxy.columns.setBackend'), width: 120 },
                { key: 'setRedirect', title: t('haproxy.columns.setRedirect'), width: 120 },
              ]" rowKey="rule" :data="editingService.rules.map((r, i) => ({
                rule: r.rule,
                domainName: (r['domain-name'] || []).join(', ') || '-',
                urlPath: r['url-path-exact'] ? (t('haproxy.common.exact') + ': ' + r['url-path-exact'].join(', ')) : (r['url-path-begin'] ? (t('haproxy.common.begin') + ': ' + r['url-path-begin'].join(', ')) : (r['url-path-end'] ? (t('haproxy.common.end') + ': ' + r['url-path-end'].join(', ')) : '-')),
                setBackend: r['set-backend'] || '-',
                setRedirect: r['set-redirect-location'] || '-',
              }))"
              :actions="['create', 'edit', 'delete']"
              @create="addServiceRule"
              @edit="editServiceRule($event)"
              @delete="deleteServiceRule($event)">
              </DataTable>
            </div>
          </template>

          <template #compression>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.compression.algorithm.title')">{{ t('haproxy.modal.service.compression.algorithm.label') }}</label>
                <select v-model="editingService['compression-algorithm']" style="width: 200px;">
                  <option value="">{{ t('haproxy.common.notSet') }}</option>
                  <option value="gzip">gzip</option>
                  <option value="deflate">deflate</option>
                  <option value="identity">identity</option>
                  <option value="raw-deflate">raw-deflate</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.compression.algorithm.help') }}</div>
              <div class="form-row">
                <label class="form-label" :title="t('haproxy.modal.service.compression.mimeTypes.title')">{{ t('haproxy.modal.service.compression.mimeTypes.label') }}</label>
                <textarea v-model="editingService.compressionMimeText" rows="3" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.service.compression.mimeTypes.placeholder')"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.service.compression.mimeTypes.help') }}</div>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>

      <!-- Service rule edit modal -->
      <DraggableModal v-model:visible="showServiceRuleModal" :title="t('haproxy.modal.serviceRule.title')" width="600px" @ok="saveServiceRule">
        <div style="padding: 8px 0;">
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.ruleNumber.label') }}</label>
            <input type="number" v-model.number="editingServiceRule.rule" min="1" style="width: 100px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.ruleNumber.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.domainName.label') }}</label>
            <textarea v-model="editingServiceRule.domainNameText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.serviceRule.domainName.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.domainName.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.urlPathExact.label') }}</label>
            <textarea v-model="editingServiceRule.urlPathExactText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.serviceRule.urlPathExact.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.urlPathExact.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.urlPathBegin.label') }}</label>
            <textarea v-model="editingServiceRule.urlPathBeginText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.serviceRule.urlPathBegin.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.urlPathBegin.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.urlPathEnd.label') }}</label>
            <textarea v-model="editingServiceRule.urlPathEndText" rows="2" style="width: 300px; font-size: 12px;" :placeholder="t('haproxy.modal.serviceRule.urlPathEnd.placeholder')"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.urlPathEnd.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.setBackend.label') }}</label>
            <input type="text" v-model="editingServiceRule['set-backend']" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.setBackend.help') }}</div>
          <div class="form-row">
            <label class="form-label">{{ t('haproxy.modal.serviceRule.redirectUrl.label') }}</label>
            <input type="text" v-model="editingServiceRule['set-redirect-location']" style="width: 300px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">{{ t('haproxy.modal.serviceRule.redirectUrl.help') }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteBackendModalVisible" :title="t('haproxy.modal.confirmDelete.title')" header-icon="delete" width="400px" @confirm="confirmDeleteBackend">
        <div>{{ t('haproxy.modal.confirmDelete.backendMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteBackendName }}</div>
        </div>
      </DraggableModal>

      <DraggableModal v-model:visible="deleteServiceModalVisible" :title="t('haproxy.modal.confirmDelete.title')" header-icon="delete" width="400px" @confirm="confirmDeleteService">
        <div>{{ t('haproxy.modal.confirmDelete.serviceMessage') }}</div>
        <div style="margin-top:12px;padding:8px 12px;background:#f5f5f5;border-radius:4px;">
          <div style="padding:2px 0;">{{ pendingDeleteServiceName }}</div>
        </div>
      </DraggableModal>
    </div>
  `,
  setup() {
    const { t } = useI18n();
    const configStore = useConfigStore();
    const loading = ref(false);
    const activeTab = ref('global');
    const activeBackendTab = ref('basic');
    const activeServiceTab = ref('basic');

    const LOG_FACILITIES = ['auth', 'cron', 'daemon', 'kern', 'lpr', 'mail', 'news', 'syslog', 'user', 'uucp', 'local0', 'local1', 'local2', 'local3', 'local4', 'local5', 'local6', 'local7'];
    const LOG_LEVELS = ['emerg', 'alert', 'crit', 'err', 'warning', 'notice', 'info', 'debug'];

    const globalConfig = ref({
      'max-connections': null,
      'tls-version-min': '1.3',
      'ssl-bind-ciphers': '',
      'logging-facility': '',
      'logging-level': 'err',
    });

    const timeoutConfig = ref({
      client: 50,
      connect: 10,
      server: 50,
      check: null,
    });

    const backendList = ref([]);
    const serviceList = ref([]);

    const showBackendModal = ref(false);
    const showServiceModal = ref(false);
    const showServerModal = ref(false);
    const showBackendRuleModal = ref(false);
    const showServiceRuleModal = ref(false);

    const editingBackend = ref({
      name: '',
      description: '',
      mode: 'http',
      balance: 'round-robin',
      'health-check': '',
      'logging-facility': '',
      'logging-level': 'err',
      'ssl-ca-certificate': '',
      'ssl-no-verify': false,
      'timeout-connect': null,
      'timeout-server': null,
      'timeout-check': null,
      'http-check-method': '',
      'http-check-uri': '',
      'http-check-expect-status': '',
      'http-check-expect-string': '',
      servers: [],
      rules: [],
    });

    const editingService = ref({
      name: '',
      description: '',
      mode: 'http',
      port: null,
      listenAddressText: '',
      'accept-proxy': false,
      backendText: '',
      'redirect-http-to-https': false,
      'tcp-inspect-delay': null,
      'timeout-client': null,
      'logging-facility': '',
      'logging-level': 'err',
      sslCertificateText: '',
      compressionMimeText: '',
      'compression-algorithm': '',
      rules: [],
    });

    const editingServer = ref({});
    const editingServerIndex = ref(-1);
    const editingBackendRule = ref({});
    const editingBackendRuleIndex = ref(-1);
    const editingServiceRule = ref({});
    const editingServiceRuleIndex = ref(-1);

    const deleteBackendModalVisible = ref(false);
    const pendingDeleteBackendName = ref('');
    const deleteServiceModalVisible = ref(false);
    const pendingDeleteServiceName = ref('');

    const commandPath = computed(() => {
      switch (activeTab.value) {
        case 'global': return 'load-balancing haproxy global-parameters';
        case 'timeout': return 'load-balancing haproxy timeout';
        case 'backends': return 'load-balancing haproxy backend';
        case 'services': return 'load-balancing haproxy service';
        default: return 'load-balancing haproxy';
      }
    });

    const previewText = computed(() => {
      const lines = [];

      // Global parameters
      if (globalConfig.value['max-connections']) {
        lines.push(`set load-balancing haproxy global-parameters max-connections ${globalConfig.value['max-connections']}`);
      }
      if (globalConfig.value['tls-version-min']) {
        lines.push(`set load-balancing haproxy global-parameters tls-version-min ${globalConfig.value['tls-version-min']}`);
      }
      if (globalConfig.value['ssl-bind-ciphers']) {
        globalConfig.value['ssl-bind-ciphers'].split('\n').filter(c => c.trim()).forEach(c => {
          lines.push(`set load-balancing haproxy global-parameters ssl-bind-ciphers ${c.trim()}`);
        });
      }
      if (globalConfig.value['logging-facility']) {
        lines.push(`set load-balancing haproxy global-parameters logging facility ${globalConfig.value['logging-facility']} level ${globalConfig.value['logging-level'] || 'err'}`);
      }

      // Timeout
      if (timeoutConfig.value.client) {
        lines.push(`set load-balancing haproxy timeout client ${timeoutConfig.value.client}`);
      }
      if (timeoutConfig.value.connect) {
        lines.push(`set load-balancing haproxy timeout connect ${timeoutConfig.value.connect}`);
      }
      if (timeoutConfig.value.server) {
        lines.push(`set load-balancing haproxy timeout server ${timeoutConfig.value.server}`);
      }
      if (timeoutConfig.value.check) {
        lines.push(`set load-balancing haproxy timeout check ${timeoutConfig.value.check}`);
      }

      // Backends
      backendList.value.forEach(b => {
        if (b.description) lines.push(`set load-balancing haproxy backend ${b.name} description "${b.description}"`);
        if (b.mode && b.mode !== 'http') lines.push(`set load-balancing haproxy backend ${b.name} mode ${b.mode}`);
        if (b.balance && b.balance !== 'round-robin') lines.push(`set load-balancing haproxy backend ${b.name} balance ${b.balance}`);
        if (b['health-check']) lines.push(`set load-balancing haproxy backend ${b.name} health-check ${b['health-check']}`);
        if (b['logging-facility']) lines.push(`set load-balancing haproxy backend ${b.name} logging facility ${b['logging-facility']} level ${b['logging-level'] || 'err'}`);
        if (b['ssl-ca-certificate']) lines.push(`set load-balancing haproxy backend ${b.name} ssl ca-certificate ${b['ssl-ca-certificate']}`);
        if (b['ssl-no-verify']) lines.push(`set load-balancing haproxy backend ${b.name} ssl no-verify`);
        if (b['timeout-connect']) lines.push(`set load-balancing haproxy backend ${b.name} timeout connect ${b['timeout-connect']}`);
        if (b['timeout-server']) lines.push(`set load-balancing haproxy backend ${b.name} timeout server ${b['timeout-server']}`);
        if (b['timeout-check']) lines.push(`set load-balancing haproxy backend ${b.name} timeout check ${b['timeout-check']}`);
        if (b['http-check-method']) lines.push(`set load-balancing haproxy backend ${b.name} http-check method ${b['http-check-method']}`);
        if (b['http-check-uri']) lines.push(`set load-balancing haproxy backend ${b.name} http-check uri ${b['http-check-uri']}`);
        if (b['http-check-expect-status']) lines.push(`set load-balancing haproxy backend ${b.name} http-check expect status ${b['http-check-expect-status']}`);
        if (b['http-check-expect-string']) lines.push(`set load-balancing haproxy backend ${b.name} http-check expect string "${b['http-check-expect-string']}"`);
        (b.servers || []).forEach(s => {
          lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} address ${s.address}`);
          if (s.port) lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} port ${s.port}`);
          if (s.backup) lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} backup`);
          if (s.check) lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} check`);
          if (s['check-port']) lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} check port ${s['check-port']}`);
          if (s['send-proxy']) lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} send-proxy`);
          if (s['send-proxy-v2']) lines.push(`set load-balancing haproxy backend ${b.name} server ${s.name} send-proxy-v2`);
        });
        (b.rules || []).forEach(r => {
          (r['domain-name'] || []).forEach(d => lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} domain-name ${d}`));
          if (r['wildcard-domain']) lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} wildcard-domain`);
          (r['url-path-begin'] || []).forEach(u => lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} url-path begin ${u}`));
          (r['url-path-end'] || []).forEach(u => lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} url-path end ${u}`));
          (r['url-path-exact'] || []).forEach(u => lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} url-path exact ${u}`));
          if (r.ssl) lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} ssl ${r.ssl}`);
          if (r['set-server']) lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} set server ${r['set-server']}`);
          if (r['set-redirect-location']) lines.push(`set load-balancing haproxy backend ${b.name} rule ${r.rule} set redirect-location ${r['set-redirect-location']}`);
        });
      });

      // Services
      serviceList.value.forEach(s => {
        if (s.description) lines.push(`set load-balancing haproxy service ${s.name} description "${s.description}"`);
        if (s.mode && s.mode !== 'http') lines.push(`set load-balancing haproxy service ${s.name} mode ${s.mode}`);
        if (s.port) lines.push(`set load-balancing haproxy service ${s.name} port ${s.port}`);
        (s['listen-address'] || []).forEach(addr => {
          lines.push(`set load-balancing haproxy service ${s.name} listen-address ${addr}`);
          if (s['accept-proxy']) lines.push(`set load-balancing haproxy service ${s.name} listen-address ${addr} accept-proxy`);
        });
        (s.backend || []).forEach(b => lines.push(`set load-balancing haproxy service ${s.name} backend ${b}`));
        if (s['redirect-http-to-https']) lines.push(`set load-balancing haproxy service ${s.name} redirect-http-to-https`);
        if (s['tcp-inspect-delay']) lines.push(`set load-balancing haproxy service ${s.name} tcp-request inspect-delay ${s['tcp-inspect-delay']}`);
        if (s['timeout-client']) lines.push(`set load-balancing haproxy service ${s.name} timeout client ${s['timeout-client']}`);
        if (s['logging-facility']) lines.push(`set load-balancing haproxy service ${s.name} logging facility ${s['logging-facility']} level ${s['logging-level'] || 'err'}`);
        if (s.sslCertificateText) {
          s.sslCertificateText.split('\n').filter(c => c.trim()).forEach(c => {
            lines.push(`set load-balancing haproxy service ${s.name} ssl certificate ${c.trim()}`);
          });
        }
        if (s['compression-algorithm']) lines.push(`set load-balancing haproxy service ${s.name} http-compression algorithm ${s['compression-algorithm']}`);
        if (s.compressionMimeText) {
          s.compressionMimeText.split('\n').filter(m => m.trim()).forEach(m => {
            lines.push(`set load-balancing haproxy service ${s.name} http-compression mime-type ${m.trim()}`);
          });
        }
        (s.rules || []).forEach(r => {
          (r['domain-name'] || []).forEach(d => lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} domain-name ${d}`));
          if (r['wildcard-domain']) lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} wildcard-domain`);
          (r['url-path-begin'] || []).forEach(u => lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} url-path begin ${u}`));
          (r['url-path-end'] || []).forEach(u => lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} url-path end ${u}`));
          (r['url-path-exact'] || []).forEach(u => lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} url-path exact ${u}`));
          if (r.ssl) lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} ssl ${r.ssl}`);
          if (r['set-backend']) lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} set backend ${r['set-backend']}`);
          if (r['set-redirect-location']) lines.push(`set load-balancing haproxy service ${s.name} rule ${r.rule} set redirect-location ${r['set-redirect-location']}`);
        });
      });

      return lines.join('\n') || '# ' + t('haproxy.preview.noConfig');
    });

    const parseConfig = (data) => {
      const backends = {};
      const services = {};
      const timeouts = {};
      const global = {};

      const entries = Array.isArray(data) ? data : (data ? Object.entries(data).map(([k, v]) => ({ path: k, value: v })) : []);

      entries.forEach(entry => {
        const path = entry.path || '';
        const value = entry.value;
        const parts = path.replace('load-balancing haproxy ', '').split(' ');

        if (parts[0] === 'backend' && parts[1]) {
          const name = parts[1];
          if (!backends[name]) backends[name] = { name, servers: [], rules: [] };
          const b = backends[name];
          const sub = parts.slice(2).join(' ');
          if (sub === 'description') b.description = value;
          else if (sub === 'mode') b.mode = value;
          else if (sub === 'balance') b.balance = value;
          else if (sub === 'health-check') b['health-check'] = value;
          else if (sub.startsWith('logging facility ')) {
            const levelMatch = sub.match(/logging facility (\S+)(?: level (\S+))?/);
            if (levelMatch) { b['logging-facility'] = levelMatch[1]; b['logging-level'] = levelMatch[2] || 'err'; }
          }
          else if (sub.startsWith('ssl ca-certificate')) b['ssl-ca-certificate'] = value;
          else if (sub === 'ssl no-verify') b['ssl-no-verify'] = true;
          else if (sub.startsWith('timeout connect')) b['timeout-connect'] = parseInt(value);
          else if (sub.startsWith('timeout server')) b['timeout-server'] = parseInt(value);
          else if (sub.startsWith('timeout check')) b['timeout-check'] = parseInt(value);
          else if (sub.startsWith('http-check method')) b['http-check-method'] = value;
          else if (sub.startsWith('http-check uri')) b['http-check-uri'] = value;
          else if (sub.startsWith('http-check expect status')) b['http-check-expect-status'] = value;
          else if (sub.startsWith('http-check expect string')) b['http-check-expect-string'] = value;
          else if (parts[2] === 'server' && parts[3]) {
            const sName = parts[3];
            let server = b.servers.find(s => s.name === sName);
            if (!server) { server = { name: sName }; b.servers.push(server); }
            const srvSub = parts.slice(4).join(' ');
            if (srvSub === 'address') server.address = value;
            else if (srvSub === 'port') server.port = parseInt(value);
            else if (srvSub === 'backup') server.backup = true;
            else if (srvSub === 'check') server.check = true;
            else if (srvSub.startsWith('check port')) server['check-port'] = parseInt(value);
            else if (srvSub === 'send-proxy') server['send-proxy'] = true;
            else if (srvSub === 'send-proxy-v2') server['send-proxy-v2'] = true;
          }
          else if (parts[2] === 'rule' && parts[3]) {
            const rNum = parseInt(parts[3]);
            let rule = b.rules.find(r => r.rule === rNum);
            if (!rule) { rule = { rule: rNum, 'domain-name': [], 'url-path-begin': [], 'url-path-end': [], 'url-path-exact': [] }; b.rules.push(rule); }
            const ruleSub = parts.slice(4).join(' ');
            if (ruleSub.startsWith('domain-name ')) rule['domain-name'].push(value);
            else if (ruleSub === 'wildcard-domain') rule['wildcard-domain'] = true;
            else if (ruleSub.startsWith('url-path begin ')) rule['url-path-begin'].push(value);
            else if (ruleSub.startsWith('url-path end ')) rule['url-path-end'].push(value);
            else if (ruleSub.startsWith('url-path exact ')) rule['url-path-exact'].push(value);
            else if (ruleSub.startsWith('ssl ')) rule.ssl = value;
            else if (ruleSub.startsWith('set server ')) rule['set-server'] = value;
            else if (ruleSub.startsWith('set redirect-location ')) rule['set-redirect-location'] = value;
          }
        }
        else if (parts[0] === 'service' && parts[1]) {
          const name = parts[1];
          if (!services[name]) services[name] = { name, backend: [], 'listen-address': {}, rules: [] };
          const s = services[name];
          const sub = parts.slice(2).join(' ');
          if (sub === 'description') s.description = value;
          else if (sub === 'mode') s.mode = value;
          else if (sub === 'port') s.port = parseInt(value);
          else if (sub.startsWith('listen-address ')) {
            const addr = parts[3];
            if (!s['listen-address'][addr]) s['listen-address'][addr] = {};
            if (sub.endsWith('accept-proxy')) s['listen-address'][addr]['accept-proxy'] = true;
          }
          else if (sub.startsWith('backend ')) s.backend.push(value);
          else if (sub === 'redirect-http-to-https') s['redirect-http-to-https'] = true;
          else if (sub.startsWith('tcp-request inspect-delay')) s['tcp-inspect-delay'] = parseInt(value);
          else if (sub.startsWith('timeout client')) s['timeout-client'] = parseInt(value);
          else if (sub.startsWith('logging facility ')) {
            const levelMatch = sub.match(/logging facility (\S+)(?: level (\S+))?/);
            if (levelMatch) { s['logging-facility'] = levelMatch[1]; s['logging-level'] = levelMatch[2] || 'err'; }
          }
          else if (sub.startsWith('ssl certificate ')) {
            if (!s.sslCertificates) s.sslCertificates = [];
            s.sslCertificates.push(value);
          }
          else if (sub.startsWith('http-compression algorithm')) s['compression-algorithm'] = value;
          else if (sub.startsWith('http-compression mime-type')) {
            if (!s.compressionMimeTypes) s.compressionMimeTypes = [];
            s.compressionMimeTypes.push(value);
          }
          else if (parts[2] === 'rule' && parts[3]) {
            const rNum = parseInt(parts[3]);
            let rule = s.rules.find(r => r.rule === rNum);
            if (!rule) { rule = { rule: rNum, 'domain-name': [], 'url-path-begin': [], 'url-path-end': [], 'url-path-exact': [] }; s.rules.push(rule); }
            const ruleSub = parts.slice(4).join(' ');
            if (ruleSub.startsWith('domain-name ')) rule['domain-name'].push(value);
            else if (ruleSub === 'wildcard-domain') rule['wildcard-domain'] = true;
            else if (ruleSub.startsWith('url-path begin ')) rule['url-path-begin'].push(value);
            else if (ruleSub.startsWith('url-path end ')) rule['url-path-end'].push(value);
            else if (ruleSub.startsWith('url-path exact ')) rule['url-path-exact'].push(value);
            else if (ruleSub.startsWith('ssl ')) rule.ssl = value;
            else if (ruleSub.startsWith('set backend ')) rule['set-backend'] = value;
            else if (ruleSub.startsWith('set redirect-location ')) rule['set-redirect-location'] = value;
          }
        }
        else if (parts[0] === 'timeout' && parts[1]) {
          timeouts[parts[1]] = parseInt(value);
        }
        else if (parts[0] === 'global-parameters') {
          const sub = parts.slice(1).join(' ');
          if (sub === 'max-connections') global['max-connections'] = parseInt(value);
          else if (sub === 'tls-version-min') global['tls-version-min'] = value;
          else if (sub.startsWith('ssl-bind-ciphers ')) {
            if (!global['ssl-bind-ciphers-list']) global['ssl-bind-ciphers-list'] = [];
            global['ssl-bind-ciphers-list'].push(value);
          }
          else if (sub.startsWith('logging facility ')) {
            const levelMatch = sub.match(/logging facility (\S+)(?: level (\S+))?/);
            if (levelMatch) { global['logging-facility'] = levelMatch[1]; global['logging-level'] = levelMatch[2] || 'err'; }
          }
        }
      });

      // Apply parsed data
      if (global['max-connections']) globalConfig.value['max-connections'] = global['max-connections'];
      if (global['tls-version-min']) globalConfig.value['tls-version-min'] = global['tls-version-min'];
      if (global['ssl-bind-ciphers-list']) globalConfig.value['ssl-bind-ciphers'] = global['ssl-bind-ciphers-list'].join('\n');
      if (global['logging-facility']) globalConfig.value['logging-facility'] = global['logging-facility'];
      if (global['logging-level']) globalConfig.value['logging-level'] = global['logging-level'];

      if (timeouts.client) timeoutConfig.value.client = timeouts.client;
      if (timeouts.connect) timeoutConfig.value.connect = timeouts.connect;
      if (timeouts.server) timeoutConfig.value.server = timeouts.server;
      if (timeouts.check) timeoutConfig.value.check = timeouts.check;

      backendList.value = Object.values(backends);
      serviceList.value = Object.values(services).map(s => {
        const result = { ...s };
        result.listenAddressText = Object.keys(s['listen-address'] || {}).join('\n');
        result.backendText = (s.backend || []).join('\n');
        result.sslCertificateText = (s.sslCertificates || []).join('\n');
        result.compressionMimeText = (s.compressionMimeTypes || []).join('\n');
        return result;
      });
    };

    const loadConfig = async () => {
      loading.value = true;
      try {
        const result = await configApi.get('load-balancing haproxy');
        parseConfig(result);
      } catch (e) {
        console.error('Failed to load HAProxy config:', e);
      } finally {
        loading.value = false;
      }
    };

    const saveConfig = async () => {
      loading.value = true;
      try {
        // Delete old config first
        await configStore.deleteConfig('load-balancing haproxy');

        // Set global parameters
        if (globalConfig.value['max-connections']) {
          await configStore.setConfig('load-balancing haproxy global-parameters max-connections', String(globalConfig.value['max-connections']));
        }
        if (globalConfig.value['tls-version-min']) {
          await configStore.setConfig('load-balancing haproxy global-parameters tls-version-min', globalConfig.value['tls-version-min']);
        }
        if (globalConfig.value['ssl-bind-ciphers']) {
          globalConfig.value['ssl-bind-ciphers'].split('\n').filter(c => c.trim()).forEach(async c => {
            await configStore.setConfig('load-balancing haproxy global-parameters ssl-bind-ciphers', c.trim());
          });
        }
        if (globalConfig.value['logging-facility']) {
          await configStore.setConfig('load-balancing haproxy global-parameters logging facility', globalConfig.value['logging-facility']);
          await configStore.setConfig('load-balancing haproxy global-parameters logging facility level', globalConfig.value['logging-level'] || 'err');
        }

        // Set timeouts
        if (timeoutConfig.value.client) {
          await configStore.setConfig('load-balancing haproxy timeout client', String(timeoutConfig.value.client));
        }
        if (timeoutConfig.value.connect) {
          await configStore.setConfig('load-balancing haproxy timeout connect', String(timeoutConfig.value.connect));
        }
        if (timeoutConfig.value.server) {
          await configStore.setConfig('load-balancing haproxy timeout server', String(timeoutConfig.value.server));
        }
        if (timeoutConfig.value.check) {
          await configStore.setConfig('load-balancing haproxy timeout check', String(timeoutConfig.value.check));
        }

        // Set backends
        for (const b of backendList.value) {
          const base = `load-balancing haproxy backend ${b.name}`;
          if (b.description) await configStore.setConfig(`${base} description`, b.description);
          if (b.mode && b.mode !== 'http') await configStore.setConfig(`${base} mode`, b.mode);
          if (b.balance && b.balance !== 'round-robin') await configStore.setConfig(`${base} balance`, b.balance);
          if (b['health-check']) await configStore.setConfig(`${base} health-check`, b['health-check']);
          if (b['logging-facility']) {
            await configStore.setConfig(`${base} logging facility`, b['logging-facility']);
            if (b['logging-level']) await configStore.setConfig(`${base} logging facility level`, b['logging-level']);
          }
          if (b['ssl-ca-certificate']) await configStore.setConfig(`${base} ssl ca-certificate`, b['ssl-ca-certificate']);
          if (b['ssl-no-verify']) await configStore.setConfig(`${base} ssl no-verify`, '');
          if (b['timeout-connect']) await configStore.setConfig(`${base} timeout connect`, String(b['timeout-connect']));
          if (b['timeout-server']) await configStore.setConfig(`${base} timeout server`, String(b['timeout-server']));
          if (b['timeout-check']) await configStore.setConfig(`${base} timeout check`, String(b['timeout-check']));
          if (b['http-check-method']) await configStore.setConfig(`${base} http-check method`, b['http-check-method']);
          if (b['http-check-uri']) await configStore.setConfig(`${base} http-check uri`, b['http-check-uri']);
          if (b['http-check-expect-status']) await configStore.setConfig(`${base} http-check expect status`, b['http-check-expect-status']);
          if (b['http-check-expect-string']) await configStore.setConfig(`${base} http-check expect string`, b['http-check-expect-string']);

          for (const s of (b.servers || [])) {
            const srvBase = `${base} server ${s.name}`;
            if (s.address) await configStore.setConfig(`${srvBase} address`, s.address);
            if (s.port) await configStore.setConfig(`${srvBase} port`, String(s.port));
            if (s.backup) await configStore.setConfig(`${srvBase} backup`, '');
            if (s.check) await configStore.setConfig(`${srvBase} check`, '');
            if (s['check-port']) await configStore.setConfig(`${srvBase} check port`, String(s['check-port']));
            if (s['send-proxy']) await configStore.setConfig(`${srvBase} send-proxy`, '');
            if (s['send-proxy-v2']) await configStore.setConfig(`${srvBase} send-proxy-v2`, '');
          }

          for (const r of (b.rules || [])) {
            const ruleBase = `${base} rule ${r.rule}`;
            for (const d of (r['domain-name'] || [])) await configStore.setConfig(`${ruleBase} domain-name`, d);
            if (r['wildcard-domain']) await configStore.setConfig(`${ruleBase} wildcard-domain`, '');
            for (const u of (r['url-path-begin'] || [])) await configStore.setConfig(`${ruleBase} url-path begin`, u);
            for (const u of (r['url-path-end'] || [])) await configStore.setConfig(`${ruleBase} url-path end`, u);
            for (const u of (r['url-path-exact'] || [])) await configStore.setConfig(`${ruleBase} url-path exact`, u);
            if (r.ssl) await configStore.setConfig(`${ruleBase} ssl`, r.ssl);
            if (r['set-server']) await configStore.setConfig(`${ruleBase} set server`, r['set-server']);
            if (r['set-redirect-location']) await configStore.setConfig(`${ruleBase} set redirect-location`, r['set-redirect-location']);
          }
        }

        // Set services
        for (const s of serviceList.value) {
          const base = `load-balancing haproxy service ${s.name}`;
          if (s.description) await configStore.setConfig(`${base} description`, s.description);
          if (s.mode && s.mode !== 'http') await configStore.setConfig(`${base} mode`, s.mode);
          if (s.port) await configStore.setConfig(`${base} port`, String(s.port));
          for (const addr of Object.keys(s['listen-address'] || {})) {
            await configStore.setConfig(`${base} listen-address`, addr);
            if (s['listen-address'][addr]['accept-proxy']) {
              await configStore.setConfig(`${base} listen-address ${addr} accept-proxy`, '');
            }
          }
          for (const b of (s.backend || [])) await configStore.setConfig(`${base} backend`, b);
          if (s['redirect-http-to-https']) await configStore.setConfig(`${base} redirect-http-to-https`, '');
          if (s['tcp-inspect-delay']) await configStore.setConfig(`${base} tcp-request inspect-delay`, String(s['tcp-inspect-delay']));
          if (s['timeout-client']) await configStore.setConfig(`${base} timeout client`, String(s['timeout-client']));
          if (s['logging-facility']) {
            await configStore.setConfig(`${base} logging facility`, s['logging-facility']);
            if (s['logging-level']) await configStore.setConfig(`${base} logging facility level`, s['logging-level']);
          }
          if (s.sslCertificateText) {
            s.sslCertificateText.split('\n').filter(c => c.trim()).forEach(async c => {
              await configStore.setConfig(`${base} ssl certificate`, c.trim());
            });
          }
          if (s['compression-algorithm']) await configStore.setConfig(`${base} http-compression algorithm`, s['compression-algorithm']);
          if (s.compressionMimeText) {
            s.compressionMimeText.split('\n').filter(m => m.trim()).forEach(async m => {
              await configStore.setConfig(`${base} http-compression mime-type`, m.trim());
            });
          }

          for (const r of (s.rules || [])) {
            const ruleBase = `${base} rule ${r.rule}`;
            for (const d of (r['domain-name'] || [])) await configStore.setConfig(`${ruleBase} domain-name`, d);
            if (r['wildcard-domain']) await configStore.setConfig(`${ruleBase} wildcard-domain`, '');
            for (const u of (r['url-path-begin'] || [])) await configStore.setConfig(`${ruleBase} url-path begin`, u);
            for (const u of (r['url-path-end'] || [])) await configStore.setConfig(`${ruleBase} url-path end`, u);
            for (const u of (r['url-path-exact'] || [])) await configStore.setConfig(`${ruleBase} url-path exact`, u);
            if (r.ssl) await configStore.setConfig(`${ruleBase} ssl`, r.ssl);
            if (r['set-backend']) await configStore.setConfig(`${ruleBase} set backend`, r['set-backend']);
            if (r['set-redirect-location']) await configStore.setConfig(`${ruleBase} set redirect-location`, r['set-redirect-location']);
          }
        }

        configStore.markPending();
        await configStore.checkSessionChanged();
        await loadConfig();
      } catch (e) {
        showError({ message: t('haproxy.messages.saveFailed') + (e.message || e) });
      } finally {
        loading.value = false;
      }
    };

    const openBackendModal = (backend) => {
      if (backend) {
        editingBackend.value = {
          name: backend.name,
          description: backend.description || '',
          mode: backend.mode || 'http',
          balance: backend.balance || 'round-robin',
          'health-check': backend['health-check'] || '',
          'logging-facility': backend['logging-facility'] || '',
          'logging-level': backend['logging-level'] || 'err',
          'ssl-ca-certificate': backend['ssl-ca-certificate'] || '',
          'ssl-no-verify': backend['ssl-no-verify'] || false,
          'timeout-connect': backend['timeout-connect'] || null,
          'timeout-server': backend['timeout-server'] || null,
          'timeout-check': backend['timeout-check'] || null,
          'http-check-method': backend['http-check-method'] || '',
          'http-check-uri': backend['http-check-uri'] || '',
          'http-check-expect-status': backend['http-check-expect-status'] || '',
          'http-check-expect-string': backend['http-check-expect-string'] || '',
          servers: JSON.parse(JSON.stringify(backend.servers || [])),
          rules: JSON.parse(JSON.stringify(backend.rules || [])),
        };
      } else {
        editingBackend.value = {
          name: '',
          description: '',
          mode: 'http',
          balance: 'round-robin',
          'health-check': '',
          'logging-facility': '',
          'logging-level': 'err',
          'ssl-ca-certificate': '',
          'ssl-no-verify': false,
          'timeout-connect': null,
          'timeout-server': null,
          'timeout-check': null,
          'http-check-method': '',
          'http-check-uri': '',
          'http-check-expect-status': '',
          'http-check-expect-string': '',
          servers: [],
          rules: [],
        };
      }
      activeBackendTab.value = 'basic';
      showBackendModal.value = true;
    };

    const saveBackend = () => {
      if (!editingBackend.value.name) {
        showError({ message: t('haproxy.messages.backendNameRequired') });
        return;
      }
      const idx = backendList.value.findIndex(b => b.name === editingBackend.value.name);
      const b = { ...editingBackend.value };
      if (idx >= 0) {
        backendList.value[idx] = b;
      } else {
        backendList.value.push(b);
      }
      showBackendModal.value = false;
    };

    const deleteBackend = (backend) => {
      pendingDeleteBackendName.value = backend.name;
      deleteBackendModalVisible.value = true;
    };

    const confirmDeleteBackend = () => {
      deleteBackendModalVisible.value = false;
      backendList.value = backendList.value.filter(b => b.name !== pendingDeleteBackendName.value);
      pendingDeleteBackendName.value = '';
    };

    const addServer = () => {
      editingServer.value = {
        name: `server${editingBackend.value.servers.length + 1}`,
        address: '',
        port: null,
        backup: false,
        check: false,
        'check-port': null,
        'send-proxy': false,
        'send-proxy-v2': false,
      };
      editingServerIndex.value = -1;
      showServerModal.value = true;
    };

    const editServer = (server) => {
      const idx = editingBackend.value.servers.findIndex(s => s.name === server.name);
      if (idx >= 0) {
        editingServer.value = { ...editingBackend.value.servers[idx] };
        editingServerIndex.value = idx;
        showServerModal.value = true;
      }
    };

    const deleteServer = (keys) => {
      const names = Array.isArray(keys) ? keys : [keys];
      editingBackend.value.servers = editingBackend.value.servers.filter(s => !names.includes(s.name));
    };

    const saveServer = () => {
      if (!editingServer.value.name) {
        showError({ message: t('haproxy.messages.serverNameRequired') });
        return;
      }
      if (editingServerIndex.value >= 0) {
        editingBackend.value.servers[editingServerIndex.value] = { ...editingServer.value };
      } else {
        editingBackend.value.servers.push({ ...editingServer.value });
      }
      showServerModal.value = false;
    };

    const addBackendRule = () => {
      const maxRule = editingBackend.value.rules.reduce((max, r) => Math.max(max, r.rule), 0);
      editingBackendRule.value = {
        rule: maxRule + 1,
        'domain-name': [],
        'url-path-begin': [],
        'url-path-end': [],
        'url-path-exact': [],
        'set-server': '',
        'set-redirect-location': '',
        domainNameText: '',
        urlPathExactText: '',
        urlPathBeginText: '',
        urlPathEndText: '',
      };
      editingBackendRuleIndex.value = -1;
      showBackendRuleModal.value = true;
    };

    const editBackendRule = (rule) => {
      const idx = editingBackend.value.rules.findIndex(r => r.rule === rule.rule);
      if (idx >= 0) {
        const r = editingBackend.value.rules[idx];
        editingBackendRule.value = {
          ...JSON.parse(JSON.stringify(r)),
          domainNameText: (r['domain-name'] || []).join('\n'),
          urlPathExactText: (r['url-path-exact'] || []).join('\n'),
          urlPathBeginText: (r['url-path-begin'] || []).join('\n'),
          urlPathEndText: (r['url-path-end'] || []).join('\n'),
        };
        editingBackendRuleIndex.value = idx;
        showBackendRuleModal.value = true;
      }
    };

    const deleteBackendRule = (keys) => {
      const ruleKeys = Array.isArray(keys) ? keys : [keys];
      editingBackend.value.rules = editingBackend.value.rules.filter(r => !ruleKeys.includes(r.rule));
    };

    const saveBackendRule = () => {
      const rule = {
        rule: editingBackendRule.value.rule,
        'domain-name': editingBackendRule.value.domainNameText.split('\n').filter(s => s.trim()),
        'url-path-begin': editingBackendRule.value.urlPathBeginText.split('\n').filter(s => s.trim()),
        'url-path-end': editingBackendRule.value.urlPathEndText.split('\n').filter(s => s.trim()),
        'url-path-exact': editingBackendRule.value.urlPathExactText.split('\n').filter(s => s.trim()),
        'set-server': editingBackendRule.value['set-server'] || '',
        'set-redirect-location': editingBackendRule.value['set-redirect-location'] || '',
      };
      if (editingBackendRuleIndex.value >= 0) {
        editingBackend.value.rules[editingBackendRuleIndex.value] = rule;
      } else {
        editingBackend.value.rules.push(rule);
      }
      showBackendRuleModal.value = false;
    };

    const openServiceModal = (service) => {
      if (service) {
        editingService.value = {
          name: service.name,
          description: service.description || '',
          mode: service.mode || 'http',
          port: service.port || null,
          listenAddressText: service.listenAddressText || '',
          'accept-proxy': service['accept-proxy'] || false,
          backendText: service.backendText || '',
          'redirect-http-to-https': service['redirect-http-to-https'] || false,
          'tcp-inspect-delay': service['tcp-inspect-delay'] || null,
          'timeout-client': service['timeout-client'] || null,
          'logging-facility': service['logging-facility'] || '',
          'logging-level': service['logging-level'] || 'err',
          sslCertificateText: service.sslCertificateText || '',
          compressionMimeText: service.compressionMimeText || '',
          'compression-algorithm': service['compression-algorithm'] || '',
          rules: JSON.parse(JSON.stringify(service.rules || [])),
        };
      } else {
        editingService.value = {
          name: '',
          description: '',
          mode: 'http',
          port: null,
          listenAddressText: '',
          'accept-proxy': false,
          backendText: '',
          'redirect-http-to-https': false,
          'tcp-inspect-delay': null,
          'timeout-client': null,
          'logging-facility': '',
          'logging-level': 'err',
          sslCertificateText: '',
          compressionMimeText: '',
          'compression-algorithm': '',
          rules: [],
        };
      }
      activeServiceTab.value = 'basic';
      showServiceModal.value = true;
    };

    const saveService = () => {
      if (!editingService.value.name) {
        showError({ message: t('haproxy.messages.serviceNameRequired') });
        return;
      }
      const idx = serviceList.value.findIndex(s => s.name === editingService.value.name);
      const s = { ...editingService.value };
      if (idx >= 0) {
        serviceList.value[idx] = s;
      } else {
        serviceList.value.push(s);
      }
      showServiceModal.value = false;
    };

    const deleteService = (service) => {
      pendingDeleteServiceName.value = service.name;
      deleteServiceModalVisible.value = true;
    };

    const confirmDeleteService = () => {
      deleteServiceModalVisible.value = false;
      serviceList.value = serviceList.value.filter(s => s.name !== pendingDeleteServiceName.value);
      pendingDeleteServiceName.value = '';
    };

    const addServiceRule = () => {
      const maxRule = editingService.value.rules.reduce((max, r) => Math.max(max, r.rule), 0);
      editingServiceRule.value = {
        rule: maxRule + 1,
        'domain-name': [],
        'url-path-begin': [],
        'url-path-end': [],
        'url-path-exact': [],
        'set-backend': '',
        'set-redirect-location': '',
        domainNameText: '',
        urlPathExactText: '',
        urlPathBeginText: '',
        urlPathEndText: '',
      };
      editingServiceRuleIndex.value = -1;
      showServiceRuleModal.value = true;
    };

    const editServiceRule = (rule) => {
      const idx = editingService.value.rules.findIndex(r => r.rule === rule.rule);
      if (idx >= 0) {
        const r = editingService.value.rules[idx];
        editingServiceRule.value = {
          ...JSON.parse(JSON.stringify(r)),
          domainNameText: (r['domain-name'] || []).join('\n'),
          urlPathExactText: (r['url-path-exact'] || []).join('\n'),
          urlPathBeginText: (r['url-path-begin'] || []).join('\n'),
          urlPathEndText: (r['url-path-end'] || []).join('\n'),
        };
        editingServiceRuleIndex.value = idx;
        showServiceRuleModal.value = true;
      }
    };

    const deleteServiceRule = (keys) => {
      const ruleKeys = Array.isArray(keys) ? keys : [keys];
      editingService.value.rules = editingService.value.rules.filter(r => !ruleKeys.includes(r.rule));
    };

    const saveServiceRule = () => {
      const rule = {
        rule: editingServiceRule.value.rule,
        'domain-name': editingServiceRule.value.domainNameText.split('\n').filter(s => s.trim()),
        'url-path-begin': editingServiceRule.value.urlPathBeginText.split('\n').filter(s => s.trim()),
        'url-path-end': editingServiceRule.value.urlPathEndText.split('\n').filter(s => s.trim()),
        'url-path-exact': editingServiceRule.value.urlPathExactText.split('\n').filter(s => s.trim()),
        'set-backend': editingServiceRule.value['set-backend'] || '',
        'set-redirect-location': editingServiceRule.value['set-redirect-location'] || '',
      };
      if (editingServiceRuleIndex.value >= 0) {
        editingService.value.rules[editingServiceRuleIndex.value] = rule;
      } else {
        editingService.value.rules.push(rule);
      }
      showServiceRuleModal.value = false;
    };

    onMounted(() => {
      loadConfig();
      window.addEventListener('config-committed', loadConfig);
    });

    return {
      t,
      loading, activeTab, activeBackendTab, activeServiceTab,
      LOG_FACILITIES, LOG_LEVELS,
      globalConfig, timeoutConfig, backendList, serviceList,
      showBackendModal, showServiceModal, showServerModal, showBackendRuleModal, showServiceRuleModal,
      editingBackend, editingService, editingServer, editingBackendRule, editingServiceRule,
      deleteBackendModalVisible, pendingDeleteBackendName, deleteServiceModalVisible, pendingDeleteServiceName,
      commandPath, previewText,
      loadConfig, saveConfig,
      openBackendModal, saveBackend, deleteBackend, confirmDeleteBackend,
      addServer, editServer, deleteServer, saveServer,
      addBackendRule, editBackendRule, deleteBackendRule, saveBackendRule,
      openServiceModal, saveService, deleteService, confirmDeleteService,
      addServiceRule, editServiceRule, deleteServiceRule, saveServiceRule,
    };
  },
});
