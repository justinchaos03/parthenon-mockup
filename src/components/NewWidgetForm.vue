<template>
  <q-dialog
    v-model="this.props.isOpen"
    persistent
    :position="'left'"
  >
    <q-card>
      <q-bar>
        <q-icon name="network_wifi" />
        <q-icon name="network_cell" />
        <q-icon name="battery_full" />
        <div>9:34</div>

        <q-space />

        <q-btn dense flat icon="close" @click="closeNewWidgetForm">
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section>
        <q-form ref="form" @submit="submitNewWidgetForm" @reset="resetNewWidgetForm">
          <template v-if="this.props.showGroup !== undefined">
            <q-input
              filled 
              :model-value="this.group"
              @update:model-value="this.group=$event; this.$emit('updateGroup', $event)"
              label="Group (Optional)"
              label-color="black"
              :placeholder="this.props.showNewGroupForm !== undefined ? 'Creates new group if it does not exist yet' : null"
              hint="Leave blank to create top-level widget uncategorized beneath a group"
              :dense="true"
              :debounce="this.props.showNewGroupForm !== undefined ? '500': null"

            />
            <template v-if="this.group.length > 0">
              <template v-if="this.props.showNewGroupForm">
              <q-input
                filled 
                v-model="this.groupIcon"
                label="Group Icon (optional)"
                label-color="black"
                hint="Icon name from quasar icon library"
                :dense="true"
              />
              <q-input
                filled 
                v-model="this.groupCaption"
                label="Group Caption (optional)"
                label-color="black"
                hint="More details about the new group"
                :dense="true"
              />
            </template>
            <p v-else>Adding to existing group</p>
            </template>
          </template>
          <q-input
            filled 
            v-model="this.title"
            label="Widget Name"
            label-color="black"
            placeholder="Widget names must be unique"
            :rules="[val => !!val || 'Field is required']"
            :dense="true"
          />
          <q-input
            filled 
            v-model="this.icon"
            label="Icon (Optional)"
            label-color="black"
            hint="Icon name from quasar icon library"
            :dense="true"
          />
          <q-input
            filled 
            v-model="this.caption"
            label="Widget Caption (Optional)"
            label-color="black"
            hint="More details about the widget"
            :dense="true"
          />
          <q-input
            filled 
            v-model="this.HTML"
            type="textarea"
            label="HTML"
            label-color="black"
            placeholder="Widget will automatically be wrapped in a Div element"
            hint="HTML template for the widget"
            :dense="true"
          />
          <q-btn label="Create New Widget" type="submit" color="primary"/>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>
<script>
import { ref } from 'vue';

export default {
  props: {
    isOpen: {
      type: Boolean,
      required: true,
    },
    showGroup: {},
    showNewGroupForm: {
      type: Boolean,
      default: undefined
    }
  },
  emits: ['submit', 'close', 'updateGroup'],
  setup (props) {
    const form = ref(null)
    const group = ref("")
    const groupIcon = ref("")
    const groupCaption = ref("")
    const title = ref("")
    const icon = ref("")
    const caption = ref("")
    const HTML = ref("")

    return {
      props,
      form,
      group,
      groupIcon,
      groupCaption,
      title,
      icon,
      caption,
      HTML
    }
  },
  methods: {
    submitNewWidgetForm () {
      this.$emit('submit',{ 
        'group': this.group,
        'groupIcon': this.groupIcon,
        'groupCaption': this.groupCaption,
        'title': this.title,
        'icon': this.icon,
        'caption': this.caption,
        'HTML': this.HTML 
      })
      this.closeNewWidgetForm()
    },
    resetNewWidgetForm () {
      this.group = ""
      this.title = ""
      this.icon = ""
      this.caption = ""
      this.HTML = ""
    },
    closeNewWidgetForm () {
      this.$emit('close')
      this.resetNewWidgetForm()
    }
  }
}
</script>