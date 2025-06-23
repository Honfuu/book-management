<template>
  <div v-if="show" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white rounded-lg p-8 w-full max-w-md">
      <h2 class="text-2xl font-bold mb-6">{{ isEdit ? '書籍の編集' : '新規書籍の追加' }}</h2>
      
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700">タイトル</label>
          <input
            v-model="form.title"
            type="text"
            required
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">著者</label>
          <input
            v-model="form.author"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">出版社</label>
          <input
            v-model="form.publisher"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">ISBN</label>
          <input
            v-model="form.isbn"
            type="text"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div class="flex justify-end space-x-3 mt-6">
          <button
            type="button"
            @click="$emit('close')"
            class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            type="submit"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
          >
            {{ isEdit ? '更新' : '追加' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'

// axiosのデフォルト設定
axios.defaults.baseURL = 'http://localhost:3001'
axios.defaults.headers.common['Content-Type'] = 'application/json'

const props = defineProps({
  show: Boolean,
  book: Object,
  isEdit: Boolean
})

const emit = defineEmits(['close', 'saved'])

const form = ref({
  title: '',
  author: '',
  publisher: '',
  isbn: ''
})

// 編集モードの場合、既存のデータをフォームに設定
watch(() => props.book, (newBook) => {
  if (newBook) {
    form.value = { ...newBook }
  }
}, { immediate: true })

// フォームの送信処理
const handleSubmit = async () => {
  try {
    if (props.isEdit) {
      await axios.put(`/api/books/${props.book.id}`, form.value)
    } else {
      await axios.post('/api/books', form.value)
    }
    emit('saved')
    emit('close')
  } catch (error) {
    console.error('書籍の保存に失敗しました:', error)
  }
}
</script> 