const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Endpoint para el sorteo
app.post('/api/draw', (req, res) => {
  try {
    const { participants, restrictions, budget, exchangeDate, message } = req.body;

    // 1. Validar datos de entrada
    if (!participants || participants.length < 2) {
      return res.status(400).json({ error: 'Se necesitan al menos 2 participantes.' });
    }

    // Lógica del sorteo
    console.log('Recibido:', { participants, restrictions, budget, exchangeDate, message });
    const assignments = performSecretSantaDraw(participants, restrictions);

    // Lógica de envío de correos
    sendEmails(assignments, budget, exchangeDate, message)
      .then(() => {
        res.status(200).json({ message: 'Sorteo realizado con éxito. Se han enviado los correos.' });
      })
      .catch(error => {
        console.error('Error al enviar correos:', error);
        res.status(500).json({ error: 'Sorteo realizado, pero falló el envío de correos.' });
      });

  } catch (error) {
    console.error('Error en el sorteo:', error);
    res.status(500).json({ error: `Ocurrió un error al realizar el sorteo: ${error.message}` });
  }
});

// --- CONFIGURACIÓN DE NODEMAILER (ENVÍO DE CORREO) ---
// IMPORTANTE: Debes configurar esto con tus propias credenciales.
// 1. Usa una cuenta de Gmail para enviar los correos.
// 2. Ve a la configuración de tu cuenta de Google -> Seguridad.
// 3. Activa la "Verificación en 2 pasos".
// 4. Crea una "Contraseña de aplicación" para esta app y úsala aquí.
const transporter = nodemailer.createTransport({
  host: 'smtp.sendgrid.net',
  port: 587,
  auth: {
    user: 'apikey', // Esto es literal, no se cambia
    pass: process.env.SENDGRID_API_KEY // La API Key se lee desde las variables de entorno
  }
});

async function sendEmails(assignments, budget, exchangeDate, message) {
  for (const assignment of assignments) {
    const { giver, receiver } = assignment;

const subject = '🎁✨ ¡Tu Pariente Secreto ha sido revelado!';

const body = `
🌟 Hola ${giver.name},

Con mucha alegría te contamos que tu Pariente Secreto es: 🎀 ${receiver.name} 🎀  

📌 Recuerda:  
- 💰 El valor mínimo del regalo es de ${budget || 'No especificado'} (no caigas en la tentación de ser tacañín 😅).  
- 📅 La fecha especial del intercambio será el día: ${exchangeDate || 'No especificada'}.  

${message ? `💌 
"${message}"` : ''}

✨ Prepárate para vivir un momento único, lleno de unión y alegría.  
¡Diviértete escogiendo ese regalo que hará sonreír a tu Pariente Secreto! 🎊🎄  

──────────────────────────────  
📌 Mensaje generado por un sistema creado con dedicación por Juan David Durán Malaver©.
`;


    const mailOptions = {
      from: 'Amigo Secreto App <juandavidduranmalaver@gmail.com>', // <-- REEMPLAZA ESTO
      to: giver.email,
      subject: subject,
      html: body.replace(/\n/g, '<br>') // Reemplazar saltos de línea por <br> para el formato HTML
    };

    // Enviar el correo
    await transporter.sendMail(mailOptions);
    // console.log(`Correo enviado a ${giver.name} (${giver.email})`);
  }
}

function performSecretSantaDraw(participants, restrictions) {
  let assignments = [];
  let attempts = 0;

  while (attempts < 100) { // Límite de intentos para evitar bucles infinitos
    let shuffledReceivers = [...participants].sort(() => Math.random() - 0.5);
    let possible = true;
    assignments = [];

    for (const giver of participants) {
      let receiverFound = false;
      for (let i = 0; i < shuffledReceivers.length; i++) {
        const receiver = shuffledReceivers[i];

        // Reglas para una asignación válida:
        // 1. No puede ser uno mismo.
        // 2. El receptor no debe estar ya asignado.
        // 3. No debe violar ninguna restricción.
        const isSelf = giver.id === receiver.id;
        const isTaken = assignments.some(a => a.receiver.id === receiver.id);
        const isRestricted = restrictions.some(r => 
            (r.person1 === giver.id && r.person2 === receiver.id) || 
            (r.person1 === receiver.id && r.person2 === giver.id)
        );

        if (!isSelf && !isTaken && !isRestricted) {
          assignments.push({ giver, receiver });
          shuffledReceivers.splice(i, 1); // Quitar al receptor de la lista de disponibles
          receiverFound = true;
          break;
        }
      }

      if (!receiverFound) {
        possible = false;
        break; // Romper el bucle de 'givers' y reintentar el sorteo
      }
    }

    if (possible) {
      // console.log('Asignaciones exitosas:', assignments.map(a => `${a.giver.name} -> ${a.receiver.name}`));
      return assignments; // Sorteo exitoso
    }

    attempts++;
  }

  throw new Error('No se pudo encontrar una asignación válida que cumpla con todas las restricciones. Intenta con menos restricciones.');
}

app.listen(port, () => {
  console.log(`Servidor backend corriendo en http://localhost:${port}`);
});
