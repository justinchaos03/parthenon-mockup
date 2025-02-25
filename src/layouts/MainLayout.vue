<template>
  <q-layout view="lHh Lpr lFf"
    @dragend="onDragEnd"
  >
    <q-header elevated>
      <q-toolbar>
        <q-btn
          flat
          dense
          round
          icon="menu"
          aria-label="Menu"
          @click="this.leftDrawerOpen = !this.leftDrawerOpen"
        />

        <q-toolbar-title>
          Quasar App
        </q-toolbar-title>

        <q-item>
          <q-form id="upload-canvas-form" ref="form" @submit="this.importCanvas">
            <q-file clearable filled color="purple-12" v-model="this.uploadedCanvas" label="Import Canvas File"></q-file>
            <q-btn label="Upload Canvas" type="submit" form="upload-canvas-form" color="primary"/>
          </q-form>
        </q-item>
        <q-item>
          <q-btn color="black" text-color="white" label="Export" @click="this.exportCanvas"></q-btn>
        </q-item>

        <q-btn-dropdown stretch flat label="Display Settings">
          <q-list>
            <q-item>
              <q-toggle
                v-model="this.toolbarOptions.showGrid"
                checked-icon="check"
                color="black"
                keep-color
                label="Show Grid"
                left-label
                unchecked-icon="clear"
              />
            </q-item>
          </q-list>
        </q-btn-dropdown>
      </q-toolbar>
    </q-header>

    <img id="comment-point-image" :style="{width: this.commentPointRadius * 2 + 4 + 'px'}"/>
    <q-drawer
      id="widget-list"
      v-model="leftDrawerOpen"
      show-if-above
      bordered
    >
      <q-list>
        <q-item-label
          header
        >
          Widgets
        </q-item-label>
        <template v-for="(widget, name) in widgetStructure" :key="name">
          <WidgetGroup 
            v-if="widget.is_group"
            v-bind="widget"
            :name="name"
            :dragStatus="this.dragStatus"
            :updateDragStatus="this.updateDragStatus"
            :resetDragStatus="this.resetDragStatus"
            :toolbarOptions="this.toolbarOptions"
            :pageMetaData="this.pageMetaData"
          />
          <WidgetEditor
            v-else
            v-bind="widget"
            :name="name"
            :dragStatus="this.dragStatus"
            :updateDragStatus="this.updateDragStatus"
            :resetDragStatus="this.resetDragStatus"
            :toolbarOptions="this.toolbarOptions"
            :pageMetaData="this.pageMetaData"
          />
        </template>
        <q-btn
          color="primary"
          icon="mail"
          label="Add Widget"
          @click="this.newWidgetFormOpen = true"
        />
        <NewWidgetForm
          :isOpen="this.newWidgetFormOpen"
          showGroup
          :showNewGroupForm="this.showNewGroupForm"
          @submit="submitNewWidgetForm"
          @close="this.newWidgetFormOpen = false"
          @updateGroup="groupName => {this.showNewGroupForm = !widgetGroupExists(groupName, errorMessage = false);}"
        />
        <EditWidgetForm
          :isOpen="this.editWidgetFormOpen"
          :widget="this.currentlyEditedWidget"
          @submit="submitEditWidgetForm"
          @delete="deleteWidget(this.currentlyEditedWidget.dataset.widgetId); this.editWidgetFormOpen = false"
          @close="this.editWidgetFormOpen = false"
        />
      </q-list>
    </q-drawer>

    <q-page-container>
      <router-view 
      :toolbarOptions="this.toolbarOptions"
      :pageWidgets="this.currentPageWidgets"
      :pageMetaData="this.pageMetaData"
      :virtualCanvas="this.currentPageVirtualCanvas"
      :dragStatus="this.dragStatus"
      :updateDragStatus="this.updateDragStatus"
      :resetDragStatus="this.resetDragStatus"
      :addWidget="this.addWidget"
      :userStyling="this.userStyling"
      :restoreUserStyling="this.restoreUserStyling"
      :tooltip="this.tooltip"
      :drawCommentLine="this.drawCommentLine"
      :getAbsolutePosition="this.getAbsolutePosition"
      @mounted="onCanvasMount"/>
    </q-page-container>
    <p id="page-tooltip"></p>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import axios from 'axios'
