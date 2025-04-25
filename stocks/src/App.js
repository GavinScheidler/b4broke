import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, useNavigate, useLocation } from "react-router-dom";
import { 
  auth, 
  db, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc, 
  doc, 
  updateDoc,
  limit,
  orderBy, 
  sendPasswordResetEmail,
  signOut
} from './firebase';

// Main App Component
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
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

// Login Page Component
const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username || !password) {
      setError('Please fill in both fields.');
      setLoading(false);
      return;
    }

    try {
      // 1. First find the user document by username
      const usersRef = collection(db, 'Users');
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid username or password.');
        setLoading(false);
        return;
      }

      // 2. Get the user document data
      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();

      // 3. Sign in with Firebase Auth using the stored email
      try {
        console.log("Trying to log in with email:", userData.email);
        console.log("Login attempt:", userData.email, password);
        await signInWithEmailAndPassword(auth, userData.email, password);
        
        // 4. On successful login, navigate with user data
        navigate('/trade', { 
          state: { 
            username: userData.username,
            email: userData.email,
            balance: userData.balance,
            stocksInvested: userData.stocksInvested || [],
            userId: userDoc.id,
            displayable: userData.displayable || false
          } 
        });
      } catch (authError) {
        console.error("Authentication error:", authError);
        setError('Invalid username or password.');
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="containerL">
      <h2>Login</h2>
      {error && <p className="error">{error}</p>}
      
      <form onSubmit={handleLogin}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Loading..." : "Login"}
        </button>
      </form>
      
      <div className="links">
        <Link to="/forgot-password">Forgot Password?</Link>
        <Link to="/create-account">Create an Account</Link>
      </div>
    </div>
  );
};

