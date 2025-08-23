const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// データベースファイルのパス
const dbPath = path.join(__dirname, 'database.sqlite');

// データベースに接続
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('データベース接続エラー:', err.message);
    return;
  }
  console.log('データベースに接続しました。');
});

// テーブル一覧を取得
db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, tables) => {
  if (err) {
    console.error('テーブル一覧の取得エラー:', err.message);
    return;
  }

  console.log('\n=== テーブル一覧 ===');
  tables.forEach(table => {
    console.log(table.name);
  });

  // booksテーブルが存在する場合、その内容を表示
  if (tables.some(t => t.name === 'books')) {
    db.all("SELECT * FROM books;", [], (err, books) => {
      if (err) {
        console.error('booksテーブルの取得エラー:', err.message);
        return;
      }

      console.log('\n=== booksテーブルの内容 ===');
      if (books.length === 0) {
        console.log('データがありません。');
      } else {
        books.forEach((book, index) => {
          console.log(`\n--- 書籍 ${index + 1} ---`);
          console.log(`ID: ${book.id}`);
          console.log(`タイトル: ${book.title}`);
          console.log(`著者: ${book.author}`);
          console.log(`出版社: ${book.publisher}`);
          console.log(`ISBN: ${book.isbn}`);
          console.log(`作成日時: ${book.created_at}`);
          console.log(`更新日時: ${book.updated_at}`);
        });
      }

      // データベース接続を閉じる
      db.close((err) => {
        if (err) {
          console.error('データベース接続のクローズエラー:', err.message);
        } else {
          console.log('\nデータベース接続を閉じました。');
        }
      });
    });
  } else {
    console.log('\nbooksテーブルが見つかりません。');
    db.close();
  }
}); 
