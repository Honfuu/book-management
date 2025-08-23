<template>
  <div class="barcode-scanner">
    <div v-if="!isScanning" class="text-center">
      <button
        @click="startScanning"
        class="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors"
      >
        📷 バーコードをスキャン
      </button>
    </div>
    
    <div v-else class="scanner-container">
      <div class="scanner-header">
        <h3 class="text-lg font-semibold mb-2">バーコードスキャナー</h3>
        <p class="text-sm text-gray-600 mb-4">カメラでバーコードを読み取ってください</p>
        <div class="flex space-x-2">
          <button
            @click="switchCamera"
            class="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
            title="カメラを切り替え"
          >
            🔄 カメラ切り替え
          </button>
          <button
            @click="stopScanning"
            class="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
          >
            キャンセル
          </button>
        </div>
      </div>
      
      <div class="scanner-viewport-container">
        <div id="interactive" class="scanner-viewport"></div>
        
        <!-- 読み取りガイドオーバーレイ -->
        <div class="scanner-overlay">
          <!-- 中央の読み取りエリア -->
          <div class="scan-area">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
          </div>
          
                     <!-- ガイドテキスト -->
           <div class="guide-text">
             <div class="guide-title">📱 バーコードを枠内に配置</div>
             <div class="guide-subtitle">JAN、ISBN、UPC、その他のバーコードに対応</div>
           </div>
          
          <!-- 読み取り状態インジケーター -->
          <div class="scan-status">
            <div class="status-dot" :class="{ 'scanning': isProcessing }"></div>
            <span class="status-text">{{ isProcessing ? '読み取り中...' : '待機中' }}</span>
          </div>
          
          <!-- 現在のカメラ情報 -->
          <div class="camera-info">
            <span class="camera-label">📷 {{ currentCameraName }}</span>
          </div>
        </div>
      </div>
      
             <div v-if="scannedCode" class="mt-4 p-3 bg-green-100 rounded-md">
         <div class="flex items-center justify-between mb-2">
           <p class="text-sm font-medium text-green-800">
             読み取り成功: <span class="font-mono">{{ scannedCode }}</span>
           </p>
           <span class="text-xs text-green-600 bg-green-200 px-2 py-1 rounded">
             {{ getBarcodeFormat(scannedCode) }}
           </span>
         </div>
         <div class="text-xs text-green-700 mb-2">
           📚 3秒後に自動で書籍情報を取得します
         </div>
         <div class="flex space-x-2">
           <button
             @click="confirmCode"
             class="px-3 py-1 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm"
           >
             🚀 今すぐ取得
           </button>
           <button
             @click="scannedCode = ''"
             class="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm"
           >
             🔄 再読み取り
           </button>
         </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import Quagga from 'quagga'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['code-scanned', 'close'])

const isScanning = ref(false)
const scannedCode = ref('')
const isProcessing = ref(false)
const availableCameras = ref([])
const currentCameraIndex = ref(0)
const currentCameraName = ref('')

const startScanning = async () => {
  console.log('バーコードスキャンを開始します...')
  isScanning.value = true
  scannedCode.value = ''
  
  // カメラの利用可能性をチェック
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    console.error('カメラAPIが利用できません')
    alert('お使いのブラウザはカメラ機能をサポートしていません。')
    stopScanning()
    return
  }
  
  try {
    // 利用可能なカメラを列挙
    const devices = await navigator.mediaDevices.enumerateDevices()
    const videoDevices = devices.filter(device => device.kind === 'videoinput')
    
    console.log('利用可能なカメラ:', videoDevices)
    
    // 利用可能なカメラを保存
    availableCameras.value = videoDevices
    
    // 背面カメラを優先的に選択
    let preferredCameraIndex = 0
    
    // 背面カメラを探す（ラベルに'back'、'rear'、'環境'などの文字列が含まれる場合）
    const preferredCamera = videoDevices.find((device, index) => {
      if (device.label.toLowerCase().includes('back') ||
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('環境') ||
          device.label.toLowerCase().includes('背面')) {
        preferredCameraIndex = index
        return true
      }
      return false
    })
    
    if (preferredCamera) {
      console.log('背面カメラが見つかりました:', preferredCamera.label)
      currentCameraIndex.value = preferredCameraIndex
    } else {
      console.log('背面カメラが見つからないため、デフォルトのカメラを使用します')
      currentCameraIndex.value = 0
    }
    
    // 現在のカメラ名を設定
    currentCameraName.value = videoDevices[currentCameraIndex.value].label || `カメラ ${currentCameraIndex.value + 1}`
    
    // カメラ権限を取得
    await startCameraStream()
    
  } catch (err) {
    console.error('カメラ権限エラー:', err)
    if (err.name === 'NotAllowedError') {
      alert('カメラの権限が拒否されました。ブラウザの設定でカメラを許可してください。\n\nChromeの場合：アドレスバーのカメラアイコンをクリック→「許可」を選択')
    } else if (err.name === 'NotFoundError') {
      alert('カメラが見つかりません。カメラが接続されているか確認してください。')
    } else {
      alert('カメラの初期化に失敗しました: ' + err.message)
    }
    stopScanning()
  }
}

