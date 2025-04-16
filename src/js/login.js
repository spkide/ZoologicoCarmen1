// login.js
document.addEventListener('DOMContentLoaded', () => {
    const formulario = document.getElementById('loginForm');
  
    formulario.addEventListener('submit', async (e) => {
      e.preventDefault();
  
      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const captchaToken = grecaptcha.getResponse();
  
      if (!captchaToken) {
        alert('Por favor completa el CAPTCHA.');
        return;
      }
  
      try {
        const respuesta = await fetch('/api/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password, captchaToken })
        });
  
        const datos = await respuesta.json();
  
        if (respuesta.ok && datos.success) {
          window.location.href = '/index.html';
        } else {
          alert(datos.mensaje || 'Correo o contraseña incorrectos');
        }
  
      } catch (error) {
        console.error('Error en el login:', error);
        alert('Error en el servidor.');
      }
    });
  });
  