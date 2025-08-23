<template>
  <div class="container mx-auto px-4 py-8">
    <h1 class="text-3xl font-bold mb-6">書籍一覧</h1>
    
    <!-- 検索バー -->
    <div class="mb-6">
      <input
        type="text"
        v-model="searchQuery"
        placeholder="書籍を検索..."
        name="search"
        class="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>

    <!-- 書籍一覧 -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
      <div v-for="book in filteredBooks" :key="book.id" class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
        <h2 class="text-xl font-semibold mb-3 line-clamp-2">{{ book.title }}</h2>
        <p class="text-gray-600 mb-2 text-base">著者: {{ book.author }}</p>
        <p class="text-gray-600 mb-2 text-base">出版社: {{ book.publisher }}</p>
        <p class="text-gray-600 mb-4 text-base">ISBN: {{ book.isbn }}</p>
        <div class="flex justify-end space-x-3">
          <button
            @click="editBook(book)"
            class="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors duration-200"
          >
            編集
          </button>
          <button
            @click="deleteBook(book.id)"
            class="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200"
          >
            削除
          </button>
        </div>
      </div>
    </div>

    <!-- 新規追加ボタン -->
    <button
      @click="$emit('add')"
      class="fixed bottom-8 right-8 bg-green-500 text-white p-4 rounded-full shadow-lg hover:bg-green-600"
    >
      <span class="text-2xl">+</span>
    </button>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import axios from 'axios'

// emitの定義
const emit = defineEmits(['add', 'edit'])

// axiosのデフォルト設定
axios.defaults.baseURL = 'http://localhost:3001'
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 状態管理
const books = ref([])
const searchQuery = ref('')

// 検索機能
const filteredBooks = computed(() => {
  return books.value.filter(book => {
    const query = searchQuery.value.toLowerCase()
    return (
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      book.publisher.toLowerCase().includes(query)
    )
  })
})

// 書籍の取得
const fetchBooks = async () => {
  try {
    const response = await axios.get('/api/books')
    books.value = response.data
  } catch (error) {
    console.error('書籍の取得に失敗しました:', error)
  }
}

// 書籍の編集
const editBook = (book) => {
  emit('edit', book)
}

// 書籍の削除
const deleteBook = async (id) => {
  if (confirm('本当に削除しますか？')) {
    try {
      await axios.delete(`/api/books/${id}`)
      await fetchBooks()
    } catch (error) {
      console.error('書籍の削除に失敗しました:', error)
    }
  }
}

// 初期データの取得
fetchBooks()

// 外部から参照可能にする
defineExpose({
  fetchBooks
})
</script> 
