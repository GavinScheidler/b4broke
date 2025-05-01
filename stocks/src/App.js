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
  setDoc,
  doc, 
  updateDoc,
  limit,
  orderBy, 
  sendPasswordResetEmail,
  signOut,
  updateUserData,
  updatePassword
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
      const usersRef = collection(db, 'Users');
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Invalid username or password.');
        setLoading(false);
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const userData = userDoc.data();
      const userDocRef = doc(db, "Users", userDoc.id);

      await signInWithEmailAndPassword(auth, userData.email, password);

      const now = new Date();
      let updatedBalance = userData.balance;

      if (!userData.lastLogin || (now - userData.lastLogin.toDate()) > 24 * 60 * 60 * 1000) {
        updatedBalance += 100;
        await updateDoc(userDocRef, {
          balance: updatedBalance,
          lastLogin: now,
        });
        alert("Daily login bonus! +$100 credited.");
      } else {
        await updateDoc(userDocRef, {
          lastLogin: now,
        });
      }

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
    <div style={styles2.container}>
      <h2>Login</h2>
      {error && <p style={styles2.error}>{error}</p>}
      
      <form onSubmit={handleLogin} style={styles2.form}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
          style={styles2.input}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          style={styles2.input}
        />
        <button type="submit" disabled={loading} style={styles2.button}>
          {loading ? "Loading..." : "Login"}
        </button>
      </form>

      <div style={styles2.buttonLinks}>
        <Link to="/forgot-password" style={styles2.link}>
          <button type="button" style={styles2.secondaryButton}>Forgot Password</button>
        </Link>
        <Link to="/create-account" style={styles2.link}>
          <button type="button" style={styles2.secondaryButton}>Create an Account</button>
        </Link>
      </div>
    </div>
  );
};

const styles2 = {
  container: {
    width: '100%',
    maxWidth: '400px',
    margin: '50px auto',
    padding: '20px',
    border: '1px solid #ddd',
    borderRadius: '10px',
    textAlign: 'center',
    fontFamily: 'Arial, sans-serif'
  },
  error: {
    color: 'red',
    marginBottom: '10px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  input: {
    padding: '10px',
    fontSize: '1em',
    borderRadius: '5px',
    border: '1px solid #ccc'
  },
  button: {
    padding: '10px',
    fontSize: '1em',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#007BFF',
    color: 'white',
    cursor: 'pointer'
  },
  buttonLinks: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  secondaryButton: {
    padding: '10px',
    fontSize: '1em',
    borderRadius: '5px',
    border: '1px solid #007BFF',
    backgroundColor: 'white',
    color: '#007BFF',
    cursor: 'pointer'
  },
  link: {
    textDecoration: 'none'
  }
};

