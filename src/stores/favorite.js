import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

export const useFavoriteStore = defineStore(
  'favorite',
  () => {
    const items = ref([])
    const ids = computed(() => items.value.map((item) => Number(item.caseId)))

    const hydrate = (list) => {
      items.value = list
    }

    const add = (item) => {
      items.value = [...items.value, item]
    }

    const remove = (caseId) => {
      items.value = items.value.filter((item) => Number(item.caseId) !== Number(caseId))
    }

    const reset = () => {
      items.value = []
    }

    return { items, ids, hydrate, add, remove, reset }
  },
  {
    persist: {
      key: 'bionic-favorites',
      storage: localStorage,
      pick: ['items'],
    },
  },
)
