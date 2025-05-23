import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import { api } from "../../api/apiClient";
import "./Login.css";

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
  const navigate = useNavigate();

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") setMood(mood);
      });
    }
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

    try {
      // Real Supabase login
      const userData = {
        username: username,
        password: password,
      };

      const result = await api.post("/v1/user/login", userData);

      if (!result || !result.id) {
        throw new Error("Invalid login response");
      }

      // Store the user in localStorage
      localStorage.setItem("user", JSON.stringify(result));

      // Call the onLogin callback
      onLogin(result);

      // Navigate to the dashboard
      navigate("/", { state: { showGreeting: true } });
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Invalid username or password");
    } finally {
      setLoading(false);
    }
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
        name,
        email,
        password,
        username: username || email.split("@")[0],
      };

      const result = await api.post("/v1/user/register", userData);

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
              placeholder="Your Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
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
              placeholder="Username (optional)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
      </div>
    </div>
  );
};

export default Login;
