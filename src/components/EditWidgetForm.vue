<template>
  <q-dialog
    v-model="this.props.isOpen"
    persistent
  >
    <q-card>
      <q-bar>
        <q-icon name="network_wifi" />
        <q-icon name="network_cell" />
        <q-icon name="battery_full" />
        <div>Edit {{ this.props.widget?.dataset.title }}</div> 
        <!-- Widget type -->
        <q-space />

        <q-btn dense flat icon="close" @click="closeEditWidgetForm">
          <q-tooltip>Close</q-tooltip>
        </q-btn>
      </q-bar>

      <q-card-section>
        <q-form id="edit-widget-form" ref="form" @submit="submitEditWidgetForm" @reset="resetEditWidgetForm">
          <q-input
            filled 
            v-model="this.style"
            type="textarea"
            label="Style"
            label-color="black"
            placeholder="Widget in-line styling here"
            hint="Update style for widget"
            :dense="true"
          />
        </q-form>
        <div class="buttons">
          <q-btn label="Update Widget" type="submit" form="edit-widget-form" color="primary"/>
          <q-btn label="Delete Widget" @click="deleteEditWidgetForm"/>
        </div>
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

    widget: {
      type: Object,
      required: true
    }
  },
  emits: ['submit', 'close', 'delete'],
  setup (props) {
    const form = ref(null)
    const style = ref("")

    return {
      props,
      form,
      style
    }
  },
  methods: {
    submitEditWidgetForm () {
      this.$emit('submit', {
        'style': this.style
      })
      this.closeEditWidgetForm()
    },
    deleteEditWidgetForm () {
      this.$emit('delete')
    },
    resetEditWidgetForm () {
      this.style = ""
    },
    closeEditWidgetForm () {
      this.$emit('close')
    }
  }, 
  watch: {
    'props.widget' (newWidget, oldWidget) {
      this.style = newWidget.style.cssText
    }
  }
}
</script>