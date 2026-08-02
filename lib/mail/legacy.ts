// Este archivo no se pudo borrar por una restricción del entorno de
// desarrollo (ver nota similar en lib/email/index.ts) — quedó como
// remanente de un movimiento de carpeta. En vez de dejar una copia
// duplicada del contenido de lib/email.ts (que se desincronizaría con el
// tiempo), simplemente reexporta ese módulo. El legacy real vive en
// lib/email.ts — no agregar nada nuevo acá.
export * from "../email";
