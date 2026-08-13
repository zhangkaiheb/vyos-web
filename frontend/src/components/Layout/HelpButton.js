import { defineComponent, ref, watch, computed, inject } from '/src/utils/vue-import.js';
import DraggableModal from '/src/components/Modal/DraggableModal.js';

const LANGS = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
  { code: 'ru', label: 'Русский' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ko', label: '한국어' },
];

function getDefaultLang() {
  const locale = localStorage.getItem('locale') || 'zh-CN';
  if (locale.startsWith('zh')) return 'zh';
  if (locale.startsWith('ru')) return 'ru';
  if (locale.startsWith('fr')) return 'fr';
  if (locale.startsWith('de')) return 'de';
  return 'en';
}

export default defineComponent({
  name: 'HelpButton',
  props: {
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    routePath: { type: String, default: '' },
  },
  setup(props) {
    const { t } = inject('i18n');
    const visible = ref(false);
    const loaded = ref('');
    const format = ref('md');
    const loading = ref(false);
    const error = ref('');
    const lang = ref(getDefaultLang());
    const showLangMenu = ref(false);

    async function loadHelp() {
      if (!props.routePath) return;
      loading.value = true;
      error.value = '';
      try {
        const token = localStorage.getItem('vyos_token') || '';
        const headers = { 'Authorization': `Bearer ${token}` };
        const res = await fetch(`/api/help?path=${encodeURIComponent(props.routePath)}&lang=${lang.value}`, { headers });
        const json = await res.json().catch(() => ({}));
        if (res.ok && json.success) {
          loaded.value = json.content || '';
          format.value = json.format || 'md';
        } else {
          loaded.value = '';
          error.value = json.message || t('help.loadFailed');
        }
      } catch (e) {
        loaded.value = '';
        error.value = e.message;
      } finally {
        loading.value = false;
      }
    }

    watch(visible, (v) => {
      if (v) { loadHelp(); showLangMenu.value = false; }
    });

    function switchLang(l) {
      lang.value = l;
      showLangMenu.value = false;
      loadHelp();
    }

    const currentLangLabel = computed(() => {
      const l = LANGS.find(x => x.code === lang.value);
      return l ? l.label : 'English';
    });

    const displayContent = computed(() => {
      let content = props.content || loaded.value;
      if (format.value === 'html' && content) {
        const styles = [];
        content = content.replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, (_, css) => {
          styles.push(css);
          return '';
        });
        content = content
          .replace(/<!DOCTYPE\s+html[^>]*>/gi, '')
          .replace(/<html[^>]*>/gi, '').replace(/<\/html>/gi, '')
          .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
          .replace(/<body[^>]*>/gi, '').replace(/<\/body>/gi, '');
        if (styles.length) {
          const scoped = styles.map(s => {
            let scoped = s.replace(/body\s*\{/g, '.help-html-content {');
            scoped = scoped.replace(/\b(h1|h2|h3|h4|h5|h6|p|ul|ol|li|table|th|td|pre|code|a|hr|strong|em|blockquote)\s*\{/g, '.help-html-content $1 {');
            return scoped;
          }).join('\n');
          content = `<style>${scoped}</style>` + content;
        }
      }
      return content;
    });

    return { visible, loading, error, displayContent, format, lang, LANGS, showLangMenu, switchLang, currentLangLabel, t };
  },
  template: `
    <button class="help-btn" @click="visible = true" :title="t('help.title')">?</button>
    <DraggableModal v-model:visible="visible" :title="title || t('help.title')" hide-footer>
      <div v-if="loading" style="padding:20px;text-align:center;">{{ t('help.loading') }}</div>
      <div v-else-if="error" style="color:red;">{{ error }}</div>
      <div v-else>
        <div class="help-lang-bar">
          <div class="help-lang-switcher" @click="showLangMenu = !showLangMenu">
            {{ currentLangLabel }} ▾
          </div>
          <div v-if="showLangMenu" class="help-lang-menu">
            <div v-for="l in LANGS" :key="l.code"
                 class="help-lang-item"
                 :class="{ active: l.code === lang }"
                 @click="switchLang(l.code)">
              {{ l.label }}
            </div>
          </div>
        </div>
        <div v-if="format === 'html'" v-html="displayContent" class="help-html-content"></div>
        <pre v-else style="white-space:pre-wrap;">{{ displayContent || t('help.noDoc') }}</pre>
      </div>
    </DraggableModal>
  `,
  components: { DraggableModal },
});
