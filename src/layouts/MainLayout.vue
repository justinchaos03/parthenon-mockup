<template>
  <q-layout view="lHh Lpr lFf">
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

        <div>Quasar v{{ $q.version }}</div>
      </q-toolbar>
    </q-header>

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
        <template v-for="widget in widgetStructure">
          <WidgetGroup 
            v-if="widget.groupName"
            :key="widget.groupName"
            v-bind="widget"
            :updateDragStatus="this.updateDragStatus"
          />
          <WidgetEditor
            v-else
            :key="widget.title"
            v-bind="widget"
            :updateDragStatus="this.updateDragStatus"
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
      <router-view :pageWidgets="this.pageWidgets['home']" :dragStatus="this.dragStatus" :updateDragStatus="this.updateDragStatus" @editWidget="openEditWidgetForm"/>
    </q-page-container>
  </q-layout>
</template>

<script>
import { defineComponent, ref } from 'vue'
import axios from 'axios';
import WidgetEditor from '../components/WidgetEditor.vue'
import WidgetGroup from '../components/WidgetGroup.vue'
import NewWidgetForm from '../components/NewWidgetForm.vue'
import EditWidgetForm from '../components/EditWidgetForm.vue'


export default defineComponent ({
  name: 'MainLayout',
  setup () {
    const widgetStructure = ref([])
    const widgetGroupDict = ref({})
    const widgetItemDict = ref({})
    const pageWidgets = ref({
      'home': {
        widgetId: 0,
        widgets: {}
      }
    } )


    // State variables for toggling modals & menus
    const leftDrawerOpen = ref(false)

    const newWidgetFormOpen = ref(false)
    const showNewGroupForm = ref(false)

    const editWidgetFormOpen = ref(false)
    const currentlyEditedWidget = ref({})

    const dragStatus = ref({
      dragType: null,
      draggedWidget: null,
      edgeDistance: null,
    })

    
    return {
      widgetStructure,
      widgetItemDict,
      widgetGroupDict,
      pageWidgets,
      leftDrawerOpen,
      newWidgetFormOpen,
      showNewGroupForm,
      editWidgetFormOpen,
      currentlyEditedWidget,
      dragStatus
    }
  },
  components: {
    WidgetEditor,
    WidgetGroup,
    NewWidgetForm,
    EditWidgetForm
  },
  methods: {
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
        this.widgetStructure.forEach(element => {
          if (element.groupName) {
            if (!this.widgetGroupExists(element.groupName)){
              widgetGroupDict[element.groupName] = element
              element.widgets.forEach(item => {
                if (!this.widgetItemExists(item.title)) {
                  widgetItemDict[item.title] = item
                }
              })
            }
          } else {
            if (!this.widgetItemExists(element.title)) {
              widgetItemDict[element.title] = element
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
          "title": newWidget.title,
          "caption": newWidget.caption ?? "",
          "icon": newWidget.icon ?? "",
          "html": newWidget.HTML,
          "settings": []
        }
        if (newWidget.group && newWidget.group.length > 0) {
          try {
            const newWidgetGroup = this.widgetGroupDict[newWidget.group]
            newWidgetGroup.widgets.push(newWidgetJson)
          } catch (error) {
            console.error(error)
          } 
        } else if (!this.widgetItemExists(newWidget.title)) {
          this.widgetStructure.push(newWidgetJson)
          this.widgetItemDict[newWidget.title] = newWidgetJson
        }
      }
    },

    addGroup (newGroup) {
      const newGroupJson = {
        "groupName": newGroup.groupName,
        "caption": newGroup.caption ?? "",
        "icon": newGroup.icon ?? "",
        "widgets": []
      }
      this.widgetStructure.push(newGroupJson)
      this.widgetGroupDict[newGroup.groupName] = newGroupJson
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

    openEditWidgetForm (widgetData) {
      this.editWidgetFormOpen = true
      this.currentlyEditedWidget = widgetData.widgetElement
    },

    submitEditWidgetForm (values) {
      this.currentlyEditedWidget.style = values.style
    },

    deleteWidget (widgetId) {
      this.pageWidgets['home'].widgets[widgetId].remove()
      delete this.pageWidgets['home'].widgets[widgetId]
    },

    updateDragStatus (newDragStatus) {
      this.dragStatus = newDragStatus
    }
  },
  created () {
    this.getWidgets()
  },
})
</script>
