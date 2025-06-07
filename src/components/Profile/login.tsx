import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import { Auth } from "../../utils/AuthStateManager";
import "./login.css";

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
        name: name || undefined, // optional
        email,
        password,
        username, // required
      };
      // Use absolute URL for all fetch calls
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

      // Call the onLogin callback
      onLogin(result);

      // Navigate to profile setup
      navigate("/profile", { state: { showSetup: true } });
    } catch (err: any) {
      console.error("Registration error:", err);
      setError("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <div className="blob"></div>
      <div className="login-card animate-fade-in">
        <div className="mb-6 flex flex-col items-center">
          <img src={moodIcons[mood]} alt="Logo" className="logo-img" />
          <h1 className="text-3xl font-bold mb-1">Wingman</h1>
          <p className="text-accent-primary font-medium mb-2">
            {step === "login" ? "Welcome back, Leader!" : "Join the Crew!"}
          </p>
        </div>
        {step === "login" ? (
          <form onSubmit={handleLogin} className="w-72 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition"
            />
            <div className="password-field">
              <input
                type="password"
                placeholder="Password (6 chars max)"
                value={password}
                onChange={handlePasswordChange}
                required
                maxLength={6}
                className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition w-full"
              />
              <div className="password-count">{password.length}/6</div>
            </div>
            <button
              type="submit"
              className="login-action-btn bg-accent-primary hover:bg-accent-secondary text-white font-bold py-2 rounded transition-all"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            <button
              type="button"
              className="login-action-btn text-accent-primary hover:underline mt-2"
              onClick={() => setStep("register")}
            >
              New user? Register
            </button>
            {error && (
              <div className="error text-red-400 text-center">{error}</div>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="w-72 flex flex-col gap-4">
            <input
              type="text"
              placeholder="Your Name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition"
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition"
            />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition"
            />
            <div className="password-field">
              <input
                type="password"
                placeholder="Password (6 chars max)"
                value={password}
                onChange={handlePasswordChange}
                required
                maxLength={6}
                className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition w-full"
              />
              <div className="password-count">{password.length}/6</div>
            </div>
            <button
              type="submit"
              className="login-action-btn bg-accent-primary hover:bg-accent-secondary text-white font-bold py-2 rounded transition-all"
              disabled={loading}
            >
              {loading ? "Registering..." : "Register"}
            </button>
            <button
              type="button"
              className="login-action-btn text-accent-primary hover:underline mt-2"
              onClick={() => setStep("login")}
            >
              Back to Login
            </button>
            {error && (
              <div className="error text-red-400 text-center">{error}</div>
            )}
          </form>
        )}

        {/* ✅ THEME INDICATOR: Show current theme */}
        <div
          style={{
            marginTop: "1rem",
            padding: "0.5rem",
            textAlign: "center",
            fontSize: "0.8rem",
            color: "rgba(255,255,255,0.5)",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          Theme:{" "}
          <span
            style={{
              textTransform: "capitalize",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            {currentTheme}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Login;
