const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

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
  
  db.run(sql, [title, author, isbn, publisher], function(err) {
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

// サーバーの起動
app.listen(port, () => {
  console.log(`サーバーが起動しました: http://localhost:${port}`);
}); 