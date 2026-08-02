// Este archivo quedó vacío a propósito: no se pudo eliminar la carpeta
// lib/email/ del todo por una restricción del entorno de desarrollo (no
// permite borrar este archivo puntual). El motor de correos real vive en
// lib/mail/ — ver docs/EMAIL_ARCHITECTURE.md. lib/email.ts (el archivo,
// no esta carpeta) sigue siendo el módulo legacy que usan los ~15 puntos
// existentes del código (sendAdminEmail, sendLeadEmail, etc.).
export {};
