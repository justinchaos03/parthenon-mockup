<template>
  <div id="page-container">
    <div id="grid-container"
      @dragstart="onDragStart"
      @dragover="onDragOver"
      @dragend="onDragEnd"
      @dragleave="onDragLeave"
      @drop="onDragDrop">
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
    const snapThreshold = 0.2

    const gridElements = ref({
      rows: [],
      columns: [],

    })
    const selectedGrid = ref({
      row: null,
      column: null,
    })


    const tooltip = ref(null)
    const dragging = ref(false)
    const draggedWidget = ref(null)

    return {
      props,
      pageContent,
      gridContainer,
      numGridColumns,
      numGridRows,
      gridStyleSheet,
      snapThreshold,
      gridElements,
      selectedGrid,
      tooltip,
      dragging,
      draggedWidget
    }
  },
  computed: {
    pageHeight () {
      return this.pageContent? this.pageContent.clientHeight : 0
    },
  },
  methods: {
    onDragStart (e) {
      e.dataTransfer.setData('id', e.target.dataset.widgetId)
      e.dataTransfer.setData('width', e.target.offsetWidth)
      e.dataTransfer.setData('height', e.target.offsetHeight)
      e.dataTransfer.setData('moving', true)
      e.dataTransfer.dropEffect = 'move'
      this.dragging = true
      this.draggedWidget = e.target.dataset.widgetId
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
          if ((gridHorizontalPlacement < this.snapThreshold || Math.abs(1 - gridHorizontalPlacement) < this.snapThreshold) &&
           (gridVerticalPlacement < this.snapThreshold || Math.abs(1 - gridVerticalPlacement) < this.snapThreshold)) {
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
      this.dragging = false
      this.draggedWidget = null
    },

    onDragDrop (e) {
      e.preventDefault()
      
      const dropLocation = e.target.classList.contains('widget') ? e.target : this.gridContainer

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
      this.clearSelectedGrid()
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
        if (this.draggedWidget !== event.target.dataset?.widgetId) {
          event.currentTarget.classList.add('red')
        }
      })

      newWidget.addEventListener('dragstart', (event) => {
        if (event.target !== event.currentTarget) {
          event.currentTarget.classList.add('red')
        }
      })

      newWidget.addEventListener('dragleave', (event) => {
        event.currentTarget.classList.remove('red')
      })

      newWidget.addEventListener('drop', (event) => {
        event.currentTarget.classList.remove('red')
      })

      newWidget.addEventListener("dblclick", (event) => {
        event.stopPropagation()
        this.tooltip.classList.remove('visible')
        this.editWidget(currentWidgetId)
      });
      
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

    selectGrid: function (row, column) {
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
  
    clearSelectedGrid: function () {
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
      if (!this.dragging) {
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