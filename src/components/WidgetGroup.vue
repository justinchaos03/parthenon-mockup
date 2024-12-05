<template>
  <q-expansion-item
      :id="this.props.groupName"
      clickable
      expand-separator
      :content-inset-level="0.25"
    >
    <template v-slot:header>
      <div class="label row items-center no-wrap">
        <q-icon avatar v-if="this.props.icon" left :name="this.props.icon" />
        <div>
          <h4>{{ this.props.groupName }}</h4>
          <p caption>{{ this.props.caption }}</p>
        </div>
      </div>
    </template>
    <q-list>
      <WidgetEditor
        v-for="widget in this.props.widgets"
        :key="widget.title"
        v-bind="widget"
        :updateDragStatus="this.updateDragStatus"
      />
    </q-list>
  </q-expansion-item>
</template>

<script>
import WidgetEditor from '../components/WidgetEditor.vue'

export default {
  props:  {
    groupName: {
      type: String,
      required: true
    },

    caption: {
      type: String,
      default: ''
    },

    icon: {
      type: String,
      default: ''
    },

    widgets: {
      type: Array,
      default: new Array()
    },

    updateDragStatus: {
      type: Function
    }
  },
  components: {
    WidgetEditor
  },
  setup (props) {

    return {
      props
    }
  }
}
</script>
