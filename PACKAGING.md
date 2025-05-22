# Wingman Application Packaging Guide

This guide helps you package the Wingman application into an installable desktop app for Windows, macOS, or Linux.

## Prerequisites

- Node.js 18+ and npm
- Python 3.13+
- Git

## Setup Environment

1. Clone the repository:
   git clone https://github.com/your-username/wingman.git cd wingman

2. Run the setup script:
3. Configure environment variables:

- Create a `.env` file in the root directory
- Add your Supabase URL and key:
  ```
  VITE_SUPABASE_URL=your_supabase_url
  VITE_SUPABASE_KEY=your_supabase_key
  ```

## Development

Run the full development environment (frontend, backend, and Electron):
npm run dev:full

Or run components individually:

- Backend only: `npm run dev:backend`
- Frontend only: `npm run dev`
- Electron only: `npm run dev:electron`

## Building and Packaging

### For Windows:

npm run electron:build:win

### For macOS:

npm run electron:build:mac

### For Linux:

npm run electron:build:linux

### For all platforms:

npm run package:all


-----
The packaged applications will be available in the `dist_electron` directory.

## Troubleshooting

- **Backend not starting**: Ensure Python virtual environment is set up correctly
- **Missing dependencies**: Run `npm install` and `pip install -r Wingman-backend/requirements.txt`
- **Electron not finding backend**: Verify the backend path in `electron/main.js`

## Production Notes

When deploying to production:

1. Update the `CONFIG.SUPABASE_URL` and `CONFIG.SUPABASE_KEY` in `src/config.ts`
2. Remove the demo login from `src/components/Profile/login.tsx`
3. Set proper error handling in all API calls
