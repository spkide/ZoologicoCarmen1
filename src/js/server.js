// src/js/server.js

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto'); // Para generar tokens seguros

const app = express();
const PORT = 3000;

// 📂 Directorio raíz de tu frontend (la carpeta `src`)
const rootDir = path.join(__dirname, '..');

// 📁 Asegúrate de que exista la carpeta db y el archivo usuarios.db
const dbDir = path.join(rootDir, 'db');
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
  else console.log('✅ Base de datos conectada:', dbPath);

  // Crea la tabla para los tokens de restablecimiento si no existe
  db.run(`
    CREATE TABLE IF NOT EXISTS password_reset_tokens (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL,
      expiry_date DATETIME NOT NULL,
      FOREIGN KEY (user_id) REFERENCES usuarios(id)
    )
  `);
});

// Crea la tabla de usuarios si no existe (asegurándose de que esté después de la conexión)
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

// 📧 Ruta para solicitar el restablecimiento de contraseña
app.post('/api/olvidas', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ mensaje: 'Correo electrónico es obligatorio.' });

  db.get(`SELECT id FROM usuarios WHERE email = ?`, [email], (err, user) => {
    if (err) {
      console.error('❌ DB error:', err.message);
      return res.status(500).json({ mensaje: 'Error al buscar usuario.' });
    }
    if (!user) {
      return res.json({ mensaje: 'Correo enviado para recuperar contraseña (si la cuenta existe).' }); // No revelar existencia por seguridad
    }

    // Generar token único y seguro
    const token = crypto.randomBytes(20).toString('hex');
    const expiryDate = new Date(Date.now() + 3600000); // Expira en 1 hora

    db.run(
      `INSERT INTO password_reset_tokens (token, user_id, expiry_date) VALUES (?, ?, ?)`,
      [token, user.id, expiryDate.toISOString()],
      function (err) {
        if (err) {
          console.error('❌ DB error:', err.message);
          return res.status(500).json({ mensaje: 'Error al guardar el token de recuperación.' });
        }

        // Simular el envío de un correo electrónico con el enlace (¡DEBES IMPLEMENTAR EL ENVÍO REAL!)
        const resetLink = `http://localhost:${PORT}/restablecer-contrasena.html?token=${token}`;
        console.log(`📧 Simulando envío de correo a ${email} con link: ${resetLink}`);

        res.json({ mensaje: 'Se ha enviado un enlace de restablecimiento a tu correo electrónico.', success: true });
      }
    );
  });
});

// 🔗 Ruta para verificar el token y (opcionalmente) mostrar un mensaje
app.get('/api/restablecer-contrasena/:token', (req, res) => {
  const { token } = req.params;
  db.get(
    `SELECT user_id FROM password_reset_tokens WHERE token = ? AND expiry_date > ?`,
    [token, new Date().toISOString()],
    (err, row) => {
      if (err) {
        console.error('❌ DB error:', err.message);
        return res.status(500).json({ mensaje: 'Error al verificar el token.' });
      }
      if (!row) {
        return res.status(400).send('El enlace de restablecimiento es inválido o ha expirado.');
      }
      // Si el token es válido, puedes enviar un mensaje de éxito para que tu frontend muestre el formulario
      res.json({ success: true, message: 'Token válido.', userId: row.user_id });
    }
  );
});

// 💾 Ruta para cambiar la contraseña con el token
app.post('/api/restablecer-contrasena/:token', (req, res) => {
  const { token } = req.params;
  const { nuevaPassword } = req.body;

  if (!nuevaPassword) {
    return res.status(400).json({ mensaje: 'La nueva contraseña es obligatoria.' });
  }

  db.get(
    `SELECT user_id FROM password_reset_tokens WHERE token = ? AND expiry_date > ?`,
    [token, new Date().toISOString()],
    (err, row) => {
      if (err) {
        console.error('❌ DB error:', err.message);
        return res.status(500).json({ mensaje: 'Error al verificar el token.' });
      }
      if (!row) {
        return res.status(400).json({ mensaje: 'El enlace de restablecimiento es inválido o ha expirado.' });
      }

      db.run(
        `UPDATE usuarios SET password = ? WHERE id = ?`,
        [nuevaPassword, row.user_id],
        function (err) {
          if (err) {
            console.error('❌ DB error:', err.message);
            return res.status(500).json({ mensaje: 'Error al actualizar la contraseña.' });
          }
          // Eliminar el token utilizado
          db.run(`DELETE FROM password_reset_tokens WHERE token = ?`, [token], (deleteErr) => {
            if (deleteErr) {
              console.error('❌ DB error al eliminar el token:', deleteErr.message);
            }
            res.json({ message: 'Contraseña restablecida con éxito.' });
          });
        }
      );
    }
  );
});

// 🚀 Inicia el servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});