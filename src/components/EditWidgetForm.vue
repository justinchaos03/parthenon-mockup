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
    const watchedStyles = {
      "top": null,
      "left": null
    }
    const updatedWatchedStyles = []



    return {
      props,
      form,
      style,
      textElements,
      watchedStyles,
      updatedWatchedStyles
    }
  },
  methods: {
    submitEditWidgetForm () {

      this.props.widget.style = this.style
      Object.keys(this.watchedStyles).forEach(styleTag => {
        const submittedStyleValue = this.props.widget.style[styleTag]
        if (this.watchedStyles[styleTag] !== submittedStyleValue) {
          this.updatedWatchedStyles.push(styleTag)
        }
      })

      this.$emit('submit', {
        'style': this.style,
        'HTML': this.innerHTML,
        'updatedWatchedStyles': this.updatedWatchedStyles
      })
      console.log(this.updatedWatchedStyles)
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
    'props.isOpen' (isOpen) {
      if (isOpen) {
        this.style = this.props.widget.style.cssText

        Object.keys(this.watchedStyles).forEach(styleTag => {
          const originalStyleValue = this.props.widget.style[styleTag]
          if (originalStyleValue) {
            this.watchedStyles[styleTag] = originalStyleValue
          }
        })

        this.updatedWatchedStyles = []
      }
    },
    'props.widget' (newWidget) {
      const editableTextNodes = ["p", "span", "a", "h1", "h2", "h3", "h4", "h5", "h6"]
      const editableTextQuery = editableTextNodes.join(", ")
      const textElementMapping = {}
      const widgetContentNodes = Array.from(newWidget.children).filter(child => !child.classList.contains('start-point') && !child.classList.contains('widget'))
      widgetContentNodes.forEach((node, index) => {
        const contentNodeIsText = editableTextNodes.includes(node.tagName.toLowerCase())
        if (contentNodeIsText) {
          textElementMapping[`${index}-0`] = node
        }

        node.querySelectorAll(editableTextQuery).forEach((subNode, subIndex) => textElementMapping[`${index}-${subIndex + contentNodeIsText}`] = subNode)
      })

      this.textElements = textElementMapping
    }
  }
}
</script>