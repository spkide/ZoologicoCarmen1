const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const crypto = require('crypto'); // Para generar tokens seguros
const app = express();
const PORT = 3000;

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos desde carpeta raíz 'src'
app.use(express.static(path.join(__dirname, '..')));

// Ruta para la página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
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

  // Crear tablas si no existen
  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        token TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        expiry_date DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES usuarios(id)
      )
    `);
  });
});

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

// Ruta para solicitar el restablecimiento de contraseña
app.post('/api/olvidas', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ mensaje: 'Correo obligatorio' });

  db.get(`SELECT id FROM usuarios WHERE email = ?`, [email], (err, user) => {
    if (err) {
      return res.status(500).json({ mensaje: 'Error al buscar usuario.' });
    }
    if (!user) {
      return res.json({ mensaje: 'Correo enviado para recuperar contraseña (si existe la cuenta)' }); // No revelar si el correo existe por seguridad
    }

    // Generar token único y seguro
    const token = crypto.randomBytes(20).toString('hex');
    const expiryDate = new Date(Date.now() + 3600000); // Expira en 1 hora (en milisegundos)

    db.run(
      `INSERT INTO password_reset_tokens (token, user_id, expiry_date) VALUES (?, ?, ?)`,
      [token, user.id, expiryDate.toISOString()],
      function (err) {
        if (err) {
          return res.status(500).json({ mensaje: 'Error al guardar el token de recuperación.' });
        }

        // Simular el envío de un correo electrónico con el enlace (¡DEBES IMPLEMENTAR EL ENVÍO REAL!)
        const resetLink = `http://localhost:${PORT}/restablecer-contrasena.html?token=${token}`;
        console.log(`Simulando envío de correo a ${email} con link: ${resetLink}`);

        res.json({ mensaje: 'Se ha enviado un enlace de restablecimiento a tu correo electrónico', success: true });
      }
    );
  });
});

// Ruta para verificar el token y mostrar el formulario de nueva contraseña
app.get('/api/restablecer-contrasena/:token', (req, res) => {
  const { token } = req.params;
  db.get(
    `SELECT user_id FROM password_reset_tokens WHERE token = ? AND expiry_date > ?`,
    [token, new Date().toISOString()],
    (err, row) => {
      if (err) {
        return res.status(500).json({ mensaje: 'Error al verificar el token.' });
      }
      if (!row) {
        return res.status(400).send('El enlace de restablecimiento es inválido o ha expirado.');
      }
      // Si el token es válido, podrías redirigir a un formulario HTML para ingresar la nueva contraseña
      // o simplemente enviar una respuesta exitosa para que tu frontend muestre el formulario.
      res.json({ mensaje: 'Token válido', userId: row.user_id });
    }
  );
});

// Ruta para cambiar la contraseña con el token
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
            return res.status(500).json({ mensaje: 'Error al actualizar la contraseña.' });
          }
          // Eliminar el token utilizado
          db.run(`DELETE FROM password_reset_tokens WHERE token = ?`, [token], (deleteErr) => {
            if (deleteErr) {
              console.error('Error al eliminar el token:', deleteErr.message);
            }
            res.json({ mensaje: 'Contraseña restablecida con éxito.' });
          });
        }
      );
    }
  );
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});