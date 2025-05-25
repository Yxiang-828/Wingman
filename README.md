# Wingman - Personal Assistant Dashboard

![Wingman Dashboard](screenshots/dashboard.png)

## Overview

Wingman is a modern, elegant personal assistant application that combines task management, calendar events, diary entries, and an AI chatbot in one unified interface. Built with React, TypeScript, and FastAPI, Wingman helps you organize your day and maximize productivity with a beautiful dark-themed UI.

## Features

- **Dashboard** - See your day at a glance with task summaries, upcoming events, and recent diary entries
- **Calendar** - Manage your schedule with day, week, and month views
- **Tasks** - Create, track, and complete tasks with due dates and priorities
- **Events** - Schedule and visualize appointments, meetings, and reminders
- **Diary** - Record your thoughts and experiences with a full-featured journal
- **AI Assistant** - Get suggestions and help from an integrated chatbot

## Tech Stack

### Frontend

- React + TypeScript
- React Router for navigation
- CSS Modules for styling
- Context API for state management

### Backend

- FastAPI (Python)
- Supabase for data storage
- AI integration for the assistant functionality

## Getting Started

### Prerequisites

- Node.js (v16+)
- Python (v3.9+)
- npm or yarn

### Installation

#### Frontend

```bash
# Clone the repository
git clone https://github.com/yourusername/Wingman.git
cd Wingman

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Backend

```bash
# Navigate to the backend directory
cd backend

# Install Python dependencies
pip install -r requirements.txt

# Start the FastAPI server
uvicorn main:app --reload
```

## Running the App

1. **Start the backend server** (if not already running):

   ```bash
   cd backend
   uvicorn main:app --reload
   ```

2. **Start the frontend development server**:

   ```bash
   cd frontend
   npm run dev
   ```

3. **Open your browser and go to** `http://localhost:3000`.

## Building for Production

To build the app for production, run:

```bash
npm run build
```

## Packaging

To create a distributable desktop app, use:

```sh
npm run pack
```

_(Requires [electron-builder](https://www.electron.build/) or similar setup.)_

## License

MIT

---

_Made with ❤️ using Electron, React, and Vite._

Backend

cd Wingman-backend

# Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Start the server
python main.py


Project Structure

Wingman/
├── src/
│   ├── api/            # API client functions
│   ├── components/     # React components
│   │   ├── Calendar/
│   │   ├── ChatBot/
│   │   ├── Dashboard/
│   │   ├── Diary/
│   │   ├── Header/
│   │   ├── Profile/
│   │   └── Sidebar/
│   ├── context/        # React context providers
│   ├── Hooks/          # Custom React hooks
│   ├── Pages/          # Top-level page components
│   ├── services/       # Utility services
│   ├── types/          # TypeScript type definitions
│   ├── App.tsx         # Main application component
│   └── main.tsx        # Application entry point
└── Wingman-backend/    # Python FastAPI backend
    ├── app/
    │   ├── api/
    │   ├── core/
    │   └── services/
    └── main.py

---
Configuration

VITE_API_URL=http://localhost:8000
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key

Here’s a clean, formatted version of your usage and feature guide for your web app:

---

## 🧭 Usage Instructions

After starting both the **frontend** and **backend** servers:

* 🔗 **Access the web app** at: [http://localhost:5173](http://localhost:5173)
* 🔐 **Login** using the 6-digit password
* 🧭 **Navigate** using the sidebar to explore all features

---

## 🚀 Key Features Explained

### 📊 Dashboard

Get a quick daily snapshot:

* 💬 **Motivational Quotes** and a summary of your day
* ✅ **Today's Tasks** with live completion status
* 📅 **Upcoming Events** with time and category labels
* 📖 **Recent Diary Entries** with mood and preview
* 🤖 **Quick Access** to the Chat Assistant

---

### 📆 Calendar

Stay organized with flexible views:

* 🗓 **Day View**: Detailed agenda for a single day
* 📅 **Week View**: Overview of the current week, with quick-add functionality
* 📆 **Month View**: Monthly planner with smooth navigation

---

### 📔 Diary

Record, reflect, and search your thoughts:

* ✍️ **New Entries** with mood tracking support
* 📅 **View Past Entries** organized by date and emotion
* 🔍 **Search Functionality** to revisit previous experiences

---

### 🤖 ChatBot

Get help or entertainment, your way:

* 🎭 **Adjustable Style**: Choose between *serious* or *funny* replies
* ⚡ **Quick Replies**: Handy suggestions to speed up chats
* 💬 **Persistent Chat History**: Keep track of past conversations

---

Development Scripts
# Start frontend development server
npm run dev

# Start frontend and Electron together
npm run dev:full

# Build for production
npm run build

# Package the Electron app
npm run electron:build

---

Here's your **Wingman Backend Setup** guide, clearly formatted:

---

## 🛠️ Wingman Backend Setup

Follow these steps to install dependencies and start the backend server:

---

### 📁 1. Navigate to the Project Directory

```bash
cd /path/to/Wingman
```

---

### 🐍 2. Create a Virtual Environment (if not already created)

```bash
python -m venv Wingman-backend/.venv
```

---

### ⚙️ 3. Activate the Virtual Environment

* **On Windows:**

```bash
Wingman-backend\.venv\Scripts\activate
```

* **On macOS/Linux:**

```bash
source Wingman-backend/.venv/bin/activate
```

---

### 📦 4. Install Dependencies

```bash
pip install -r Wingman-backend/requirements.txt
```

---

### 🚀 5. Start the Backend Server

```bash
cd Wingman-backend
uvicorn main:app --reload
```

---

### 🌐 The backend server should now be running at:

[http://127.0.0.1:8000]

---

Let me know if you want this formatted in Markdown, HTML, or included in a README!

Acknowledgments
UI design inspired by modern productivity applications
