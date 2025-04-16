const axios = require('axios');

app.post('/api/login', async (req, res) => {
  const { email, password, recaptchaResponse } = req.body;

  // Verificar el reCAPTCHA
  const secretKey = '6LcXJxkrAAAAAPtPBDkgZuxr6D7aVsF3SgfWQcNb'; // Tu clave secreta de reCAPTCHA

  try {
    const recaptchaVerifyResponse = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: secretKey,
          response: recaptchaResponse,
        },
      }
    );

    if (!recaptchaVerifyResponse.data.success) {
      return res.json({ success: false, mensaje: 'reCAPTCHA no verificado.' });
    }

    // Aquí va la lógica de autenticación (validar email y password)
    const user = await authenticateUser(email, password);
    if (user) {
      res.json({ success: true });
    } else {
      res.json({ success: false, mensaje: 'Correo o contraseña incorrectos' });
    }

  } catch (error) {
    console.error('Error al verificar reCAPTCHA:', error);
    res.status(500).json({ success: false, mensaje: 'Error interno del servidor' });
  }
});
