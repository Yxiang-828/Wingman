# Wingman Release Notes - v1.1.0 (Milestone 4 - The Privacy Update)

## 🚀 What's New?

We've completely overhauled Wingman's core architecture to prioritize exactly what an AI companion should: **Your Privacy.**

### 100% Offline & Local-First 🔒
- **Removed Supabase entirely:** Wingman no longer attempts to connect, sync, or communicate with the cloud. 
- **Pure Local Experience:** All authentication, tasks, diary entries, and calendar events are securely stored on your local machine using SQLite. Your data literally never leaves your device.
- **Zero Internet Required:** After the initial download and model setup, Wingman works perfectly in environments with absolutely zero connectivity.

### Under the Hood Polish 🛠️
- Fixed obscure Electron/Vite build loops and port conflict errors affecting the development environment.
- Streamlined complete-build.bat ensuring quicker package bundling.
- Restructured Python FastAPI services directly bridging to the local SQLite engine via a highly optimized wrapper.
- Fixed obscure variable parsing crashes in user profiles.

*Update now by downloading the latest installer. No cloud migrations required, just boot up and let your completely offline Wingman assist you today.*