// Trade Page Component
const TradePage = () => {
  const API_KEY = process.env.REACT_APP_FINNHUB_KEY;
  const STOCK_API_URL = "https://finnhub.io/api/v1/quote?symbol=";
  
  const [companyName, setCompanyName] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [fetchedStockSymbol, setFetchedStockSymbol] = useState("");
  const [stockSymbol, setStockSymbol] = useState("");
  const [stockPrice, setStockPrice] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [stockHoldings, setStockHoldings] = useState(0);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.username) {
      navigate("/login");
      return;
    }
    setUserData(location.state);
  }, [location.state, navigate]);

  const searchStock = async () => {
    if (!stockSymbol.trim()) {
      setErrorMessage("Please enter a stock symbol or company name.");
      return;
    }
    
    setLoading(true);
    setErrorMessage("");

    try {
      const searchResponse = await fetch(
        `https://finnhub.io/api/v1/search?q=${stockSymbol}&token=${API_KEY}`
      );
      const searchData = await searchResponse.json();

      if (!searchData.result?.length) {
        setErrorMessage("No matching stock found.");
        return;
      }

      const bestMatch = searchData.result[0];
      const symbol = bestMatch.symbol;
      const name = bestMatch.description;

      const quoteResponse = await fetch(
        `${STOCK_API_URL}${symbol}&token=${API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      if (!quoteData.c) {
        setErrorMessage("Price data unavailable.");
        return;
      }

      setFetchedStockSymbol(symbol);
      setStockPrice(quoteData.c);
      setCompanyName(name);

      const ownedStock = userData?.stocksInvested?.find(
        stock => stock.symbol === symbol
      );
      setStockHoldings(ownedStock?.shares || 0);
    } catch (error) {
      setErrorMessage("Error fetching stock data. Try again later.");
      console.error("Stock fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  const buyStock = async () => {
    const quantity = parseInt(stockQuantity);
    
    if (!validateTrade(quantity)) return;
    
    setLoading(true);
    setErrorMessage("");

    try {
      const totalCost = stockPrice * quantity;
      const updatedStocks = [...(userData.stocksInvested || [])];
      const stockIndex = updatedStocks.findIndex(s => s.symbol === fetchedStockSymbol);

      if (stockIndex !== -1) {
        updatedStocks[stockIndex].shares += quantity;
      } else {
        updatedStocks.push({
          symbol: fetchedStockSymbol,
          shares: quantity
        });
      }

      await updateUserData({
        balance: userData.balance - totalCost,
        stocksInvested: updatedStocks
      });

      setStockHoldings(prev => prev + quantity);
      alert("Stock purchased successfully!");
    } catch (err) {
      setErrorMessage("Error purchasing stock. Please try again.");
      console.error("Buy error:", err);
    } finally {
      setLoading(false);
    }
  };

  const sellStock = async () => {
    const quantity = parseInt(stockQuantity);
    
    if (!validateTrade(quantity, true)) return;
    
    setLoading(true);
    setErrorMessage("");

    try {
      const updatedStocks = [...userData.stocksInvested];
      const stockIndex = updatedStocks.findIndex(s => s.symbol === fetchedStockSymbol);
      const saleValue = stockPrice * quantity;

      if (updatedStocks[stockIndex].shares === quantity) {
        updatedStocks.splice(stockIndex, 1);
      } else {
        updatedStocks[stockIndex].shares -= quantity;
      }

      await updateUserData({
        balance: userData.balance + saleValue,
        stocksInvested: updatedStocks
      });

      setStockHoldings(prev => prev - quantity);
      alert("Stock sold successfully!");
    } catch (err) {
      setErrorMessage("Error selling stock. Please try again.");
      console.error("Sell error:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateTrade = (quantity, isSell = false) => {
    if (isNaN(quantity)) {
      setErrorMessage("Please enter a valid quantity.");
      return false;
    }

    if (quantity <= 0) {
      setErrorMessage("Quantity must be greater than 0.");
      return false;
    }

    if (!userData || !stockPrice || !fetchedStockSymbol) {
      setErrorMessage("Stock data not loaded. Please search again.");
      return false;
    }

    if (isSell) {
      const ownedStock = userData.stocksInvested?.find(
        s => s.symbol === fetchedStockSymbol
      );
      
      if (!ownedStock || ownedStock.shares < quantity) {
        setErrorMessage("You don't own enough shares to sell.");
        return false;
      }
    } else {
      if (userData.balance < stockPrice * quantity) {
        setErrorMessage("Insufficient funds for this purchase.");
        return false;
      }
    }

    return true;
  };

  const updateUserData = async (updates) => {
    await updateDoc(doc(db, "Users", userData.userId), updates);
    setUserData(prev => ({ ...prev, ...updates }));
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="container">
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/portfolio", { state: userData })}>Portfolio</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <h2>Trade Stocks</h2>
      {errorMessage && <p className="error">{errorMessage}</p>}

      <div className="search-container">
        <input
          type="text"
          placeholder="Enter stock symbol (e.g., AMZN)"
          value={stockSymbol}
          onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
          disabled={loading}
        />
        <button onClick={searchStock} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </button>
      </div>

      {stockPrice !== null && (
        <div className="stock-info">
          <h3>{fetchedStockSymbol} {companyName && `- ${companyName}`}</h3>
          <p>Price: ${stockPrice.toFixed(2)}</p>
          <p>Shares Owned: {stockHoldings}</p>
          
          <div className="trade-actions">
            <input 
              type="number" 
              min="1" 
              value={stockQuantity}
              onChange={(e) => setStockQuantity(e.target.value)}
              disabled={loading}
            />
            <button onClick={buyStock} disabled={loading}>
              {loading ? "Processing..." : "Buy"}
            </button>
            <button 
              onClick={sellStock} 
              disabled={loading || stockHoldings === 0}
            >
              Sell
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Create Account Page Component
const CreateAccountPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !username || !password || !confirmPassword) {
      setError('All fields are required.');
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("username", "==", username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setError("Username already exists.");
        return;
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        email, 
        password
      );

      await addDoc(collection(db, "Users"), {
        email,
        username,
        balance: 1000, // Changed to $1000 starting balance
        stocksInvested: [],
        displayable: true,
        createdAt: new Date()
      });

      navigate("/login");
      alert("Account created successfully!");
    } catch (err) {
      console.error("Signup error:", err);
      
      switch (err.code) {
        case "auth/email-already-in-use":
          setError("Email already in use.");
          break;
        case "auth/invalid-email":
          setError("Invalid email format.");
          break;
        case "auth/weak-password":
          setError("Password should be at least 6 characters.");
          break;
        default:
          setError("Failed to create account. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate('/login')}>Back to Login</button>
      <h2>Create Account</h2>
      {error && <p className="error">{error}</p>}

      <form onSubmit={handleSignUp}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Creating..." : "Sign Up"}
        </button>
      </form>
    </div>
  );
};

// Forgot Password Page Component
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter your email.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("email", "==", email));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("No account found with this email.");
        return;
      }

      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (err) {
      console.error("Password reset error:", err);
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate("/login")}>Back to Login</button>
      <h2>Forgot Password</h2>
      
      <p>Enter your email to reset your password:</p>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={loading}
      />
      
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
      
      <button onClick={handleResetPassword} disabled={loading}>
        {loading ? "Sending..." : "Reset Password"}
      </button>
    </div>
  );
};

// Leaderboard Component
const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const userData = location.state;

  useEffect(() => {
    if (!userData?.username) {
      navigate("/login");
      return;
    }

    const fetchLeaderboard = async () => {
      try {
        const usersRef = collection(db, "Users");
        const q = query(
          usersRef, 
          where("displayable", "==", true),
          orderBy("balance", "desc"), 
          limit(10)
        );
        
        const snapshot = await getDocs(q);
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setTopUsers(users);
      } catch (err) {
        console.error("Leaderboard error:", err);
        setError("Failed to load leaderboard.");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [navigate, userData]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="container">
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/portfolio", { state: userData })}>Portfolio</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <h1>Leaderboard</h1>
      {loading && <p>Loading leaderboard...</p>}
      {error && <p className="error">{error}</p>}

      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Username</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          {topUsers.map((user, index) => (
            <tr 
              key={user.id} 
              className={user.username === userData?.username ? "highlight" : ""}
            >
              <td>{index + 1}</td>
              <td>{user.username}</td>
              <td>${user.balance.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Portfolio Component
const Portfolio = () => {
  const [userData, setUserData] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.username) {
      navigate("/login");
      return;
    }
    setUserData(location.state);
  }, [location.state, navigate]);

  const toggleLeaderboardVisibility = async (visible) => {
    try {
      await updateDoc(doc(db, "Users", userData.userId), {
        displayable: visible
      });
      setUserData(prev => ({ ...prev, displayable: visible }));
    } catch (err) {
      console.error("Visibility update error:", err);
      setError("Failed to update leaderboard visibility.");
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  if (!userData) return <div>Loading...</div>;

  return (
    <div className="container">
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/portfolio", { state: userData })}>Portfolio</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <h2>Portfolio</h2>
      {error && <p className="error">{error}</p>}

      <div className="account-info">
        <h3>Account Details</h3>
        <p><strong>Username:</strong> {userData.username}</p>
        <p><strong>Email:</strong> {userData.email}</p>
        <p><strong>Account Balance:</strong> ${userData.balance.toFixed(2)}</p>
      </div>

      <div className="leaderboard-visibility">
        <h3>Leaderboard Visibility</h3>
        <label>
          <input
            type="checkbox"
            checked={userData.displayable || false}
            onChange={(e) => toggleLeaderboardVisibility(e.target.checked)}
          />
          Show my username on leaderboard
        </label>
      </div>

      <div className="stock-holdings">
        <h3>Stock Holdings</h3>
        {userData.stocksInvested?.length > 0 ? (
          <ul>
            {userData.stocksInvested.map((stock, index) => (
              <li key={index}>
                {stock.symbol}: {stock.shares} shares
              </li>
            ))}
          </ul>
        ) : (
          <p>You don't own any stocks yet.</p>
        )}
      </div>
    </div>
  );
};

export default App;