# 🚁 Wingman - Personal Assistant Dashboard

> A modern personal assistant desktop application that combines task management, calendar events, diary entries, and an AI chatbot in one unified interface.

![Wingman Dashboard](screenshots/dashboard.png)

<p align="center">
  <img src="https://img.shields.io/badge/react-18.2.0-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/typescript-5.2.2-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/electron-27.1.3-blue?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/fastapi-0.110.0-blue?logo=fastapi" alt="FastAPI">
  <img src="https://img.shields.io/badge/python-3.13-blue?logo=python" alt="Python">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

## ✨ Features

- **📊 Dashboard** - At-a-glance view of tasks, events, diary entries, and statistics
- **📅 Calendar** - Manage your schedule with day, week, and month views 
- **✅ Tasks** - Create, track, and complete tasks with intuitive interface
- **📝 Diary** - Journal with mood tracking and rich text editing
- **🤖 AI Assistant** - Adaptive chatbot that responds to your mood
- **🌙 Dark Theme** - Beautiful dark-themed UI for comfortable use

## 🛠️ Tech Stack

### Frontend
- **React 18** + **TypeScript** - Modern, type-safe UI development
- **React Router** - Navigation and routing
- **Context API** - Global state management with optimized caching
- **Vite** - Fast build tool and development server

### Backend
- **FastAPI** - High-performance Python web framework
- **Supabase** - PostgreSQL database with realtime capabilities
- **Python 3.13** - Latest Python features with compatibility patches

### Desktop
- **Electron** - Cross-platform desktop wrapper
- **Inter-process communication** - Seamless frontend-backend integration

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** 
- **Python 3.13+** (required for backend compatibility)
- **npm**

### Installation

#### 1. Clone Repository

```bash
git clone https://github.com/yourusername/Wingman.git
cd Wingman
```

#### 2. Install Frontend Dependencies

```bash
npm install
```

#### 3. Set Up Python Environment

```bash
# Create virtual environment
cd Wingman-backend
python -m venv .venv

# Activate virtual environment
# On Windows:
.venv\Scripts\activate
# On macOS/Linux:
source .venv/bin/activate

# Install Python dependencies
pip install -r requirements.txt
cd ..
```

#### 4. Create Environment Files

Create `.env` in the root directory:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_KEY=your_supabase_key
```

Create `Wingman-backend/.env`:
```
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

#### 5. Start Development Environment

```bash
# Start everything (frontend, backend, and Electron)
npm run dev:full
```

## 🧭 Usage

### Navigation
- **Dashboard** - View today's tasks, events, and statistics
- **Calendar** - Manage schedule with multiple views
  - Day View - Detailed view of single day
  - Week View - Overview of current week
  - Month View - Monthly calendar with sleek selector
- **Diary** - Record thoughts and track mood
- **Wingman** - Chat with AI assistant

### Key Functions
- **Task Management** - Create, edit, complete, and track tasks
- **Event Scheduling** - Plan meetings and personal events
- **Journaling** - Write diary entries with mood tracking
- **AI Chat** - Get help and suggestions from the assistant

## 📦 Packaging & Distribution

### Building for Production

```bash
# Build frontend
npm run build

# Package as Windows app
npm run electron:build:win

# Package as macOS app
npm run electron:build:mac

# Package as Linux app
npm run electron:build:linux
```

### User Requirements
- **Python 3.13** must be installed on users' systems
- **Visual C++ Redistributable** (installed automatically on first run)

## 📋 Development Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start frontend only |
| `npm run backend:dev` | Start backend only |
| `npm run dev:full` | Start full development environment |
| `npm run build` | Build frontend |
| `npm run electron:build:win` | Package Windows app |
| `npm run electron:build:mac` | Package macOS app |
| `npm run electron:build:linux` | Package Linux app |
| `npm run package:all` | Build for all platforms |
| `npm run preview` | Preview production build |

## 🔧 Troubleshooting

### Common Issues

#### Backend Not Starting
- Ensure Python 3.13 is installed: `python --version`
- Check virtual environment is activated
- Verify all dependencies are installed: `pip install -r Wingman-backend/requirements.txt`

