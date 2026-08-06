import { defineComponent, ref, computed, onMounted } from '/src/utils/vue-import.js';
import { configApi } from '/src/api/index.js';
import { useConfigStore } from '/src/stores/config.js';
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
        { key: 'global', title: '全局参数' },
        { key: 'timeout', title: '超时设置' },
        { key: 'backends', title: '后端服务器' },
        { key: 'services', title: '前端服务' },
      ]">
        <template #global>
          <div style="padding: 16px;">
            <div style="max-width: 600px;">
              <div class="form-row">
                <label class="form-label" title="最大允许连接数">最大连接数</label>
                <input type="number" v-model.number="globalConfig['max-connections']" min="1" max="2000000" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">最大允许连接数 (1-2000000)</div>
              <div class="form-row">
                <label class="form-label" title="指定最低 required TLS 版本">最低 TLS 版本</label>
                <select v-model="globalConfig['tls-version-min']" style="width: 200px;">
                  <option value="1.2">TLS 1.2</option>
                  <option value="1.3">TLS 1.3</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">指定最低 required TLS 版本 (默认: 1.3)</div>
              <div class="form-row">
                <label class="form-label" title="SSL/TLS 握手期间使用的密码算法">SSL 密码套件</label>
                <textarea v-model="globalConfig['ssl-bind-ciphers']" rows="4" style="width: 300px; font-size: 12px;" placeholder="每行一个密码套件"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">SSL/TLS 握手期间使用的密码算法 (每行一个)</div>
              <div class="form-row">
                <label class="form-label" title="日志设施">日志设施</label>
                <select v-model="globalConfig['logging-facility']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option v-for="f in LOG_FACILITIES" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">日志设施</div>
              <div class="form-row">
                <label class="form-label" title="日志级别">日志级别</label>
                <select v-model="globalConfig['logging-level']" style="width: 200px;">
                  <option v-for="l in LOG_LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">日志级别 (默认: err)</div>
            </div>
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #timeout>
          <div style="padding: 16px;">
            <div style="max-width: 600px;">
              <div class="form-row">
                <label class="form-label" title="客户端侧最大不活动时间(秒)">客户端超时</label>
                <input type="number" v-model.number="timeoutConfig.client" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">客户端侧最大不活动时间(秒) (1-3600, 默认: 50)</div>
              <div class="form-row">
                <label class="form-label" title="等待连接成功的最大时间(秒)">连接超时</label>
                <input type="number" v-model.number="timeoutConfig.connect" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">等待连接成功的最大时间(秒) (1-3600, 默认: 10)</div>
              <div class="form-row">
                <label class="form-label" title="服务器端最大不活动时间(秒)">服务器超时</label>
                <input type="number" v-model.number="timeoutConfig.server" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">服务器端最大不活动时间(秒) (1-3600, 默认: 50)</div>
              <div class="form-row">
                <label class="form-label" title="已建立连接的超时时间(秒)">检查超时</label>
                <input type="number" v-model.number="timeoutConfig.check" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">已建立连接的超时时间(秒) (1-3600)</div>
            </div>
          </div>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #backends>
          <DataTable :columns="[
              { key: 'name', title: '名称', width: 120 },
              { key: 'description', title: '描述', width: 150 },
              { key: 'mode', title: '模式', width: 80 },
              { key: 'balance', title: '负载均衡', width: 120 },
              { key: 'serverCount', title: '服务器数', width: 80 },
              { key: 'actions', title: '操作', width: 120 },
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
                <button class="btn btn-link" @click="openBackendModal(record.actions)">编辑</button>
                <button class="btn btn-link btn-danger" @click="deleteBackend(record.actions)">删除</button>
              </template>
            </DataTable>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

        <template #services>
          <DataTable :columns="[
              { key: 'name', title: '名称', width: 120 },
              { key: 'description', title: '描述', width: 150 },
              { key: 'mode', title: '模式', width: 80 },
              { key: 'port', title: '端口', width: 80 },
              { key: 'listenAddress', title: '监听地址', width: 150 },
              { key: 'backend', title: '后端', width: 150 },
              { key: 'actions', title: '操作', width: 120 },
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
                <button class="btn btn-link" @click="openServiceModal(record.actions)">编辑</button>
                <button class="btn btn-link btn-danger" @click="deleteService(record.actions)">删除</button>
              </template>
            </DataTable>
          <div class="page-actions-bottom">
            <ToolbarButton icon="save" primary @click="saveConfig" :disabled="loading">{{ loading ? '保存中...' : '保存配置' }}</ToolbarButton>
          </div>
        </template>

      </TabGroup>


      <!-- 后端服务器弹窗 -->
      <DraggableModal v-model:visible="showBackendModal" title="后端服务器" width="700px" @ok="saveBackend">
        <TabGroup v-model="activeBackendTab" :tabs="[
          { key: 'basic', title: '基本配置' },
          { key: 'servers', title: '服务器' },
          { key: 'health', title: '健康检查' },
          { key: 'rules', title: '规则' },
        ]">
          <template #basic>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" title="后端服务器名称">名称</label>
                <input type="text" v-model="editingBackend.name" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">后端服务器名称</div>
              <div class="form-row">
                <label class="form-label" title="描述">描述</label>
                <input type="text" v-model="editingBackend.description" style="width: 300px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">描述 (最多255字符)</div>
              <div class="form-row">
                <label class="form-label" title="代理模式">模式</label>
                <select v-model="editingBackend.mode" style="width: 200px;">
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">代理模式 (默认: http)</div>
              <div class="form-row">
                <label class="form-label" title="负载均衡算法">负载均衡算法</label>
                <select v-model="editingBackend.balance" style="width: 200px;">
                  <option value="round-robin">轮询 (round-robin)</option>
                  <option value="least-connection">最少连接 (least-connection)</option>
                  <option value="source-address">源地址 (source-address)</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">负载均衡算法 (默认: round-robin)</div>
              <div class="form-row">
                <label class="form-label" title="非HTTP健康检查选项">健康检查类型</label>
                <select v-model="editingBackend['health-check']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option value="ldap">LDAP</option>
                  <option value="mysql">MySQL</option>
                  <option value="pgsql">PostgreSQL</option>
                  <option value="redis">Redis</option>
                  <option value="smtp">SMTP</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">非HTTP健康检查选项</div>
              <div class="form-row">
                <label class="form-label" title="日志设施">日志设施</label>
                <select v-model="editingBackend['logging-facility']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option v-for="f in LOG_FACILITIES" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">日志设施</div>
              <div class="form-row">
                <label class="form-label" title="日志级别">日志级别</label>
                <select v-model="editingBackend['logging-level']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option v-for="l in LOG_LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">日志级别 (默认: err)</div>
              <div class="form-row">
                <label class="form-label" title="SSL CA 证书">CA 证书</label>
                <input type="text" v-model="editingBackend['ssl-ca-certificate']" style="width: 200px;" placeholder="PKI CA 名称" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">PKI 配置中的证书颁发机构</div>
              <div class="form-row">
                <label class="form-label" title="不验证后端服务器SSL证书">不验证 SSL</label>
                <input type="checkbox" v-model="editingBackend['ssl-no-verify']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">不尝试验证后端服务器的SSL证书</div>
              <div class="form-row">
                <label class="form-label" title="连接超时(秒)">连接超时</label>
                <input type="number" v-model.number="editingBackend['timeout-connect']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">等待连接成功的最大时间(秒) (1-3600)</div>
              <div class="form-row">
                <label class="form-label" title="服务器超时(秒)">服务器超时</label>
                <input type="number" v-model.number="editingBackend['timeout-server']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">服务器端最大不活动时间(秒) (1-3600)</div>
              <div class="form-row">
                <label class="form-label" title="检查超时(秒)">检查超时</label>
                <input type="number" v-model.number="editingBackend['timeout-check']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">已建立连接的超时时间(秒) (1-3600)</div>
            </div>
          </template>

          <template #servers>
            <div style="padding: 8px 0;">
              <DataTable :columns="[
                { key: 'name', title: '名称', width: 100 },
                { key: 'address', title: '地址', width: 150 },
                { key: 'port', title: '端口', width: 80 },
                { key: 'backup', title: '备用', width: 60 },
                { key: 'check', title: '检查', width: 60 },
                { key: 'checkPort', title: '检查端口', width: 80 },
                { key: 'sendProxy', title: 'Proxy', width: 80 },
              ]" rowKey="name" :data="editingBackend.servers.map((s, i) => ({
                name: s.name,
                address: s.address || '-',
                port: s.port || '-',
                backup: s.backup ? '是' : '-',
                check: s.check ? '是' : '-',
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
                <label class="form-label" title="HTTP健康检查方法">检查方法</label>
                <select v-model="editingBackend['http-check-method']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option value="options">OPTIONS</option>
                  <option value="head">HEAD</option>
                  <option value="get">GET</option>
                  <option value="post">POST</option>
                  <option value="put">PUT</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">HTTP健康检查方法</div>
              <div class="form-row">
                <label class="form-label" title="HTTP健康检查URI">检查URI</label>
                <input type="text" v-model="editingBackend['http-check-uri']" style="width: 300px;" placeholder="/health" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">HTTP健康检查URI (如 /path 或 /path?query)</div>
              <div class="form-row">
                <label class="form-label" title="期望的响应状态码">期望状态码</label>
                <input type="text" v-model="editingBackend['http-check-expect-status']" style="width: 200px;" placeholder="200-399" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">期望的响应状态码 (200-399)</div>
              <div class="form-row">
                <label class="form-label" title="期望在响应体中的字符串">期望字符串</label>
                <input type="text" v-model="editingBackend['http-check-expect-string']" style="width: 300px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">期望在响应体中出现的字符串</div>
            </div>
          </template>

          <template #rules>
            <div style="padding: 8px 0;">
              <DataTable :columns="[
                { key: 'rule', title: '编号', width: 60 },
                { key: 'domainName', title: '域名', width: 150 },
                { key: 'urlPath', title: 'URL路径', width: 150 },
                { key: 'setServer', title: '设置服务器', width: 120 },
                { key: 'setRedirect', title: '重定向', width: 120 },
              ]" rowKey="rule" :data="editingBackend.rules.map((r, i) => ({
                rule: r.rule,
                domainName: (r['domain-name'] || []).join(', ') || '-',
                urlPath: r['url-path-exact'] ? ('精确: ' + r['url-path-exact'].join(', ')) : (r['url-path-begin'] ? ('开头: ' + r['url-path-begin'].join(', ')) : (r['url-path-end'] ? ('结尾: ' + r['url-path-end'].join(', ')) : '-')),
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

      <!-- 服务器编辑弹窗 -->
      <DraggableModal v-model:visible="showServerModal" title="服务器" width="500px" @ok="saveServer">
        <div style="padding: 8px 0;">
          <div class="form-row">
            <label class="form-label">名称</label>
            <input type="text" v-model="editingServer.name" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">服务器名称</div>
          <div class="form-row">
            <label class="form-label">地址</label>
            <input type="text" v-model="editingServer.address" style="width: 200px;" placeholder="IP地址或主机名" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">服务器地址</div>
          <div class="form-row">
            <label class="form-label">端口</label>
            <input type="number" v-model.number="editingServer.port" min="1" max="65535" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">端口号 (1-65535)</div>
          <div class="form-row">
            <label class="form-label">备用</label>
            <input type="checkbox" v-model="editingServer.backup" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">标记为备用服务器</div>
          <div class="form-row">
            <label class="form-label">健康检查</label>
            <input type="checkbox" v-model="editingServer.check" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">启用健康检查</div>
          <div class="form-row">
            <label class="form-label">检查端口</label>
            <input type="number" v-model.number="editingServer['check-port']" min="1" max="65535" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">健康检查端口</div>
          <div class="form-row">
            <label class="form-label">Send Proxy</label>
            <input type="checkbox" v-model="editingServer['send-proxy']" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">发送 PROXY 协议 v1</div>
          <div class="form-row">
            <label class="form-label">Send Proxy v2</label>
            <input type="checkbox" v-model="editingServer['send-proxy-v2']" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">发送 PROXY 协议 v2</div>
        </div>
      </DraggableModal>

      <!-- 后端规则编辑弹窗 -->
      <DraggableModal v-model:visible="showBackendRuleModal" title="后端规则" width="600px" @ok="saveBackendRule">
        <div style="padding: 8px 0;">
          <div class="form-row">
            <label class="form-label">规则编号</label>
            <input type="number" v-model.number="editingBackendRule.rule" min="1" style="width: 100px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">规则编号</div>
          <div class="form-row">
            <label class="form-label">域名</label>
            <textarea v-model="editingBackendRule.domainNameText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个域名"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">匹配的域名 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">URL路径 (精确)</label>
            <textarea v-model="editingBackendRule.urlPathExactText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个路径"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">精确匹配的URL路径 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">URL路径 (开头)</label>
            <textarea v-model="editingBackendRule.urlPathBeginText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个路径"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">以...开头的URL路径 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">URL路径 (结尾)</label>
            <textarea v-model="editingBackendRule.urlPathEndText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个路径"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">以...结尾的URL路径 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">设置服务器</label>
            <input type="text" v-model="editingBackendRule['set-server']" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">重定向到的服务器名称</div>
          <div class="form-row">
            <label class="form-label">重定向地址</label>
            <input type="text" v-model="editingBackendRule['set-redirect-location']" style="width: 300px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">HTTP重定向目标地址</div>
        </div>
      </DraggableModal>

      <!-- 前端服务弹窗 -->
      <DraggableModal v-model:visible="showServiceModal" title="前端服务" width="700px" @ok="saveService">
        <TabGroup v-model="activeServiceTab" :tabs="[
          { key: 'basic', title: '基本配置' },
          { key: 'ssl', title: 'SSL' },
          { key: 'rules', title: '规则' },
          { key: 'compression', title: 'HTTP压缩' },
        ]">
          <template #basic>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" title="前端服务名称">名称</label>
                <input type="text" v-model="editingService.name" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">前端服务名称</div>
              <div class="form-row">
                <label class="form-label" title="描述">描述</label>
                <input type="text" v-model="editingService.description" style="width: 300px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">描述 (最多255字符)</div>
              <div class="form-row">
                <label class="form-label" title="代理模式">模式</label>
                <select v-model="editingService.mode" style="width: 200px;">
                  <option value="http">HTTP</option>
                  <option value="tcp">TCP</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">代理模式 (默认: http)</div>
              <div class="form-row">
                <label class="form-label" title="监听端口">端口</label>
                <input type="number" v-model.number="editingService.port" min="1" max="65535" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">连接端口号 (1-65535)</div>
              <div class="form-row">
                <label class="form-label" title="监听地址">监听地址</label>
                <textarea v-model="editingService.listenAddressText" rows="3" style="width: 300px; font-size: 12px;" placeholder="每行一个IP地址"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">监听的本地IP地址 (每行一个)</div>
              <div class="form-row">
                <label class="form-label" title="接受 PROXY 协议">接受 PROXY</label>
                <input type="checkbox" v-model="editingService['accept-proxy']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">接受 PROXY 协议</div>
              <div class="form-row">
                <label class="form-label" title="后端成员">后端</label>
                <textarea v-model="editingService.backendText" rows="3" style="width: 300px; font-size: 12px;" placeholder="每行一个后端名称"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">后端成员 (每行一个)</div>
              <div class="form-row">
                <label class="form-label" title="重定向HTTP到HTTPS">HTTP→HTTPS</label>
                <input type="checkbox" v-model="editingService['redirect-http-to-https']" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">重定向HTTP到HTTPS</div>
              <div class="form-row">
                <label class="form-label" title="内容检查等待时间(毫秒)">检查延迟</label>
                <input type="number" v-model.number="editingService['tcp-inspect-delay']" min="1" max="65535" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">内容检查期间等待数据的最大时间(毫秒) (1-65535)</div>
              <div class="form-row">
                <label class="form-label" title="客户端超时(秒)">客户端超时</label>
                <input type="number" v-model.number="editingService['timeout-client']" min="1" max="3600" style="width: 200px;" />
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">客户端侧最大不活动时间(秒) (1-3600, 默认: 50)</div>
              <div class="form-row">
                <label class="form-label" title="日志设施">日志设施</label>
                <select v-model="editingService['logging-facility']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option v-for="f in LOG_FACILITIES" :key="f" :value="f">{{ f }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">日志设施</div>
              <div class="form-row">
                <label class="form-label" title="日志级别">日志级别</label>
                <select v-model="editingService['logging-level']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option v-for="l in LOG_LEVELS" :key="l" :value="l">{{ l }}</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">日志级别 (默认: err)</div>
            </div>
          </template>

          <template #ssl>
            <div style="padding: 8px 0;">
              <div class="form-row">
                <label class="form-label" title="SSL证书">证书</label>
                <textarea v-model="editingService.sslCertificateText" rows="3" style="width: 300px; font-size: 12px;" placeholder="每行一个PKI证书名称"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">PKI 配置中的证书 (每行一个)</div>
            </div>
          </template>

          <template #rules>
            <div style="padding: 8px 0;">
              <DataTable :columns="[
                { key: 'rule', title: '编号', width: 60 },
                { key: 'domainName', title: '域名', width: 150 },
                { key: 'urlPath', title: 'URL路径', width: 150 },
                { key: 'setBackend', title: '设置后端', width: 120 },
                { key: 'setRedirect', title: '重定向', width: 120 },
              ]" rowKey="rule" :data="editingService.rules.map((r, i) => ({
                rule: r.rule,
                domainName: (r['domain-name'] || []).join(', ') || '-',
                urlPath: r['url-path-exact'] ? ('精确: ' + r['url-path-exact'].join(', ')) : (r['url-path-begin'] ? ('开头: ' + r['url-path-begin'].join(', ')) : (r['url-path-end'] ? ('结尾: ' + r['url-path-end'].join(', ')) : '-')),
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
                <label class="form-label" title="压缩算法">压缩算法</label>
                <select v-model="editingService['compression-algorithm']" style="width: 200px;">
                  <option value="">不设置</option>
                  <option value="gzip">gzip</option>
                  <option value="deflate">deflate</option>
                  <option value="identity">identity</option>
                  <option value="raw-deflate">raw-deflate</option>
                </select>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">压缩算法</div>
              <div class="form-row">
                <label class="form-label" title="要压缩的MIME类型">MIME类型</label>
                <textarea v-model="editingService.compressionMimeText" rows="3" style="width: 300px; font-size: 12px;" placeholder="每行一个MIME类型, 如 text/html"></textarea>
              </div>
              <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">要压缩的MIME类型 (每行一个, 格式: type/subtype)</div>
            </div>
          </template>
        </TabGroup>
      </DraggableModal>

      <!-- 服务规则编辑弹窗 -->
      <DraggableModal v-model:visible="showServiceRuleModal" title="服务规则" width="600px" @ok="saveServiceRule">
        <div style="padding: 8px 0;">
          <div class="form-row">
            <label class="form-label">规则编号</label>
            <input type="number" v-model.number="editingServiceRule.rule" min="1" style="width: 100px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">规则编号</div>
          <div class="form-row">
            <label class="form-label">域名</label>
            <textarea v-model="editingServiceRule.domainNameText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个域名"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">匹配的域名 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">URL路径 (精确)</label>
            <textarea v-model="editingServiceRule.urlPathExactText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个路径"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">精确匹配的URL路径 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">URL路径 (开头)</label>
            <textarea v-model="editingServiceRule.urlPathBeginText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个路径"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">以...开头的URL路径 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">URL路径 (结尾)</label>
            <textarea v-model="editingServiceRule.urlPathEndText" rows="2" style="width: 300px; font-size: 12px;" placeholder="每行一个路径"></textarea>
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">以...结尾的URL路径 (每行一个)</div>
          <div class="form-row">
            <label class="form-label">设置后端</label>
            <input type="text" v-model="editingServiceRule['set-backend']" style="width: 200px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">重定向到的后端名称</div>
          <div class="form-row">
            <label class="form-label">重定向地址</label>
            <input type="text" v-model="editingServiceRule['set-redirect-location']" style="width: 300px;" />
          </div>
          <div style="margin-left: 162px; margin-top: -10px; margin-bottom: 14px; color: #999; font-size: 12px;">HTTP重定向目标地址</div>
        </div>
      </DraggableModal>
    </div>
  `,
  setup() {
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

      return lines.join('\n') || '# 暂无配置';
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

        await configStore.commit();
        await loadConfig();
        alert('保存成功');
      } catch (e) {
        alert('保存失败: ' + (e.message || e));
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
        alert('请输入后端名称');
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
      if (!confirm(`确定要删除后端 "${backend.name}" 吗？`)) return;
      backendList.value = backendList.value.filter(b => b.name !== backend.name);
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
        alert('请输入服务器名称');
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
        alert('请输入服务名称');
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
      if (!confirm(`确定要删除服务 "${service.name}" 吗？`)) return;
      serviceList.value = serviceList.value.filter(s => s.name !== service.name);
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
    });

    return {
      loading, activeTab, activeBackendTab, activeServiceTab,
      LOG_FACILITIES, LOG_LEVELS,
      globalConfig, timeoutConfig, backendList, serviceList,
      showBackendModal, showServiceModal, showServerModal, showBackendRuleModal, showServiceRuleModal,
      editingBackend, editingService, editingServer, editingBackendRule, editingServiceRule,
      commandPath, previewText,
      loadConfig, saveConfig,
      openBackendModal, saveBackend, deleteBackend,
      addServer, editServer, deleteServer, saveServer,
      addBackendRule, editBackendRule, deleteBackendRule, saveBackendRule,
      openServiceModal, saveService, deleteService,
      addServiceRule, editServiceRule, deleteServiceRule, saveServiceRule,
    };
  },
});
