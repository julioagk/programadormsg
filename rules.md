Quiero construir una aplicación web SaaS llamada "WhatsApp Scheduler".

El objetivo es que cualquier usuario pueda conectar su cuenta de WhatsApp escaneando un código QR y posteriormente programar mensajes para enviarlos automáticamente a uno o varios contactos.

NO quiero un chatbot.

NO quiero IA.

NO quiero un CRM.

Quiero una aplicación extremadamente simple, rápida y moderna.

======================================================
STACK
======================================================

Frontend
- Next.js 15
- TypeScript
- TailwindCSS
- shadcn/ui

Backend
- NestJS
- TypeScript

Base de datos
- PostgreSQL
- Prisma ORM

Colas
- Redis
- BullMQ

Autenticación
- JWT

Almacenamiento
- S3 Compatible (MinIO)

======================================================
ARQUITECTURA
======================================================

Utilizar Clean Architecture.

Separar correctamente:

Controllers

Services

Repositories

Workers

DTOs

Entities

Validation

No mezclar lógica.

Seguir principios SOLID.

Todo debe quedar preparado para escalar.

======================================================
AUTENTICACIÓN
======================================================

Registro

Inicio de sesión

Cerrar sesión

Editar perfil

Cambiar contraseña

======================================================
CONEXIÓN WHATSAPP
======================================================

El usuario debe poder conectar su cuenta mediante un código QR.

Mostrar:

- Estado de conexión
- Número conectado
- Nombre del perfil
- Fecha de conexión

Si se desconecta, permitir reconectar.

Guardar la sesión para no escanear el QR cada vez.

======================================================
PANTALLA PRINCIPAL
======================================================

Dashboard muy limpio.

Mostrar únicamente:

WhatsApp conectado

Mensajes programados

Mensajes enviados

Próximos envíos

======================================================
PROGRAMAR MENSAJE
======================================================

Esta será la función principal del sistema.

Formulario:

Título (opcional)

Mensaje

Adjuntar archivos

Seleccionar destinatarios

Fecha

Hora

Botón Programar

======================================================
MENSAJE
======================================================

El usuario podrá escribir cualquier texto.

Ejemplo:

Hola {{nombre}}

Espero que tengas un excelente día.

Quiero soportar variables.

Variables iniciales:

{{nombre}}

En el futuro podrán agregarse más.

======================================================
ARCHIVOS
======================================================

Permitir adjuntar:

Imagen

PDF

Word

Excel

Video

Audio

ZIP

Cualquier archivo

Mostrar vista previa cuando sea posible.

======================================================
PLANTILLAS
======================================================

Cuando el usuario termine de escribir un mensaje aparecerá un checkbox.

[ ] Guardar como plantilla.

Si lo marca:

Guardar:

Nombre

Mensaje

Archivos

Después podrá reutilizar esa plantilla.

Si no marca la casilla simplemente se programa el mensaje.

======================================================
DESTINATARIOS
======================================================

NO crear un módulo de contactos.

NO crear CRUD de contactos.

Los contactos deben obtenerse directamente del WhatsApp conectado.

Mostrar un buscador.

Mostrar la lista de contactos.

Permitir seleccionar uno o varios.

El diseño debe parecerse al selector de contactos de WhatsApp Web.

======================================================
PROGRAMACIÓN
======================================================

El usuario podrá elegir:

Fecha

Hora

Zona horaria

También podrá elegir:

Enviar inmediatamente.

======================================================
ENVÍOS
======================================================

Cuando llegue la fecha programada:

BullMQ ejecutará el envío.

Cada destinatario debe generar un Job independiente.

Nunca enviar todos al mismo tiempo.

Agregar retraso aleatorio.

Ejemplo:

Entre 20 y 90 segundos.

Ese retraso debe ser configurable.

======================================================
PERSONALIZACIÓN
======================================================

Antes de enviar el mensaje reemplazar automáticamente:

{{nombre}}

por el nombre del contacto.

Ejemplo

Hola {{nombre}}

↓

Hola Julio

======================================================
ESTADOS
======================================================

Cada envío tendrá:

Pendiente

Enviando

Enviado

Error

Cancelado

Guardar fecha y hora exacta.

======================================================
HISTORIAL
======================================================

Mostrar todos los mensajes enviados.

Mostrar:

Título

Fecha

Hora

Cantidad de destinatarios

Estado

Permitir ver el detalle.

======================================================
CONFIGURACIÓN
======================================================

Permitir configurar:

Tiempo mínimo entre mensajes.

Tiempo máximo entre mensajes.

Zona horaria.

======================================================
INTERFAZ
======================================================

Diseño moderno.

Minimalista.

Muy parecido a:

Linear

Notion

Vercel

Raycast

Mucho espacio en blanco.

Animaciones suaves.

Responsive.

Dark mode.

======================================================
BASE DE DATOS
======================================================

Diseñar correctamente todas las tablas.

Crear relaciones.

Crear índices.

Utilizar Prisma.

======================================================
SEGURIDAD
======================================================

JWT

Rate Limiting

Helmet

Validaciones

Logs

======================================================
IMPORTANTE
======================================================

NO empieces escribiendo código.

Primero diseña completamente:

- Arquitectura
- Estructura de carpetas
- Módulos
- Base de datos
- Relaciones
- Flujo del sistema
- Flujo de autenticación
- Flujo de conexión de WhatsApp
- Flujo de programación de mensajes
- Flujo de envío

Después de terminar el diseño comienza la implementación módulo por módulo.

No omitir ningún detalle.

Todo el código debe estar listo para producción.