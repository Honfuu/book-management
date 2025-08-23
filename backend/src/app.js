const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const https = require('https');

const app = express();
const port = process.env.PORT || 3001;

// ミドルウェアの設定
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// データベースの設定
const db = new sqlite3.Database(path.join(__dirname, '../database.sqlite'), (err) => {
  if (err) {
    console.error('データベース接続エラー:', err);
  } else {
    console.log('データベースに接続しました');
    // テーブルの作成
    db.run(`
      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT,
        isbn TEXT,
        publisher TEXT,
        category_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// ルートの設定
app.get('/', (req, res) => {
  res.json({ message: '書籍管理システムAPI' });
});

// 書籍一覧の取得
app.get('/api/books', (req, res) => {
  db.all('SELECT * FROM books', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// 書籍の追加
app.post('/api/books', (req, res) => {
  const { title, author, isbn, publisher } = req.body;
  const sql = 'INSERT INTO books (title, author, isbn, publisher) VALUES (?, ?, ?, ?)';

  db.run(sql, [title, author, isbn, publisher], function (err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ id: this.lastID });
  });
});

// 書籍の更新
app.put('/api/books/:id', (req, res) => {
  const { title, author, isbn, publisher } = req.body;
  const sql = 'UPDATE books SET title = ?, author = ?, isbn = ?, publisher = ? WHERE id = ?';

  db.run(sql, [title, author, isbn, publisher, req.params.id], (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: '更新が完了しました' });
  });
});

// 書籍の削除
app.delete('/api/books/:id', (req, res) => {
  db.run('DELETE FROM books WHERE id = ?', req.params.id, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ message: '削除が完了しました' });
  });
});

// バーコードから書籍情報を取得（ISBN、JAN、UPC対応）
app.get('/api/books/lookup/:code', (req, res) => {
  const code = req.params.code;
  console.log('書籍情報取得リクエスト:', code);

  // バーコード形式を判定
  let barcodeType = '';
  let searchCode = code;

  if (code.length === 13 && code.startsWith('4')) {
    barcodeType = 'JAN-13 (日本)';
  } else if (code.length === 13) {
    barcodeType = 'EAN-13 (国際)';
  } else if (code.length === 8) {
    barcodeType = 'JAN-8 (EAN-8)';
  } else if (code.length === 12) {
    barcodeType = 'UPC-A';
    // UPC-AをEAN-13に変換（先頭に0を追加）
    searchCode = '0' + code;
  } else if (code.length === 6 || code.length === 8) {
    barcodeType = 'UPC-E';
    // UPC-Eの場合はUPC-Aに変換してから処理
    // 簡易的な変換（実際の変換ロジックは複雑）
    searchCode = '0' + code;
  } else {
    barcodeType = 'その他';
  }

  console.log(`バーコード形式: ${barcodeType}, 検索コード: ${searchCode}`);

  // OpenBD APIで書籍情報を取得
  const url = `https://api.openbd.jp/v1/get?isbn=${searchCode}`;

  https.get(url, (apiRes) => {
    let data = '';
    apiRes.on('data', (chunk) => { data += chunk; });
    apiRes.on('end', () => {
      try {
        const books = JSON.parse(data);
        if (books && books.length > 0 && books[0] && books[0].summary) {
          const summary = books[0].summary;
          const bookData = {
            title: summary.title || '',
            author: summary.author || '',
            publisher: summary.publisher || '',
            isbn: summary.isbn || searchCode,
            barcodeType: barcodeType,
            originalCode: code
          };
          console.log('取得された書籍情報:', bookData);
          res.json(bookData);
        } else {
          console.log('OpenBDで書籍情報が見つかりませんでした');

          // 代替手段：Google Books APIを試行
          const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=isbn:${searchCode}`;
          https.get(googleUrl, (googleRes) => {
            let googleData = '';
            googleRes.on('data', (chunk) => { googleData += chunk; });
            googleRes.on('end', () => {
              try {
                const googleBooks = JSON.parse(googleData);
                if (googleBooks.items && googleBooks.items.length > 0) {
                  const book = googleBooks.items[0].volumeInfo;
                  const bookData = {
                    title: book.title || '',
                    author: book.authors ? book.authors.join(', ') : '',
                    publisher: book.publisher || '',
                    isbn: searchCode,
                    barcodeType: barcodeType,
                    originalCode: code,
                    source: 'Google Books'
                  };
                  console.log('Google Booksから取得された書籍情報:', bookData);
                  res.json(bookData);
                } else {
                  res.status(404).json({
                    error: '書籍情報が見つかりませんでした',
                    barcodeType: barcodeType,
                    code: code,
                    message: 'OpenBDとGoogle Booksの両方で検索しましたが、該当する書籍が見つかりませんでした。'
                  });
                }
              } catch (error) {
                console.error('Google Books APIレスポンスの解析エラー:', error);
                res.status(404).json({
                  error: '書籍情報が見つかりませんでした',
                  barcodeType: barcodeType,
                  code: code,
                  message: 'OpenBDで検索しましたが、該当する書籍が見つかりませんでした。'
                });
              }
            });
          }).on('error', (error) => {
            console.error('Google Books APIリクエストエラー:', error);
            res.status(404).json({
              error: '書籍情報が見つかりませんでした',
              barcodeType: barcodeType,
              code: code,
              message: 'OpenBDで検索しましたが、該当する書籍が見つかりませんでした。'
            });
          });
        }
      } catch (error) {
        console.error('OpenBD APIレスポンスの解析エラー:', error);
        res.status(500).json({ error: '書籍情報の取得に失敗しました' });
      }
    });
  }).on('error', (error) => {
    console.error('OpenBD APIリクエストエラー:', error);
    res.status(500).json({ error: '書籍情報の取得に失敗しました' });
  });
});

// サーバーの起動
app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
}); 