#### "EditPopup" Import Error
- This component has been removed. Use inline editing instead.

#### Python 3.13 Compatibility
- If experiencing issues, ensure you have the latest patch: `python patch-orjson.py`

#### API Request Failures
- Verify `.env` files have correct Supabase credentials
- Check network connectivity
- Try restarting the development servers

## 🌟 Architecture

### Data Flow
```
Component → DataContext → API Client → Backend → Supabase → 
Response → Cache Update → Component Re-render
```

### Caching Strategy
- Simple date-based caching for instant access
- Optimistic UI updates with backend synchronization
- Smart invalidation of affected dates only

## 📜 License

MIT

---

<p align="center">
  Made with ❤️ using React, Electron, and FastAPI
</p>

alright thats for the tl;dr, here's the guide:

===============================================================================
🚁 WINGMAN - COMPREHENSIVE APPLICATION GUIDE
===============================================================================

📋 OVERVIEW
-----------
Wingman is a modern personal assistant desktop application that combines task 
management, calendar events, diary entries, and an AI chatbot in one unified 
interface. Built with React + TypeScript frontend and FastAPI + Python backend,
packaged as a cross-platform Electron application.

🏗️ PROJECT STRUCTURE
--------------------
Wingman/
├── src/                     # Frontend React/TypeScript code
│   ├── api/                 # API client functions
│   ├── components/          # React components
│   │   ├── Calendar/        # Calendar views (Day/Week/Month)
│   │   ├── ChatBot/         # AI assistant interface
│   │   ├── Dashboard/       # Main dashboard cards
│   │   ├── Diary/           # Journal functionality
│   │   ├── Header/          # Top navigation
│   │   ├── Profile/         # User authentication & settings
│   │   └── Sidebar/         # Left navigation menu
│   ├── context/             # React context providers (central state)
│   │   └── DataContext.tsx  # Core data management & caching
│   ├── hooks/               # Custom React hooks
│   ├── types/               # TypeScript definitions
│   ├── utils/               # Utility functions
│   └── main.tsx            # Application entry point
├── Wingman-backend/         # Python FastAPI backend
│   ├── app/
│   │   ├── api/v1/         # API endpoints
│   │   ├── core/           # Configuration & database
│   │   ├── services/       # Business logic
│   │   └── tasks/          # Task management
│   └── main.py             # Backend entry point
├── electron/                # Electron main process
│   ├── main.js             # Electron configuration
│   └── preload.js          # Context bridge
└── dist/                   # Built application output

===============================================================================
⚙️ DEVELOPMENT VS PRODUCTION ARCHITECTURE
===============================================================================

🔧 DEVELOPMENT MODE OPTIONS & PRODUCTION PARITY ANALYSIS
--------------------------------------------------------

🎯 **PRODUCTION REALITY**
```javascript
// In production .exe:
app.whenReady().then(() => {
  startBackendServer().then(() => {  // Electron spawns backend
    createWindow();                  // Then creates window
  })
});
```

🔧 **DEVELOPMENT COMPARISON**

### **OPTION 1: `npm run dev:electron` (CLOSER TO PRODUCTION - RECOMMENDED)**
```bash
npm run dev:electron
# → Vite frontend (5173) + Electron spawns backend (8080)
```

**What happens:**
```
Process 1: Vite dev server (localhost:5173)
Process 2: Electron main process
  ├── Spawns Python backend (127.0.0.1:8080)  SAME AS PRODUCTION
  ├── Loads http://localhost:5173              Different URL, same pattern
  └── Manages backend lifecycle                SAME AS PRODUCTION
```

### **OPTION 2: Separate `dev` + `electron:dev` (FARTHER FROM PRODUCTION)**
```bash
# Terminal 1:
npm run dev          # Vite (5173)

# Terminal 2: 
./venvset.bat        # Manual backend (8080)

# Terminal 3:
npm run electron:dev # Electron (detects existing backend)
```

**What happens:**
```
Process 1: Vite dev server (localhost:5173)
Process 2: Manual Python backend (127.0.0.1:8080)    ❌ NOT like production
Process 3: Electron main process
  ├── Detects existing backend                       ❌ NOT like production
  ├── Loads http://localhost:5173                    ✅ Different URL
  └── NO backend management                          ❌ NOT like production
```

