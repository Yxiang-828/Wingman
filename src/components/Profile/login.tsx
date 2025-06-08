// User Authentication Hub - Gateway to your digital realm
// Handles both login and registration with theme-aware background videos
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import productiveIcon from "../../assets/icons/productive.png";
import moodyIcon from "../../assets/icons/moody.png";
import { Auth } from "../../utils/AuthStateManager";
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

  // User authentication with retry logic for network resilience
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Retry mechanism for unreliable network connections
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userData = {
          username: username,
          password: password,
        };

        const apiUrl = "http://localhost:8080/api/v1/user/login";
        console.log(`Login attempt ${attempt + 1} to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
          signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Invalid username or password");
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
        }

        const result = await response.json();

        if (!result || !result.id) {
          throw new Error("Invalid login response");
        }

        // Persist user session data
        localStorage.setItem("user", JSON.stringify(result));

        // Update authentication state manager
        Auth.setAuthenticated(true, result.id);

        onLogin(result);

        // Navigate to dashboard with greeting flag
        navigate("/", { state: { showGreeting: true } });
        return;
      } catch (err: any) {
        console.error(`Login attempt ${attempt + 1} failed:`, err);

        if (attempt === 2) {
          setError(
            err.message ||
              "Connection to server failed. Please restart the application."
          );
        } else {
          await new Promise((r) => setTimeout(r, attempt * 2000 + 1000));
        }
      }
    }

    setLoading(false);
  };

  // New user registration with comprehensive validation
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Backend health check before proceeding
    try {
      const healthCheck = await fetch("http://localhost:8080/health");
      if (!healthCheck.ok) {
        throw new Error("Backend service unavailable");
      }
    } catch (err) {
      setError("Unable to reach the registration service. Please try again later.");
      setLoading(false);
      return;
    }

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

    try {
      const userData = {
        name: name || undefined,
        email,
        password,
        username,
      };

      const apiUrl = "http://localhost:8080/api/v1/user/register";

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        throw new Error("Registration failed");
      }

      const result = await response.json();

      if (!result || !result.id) {
        throw new Error("Invalid registration response");
      }

      localStorage.setItem("user", JSON.stringify(result));

      // Show welcome popup with personalized message
      const displayName = name || username || "New User";
      setWelcomeMessage(
        `Registration successful! Your Wingman account is ready. Let's explore all the amazing features together!`
      );
      setShowWelcomePopup(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Handle welcome popup completion and proceed to profile setup
  const handleWelcomeClose = () => {
    setShowWelcomePopup(false);

    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    onLogin(userData);

    navigate("/profile", { state: { showSetup: true } });
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
    </div>
  );
};

export default Login;
