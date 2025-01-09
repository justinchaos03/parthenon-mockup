<template>
  <q-expansion-item
      :id="this.props.name"
      clickable
      expand-separator
      :content-inset-level="0.25"
    >
    <template v-slot:header>
      <div class="label row items-center no-wrap">
        <q-icon avatar v-if="this.props.icon" left :name="this.props.icon" />
        <div>
          <h4>{{ this.props.name }}</h4>
          <p caption>{{ this.props.caption }}</p>
        </div>
      </div>
    </template>
    <q-list>
      <WidgetEditor
        v-for="(widget, name) in this.props.widgets"
        :key="name"
        :name="name"
        v-bind="widget"
        :dragStatus="this.dragStatus"
        :updateDragStatus="this.updateDragStatus"
        :resetDragStatus="this.resetDragStatus"
        :toolbarOptions="this.props.toolbarOptions"
        :pageMetaData="this.props.pageMetaData"
      />
    </q-list>
  </q-expansion-item>
</template>

<script>
import WidgetEditor from '../components/WidgetEditor.vue'

export default {
  props:  {
    name: {
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
      type: Object,
      default: new Object()
    },

    dragStatus: {
      type: Object
    },

    updateDragStatus: {
      type: Function
    },

    resetDragStatus: {
      type: Function
    },

    toolbarOptions: {
      type: Object
    },

    pageMetaData: {
      type: Object
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
