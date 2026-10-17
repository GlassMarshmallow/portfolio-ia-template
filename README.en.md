# AI portfolio template

**[Versión en español](README.md)**

A personal portfolio template for developers and creatives, with an **AI chat that answers questions about you** and a **smart form** that interviews people who want to hire you for a project and sends you the summary on **Telegram**.

- **Website:** Angular 21 (standalone components and signals).
- **API:** .NET 9.
- **AI of your choice:** [Ollama](https://ollama.com) on your computer or server (free, and data never leaves it) or any service compatible with the OpenAI API (OpenAI, OpenRouter, Groq, Mistral…). It ships **with no AI connected**: you choose.
- **Deployment:** Docker.

> **License: free for non-commercial use.** You may use, modify and share it for your personal portfolio, but **you may not sell it or use it to build websites for clients**. See [License](#license).

<p align="center">
  <img src="docs/capturas/escritorio-claro.jpg" width="49%" alt="Home on desktop, light mode: the chat answering "¿Qué tecnologías usas?"">
  <img src="docs/capturas/escritorio-oscuro-proyecto.jpg" width="49%" alt=""Quiero un proyecto" in dark mode">
</p>
<p align="center">
  <img src="docs/capturas/movil-claro.jpg" width="24%" alt="Mobile, light mode">
  <img src="docs/capturas/movil-oscuro.jpg" width="24%" alt="Mobile, dark mode">
</p>

This is how it looks with the example photo and no illustration of your own (gradient background, nothing moving). Replace the photo with yours and, if you like, add your animated drawing: see [Home animation](#home-animation).

> The website texts and the code comments are in Spanish. All visible texts can be translated in the files listed under [Customize](#customize).

---

## Contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Get it running, step by step](#get-it-running-step-by-step)
4. [Connect the AI](#connect-the-ai)
5. [Customize](#customize)
6. [Home animation](#home-animation)
7. [How the AI works](#how-the-ai-works)
8. [Choosing a model](#choosing-a-model)
9. [Receive requests on Telegram](#receive-requests-on-telegram)
10. [Publish it online](#publish-it-online)
11. [Troubleshooting](#troubleshooting)
12. [Accessibility and security](#accessibility-and-security)
13. [Project structure](#project-structure)
14. [License](#license)

---

## Features

- **Home with your own animation (optional):** your illustration frame by frame, with retro TV effects. Without an illustration, a gradient background is shown.
- **Quick-questions chat:** visitors ask («What's your experience?», «Which technologies do you use?»…) and the AI answers on your behalf in comic speech bubbles, word by word as it generates the answer.
- **Smart form («Quiero un proyecto» / "I want a project"):** an AI assistant asks the questions a consultancy would ask, different for each type of project. At the end, the visitor reviews a summary and sends it to you on Telegram.
- **Skills** in an accordion with technology logos, plus an animated logo strip.
- **Light and dark mode**, mobile-friendly.
- **WCAG 2.2 AA accessibility:** keyboard, screen readers, contrast and "reduce motion".
- **Privacy and legal notice pages**, and an **AI information** window (transparency).

---

## Requirements

| For | You need |
|---|---|
| The website | [Node.js 22](https://nodejs.org) |
| The API | [.NET 9 SDK](https://dotnet.microsoft.com/download) |
| The AI (optional) | [Ollama](https://ollama.com) **or** a key for a service compatible with OpenAI. See [Connect the AI](#connect-the-ai) |
| Publishing | [Docker](https://www.docker.com) with Docker Compose |

---

## Get it running, step by step

Follow the steps in order. At the end you'll have the website running on your computer.

### Step 1. Get the code

- **With GitHub (recommended):** click the green **"Use this template" → "Create a new repository"** button on this repository's page. You'll get your own copy to change and publish. Then download it:

  ```bash
  git clone https://github.com/YOUR-USER/YOUR-REPOSITORY.git
  cd YOUR-REPOSITORY
  ```

- **Without GitHub:** click **"Code" → "Download ZIP"**, unzip it and open a terminal in that folder.

### Step 2. Add your details

Before running it, replace the example ("Alex Ejemplo") with your own details. At least:

1. **`src/app/core/data/profile.data.ts`**: your name, job title, email, GitHub, LinkedIn and the "About me" text.
2. **`api/appsettings.json` → `"Perfil"`**: your name, email and links (the ones the AI uses).
3. **`api/perfil.md`**: what the AI knows about you (experience, technologies, model answers…). See [Tips for `api/perfil.md`](#tips-for-apiperfilmd).

The rest (skills, animation, legal texts) can wait: see [Customize](#customize).

### Step 3. Start the API

Open a terminal in the project folder:

- **Mac or Linux:**

  ```bash
  cd api
  ASPNETCORE_URLS=http://localhost:5090 dotnet run
  ```

- **Windows (PowerShell):**

  ```powershell
  cd api
  $env:ASPNETCORE_URLS="http://localhost:5090"; dotnet run
  ```

Leave it open. When it says `Now listening on: http://localhost:5090`, it's ready.

### Step 4. Start the website

Open **another** terminal in the project folder (not in `api`):

```bash
npm ci
npm start
```

The first time, `npm ci` takes a couple of minutes. When it's done, open **http://localhost:4200** in your browser. The website forwards `/api` calls to the API on port 5090 (`proxy.conf.json`).

### Step 5. Connect the AI

Without an AI, the website works but the chat replies "La IA de este portfolio todavía no está conectada" (the AI isn't connected yet). Pick an option in [Connect the AI](#connect-the-ai) and restart the API (in its terminal, `Ctrl + C` and run the step 3 command again).

### Step 6. Check that everything works

1. Open **http://localhost:5090/api/health**. It should say `"status":"ok"` and, under `"ia"`, the AI you chose (`ollama` or `openai`).
2. On the website, type **"hola"** in the chat: it should greet you with your name.
3. Click a quick question, e.g. "¿Qué tecnologías usas?": the answer should come from your `api/perfil.md`.
4. Click **"Quiero un proyecto"** and answer a couple of questions.

Without Telegram, smart-form requests are saved in `api/solicitudes/` (a folder in `.gitignore`, since it holds personal data). To receive them on your phone, see [Receive requests on Telegram](#receive-requests-on-telegram).

If something doesn't work, see [Troubleshooting](#troubleshooting).

---

## Connect the AI

The template ships **with no AI connected**. Pick one of these two options. Your keys go in **`api/appsettings.Local.json`**, a file you create yourself that is **never committed to git** (it's in `.gitignore`). With Docker they go in `.env` (see [Publish it online](#publish-it-online)).

| | Ollama | Service compatible with OpenAI |
|---|---|---|
| **Where it runs** | On your computer or server | On the service's servers |
| **Cost** | Free | Depends on the service (usually pay per use) |
| **Privacy** | What visitors type never leaves your machine | What visitors type is sent to the service |
| **You need** | A machine with about 6 GB of free RAM | An account and an API key |

### Option A: Ollama (on your machine)

1. Install **[Ollama](https://ollama.com/download)** and open it.
2. Download a model (see [Choosing a model](#choosing-a-model)):

   ```bash
   ollama pull qwen3:8b
   ```

3. Create the file **`api/appsettings.Local.json`** with:

   ```json
   {
     "IA": { "Proveedor": "ollama" },
     "Ollama": { "BaseUrl": "http://localhost:11434/", "Model": "qwen3:8b" }
   }
   ```

4. Restart the API.

### Option B: a service compatible with OpenAI

1. Create an account with the service and generate an **API key**.
2. Create the file **`api/appsettings.Local.json`** with the address, the model and your key:

   ```json
   {
     "IA": { "Proveedor": "openai" },
     "OpenAI": {
       "BaseUrl": "https://api.openai.com/v1/",
       "Model": "gpt-4o-mini",
       "ApiKey": "YOUR_KEY"
     }
   }
   ```

3. Restart the API.

Some services and their address (`BaseUrl`). You'll find the model names in each one's documentation:

| Service | `BaseUrl` |
|---|---|
| [OpenAI](https://platform.openai.com) | `https://api.openai.com/v1/` |
| [OpenRouter](https://openrouter.ai) (many models, some free) | `https://openrouter.ai/api/v1/` |
| [Groq](https://console.groq.com) | `https://api.groq.com/openai/v1/` |
| [Mistral](https://console.mistral.ai) | `https://api.mistral.ai/v1/` |
| [LM Studio](https://lmstudio.ai) (on your computer, no key) | `http://localhost:1234/v1/` |

**Important if you use an external service:**

- **Never commit your key** or put it in `appsettings.json`: anyone who has it can spend on your account. Use `api/appsettings.Local.json` locally and `.env` on the server.
- Set a **spending limit** in the service's dashboard. The API already limits use per visitor and has a daily cap (`IA:LimiteDiario`, 600 calls a day by default).
- **Change two texts on the website**, because they say the AI runs on your own server: the "Información sobre la IA" window (`src/app/shared/components/ai-info-dialog/ai-info-dialog.html`) and the privacy policy (`src/app/features/legal/pages/privacy/privacy.html`). They're marked with a comment. Say which service you use and link to its privacy policy.
- Pick a model **without "reasoning"** (models that "think" before answering, such as `o1`, or `qwen3` through this kind of service): they're slower and can run out of room for the answer. If you want `qwen3`, use option A (Ollama), which turns that reasoning off.

---

## Customize

| What | Where |
|---|---|
| **Your name, role, email, GitHub, LinkedIn and "About me"** | `src/app/core/data/profile.data.ts` |
| **Your photo** (in a circle above the greeting; the chat bubble appears next to it) | Put it in `public/assets/perfil/` (square, about 480 × 480 px) and its path in `photo` in `profile.data.ts`. No photo: `photo: null`. |
| **What the AI knows about you** (experience, technologies, model answers…) | `api/perfil.md` |
| **Name, email and links used by the AI** | `api/appsettings.json` → `"Perfil"` |
| **Your skills and their logos** | `src/app/core/data/skills.data.ts` (logos from [Simple Icons](https://simpleicons.org)) |
| **The home animation** | `src/app/core/data/hero.data.ts` (see below) |
| **The smart-form questions** | `api/IntakePlan.cs` |
| **The AI rules** | `api/Prompts.cs` |
| **Privacy and legal notice** | `src/app/features/legal/pages/` |

> **Important:** the privacy and legal notice texts are a **plain-language example** written for Spanish law (GDPR and LSSI). Review and adapt them to your case; they are not legal advice.

### Tips for `api/perfil.md`

- Write it in the third person: the AI turns it into the first person in the chat.
- **Anything not in the profile, the AI won't say**: it points to your LinkedIn instead. Private questions (age, salary…) are politely declined.
- The **model answers** ("If they ask 'Which technologies do you use?', answer something like: …") make the quick questions answer well every time. Adapt them to your style.

---

## Home animation

The animation is **optional**. It works with separate frames, like a cartoon:

1. Create the folder `public/assets/hero-originales/` and put your frames in it (PNG, JPG or WebP), **all the same size and with the same background** so it doesn't shake.
2. Generate the optimized copies (you need [ImageMagick](https://imagemagick.org) or macOS):

   ```bash
   npm run hero-frames
   ```

3. In `src/app/core/data/hero.data.ts`, put the frame names (without `.jpg`) in `frames`, in display order. The sequence plays **back and forth**. Repeat a name to make that pose last longer.

`hero.data.ts` options:

| Option | What for |
|---|---|
| `frameDurationMs` | How long each frame lasts (180 ms looks natural). |
| `loopLayer` | An area that **always** moves, even when the character stands still (for example, steam from a cup). It cuts that area from several frames and blends one shape into the next. |
| `fixedPatch` | An area always painted the same, taken from one frame: fixes elements that "shake" between poses. |
| `lighting` | Tints the drawing with an ambient color and lights (a lamp, a screen…). |
| `face` | Where the face is (the character looks to the left): on desktop, the chat bubble appears in front of it, with its tail pointing at it. |
| `head` | Where the head is: if the bubble doesn't fit in front of the face, it appears behind the head. |
| `imageRatio` | Aspect ratio of your frames (width / height). |
| `description` | Description of the drawing for screen readers. |

Areas and positions are given as **fractions of the image** (0 to 1): `x: 0.5` is half the width.

---

## How the AI works

```
Browser ──► nginx ──/api──► .NET API ──► AI (Ollama or OpenAI-compatible service)
   ▲                           │
   └──── answer ───────────────┘          Telegram ◄── requests
```

Only the API talks to the AI: the browser never sees your key or your Ollama address, which is **never exposed to the internet**.

### Quick-questions chat (`/api/ask`)

1. The visitor types a question or clicks a quick question.
2. The API sends the AI the **rules** (`api/Prompts.cs`), **your profile** (`api/perfil.md`) and the question.
3. The answer is **streamed as it is generated**, so reading starts within a second even if the model is slow.
4. In the bubble, your LinkedIn, GitHub and email become links. **Only those three addresses**: if the AI wrote any other, it stays as plain text.

The rules make the AI speak in the first person, keep it short, never make up anything that isn't in your profile, and point to LinkedIn for everything else.

### Smart form (`/api/intake` and `/api/contact`)

1. The visitor clicks **«Quiero un proyecto»**. An AI assistant introduces itself and asks what they want to build.
2. **The server, not the AI, decides what to ask** (`api/IntakePlan.cs`):
   - First the common questions: business, what they need, target audience, how they handle it today and what they want to achieve.
   - Then the questions for each project type: online shop (products, payments, shipping, stock), bookings (services, hours, reminders…), informational website, admin panel, automation or improving an existing site.
   - Finally: branding, texts and photos, integrations with tools they already use, references, then name and email.

   The AI detects the project type, skips what doesn't apply and phrases each question naturally. It may also suggest an opportunity ("would you like to sell online?"). Letting the server drive the script stops small models from repeating questions or finishing too early.
3. The AI replies in **JSON with a fixed schema**, and the server validates it.
4. The conversation is saved **in the browser** (`localStorage`, 7 days), so it can be resumed if the page is closed.
5. At the end, the visitor reviews a **summary**, accepts the privacy terms and clicks **«Enviar»** (Send). The API validates it, **saves a copy** and **sends it to you on Telegram** with the conversation attached.
6. Saved copies are **deleted automatically after 365 days** (`Solicitudes:DiasConservacion`).

### Security measures

- **Size limits:** 300 characters per question, 500 per form message, a capped conversation and requests of 64 KB at most.
- **Per-visitor rate limits** (by IP) and a **global daily cap** on AI calls.
- The browser can never send system instructions, and the data it sends back is validated (known keys and types only).
- An invisible **honeypot field** for bots.
- Everything the visitor writes is displayed as text and escaped before being sent to Telegram.
- Logs contain no personal data.

---

## Choosing a model

**With Ollama**, the author uses **`qwen3:8b`**, which works well in Spanish with about **6 GB of RAM**. You can use any other Ollama model by changing `"Ollama": { "Model": "..." }` (or `OLLAMA_MODEL` in `.env`):

| Model | Approx. RAM | When |
|---|---|---|
| `qwen3:1.7b` | ~1.5 GB | Very modest machines. Faster, but follows the rules less reliably. |
| `qwen3:4b` | ~3 GB | Good balance on low-memory machines. |
| **`qwen3:8b`** | **~6 GB** | **Recommended.** |
| `qwen3:14b` | ~10 GB | If you have plenty of memory or a graphics card. |

On a server without a graphics card, the AI runs on the CPU: with `qwen3:8b`, an answer takes a few seconds to start appearing.

**With an OpenAI-compatible service**, pick a small, fast model without reasoning (each service's "mini" or "small" ones): chat answers are short and don't need more.

If you change model, **check first** that:
1. It answers in the first person and doesn't make things up (ask about things that aren't in your profile).
2. The smart form works end to end: the model has to return JSON with the requested schema.

---

## Receive requests on Telegram

1. In Telegram, open **[@BotFather](https://t.me/BotFather)**, send `/newbot` and follow the steps. It gives you a **token** like `1234567890:AAH…` (about 46 characters).
2. Open the chat with your new bot, press **Start** and send it any message ("hi").
3. Open this address in your browser, replacing `YOUR_TOKEN` with your token:

   ```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```

   Look for `"chat":{"id":` followed by a number: that is your **chat ID**.
4. Put both values in the server's `.env` file (or, locally, in `api/appsettings.Local.json` → `"Telegram": { "BotToken": "…", "ChatId": "…" }`):

   ```
   TELEGRAM_BOT_TOKEN=1234567890:AAH…
   TELEGRAM_CHAT_ID=123456789
   ```

   **Never commit the token to git** or share it: anyone who has it can write as your bot.
5. Send a test request from «Quiero un proyecto»: you'll get a message with the details and a file with the conversation.

If Telegram fails, the request isn't lost: it stays saved on the server (`/data/solicitudes`).

---

## Publish it online

With Docker on your server:

```bash
# 1. Your details, the AI and the keys
cp .env.example .env        # choose the AI (IA_PROVEEDOR) and fill in Telegram
chmod 600 .env

# 2a. With an OpenAI-compatible service: the website and the API
docker compose up -d --build

# 2b. With Ollama on the same server: add its profile and download the model (once)
docker compose --profile ollama up -d --build
docker compose exec ollama ollama pull qwen3:8b
```

The website is served at `http://127.0.0.1:8095`, **reachable only from the server itself**. To publish it, `docker-compose.yml` includes **Cloudflare Tunnel**, which opens no ports on your router (add the profile to the command above):

- **Quick test, no account:** `--profile rapido`. The `*.trycloudflare.com` address shows up in `docker compose logs cloudflared-rapido` and changes on every restart.
- **With your own domain:** create a tunnel in Cloudflare Zero Trust, put its token in `CLOUDFLARE_TUNNEL_TOKEN` and use `--profile tunel`.

If you already run Ollama somewhere else (another container or machine), skip the `ollama` profile and put its address in `OLLAMA_URL`.

---

## Troubleshooting

| What you see | What's happening and how to fix it |
|---|---|
| The chat says **"La IA de este portfolio todavía no está conectada"** | You haven't chosen an AI. Follow [Connect the AI](#connect-the-ai) and restart the API. |
| The chat says **"Ahora mismo no puedo responder"** | The API can't reach the AI. With Ollama: check it's open (`ollama list`) and that the model in `appsettings.Local.json` is listed. With a service: check the key, the `BaseUrl` and the model name. The exact reason is shown in the API's terminal. |
| The chat doesn't answer at all, or shows a connection error | The API isn't running, or is on another port. Check **http://localhost:5090/api/health**. |
| The chat answers as **"Alex Ejemplo"** | You skipped step 2: change `api/appsettings.json` → `"Perfil"` and `api/perfil.md`, and restart the API. |
| **"Quiero un proyecto"** stops or repeats questions | The model is too small or doesn't return the JSON properly. Try a bigger one (see [Choosing a model](#choosing-a-model)). |
| `npm start` fails | Check you have Node.js 22 (`node --version`) and run `npm ci` again. |
| `dotnet run` says the port is in use | Another app uses 5090. Use another port (e.g. 5091) and change it in `proxy.conf.json` too. |
| Telegram requests don't arrive | Check the token and chat number (see [Telegram](#receive-requests-on-telegram)). Meanwhile, they're saved in `api/solicitudes/`. |

---

## Accessibility and security

- Built for **WCAG 2.2 AA**:
  - 4.5:1 text contrast and 3:1 for controls, in both modes.
  - Fully usable with the keyboard, with the focus always visible.
  - Dialogs that keep focus inside and close with Escape.
  - Screen-reader announcements and "reduce motion" support.
  - Without an illustration nothing moves; with your animated drawing, a button to pause it appears.
  - Check it after your changes with [axe DevTools](https://www.deque.com/axe/devtools/).
- **Deployment security:**
  - The API doesn't run as root and has a memory limit.
  - Ports only listen on `127.0.0.1`.
  - Secrets live in `.env`, which is never committed.
  - The site loads no cookies or tracking tools.

---

## Project structure

```
src/app/
├── core/          data (profile, hero, skills), models and services (chat, form, sending)
├── layouts/       public layout (menu, page, footer)
├── features/      pages: home (with its sections) and legal pages
└── shared/        reusable components (icons, close button, AI window…)
api/
├── Program.cs     /api/ask, /api/intake and /api/contact routes, with their limits
├── Prompts.cs     AI rules
├── IntakePlan.cs  smart-form script
├── perfil.md      what the AI knows about you
└── Services/      AI connection, Telegram and request backups
```

---

## License

- **Code** (website, API, Docker): **[PolyForm Noncommercial 1.0.0](LICENSE.md)**.
- **Documentation** (this README, the texts and the screenshots in `docs/`): **[CC BY-NC-SA 4.0](LICENSE-docs.txt)**.

In short:

| ✅ You may | ❌ You may not |
|---|---|
| Use it for **your own portfolio**, even if it helps you find a job or clients | **Sell it**, as is or modified |
| Modify it however you like | Use it to **build websites for clients** or as part of a paid service |
| Share it with others, crediting the source | Remove the license notice |
| Learn from it, in class or on your own | |

Because it forbids commercial use, it is technically not "open source" under the OSI definition, but **source-available for non-commercial use**. For commercial use, contact the author through GitHub.

The site footer has a credits line ("Hecho con portfolio-ia-template · Licencia PolyForm Noncommercial" / "Made with…"). **It isn't mandatory, but keeping it is greatly appreciated.**

Technology logos come from [Simple Icons](https://simpleicons.org) (CC0) and the look and icons from [GlassMarshmallow](https://github.com/spyamuza/glassmarshmallow) (MIT). Trademarks belong to their owners. **No illustration is included**: the home animation is meant for your own drawing.
