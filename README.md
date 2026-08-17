# 🍿 CineSync — Minimalist Watch Party Web App

A clean, beautiful, zero-install watch party web app designed for streaming **Netflix**, **YouTube**, **Direct Video streams**, and **Movies** together in real-time with synchronized playback, stereo tab audio, and live chat.

Hosted seamlessly on **Vercel** with **0 backend dependencies** — your friends don't have to download or install anything!

---

## ✨ Features

- 📺 **Netflix & Browser Tab HD Screen Sharing**: Stream your Netflix tab directly with high-definition 60 FPS video and stereo tab audio.
- ⚡ **Pure Peer-to-Peer (WebRTC / PeerJS)**: Direct browser-to-browser connection with sub-20ms latency and end-to-end encryption.
- 💬 **Live Minimalist Chat**: Real-time messaging, timestamps, host badges, and typing indicators.
- 🍿 **Floating Emoji Reactions**: Real-time popcorn, hearts, laughter, and flame reactions bubbling smoothly across the screen.
- 🔊 **Built-in Web Audio Synthesizer**: Crisp sound effects for message chimes, reaction pops, and join sounds (with mute toggle).
- 🎬 **Synchronized Video Player**: Play YouTube videos, direct MP4/HLS streams, and local movie files with synchronized play/pause/seek drift compensation.
- ⏱️ **Dual Netflix Sync Controller**: Synchronized 3-2-1 countdown timer for friends watching on separate Netflix accounts.
- 📱 **QR Code & Instant Invite Links**: Share 1-click room URLs or scan with a phone/tablet camera.
- 🎭 **Theater Cinema Mode & Dynamic Ambient Glow**: Immersive backdrop lighting that reflects cinema theater ambiance.
- 📹 **Optional WebRTC Webcam & Mic PiP**: See and speak to your friend while watching.

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

## 🎥 How to Stream Netflix with Full Audio

1. Open **CineSync** and create a room.
2. Send the invite link to your friend.
3. Click **"Share Netflix Tab"** (or click the Netflix Guide button `?` in the header).
4. When the browser prompt opens:
   - Click the **"Chrome Tab"** (or "Browser Tab") tab.
   - Select your **Netflix** tab.
   - Make sure **"Also share tab audio"** is checked at the bottom left.
5. Press Play and enjoy the movie together!

> **DRM Tip**: If Netflix displays a black screen during streaming, go to Chrome `Settings > System`, disable `"Use graphics acceleration when available"`, restart Chrome, and start streaming.

---

## 🛠️ Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build production bundle
npm run build
```

---

Built with Vite, React, TypeScript, PeerJS, and Vanilla CSS.
