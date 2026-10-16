# Plantilla de portfolio con IA

**[English version](README.en.md)**

Plantilla de portfolio personal para desarrolladores y creativos, con un **chat de IA que responde preguntas sobre ti** y un **formulario inteligente** que entrevista a quien quiere encargarte un proyecto y te envía el resumen por **Telegram**.

- **Web:** Angular 21 (componentes standalone y signals).
- **API:** .NET 9.
- **IA local:** [Ollama](https://ollama.com), sin pagar a servicios externos y sin que los datos salgan de tu servidor.
- **Despliegue:** Docker.

> **Licencia: uso libre no comercial.** Puedes usarla, modificarla y compartirla para tu portfolio personal, pero **no venderla ni usarla para hacer webs a clientes**. Detalles en [Licencia](#licencia).

---

## Índice

1. [Qué incluye](#qué-incluye)
2. [Requisitos](#requisitos)
3. [Arrancar en tu ordenador](#arrancar-en-tu-ordenador)
4. [Personalizar](#personalizar)
5. [Animación del inicio](#animación-del-inicio)
6. [Cómo funciona la IA](#cómo-funciona-la-ia)
7. [El modelo de IA](#el-modelo-de-ia)
8. [Recibir las solicitudes por Telegram](#recibir-las-solicitudes-por-telegram)
9. [Publicar en internet](#publicar-en-internet)
10. [Accesibilidad y seguridad](#accesibilidad-y-seguridad)
11. [Estructura del proyecto](#estructura-del-proyecto)
12. [Licencia](#licencia)

---

## Qué incluye

- **Inicio con animación propia (opcional):** tu ilustración fotograma a fotograma, con efectos de televisor antiguo. Sin ilustración, se muestra un fondo degradado.
- **Chat de preguntas rápidas:** los visitantes preguntan («¿Cuál es tu experiencia?», «¿Qué tecnologías usas?»…) y la IA responde en tu nombre, en bocadillos de cómic, palabra a palabra según genera la respuesta.
- **Formulario inteligente («Quiero un proyecto»):** un asistente con IA hace las preguntas que haría una consultora, distintas según el tipo de proyecto. Al final, el visitante revisa un resumen y te lo envía por Telegram.
- **Habilidades** en un acordeón con logos de tecnologías, y una franja animada con los logos.
- **Modo claro y oscuro**, adaptado a móvil.
- **Accesibilidad WCAG 2.2 AA:** teclado, lectores de pantalla, contraste y «reducir movimiento».
- **Páginas de privacidad y aviso legal**, y una ventana de **información sobre la IA** (transparencia).

---

## Requisitos

| Para | Necesitas |
|---|---|
| La web | [Node.js 22](https://nodejs.org) |
| La API | [.NET 9 SDK](https://dotnet.microsoft.com/download) |
| La IA | [Ollama](https://ollama.com) (en tu ordenador o en Docker) |
| Publicarla | [Docker](https://www.docker.com) con Docker Compose |

---

## Arrancar en tu ordenador

**1. La IA.** Instala Ollama y descarga el modelo:

```bash
ollama pull qwen3:8b
```

**2. La API** (en una terminal):

```bash
cd api
ASPNETCORE_URLS=http://localhost:5080 dotnet run
```

**3. La web** (en otra terminal):

```bash
npm ci
npm start
```

Abre `http://localhost:4200`. La web pasa las llamadas a `/api` a la API del puerto 5080 (`proxy.conf.json`).

Sin Telegram configurado, las solicitudes del formulario inteligente se guardan en `api/solicitudes/`. Esa carpeta está en `.gitignore`, porque contiene datos personales.

---

## Personalizar

| Qué | Dónde |
|---|---|
| **Tu nombre, rol, correo, GitHub, LinkedIn y «Sobre mí»** | `src/app/core/data/profile.data.ts` |
| **Lo que la IA sabe de ti** (experiencia, tecnologías, respuestas modelo…) | `api/perfil.md` |
| **Nombre, correo y enlaces que usa la IA** | `api/appsettings.json` → `"Perfil"` |
| **Tus habilidades y sus logos** | `src/app/core/data/skills.data.ts` (logos de [Simple Icons](https://simpleicons.org)) |
| **La animación del inicio** | `src/app/core/data/hero.data.ts` (ver abajo) |
| **Las preguntas del formulario inteligente** | `api/IntakePlan.cs` |
| **Las reglas de la IA** | `api/Prompts.cs` |
| **Privacidad y aviso legal** | `src/app/features/legal/pages/` |

> **Importante:** los textos de privacidad y aviso legal son un **ejemplo en lenguaje claro**, pensados para la legislación española (RGPD y LSSI). Revísalos y adáptalos a tu caso; no son asesoramiento legal.

### Consejos para `api/perfil.md`

- Escríbelo en tercera persona: la IA lo convierte a primera persona en el chat.
- **Todo lo que no esté en el perfil, la IA no lo dice**, y remite a tu LinkedIn. Las preguntas privadas (edad, sueldo…) las rechaza con amabilidad.
- Las **respuestas modelo** («Si preguntan "¿Qué tecnologías usas?", responde algo así: …») hacen que las preguntas rápidas respondan siempre bien. Adáptalas a tu estilo.

---

## Animación del inicio

La animación es **opcional**. Funciona con fotogramas sueltos, como un dibujo animado:

1. Crea la carpeta `public/assets/hero-originales/` y pon dentro tus fotogramas (PNG, JPG o WebP), **todos del mismo tamaño y con el mismo fondo**, para que no tiemble.
2. Genera las copias optimizadas (necesitas [ImageMagick](https://imagemagick.org) o macOS):

   ```bash
   npm run hero-frames
   ```

3. En `src/app/core/data/hero.data.ts`, pon los nombres de los fotogramas (sin `.jpg`) en `frames`, en el orden en que se ven. La secuencia se recorre **de ida y vuelta**. Repite un nombre para que esa pose dure más.

Opciones de `hero.data.ts`:

| Opción | Para qué |
|---|---|
| `frameDurationMs` | Cuánto dura cada fotograma (180 ms queda natural). |
| `loopLayer` | Una zona que se mueve **siempre**, aunque el personaje se quede quieto (por ejemplo, el humo de una taza). Recorta esa zona de varios fotogramas y funde una forma con la siguiente. |
| `fixedPatch` | Una zona que se pinta siempre igual, sacada de un fotograma: arregla elementos que «tiemblan» entre poses. |
| `lighting` | Tiñe el dibujo con un color ambiente y luces (una lámpara, una pantalla…). |
| `head` | Dónde está la cabeza del personaje: los bocadillos del chat salen de ahí. |
| `imageRatio` | Proporción de tus fotogramas (ancho / alto). |
| `description` | Descripción del dibujo para lectores de pantalla. |

Las zonas y posiciones van en **fracción de la imagen** (de 0 a 1): `x: 0.5` es la mitad del ancho.

---

## Cómo funciona la IA

```
Navegador ──► nginx ──/api──► API .NET ──► Ollama (modelo de IA)
    ▲                            │
    └──── respuesta ─────────────┘          Telegram ◄── solicitudes
```

La IA **nunca se expone a internet**: solo la API habla con Ollama.

### Chat de preguntas rápidas (`/api/ask`)

1. El visitante escribe una pregunta o pulsa una pregunta rápida.
2. La API manda a Ollama las **reglas** (`api/Prompts.cs`) más **tu perfil** (`api/perfil.md`) y la pregunta.
3. La respuesta llega **por trozos según se genera**, así se empieza a leer en un segundo aunque el modelo sea lento.
4. En el bocadillo, tu LinkedIn, tu GitHub y tu correo se convierten en enlaces. **Solo esas tres direcciones**: si la IA escribiera otra, se queda como texto.

Las reglas hacen que la IA hable en primera persona, sea breve, no invente nada que no esté en tu perfil y remita a LinkedIn para lo demás.

### Formulario inteligente (`/api/intake` y `/api/contact`)

1. El visitante pulsa **«Quiero un proyecto»**. Un asistente con IA se presenta y le pregunta qué quiere crear.
2. Es **el servidor, no la IA, quien decide qué preguntar** (`api/IntakePlan.cs`):
   - Primero lo común: negocio, qué necesita, a quién va dirigido, cómo lo gestiona ahora y qué quiere conseguir.
   - Después, las preguntas propias de cada tipo de proyecto: tienda online (productos, cobros, envíos, stock), reservas (servicios, horarios, recordatorios…), web informativa, panel de gestión, automatización o mejora de una web.
   - Al final: marca, textos y fotos, conexiones con lo que ya usa, referencias, y nombre y correo.

   La IA detecta el tipo de proyecto, se salta lo que no aplica y formula cada pregunta con naturalidad. También puede proponer una oportunidad («¿te interesaría vender por internet?»). Que el servidor controle el guion evita que los modelos pequeños repitan preguntas o terminen antes de tiempo.
3. La IA responde en **JSON con un esquema fijo** (el `format` de Ollama), y el servidor lo valida.
4. La conversación se guarda **en el navegador** (`localStorage`, 7 días) para poder retomarla si se cierra la página.
5. Al terminar, el visitante revisa un **resumen**, acepta la privacidad y pulsa **«Enviar»**. La API la valida, **guarda una copia** y **te la envía por Telegram** con la conversación adjunta.
6. Las copias guardadas **se borran solas a los 365 días** (`Solicitudes:DiasConservacion`).

### Medidas de seguridad

- **Límites de tamaño:** 300 caracteres por pregunta, 500 por mensaje del formulario, conversación limitada y peticiones de 64 KB como máximo.
- **Límites de uso por visitante** (por IP) y un **tope diario global** de llamadas a la IA.
- El navegador nunca puede mandar instrucciones de sistema, y los datos que devuelve se validan (claves y tipos conocidos).
- **Campo trampa** invisible para bots.
- Todo lo que escribe el visitante se muestra como texto y se escapa antes de enviarlo a Telegram.
- Los registros no guardan datos personales.

---

## El modelo de IA

La plantilla funciona con **[Ollama](https://ollama.com)**. La autora la usa con **`qwen3:8b`**, que da buen resultado en español con unos **6 GB de RAM**, pero **puedes usar cualquier otro modelo de Ollama** cambiando una variable:

- **En local:** `api/appsettings.json` → `"Ollama": { "Model": "..." }`
- **En Docker:** `OLLAMA_MODEL=...` en el `.env`

| Modelo | RAM aprox. | Cuándo |
|---|---|---|
| `qwen3:1.7b` | ~1,5 GB | Equipos muy modestos. Más rápido, pero obedece peor las reglas. |
| `qwen3:4b` | ~3 GB | Buen equilibrio en equipos con poca memoria. |
| **`qwen3:8b`** | **~6 GB** | **Recomendado.** |
| `qwen3:14b` | ~10 GB | Si tienes memoria de sobra o tarjeta gráfica. |

Si cambias a otra familia de modelos (`llama3.1`, `gemma3`…), **comprueba antes** que:
1. Responde en primera persona y no se inventa datos (pregunta cosas que no están en tu perfil).
2. El formulario inteligente funciona de principio a fin: el modelo tiene que devolver el JSON con el esquema pedido.

En un servidor sin tarjeta gráfica, la IA funciona con el procesador: con `qwen3:8b`, una respuesta tarda unos segundos en empezar a escribirse.

---

## Recibir las solicitudes por Telegram

1. En Telegram, abre **[@BotFather](https://t.me/BotFather)**, envíale `/newbot` y sigue los pasos. Te dará un **token** con esta forma: `1234567890:AAH…` (unos 46 caracteres).
2. Abre el chat con tu bot nuevo, pulsa **Iniciar** y escríbele cualquier mensaje («hola»).
3. Abre en el navegador esta dirección, cambiando `TU_TOKEN` por tu token:

   ```
   https://api.telegram.org/botTU_TOKEN/getUpdates
   ```

   Busca `"chat":{"id":` seguido de un número: ese es tu **número de chat**.
4. Pon los dos valores en el archivo `.env` (o, en local, en `api/appsettings.json` → `"Telegram"`):

   ```
   TELEGRAM_BOT_TOKEN=1234567890:AAH…
   TELEGRAM_CHAT_ID=123456789
   ```

   **Nunca subas el token a git** ni lo compartas: quien lo tenga puede escribir como tu bot.
5. Prueba a enviar una solicitud desde «Quiero un proyecto»: te llegará un mensaje con los datos y un archivo con la conversación.

Si Telegram falla, la solicitud no se pierde: queda guardada en el servidor (`/data/solicitudes`).

---

## Publicar en internet

Con Docker en tu servidor:

```bash
# 1. La IA (una sola vez)
docker compose -f deploy/ollama/compose.yaml up -d
docker exec ollama-ollama-1 ollama pull qwen3:8b

# 2. Tus datos y claves
cp .env.example .env        # rellena Telegram y, si quieres, el modelo
chmod 600 .env

# 3. El portfolio (web + API)
docker compose up -d --build
```

La web queda en `http://127.0.0.1:8095`, **solo accesible desde el propio servidor**. Para publicarla, el `docker-compose.yml` incluye **Cloudflare Tunnel**, que no abre puertos en tu router:

- **Prueba rápida, sin cuenta:** `docker compose --profile rapido up -d`. La dirección `*.trycloudflare.com` aparece en `docker compose logs cloudflared-rapido` y cambia en cada reinicio.
- **Con tu dominio:** crea un túnel en Cloudflare Zero Trust, pon su token en `CLOUDFLARE_TUNNEL_TOKEN` y ejecuta `docker compose --profile tunel up -d`.

---

## Accesibilidad y seguridad

- Pensada para **WCAG 2.2 AA**:
  - Contraste de 4,5:1 en el texto y de 3:1 en los controles, en los dos modos.
  - Todo se puede usar con teclado, con el foco siempre visible.
  - Ventanas con el foco dentro, que se cierran con Escape.
  - Avisos para lectores de pantalla y «reducir movimiento».
  - Botón para pausar la animación.
  - Compruébalo tras tus cambios con [axe DevTools](https://www.deque.com/axe/devtools/).
- **Seguridad del despliegue:**
  - La API no se ejecuta como administrador y tiene límite de memoria.
  - Los puertos solo escuchan en `127.0.0.1`.
  - Los secretos van en `.env`, que no se sube a git.
  - La web no carga cookies ni herramientas de seguimiento.

---

## Estructura del proyecto

```
src/app/
├── core/          datos (profile, hero, skills), modelos y servicios (chat, formulario, envío)
├── layouts/       marco de la parte pública (menú, página, pie)
├── features/      páginas: inicio (con sus secciones) y legales
└── shared/        componentes reutilizables (iconos, botón cerrar, ventana de IA…)
api/
├── Program.cs     rutas /api/ask, /api/intake y /api/contact, con sus límites
├── Prompts.cs     reglas de la IA
├── IntakePlan.cs  guion del formulario inteligente
├── perfil.md      lo que la IA sabe de ti
└── Services/      Telegram y copia de las solicitudes
deploy/ollama/     la IA en Docker
```

---

## Licencia

- **Código** (web, API, Docker): **[PolyForm Noncommercial 1.0.0](LICENSE.md)**.
- **Documentación** (este README y los textos): **[CC BY-NC-SA 4.0](LICENSE-docs.txt)**.

En pocas palabras:

| ✅ Puedes | ❌ No puedes |
|---|---|
| Usarla para **tu propio portfolio**, aunque te sirva para conseguir trabajo o clientes | **Venderla**, sola o modificada |
| Modificarla como quieras | Usarla para **hacer webs a clientes** ni como parte de un servicio de pago |
| Compartirla con otras personas, citando la fuente | Quitar el aviso de licencia |
| Aprender de ella, en clase o por tu cuenta | |

Como prohíbe el uso comercial, técnicamente no es «open source» según la definición de la OSI, sino **código disponible para uso no comercial**. Para un uso comercial, contacta con la autora a través de GitHub.

Los logos de tecnologías son de [Simple Icons](https://simpleicons.org) (CC0) y los iconos, de [Bootstrap Icons](https://icons.getbootstrap.com) (MIT). Las marcas pertenecen a sus dueños. **No se incluye ninguna ilustración**: la animación del inicio es para tu propio dibujo.
