const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const app = express();
const PORT = 3000;

// Establecer Parcel como un proceso hijo para compilar archivos desde la carpeta 'src'
const parcel = spawn('npx', ['parcel', 'src/index.html', '--port', '1234']);

parcel.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

parcel.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

parcel.on('close', (code) => {
  console.log(`child process exited with code ${code}`);
});

// Sirve los archivos estáticos de la carpeta 'src'
app.use(express.static(path.join(__dirname, 'src')));

// Ruta para la página de inicio
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Ruta para iniciar sesión
app.get('/iniciar-sesion.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'iniciar-sesion.html'));
});

// Ruta para registro
app.get('/registro.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'registro.html'));
});

// Ruta para verificación
app.get('/verificacion.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'verificacion.html'));
});

// Ruta para "olvidé mi contraseña"
app.get('/olvidas.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'olvidas.html'));
});

// Ruta POST para registro
app.post('/api/registro', (req, res) => {
  // Aquí deberías manejar la lógica para registrar al usuario
  // Por ahora, solo vamos a simular una respuesta exitosa.
  res.json({ success: true, mensaje: 'Usuario registrado exitosamente' });
});

// Inicia el servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor iniciado en: http://localhost:${PORT}`);
});