🎯 **RECOMMENDATION: Use `dev:electron`**

**Current architecture is PERFECT for this approach:**

```json
{
  "scripts": {
    "dev:electron": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && npm run electron:dev\""
  }
}
```

**This gives you:**
- ✅ **Production parity** - Same process management
- ✅ **Fast development** - Vite hot reload still works
- ✅ **Real testing** - Same code paths as production
- ✅ **Single command** - Easy workflow

===============================================================================
🛠️ DEPENDENCIES & COMPATIBILITY
===============================================================================

🐍 PYTHON REQUIREMENTS
----------------------
VERSION: Python 3.13+ (with 3.13 compatibility patches)

CORE DEPENDENCIES:
- fastapi==0.110.0          # Web framework
- uvicorn==0.29.0           # ASGI server
- supabase==1.0.3           # Database client
- pydantic==2.11.4          # Data validation
- pydantic-settings==2.9.1  # Settings management
- python-dotenv==1.1.0      # Environment variables

COMPATIBILITY LAYER:
- patch-orjson.py           # Python 3.13 JSON compatibility
- Standard library fallbacks for orjson dependency

📦 NODE.JS REQUIREMENTS
-----------------------
VERSION: Node.js 18+

FRONTEND CORE:
- react ^18.2.0             # UI framework
- react-dom ^18.2.0         # DOM rendering
- react-router-dom ^6.30.1  # Routing
- typescript ^5.2.2         # Type safety
- vite ^5.0.8               # Build tool

DATA & API:
- @tanstack/react-query ^5.59.0  # Server state management
- @supabase/supabase-js ^2.49.8  # Database client
- axios ^1.9.0              # HTTP client
- date-fns ^2.30.0          # Date utilities

DESKTOP:
- electron ^27.1.3          # Desktop wrapper
- electron-builder ^24.8.1  # Packaging tool

DEVELOPMENT:
- concurrently ^8.2.2       # Run multiple commands
- wait-on ^7.2.0            # Wait for services
- cross-env ^7.0.3          # Environment variables

🗄️ DATABASE (SUPABASE)
----------------------
TABLES:
1. users - User authentication & profiles
2. tasks - Task management with urgency levels
3. calendar_events - Scheduled events
4. diary_entries - Journal entries with mood tracking
5. user_settings - User preferences
6. chat_sessions - AI chatbot conversations
7. chat_messages - Individual chat messages

RLS POLICIES: All tables have Row Level Security ensuring users can only 
access their own data.

===============================================================================
🚀 BUILD & DEPLOYMENT PROCESS
===============================================================================

📋 DEVELOPMENT SETUP
--------------------
1. Clone repository
2. Install Node.js dependencies: npm install
3. Create Python virtual environment: 
   cd Wingman-backend && python -m venv .venv (or py since python 3.13 on WIN)
4. Install Python dependencies: 
   .venv\Scripts\activate && pip install -r requirements.txt
5. Create environment files:
   - .env (root): VITE_SUPABASE_URL, VITE_SUPABASE_KEY
   - Wingman-backend/.env: SUPABASE_URL, SUPABASE_KEY
6. Run development: npm run dev:full

🏗️ PRODUCTION BUILD
-------------------

BUILD PROCESS:
1. Frontend build: npm run build (creates dist/)
2. Python environment preparation
3. Electron packaging: npm run electron:build:win
4. Output: Self-contained .exe installer

OPTIMIZATIONS IMPLEMENTED:
- Simple date-based caching (no complex week calculations)
- Debounced API calls to prevent duplicate submissions
- Request deduplication in API client
- Form submission state tracking
- Event prevention in click handlers

PACKAGING INCLUDES:
- Bundled React application (dist/)
- Embedded Python backend (Wingman-backend/)
- Python runtime compatibility layer
- Electron wrapper with auto-backend startup

===============================================================================
🎯 DATA ARCHITECTURE & PERFORMANCE
===============================================================================

🔄 DATA FLOW ARCHITECTURE
------------------------
The application uses a centralized data management approach:

