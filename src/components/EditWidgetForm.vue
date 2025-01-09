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
          <div class="text-editors">
            <q-input
              v-for="(element, index) in textElements"
              :key="index"
              :data-id="index"
              v-model="element.innerHTML"
            />
          </div>
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
import { TouchSwipe } from 'quasar';
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
    const textElements = {}

    return {
      props,
      form,
      style,
      textElements
    }
  },
  methods: {
    submitEditWidgetForm () {
      this.$emit('submit', {
        'style': this.style
      })
      this.props.widget.style = values.style
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
    'props.widget' (newWidget) {
      this.style = this.props.widget.style.cssText
      
      const textElementMapping = {}
      const textElements = newWidget.querySelectorAll("p, span, a, h1, h2, h3, h4, h5, h6")
      
      if (textElements.length > 0) {
        textElements.forEach((element, index) => textElementMapping[index] = element); 
      }

      this.textElements = textElementMapping
    }
  }
}
</script>