// カメラストリームを開始
const startCameraStream = async () => {
  try {
    console.log('カメラストリーム開始中...')
    console.log('使用するカメラ:', availableCameras.value[currentCameraIndex.value])
    
    // 現在のカメラでストリームを取得
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: {
        deviceId: { exact: availableCameras.value[currentCameraIndex.value].deviceId },
        width: { ideal: 1280, min: 640 },
        height: { ideal: 720, min: 480 }
      } 
    })
    
    console.log('カメラ権限が確認されました')
    console.log('取得されたストリーム:', stream)
    
    // ストリームを停止してからQuaggaを初期化
    stream.getTracks().forEach(track => {
      console.log('トラック停止:', track.label)
      track.stop()
    })
    
    console.log('Quagga初期化を開始します...')
    initializeQuagga()
    
  } catch (err) {
    console.error('カメラストリーム開始エラー:', err)
    console.error('エラー詳細:', {
      name: err.name,
      message: err.message,
      constraint: err.constraint
    })
    alert('カメラの起動に失敗しました: ' + err.message)
    stopScanning()
  }
}

// カメラを切り替え
const switchCamera = async () => {
  if (availableCameras.value.length <= 1) {
    alert('利用可能なカメラが1つしかありません')
    return
  }
  
  try {
    console.log('カメラ切り替えを開始します...')
    
    // Quaggaを停止
    if (typeof Quagga.stop === 'function') {
      Quagga.stop()
      console.log('Quaggaを停止しました')
    }
    
    // 次のカメラに切り替え
    currentCameraIndex.value = (currentCameraIndex.value + 1) % availableCameras.value.length
    currentCameraName.value = availableCameras.value[currentCameraIndex.value].label || `カメラ ${currentCameraIndex.value + 1}`
    
    console.log(`カメラを切り替えました: ${currentCameraName.value}`)
    console.log('新しいカメラの詳細:', availableCameras.value[currentCameraIndex.value])
    
    // 少し待ってから新しいカメラでストリームを開始
    setTimeout(async () => {
      await startCameraStream()
    }, 500)
    
  } catch (err) {
    console.error('カメラ切り替えエラー:', err)
    alert('カメラの切り替えに失敗しました: ' + err.message)
  }
}

const initializeQuagga = () => {
  console.log('Quaggaを初期化中...')
  console.log('使用するカメラのデバイスID:', availableCameras.value[currentCameraIndex.value].deviceId)
  
  try {
    const config = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        target: "#interactive",
        constraints: {
          deviceId: { exact: availableCameras.value[currentCameraIndex.value].deviceId },
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          aspectRatio: { min: 1, max: 2 }
        },
        area: { // 読み取りエリアを制限
          top: "20%",
          right: "20%",
          left: "20%",
          bottom: "20%"
        }
      },
             decoder: {
         readers: [
           "ean_reader",        // EAN-13 (JAN-13)
           "ean_8_reader",     // EAN-8 (JAN-8)
           "upc_reader",       // UPC-A
           "upc_e_reader",     // UPC-E
           "code_128_reader",  // Code 128
           "code_39_reader",   // Code 39
           "codabar_reader",   // Codabar
           "i2of5_reader",     // Interleaved 2 of 5
           "2of5_reader"       // Standard 2 of 5
         ],
         multiple: false,
         debug: {
           drawBoundingBox: true,
           showFrequency: true,
           drawScanline: true,
           showPattern: true
         },
         // 読み取り精度を向上させる設定
         threshold: 0.1, // より低い閾値で読み取り
         minLength: 8,   // 最小文字数
         maxLength: 13   // 最大文字数
       },
      locate: true,
      frequency: 10,
      debug: true,
      // 読み取り精度を向上させる設定
      numOfWorkers: 4
    }
    
    console.log('Quagga設定:', config)
    
    Quagga.init(config, (err) => {
      if (err) {
        console.error('Quagga initialization failed:', err)
        alert('カメラの初期化に失敗しました。エラー: ' + err.message)
        stopScanning()
        return
      }
      
      console.log('Quaggaの初期化が完了しました')
      
             // イベントハンドラーを安全に設定
       if (typeof Quagga.onDetected === 'function') {
         Quagga.onDetected((result) => {
           const code = result.codeResult.code
           const format = result.codeResult.format
           
           console.log('バーコードが検出されました:', code)
           console.log('バーコード形式:', format)
           console.log('検出結果の詳細:', result)
           
           // 読み取り成功の音を鳴らす（オプション）
           if (typeof Audio !== 'undefined') {
             try {
               const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT')
               audio.play().catch(() => {})
             } catch (e) {
               console.log('音声再生に失敗しました')
             }
           }
           
           scannedCode.value = code
           
           // バーコード形式に応じたメッセージを表示
           let formatMessage = ''
           switch (format) {
             case 'ean_13':
               formatMessage = 'JAN-13 (EAN-13)'
               break
             case 'ean_8':
               formatMessage = 'JAN-8 (EAN-8)'
               break
             case 'upc_a':
               formatMessage = 'UPC-A'
               break
             case 'upc_e':
               formatMessage = 'UPC-E'
               break
             case 'code_128':
               formatMessage = 'Code 128'
               break
             case 'code_39':
               formatMessage = 'Code 39'
               break
             default:
               formatMessage = format
           }
           
           // 自動的にコードを確定（3秒後）
           setTimeout(() => {
             if (scannedCode.value === code) {
               console.log('自動確定を実行します')
               confirmCode()
             }
           }, 3000)
         })
       }

      if (typeof Quagga.onProcessed === 'function') {
        Quagga.onProcessed((result) => {
          if (result) {
            console.log('バーコード処理中...', result)
            isProcessing.value = true
            // より詳細な処理状況を表示
            if (result.codeResult && result.codeResult.code) {
              console.log('処理されたコード:', result.codeResult.code)
            }
            // 処理状態をリセット
            setTimeout(() => {
              isProcessing.value = false
            }, 1000)
          }
        })
      }

      // エラーハンドリングを追加（QuaggaJSのバージョンによって異なる場合がある）
      if (typeof Quagga.onError === 'function') {
        Quagga.onError((error) => {
          console.error('Quaggaエラー:', error)
        })
      }
      
      Quagga.start()
      console.log('Quaggaが開始されました')
    })
  } catch (error) {
    console.error('Quagga初期化エラー:', error)
    alert('Quaggaの初期化に失敗しました: ' + error.message)
    stopScanning()
  }
}

