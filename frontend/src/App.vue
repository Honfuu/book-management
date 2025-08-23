<script setup>
import { ref } from 'vue'
import BookList from './components/BookList.vue'
import BookModal from './components/BookModal.vue'

const showModal = ref(false)
const selectedBook = ref(null)
const isEdit = ref(false)
const bookListRef = ref(null)

function closeModal() {
  console.log('closeModal called');
  showModal.value = false;
}

function handleSaved() {
  console.log('handleSaved called, bookListRef:', bookListRef.value)
  
  // 書籍一覧の再取得
  if (bookListRef.value && typeof bookListRef.value.fetchBooks === 'function') {
    try {
      bookListRef.value.fetchBooks()
      console.log('書籍一覧の更新が完了しました')
    } catch (error) {
      console.error('書籍一覧の更新に失敗しました:', error)
    }
  } else {
    console.warn('bookListRefまたはfetchBooks関数が見つかりません')
  }
  
  showModal.value = false
}

function addBook() {
  selectedBook.value = null
  isEdit.value = false
  showModal.value = true
}

function editBook(book) {
  selectedBook.value = book
  isEdit.value = true
  showModal.value = true
}
</script>

<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex">
            <div class="flex-shrink-0 flex items-center">
              <h1 class="text-xl font-bold text-gray-800">書籍管理システム</h1>
            </div>
          </div>
        </div>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <BookList ref="bookListRef" @add="addBook" @edit="editBook" />
    </main>

    <BookModal
      :show="showModal"
      :book="selectedBook"
      :is-edit="isEdit"
      @close="closeModal"
      @saved="handleSaved"
    />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
