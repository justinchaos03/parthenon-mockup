
<template>
  <q-expansion-item
    :id="`${this.props.title}-editor`"
    class="column"
    clickable
    draggable="true"
    expand-separator
    @dragstart="onDragStart"
  >
    <template v-slot:header>
      <div class="label row items-center no-wrap">
        <q-icon avatar v-if="this.props.icon" left :name="this.props.icon" />
        <div>
          <h4>{{ this.props.title }}</h4>
          <p caption>{{ this.props.caption }}</p>
        </div>
      </div>
    </template>
    <q-list>
      <q-item class="column editor">
        <q-item-section class="settings">
          <p class="label">Settings</p>
          <div class="fields">
            <!-- <div>
              {{ this.props.settings }}
            </div> -->
            <q-input
              filled
              v-model="this.style"
              type="textarea"
              label="Style" 
              label-color="black"
              placeholder='Make sure to separate styles with ";"'
              hint="Overrides other settings"
            />
          </div>
        </q-item-section>
        <q-item-section class="preview">
          <p class="label">Preview</p>
          <div>
            <div :id="this.props.title" :data-title="this.props.title"  :style="this.style" v-html="this.compiledHtml"></div>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-expansion-item>
  <div :id="`${this.props.title}-preview`" class="drag-image" v-html="this.compiledHtml" :style="this.style"></div>
</template>

<script>
import { ref } from 'vue';
import axios from 'axios';

export default {
  props:  {
    title: {
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

    html: {
      type: String,
      default: ''
    },

    settings: {
      type: Object,
      default: new Object()
    },

    updateDragStatus: {
      type: Function
    },
  },
  setup (props) {
    const rawHTML = ref("")
    const preview = ref(null)
    const previewDragImage = ref(null)
    const style = ref("")

    return {
      props,
      preview,
      previewDragImage,
      rawHTML,
      style
    }
  },
  computed: {
    compiledHtml: function() {
      return this.rawHTML;
    }
  },
  methods: {
    loadFile(fileName) {
      axios({
        method: "get",
        url: ("/src/assets/widgets/" + fileName),
        responseType: 'document'
      })
      .then(result => {
        this.rawHTML = result.data.body.innerHTML;
      })
      .catch(error => {
        console.error("error getting file");
      });
    },
    // store the id of the draggable element
    onDragStart (e) {
      e.dataTransfer.setDragImage(this.previewDragImage, 10, 10)
      e.dataTransfer.setData('id', this.preview.id)
      e.dataTransfer.setData('width', this.preview.offsetWidth)
      e.dataTransfer.setData('height', this.preview.offsetHeight)
      e.dataTransfer.dropEffect = 'move'
      const previewRect = this.preview.getBoundingClientRect()
      this.props.updateDragStatus({
          dragType: 'adding',
          draggedWidget: this.preview,
          edgeDistance: {
            top: 10,
            bottom: previewRect.height -10,
            left: 10,
            right: previewRect.width - 10,
          }
      })
    }
  },
  created () {
    if (this.props.html.endsWith('.html')) {
      this.loadFile(this.props.html)
    } else {
      this.rawHTML = this.props.html
    }
    
  },
  mounted () {
    this.preview = document.getElementById(this.props.title)
    this.previewDragImage = document.getElementById(this.props.title + "-preview")
  }
}
</script>