const TradePage = () => {
  const API_KEY = "d09drcpr01qnv9ciacngd09drcpr01qnv9ciaco0";
  const STOCK_API_URL = "https://finnhub.io/api/v1/quote?symbol=";
  const ALT_API_KEY = "d09dfmpr01qnv9ci86fgd09dfmpr01qnv9ci86g0";
  const location = useLocation();

  const [companyName, setCompanyName] = useState("");
  const [stockQuantity, setStockQuantity] = useState(1);
  const [fetchedStockSymbol, setFetchedStockSymbol] = useState("");
  const [stockSymbol, setStockSymbol] = useState("");
  const [stockPrice, setStockPrice] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [stockHoldings, setStockHoldings] = useState(0);
  const [userData, setUserData] = useState(() => {
    const initialState = location.state || {
      username: '',
      email: '',
      balance: 0,
      stocksInvested: [],
      userId: '',
      displayable: false
    };
    return initialState;
  });
  const [loading, setLoading] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [confirmingSellAll, setConfirmingSellAll] = useState(null);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (!location.state?.username) {
      navigate("/login");
      return;
    }
    setUserData(location.state);
  }, [location.state, navigate]);

  useEffect(() => {
    const fetchAllPrices = async () => {
      if (!userData?.stocksInvested?.length) return;
      const priceMap = {};
  
      await Promise.all(userData.stocksInvested.map(async (stock) => {
        const price = await getCurrentPrice(stock.symbol);
        if (price) priceMap[stock.symbol] = price;
      }));
  
      setLivePrices(priceMap);
    };
  
    fetchAllPrices();
  }, [userData]);

  const calculateNetWorth = () => {
    if (!userData) return 0;
    
    let stockValue = 0;
    if (userData.stocksInvested?.length) {
      stockValue = userData.stocksInvested.reduce((total, stock) => {
        const currentPrice = livePrices[stock.symbol] || 0;
        return total + (currentPrice * stock.shares);
      }, 0);
    }
    
    return userData.balance + stockValue;
  };

  const searchStock = async () => {
    if (!stockSymbol.trim()) {
      setErrorMessage("Please enter a stock symbol.");
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
      const owned = updatedStocks[stockIndex];
      const saleValue = stockPrice * quantity;
  
      // Adjust totalSpent proportionally
      const costPerShare = owned.totalSpent / owned.shares;
      const costReduction = costPerShare * quantity;
      owned.totalSpent -= costReduction;
  
      if (owned.shares === quantity) {
        updatedStocks.splice(stockIndex, 1);
      } else {
        owned.shares -= quantity;
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

  const sellAllShares = async (symbol) => {
    if (confirmingSellAll !== symbol) {
      setConfirmingSellAll(symbol);
      return;
    }

    setLoading(true);
    try {
      const stockToSell = userData.stocksInvested.find(s => s.symbol === symbol);
      if (!stockToSell) return;

      const currentPrice = livePrices[symbol] || 0;
      const saleValue = currentPrice * stockToSell.shares;

      const updatedStocks = userData.stocksInvested.filter(s => s.symbol !== symbol);

      await updateUserData({
        balance: userData.balance + saleValue,
        stocksInvested: updatedStocks
      });

      setConfirmingSellAll(null);
      alert(`All shares of ${symbol} sold successfully!`);
    } catch (err) {
      setErrorMessage("Error selling all shares. Please try again.");
      console.error("Sell all error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetPasswordMode) {
      setResetPasswordMode(true);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Update password in Firebase Auth
      const user = auth.currentUser;
      await updatePassword(user, newPassword);
      
      // Reset the form
      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setResetPasswordMode(false);
      alert("Password updated successfully!");
    } catch (err) {
      setPasswordError("Error updating password. Please try again.");
      console.error("Password update error:", err);
    } finally {
      setLoading(false);
    }
  };

  const cancelPasswordReset = () => {
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setResetPasswordMode(false);
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

  const getCurrentPrice = async (symbol) => {
    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${ALT_API_KEY}`
      );
      const data = await response.json();
      return data.c || null;
    } catch (error) {
      console.error("Error fetching alt price:", error);
      return null;
    }
  };

  const quickTrade = async (symbol, type) => {
    const stockPrice = livePrices[symbol];
    if (!stockPrice || !userData) return;
  
    const quantity = 1;
    const updatedStocks = [...(userData.stocksInvested || [])];
    const stockIndex = updatedStocks.findIndex(s => s.symbol === symbol);
  
    if (type === "buy") {
      if (userData.balance < stockPrice) {
        setErrorMessage("Insufficient balance for quick buy.");
        return;
      }
  
      if (stockIndex !== -1) {
        updatedStocks[stockIndex].shares += 1;
        updatedStocks[stockIndex].totalSpent += stockPrice;
      } else {
        updatedStocks.push({ symbol, shares: 1, totalSpent: stockPrice });
      }
  
      await updateUserData({
        balance: userData.balance - stockPrice,
        stocksInvested: updatedStocks
      });
  
    } else if (type === "sell") {
      if (stockIndex === -1 || updatedStocks[stockIndex].shares < 1) {
        setErrorMessage("Not enough shares to quick sell.");
        return;
      }
  
      const owned = updatedStocks[stockIndex];
      const costPerShare = owned.totalSpent / owned.shares;
      owned.totalSpent -= costPerShare;
      owned.shares -= 1;
  
      if (owned.shares === 0) {
        updatedStocks.splice(stockIndex, 1);
      }
  
      await updateUserData({
        balance: userData.balance + stockPrice,
        stocksInvested: updatedStocks
      });
    }
  };
   
  const renderHoldingsTable = () => {
    if (!userData?.stocksInvested?.length) {
      return <p>You don't own any stocks yet.</p>;
    }
  
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 10 }}>
        <thead>
          <tr>
            <th>Symbol</th>
            <th>Shares</th>
            <th>Total Spent</th>
            <th>Current Price</th>
            <th>Current Value</th>
            <th>% Change</th>
            <th>Quick Buy</th>
            <th>Quick Sell</th>
            <th>Sell All</th>
          </tr>
        </thead>
        <tbody>
          {userData.stocksInvested.map((stock, index) => {
            const livePrice = livePrices[stock.symbol] || 0;
            const currentValue = livePrice * stock.shares;
            const percentChange = stock.totalSpent
              ? (((currentValue - stock.totalSpent) / stock.totalSpent) * 100).toFixed(2)
              : "0.00";
  
            return (
              <tr key={index}>
                <td>{stock.symbol}</td>
                <td>{stock.shares}</td>
                <td>${stock.totalSpent.toFixed(2)}</td>
                <td>${livePrice.toFixed(2)}</td>
                <td>${currentValue.toFixed(2)}</td>
                <td style={{ color: percentChange >= 0 ? "green" : "red" }}>
                  {percentChange}%
                </td>
                <td>
                  <button onClick={() => quickTrade(stock.symbol, "buy")}>Buy 1</button>
                </td>
                <td>
                  <button onClick={() => quickTrade(stock.symbol, "sell")} disabled={stock.shares < 1}>
                    Sell 1
                  </button>
                </td>
                <td>
                  <button 
                    onClick={() => sellAllShares(stock.symbol)}
                    style={{ backgroundColor: confirmingSellAll === stock.symbol ? "#ffcccc" : "" }}
                  >
                    {confirmingSellAll === stock.symbol ? "Are you sure?" : "Sell All"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );
  };  
  
  if (!userData) return <div>Loading...</div>;

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <button style={styles.navButton} onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button style={styles.navButton} onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button style={styles.navButton} onClick={handleLogout}>Logout</button>
      </nav>
  
      {/* Balance and Net Worth Section */}
      <div style={styles.balanceSection}>
        <h3>Account Balance: ${userData.balance.toFixed(2)}</h3>
        <h3>Net Worth: ${calculateNetWorth().toFixed(2)}</h3>
      </div>
  
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
          </div>
  
          <div style={styles.passwordResetSection}>
            <h3>Password Reset</h3>
            <button 
              onClick={handleResetPassword} 
              disabled={loading}
              style={styles.button}
            >
              {resetPasswordMode ? "Processing..." : "Reset Password"}
            </button>
            
            {resetPasswordMode && (
              <div style={styles.passwordForm}>
                <input
                  type="password"
                  placeholder="New Password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={styles.input}
                />
                <input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={styles.input}
                />
                {passwordError && <p style={styles.error}>{passwordError}</p>}
                <div style={styles.passwordButtons}>
                  <button onClick={cancelPasswordReset} style={styles.button}>
                    Cancel
                  </button>
                  <button 
                    onClick={handleResetPassword} 
                    disabled={loading}
                    style={styles.button}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
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
        </div>
      </div>
      <div style={{ ...styles.tradeSection, marginTop: 30}}>
            <h2>Stock Holdings</h2>
            {userData.stocksInvested?.length > 0 ? renderHoldingsTable() : <p>You don't own any stocks yet.</p>}
      </div>
    </div>
  );  
};

// Updated CSS with new styles
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    padding: "100px",
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
  balanceSection: {
    padding: "15px",
    marginBottom: "20px",
    border: "1px solid #ccc",
    borderRadius: "8px",
    backgroundColor: "#f5f5f5",
    display: "flex",
    justifyContent: "space-between",
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
  passwordResetSection: {
    marginBottom: "20px",
  },
  passwordForm: {
    marginTop: "10px",
  },
  passwordButtons: {
    marginTop: "10px",
    display: "flex",
    gap: "10px",
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
        networth: 1000,
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
  const [sortBy, setSortBy] = useState("balance"); // 'balance' or 'networth'
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
  }, [userData, limitAmount, sortBy]); 

  const fetchLeaderboard = async () => {
    setLoading(true);
    setError("");
    try {
      const usersRef = collection(db, "Users");
      const q = query(
        usersRef,
        where("displayable", "==", true),
        orderBy(sortBy, "desc"),
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

  const handleSortByBalance = () => {
    setSortBy("balance");
  };

  const handleSortByNetWorth = () => {
    setSortBy("networth");
  };

  return (
    <div style={styles3.container}>
      <nav style={styles3.nav}>
        <button 
          style={styles3.navButton}
          onClick={() => navigate("/trade", { state: userData })}
        >
          Trade
        </button>
        <button 
          style={styles3.navButton}
          onClick={() => navigate("/leaderboard", { state: userData })}
        >
          Leaderboard
        </button>
        <button 
          style={styles3.navButton}
          onClick={handleLogout}
        >
          Logout
        </button>
      </nav>

      <div style={styles3.mainContent}>
        {/* Leaderboard Table on Left */}
        <div style={styles3.leaderboardSection}>
          <h1>Leaderboard</h1>
          {loading && <p>Loading leaderboard...</p>}
          {error && <p style={styles3.error}>{error}</p>}

          <table style={styles3.table}>
            <thead>
              <tr>
                <th>Rank</th>
                <th>Username</th>
                <th>{sortBy === "balance" ? "Balance" : "Net Worth"}</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user, index) => (
                <tr
                  key={user.id}
                  style={user.username === userData?.username ? styles3.highlightRow : {}}
                >
                  <td>{index + 1}</td>
                  <td>{user.username}</td>
                  <td>${user[sortBy]?.toFixed(2) || '0.00'}</td>
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

        {/* Controls on Right */}
        <div style={styles3.controlsSection}>
          <div style={styles3.controlGroup}>
            <h3>Leaderboard Controls</h3>
            <button 
              style={styles3.button}
              onClick={fetchLeaderboard}
            >
              Update Leaderboard
            </button>
          </div>

          <div style={styles3.controlGroup}>
            <h4>Leaderboard Size</h4>
            <div style={styles3.radioGroup}>
              <label style={styles3.radioLabel}>
                <input
                  type="radio"
                  name="limit"
                  value="10"
                  checked={limitAmount === 10}
                  onChange={handleLimitChange}
                  style={styles3.radioInput}
                />
                10
              </label>
              <label style={styles3.radioLabel}>
                <input
                  type="radio"
                  name="limit"
                  value="25"
                  checked={limitAmount === 25}
                  onChange={handleLimitChange}
                  style={styles3.radioInput}
                />
                25
              </label>
              <label style={styles3.radioLabel}>
                <input
                  type="radio"
                  name="limit"
                  value="50"
                  checked={limitAmount === 50}
                  onChange={handleLimitChange}
                  style={styles3.radioInput}
                />
                50
              </label>
            </div>
          </div>

          <div style={styles3.controlGroup}>
            <h4>Sort By</h4>
            <button 
              style={{ 
                ...styles3.button, 
                ...(sortBy === "balance" ? styles3.activeButton : {}) 
              }}
              onClick={handleSortByBalance}
            >
              Balance
            </button>
            <button 
              style={{ 
                ...styles3.button, 
                ...(sortBy === "networth" ? styles3.activeButton : {}),
                marginTop: "10px"
              }}
              onClick={handleSortByNetWorth}
            >
              Net Worth
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles3 = {
  container: {
    fontFamily: "Arial, sans-serif",
    padding: "20px",
    maxWidth: "1200px",
    margin: "0 auto",
  },
  nav: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "30px",
    gap: "10px",
  },
  navButton: {
    padding: "10px 20px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#007BFF",
    border: "1px solid #ddd",
    borderRadius: "4px",
  },
  mainContent: {
    display: "flex",
    gap: "30px",
  },
  leaderboardSection: {
    flex: 2,
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
  },
  controlsSection: {
    flex: 1,
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  highlightRow: {
    backgroundColor: "#e6f7ff",
    fontWeight: "bold",
  },
  error: {
    color: "red",
    margin: "10px 0",
  },
  controlGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  button: {
    padding: "10px 15px",
    fontSize: "16px",
    cursor: "pointer",
    backgroundColor: "#007BFF",
    border: "1px solid #ddd",
    borderRadius: "4px",
    width: "100%",
  },
  activeButton: {
    backgroundColor: "#4CAF50",
    color: "white",
  },
  radioGroup: {
    display: "flex",
    gap: "15px",
    justifyContent: "center",
  },
  radioLabel: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
  },
  radioInput: {
    margin: "0",
  },
};

export default App;