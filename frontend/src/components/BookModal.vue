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
            name="title"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">著者</label>
          <input
            v-model="form.author"
            type="text"
            name="author"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">出版社</label>
          <input
            v-model="form.publisher"
            type="text"
            name="publisher"
            class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">ISBN</label>
          <div class="flex space-x-2">
            <input
              v-model="form.isbn"
              type="text"
              name="isbn"
              class="mt-1 block flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <button
              type="button"
              @click="showBarcodeScanner = true"
              class="mt-1 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
              title="バーコードをスキャン"
            >
              📷
            </button>
          </div>
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
            :disabled="isSubmitting"
            class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
          >
            <span v-if="isSubmitting" class="animate-spin mr-2">⏳</span>
            {{ isSubmitting ? '処理中...' : (isEdit ? '更新' : '追加') }}
          </button>
        </div>
      </form>
    </div>

    <!-- バーコードスキャナーモーダル -->
    <div v-if="showBarcodeScanner" class="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div class="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <BarcodeScanner
          :show="showBarcodeScanner"
          @code-scanned="handleBarcodeScanned"
          @close="showBarcodeScanner = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import axios from 'axios'
import BarcodeScanner from './BarcodeScanner.vue'

// axiosのデフォルト設定
axios.defaults.baseURL = 'http://localhost:3001'
axios.defaults.headers.common['Content-Type'] = 'application/json'

// 開発環境でのHTTPSからHTTPへの接続を許可
if (window.location.protocol === 'https:') {
  console.log('HTTPS環境からHTTPバックエンドに接続します')
}

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

const showBarcodeScanner = ref(false)
const isSubmitting = ref(false)

// 編集モードの場合、既存のデータをフォームに設定
watch(() => props.book, (newBook) => {
  if (newBook) {
    form.value = { ...newBook }
  }
}, { immediate: true })

// モーダルが開くたびにフォームを初期化
watch([
  () => props.show,
  () => props.book,
  () => props.isEdit
], ([isShow, book, isEdit]) => {
  if (isShow) {
    if (book && isEdit) {
      // 編集モードの場合、既存データを設定
      form.value = { ...book }
    } else {
      // 新規追加モードの場合、フォームをリセット
      form.value = {
        title: '',
        author: '',
        publisher: '',
        isbn: ''
      }
    }
  }
}, { immediate: true })

// バーコード読み取り処理
const handleBarcodeScanned = async (code) => {
  console.log('バーコードが読み取られました:', code)
  form.value.isbn = code
  showBarcodeScanner.value = false
  
  // バーコードから書籍情報を自動取得
  try {
    console.log('書籍情報を取得中...')
    const response = await axios.get(`/api/books/lookup/${code}`)
    
    if (response.data && !response.data.error) {
      const bookInfo = response.data
      console.log('取得された書籍情報:', bookInfo)
      
      // フォームに書籍情報を自動入力
      form.value.title = bookInfo.title || form.value.title
      form.value.author = bookInfo.author || form.value.author
      form.value.publisher = bookInfo.publisher || form.value.publisher
      
      // バーコード形式の情報も表示（デバッグ用）
      if (bookInfo.barcodeType) {
        console.log(`バーコード形式: ${bookInfo.barcodeType}`)
      }
      if (bookInfo.source) {
        console.log(`情報源: ${bookInfo.source}`)
      }
      
      // 成功メッセージを表示
      alert(`✅ 書籍情報を自動取得しました！\n\nタイトル: ${bookInfo.title || '不明'}\n著者: ${bookInfo.author || '不明'}\n出版社: ${bookInfo.publisher || '不明'}`)
      
    } else {
      console.log('書籍情報が見つかりませんでした:', response.data)
      alert(`❌ 書籍情報が見つかりませんでした\n\nバーコード: ${code}\n\n手動で書籍情報を入力してください。`)
    }
    
  } catch (error) {
    console.error('書籍情報の取得に失敗しました:', error)
    
    if (error.response && error.response.status === 404) {
      alert(`❌ 書籍情報が見つかりませんでした\n\nバーコード: ${code}\n\n手動で書籍情報を入力してください。`)
    } else {
      alert(`❌ 書籍情報の取得に失敗しました\n\nエラー: ${error.message}\n\n手動で書籍情報を入力してください。`)
    }
  }
}

// フォームの送信処理
const handleSubmit = async () => {
  console.log('フォーム送信開始:', form.value)
  
  // 基本的なバリデーション
  if (!form.value.title || form.value.title.trim() === '') {
    alert('❌ タイトルを入力してください')
    return
  }
  
  // 重複送信を防ぐ
  if (isSubmitting.value) {
    console.log('送信中です。重複送信は無視されます。')
    return
  }
  
  isSubmitting.value = true
  
  try {
    if (props.isEdit) {
      console.log('書籍更新中...')
      const response = await axios.put(`/api/books/${props.book.id}`, form.value)
      console.log('更新成功:', response.data)
      alert('✅ 書籍の更新が完了しました')
    } else {
      console.log('書籍追加中...')
      const response = await axios.post('/api/books', form.value)
      console.log('追加成功:', response.data)
      alert('✅ 書籍の追加が完了しました')
    }
    
         console.log('書籍の保存が完了しました')
     emit('saved') // 保存成功時のみ
     emit('close') // モーダルを閉じる
     
   } catch (error) {
     console.error('書籍の保存に失敗しました:', error)
     
     if (error.response) {
       // サーバーからのエラーレスポンス
       console.error('エラーレスポンス:', error.response.data)
       alert(`❌ 保存に失敗しました\n\nエラー: ${error.response.data.error || error.message}`)
     } else if (error.request) {
       // リクエストは送信されたがレスポンスがない
       console.error('リクエストエラー:', error.request)
       alert('❌ サーバーに接続できません\n\nバックエンドサーバーが起動しているか確認してください')
     } else {
       // その他のエラー
       console.error('その他のエラー:', error.message)
       alert(`❌ 予期しないエラーが発生しました\n\nエラー: ${error.message}`)
     }
   } finally {
     isSubmitting.value = false
   }
 }
</script> 
