# Wafle AG - Delivery Panel & Admin System

A high-performance modern web application built with **React, TypeScript, Vite, leaflet (OpenStreetMap), Tailwind CSS, and Firebase**. It features real-time delivery tracking, customer location mapping (geocoded seamlessly using OpenStreetMap / Nominatim), interactive delivery operations, and complete daily/monthly finance and cash tracking dashboards.

---

## 🚀 Despliegue Rápido en Vercel (Quick Vercel Deployment)

Puedes desplegar este proyecto directamente en **Vercel** siguiendo estos pasos:

1. Modifica o crea un repositorio de Git (ej. en GitHub) y sube este código.
2. Crea un proyecto en **Vercel** e impórtalo desde tu repositorio.
3. Copia las siguientes variables de entorno desde tu archivo `firebase-applet-config.json` y añádelas en la sección de **Settings > Environment Variables** en el panel de control de tu proyecto Vercel:

```env
VITE_FIREBASE_API_KEY="tu-api-key"
VITE_FIREBASE_AUTH_DOMAIN="tu-auth-domain"
VITE_FIREBASE_PROJECT_ID="tu-project-id"
VITE_FIREBASE_STORAGE_BUCKET="tu-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="tu-sender-id"
VITE_FIREBASE_APP_ID="tu-app-id"
VITE_FIREBASE_MEASUREMENT_ID="tu-measurement-id"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="tu-database-id-si-lo-tiene"
```

*Vercel compilará automáticamente el proyecto y lo mantendrá actualizado a cada `git push`.*

---

## 💻 Desarrollo Local (Local Development)

Sigue estos pasos para correr el proyecto en tu máquina local:

### 1. Clonar el repositorio
```bash
git clone <tu-repositorio-url>
cd wafle-ag
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env` en la raíz del proyecto copiando `.env.example`:
```bash
cp .env.example .env
```
Rellena las variables `VITE_FIREBASE_...` con tus propiedades de Firebase extraídas del archivo `firebase-applet-config.json`.

### 4. Ejecutar el servidor de desarrollo local
```bash
npm run dev
```
La aplicación estará disponible de inmediato en http://localhost:3000.

---

## 🛠️ Tecnologías Utilizadas

- **Framework**: [React 19](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- **Bundler**: [Vite](https://vite.dev)
- **Estilos**: [Tailwind CSS v4](https://tailwindcss.com) & [Lucide React](https://lucide.dev)
- **Base de Datos**: [Firebase Firestore](https://firebase.google.com/docs/firestore) y [Authentication](https://firebase.google.com/docs/auth) para sincronización en tiempo real.
- **Mapas**: [Leaflet.js](https://leafletjs.com) + [OpenStreetMap](https://www.openstreetmap.org) (Nominatim) para geolocalización ligera, interactiva y de código abierto sin APIs pagas obligatorias.
