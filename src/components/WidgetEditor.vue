
<template>
  <q-expansion-item
    :id="`${this.props.name}-editor`"
    class="column"
    clickable
    draggable="true"
    expand-separator
    @dragstart="onDragStart"
    @dragover="onDragOver"
    @dragend="onDragEnd"
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
      <q-item class="column editor">
        <q-item-section class="settings">
          <div class="label">
            <p>Settings</p>
            <q-item>
              <q-checkbox v-model="comment"/>
              <q-item-section>
                <q-item-label>Comment?</q-item-label>
                <q-item-label caption>Only visible if 'Show Comments' enabled</q-item-label>
              </q-item-section>
            </q-item>

          </div>
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
          <div class="preview-container">
            <svg class="preview-arrow-container"></svg>
            <div :id="this.props.name" :data-title="this.props.name" :style="this.style" v-html="this.compiledHtml" class='widget'></div>
          </div>
        </q-item-section>
      </q-item>
    </q-list>
  </q-expansion-item>  
</template>

<script>
import { ref } from 'vue'
import * as he from 'he'
import axios from 'axios'

export default {
  props:  {
    name: {
      type: String,
      required: true
    },

    is_group: {
      type: Boolean
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
  setup (props) {
    const rawHTML = ref("")
    const preview = ref(null)
    const previewSVG = ref(null)
    const fields = null
    const comment = ref(false)
    const commentArrow = ref({
      "start": {
        "HTMLNode": null,
        // "left": 0,
        // "top": 0
      },
      "end": {
        "HTMLNode": null,
        // "left": 0,
        // "top": 0
      },
      "line" : {
        "HTMLNode": null
      }
    })
    const style = ref("")
    const textEditors = {}

    return {
      props,
      preview,
      previewSVG,
      fields,
      comment,
      commentArrow,
      textEditors,
      rawHTML,
      style
    }
  },
  computed: {
    compiledHtml: function() {
      return this.rawHTML;
    },
    commentPointRadius: function() {
      return this.props.pageMetaData.commentPointRadius
    }
  },
  methods: {
    async loadFile(fileName) {
      axios({
        method: "get",
        url: ("/src/assets/widgets/" + fileName),
        responseType: 'document'
      })
      .then(result => {
        this.rawHTML = result.data.body.innerHTML
      })
      .then(() => this.addTextEditors())
      .catch(error => {
        console.error(`error getting file: ${error}`);
      });
    },
    // store the id of the draggable element
    onDragStart (e) {
      if (e.target.classList.contains('start-point') || e.target.classList.contains('end-point')) {
        var img = document.createElement("img");   
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

        e.dataTransfer.setDragImage(img, 0, 0);

        if (e.target.classList.contains('start-point')) {
          this.commentArrow.start.HTMLNode.classList.add('dragging')
          this.props.updateDragStatus({
              dragType: 'comment-line',
              draggedWidget: e.target,
              target: 'start',
              id: this.props.name
          })
        } else if (e.target.classList.contains('end-point')) {
          this.commentArrow.end.HTMLNode.classList.add('dragging')
          this.props.updateDragStatus({
              dragType: 'comment-line',
              draggedWidget: e.target,
              target: 'end',
              id: this.props.name,
          })
        }
      } else {
        const previewContainer = this.preview.offsetParent
        const previewRect = this.preview.getBoundingClientRect()

        const imageTop = previewContainer.offsetHeight / 2
        const imageLeft = previewContainer.offsetWidth / 2
        previewContainer.classList.add('dragging')
        e.dataTransfer.setDragImage(previewContainer, imageLeft, imageTop)
        e.dataTransfer.setData('id', this.preview.id)
        e.dataTransfer.setData('width', this.preview.offsetWidth)
        e.dataTransfer.setData('height', this.preview.offsetHeight)
        e.dataTransfer.dropEffect = 'move'
        
        this.props.updateDragStatus({
            dragType: 'adding',
            comment: this.comment ? this.commentArrow : false,
            draggedWidget: this.preview,
            edgeDistance: {
              top: this.preview.offsetHeight / 2,
              bottom: previewRect.height - this.preview.offsetHeight / 2,
              left: this.preview.offsetWidth / 2,
              right: previewRect.width - this.preview.offsetWidth / 2,
            }
        })
      }
    },

    onDragOver (e) {
      const dragStatus = this.props.dragStatus
      if (dragStatus.dragType === 'comment-line' && dragStatus.id === this.props.name) {
        const line = this.commentArrow.line.HTMLNode
        const cursorOffsetLeft = e.clientX - this.previewSVG.getBoundingClientRect().left
        const cursorOffsetTop = e.clientY - this.previewSVG.getBoundingClientRect().top
        


        switch (dragStatus.target) {
          case 'start':
            const startPoint = this.commentArrow.start.HTMLNode
            startPoint.style.left = `${cursorOffsetLeft - this.preview.offsetLeft - this.commentPointRadius}px`
            startPoint.style.top = `${cursorOffsetTop - this.preview.offsetTop - this.commentPointRadius}px`
            line.setAttributeNS(null, "x1", cursorOffsetLeft)
            line.setAttributeNS(null, "y1", cursorOffsetTop)
            break
          case 'end':
            const endPoint = this.commentArrow.end.HTMLNode
            endPoint.style.left = `${cursorOffsetLeft - this.commentPointRadius}px`
            endPoint.style.top = `${cursorOffsetTop - this.commentPointRadius}px`
            line.setAttributeNS(null, "x2", cursorOffsetLeft)
            line.setAttributeNS(null, "y2", cursorOffsetTop)
            break
        }
      }
    },

    onDragEnd (e) {
      this.props.resetDragStatus()
      e.target.classList.remove('dragging')
    },

    addTextEditors() {
      const textElements = this.preview.querySelectorAll("p, span, a, h1, h2, h3, h4, h5, h6")
      if (textElements.length > 0) {
        const textEditorHTML = document.createDocumentFragment()

        const textEditorContainer = document.createElement("div")
        textEditorContainer.classList.add("text-editors")
        textEditorHTML.appendChild(textEditorContainer)

        textElements.forEach((element, index) => {
          const inputElement = document.createElement("input")
          inputElement.dataset.id = index
          inputElement.value = element.innerHTML

          this.textEditors[index] = {
            "previewElement": element,
            "inputElement": inputElement
          }
          textEditorContainer.appendChild(inputElement)
        })

        textEditorContainer.addEventListener("change", event => {
          const preview = this.textEditors[event.target.dataset.id].previewElement
          preview.innerHTML = event.target.value
          this.rawHTML = this.preview.innerHTML
        })
        this.fields.appendChild(textEditorHTML)
      }


    }
  },
  created () {
    if (this.props.html.endsWith('.html')) {
      this.loadFile(this.props.html)
    } else {
      this.rawHTML = he.decode(this.props.html)
      
    }
  },
  mounted () {
    this.preview = document.getElementById(this.props.name)
    this.previewSVG = document.querySelector(`#${this.props.name}-editor .preview-arrow-container`)
    this.fields = document.querySelector(`#${this.props.name}-editor .fields`)
    if (!this.props.html.endsWith('.html')) {
      this.addTextEditors()
    }
  },
  watch: {
    comment (isComment) {
      if (isComment) {
        // render comments (start point, end point, line) on preview and dragimage
        const startPoint = document.createElement('div')
        startPoint.classList.add('start-point')
        startPoint.draggable = true
        startPoint.style.position = 'absolute'
        startPoint.style.width = `${2 * this.commentPointRadius}px`
        startPoint.style.left = `${-1 * this.commentPointRadius}px`
        startPoint.style.top = `${-1 * this.commentPointRadius}px`
        this.preview.appendChild(startPoint)
        this.commentArrow.start.HTMLNode = startPoint

        const endPoint = document.createElement('div')
        endPoint.classList.add('end-point')
        endPoint.draggable = true
        endPoint.style.position = 'absolute'
        endPoint.style.width = `${2 * this.commentPointRadius}px`
        endPoint.style.left = `${-1 * this.commentPointRadius}px`
        endPoint.style.top = `${-1 * this.commentPointRadius}px`
        this.preview.offsetParent.appendChild(endPoint)
        this.commentArrow.end.HTMLNode = endPoint

        const ns = "http://www.w3.org/2000/svg"
        // const previewSVG = document.createElementNS(ns, "svg")
        const line = document.createElementNS(ns, "line")
        line.classList.add('comment-line')
        line.setAttributeNS(null, "stroke", "blue")
        line.setAttributeNS(null, "x1", this.preview.offsetLeft + startPoint.offsetLeft + this.commentPointRadius)
        line.setAttributeNS(null, "y1", this.preview.offsetTop + startPoint.offsetTop + this.commentPointRadius)

        line.setAttributeNS(null, "x2", endPoint.offsetLeft + this.commentPointRadius)
        line.setAttributeNS(null, "y2", endPoint.offsetTop + this.commentPointRadius)
        
        this.previewSVG.appendChild(line)
        // line.style.position = 'absolute'
        // line.style.backgroundColor = 'blue'
        // line.style.height = '100%'
        // line.style.left = `${endPoint.offsetLeft}px`
        // Can later add arrowheads, but good/efficient algorithm for it can be hard to find
        

        // line.style.width = `${(this.preview.offsetLeft + startPoint.offsetLeft) - endPoint.offsetLeft}px`

        // line.style.bottom = `${endPoint.offsetTop + endPoint.offsetHeight}px`
        // line.style.top = `${this.preview.offsetTop + startPoint.offsetTop}px`
        // line.style.height = `${(endPoint.offsetTop + endPoint.offsetHeight) - (this.preview.offsetTop + startPoint.offsetTop)}px`
        
        this.commentArrow.line.HTMLNode = line
      } else {
        // unrender the things
        this.commentArrow.start.HTMLNode.remove()
        this.commentArrow.end.HTMLNode.remove()
        this.commentArrow.line.HTMLNode.remove()
      }
    }
  }
}
</script>