1. **DataContext Provider**:
   - Central state management
   - Simple date-based caching system
   - Optimistic UI updates with backend synchronization

2. **API Layer**:
   - Axios-based HTTP client with retry mechanisms
   - Request deduplication to prevent doubles
   - Auto-invalidation of affected cache entries

3. **Core Data Flow**:
```
Component → DataContext → API Client → Backend → Supabase → 
Response → Cache Update → Component Re-render
```

4. **Optimistic Updates**:
```
User Action → Immediate UI Update → 
Background API Call → Confirm/Rollback
```

🛠️ CACHING STRATEGY
------------------
The application uses simple date-based caching:

1. **Present-Based Data Loading**:
   - Cache keys use simple date strings (YYYY-MM-DD)
   - No complex week calculations
   - Instant data access for cached dates

2. **Cache Management**:
   - Smart invalidation of only affected dates
   - LRU policy for memory optimization
   - Persistent storage for offline access

3. **Cache Statistics**:
   - 50% faster loading times
   - Reduced API calls (1-2 per view vs 14+ previously)
   - Immediate UI responsiveness

⚡ REACT PERFORMANCE OPTIMIZATIONS
--------------------------------
1. **Component Optimization**:
   - React.memo for expensive components
   - useMemo for computed values
   - useCallback for stable references

2. **Rendering Efficiency**:
   - Custom memo comparison functions
   - Intersection Observer for lazy loading
   - CSS transitions for smooth UI

3. **Developer Tools**:
   - Performance monitoring integration
   - API call tracking
   - Cache hit/miss ratio monitoring

===============================================================================
🎯 APPLICATION FLOW & NAVIGATION
===============================================================================

🏠 DASHBOARD (/)
---------------
LAYOUT: 4-card grid system

SUMMARY CARD:
- Today's Events (clickable) → /notifications?tab=event
- Pending Tasks (clickable) → /notifications?tab=task  
- Completed Today (clickable) → /completed-tasks?date=today
- Motivational quotes display

TASKS CARD:
- Today's pending tasks list
- Task completion toggle (immediate Supabase sync)
- "Add Task" → Quick task creation form
- Click task → Detail popup with edit/delete options

EVENTS CARD:
- Today's scheduled events
- "Add Event" → Quick event creation form
- Click event → Detail popup with edit/delete options

DIARY CARD:
- Recent diary entries preview
- Click entry → Entry details popup
- "Write Entry" → /diary/write

📅 CALENDAR MODULE
-----------------
DAY VIEW (/calendar/day?date=YYYY-MM-DD):
- Navigation: ← Previous Day | Today | Next Day →
- Tabs: Tasks/Events toggle
- Add buttons: Inline forms for quick creation
- Click items: Detail popups with edit/delete
- Optimized single-date data loading

WEEK VIEW (/calendar/week?date=YYYY-MM-DD):
- 7-day grid layout with performance monitoring
- Present-based data loading (no week ID calculations)
- Click day → Navigate to day view
- Click task/event → Detail popup
- Performance: React.memo optimization + debounced updates

MONTH VIEW (/calendar/month):
- Monthly calendar grid
- Month selector with sleek design and glow effects
- Click date → Navigate to day view for that date

📔 DIARY MODULE
--------------
WRITE ENTRY (/diary/write):
- Rich text editor for content
- Mood selection with animated emojis
- Save → Entry stored + redirect to view

VIEW ENTRIES (/diary/view):
- Chronological list of all entries
- Click entry → Expanded view with full content

SEARCH (/diary/search):
- Search through past entries
- Filter by: date range, mood, keywords
- Click result → Entry details popup

🤖 AI ASSISTANT (/chatbot)
-------------------------
- Chat interface with AI assistant
- Mood-responsive behavior adaptation
- Quick reply suggestions
- Chat history persistence
- Session management

👤 PROFILE MODULE
----------------
LOGIN SYSTEM:
- 6-digit password maximum (security by simplicity)
- Registration with email validation
- Demo mode for quick testing
- Persistent authentication storage

SETTINGS (/profile/settings):
- User preferences configuration
- Account management options

AVATAR (/profile/avatar):
- Profile picture customization interface

