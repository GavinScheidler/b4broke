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
  addDoc, setDoc,
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
      const userDocRef = doc(db, "Users", userDoc.id);

      // 3. Sign in with Firebase Auth using the stored email
      await signInWithEmailAndPassword(auth, userData.email, password);

      // 4. Handle daily login bonus
      const now = new Date();
      let updatedBalance = userData.balance;

      if (!userData.lastLogin || (now - userData.lastLogin.toDate()) > 24 * 60 * 60 * 1000) {
        // No last login recorded or more than 24 hours have passed
        updatedBalance += 100;
        await updateDoc(userDocRef, {
          balance: updatedBalance,
          lastLogin: now,
        });
        alert("Daily login bonus! +$100 credited.");
      } else {
        // Update only the lastLogin field
        await updateDoc(userDocRef, {
          lastLogin: now,
        });
      }

      // 5. Navigate to trade page
      navigate('/trade', { 
        state: { 
          username: userData.username,
          email: userData.email,
          balance: updatedBalance,
          stocksInvested: userData.stocksInvested || [],
          userId: userDoc.id,
          displayable: userData.displayable || false
        } 
      });
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


const TradePage = () => {
  const API_KEY = "cuigmfpr01qtqfmiku40cuigmfpr01qtqfmiku4g";
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

  const [error, setError] = useState("");

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
      // 1. Search for the stock symbol
      const searchResponse = await fetch(
        `https://finnhub.io/api/v1/search?q=${stockSymbol.toUpperCase()}&token=${API_KEY}`
      );
      const searchData = await searchResponse.json();
  
      if (!searchData.result?.length) {
        setErrorMessage("No matching stock found.");
        setLoading(false);
        return;
      }
  
      const bestMatch = searchData.result[0]; // pick the best match
      const symbol = bestMatch.symbol;
      const name = bestMatch.description;
  
      // 2. Fetch the quote (price) for that symbol
      const quoteResponse = await fetch(
        `${STOCK_API_URL}${symbol}&token=${API_KEY}`
      );
      const quoteData = await quoteResponse.json();
  
      if (!quoteData.c) {
        setErrorMessage("Price data unavailable.");
        setLoading(false);
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
        updatedStocks[stockIndex].totalSpent += totalCost;
      } else {
        updatedStocks.push({
          symbol: fetchedStockSymbol,
          shares: quantity,
          totalSpent: totalCost
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

  if (!userData) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <button style={styles.navButton} onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button style={styles.navButton} onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button style={styles.navButton} onClick={handleLogout}>Logout</button>
      </nav>

      <div style={styles.mainContent}>
        {/* Trade Section */}
        <div style={styles.tradeSection}>
          <h2>Trade Stocks</h2>
          {errorMessage && <p style={styles.error}>{errorMessage}</p>}

          <div style={styles.searchContainer}>
            <input
              type="text"
              placeholder="Enter stock symbol (e.g., AMZN)"
              value={stockSymbol}
              onChange={(e) => setStockSymbol(e.target.value.toUpperCase())}
              disabled={loading}
              style={styles.input}
            />
            <button onClick={searchStock} disabled={loading} style={styles.button}>
              {loading ? "Searching..." : "Search"}
            </button>
          </div>

          {stockPrice !== null && (
            <div style={styles.stockInfo}>
              <h3>{fetchedStockSymbol} {companyName && `- ${companyName}`}</h3>
              <p>Price: ${stockPrice.toFixed(2)}</p>
              <p>Shares Owned: {stockHoldings}</p>
              
              <div style={styles.tradeActions}>
                <input 
                  type="number" 
                  min="1" 
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  disabled={loading}
                  style={styles.input}
                />
                <button onClick={buyStock} disabled={loading} style={styles.button}>
                  {loading ? "Processing..." : "Buy"}
                </button>
                <button 
                  onClick={sellStock} 
                  disabled={loading || stockHoldings === 0}
                  style={styles.button}
                >
                  Sell
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Section */}
        <div style={styles.portfolioSection}>
          <h2>Portfolio</h2>
          {error && <p style={styles.error}>{error}</p>}

          <div style={styles.accountInfo}>
            <h3>Account Details</h3>
            <p><strong>Username:</strong> {userData.username}</p>
            <p><strong>Email:</strong> {userData.email}</p>
            <p><strong>Account Balance:</strong> ${userData.balance.toFixed(2)}</p>
          </div>

          <div style={styles.leaderboardVisibility}>
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

          <div style={styles.stockHoldings}>
            <h3>Stock Holdings</h3>
            {userData.stocksInvested?.length > 0 ? (
              <ul>
                {userData.stocksInvested.map((stock, index) => (
                  <li key={index}>
                    {stock.symbol}: {stock.shares} shares (Spent: ${stock.totalSpent?.toFixed(2) || "0.00"})
                  </li>
                ))}
              </ul>
            ) : (
              <p>You don't own any stocks yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Hardcoded CSS
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    padding: "10px",
  },
  nav: {
    marginBottom: "20px",
  },
  navButton: {
    marginRight: "10px",
    padding: "10px 15px",
    fontSize: "16px",
    cursor: "pointer",
  },
  mainContent: {
    display: "flex",
    gap: "30px",
  },
  tradeSection: {
    flex: 1,
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
  },
  portfolioSection: {
    flex: 1,
    padding: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
  },
  searchContainer: {
    marginBottom: "10px",
  },
  stockInfo: {
    marginTop: "10px",
  },
  input: {
    marginRight: "10px",
    padding: "8px",
    fontSize: "16px",
  },
  button: {
    padding: "8px 15px",
    fontSize: "16px",
    cursor: "pointer",
  },
  tradeActions: {
    marginTop: "10px",
  },
  accountInfo: {
    marginBottom: "20px",
  },
  leaderboardVisibility: {
    marginBottom: "20px",
  },
  stockHoldings: {
    marginBottom: "20px",
  },
  error: {
    color: "red",
  },
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
      // Check if username already exists
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("username", "==", username));
      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        setError("Username already exists.");
        setLoading(false);
        return;
      }

      // Create user with Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Save additional user data to Firestore, linked by UID
      await setDoc(doc(db, "Users", user.uid), {
        email: user.email,
        username,
        balance: 1000, 
        stocksInvested: [],
        displayable: true,
        createdAt: new Date(),
        lastLogin: new Date(),
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

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [limitAmount, setLimitAmount] = useState(10);
  const location = useLocation();
  const navigate = useNavigate();
  const userData = location.state;

  useEffect(() => {
    if (!userData?.username) {
      navigate("/login");
      return;
    }
    fetchLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData, limitAmount]); 

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const usersRef = collection(db, "Users");
      const q = query(
        usersRef,
        where("displayable", "==", true),
        orderBy("balance", "desc"),
        limit(limitAmount)
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

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  const handleLimitChange = (e) => {
    setLimitAmount(parseInt(e.target.value));
  };

  const handleUpdateClick = () => {
    fetchLeaderboard();
  };

  return (
    <div className="container">
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={handleLogout}>Logout</button>
      </nav>

      <h1>Leaderboard</h1>

      {/* Limit selection controls */}
      <div className="limit-controls" style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <label>
            <input
              type="radio"
              name="limit"
              value="10"
              checked={limitAmount === 10}
              onChange={handleLimitChange}
            />
            10
          </label>
          <label>
            <input
              type="radio"
              name="limit"
              value="25"
              checked={limitAmount === 25}
              onChange={handleLimitChange}
            />
            25
          </label>
          <label>
            <input
              type="radio"
              name="limit"
              value="50"
              checked={limitAmount === 50}
              onChange={handleLimitChange}
            />
            50
          </label>
        </div>
        <button onClick={handleUpdateClick}>Update</button>
      </div>

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
          {/* If fewer users than limitAmount, show the special row */}
          {topUsers.length < limitAmount && !loading && (
            <tr>
              <td colSpan="3" style={{ textAlign: "center", fontStyle: "italic" }}>
                ----- all users shown -----
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default App;