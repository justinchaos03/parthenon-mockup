<template>
  <div id="page-container">
    <svg id ="arrow-container"></svg>
    <div id="grid-container"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
      @drop="onDragDrop"
      @mousemove="onMouseMove"
      @mouseup="onMouseUp"
      class='show-comments'
      :class="{ 'show-grid' : this.props.toolbarOptions.showGrid }">
        <div v-for="index in this.gridMetaData.numGridColumns" :key="index"
        class="page-box column" :class="['col-start-' + index , 'col-end-' + (index + 1)]">
        </div>
        <div v-for="index in this.gridMetaData.numGridRows" :key="index"
        class="page-box row" :class="['row-start-' + index , 'row-end-' + (index + 1)]">
        </div>
    </div>
    <div id="options-menu">
      <div class="option">
        <button id="show-comments" class="slider active"></button>
        <div class="label">
          <p>Show Comments?</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { comment } from 'postcss'
import { defineComponent, ref } from 'vue'

export default defineComponent ({
  name: 'PageIndex',
  emits: ['mounted'],
  props: {
    toolbarOptions: {
      type: Object
    },

    pageWidgets: {
      type: Object,
      required: true
    },

    pageMetaData: {
      type: Object,
    },

    virtualCanvas: {
      type: Object,
      required: true
    },

    dragStatus: {
      type: Object,
      required: true
    },

    updateDragStatus: {
      type: Function
    },

    resetDragStatus: {
      type: Function
    },

    addWidget: {
      type: Function
    },

    RESIZE_CURSOR_THRESHOLD: {
      type: Function
    },

    userStyling: {
      type: Object
    },

    restoreUserStyling: {
      type: Function
    },

    tooltip: {
      type: Object
    },

    pixelsToInt: {
      type: Function
    },

    drawCommentLine: {
      type: Function
    }
  },
  setup (props) {
    const gridMetaData = ref({
      SNAP_THRESHOLD: 16,
      gridContainer: null,
      gridStyleSheet: null,
      numGridColumns: 0,
      numGridRows: 0,
      gridElements: {
        rows: [],
        columns: [],
      }
    })

    const selectedGrid = ref({
      row: null,
      column: null,
      verticalPlacement: null,
      horizontalPlacement: null
    })

    return {
      props,
      gridMetaData,
      selectedGrid,
    }
  },

  computed: {
    pageHeight () {
      return this.props.pageMetaData.pageContainer? this.props.pageMetaData.pageContainer.clientHeight : 0
    },

    commentPointRadius () {
      return this.pageMetaData.commentPointRadius
    },

    numGridColumns () {
      return this.gridMetaData.numGridColumns
    },

    numGridRows () {
      return this.gridMetaData.numGridRows
    }
  },

  methods: {
    onDragStart (e) {
      if (e.target.classList.contains('start-point') || e.target.classList.contains('end-point')) {
        var img = document.createElement("img");   
        img.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

        e.dataTransfer.setDragImage(img, 0, 0);
        e.target.classList.add('dragging')
        
        if (e.target.classList.contains('start-point')) {
          this.props.updateDragStatus({
              dragType: 'comment-line',
              draggedWidget: e.target,
              target: 'start',
              id: e.target.dataset.id
          })
        } else if (e.target.classList.contains('end-point')) {
          this.props.updateDragStatus({
              dragType: 'comment-line',
              draggedWidget: e.target,
              target: 'end',
              id: e.target.dataset.id
          })
        }
      } else {
        // resize or move widget
        const x = e.offsetX
        const y = e.offsetY
        const resizeCursorThreshold = this.props.RESIZE_CURSOR_THRESHOLD(e.target)

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
          // convert to boundingrect

          const dragData = {
            dragType: 'resizing',
            draggedWidget: e.target,
            cursorHorizontalPlacement: cursorThresholdPlacement.horizontal,
            cursorVerticalPlacement: cursorThresholdPlacement.vertical,
            initialTop:  parseInt(e.target.style.top),
            initialLeft: parseInt(e.target.style.left),
            initialClientX: e.clientX,
            initialClientY: e.clientY,
            initialWidth: e.target.offsetWidth,
            initialHeight: e.target.offsetHeight,
            edgeDistance: null
          }
          if (e.target.parentNode.classList.contains('comment')) {
            dragData.startPoint = this.props.pageWidgets.widgets[e.target.dataset.widgetId].startPoint
            dragData.startPointInitialX = this.props.pixelsToInt(this.props.pageWidgets.widgets[e.target.dataset.widgetId].startPoint.style.left)
            dragData.startPointInitialY = this.props.pixelsToInt(this.props.pageWidgets.widgets[e.target.dataset.widgetId].startPoint.style.top)
          } 
          this.props.updateDragStatus(dragData)
        } else {
          // Drag and move widget
          e.dataTransfer.setData('id', e.target.dataset.widgetId)
          e.dataTransfer.setData('width', e.target.offsetWidth)
          e.dataTransfer.setData('height', e.target.offsetHeight)
          e.dataTransfer.setData('moving', true)

          e.target.classList.add('moving')
          this.props.userStyling.zIndex = e.target.style.zIndex.length > 0 ? e.target.style.zIndex : 'auto'
          e.target.style.zIndex = 9999
          e.dataTransfer.dropEffect = 'move'

          const dragData = {
            dragType: 'moving',
            draggedWidget: e.target,
            edgeDistance: {
              top: e.offsetY,
              bottom: e.target.offsetHeight - e.offsetY,
              left: e.offsetX, 
              right: e.target.offsetWidth - e.offsetX
            }
          }

          if (e.target.parentNode.classList.contains('comment')) {
            dragData.startPoint = this.props.pageWidgets.widgets[e.target.dataset.widgetId].startPoint
            dragData.startPointInitialX = this.props.pixelsToInt(this.props.pageWidgets.widgets[e.target.dataset.widgetId].startPoint.style.left)
            dragData.startPointInitialY = this.props.pixelsToInt(this.props.pageWidgets.widgets[e.target.dataset.widgetId].startPoint.style.top)
            dragData.widgetTop = this.props.pixelsToInt(e.target.style.top)
            dragData.widgetLeft = this.props.pixelsToInt(e.target.style.left)
            dragData.edgeDistance = {
              // calculate distance from cursor to widget borders
            }
          } 

          this.props.updateDragStatus(dragData)
        }
      }
      

    },

    onDragOver (e) {
      e.preventDefault()
      const dragType = this.props.dragStatus.dragType
      const canvasOffsetLeft = e.clientX - this.props.pageMetaData.pageContainer.offsetLeft
      const canvasOffsetTop = e.clientY - this.props.pageMetaData.pageContainer.offsetTop

      if (dragType === 'comment-line') {
        // Move dragged start/end point and line
        const commentWidget = this.props.pageWidgets.widgets[this.props.dragStatus.id]
        const widget = commentWidget.rootElement.querySelector('.widget')
        
        const [commentLeft, commentTop] = [commentWidget.rootElement.offsetLeft, commentWidget.rootElement.offsetTop]
        const [widgetLeft, widgetTop] = [widget.offsetLeft, widget.offsetTop]
        const cursorOffsetLeft = canvasOffsetLeft - commentLeft
        const cursorOffsetTop = canvasOffsetTop - commentTop
        

        switch (this.props.dragStatus.target) {
          case 'start':
            const cursorAbsoluteX = Math.min(Math.max(cursorOffsetLeft - widgetLeft - this.commentPointRadius, 0), widget.offsetWidth)
            const cursorAbsoluteY = Math.min(Math.max(cursorOffsetTop - widgetTop - this.commentPointRadius, 0), widget.offsetHeight)
            // Confine start and end points to being inside the widget
            commentWidget.startPoint.style.left = `${cursorAbsoluteX}px`
            commentWidget.startPoint.style.top = `${cursorAbsoluteY}px`

            this.props.drawCommentLine(this.props.dragStatus.id, {startPoint: [commentLeft + widgetLeft + cursorAbsoluteX, commentTop + widgetTop + cursorAbsoluteY]})
            break
          case 'end':
            commentWidget.endPoint.style.left = `${cursorOffsetLeft - this.commentPointRadius}px`
            commentWidget.endPoint.style.top = `${cursorOffsetTop - this.commentPointRadius}px`
            this.props.drawCommentLine(this.props.dragStatus.id, {endPoint: [canvasOffsetLeft, canvasOffsetTop]})
            break
        }
      } else if (dragType === 'adding' || dragType === 'moving') {
        const widget = this.props.dragStatus.draggedWidget

        if (this.props.toolbarOptions.showGrid && e.shiftKey &&
          !e.target.classList.contains('widget')) {
          // If showing grid AND holding alt key, display and snap dragged elements to grid lines
          const gridRect = e.currentTarget.getBoundingClientRect()
          const edgeDistance = this.props.dragStatus.edgeDistance
          const cursorRect = {
            top: e.clientY - edgeDistance.top,
            bottom: e.clientY + edgeDistance.bottom,
            left: e.clientX - edgeDistance.left,
            right: e.clientX + edgeDistance.right
          }
          
          const gridSquareWidth = e.currentTarget.scrollWidth / this.gridMetaData.numGridColumns
          const gridSquareHeight = e.currentTarget.scrollHeight / this.gridMetaData.numGridRows;

          const leftDistance = (cursorRect.left - gridRect.left) / gridSquareWidth
          const leftColumn = Math.round(leftDistance)

          const rightDistance = (cursorRect.right - gridRect.left) / gridSquareWidth
          const rightColumn = Math.round(rightDistance)

          const topDistance = (cursorRect.top - gridRect.top) / gridSquareHeight
          const topRow = Math.round(topDistance)

          const bottomDistance = (cursorRect.bottom- gridRect.top) / gridSquareHeight
          const bottomRow = Math.round(bottomDistance)

          let nearestColumn = [0, "top"]
          let nearestRow = [0, "left"]
          let columnDistance = 1
          let rowDistance = 1

          if (Math.abs(rightDistance - rightColumn) < Math.abs(leftDistance - leftColumn)) {
            nearestColumn = [rightColumn, "right"]
            columnDistance = Math.abs(rightDistance - rightColumn)
          } else {
            nearestColumn = [leftColumn, "left"]
            columnDistance = Math.abs(leftDistance - leftColumn)
          }

          if (Math.abs(bottomDistance - bottomRow) < Math.abs(topDistance - topRow)) {
            nearestRow = [bottomRow, "bottom"]
            rowDistance = Math.abs(bottomDistance - bottomRow)
          } else {
            nearestRow = [topRow, "top"]
            rowDistance = Math.abs(topDistance - topRow)
          } 


          // Snap to nearest gridlines, if close enough
          if (true) {
            if (columnDistance * gridSquareWidth < this.gridMetaData.SNAP_THRESHOLD && rowDistance * gridSquareHeight < this.gridMetaData.SNAP_THRESHOLD) {
              this.selectGrid(nearestColumn, nearestRow) 
            } else {
              this.clearSelectedGrid()
            }
          }
        }

        if (this.props.dragStatus.startPoint && dragType === 'moving') {
          const [lineX, lineY] = [
            canvasOffsetLeft - this.props.dragStatus.edgeDistance.left + this.props.dragStatus.startPointInitialX + this.commentPointRadius,
            canvasOffsetTop - this.props.dragStatus.edgeDistance.top + this.props.dragStatus.startPointInitialY + this.commentPointRadius
          ]
          this.props.drawCommentLine(widget.dataset.widgetId, {startPoint: [lineX, lineY]})
        }
      } 
    },

    onDragLeave (e) {
      e.preventDefault()
      this.clearSelectedGrid()
    },


    onDragDrop (e) {
      e.preventDefault()
      if (this.props.dragStatus.dragType === 'comment-line') {
        e.target.classList.remove('dragging')
      } else if (this.props.dragStatus.dragType === 'adding' || this.props.dragStatus.dragType === 'moving') {
        const dropLocation = e.target.classList.contains('widget') && e.target.dataset.widgetId !== e.dataTransfer.getData('id') ? e.target : this.gridMetaData.gridContainer

        const gridRect = dropLocation.getBoundingClientRect()

        let gridPlacement = {}
        
        // If showing grid AND holding alt key, drop element at nearest grid line, if possible
        if (this.props.toolbarOptions.showGrid && e.shiftKey &&
          dropLocation === this.gridMetaData.gridContainer && this.selectedGrid.row !== null && this.selectedGrid.column !== null ) {
          const gridWidth = (dropLocation.scrollWidth / this.gridMetaData.numGridColumns)
          const gridHeight = (dropLocation.scrollHeight / this.gridMetaData.numGridRows)

          const isRight = this.selectedGrid.horizontalPlacement === 'right' ? 1 : 0
          const isBottom = this.selectedGrid.verticalPlacement === 'bottom' ? 1 : 0

          gridPlacement = {
            placement:'absolute',
            x: this.selectedGrid.column * gridWidth - isRight * this.dragStatus.draggedWidget.offsetWidth,
            y: this.selectedGrid.row * gridHeight - isBottom * this.dragStatus.draggedWidget.offsetHeight
          }
        } else {
          gridPlacement = {
            placement:'absolute',
            x: e.clientX - gridRect.left - e.dataTransfer.getData('width') / 2,
            y: e.clientY - gridRect.top - e.dataTransfer.getData('height') / 2
          }
        }
    
        
        if (e.dataTransfer.getData('moving')) {
          this.moveWidget(e.dataTransfer.getData('id'), dropLocation, gridPlacement, this.dragStatus.comment)
        } else {
          this.props.addWidget(e.dataTransfer.getData('id'), dropLocation, gridPlacement, this.dragStatus.comment)
        }
      }
      
      this.clearSelectedGrid()
      this.props.restoreUserStyling(this.props.dragStatus.draggedWidget)
    },

    onMouseMove (e) {
      if (this.props.dragStatus.dragType === 'resizing') {
        e.preventDefault()
        let redraw = false
        const widget = this.props.dragStatus.draggedWidget
        const widgetId = widget.dataset.widgetId
        const startPoint = this.props.dragStatus.startPoint
        const [startPointInitialX, startPointInitialY] = [this.props.dragStatus.startPointInitialX, this.props.dragStatus.startPointInitialY]

        const [initialClientX, initialClientY] = [this.props.dragStatus.initialClientX, this.props.dragStatus.initialClientY]
        const deltaX = e.clientX - initialClientX
        const deltaY = -(e.clientY - initialClientY)

        if (this.props.dragStatus.cursorHorizontalPlacement === 'left') {
          widget.style.width = `${this.props.dragStatus.initialWidth - deltaX}px`
          if (deltaX < this.props.dragStatus.initialWidth) {
            widget.style.left = `${this.props.dragStatus.initialLeft + deltaX}px`
          }

          if (startPoint) {
            let newStartPointX = startPointInitialX - deltaX
            if (newStartPointX < -1 * this.commentPointRadius) {
              newStartPointX = -1 * this.commentPointRadius
              redraw = true
            }
            startPoint.style.left = `${newStartPointX}px`
          }
  
        } else {
          const newWidth = Math.max(this.props.dragStatus.initialWidth + deltaX, 8)
          widget.style.width = `${newWidth}px`

          if (startPoint && deltaX < 0) {
            if (this.props.pixelsToInt(startPoint.style.left) - this.commentPointRadius > newWidth) {
              startPoint.style.left = `${newWidth - this.commentPointRadius}px`
              redraw = true
            }
          }
        }

        if (this.props.dragStatus.cursorVerticalPlacement === 'top') {
          widget.style.height = `${this.props.dragStatus.initialHeight + deltaY}px`
          
          if (deltaY > -1 * this.props.dragStatus.initialHeight) {
            widget.style.top = `${this.props.dragStatus.initialTop - deltaY}px`
          }

          if (startPoint) {
            let newStartPointY = startPointInitialY + deltaY

            if (newStartPointY < -1 * this.commentPointRadius) {
              newStartPointY = -1 * this.commentPointRadius
              redraw = true
            }
              
            startPoint.style.top = `${newStartPointY}px`
          }

        } else {
          const newHeight = Math.max(this.props.dragStatus.initialHeight - deltaY, 8)
          widget.style.height = `${newHeight}px`

          if (startPoint && deltaY > 0) {
            if (this.props.pixelsToInt(startPoint.style.top) - this.commentPointRadius > newHeight) {
              startPoint.style.top = `${newHeight - this.commentPointRadius}px`
              redraw = true
            }
          }
        }

        if (startPoint && redraw) {
          const [lineX, lineY] = [
            startPoint.offsetLeft + widget.offsetLeft + widget.parentNode.offsetLeft + this.commentPointRadius,
            startPoint.offsetTop + widget.offsetTop + widget.parentNode.offsetTop + this.commentPointRadius
          ]
          this.props.drawCommentLine(widgetId, {startPoint: [lineX, lineY]})
        }

        this.getVirtualWidget(widgetId).attributes.style = this.props.dragStatus.draggedWidget.getAttribute('style')
      }
    },

    onMouseUp (e) {
      e.preventDefault()
      this.props.resetDragStatus()
    },

    moveWidget (widgetId, pageNode, {placement='absolute', x = 0, y = 0}) {
      // Can experiment with transferring innerHTML instead if too slow
      // Should just grab widget from pagewidgets.widgets by widget ID, instead of using element ID
      const displacedElement = this.props.pageWidgets.widgets[widgetId]
      const displacedWidget = displacedElement.rootElement
      // if (pageNode === this.gridMetaData.gridContainer) {
      //   displacedWidget.style.gridColumn = `${columnNum + 1} / span 1`
      //   displacedWidget.style.gridRow = `${rowNum + 1} / span 1`
      // } 
      if (placement === 'absolute') {
        displacedWidget.style.position = 'absolute'

        if (displacedElement.startPoint) {
          // If widget is a comment, offset placement relative to widget location in comment
          console.log(this.props.dragStatus.edgeDistance)
          console.log(this.props.dragStatus.widgetLeft)
          console.log(this.props.dragStatus.widgetTop)
          displacedWidget.style.top = `${y + this.props.dragStatus.widgetTop - this.props.dragStatus.edgeDistance.top}px`
          displacedWidget.style.left = `${x + this.props.dragStatus.widgetLeft - this.props.dragStatus.edgeDistance.left}px`
        } else {
          displacedWidget.style.top = `${y}px`
          displacedWidget.style.left = `${x}px`
        }


        this.getVirtualWidget(widgetId).attributes.style = displacedWidget.getAttribute('style')
      }

      if (pageNode !== displacedWidget && pageNode !== displacedWidget.parentNode) {
        pageNode.appendChild(displacedWidget)
      }
    },

    selectGrid (column, row) {
      const rowNum = Math.floor(row[0])
      const columnNum = Math.floor(column[0])

      const selectedRow = this.selectedGrid.row
      const selectedColumn = this.selectedGrid.column

      const gridElements = this.pageMetaData.gridElements

      if (rowNum !== selectedRow || columnNum !== selectedColumn) {
        
        if (selectedRow !== null) {
          gridElements.rows[selectedRow].classList.remove('red')
        }

        if (selectedColumn !== null) {
          gridElements.columns[selectedColumn].classList.remove('red')
        }

        gridElements.rows[rowNum].classList.add('red')
        gridElements.columns[columnNum].classList.add('red')
      }

      this.selectedGrid = {
          row: rowNum,
          column: columnNum,
          verticalPlacement: row[1],
          horizontalPlacement: column[1]
      }
    },
  
    clearSelectedGrid () {
      const selectedRow = this.selectedGrid.row
      const selectedColumn = this.selectedGrid.column

      const gridElements = this.pageMetaData.gridElements

      if (selectedRow !== null) {
        gridElements.rows[selectedRow].classList.remove('red')
      }

      if (selectedColumn !== null) {
        gridElements.columns[selectedColumn].classList.remove('red')
      }

      this.selectedGrid = {
          row: null,
          column: null,
          verticalPlacement: null,
          horizontalPlacement: null
      }
    },

    getVirtualWidget (widgetId) {
      return eval(`this.props.virtualCanvas.elements${this.props.virtualCanvas.idMap[widgetId]}`)
    },
  },
  mounted () {
    this.props.pageMetaData.pageContainer = document.getElementById("page-container")

    this.gridMetaData.gridContainer = document.getElementById("grid-container")
    this.gridMetaData.gridStyleSheet = new CSSStyleSheet()
    this.gridMetaData.numGridColumns = 8
    this.gridMetaData.numGridRows = Math.ceil(this.pageHeight / 200)

  
    const styleSheet = new CSSStyleSheet()

    styleSheet.insertRule(`#grid-container .column { grid-row: 1 / span ${this.gridMetaData.numGridRows} }`, styleSheet.cssRules.length);
    document.adoptedStyleSheets = [styleSheet]
    this.gridMetaData.gridStyleSheet = styleSheet

    // Add tooltip listener
    let timer
    const showTooltip = (event) => {
      if (!this.props.dragStatus.dragType) {
        const widget = event.target.closest(".widget")
        if (widget) {
          this.props.tooltip.classList.add("visible")
          this.props.tooltip.textContent = `Double-click to edit ${widget.dataset.title}`
          this.props.tooltip.style.left = `${event.x}px`
          this.props.tooltip.style.top = `${event.y}px`
        }
      }
    }

    this.props.pageMetaData.pageContainer.addEventListener("mousemove", (event) => {
      this.props.tooltip.classList.remove("visible")
      clearTimeout(timer)
      timer = setTimeout(() => showTooltip(event), 1500)
    })

    this.$emit('mounted', {})
  },
  watch: {
    numGridColumns(newValue, oldValue) {
      this.$nextTick(() => {
        const stylesheet = this.gridMetaData.gridStyleSheet

        document.querySelectorAll('#grid-container .column').forEach((column, index) => {
          stylesheet.insertRule(`#grid-container .col-start-${index + 1} { grid-column-start: ${index + 1} }`, stylesheet.cssRules.length);
          stylesheet.insertRule(`#grid-container .col-end-${index + 1} { grid-column-end: ${index + 1} }`, stylesheet.cssRules.length);
          this.gridMetaData.gridElements.columns.push(column)
        })
      })
    },
    numGridRows(newValue, oldValue) {
      const stylesheet = this.gridMetaData.gridStyleSheet

      this.$nextTick(() => {
        document.querySelectorAll('#grid-container .row').forEach((row, index) => {
          stylesheet.insertRule(`#grid-container .row-start-${index + 1} { grid-row-start: ${index + 1} }`, stylesheet.cssRules.length);
          stylesheet.insertRule(`#grid-container .row-end-${index + 1} { grid-row-end: ${index + 1} }`, stylesheet.cssRules.length);
          this.gridMetaData.gridElements.rows.push(row)
        })
      })
    }
  }
})

</script>