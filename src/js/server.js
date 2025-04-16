// src/js/server.js

const express = require('express');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fetch = require('node-fetch');       // npm install node-fetch
const emailjs = require('emailjs-com');    // npm install emailjs-com

const app = express();
const PORT = 3000;

// Configuración de claves
const RECAPTCHA_SECRET_KEY = '6LccJBsrAAAAAAS2B_lbio8KDFkLpuS4BXlICwWX';
const EMAILJS_USER_ID      = 'dTvq1insZzLgAyB4c';
const EMAILJS_SERVICE_ID   = '8rCZYFkkjrZ1sZhlV_Wy2';
const EMAILJS_TEMPLATE_ID  = 'template_2z7tpyr';

// Conectar SQLite (asegúrate de que src/db/usuarios.db exista)
const dbPath = path.join(__dirname, '..', 'db', 'usuarios.db');
const db = new sqlite3.Database(dbPath, err => {
  if (err) {
    console.error('❌ Error al conectar BD:', err.message);
  } else {
    console.log('✅ Conectado a usuarios.db');
  }
});

// Middlewares
// Servir todo lo que esté en src/ (HTML, CSS, JS, imágenes...)
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rutas HTML
app.get('/',                 (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));
app.get('/iniciar-sesion.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'iniciar-sesion.html')));
app.get('/registro.html',     (req, res) => res.sendFile(path.join(__dirname, '..', 'registro.html')));
app.get('/verificacion.html', (req, res) => res.sendFile(path.join(__dirname, '..', 'verificacion.html')));
app.get('/olvidas.html',      (req, res) => res.sendFile(path.join(__dirname, '..', 'olvidas.html')));

// API: Registro con reCAPTCHA + EmailJS
app.post('/api/registro', async (req, res) => {
  const { nombre, email, password, 'g-recaptcha-response': recaptchaResponse } = req.body;

  if (!nombre || !email || !password || !recaptchaResponse) {
    return res.status(400).json({ success: false, mensaje: 'Faltan campos o reCAPTCHA.' });
  }

  // 1) Verificar reCAPTCHA
  try {
    const googleRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${recaptchaResponse}`,
    });
    const { success } = await googleRes.json();
    if (!success) return res.status(403).json({ success: false, mensaje: 'reCAPTCHA inválido.' });
  } catch (e) {
    console.error('Error reCAPTCHA:', e);
    return res.status(500).json({ success: false, mensaje: 'Error al verificar reCAPTCHA.' });
  }

  // 2) Guardar usuario en SQLite
  db.run(
    `INSERT INTO usuarios (nombre,email,password) VALUES (?,?,?)`,
    [nombre, email, password],
    function(err) {
      if (err) {
        console.error('Error al registrar:', err.message);
        return res.status(500).json({ success: false, mensaje: 'Error al registrar usuario.' });
      }

      // 3) Enviar correo con código de verificación
      const code = Math.floor(100000 + Math.random() * 900000);
      const templateParams = { to_email: email, from_name: nombre, code };

      emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_USER_ID)
        .then(() => {
          res.json({
            success: true,
            mensaje: 'Registrado correctamente. Código enviado a tu correo.',
            code
          });
        })
        .catch(emailErr => {
          console.error('EmailJS error:', emailErr);
          res.status(500).json({ success: false, mensaje: 'Usuario creado, pero fallo envío de correo.' });
        });
    }
  );
});

// Levantar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
