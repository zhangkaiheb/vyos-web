import { defineComponent, computed, inject } from '/src/utils/vue-import.js';

export default defineComponent({
  name: 'SourceDestMatchCards',
  props: {
    groupType: { type: String, default: 'address' },
    groupValue: { type: String, default: '' },
    addressValue: { type: String, default: '' },
    macValue: { type: String, default: '' },
    portGroupValue: { type: String, default: '' },
    title: { type: String, default: '' },
    groupOptions: { type: Array, default: () => [] },
    placeholder: { type: String, default: '' },
    macPlaceholder: { type: String, default: '' },
    portGroupPlaceholder: { type: String, default: '' },
    disabled: { type: Boolean, default: false },
    addressGroupOptions: { type: Array, default: () => [] },
    networkGroupOptions: { type: Array, default: () => [] },
    domainGroupOptions: { type: Array, default: () => [] },
    macGroupOptions: { type: Array, default: () => [] },
    portGroupOptions: { type: Array, default: () => [] },
  },
  emits: ['update:groupType', 'update:groupValue', 'update:addressValue', 'update:macValue', 'update:portGroupValue'],
  setup(props, { emit }) {
    const { t } = inject('i18n');
    const selectedType = computed({
      get: () => props.groupType,
      set: (val) => {
        emit('update:groupType', val);
      },
    });

    const addressInput = computed({
      get: () => props.addressValue,
      set: (val) => emit('update:addressValue', val),
    });

    const groupInput = computed({
      get: () => props.groupValue,
      set: (val) => emit('update:groupValue', val),
    });

    const macInput = computed({
      get: () => props.macValue,
      set: (val) => emit('update:macValue', val),
    });

    const portGroupInput = computed({
      get: () => props.portGroupValue,
      set: (val) => emit('update:portGroupValue', val),
    });

    function getGroupOptionsForType(type) {
      let options = [];
      switch (type) {
        case 'address-group': options = props.addressGroupOptions; break;
        case 'network-group': options = props.networkGroupOptions; break;
        case 'domain-group': options = props.domainGroupOptions; break;
        default: return [];
      }
      // Include current value if not in options (for edit mode)
      if (props.groupValue && selectedType.value === type && !options.includes(props.groupValue)) {
        options = [props.groupValue, ...options];
      }
      return options;
    }

    function getMacOptions() {
      let options = props.macGroupOptions;
      if (props.macValue && !options.includes(props.macValue)) {
        options = [props.macValue, ...options];
      }
      return options;
    }

    function getPortOptions() {
      let options = props.portGroupOptions;
      if (props.portGroupValue && !options.includes(props.portGroupValue)) {
        options = [props.portGroupValue, ...options];
      }
      return options;
    }

    return { selectedType, addressInput, groupInput, macInput, portGroupInput, getGroupOptionsForType, getMacOptions, getPortOptions, t };
  },
  template: `
    <div style="border:1px solid #d9d9d9; border-radius:4px; overflow:hidden; margin-bottom:16px;">
      <div style="background:#f5f5f5; padding:10px 16px; font-size:14px; border-bottom:1px solid #d9d9d9;">{{ title }}</div>
      <div style="padding:16px 16px 16px 24px;">
        <div
          v-for="opt in groupOptions"
          :key="opt.value"
          style="display:flex; align-items:center; margin-bottom:10px; gap:8px;"
          @click="!disabled && (selectedType = opt.value)"
        >
          <label style="cursor:pointer; display:flex; align-items:center; gap:6px; white-space:nowrap; min-width:70px;">
            <input
              type="radio"
              :name="'match-' + opt.value"
              :value="opt.value"
              :checked="selectedType === opt.value"
              :disabled="disabled"
              @click.stop="!disabled && (selectedType = opt.value)"
            />
            <span>{{ opt.label }}</span>
          </label>
          <div v-if="opt.value === 'address'" style="flex:1; display:flex; align-items:center;">
            <input
              type="text"
              :placeholder="placeholder"
              :value="addressInput"
              :disabled="disabled || selectedType !== opt.value"
              style="flex:1; border:1px solid #d9d9d9; border-radius:2px; padding:5px 8px; font-size:13px; outline:none; margin:0; background:#fff;"
              @input="selectedType === opt.value && (addressInput = $event.target.value)"
              @click.stop
            />
          </div>
          <div v-else style="flex:1; display:flex; align-items:center;">
            <select
              :value="selectedType === opt.value ? groupInput : ''"
              :disabled="disabled || selectedType !== opt.value"
              style="flex:1; border:1px solid #d9d9d9; border-radius:2px; padding:5px 8px; font-size:13px; outline:none; background:#fff; margin:0;"
              @change="selectedType === opt.value && (groupInput = $event.target.value)"
              @click.stop
            >
              <option value="">{{ t('sourceDest.selectGroupName', { type: opt.label }) }}</option>
              <option v-for="g in getGroupOptionsForType(opt.value)" :key="g" :value="g">{{ g }}</option>
            </select>
          </div>
        </div>
        <div style="display:flex; align-items:center; margin-bottom:10px; gap:8px;">
          <label style="display:flex; align-items:center; gap:6px; white-space:nowrap; min-width:70px;">{{ t('sourceDest.macGroup') }}</label>
          <select
            :value="macInput"
            :disabled="disabled"
            :style="{ flex:1, border:'1px solid #d9d9d9', borderRadius:'2px', padding:'5px 8px', fontSize:'13px', outline:'none', background:'#fff', margin:0, color: !macInput ? '#999' : '#333' }"
            @change="macInput = $event.target.value"
          >
            <option value="" style="color:#999;">{{ t('sourceDest.selectMacGroup') }}</option>
            <option v-for="g in getMacOptions()" :key="g" :value="g" style="color:#333;">{{ g }}</option>
          </select>
        </div>
        <div style="display:flex; align-items:center; margin-bottom:10px; gap:8px;">
          <label style="display:flex; align-items:center; gap:6px; white-space:nowrap; min-width:70px;">{{ t('sourceDest.portGroup') }}</label>
          <select
            :value="portGroupInput"
            :disabled="disabled"
            :style="{ flex:1, border:'1px solid #d9d9d9', borderRadius:'2px', padding:'5px 8px', fontSize:'13px', outline:'none', background:'#fff', margin:0, color: !portGroupInput ? '#999' : '#333' }"
            @change="portGroupInput = $event.target.value"
          >
            <option value="" style="color:#999;">{{ t('sourceDest.selectPortGroup') }}</option>
            <option v-for="g in getPortOptions()" :key="g" :value="g" style="color:#333;">{{ g }}</option>
          </select>
        </div>
      </div>
    </div>
  `,
});
