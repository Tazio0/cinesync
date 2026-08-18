# 🍿 CineSync — Universal Cross-Network Screen Sharing & Watch Party Web App

A clean, beautiful, zero-install screen sharing and watch party web app designed for streaming **Screens / Tabs**, **Netflix**, **YouTube**, **Direct Video streams**, and **Movies** together in real-time across different networks and on any device (Desktop, iPhone, Android, iPad, Mac, Windows, Linux).

Hosted seamlessly on **Vercel** with **0 backend dependencies** — your friends don't have to download or install anything!

---

## ✨ Features

- 📺 **Universal HD Screen & Tab Sharing**: Stream any browser tab, app window, or entire screen in 1080p 60 FPS with stereo audio.
- ⚡ **True Cross-Network WebRTC Traversal**: Automatic NAT traversal with redundant STUN (Google, Cloudflare, Twilio, Nextcloud) and high-availability TURN relays (OpenRelay UDP/TCP/TLS) to connect across home Wi-Fi, mobile 4G/5G, university campuses, and corporate firewalls.
- 📱 **Any Device Compatibility (Mobile, Tablet, Desktop)**:
  - **Desktop/Laptop**: 60 FPS screen & tab audio sharing with 1-click controls.
  - **Mobile / Tablet Viewers**: Handles strict mobile autoplay audio policies with one-tap play, Fit / Fill / Zoom modes, Picture-in-Picture (PiP), and native fullscreen.
  - **Mobile Broadcasters**: Live Camera & Mic streaming mode to broadcast camera feeds directly to the room.
- 📊 **Real-Time WebRTC Diagnostics & Custom TURN**:
  - Live round-trip ping (RTT ms), FPS, video resolution, network quality indicators (Direct P2P vs TURN Relay).
  - Custom TURN credential support for restrictive environments.
- 💬 **Live Minimalist Chat & Popcorn Pops**: Real-time messaging, typing indicators, and floating emoji reaction bursts.
- 🔊 **Built-in Web Audio Synthesizer**: Low-latency sound effects for message chimes, reaction pops, join sounds, and synchronized countdown beeps.
- 🎬 **Synchronized Video Player**: Play YouTube, direct MP4/HLS streams, and local video files with drift compensation.
- ⏱️ **Dual Netflix Sync Controller**: Synchronized 3-2-1 countdown timer for friends watching on separate Netflix accounts.
- 📱 **QR Code & Instant Invite Links**: Share 1-click room URLs or scan with a phone/tablet camera.
- 🎭 **Theater Cinema Mode & Dynamic Ambient Glow**: Immersive backdrop lighting that reflects cinema theater ambiance.
- 📹 **Optional WebRTC Webcam & Mic PiP**: See and speak to your friends while watching.

---

## 🚀 How to Deploy to Vercel in 1 Minute

### Method 1: Vercel CLI (Fastest)
From the project folder:
```bash
npm install -g vercel
vercel
```
Follow the prompt (accept defaults) and your watch party app will be live on `https://your-app.vercel.app`!

### Method 2: GitHub + Vercel Dashboard
1. Push this folder to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of CineSync"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/cinesync.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new), select your repo, and click **Deploy**.

---

## 🎥 How to Stream Screen / Netflix with Full Audio

1. Open **CineSync** and create a room.
2. Send the invite link or QR code to your friend (on phone, tablet, or PC).
3. Click **"Share Screen / Netflix Tab"** (or click the Netflix Guide button `?` in the header).
4. When the browser prompt opens:
   - Click the **"Chrome Tab"** (or "Browser Tab") tab.
   - Select your **Netflix** tab.
   - Make sure **"Also share tab audio"** is checked at the bottom left.
5. Press Play and enjoy the movie together across any network!

> **DRM Tip**: If Netflix displays a black screen during streaming, go to Chrome `Settings > System`, disable `"Use graphics acceleration when available"`, restart Chrome, and start streaming.

---

## 🛠️ Local Development

```bash
# Install dependencies
yarn install   # or npm install

# Start development server
yarn dev       # or npm run dev

# Build production bundle
yarn build     # or npm run build

# Run linter
yarn lint
```

---

Built with Vite, React 19, TypeScript, PeerJS, and Vanilla CSS.
