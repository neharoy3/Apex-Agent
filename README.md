# 🏁 Apex-Agent — F1 Strategic AI 

A specialized AI Race Engineer built for the F1 paddock. It remembers your favorite teams and race takes to provide personalized strategy insights.
---

## ⚡ How to Run

```bash
cd Apex-Agent
npm install
```
Create a new file in the root directory named .env.local.

Add your own Gemini API Key (get one for free at [Google AI Studio](https://aistudio.google.com/app/apikey)):

```env
GEMINI_API_KEY = your_api_key_here
```
Launch the Agent:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) —  AI agent is live! 🎉

---
> [!NOTE]
*Built using the [GDG-KMIT/AgentX](https://github.com/GDG-KMIT/AgentX) template.*
---

## ⏫ Upgrades
🔺 **Live Search Grounding:** Integrated Google Search to fetch real-time data.

🔺**Multi-Model Failover:** Implemented an automated "downshifting" logic. If the primary model hits a quota or rate limit, it automatically cycles through fallback models (Pro → Flash → Lite) to ensure zero downtime.

🔺**Smart Verification:** Added toggleable search-verification controls. The engine now uses a "Best-Effort" mode, ensuring the agent remains responsive even if live verification services are unavailable.

🔺**Enhanced Config:** Centralized control in agent.config.js for fallback priority, verification flags, and grounding strictness.

## 🏗️ Architecture

```
┌─────────────────┐      POST /api/chat      ┌──────────────────┐
│   User Browser  │ ──────────────────────▶ │  Vercel API Route │
│   (React App)   │ ◀────────────────────── │  (route.js)       │
└─────────────────┘      JSON response       └────────┬─────────┘
                                                       │
                                                       │ Gemini API
                                                       │ (server-side only)
                                                       ▼
                                              ┌──────────────────┐
                                              │  Google Gemini   │
                                              │  (configurable)  │
                                              └──────────────────┘
```

---