import * as he from 'he';
import WidgetEditor from '../components/WidgetEditor.vue'
import WidgetGroup from '../components/WidgetGroup.vue'
import NewWidgetForm from '../components/NewWidgetForm.vue'
import EditWidgetForm from '../components/EditWidgetForm.vue'
import app from '../js/app.js'
import * as helperFunction from '../js/helper-functions.js'



export default defineComponent ({
  name: 'MainLayout',
  setup () {
    const widgetStructure = ref([])
    const widgetGroupDict = ref({})
    const widgetItemDict = ref({})
    const pageMetaData = ref({
      commentPointRadius: 6
    })

    // Dictionary of widgets created or added to by user
    const addedWidgetEditors = ref({})

    const pageWidgets = ref({
      'home': {
        widgetId: 0,
        widgets: {}
      }
    })

    const uploadedCanvas = ref(null)
    // Store page structure for import/export
    const virtualCanvas = ref({
      'home': {
        idMap: {},
        elements: {}
      }
    })
    const importCode = ref("")

    // State variables for toggling modals & menus
    const leftDrawerOpen = ref(false)

    const newWidgetFormOpen = ref(false)
    const showNewGroupForm = ref(false)

    const editWidgetFormOpen = ref(false)
    const currentlyEditedWidget = ref({})

    const toolbarOptions = ref({
      showGrid: false,
    })

    const dragStatus = ref({
      dragType: null,
      draggedWidget: null,
      edgeDistance: null,
    })


    // Store user-inputted styles temporarily when overriding
    const userStyling = ref({})

    const tooltip = ref(null)

    const canvasSVG = ref(null)

    return {
      widgetStructure,
      widgetItemDict,
      widgetGroupDict,
      addedWidgetEditors,
      pageWidgets,
      pageMetaData,
      uploadedCanvas,
      virtualCanvas,
      importCode,
      leftDrawerOpen,
      newWidgetFormOpen,
      showNewGroupForm,
      editWidgetFormOpen,
      currentlyEditedWidget,
      toolbarOptions,
      dragStatus,
      userStyling,
      tooltip,
      canvasSVG
    }
  },
  components: {
    WidgetEditor,
    WidgetGroup,
    NewWidgetForm,
    EditWidgetForm
  },
  methods: {
    async exportCanvas () {
      const exportJson = {
        "addedWidgetEditors": {},
        "virtualDOM" : []
      }

      Object.entries(this.addedWidgetEditors).forEach(([name, data]) => {
        exportJson.addedWidgetEditors[name] = data
      })
      exportJson.virtualDOM = JSON.stringify(this.currentPageVirtualCanvas.elements)


      const JsonURI = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportJson));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute('href', JsonURI);
      downloadAnchorNode.setAttribute('download', 'canvas.json');
      document.body.appendChild(downloadAnchorNode)
      downloadAnchorNode.click();

      const HTML = document.implementation.createHTMLDocument("Canvas")
      HTML.body.innerHTML = document.getElementById("page-container").innerHTML
      HTML.querySelectorAll(".page-box").forEach(box => box.remove())
      const style = HTML.createElement("style")
      style.textContent = Object.values(document.styleSheets[3].cssRules).map(rule => rule.cssText).join(' ')
      HTML.head.appendChild(style)

      const script = document.createElement('script')
      script.innerHTML = app.toString().replace(/(^[a-zA-Z]((.)*){)|(}$)/gm, '')
      HTML.body.appendChild(script)
  
      const canvasHTML = 'data:text/html;charset=UTF-8,' + encodeURIComponent(HTML.documentElement.innerHTML)
      downloadAnchorNode.setAttribute('href', canvasHTML);
      downloadAnchorNode.setAttribute('download', 'canvas.HTML');
      downloadAnchorNode.click();
      
      downloadAnchorNode.remove();
    },

    async importCanvas () {
      if (this.uploadedCanvas) {
        await this.uploadedCanvas.text().then(data => { 
          const result = JSON.parse(data)
          const currentPage = document.getElementById('grid-container')
          const fragment = document.createDocumentFragment()
          const parentNodes = JSON.parse(result.virtualDOM)
          Object.values(parentNodes).forEach(node => this.importWidget(node, fragment, [0, 0]))
          currentPage.appendChild(fragment)

          Object.entries(result.addedWidgetEditors).forEach(([name, data]) => {
            if (data.is_group) {
              if (!this.widgetGroupExists(name)) {
                this.widgetGroupDict[name] = data
                this.widgetStructure[name] = data
              }
              Object.entries(data.widgets).forEach(([widgetName, widgetData])=> {
                this.widgetItemDict[widgetName] = widgetData
                this.widgetStructure[name].widgets[widgetName] = widgetData
              })
            } else {
              this.widgetItemDict[name] = data
              this.widgetStructure[name] = data
            }
          })
        })
      }
    },

    widgetItemExists (title, errorMessage = true) {
      if (Object.hasOwn(this.widgetItemDict, title)) {
        
        if (errorMessage) {
          console.error(`Widget Item with id ${title} already defined! Skipping...`)
        }
        return true
      } else {
        return false
      }
    },
    widgetGroupExists (groupName, errorMessage = true) {
      if (Object.hasOwn(this.widgetGroupDict, groupName)) {
        if (errorMessage) {
          console.error(`Widget Group with id ${groupName} already defined! Skipping...`)
        }
        return true
      } else {
        return false
      }
    },
    getWidgets () {
      axios({
        method: "get",
        url: ("/src/assets/widgets/widgets.json"),
        responseType: 'json'
      })
      .then(result => {
        this.widgetStructure = result.data
        const widgetItemDict = {}
        const widgetGroupDict = {}
        Object.entries(this.widgetStructure).forEach(([name, data]) => {
          if (data.is_group) {
            if (!this.widgetGroupExists(name)) {
              widgetGroupDict[name] = data
              Object.entries(data.widgets).forEach(([widgetName, widgetData]) => {
                if (!this.widgetItemExists(widgetName)) {
                  widgetItemDict[widgetName] = widgetData
                }
              })
            }
          } else {
            if (!this.widgetItemExists(name)) {
              widgetItemDict[name] = data
            }
          }
        })

        this.widgetItemDict = widgetItemDict
        this.widgetGroupDict = widgetGroupDict
      })
      .catch(error => {
        console.error(`error getting file '/src/assets/widgets/widgets.json': ${error}`);
      })
    },

    addWidgetEditor (newWidget) {
      if (newWidget.title && newWidget.title.length > 0) {
        const newWidgetJson = {
          "caption": newWidget.caption ?? "",
          "icon": newWidget.icon ?? "",
          "html": he.encode(newWidget.HTML),
          "settings": []
        }
        if (newWidget.group && newWidget.group.length > 0) {
          try {
            const newWidgetGroup = this.widgetGroupDict[newWidget.group]
            newWidgetGroup.widgets[newWidget.title] = newWidgetJson

            if (!(newWidget.group in this.addedWidgetEditors)) {
              this.addedWidgetEditors[newWidget.group] = {
                "is_group": true,
                "caption": newWidgetGroup.caption,
                "icon": newWidgetGroup.icon,
                "widgets": {}
              }
            }
            this.addedWidgetEditors[newWidget.group].widgets[newWidget.title] = newWidgetJson
          } catch (error) {
            console.error(error)
          } 
        } else if (!this.widgetItemExists(newWidget.title)) {
          newWidgetJson["is_group"] = false
          this.widgetStructure[newWidget.title] = newWidgetJson
          this.widgetItemDict[newWidget.title] = newWidgetJson
          this.addedWidgetEditors[newWidget.title] = newWidgetJson
        }
      }
    },

    addGroup (newGroup) {
      const newGroupJson = {
        "is_group": true,
        "caption": newGroup.caption ?? "",
        "icon": newGroup.icon ?? "",
        "widgets": {}
      }
      this.widgetStructure[newGroup.groupName] = newGroupJson
      this.widgetGroupDict[newGroup.groupName] = newGroupJson
      this.addedWidgetEditors[newGroup.groupName] = {
        "is_group": true,
        "caption": newGroup.caption ?? "",
        "icon": newGroup.icon ?? "",
        "widgets": {}
      }
    },

    submitNewWidgetForm (values) {
      if (this.showNewGroupForm) {
        this.addGroup({
          "groupName": values.group,
          "caption": values.groupCaption ?? "",
          "icon": values.groupIcon ?? ""
        })
      }
      this.addWidgetEditor(values)
    },

    openEditWidgetForm (widget) {
      this.editWidgetFormOpen = true
      this.currentlyEditedWidget = widget
    },

    submitEditWidgetForm (values) {
      const virtualWidget = this.getVirtualWidget(this.currentlyEditedWidget.dataset.widgetId)
      virtualWidget.attributes.style = values.style
      virtualWidget.textContent = values.HTML
    },

    // add attributes and event listeners to newly-created widget
    setWidgetProperties (newWidget) {
      newWidget.id = `widget-${this.currentWidgetId}`
      newWidget.dataset.widgetId=this.currentWidgetId
      // newWidget.classList.add('widget')

      newWidget.setAttribute('draggable', 'true')

      newWidget.addEventListener('dragover', (event) => {
        if (this.dragStatus.draggedWidget?.dataset.widgetId !== event.currentTarget.dataset.widgetId &&
        !(this.dragStatus.draggedWidget?.parentNode.classList.contains('comment') && this.dragStatus.target != 'end')
        )  {
          event.currentTarget.classList.add('green')
        }
      })

      newWidget.addEventListener('dragstart', (event) => {
        if (event.target !== event.currentTarget) {
          event.currentTarget.classList.add('green')
        }
      })

      newWidget.addEventListener('dragleave', (event) => {
        event.currentTarget.classList.remove('green')
      })

      newWidget.addEventListener('drop', (event) => {
        event.currentTarget.classList.remove('green')
      })

      newWidget.addEventListener("dblclick", (event) => {
        event.stopPropagation()
        this.tooltip.classList.remove('visible')
        this.openEditWidgetForm(newWidget)
      });

      // change user cursor based on mouse location
      newWidget.addEventListener("mousemove", (event) => {
        const x = event.offsetX
        const y = event.offsetY
        const resizeCursorThreshold = helperFunction.getResizeCursorThreshold(newWidget)

        this.userStyling.cursor ||= newWidget.style.cursor.length > 0 ? newWidget.style.cursor : 'pointer'
        // change cursor based on which corner user is hovering over
        if (x < resizeCursorThreshold.x && y < resizeCursorThreshold.y) {
          newWidget.style.cursor = 'nw-resize'
        } else if (x < resizeCursorThreshold.x && y > newWidget.offsetHeight - resizeCursorThreshold.y) {
          newWidget.style.cursor = 'sw-resize'
        } else if (x > newWidget.offsetWidth - resizeCursorThreshold.x && y < resizeCursorThreshold.y) {
          newWidget.style.cursor = 'ne-resize'
        } else if (x > newWidget.offsetWidth - resizeCursorThreshold.x && y > newWidget.offsetHeight - resizeCursorThreshold.y) {
          newWidget.style.cursor = 'se-resize'
        } else {
          newWidget.style.cursor = this.userStyling.cursor
        }

        if (this.dragStatus.dragType === 'resizing' && this.dragStatus.draggedWidget !== event.currentTarget) {
          event.currentTarget.classList.add('green')
        }
      })

      newWidget.addEventListener("mouseup", (event) => {
        event.currentTarget.classList.remove('green')
        this.restoreUserStyling(newWidget)
      })

    },

    // Add a widget or commented widget to the DOM and virtual DOM,
    // beneath the specified pageNode
    // Also internally store a reference mapped to the widget's id\
    renderWidget (widget, pageNode) {
      let virtualDOMData = null
      let DOMElement = null
      // Check if widget is comment widget, so it is not appended to the virtual DOM as thought
      // it were a separate widget
      const isCommentWidget = widget.classList?.contains('widget') && pageNode.classList?.contains('comment')

      if (widget instanceof Element) {
        virtualDOMData = {
          tag:widget.nodeName,
          attributes: Object.assign({},
              ...Array.from(widget.attributes, ({name, value}) => ({[name]: value}))
          ),
          textContent: widget.innerHTML,
          children: {}
        }
        DOMElement = widget

        if (!isCommentWidget) {
          this.currentPageWidgets.widgets[this.currentWidgetId] = { rootElement: widget }
        }

      } else if (widget.commentContainer) {
        const { commentContainer, startPoint, endPoint, line } = widget
        const newWidget = commentContainer.children[0]
        virtualDOMData = {
          tag: commentContainer.nodeName,
          attributes: Object.assign({},
              ...Array.from(commentContainer.attributes, ({name, value}) => ({[name]: value}))
          ),
          textContent: commentContainer.textContent,
          children: {
            content : {
              tag: newWidget.nodeName,
              attributes: Object.assign({},
                  ...Array.from(newWidget.attributes, ({name, value}) => ({[name]: value}))
              ),
              textContent: Array.from(newWidget.querySelectorAll('& > *:not(.start-point)')).map(node => node.outerHTML).join(''),
              children: {
                startPoint: {
                  tag: startPoint.nodeName,
                  attributes: Object.assign({},
                      ...Array.from(startPoint.attributes, ({name, value}) => ({[name]: value}))
                  ),
                  textContent: startPoint.textContent,
                  children: {}
                }
              }
            },
            endPoint: {
              tag: endPoint.nodeName,
              attributes: Object.assign({},
                  ...Array.from(endPoint.attributes, ({name, value}) => ({[name]: value}))
              ),
              textContent: endPoint.textContent,
              children: {}
            }
          }
        }

        DOMElement = commentContainer
        this.currentPageWidgets.widgets[this.currentWidgetId] = {
          rootElement: commentContainer,
          startPoint: startPoint,
          endPoint: endPoint,
        }

        this.drawCommentLine(this.currentWidgetId, line)
      }

      if (!isCommentWidget) {
        this.currentPageVirtualCanvas.idMap[this.currentWidgetId] = `${ this.currentPageVirtualCanvas.idMap[pageNode.dataset?.widgetId] ?  this.currentPageVirtualCanvas.idMap[pageNode.dataset.widgetId] + '.children' : ''}[${this.currentWidgetId}]`
        if (pageNode.dataset?.widgetId in this.currentPageVirtualCanvas.idMap) {
          const parentWidget = this.getVirtualWidget(pageNode.dataset.widgetId)
          parentWidget.children[this.currentWidgetId] = virtualDOMData
        } else {
          this.currentPageVirtualCanvas.elements[this.currentWidgetId] = virtualDOMData
        }


        // if (pageNode === this.gridMetadata.gridContainer) {
        //   if (!newWidget.style.gridColumn) {
        //     newWidget.style.gridColumn = `${columnNum + 1} / span 1`
        //   }

        //   if (!newWidget.style.gridRow) {
        //     newWidget.style.gridRow = `${rowNum + 1} / span 1`
        //   }
        // }


        this.currentPageWidgets.widgetId += 1
      }
      
      pageNode.appendChild(DOMElement)
    },

    // Depending on whether a line with the given id exists, draws or redraws comment line on the page's svg from startPoint([x1, y1]) and endPoint([x2, y2])
    // If the user provides delta values, shift the line's startpoint by startDelta and endpoint by endDelta
    drawCommentLine (lineID, {startPoint = [null, null], endPoint = [null, null]}, {startDelta = [null, null], endDelta = [null, null]} = {}) {
      let line = this.currentPageWidgets.widgets[lineID]?.line
      const ns = "http://www.w3.org/2000/svg"
      const [x1, y1, x2, y2] = [...startPoint, ...endPoint]
      const [deltaX1, deltaY1, deltaX2, deltaY2] = [...startDelta, ...endDelta]

      if (line) {
        line.setAttributeNS(null, "x1", x1 ?? parseFloat(line.getAttributeNS(null, "x1")) + deltaX1 ?? 0)
        line.setAttributeNS(null, "y1", y1 ?? parseFloat(line.getAttributeNS(null, "y1"))  + deltaY1 ?? 0)

        line.setAttributeNS(null, "x2", x2 ?? parseFloat(line.getAttributeNS(null, "x2")) + deltaX2 ?? 0)
        line.setAttributeNS(null, "y2", y2 ?? parseFloat(line.getAttributeNS(null, "y2"))  + deltaY2 ?? 0)
      } else {
        if (x1 && x2 && y1 && y2) {
          line = document.createElementNS(ns, "line")
          line.classList.add('comment-line')
          line.setAttributeNS(null, "stroke", "blue")
          line.setAttributeNS(null, "x1", x1)
          line.setAttributeNS(null, "y1", y1)

          line.setAttributeNS(null, "x2", x2)
          line.setAttributeNS(null, "y2", y2)
          
          this.canvasSVG.appendChild(line)
          this.currentPageWidgets.widgets[lineID].line = line
        } else {
          console.error(`New line ${lineID} cannot be drawn with null coordinates`)
        }
      }
 

      return line
    },

    // Add widget from either a widget editor ID
    // {
    //   tag: 'div',
    //   attributes: {style: 'color: red; left: 25; top: 0;'},
    //   textContent: '',
    //   children: []
    // }
    addWidget (widget, pageNode, {placement='absolute', x = 0, y = 0} = {}, comment=null) {
      // Find element in widget editor
      // Can experiment with transferring innerHTML instead if too slow
      const oldWidget = document.getElementById(widget)
      
      const newWidget = oldWidget.cloneNode(true)
      this.setWidgetProperties(newWidget)

      if (placement === 'absolute') {
        newWidget.style.position = 'absolute'

        if (comment) {
          // If widget is a comment, alter its DOM accordingly. Only applicable to newly created widgets dragged from widget editor
          const oldWidgetPreview = oldWidget.offsetParent
          const previewPadding = helperFunction.pixelsToInt(window.getComputedStyle(oldWidgetPreview).getPropertyValue('padding-top'))
          const previewWidth = oldWidgetPreview.offsetWidth

          newWidget.style.position = 'absolute'
          newWidget.style.top = `${previewPadding}px`
          newWidget.style.left = `${previewWidth / 2 - oldWidget.offsetWidth / 2}px`

          const commentContainer = document.createElement('div')
          commentContainer.style.width = `${previewWidth}px`
          commentContainer.style.height = `${oldWidgetPreview.offsetHeight}px`
          commentContainer.style.position = 'absolute'
          commentContainer.style.top = `${y - previewPadding}px`
          commentContainer.style.left = `${x - (previewWidth / 2 - oldWidget.offsetWidth / 2)}px`
          commentContainer.classList.add('comment')
          commentContainer.appendChild(newWidget)

          const startPoint = newWidget.querySelector('.start-point')
          startPoint.dataset.widgetId = this.currentWidgetId

          const endPoint = document.createElement('div')
          endPoint.classList.add('end-point')
          endPoint.style.position = 'absolute'
          endPoint.draggable = true
          endPoint.dataset.widgetId = this.currentWidgetId
          endPoint.style.width = `${2 * this.commentPointRadius}px`
          endPoint.style.top =  `${comment.end.HTMLNode.style.top}`
          endPoint.style.left = `${comment.end.HTMLNode.style.left}`
          commentContainer.appendChild(endPoint)

          

          const dropLocationPosition = this.getAbsolutePosition(pageNode)
          // Starting point location on the canvas SVG
          const x1 = x + dropLocationPosition.left + comment.start.HTMLNode.offsetLeft + this.commentPointRadius
          const y1 = y + dropLocationPosition.top + comment.start.HTMLNode.offsetTop + this.commentPointRadius

          // Ending point location on the canvas SVG
          const x2 = x + dropLocationPosition.left - previewWidth /2 + comment.end.HTMLNode.offsetLeft + oldWidget.offsetWidth / 2 + this.commentPointRadius
          const y2 = y + dropLocationPosition.top + comment.end.HTMLNode.offsetTop - previewPadding + this.commentPointRadius

          

          // startPoint.addEventListener("dblclick", (event) => {
          //   event.stopPropagation()
          //   this.tooltip.classList.remove('visible')
          //   this.openEditWidgetForm(newWidget)
          // });


          // endPoint.addEventListener("dblclick", (event) => {
          //   event.stopPropagation()
          //   this.tooltip.classList.remove('visible')
          //   this.openEditWidgetForm(newWidget)
          // });
          this.renderWidget({
            commentContainer: commentContainer,
            startPoint: startPoint,
            endPoint: endPoint,
            line: { startPoint: [x1, y1], endPoint: [ x2, y2 ] }
          }, pageNode)
        } else {
          newWidget.style.top = `${y}px`
          newWidget.style.left = `${x}px`

          this.renderWidget(newWidget, pageNode)
        }

        
      }
    },

    // import a widget from a structured JSON and add it to the DOM
    importWidget (widgetJSON, pageNode, [relativeX, relativeY]) {
      const newWidget = document.createElement(widgetJSON.tag)
      let returnedWidget = newWidget

      Object.entries(widgetJSON.attributes).forEach(([attribute, value]) => {
        newWidget.setAttribute(attribute, value)
      })

      if (newWidget.classList.contains('widget')) {
        newWidget.innerHTML = widgetJSON.textContent
        this.setWidgetProperties(newWidget)
        
        this.renderWidget(newWidget, pageNode)
        Object.entries(widgetJSON.children).forEach(([childId, child]) => {
          const childWidget = this.importWidget(child, newWidget, 
            [relativeX + helperFunction.pixelsToInt(newWidget.style.left), 
            relativeY + helperFunction.pixelsToInt(newWidget.style.top)])
          if (childWidget.classList.contains('start-point')) {
            returnedWidget = childWidget
          }

          // Append non-widget children to parent widgets in the DOM
          if (!childWidget.classList.contains('widget')) {
            newWidget.appendChild(childWidget)
          }
        })
      } else if (newWidget.classList.contains('comment')) {
        const startPoint = this.importWidget(widgetJSON.children.content, newWidget, 
            [relativeX + helperFunction.pixelsToInt(newWidget.style.left), 
            relativeY + helperFunction.pixelsToInt(newWidget.style.top)])
        const commentWidget = startPoint.parentNode
        

        const endPoint = this.importWidget(widgetJSON.children.endPoint, newWidget, 
            [relativeX + helperFunction.pixelsToInt(newWidget.style.left), 
            relativeY + helperFunction.pixelsToInt(newWidget.style.top)])
        newWidget.appendChild(endPoint)

        

        // Need to scale based on commentContainer
        const [containerTop, containerLeft] = [helperFunction.pixelsToInt(newWidget.style.top), helperFunction.pixelsToInt(newWidget.style.left)]
        const [widgetTop, widgetLeft] = [helperFunction.pixelsToInt(newWidget.children[0].style.top), helperFunction.pixelsToInt(newWidget.children[0].style.left)] 
        const x1 = helperFunction.pixelsToInt(startPoint.style.left) + containerLeft + widgetLeft + this.commentPointRadius
        const y1 = helperFunction.pixelsToInt(startPoint.style.top) + containerTop + widgetTop + this.commentPointRadius
        const x2 = helperFunction.pixelsToInt(endPoint.style.left) + containerLeft + this.commentPointRadius
        const y2 = helperFunction.pixelsToInt(endPoint.style.top) + containerTop + this.commentPointRadius

        this.renderWidget({
          commentContainer: newWidget,
          startPoint: startPoint,
          endPoint: endPoint,
          line: { startPoint: [relativeX + x1, relativeY + y1], endPoint: [ relativeX + x2, relativeY + y2 ] }
        }, pageNode)

        Object.entries(widgetJSON.children).forEach(([childId, child]) => {
          if (childId !== 'content' && childId !== 'endPoint') {
            this.importWidget(child, commentWidget,
              [relativeX + containerLeft + widgetLeft, 
              relativeY + containerTop+ widgetTop])
          }
        })
      }

      return returnedWidget
    },

    deleteWidget (widgetId) {


      // const virtualWidgetLocation = this.currentPageVirtualCanvas.idMap[widgetId].match(/(?<=\[)[^]]*(?=\])/g)

      // let parent = this.currentPageVirtualCanvas.elements
      // for (let i = 0; i < virtualWidgetLocation.length - 2; ++i) {
      //   parent = parent[virtualWidgetLocation[i]]
      // }

      // delete parent[virtualWidgetLocation[virtualWidgetLocation.length - 1]]
      const pageDOMElements = this.currentPageWidgets.widgets[widgetId]
      const parentID = pageDOMElements.rootElement.offsetParent.dataset.widgetId
      if (parentID) {
        delete this.getVirtualWidget(parentID).children[widgetId]
      } else {
        delete this.currentPageVirtualCanvas.elements[widgetId]
      }
      
      delete this.currentPageVirtualCanvas.idMap[widgetId]

      
      Object.entries(pageDOMElements).forEach(([type, element]) => {
        if (element) {
          element.remove()
        }
      })
      // pageDOMElements.rootElement.remove()
      // if (pageDOMElements.associatedElements) {
      //   pageDOMElements.associatedElements.forEach(element => element.remove())
      // }

      delete this.currentPageWidgets.widgets[widgetId]
    },

    updateDragStatus (newDragStatus) {
      this.dragStatus = newDragStatus
    },

    resetDragStatus () {
      if (this.dragStatus.dragType = 'adding') {
        this.dragStatus.draggedWidget?.offsetParent.classList.remove('dragging')
      }
      this.dragStatus.draggedWidget?.classList.remove('resizing')
      this.dragStatus.draggedWidget?.classList.remove('moving')

      this.updateDragStatus({
        dragType: null,
        draggedWidget: null,
        edgeDistance: null,
      })
    },

    onDragEnd () {
      this.restoreUserStyling(this.dragStatus.draggedWidget)
      this.resetDragStatus()
    },

    getVirtualWidget (widgetId) {
      return eval(`this.currentPageVirtualCanvas.elements${this.currentPageVirtualCanvas.idMap[widgetId]}`)
    },

    restoreUserStyling (widget) {
      Object.entries(this.userStyling).forEach(([originalStyle, value]) => {
        widget.style[originalStyle] = value
      })

      this.userStyling = {}
    },

    onCanvasMount () {
      this.canvasSVG = document.getElementById('arrow-container')
    },

    getAbsolutePosition (element) {
      // Get position of element relative to the grid canvas
      const boundingRect = element.getBoundingClientRect()
      return {
        top: boundingRect.top - this.pageMetaData.pageContainer.offsetTop,
        left: boundingRect.left - this.pageMetaData.pageContainer.offsetLeft
      }
    }
  },
  computed: {
    currentPageWidgets () {
      return this.pageWidgets.home
    },
    currentPageVirtualCanvas () {
      return this.virtualCanvas.home
    },
    currentWidgetId () {
      return this.currentPageWidgets.widgetId
    },
    commentPointRadius () {
      return this.pageMetaData.commentPointRadius
    }
  },
  created () {
    this.getWidgets()
  },
  mounted () {
    this.tooltip = document.getElementById("page-tooltip")
    app()
  }
})
</script>
