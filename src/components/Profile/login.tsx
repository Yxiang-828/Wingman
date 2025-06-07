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
  const [autoTilt, setAutoTilt] = useState(false); // Add this state for auto-tilt
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const navigate = useNavigate();

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

  // ✅ APPLY THEME: Read from localStorage and apply to body
  useEffect(() => {
    const loadSavedTheme = () => {
      try {
        const savedSettings = localStorage.getItem("userSettings");
        if (savedSettings) {
          const settings = JSON.parse(savedSettings);
          if (settings.theme) {
            console.log(`🎨 Login: Applying saved theme: ${settings.theme}`);
            setCurrentTheme(settings.theme);

            // Apply theme class to body (matching ThemeContext behavior)
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
    // Also try after a short delay in case localStorage is still loading
    setTimeout(loadSavedTheme, 100);
  }, []);
  // ADD: Video paths
  const themeVideos: Record<string, string> = {
    dark: darkVideo,
    light: lightVideo,
    yandere: yandereVideo,
    kuudere: kuudereVideo,
    tsundere: tsundereVideo,
    dandere: dandereVideo,
  };
  // Password change handler with length validation
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value;

    // Limit password to max 6 characters
    if (newPassword.length <= 6) {
      setPassword(newPassword);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Try up to 3 times with increasing delays
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const userData = {
          username: username,
          password: password,
        };

        // Use absolute URL for all fetch calls
        const apiUrl = "http://localhost:8080/api/v1/user/login";
        console.log(`Login attempt ${attempt + 1} to: ${apiUrl}`);

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
          // Add timeout
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

        // Store the user in localStorage
        localStorage.setItem("user", JSON.stringify(result));

        // Update Auth state manager explicitly
        Auth.setAuthenticated(true, result.id);

        // Call the onLogin callback
        onLogin(result);

        // Navigate to the dashboard
        navigate("/", { state: { showGreeting: true } });
        return; // Exit the function on success
      } catch (err: any) {
        console.error(`Login attempt ${attempt + 1} failed:`, err);

        // Only set error and stop trying on final attempt
        if (attempt === 2) {
          setError(
            err.message ||
              "Connection to server failed. Please restart the application."
          );
        } else {
          // Wait before retrying (1s, 3s)
          await new Promise((r) => setTimeout(r, attempt * 2000 + 1000));
        }
      }
    }

    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Health check before registration
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

      // Store user data
      localStorage.setItem("user", JSON.stringify(result));

      // Show enhanced welcome popup with app introduction
      const displayName = name || username || "New User";
      setWelcomeMessage(
        `Registration successful! 🎉\n\nYour Wingman account is ready. Let's explore all the amazing features together!`
      );
      setShowWelcomePopup(true);
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Handle welcome popup close
  const handleWelcomeClose = () => {
    setShowWelcomePopup(false);

    // Now proceed with login flow
    const userData = JSON.parse(localStorage.getItem("user") || "{}");
    onLogin(userData);

    // Navigate to profile setup
    navigate("/profile", { state: { showSetup: true } });
  };

  // Add handlers
  const handleVideoLoad = () => {
    setVideoLoaded(true);
    console.log(`🎬 Video loaded for ${currentTheme}`);
  };

  const handleVideoError = () => {
    setVideoLoaded(false);
    console.log(`🎬 Video failed for ${currentTheme}, using PNG fallback`);
  };

  // Add this useEffect to trigger tilt after 5 seconds
  useEffect(() => {
    const tiltTimer = setTimeout(() => {
      setAutoTilt(true);
      console.log("🎬 Video ended - triggering auto-tilt");
    }, 5000); // 5 seconds

    return () => clearTimeout(tiltTimer);
  }, [currentTheme]); // Reset timer when theme changes

  // In your form rendering section, update the structure:

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
          // ✅ COMPLETE REGISTRATION FORM - This was truncated
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

      {/* ✅ NEW: Welcome Popup */}
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
