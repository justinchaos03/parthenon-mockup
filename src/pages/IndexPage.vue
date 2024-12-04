<template>
  <div id="page-container">
    <div id="grid-container"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragend="onDragEnd"
      @dragleave="onDragLeave"
      @drop="onDragDrop"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp">
        <div v-for="index in this.numGridColumns" :key="index"
        class="page-box column" :class="['col-start-' + index , 'col-end-' + (index + 1)]">
        </div>
        <div v-for="index in this.numGridRows" :key="index"
        class="page-box row" :class="['row-start-' + index , 'row-end-' + (index + 1)]">
        </div>
    </div>
  </div>
  <p id="page-tooltip"></p>
</template>

<script>
import { defineComponent, ref } from 'vue'

export default defineComponent ({
  name: 'PageIndex',
  emits: ['editWidget'],
  props: {
    pageWidgets: {
      type: Object,
      required: true
    }
  },
  setup (props) {
    const pageContent = ref(null)
    const gridContainer = ref(null)
    const numGridColumns = ref(0)
    const numGridRows = ref(null)
    const gridStyleSheet = ref(null)
    const SNAP_THRESHOLD = 0.2
    const RESIZE_CURSOR_THRESHOLD = (widget) => {
      return {
        x: Math.max(0.1 * widget.offsetWidth, 6),
        y: Math.max(0.1 * widget.offsetHeight, 6)
      }
    }

    const gridElements = ref({
      rows: [],
      columns: [],

    })
    const selectedGrid = ref({
      row: null,
      column: null,
    })


    const tooltip = ref(null)
    const dragStatus = ref({
      dragType: null,
      draggedWidget: null,
    })

    // Store user-inputted styles temporarily when overriding
    const userStyling = ref({})

    return {
      props,
      pageContent,
      gridContainer,
      numGridColumns,
      numGridRows,
      gridStyleSheet,
      SNAP_THRESHOLD,
      RESIZE_CURSOR_THRESHOLD,
      gridElements,
      selectedGrid,
      tooltip,
      dragStatus,
      userStyling
    }
  },
  computed: {
    pageHeight () {
      return this.pageContent? this.pageContent.clientHeight : 0
    },
  },
  methods: {
    onDragStart (e) {
      const x = e.offsetX
      const y = e.offsetY
      const resizeCursorThreshold = this.RESIZE_CURSOR_THRESHOLD(e.target)

      let cursorThresholdPlacement = {}
      if (x < resizeCursorThreshold.x) {
        cursorThresholdPlacement.horizontal = 'left'
      } else if (x > e.target.offsetWidth - resizeCursorThreshold.x) {
        cursorThresholdPlacement.horizontal = 'right'
      }

      if (y < resizeCursorThreshold.y) {
        cursorThresholdPlacement.vertical = 'top'
      } else if (y > e.target.offsetHeight - resizeCursorThreshold.y) {
        cursorThresholdPlacement.vertical = 'bottom'
      }

      if (cursorThresholdPlacement.horizontal && cursorThresholdPlacement.vertical) {
        // Resize widget
        e.stopPropagation()
        e.preventDefault()
        e.target.classList.add('resizing')
        this.dragStatus = {
          dragType: 'resizing',
          draggedWidget: e.target,
          cursorHorizontalPlacement: cursorThresholdPlacement.horizontal,
          cursorVerticalPlacement: cursorThresholdPlacement.vertical,
          initialTop:  parseInt(e.target.style.top),
          initialLeft: parseInt(e.target.style.left),
          initialCursorX: e.clientX,
          initialCursorY: e.clientY,
          initialWidth: e.target.offsetWidth,
          initialHeight: e.target.offsetHeight
        }
      } else {
        // Drag and move widget
        e.dataTransfer.setData('id', e.target.dataset.widgetId)
        e.dataTransfer.setData('width', e.target.offsetWidth)
        e.dataTransfer.setData('height', e.target.offsetHeight)
        e.dataTransfer.setData('moving', true)

        e.target.classList.add('moving')
        this.userStyling.zIndex = e.target.style.zIndex.length > 0 ? e.target.style.zIndex : 'auto'
        e.target.style.zIndex = 9999
        e.dataTransfer.dropEffect = 'move'
        this.dragStatus = {
          dragType: 'moving',
          draggedWidget: e.target
        }
      }

    },

    onDragOver (e) {
      e.preventDefault()
      if (!e.target.classList.contains('widget')) {
        const gridRect = e.currentTarget.getBoundingClientRect()

        let rowPlacement = (e.clientY - gridRect.top) / (e.currentTarget.scrollHeight / this.numGridRows)
        let columnPlacement = (e.clientX - gridRect.left) / (e.currentTarget.scrollWidth / this.numGridColumns)

        // Snap to previous or next grid
        const gridHorizontalPlacement = rowPlacement % 1
        const gridVerticalPlacement = columnPlacement % 1
        
        if (true) {
          if ((gridHorizontalPlacement < this.SNAP_THRESHOLD || Math.abs(1 - gridHorizontalPlacement) < this.SNAP_THRESHOLD) &&
           (gridVerticalPlacement < this.SNAP_THRESHOLD || Math.abs(1 - gridVerticalPlacement) < this.SNAP_THRESHOLD)) {
            this.selectGrid(Math.round(rowPlacement), Math.round(columnPlacement)) 
          } else {
            this.clearSelectedGrid()
          }
        }
        
      }
      
    },

    onDragLeave (e) {
      e.preventDefault()
      this.clearSelectedGrid()
    },

    onDragEnd (e) {
      this.restoreUserStyling(this.dragStatus.draggedWidget)
      this.resetDragStatus()
    },

    onDragDrop (e) {
      e.preventDefault()
      if (this.dragStatus.dragType !== 'resizing') {
        const dropLocation = e.target.classList.contains('widget') && e.target.dataset.widgetId !== e.dataTransfer.getData('id') ? e.target : this.gridContainer
        console.log(dropLocation)

        const gridRect = dropLocation.getBoundingClientRect()

        let gridPlacement = {}
        if (dropLocation === this.gridContainer && this.selectedGrid.row !== null && this.selectedGrid.column !== null ) {
          const gridWidth = (dropLocation.scrollWidth / this.numGridColumns)
          const gridHeight = (dropLocation.scrollHeight / this.numGridRows)

          // Identify which grid square widget is in
          const columnPlacement = Math.floor((e.clientX - gridRect.left) / gridWidth)
          const rowPlacement = Math.floor((e.clientY - gridRect.top) / gridHeight)

          // 'snap' location of item to closest corner
          gridPlacement = {
            placement:'absolute',
            x: this.selectedGrid.column - columnPlacement === 0 ? columnPlacement * gridWidth : this.selectedGrid.column * gridWidth - e.dataTransfer.getData('width'),
            y: this.selectedGrid.row - rowPlacement === 0 ? rowPlacement * gridHeight :this.selectedGrid.row * gridHeight - e.dataTransfer.getData('height')
          }

          console.log(`moving ${columnPlacement}, ${rowPlacement} to ${gridPlacement.x}, ${gridPlacement.y}`)
        } else {
          gridPlacement = {
            placement:'absolute',
            x: e.clientX - gridRect.left - e.dataTransfer.getData('width') / 2,
            y: e.clientY - gridRect.top - e.dataTransfer.getData('height') / 2
          }
        }
    

        // let rowPlacement = (e.clientY - gridRect.top) / (e.currentTarget.scrollHeight / this.numGridRows)
        // let columnPlacement = (e.clientX - gridRect.left) / (e.currentTarget.scrollWidth / this.numGridColumns)

        if (e.dataTransfer.getData('moving')) {
          // this.moveWidget(e.dataTransfer.getData('widgetId'), dropLocation, this.selectedGrid.row, this.selectedGrid.column)
          this.moveWidget(e.dataTransfer.getData('id'), dropLocation, gridPlacement)
        } else {
          // this.addWidget(e.dataTransfer.getData('id'), dropLocation, this.selectedGrid.row, this.selectedGrid.column)
          this.addWidget(e.dataTransfer.getData('id'), dropLocation, gridPlacement)
        }
        

        // check if original parent node
        // if (draggedEl.parentNode === e.target) {
        //   e.target.classList.remove('drag-enter')
        //   return
        // }
      }
      
      this.clearSelectedGrid()
      this.restoreUserStyling(this.dragStatus.draggedWidget)
      this.resetDragStatus()
    },

    onMouseMove (e) {
      e.preventDefault()
      if (this.dragStatus.dragType === 'resizing') {
        const deltaX = e.clientX - this.dragStatus.initialCursorX
        const deltaY = -(e.clientY - this.dragStatus.initialCursorY)

        if (this.dragStatus.cursorHorizontalPlacement === 'left') {
          this.dragStatus.draggedWidget.style.width = `${this.dragStatus.initialWidth - deltaX}px`
          if (deltaX < this.dragStatus.initialWidth) {
            this.dragStatus.draggedWidget.style.left = `${this.dragStatus.initialLeft + deltaX}px`
          }
        } else {
          this.dragStatus.draggedWidget.style.width = `${this.dragStatus.initialWidth + deltaX}px`
        }

        if (this.dragStatus.cursorVerticalPlacement === 'top') {
          this.dragStatus.draggedWidget.style.height = `${this.dragStatus.initialHeight + deltaY}px`
          
          if (deltaY > -1 * this.dragStatus.initialHeight) {
            this.dragStatus.draggedWidget.style.top = `${this.dragStatus.initialTop - deltaY}px`
          }
        } else {
          this.dragStatus.draggedWidget.style.height = `${this.dragStatus.initialHeight - deltaY}px`
        }
      }
    },

    onMouseUp (e) {
      e.preventDefault()
      this.resetDragStatus()
    },
  
    addWidget (widgetId, pageNode, {placement='absolute', x = 0, y = 0}) {
      const currentWidgetId = this.props.pageWidgets.widgetId
      // Can experiment with transferring innerHTML instead if too slow
      const newWidget = document.getElementById(widgetId).cloneNode(true)
      newWidget.id = `widget-${currentWidgetId}`
      newWidget.dataset.widgetId=currentWidgetId
      newWidget.classList.add('widget')

      newWidget.setAttribute('draggable', 'true')
      newWidget.addEventListener('dragover', (event) => {
        if (this.dragStatus.draggedWidget?.dataset.widgetId !== event.currentTarget.dataset?.widgetId) {
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
        this.editWidget(currentWidgetId)
      });

      // change user cursor based on mouse location
      newWidget.addEventListener("mousemove", (event) => {
        const x = event.offsetX
        const y = event.offsetY
        const resizeCursorThreshold = this.RESIZE_CURSOR_THRESHOLD(newWidget)

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
      
      if (placement === 'absolute') {
        newWidget.style.position = 'absolute'
        newWidget.style.top = `${y}px`
        newWidget.style.left = `${x}px`
      }
      // if (pageNode === this.gridContainer) {
      //   if (!newWidget.style.gridColumn) {
      //     newWidget.style.gridColumn = `${columnNum + 1} / span 1`
      //   }

      //   if (!newWidget.style.gridRow) {
      //     newWidget.style.gridRow = `${rowNum + 1} / span 1`
      //   }
      // }

      this.props.pageWidgets.widgets[currentWidgetId] = newWidget
      this.props.pageWidgets.widgetId += 1
      pageNode.appendChild(newWidget)
    },

    editWidget (widgetId) {
      this.$emit('editWidget',{ 
        'widgetElement': this.props.pageWidgets.widgets[widgetId]
      })
    },

    moveWidget (widgetId, pageNode, {placement='absolute', x = 0, y = 0}) {
      // Can experiment with transferring innerHTML instead if too slow
      // Should just grab widget from pagewidgets.widgets by widget ID, instead of using element ID
      const displacedWidget = this.props.pageWidgets.widgets[widgetId]
      // if (pageNode === this.gridContainer) {
      //   displacedWidget.style.gridColumn = `${columnNum + 1} / span 1`
      //   displacedWidget.style.gridRow = `${rowNum + 1} / span 1`
      // } 
      if (placement === 'absolute') {
        displacedWidget.style.position = 'absolute'
        displacedWidget.style.top = `${y}px`
        displacedWidget.style.left = `${x}px`
      }

      if (pageNode !== displacedWidget && pageNode !== displacedWidget.parentNode) {
        pageNode.appendChild(displacedWidget)
      }
    },

    selectGrid (row, column) {
      const rowNum = Math.floor(row)
      const columnNum = Math.floor(column)
      const selectedRow = this.selectedGrid.row
      const selectedColumn = this.selectedGrid.column

      if (rowNum !== selectedRow || columnNum !== selectedColumn) {

        if (selectedRow !== null) {
          this.gridElements.rows[selectedRow].classList.remove('red')
        }

        if (selectedColumn !== null) {
          this.gridElements.columns[selectedColumn].classList.remove('red')
        }

        this.gridElements.rows[rowNum].classList.add('red')
        this.gridElements.columns[columnNum].classList.add('red')
        this.selectedGrid = {
          row: rowNum,
          column: columnNum
        }
      }
    },
  
    clearSelectedGrid () {
      const selectedRow = this.selectedGrid.row
      const selectedColumn = this.selectedGrid.column

      if (selectedRow !== null) {
        this.gridElements.rows[selectedRow].classList.remove('red')
      }

      if (selectedColumn !== null) {
        this.gridElements.columns[selectedColumn].classList.remove('red')
      }

      this.selectedGrid.row = null
      this.selectedGrid.column = null
    },

    restoreUserStyling (widget) {
      Object.entries(this.userStyling).forEach(([originalStyle, value]) => {
        widget.style[originalStyle] = value
      })

      this.userStyling = {}
    },

    resetDragStatus () {
      this.dragStatus.draggedWidget?.classList.remove('resizing')
      this.dragStatus.draggedWidget?.classList.remove('moving')

      this.dragStatus = {
        dragType: null,
        draggedWidget: null,
      }
    }
  },
  mounted () {
    this.pageContent= document.getElementById("page-container")
    this.gridContainer = document.getElementById("grid-container")
    
    this.numGridColumns = 8
    this.numGridRows = Math.ceil(this.pageHeight / 200)

    const styleSheet = new CSSStyleSheet()

    this.gridStyleSheet = styleSheet
    styleSheet.insertRule(`#grid-container .column { grid-row: 1 / span ${this.numGridRows} }`, styleSheet.cssRules.length);
    document.adoptedStyleSheets = [styleSheet]

    // Add tooltip listener
    this.tooltip = document.getElementById("page-tooltip")
    let timer
    const showTooltip = (event) => {
      if (!this.dragStatus.dragType) {
        const widget = event.target.closest(".widget")
        if (widget) {
          this.tooltip.classList.add("visible")
          this.tooltip.textContent = `Double-click to edit ${widget.dataset.title}`
          this.tooltip.style.left = `${event.x}px`
          this.tooltip.style.top = `${event.y}px`
        }
      }
    }

    this.pageContent.addEventListener("mousemove", (event) => {
      this.tooltip.classList.remove("visible")
      clearTimeout(timer)
      timer = setTimeout(() => showTooltip(event), 1500)
    })
  },
  watch: {
    numGridColumns(newValue, oldValue) {
      this.$nextTick(() => {
        document.querySelectorAll('#grid-container .column').forEach((column, index) => {
          this.gridStyleSheet.insertRule(`#grid-container .col-start-${index + 1} { grid-column-start: ${index + 1} }`, this.gridStyleSheet.cssRules.length);
          this.gridStyleSheet.insertRule(`#grid-container .col-end-${index + 1} { grid-column-end: ${index + 1} }`, this.gridStyleSheet.cssRules.length);
          this.gridElements.columns.push(column)
        })
      })
    },
    numGridRows(newValue, oldValue) {
      this.$nextTick(() => {
        document.querySelectorAll('#grid-container .row').forEach((row, index) => {
          this.gridStyleSheet.insertRule(`#grid-container .row-start-${index + 1} { grid-row-start: ${index + 1} }`, this.gridStyleSheet.cssRules.length);
          this.gridStyleSheet.insertRule(`#grid-container .row-end-${index + 1} { grid-row-end: ${index + 1} }`, this.gridStyleSheet.cssRules.length);
          this.gridElements.rows.push(row)
        })
      })
    }
  }
})

</script>