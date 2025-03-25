import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, useNavigate } from "react-router-dom";


const LoginPage = () => {
  const navigate = useNavigate();
  const handleLogin = () => navigate("/trade");
  return (
    <div className="containerL">
      <h2>Login</h2>
      <input type="text" placeholder="Username" required />
      <input type="password" placeholder="Password" required />
      <button onClick={handleLogin}>Login</button>
      <div className="links">
        <Link to="/forgot-password">Forgot Password?</Link>
        <Link to="/create-account">Create an Account</Link>
      </div>
    </div>
  );
}

const CreateAccountPage = () => {
  const navigate = useNavigate();
  return (
    <div className="container">
      <button onClick={() => navigate("/login")}>Back</button>
      <h2>Create Account</h2>
      <input type="email" placeholder="Email" required />
      <input type="text" placeholder="Username" required />
      <input type="password" placeholder="Password" required />
      <input type="password" placeholder="Confirm Password" required />
      <button>Sign Up</button>
    </div>
  );
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  return (
    <div className="container">
      <button onClick={() => navigate("/login")}>Back</button>
      <h2>Forgot Password</h2>
      <p>Enter your email to reset your password.</p>
      <input type="email" placeholder="Email" required />
      <button>Reset Password</button>
    </div>
  );
}

const TradePage = () => {
  const API_KEY = "cuigmfpr01qtqfmiku40cuigmfpr01qtqfmiku4g";
  const STOCK_API_URL = "https://finnhub.io/api/v1/quote?symbol=";

  const [stockSymbol, setStockSymbol] = useState("");
  const [stockPrice, setStockPrice] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [stockHoldings, setStockHoldings] = useState(0);
  
  const searchStock = async () => {
    if (!stockSymbol.trim()) {
      setErrorMessage("Please enter a stock symbol.");
      setStockPrice(null);
      return;
    }

    try {
      const response = await fetch(`${STOCK_API_URL}${stockSymbol.toUpperCase()}&token=${API_KEY}`);
      const data = await response.json();

      if (data.c) {
        setStockPrice(data.c);
        setStockHoldings(10); // Placeholder, update based on user data
        setErrorMessage("");
      } else {
        setErrorMessage("Invalid stock symbol or data unavailable.");
        setStockPrice(null);
      }
    } catch (error) {
      setErrorMessage("Error fetching stock data. Try again later.");
      console.error("Stock fetch error:", error);
    }
  }
  return (
    <div className="container">
      <nav>
        <Link to="/trade">Trade</Link>
        <Link to="/portfolio">Portfolio</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/login">Logout</Link>
      </nav>
      <h2>Trade Stocks</h2>
      <input
        type="text"
        placeholder="Enter stock symbol (e.g., AMZN)"
        value={stockSymbol}
        onChange={(e) => setStockSymbol(e.target.value)}
      />
      <button className="trade-btn" onClick={searchStock}>Search</button>

      {errorMessage && <p className="error-message">{errorMessage}</p>}

      {stockPrice !== null && (
        <div className="stock-info">
          <p>Symbol: {stockSymbol.toUpperCase()}</p>
          <p>Current Price: ${stockPrice.toFixed(2)}</p>
          <p>Shares Owned: {stockHoldings}</p>
        </div>
      )}
    </div>
  );
}

const Leaderboard = () => {
  return (
    <div className="min-h-screen bg-gray-100 text-center">
      {/* Navbar */}
      <nav>
        <Link to="/trade">Trade</Link>
        <Link to="/portfolio">Portfolio</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/login">Logout</Link>
      </nav>

      {/* Leaderboard Section */}
      <div className="mt-10 mx-auto bg-white p-6 rounded-lg shadow-md inline-block">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <div className="mt-4">
          <button className="px-4 py-2 bg-green-500 text-white rounded-md mx-2">
            Networth
          </button>
          <button className="px-4 py-2 bg-blue-500 text-white rounded-md mx-2">
            Profit
          </button>
          <button className="px-4 py-2 bg-red-500 text-white rounded-md mx-2">
            Loss
          </button>
        </div>
      </div>
    </div>
  );
}

const Portfolio = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState({
    username: "JohnDoe",
    email: "johndoe@example.com",
    password: "",
    confirmPassword: "",
  });

  const toggleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleChange = (e) => {
    setUserData({ ...userData, [e.target.name]: e.target.value });
  };

  const confirmChanges = () => {
    if (userData.password !== userData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }
    toggleEdit();
  };

  return (
    <div className="min-h-screen bg-gray-100 text-center">
      {/* Navbar */}
      <nav>
        <Link to="/trade">Trade</Link>
        <Link to="/portfolio">Portfolio</Link>
        <Link to="/leaderboard">Leaderboard</Link>
        <Link to="/login">Logout</Link>
      </nav>

      {/* Portfolio Section */}
      <div className="mt-10 mx-auto bg-white p-6 rounded-lg shadow-md inline-block">
        <h2 className="text-2xl font-bold">User Information</h2>
        {!isEditing ? (
          <div>
            <p className="mt-4">
              <strong>Username:</strong> {userData.username}
            </p>
            <p className="mt-2">
              <strong>Email:</strong> {userData.email}
            </p>
            <button
              onClick={toggleEdit}
              className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md"
            >
              Update Information
            </button>
          </div>
        ) : (
          <div>
            <div className="mt-4">
              <label className="block">Username:</label>
              <input
                type="text"
                name="username"
                value={userData.username}
                onChange={handleChange}
                className="p-2 border rounded-md"
              />
            </div>
            <div className="mt-2">
              <label className="block">Email:</label>
              <input
                type="email"
                name="email"
                value={userData.email}
                onChange={handleChange}
                className="p-2 border rounded-md"
              />
            </div>
            <div className="mt-2">
              <label className="block">Change Password:</label>
              <input
                type="password"
                name="password"
                value={userData.password}
                onChange={handleChange}
                className="p-2 border rounded-md"
              />
            </div>
            <div className="mt-2">
              <label className="block">Confirm Password:</label>
              <input
                type="password"
                name="confirmPassword"
                value={userData.confirmPassword}
                onChange={handleChange}
                className="p-2 border rounded-md"
              />
            </div>
            <div className="mt-4">
              <button
                onClick={confirmChanges}
                className="px-4 py-2 bg-blue-500 text-white rounded-md mx-2"
              >
                Confirm Changes
              </button>
              <button
                onClick={toggleEdit}
                className="px-4 py-2 bg-red-500 text-white rounded-md mx-2"
              >
                Cancel Changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/create-account" element={<CreateAccountPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/trade" element={<TradePage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/login.html" element={<LoginPage />} />
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
