import React, { useState, useEffect } from "react";
import { loginUser, registerUser } from "../../api/user";
import { useNavigate } from "react-router-dom";
import productiveIcon from "../../assets/productive.png";
import moodyIcon from "../../assets/moody.png";
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // setLoading(true);
    // setError(null);
    // try {
    //   const user = await loginUser(password);
    //   onLogin(user);
    //   navigate("/", { state: { showGreeting: true } });
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setLoading(false);
    // }
    // BYPASS AUTH: Let any user in
    onLogin({ name: "Test User", email: "test@example.com" });
    navigate("/", { state: { showGreeting: true } });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    // setLoading(true);
    // setError(null);
    // if (!email.includes("@")) {
    //   setError("Please enter a valid email address.");
    //   setLoading(false);
    //   return;
    // }
    // try {
    //   const user = await registerUser(name, password, email);
    //   onLogin(user);
    //   navigate("/profile", { state: { showSetup: true } });
    // } catch (err: any) {
    //   setError(err.message);
    // } finally {
    //   setLoading(false);
    // }
    // BYPASS AUTH: Let any user in
    onLogin({ name, email });
    navigate("/profile", { state: { showSetup: true } });
  };

  return (
    <div className="login-bg">
      <div className="blob"></div>
      <div className="login-card animate-fade-in">
        <div className="mb-6 flex flex-col items-center">
          <img
            src={moodIcons[mood]}
            alt="Logo"
            className="logo-img"
          />
          <h1 className="text-3xl font-bold mb-1">Wingman</h1>
          <p className="text-accent-primary font-medium mb-2">
            {step === "login" ? "Welcome back, Leader!" : "Join the Crew!"}
          </p>
        </div>
        {step === "login" ? (
          <form onSubmit={handleLogin} className="w-72 flex flex-col gap-4">
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
            {error && <div className="error text-red-400 text-center">{error}</div>}
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
            {error && <div className="error text-red-400 text-center">{error}</div>}
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;