===============================================================================
🐛 KNOWN ISSUES & SOLUTIONS
===============================================================================

⚠️ PYTHON 3.13 COMPATIBILITY
----------------------------
ISSUE: orjson dependency conflicts
SOLUTION: Users must install Python 3.13 separately, or use patch-orjson.py compatibility layer

⚠️ ELECTRON BACKEND STARTUP
---------------------------
ISSUE: Backend not starting in packaged app
SOLUTION: Enhanced Python executable detection

⚠️ CACHE RACE CONDITIONS  
------------------------
ISSUE: Data inconsistency during rapid updates
SOLUTION: Debounced cache updates + request deduplication

===============================================================================
🚀 QUICK START COMMANDS
===============================================================================

🔧 DEVELOPMENT:
npm run dev:full                    # Start full development environment
npm run backend:dev                 # Backend only
npm run dev                         # Frontend only

🏗️ BUILDING:
npm run build                       # Build frontend
npm run electron:build:win          # Package Windows app
npm run electron:build:mac          # Package macOS app  
npm run electron:build:linux        # Package Linux app
npm run package:all                 # Build all platforms

🧪 TESTING:
npm run preview                     # Preview production build
.\debug-wingman.bat                 # Debug packaged app

===============================================================================
📁 IMPORTANT FILES
===============================================================================

FRONTEND CORE:
- src/App.tsx                       # Main application component
- src/context/DataContext.tsx       # Global state management
- src/api/apiClient.ts              # HTTP client with retry logic
- src/config.ts                     # Environment configuration

BACKEND CORE:
- Wingman-backend/main.py           # FastAPI application
- Wingman-backend/app/core/supabase.py  # Database connection
- Wingman-backend/requirements.txt  # Python dependencies

ELECTRON:
- electron/main.js                  # Main process (backend startup)
- electron/preload.js               # Renderer security bridge

BUILD:
- package.json                      # Node.js project configuration
- vite.config.ts                    # Frontend build configuration
- complete-build.bat                # Automated build script

ENVIRONMENT:
- .env                              # Frontend environment variables
- Wingman-backend/.env              # Backend environment variables

===============================================================================
🎯 FUTURE ENHANCEMENTS
===============================================================================

PLANNED FEATURES:
- Task recurring patterns (weekly, monthly)
- Calendar synchronization with external services
- Advanced AI assistant capabilities
- Mobile application companion
- Team collaboration features
- Data export/import functionality

TECHNICAL IMPROVEMENTS:
- Progressive Web App (PWA) support
- Offline functionality with sync
- Advanced caching strategies
- Performance monitoring integration
- Automated testing suite

===============================================================================
📞 TROUBLESHOOTING
===============================================================================

🔍 COMMON ISSUES:

1. "Backend not ready" error:
   - Check Python installation: py --version / python --version
   - Verify virtual environment: Wingman-backend/.venv/
   - Run: .\debug-wingman.bat for detailed logs

2. "API request failed" errors:
   - Verify .env files exist and have correct Supabase credentials
   - Check network connectivity
   - Restart development servers

3. Double entry submissions:
   - Clear browser cache
   - Check for multiple rapid clicks
   - Verify form submission prevention is working

4. Electron packaging failures:
   - Ensure all dependencies are installed
   - Check Python runtime inclusion
   - Verify build scripts have proper permissions

5. Python 3.13 compatibility:
   - Users need to install Python 3.13 separately
   - Alternative: Package Python 3.13 runtime with your app

===============================================================================
END OF COMPREHENSIVE GUIDE
===============================================================================
┌─────────────┐  proxy   ┌──────────────┐
│ ELECTRON    │─────────▶│ PYTHON       │
│ RENDERER    │          │ BACKEND      │
│ localhost   │          │ localhost    │
│ :5173       │◀────────▶│ :8080        │
└─────────────┘          └──────────────┘
┌─────────────────┐
│   CONCURRENTLY  │
├─────────────────┤
│ [0] Backend     │ ← Python FastAPI on :8080
│ [1] Frontend    │ ← Vite dev server on :5173  
│ [2] Electron    │ ← Loads http://localhost:5173
└─────────────────┘