# AI portfolio template

**[Versión en español](README.md)**

A personal portfolio template for developers and creatives, with an **AI chat that answers questions about you** and a **smart form** that interviews people who want to hire you for a project and sends you the summary on **Telegram**.

- **Website:** Angular 21 (standalone components and signals).
- **API:** .NET 9.
- **Local AI:** [Ollama](https://ollama.com), with no paid external services and no data leaving your server.
- **Deployment:** Docker.

> **License: free for non-commercial use.** You may use, modify and share it for your personal portfolio, but **you may not sell it or use it to build websites for clients**. See [License](#license).

> The website texts and the code comments are in Spanish. All visible texts can be translated in the files listed under [Customize](#customize).

---

## Contents

1. [Features](#features)
2. [Requirements](#requirements)
3. [Run it on your computer](#run-it-on-your-computer)
4. [Customize](#customize)
5. [Home animation](#home-animation)
6. [How the AI works](#how-the-ai-works)
7. [The AI model](#the-ai-model)
8. [Receive requests on Telegram](#receive-requests-on-telegram)
9. [Publish it online](#publish-it-online)
10. [Accessibility and security](#accessibility-and-security)
11. [Project structure](#project-structure)
12. [License](#license)

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
| The AI | [Ollama](https://ollama.com) (on your computer or in Docker) |
| Publishing | [Docker](https://www.docker.com) with Docker Compose |

---

## Run it on your computer

**1. The AI.** Install Ollama and download the model:

```bash
ollama pull qwen3:8b
```

**2. The API** (in one terminal):

```bash
cd api
ASPNETCORE_URLS=http://localhost:5080 dotnet run
```

**3. The website** (in another terminal):

```bash
npm ci
npm start
```

Open `http://localhost:4200`. The website forwards `/api` calls to the API on port 5080 (`proxy.conf.json`).

Without Telegram configured, smart-form requests are saved in `api/solicitudes/`. That folder is in `.gitignore` because it contains personal data.

---

## Customize

| What | Where |
|---|---|
| **Your name, role, email, GitHub, LinkedIn and "About me"** | `src/app/core/data/profile.data.ts` |
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
| `head` | Where the character's head is: the chat bubbles come out of it. |
| `imageRatio` | Aspect ratio of your frames (width / height). |
| `description` | Description of the drawing for screen readers. |

Areas and positions are given as **fractions of the image** (0 to 1): `x: 0.5` is half the width.

---

## How the AI works

```
Browser ──► nginx ──/api──► .NET API ──► Ollama (AI model)
   ▲                           │
   └──── answer ───────────────┘          Telegram ◄── requests
```

The AI is **never exposed to the internet**: only the API talks to Ollama.

### Quick-questions chat (`/api/ask`)

1. The visitor types a question or clicks a quick question.
2. The API sends Ollama the **rules** (`api/Prompts.cs`), **your profile** (`api/perfil.md`) and the question.
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
3. The AI replies in **JSON with a fixed schema** (Ollama's `format`), and the server validates it.
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

## The AI model

The template runs on **[Ollama](https://ollama.com)**. The author uses **`qwen3:8b`**, which works well in Spanish with about **6 GB of RAM**, but **you can use any other Ollama model** by changing one setting:

- **Locally:** `api/appsettings.json` → `"Ollama": { "Model": "..." }`
- **In Docker:** `OLLAMA_MODEL=...` in `.env`

| Model | Approx. RAM | When |
|---|---|---|
| `qwen3:1.7b` | ~1.5 GB | Very modest machines. Faster, but follows the rules less reliably. |
| `qwen3:4b` | ~3 GB | Good balance on low-memory machines. |
| **`qwen3:8b`** | **~6 GB** | **Recommended.** |
| `qwen3:14b` | ~10 GB | If you have plenty of memory or a graphics card. |

If you switch to another model family (`llama3.1`, `gemma3`…), **check first** that:
1. It answers in the first person and doesn't make things up (ask about things that aren't in your profile).
2. The smart form works end to end: the model must return JSON with the requested schema.

On a server without a graphics card, the AI runs on the CPU: with `qwen3:8b`, an answer takes a few seconds to start appearing.

---

## Receive requests on Telegram

1. In Telegram, open **[@BotFather](https://t.me/BotFather)**, send `/newbot` and follow the steps. It gives you a **token** like `1234567890:AAH…` (about 46 characters).
2. Open the chat with your new bot, press **Start** and send it any message ("hi").
3. Open this address in your browser, replacing `YOUR_TOKEN` with your token:

   ```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```

   Look for `"chat":{"id":` followed by a number: that is your **chat ID**.
4. Put both values in the `.env` file (or, locally, in `api/appsettings.json` → `"Telegram"`):

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
# 1. The AI (once)
docker compose -f deploy/ollama/compose.yaml up -d
docker exec ollama-ollama-1 ollama pull qwen3:8b

# 2. Your data and keys
cp .env.example .env        # fill in Telegram and, optionally, the model
chmod 600 .env

# 3. The portfolio (website + API)
docker compose up -d --build
```

The site runs at `http://127.0.0.1:8095`, **reachable only from the server itself**. To publish it, `docker-compose.yml` includes **Cloudflare Tunnel**, which doesn't open any ports on your router:

- **Quick test, no account:** `docker compose --profile rapido up -d`. The `*.trycloudflare.com` address appears in `docker compose logs cloudflared-rapido` and changes on every restart.
- **With your own domain:** create a tunnel in Cloudflare Zero Trust, put its token in `CLOUDFLARE_TUNNEL_TOKEN` and run `docker compose --profile tunel up -d`.

---

## Accessibility and security

- Built for **WCAG 2.2 AA**:
  - 4.5:1 text contrast and 3:1 for controls, in both modes.
  - Fully usable with the keyboard, with the focus always visible.
  - Dialogs that keep focus inside and close with Escape.
  - Screen-reader announcements and "reduce motion" support.
  - A button to pause the animation.
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
└── Services/      Telegram and request backups
deploy/ollama/     the AI in Docker
```

---

## License

- **Code** (website, API, Docker): **[PolyForm Noncommercial 1.0.0](LICENSE.md)**.
- **Documentation** (this README and the texts): **[CC BY-NC-SA 4.0](LICENSE-docs.txt)**.

In short:

| ✅ You may | ❌ You may not |
|---|---|
| Use it for **your own portfolio**, even if it helps you find a job or clients | **Sell it**, as is or modified |
| Modify it however you like | Use it to **build websites for clients** or as part of a paid service |
| Share it with others, crediting the source | Remove the license notice |
| Learn from it, in class or on your own | |

Because it forbids commercial use, it is technically not "open source" under the OSI definition, but **source-available for non-commercial use**. For commercial use, contact the author through GitHub.

Technology logos come from [Simple Icons](https://simpleicons.org) (CC0) and icons from [Bootstrap Icons](https://icons.getbootstrap.com) (MIT). Trademarks belong to their owners. **No illustration is included**: the home animation is meant for your own drawing.
