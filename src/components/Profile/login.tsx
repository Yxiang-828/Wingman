// User Authentication Hub - Gateway to your digital realm
// Handles both login and registration with theme-aware background videos
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import productiveIcon from "../../assets/icons/productive.png";
import moodyIcon from "../../assets/icons/moody.png";
import { Auth } from "../../utils/AuthStateManager";
import { loginUser, registerUser, getCurrentUser } from "../../services/hybridAuth";
import ConnectionStatus from "../Common/ConnectionStatus";
import UsernameConflictModal from "../Common/UsernameConflictModal";
import "./login.css";
import darkVideo from "../../assets/backgrounds/videos/dark-theme.mp4";
import lightVideo from "../../assets/backgrounds/videos/light-theme.mp4";
import yandereVideo from "../../assets/backgrounds/videos/yandere-theme.mp4";
import kuudereVideo from "../../assets/backgrounds/videos/kuudere-theme.mp4";
import tsundereVideo from "../../assets/backgrounds/videos/tsundere-theme.mp4";
import dandereVideo from "../../assets/backgrounds/videos/dandere-theme.mp4";
import WelcomePopup from "./WelcomePopup";

const moodIcons: Record<string, string> = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const Login: React.FC<{ onLogin: (user: any) => void }> = ({ onLogin }) => {
  const [step, setStep] = useState<"login" | "register">("login");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<"productive" | "moody">("productive");
  const [currentTheme, setCurrentTheme] = useState<string>("dark");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [autoTilt, setAutoTilt] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  
  // Username conflict handling states
  const [showUsernameConflict, setShowUsernameConflict] = useState(false);
  const [conflictError, setConflictError] = useState<string>('');
  const [conflictUsername, setConflictUsername] = useState<string>('');
  const navigate = useNavigate();

  // Listen for mood changes from external sources
  useEffect(() => {
    const handleMoodChange = (mood: string) => {
      if (mood === "productive" || mood === "moody") setMood(mood);
    };

    let cleanup: (() => void) | undefined;
    if (window.electronAPI?.onMoodChange) {
      const result = window.electronAPI.onMoodChange(handleMoodChange);
      if (typeof result === "function") {
        cleanup = result;
      }
    }

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // Apply saved theme from localStorage to maintain visual consistency
  useEffect(() => {
    const loadSavedTheme = () => {
      try {
        const savedSettings = localStorage.getItem("userSettings");
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.theme) {
            console.log(`Applying saved theme: ${settings.theme}`);
            setCurrentTheme(settings.theme);

            // Apply theme class to body for global styling
            const body = document.body;
            body.classList.remove(
              "dark-theme",
              "light-theme",
              "yandere-theme",
              "kuudere-theme",
              "tsundere-theme",
              "dandere-theme"
            );

            if (settings.theme !== "dark") {
              body.classList.add(`${settings.theme}-theme`);
            }
          }
        }
      } catch (e) {
        console.error("Failed to load saved theme:", e);
      }
    };

    loadSavedTheme();
    setTimeout(loadSavedTheme, 100);
  }, []);

  // Theme-specific video backgrounds for immersive experience
  const themeVideos: Record<string, string> = {
    dark: darkVideo,
    light: lightVideo,
    yandere: yandereVideo,
    kuudere: kuudereVideo,
    tsundere: tsundereVideo,
    dandere: dandereVideo,
  };

  // Password validation with character limit enforcement
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;

    if (newPassword.length <= 6) {
      setPassword(newPassword);
    }
  };

  // User authentication with hybrid online/offline support
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('Attempting hybrid login...');
      
      const result = await loginUser(username, password);

      // Check for sync conflicts first (regardless of success flag)
      if (result.syncConflict) {
        console.log('Sync conflict detected during login - showing conflict modal');
        setConflictError(result.conflictError || 'Username conflict detected');
        setConflictUsername(result.conflictUsername || username);
        setShowUsernameConflict(true);
        setLoading(false);
        
        // DO NOT authenticate user yet - wait for conflict resolution
        // Don't call Auth.setAuthenticated() or onLogin() until conflict is resolved
        
        // Don't navigate yet - let user resolve conflict first
        return;
      }

      if (result.success && result.user) {

        // Update authentication state manager
        Auth.setAuthenticated(true, result.user.id);

        // Notify ThemeContext that user is authenticated
        const authEvent = new CustomEvent('user-authenticated', { 
          detail: { userId: result.user.id } 
        });
        window.dispatchEvent(authEvent);

        onLogin(result.user);

        // Show connection status
        const connectionStatus = navigator.onLine ? 'online' : 'offline';
        console.log(`Login successful (${connectionStatus}):`, result.user.email);

        // Navigate to dashboard with greeting flag
        navigate("/", { state: { showGreeting: true } });
      } else {
        setError(result.error || "Login failed. Please check your credentials.");
      }
    } catch (error: any) {
      console.error('Login error:', error);
      setError(
        error.message || 
        "Login failed. Please check your internet connection and try again."
      );
    }

    setLoading(false);
  };

  // New user registration with hybrid online/offline support
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      setLoading(false);
      return;
    }

    if (password.length < 4) {
      setError("Password must be 4-6 characters.");
      setLoading(false);
      return;
    }

    // Check if offline and inform user
    if (!navigator.onLine) {
      setError(
        "Registration is only available offline for testing. Your account will sync when you connect to the internet."
      );
    }

    try {
      console.log('Attempting hybrid registration...');
      
      const user = await registerUser(
        name || username || "User", 
        email, 
        password,
        username  // Pass the actual username from the form
      );

      // Update authentication state manager
      Auth.setAuthenticated(true, user.id);

      // Notify ThemeContext that user is authenticated
      const authEvent = new CustomEvent('user-authenticated', { 
        detail: { userId: user.id } 
      });
      window.dispatchEvent(authEvent);

      onLogin(user);

      // Show connection status
      const connectionStatus = navigator.onLine ? 'online' : 'offline';
      console.log(`Registration successful (${connectionStatus}):`, user.email);

      // Show welcome popup with appropriate message
      const mode = navigator.onLine ? 'online' : 'offline';
      setWelcomeMessage(
        `Welcome! Your account has been created ${mode}. ${
          !navigator.onLine ? 'It will sync to the cloud when you connect to the internet.' : ''
        }`
      );
      setShowWelcomePopup(true);

    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Handle username conflict
      if (error.type === 'username_conflict') {
        setError(error.message);
      } else if (error.message.includes('409') || error.message.includes('already exists')) {
        setError(
          "An account with this email already exists. Please try logging in or use a different email."
        );
      } else {
        setError(
          error.message || 
          "Registration failed. Please check your information and try again."
        );
      }
    }

    setLoading(false);
  };

  // Handle welcome popup completion and proceed to profile setup
  const handleWelcomeClose = () => {
    setShowWelcomePopup(false);

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    onLogin(userData);

    navigate("/profile", { state: { showSetup: true } });
  };

  // Handle username conflict resolution
  const handleConflictResolved = () => {
    setShowUsernameConflict(false);
    setConflictError('');
    setConflictUsername('');
    
    // Get updated user data and proceed to app
    const userData = getCurrentUser();
    if (userData) {
      // Now authenticate the user properly
      Auth.setAuthenticated(true, userData.id);
      
      // Notify ThemeContext that user is authenticated
      const authEvent = new CustomEvent('user-authenticated', { 
        detail: { userId: userData.id } 
      });
      window.dispatchEvent(authEvent);
      
      onLogin(userData);
      navigate("/", { state: { showGreeting: true } });
    }
  };

  const handleConflictClosed = () => {
    setShowUsernameConflict(false);
    setConflictError('');
    setConflictUsername('');
    
    // User chose to close without resolving - clear any session data and redirect back to login
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate("/login");
  };

  // Video loading event handlers
  const handleVideoLoad = () => {
    setVideoLoaded(true);
    console.log(`Video loaded for ${currentTheme}`);
  };

  const handleVideoError = () => {
    setVideoLoaded(false);
    console.log(`Video failed for ${currentTheme}, using fallback`);
  };

  // Auto-tilt animation trigger after video sequence
  useEffect(() => {
    const tiltTimer = setTimeout(() => {
      setAutoTilt(true);
      console.log("Video ended - triggering auto-tilt");
    }, 5000);

    return () => clearTimeout(tiltTimer);
  }, [currentTheme]);

  return (
    <div className={`login-bg ${videoLoaded ? "has-video" : ""}`}>
      {/* Connection Status - positioned relative to the main container */}
      <div className="login-connection-status">
        <ConnectionStatus className="connection-indicator" compact={true} />
      </div>
      
      {themeVideos[currentTheme] && (
        <video
          className="login-bg-video"
          autoPlay
          muted
          playsInline
          onLoadedData={handleVideoLoad}
          onError={handleVideoError}
          key={currentTheme}
        >
          <source src={themeVideos[currentTheme]} type="video/mp4" />
        </video>
      )}
      <div className="blob"></div>
      <div
        className={`login-card animate-fade-in ${autoTilt ? "auto-tilt" : ""}`}
      >
        <div className="login-header">
          <img src={moodIcons[mood]} alt="Logo" className="logo-img" />
          <h1 className="login-title">Wingman</h1>
          <p className="login-subtitle">
            Your advanced digital companion with AI integration
          </p>
        </div>

        {step === "login" ? (
          <form onSubmit={handleLogin} className="login-form">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
            />

            <div className="password-field">
              <input
                type="password"
                placeholder="Password (4-6 chars)"
                value={password}
                onChange={handlePasswordChange}
                required
                className="login-input"
                maxLength={6}
              />
              <span className="password-count">{password.length}/6</span>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="login-action-btn"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="login-form">
            <input
              type="text"
              placeholder="Full Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="login-input"
            />

            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="login-input"
            />

            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />

            <div className="password-field">
              <input
                type="password"
                placeholder="Password (4-6 chars)"
                value={password}
                onChange={handlePasswordChange}
                required
                className="login-input"
                maxLength={6}
              />
              <span className="password-count">{password.length}/6</span>
            </div>

            {error && <div className="login-error">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="login-action-btn"
            >
              {loading ? "Creating Account..." : "Create Account"}
            </button>
          </form>
        )}

        <div className="login-switch">
          <p className="login-switch-text">
            {step === "login"
              ? "Don't have an account?"
              : "Already have an account?"}
          </p>
          <button
            type="button"
            onClick={() => setStep(step === "login" ? "register" : "login")}
            className="text-accent-primary"
          >
            {step === "login" ? "Create Account" : "Sign In"}
          </button>
        </div>

        <div className="login-theme-indicator">
          <span>Theme:</span>
          <span className="theme-name">{currentTheme}</span>
        </div>
      </div>

      {showWelcomePopup && (
        <WelcomePopup
          message={welcomeMessage}
          onClose={handleWelcomeClose}
          icon="🎉"
          type="registration"
          username={name || username}
        />
      )}

      <UsernameConflictModal
        isOpen={showUsernameConflict}
        currentUsername={conflictUsername}
        errorMessage={conflictError}
        onSuccess={handleConflictResolved}
        onClose={handleConflictClosed}
      />
    </div>
  );
};

export default Login;