const stopScanning = () => {
  isScanning.value = false
  scannedCode.value = ''
  Quagga.stop()
  emit('close')
}

// バーコード形式を判定する関数
const getBarcodeFormat = (code) => {
  if (!code) return ''
  
  const length = code.length
  if (length === 13 && code.startsWith('4')) {
    return 'JAN-13 (日本)'
  } else if (length === 13) {
    return 'EAN-13 (国際)'
  } else if (length === 8) {
    return 'JAN-8 (EAN-8)'
  } else if (length === 12) {
    return 'UPC-A'
  } else if (length === 6 || length === 8) {
    return 'UPC-E'
  } else if (length >= 1 && length <= 48) {
    return 'Code 128/39'
  } else {
    return 'その他'
  }
}

const confirmCode = () => {
  if (scannedCode.value) {
    emit('code-scanned', scannedCode.value)
    stopScanning()
  }
}

// コンポーネントがアンマウントされる際にQuaggaを停止
onUnmounted(() => {
  if (isScanning.value) {
    Quagga.stop()
  }
})
</script>

<style scoped>
.barcode-scanner {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

.scanner-container {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.scanner-header {
  margin-bottom: 20px;
}

.scanner-viewport-container {
  position: relative;
  width: 100%;
  height: 300px;
  overflow: hidden;
  border-radius: 8px;
  background: #f0f0f0;
}

.scanner-viewport {
  width: 100%;
  height: 100%;
}

/* Quaggaのビデオ要素のスタイル調整 */
#interactive video {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover;
}



/* 読み取りガイドオーバーレイのスタイル */
.scanner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
  z-index: 20;
  pointer-events: none; /* オーバーレイ自体はクリックを許可 */
}

/* 中央の読み取りエリア */
.scan-area {
  position: relative;
  width: 80%; /* オーバーレイの80% */
  height: 80%; /* オーバーレイの80% */
  border: 2px solid #00ff00;
  border-radius: 8px;
  pointer-events: none; /* 読み取りエリア自体はクリックを許可 */
  z-index: 15;
}

/* 読み取りエリアの角 */
.corner {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: #00ff00;
  border-radius: 50%;
}

.corner.top-left {
  top: -5px;
  left: -5px;
}

.corner.top-right {
  top: -5px;
  right: -5px;
}

.corner.bottom-left {
  bottom: -5px;
  left: -5px;
}

.corner.bottom-right {
  bottom: -5px;
  right: -5px;
}

/* ガイドテキスト */
.guide-text {
  text-align: center;
  margin-top: 20px;
  z-index: 15;
}

.guide-title {
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 5px;
}

.guide-subtitle {
  font-size: 14px;
  color: #ccc;
}

/* 読み取り状態インジケーター */
.scan-status {
  position: absolute;
  bottom: 20px;
  display: flex;
  align-items: center;
  background-color: rgba(0, 0, 0, 0.7);
  padding: 8px 15px;
  border-radius: 20px;
  z-index: 15;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #4CAF50; /* 緑色 */
  margin-right: 8px;
}

.status-dot.scanning {
  background-color: #FF9800; /* オレンジ色 */
  animation: pulse 1.5s infinite;
}

.status-text {
  font-size: 14px;
  color: white;
}

  @keyframes pulse {
    0% {
      transform: scale(1);
      opacity: 0.7;
    }
    50% {
      transform: scale(1.2);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.7;
    }
  }

  /* カメラ情報表示 */
  .camera-info {
    position: absolute;
    top: 20px;
    right: 20px;
    background-color: rgba(0, 0, 0, 0.7);
    padding: 8px 15px;
    border-radius: 20px;
    z-index: 15;
  }

  .camera-label {
    font-size: 12px;
    color: white;
    font-weight: 500;
  }
</style> 
