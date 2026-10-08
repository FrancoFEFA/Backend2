import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { RepositoryError } from '../utils/errors.js';

let transporter = null;

// El transporter se arma recien cuando se necesita enviar el primer mail,
// no al arrancar la app (asi el servidor no falla si todavia no
// configuraste las credenciales de correo en desarrollo).
function getTransporter() {
    if (transporter) return transporter;

    transporter = nodemailer.createTransport({
        service: env.mail.host ? undefined : env.mail.service,
        host: env.mail.host,
        port: env.mail.port,
        secure: env.mail.secure,
        auth: {
            user: env.mail.user,
            pass: env.mail.pass,
        },
    });

    return transporter;
}

function buildResetPasswordHtml({ firstName, resetUrl }) {
    return `
    <div style="font-family: Arial, sans-serif; max-width:480px; margin:0 auto; padding:24px; background:#f5f5f5;">
      <div style="background:white; border-radius:8px; padding:32px; box-shadow:0 2px 8px rgba(0,0,0,0.1);">
        <h2 style="color:#333; margin-top:0;">Recuperar contraseña</h2>
        <p>Hola ${firstName || ''},</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en <strong>Backend II</strong>.
           Este enlace es valido por <strong>1 hora</strong> desde que se envio este correo.</p>
        <p style="text-align:center; margin:32px 0;">
          <a href="${resetUrl}"
             style="background:#007bff; color:white; padding:12px 28px; border-radius:4px;
                    text-decoration:none; font-weight:bold; display:inline-block;">
            Restablecer contraseña
          </a>
        </p>
        <p>Si no pediste este cambio, podes ignorar este correo: tu contraseña actual sigue siendo valida.</p>
        <p style="color:#999; font-size:12px;">
          Si el boton no funciona, copia y pega este enlace en tu navegador:<br>
          <span style="word-break:break-all;">${resetUrl}</span>
        </p>
      </div>
    </div>`;
}

// Valida temprano que el correo este configurado. Asi, en lugar de que
// Nodemailer explote con errores crípticos como "Missing credentials for
// PLAIN" o "535 BadCredentials", el usuario recibe un mensaje claro.
function assertMailConfigured() {
    if (!env.mail.user || !env.mail.pass) {
        throw new RepositoryError(
            'El envío de mails no está configurado: completá MAIL_USER y MAIL_PASS en el archivo .env',
            503
        );
    }
}

// Si pedis el mail de recuperación con el mismo correo que esta configurado
// como cuenta de envío (MAIL_USER), Gmail lo rechaza con "535 5.7.8
// BadCredentials" al intentar autenticarse. Se valida antes para devolver
// un mensaje claro en lugar del error críptico de SMTP.
function assertNotSelfDestined(to) {
    const normalizedTo = String(to).toLowerCase().trim();
    const sender = String(env.mail.user).toLowerCase().trim();

    if (normalizedTo && normalizedTo === sender) {
        throw new RepositoryError(
            'No se puede enviar el correo a la misma cuenta que esta configurada como remitente (MAIL_USER). Probá con otro email.',
            400
        );
    }
}

export async function sendPasswordResetEmail({ to, firstName, resetUrl }) {
    assertMailConfigured();
    assertNotSelfDestined(to);

    const mailer = getTransporter();

    await mailer.sendMail({
        from: env.mail.from,
        to,
        subject: 'Recupera tu contraseña - Backend II',
        html: buildResetPasswordHtml({ firstName, resetUrl }),
    });
}
