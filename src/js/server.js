const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();
const PORT = 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde la carpeta 'src'
app.use(express.static(path.join(__dirname, '..')));  // __dirname apunta a 'src/js', y '..' nos lleva a 'src'

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html')); // Ajustamos la ruta
});

// Verificar si la carpeta 'db' existe, si no, crearla
const dbDir = path.join(__dirname, '..', 'db');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir);
}

// Ruta del archivo de la base de datos
const dbPath = path.join(dbDir, 'usuarios.db');

// Conexión a SQLite
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) return console.error('Error al conectar a la base de datos:', err.message);
  console.log('📦 Base de datos conectada correctamente');
});

// Crear tabla si no existe
db.run(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
  )
`);

// Registro
app.post('/api/registro', (req, res) => {
  const { nombre, email, password } = req.body;
  if (!nombre || !email || !password) {
    return res.status(400).json({ mensaje: 'Completa todos los campos.' });
  }
  const query = `INSERT INTO usuarios (nombre, email, password) VALUES (?, ?, ?)`;
  db.run(query, [nombre, email, password], function (err) {
    if (err) return res.status(500).json({ mensaje: 'Error al registrar usuario.' });
    res.json({ mensaje: 'Registro exitoso', success: true });
  });
});

// Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ mensaje: 'Completa todos los campos.' });
  }

  const query = `SELECT * FROM usuarios WHERE email = ? AND password = ?`;
  db.get(query, [email, password], (err, row) => {
    if (err) return res.status(500).json({ mensaje: 'Error al iniciar sesión.' });
    if (row) {
      res.json({ mensaje: 'Inicio de sesión exitoso', success: true });
    } else {
      res.status(401).json({ mensaje: 'Credenciales incorrectas.' });
    }
  });
});

// Ruta para "olvidaste tu contraseña"
app.post('/api/olvidas', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ mensaje: 'Correo obligatorio' });

  // Simula que envía un correo con un link de recuperación
  res.json({
    mensaje: 'Correo enviado para recuperar contraseña (simulado)',
    link: `http://localhost:${PORT}/cambiar-contraseña.html?email=${encodeURIComponent(email)}`
  });
});

// Cambiar contraseña
app.post('/api/cambiar-contraseña', (req, res) => {
  const { email, nuevaPassword } = req.body;
  if (!email || !nuevaPassword) {
    return res.status(400).json({ mensaje: 'Datos incompletos' });
  }

  const query = `UPDATE usuarios SET password = ? WHERE email = ?`;
  db.run(query, [nuevaPassword, email], function (err) {
    if (err) return res.status(500).json({ mensaje: 'Error al actualizar contraseña.' });
    res.json({ mensaje: 'Contraseña actualizada con éxito' });
  });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
