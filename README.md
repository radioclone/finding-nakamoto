# Finding Nakamoto – Vibe Coding Interactive Narrative

Finding Nakamoto is an **interactive cyberpunk narrative** that teaches people how to move through the Bitcoin economy by *doing*—connecting wallets, minting SIP-009 collectibles, and running on-chain automations while a conversational AI guide narrates the story. The prototype mixes nostalgic world-building, on-chain actions, and adaptive audio so builders can learn Stacks tooling without leaving the browser.

> Grant issue: [stacksgov/decentralized-grants#59](https://github.com/stacksgov/decentralized-grants/issues/59)

## Vision
- Blend HTML/HTMX scenes, Unity 3D renders, and Stacks smart-contract calls into one cinematic flow.
- Use Leather + stacks.js for smart-wallet onboarding, then progressively introduce SIP-009 minting quests.
- Run a voice-first "Eliza OS" guide with ElevenLabs narration so each step feels like a co-op mission.
- Keep every module open-source under the Vibe Coding umbrella so other teams can remix and extend the framework.

## Milestones & Deliverables
| Milestone | Amount | Deliverable set |
|-----------|--------|-----------------|
| 1. Foundational Demo | $1,200 | Domain + public GitHub repo, HTML/HTMX front end with stacks.js + Leather login, SIP-009 minting path, and a lightweight Eliza OS + ElevenLabs AI prototype that walks through wallet connection + minting. A live browser demo proves smart-wallet onboarding + interactive storytelling co-exist. |
| 2. Interactive Narrative Loop | $1,000 | Adaptive audio + VO flows, Unity/Veo rendered clip showing the user journey, and a more complete voice-driven narrative that keeps the user oriented while they learn DeFi primitives. |
| 3. Launch & Framework | $800 | Playable prototype hosted publicly, Loom/Veo walkthroughs, docs + progress notes, and the open-source Vibe Coding framework pack that others can fork to build their own AI-powered Stacks adventures. |

## Current Repo State
- Next.js 15 App Router project with React 19 and Tailwind CSS v4 foundations.
- Turnkey wallet automation patterns (holding vs. delegated trading wallets) carried over as reference UX for future quests.
- `docs/`, `plan.md`, and `AUTOMATION_REFACTOR.md` outline how the wallet automation pieces work today; they will be reshaped into the narrative onboarding script next.
- `src/app` hosts the UI scaffolding you'll see at `http://localhost:5002` once you run the dev server.

## Getting Started
```bash
npm install
npm run dev
# visit http://localhost:5002
```
Environment variables live in `.env.local`; see `TurnkeyProvider.tsx` for the currently wired keys. As we layer in stacks.js + Leather, look for new env vars prefixed with `NEXT_PUBLIC_STACKS_`.

## Roadmap (near term)
1. Swap in the narrative-first landing scene (HTML/HTMX partials) to set tone + expose Leather login.
2. Embed stacks.js smart-wallet onboarding next to the Turnkey reference implementation for comparison testing.
3. Wire SIP-009 mint steps + quest logic, then surface mint proofs in the UI.
4. Stand up the Eliza OS + ElevenLabs loop for voice-guided walkthroughs.
5. Capture the experience (Unity capture + Veo clip, Loom walkthrough) before pushing Milestone 2 updates.

## How to Contribute
- Open issues + PRs referencing the grant thread so progress stays transparent.
- Share ideas for narrative beats or audio assets in `docs/` so we can keep the vibe cohesive.
- Fork + remix once the Vibe Coding framework ships—crediting and linking back keeps the ecosystem tight.
