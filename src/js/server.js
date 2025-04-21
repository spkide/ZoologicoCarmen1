// src/js/server.js

const express  = require('express');
const path     = require('path');
const sqlite3  = require('sqlite3').verbose();
const fs       = require('fs');

const app      = express();
const PORT     = 3000;

// 📂 Directorio raíz de tu frontend (la carpeta `src`)
const rootDir = path.join(__dirname, '..');

// 📁 Asegúrate de que exista la carpeta db y el archivo usuarios.db
const dbDir  = path.join(rootDir, 'db');
const dbPath = path.join(dbDir, 'usuarios.db');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
  console.log('📁 Carpeta db creada:', dbDir);
}
if (!fs.existsSync(dbPath)) {
  fs.writeFileSync(dbPath, '');
  console.log('📄 Archivo usuarios.db creado:', dbPath);
}

// ✅ Conecta a SQLite
const db = new sqlite3.Database(dbPath, err => {
  if (err) console.error('❌ DB error:', err.message);
  else    console.log('✅ Base de datos conectada:', dbPath);
});

// Crea la tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT
  )
`);

// 🧾 Middlewares
app.use(express.static(rootDir)); // sirve todo lo que está en src/
app.use(express.json());

// 🏠 Ruta raíz: muestra iniciar-sesion.html
app.get('/', (req, res) => {
  res.sendFile(path.join(rootDir, 'iniciar-sesion.html'));
});

// 🔑 Ruta de login (sin reCAPTCHA)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  // Validar que los campos no estén vacíos
  if (!email || !password) {
    return res.status(400).json({ success: false, mensaje: 'Faltan campos requeridos.' });
  }

  // Verificar credenciales en SQLite
  const sql = 'SELECT * FROM usuarios WHERE email = ? AND password = ?';
  db.get(sql, [email, password], (err, row) => {
    if (err) {
      console.error('❌ DB error:', err.message);
      return res.status(500).json({ success: false, mensaje: 'Error en el servidor.' });
    }
    if (!row) {
      return res.status(401).json({ success: false, mensaje: 'Correo o contraseña incorrectos.' });
    }
    res.json({ success: true, mensaje: 'Inicio de sesión exitoso.' });
  });
});

// 🚀 Inicia el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
