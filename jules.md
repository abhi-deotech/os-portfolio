# 💎 Lumina OS: Development Protocols (jules.md)

This document outlines the core engineering standards for **Lumina OS**. Adherence to these protocols ensures system stability, performance, and security across our browser-based operating system.

---

## 🤖 1. AI Agent Workflow & Task Tracking

To ensure autonomous agents (like Gemini/Antigravity) do not step on their own toes or create conflicting Pull Requests, follow this strict self-management protocol:

### 1.1. The `.jules/TODO.md` Ledger
- **Mandatory Tracking**: Before writing any code, the agent **MUST** read and update `.jules/TODO.md`.
- **Status Markers**: Use standard markers: `[ ]` (Pending), `[/]` (In Progress / PR Open), `[x]` (Merged/Completed), `[Blocked]` (Awaiting review/merge).
- **Log Your Intent**: When starting a new task, log the Branch Name, PR link (if created), and a brief description in the TODO file.

### 1.2. The "Wait and Verify" Protocol
- **Check Open PRs**: Before creating a new PR or branching off, check if there are pending PRs that touch the same files.
- **Dependency Blocking**: If Task B depends on Task A, and Task A is `[/]` (PR Open), **DO NOT** attempt Task B. Mark Task B as `[Blocked]` in the `.jules/TODO.md` and explicitly notify the user that you are waiting for a merge.
- **Merge Verification**: Only mark a task as `[x]` after verifying the PR has been successfully merged into the `main` branch. 

### 1.3. Branching Strategy
- Branch names must follow: `feat/agent-[task-name]`, `fix/agent-[bug-name]`, or `chore/agent-[chore-name]`.
- Always branch from the latest `main` commit. If `main` has updated since your last PR, run a sync/pull before starting new work.

---

## ⏱️ 2. Scheduled Task Management

As a browser-based OS, we run multiple background processes. Improper management leads to "Memory Leaks" and "Main Thread Jitter."

### 2.1. Cleanup Requirements
- **EVERY** `setInterval` and `setTimeout` must be cleared in the cleanup phase of a `useEffect` or component unmount.
- **Protocol**: Use `useRef` to store timer IDs.
- **Abort Signals**: For complex async loops, prefer `AbortController` to stop entire chains of execution.

### 2.2. CPU-Intensive Tasks
- **Rule**: Heavy computations (Math, ML, Data Parsing > 16ms) **MUST** be offloaded to Web Workers.
- **Example**: `benchmark.worker.js` and `aiWorker.js` are our standards.
- **Optimization**: Use `requestIdleCallback` for low-priority background synchronization (e.g., state persistence).

### 2.3. Animation Loops
- Use `requestAnimationFrame` (via `@react-three/fiber`'s `useFrame` where applicable) for all UI transitions to ensure synchronization with the browser's refresh rate.

---

## 🛡️ 3. Security & Integrity

### 3.1. Static Site Content Security Policy (CSP)
- Because we deploy as a purely static site on Render/Netlify, we do not have a backend to inject dynamic headers.
- **Protocol**: CSP and Cross-Origin headers (`COOP`, `COEP`) **MUST** be configured in `render.yaml` and `netlify.toml`.
- **Requirements**: We use `@webcontainer/api` and `@xenova/transformers`, which require strict isolation. Our static headers must explicitly allow:
  - `wasm-eval` for WebAssembly modules.
  - Trusted CDNs for ML models (`https://huggingface.co`, `https://cdn.jsdelivr.net`).

### 3.2. Dependency Auditing
- **Protocol**: Weekly `npm audit` is mandatory.
- **Version Pinning**: Critical security dependencies (like `yjs` or `transformers`) should use exact versions or tilde (`~`) to avoid breaking P2P compatibility.

### 3.3. P2P & WebRTC Security
- Our `WebrtcProvider` uses an external signaling server (Render).
- **Rule**: Avoid transmitting sensitive user data over unencrypted signaling channels. Use end-to-end encryption for shared state where possible.

---

## 🧪 4. Testing & Validation

### 4.1. Unit & App Performance Testing
- All "Slices" (Zustand) and "Workers" must have corresponding `.test.js` files.
- **True App Performance**: To measure application regressions (Time to Interactive, Bundle Size, React Render times), use Lighthouse and the React Profiler. 

### 4.2. The 'Benchmark' App 
- **Important Distinction**: The in-OS `Benchmark` app (powered by `benchmark.worker.js`) measures **Client Device Hardware (CPU/Memory)**, *not* our codebase's performance.
- **Protocol**: Do NOT use the Benchmark app to measure UI regressions. Instead, use the Benchmark score to dynamically enable/disable heavy OS features (e.g., disabling the 3D Quantum Widget if the client device scores low).

### 4.3. E2E Testing
- Focus on the "Boot-to-Desktop" flow. If the Boot Sequence fails, the entire project is considered broken.

---

## 🚀 5. Latest Tech Alignment (2026 Standard)

- **React 19+**: Utilize `use` hook for resource loading (e.g., loading AI models).
- **Vite 8+**: Leverage the "Environment API" to isolate Worker builds from Main Thread builds.
- **Tailwind 4+**: Transitioning to CSS-variable-first styling for better runtime performance.
