import React, { useState, useEffect } from "react";
import { loginUser, registerUser } from "../../api/user";
import { useNavigate } from "react-router-dom";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
import "./login.css";
import { API_BASE_URL } from "../../config/api";
import { User } from "../../types/user";

const moodIcons: Record<string, string> = {
  productive: productiveIcon,
  moody: moodyIcon,
};

const Login: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [step, setStep] = useState<"login" | "register">("login");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<"productive" | "moody">("productive");
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const navigate = useNavigate();

  useEffect(() => {
    if (window.electronAPI?.onMoodChange) {
      window.electronAPI.onMoodChange((mood: string) => {
        if (mood === "productive" || mood === "moody") setMood(mood);
      });
    }
  }, []);

  useEffect(() => {
    const checkBackendConnection = async () => {
      try {
        // Use the correct URL that matches your API_BASE_URL configuration
        const response = await fetch("http://localhost:8000/health");
        if (response.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("error");
        }
      } catch (error) {
        console.error("Backend connection error:", error);
        setBackendStatus("error");
      }
    };

    checkBackendConnection();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // === DEV BYPASS === (remove in production)
      // If the username is "demo" and password is "123456", log in without API call
      if (username === "demo" && password === "123456") {
        const demoUser = {
          id: "ae2e87ae-ecf5-4c21-a739-bea18996af15",
          username: "demo",
          name: "Demo User",
          email: "demo@example.com",
        };

        // Store the user in localStorage
        localStorage.setItem("user", JSON.stringify(demoUser));

        // Call the onLogin callback with the user object
        onLogin(demoUser);

        // Navigate to the dashboard
        navigate("/", { state: { showGreeting: true } });
        return;
      }

      // Normal API login flow for non-demo users
      // Use correct API_BASE_URL to ensure proper endpoint resolution
      const res = await fetch(`${API_BASE_URL}/user/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) throw new Error("Invalid username or password");
      const user = await res.json();

      // Store the full user object in localStorage
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(user);
      navigate("/", { state: { showGreeting: true } });
    } catch (err: any) {
      setError(err.message);
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
    try {
      const user = await registerUser(name, password, email);

      // Store the full user object in localStorage
      localStorage.setItem("user", JSON.stringify(user));

      onLogin(user);
      navigate("/profile", { state: { showSetup: true } });
    } catch (err: any) {
      setError(err.message);
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
        {backendStatus === "error" && (
          <div className="bg-red-800 text-white p-3 rounded mt-4 text-center">
            <p>Backend connection error!</p>
            <p className="text-sm mt-1">
              Please ensure the backend server is running.
            </p>
            <button
              onClick={() => setBackendStatus("checking")}
              className="mt-2 bg-red-700 hover:bg-red-600 px-2 py-1 rounded text-sm"
            >
              Retry Connection
            </button>
          </div>
        )}
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
            <input
              type="password"
              pattern="\d{6}"
              maxLength={6}
              minLength={6}
              placeholder="6-digit password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition"
            />
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
              type="password"
              pattern="\d{6}"
              maxLength={6}
              minLength={6}
              placeholder="6-digit password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="p-3 rounded bg-gray-900 border border-gray-700 focus:border-accent-primary focus:outline-none transition"
            />
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
