import { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Link, useNavigate, useLocation} from "react-router-dom";
import { auth, db, analytics, createUserWithEmailAndPassword, collection, query, where, getDocs,getDoc, addDoc, doc, setDoc,updateDoc,limit,orderBy, getFirestore, sendPasswordResetEmail, getAuth,useFireBaseApp } from './firebase';  // Import all necessary Firebase services and functions

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault(); // Prevent form refresh
    setError(''); // Clear any previous errors

    if (!username || !password) {
      setError('Please fill in both fields.');
      return;
    }

    try {
      // Step 1: Check if the username exists in Firestore
      const usersRef = collection(db, 'Users'); // Use the correct collection name "Users"
      const q = query(usersRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Username does not exist.');
        return;
      }

      // Step 2: Check if the entered password matches the stored password
      const userDoc = querySnapshot.docs[0]; // Get the first document matching the username
      const userData = userDoc.data();

      if (userData.password !== password) {
        setError('Incorrect password.');
        return;
      }

      // Step 3: Successfully logged in, pass user data to the "trade" page
      const userDataToPass = {
        username: userData.username,
        password: userData.password,
        email: userData.email,
        balance: userData.balance,
        stocksInvested: userData.stocksInvested,
      };

      // Step 4: Navigate to "trade" page, passing user data via state
      navigate('/trade', { state: userDataToPass });
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error(err);
    }
  };

  return (
    <div className="containerL">
      <h2>Login</h2>
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>} {/* Show error message */}
      
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
        <button type="submit">Login</button>
      </form>
      
      <div className="links">
        <Link to="/forgot-password">Forgot Password?</Link>
      </div>
      <div className="links">
        <Link to="/create-account">Create an Account</Link>
      </div>
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
  const [userData, setUserData] = useState(null); // Holds user data

  const location = useLocation();
  const navigate = useNavigate();
  const { username, password } = location.state || {}; // Get user data from location state
  
  useEffect(() => {
    if (!username || !password) {
      setErrorMessage("Error: No user data passed.");
      return; // Exit early if there's no username or password
    }

    // Fetch user data from Firestore if username is valid
    const getUserData = async () => {
      try {
        const userRef = collection(db, "Users");
        const q = query(userRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setUserData({ ...userDoc.data(), id: userDoc.id }); // Store user data and userDoc ID
        } else {
          setErrorMessage("User not found.");
        }
      } catch (error) {
        setErrorMessage("Error fetching user data.");
        console.error("Error fetching user data:", error);
      }
    };

    getUserData();
  }, [username, password]); // Depend on username and password to fetch data when they change

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
        const stockIndex = userData?.stocksInvested?.findIndex(stock => stock.symbol === stockSymbol.toUpperCase());
        if (stockIndex !== -1) {
          setStockHoldings(userData.stocksInvested[stockIndex].shares); // Update stock holdings based on user data
        } else {
          setStockHoldings(0); // User doesn't own the stock yet
        }
        setErrorMessage("");
      } else {
        setErrorMessage("Invalid stock symbol or data unavailable.");
        setStockPrice(null);
      }
    } catch (error) {
      setErrorMessage("Error fetching stock data. Try again later.");
      console.error("Stock fetch error:", error);
    }
  };

  const buyStock = async () => {
    if (!userData || !stockPrice) {
      setErrorMessage("Error: No user data or stock price available.");
      return;
    }

    const stockIndex = userData?.stocksInvested?.findIndex(stock => stock.symbol === stockSymbol.toUpperCase());

    if (userData.balance < stockPrice) {
      setErrorMessage("Insufficient balance to purchase this stock.");
      return;
    }

    // Update balance and stocksInvested
    const newBalance = userData.balance - stockPrice;
    if (stockIndex !== -1) {
      // User already owns the stock, so we increase the shares
      userData.stocksInvested[stockIndex].shares += 1;
    } else {
      // Add a new stock object to the portfolio
      userData.stocksInvested.push({
        symbol: stockSymbol.toUpperCase(),
        shares: 1,
      });
    }

    try {
      // Update Firestore with the new portfolio and balance
      await updateDoc(doc(db, "Users", userData.id), {
        balance: newBalance,
        stocksInvested: userData.stocksInvested,
      });

      setErrorMessage("");
      alert("Stock purchased successfully!");
      setStockHoldings(prevHoldings => prevHoldings + 1); // Update stock holdings displayed on the UI
    } catch (err) {
      setErrorMessage("Error purchasing stock. Please try again.");
      console.error("Error buying stock:", err);
    }
  };

  const sellStock = async () => {
    if (!userData || !stockPrice) {
      setErrorMessage("Error: No user data or stock price available.");
      return;
    }

    const stockIndex = userData?.stocksInvested?.findIndex(stock => stock.symbol === stockSymbol.toUpperCase());
    if (stockIndex === -1 || userData.stocksInvested[stockIndex]?.shares <= 0) {
      setErrorMessage("You do not own this stock.");
      return;
    }

    // Update balance and stocksInvested
    const newBalance = userData.balance + stockPrice;
    userData.stocksInvested[stockIndex].shares -= 1;

    // If the user has no more shares of the stock, remove it from portfolio
    if (userData.stocksInvested[stockIndex].shares === 0) {
      userData.stocksInvested.splice(stockIndex, 1);
    }

    try {
      // Update Firestore with the new portfolio and balance
      await updateDoc(doc(db, "Users", userData.id), {
        balance: newBalance,
        stocksInvested: userData.stocksInvested,
      });

      setErrorMessage("");
      alert("Stock sold successfully!");
      setStockHoldings(prevHoldings => prevHoldings - 1); // Update stock holdings displayed on the UI
    } catch (err) {
      setErrorMessage("Error selling stock. Please try again.");
      console.error("Error selling stock:", err);
    }
  };

  return (
    <div className="container">
      {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/portfolio", { state: userData })}>Portfolio</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={() => navigate("/login")}>Logout</button>
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
          <button onClick={buyStock}>Buy</button>
          <button onClick={sellStock} disabled={stockHoldings === 0}>Sell</button>
        </div>
      )}
    </div>
  );
}

const CreateAccountPage = () => {
  const navigate = useNavigate();
  
  // State variables to hold form data
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(''); // For displaying any errors

  const handleSignUp = async (e) => {
    e.preventDefault(); // Prevent page refresh
    setError(''); // Clear any old error
  
    if (!email || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
  
    if (password !== confirmPassword) {
      setError("Passwords don't match!");
      return;
    }

    try {
      // Step 1: Check if username is already taken
      const usersRef = collection(db, "Users");
      const q = query(usersRef, where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setError("Username already exists! Choose a different one.");
        return;
      }

      // Step 2: Create user with Firebase Auth (Handles passwords securely)
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const userId = userCredential.user.uid; // Get Firebase Auth UID

      // Step 3: Initialize stocksInvested as an empty array of objects
      const initialStocksInvested = [];

      // Step 4: Store additional user details in Firestore
      await addDoc(collection(db, "Users"), {
        email,
        username,
        password, // ⚠️ Store hashed passwords instead
        balance: 10000,
        stocksInvested: initialStocksInvested, // Empty array of stock objects
      });

      alert("Account created!");
      navigate("/"); // Redirect to login page
    } catch (err) {
      console.error("Error creating account: ", err); // Log detailed error
      setError("Failed to create account. Try again.");
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate('/login')}>Back</button>
      <h2>Create Account</h2>
  
      {error && <p style={{ color: 'red', fontWeight: 'bold' }}>{error}</p>} {/* Display error message */}

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
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          required
        />
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
}

const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  
  const handleResetPassword = async () => {
    if (!email) {
      setError("Please enter an email.");
      return;
    }

    try {
      // Check if email exists in Firestore database (users collection)
      const usersCollection = collection(db, "users");
      const q = query(usersCollection, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError("This email is not registered.");
        return;
      }

      // Send password reset email using Firebase Authentication
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset email sent. Please check your inbox.");
      setError(""); // Clear any previous errors
    } catch (err) {
      setError("An error occurred. Please try again.");
      setMessage(""); // Clear any success messages
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate("/login")}>Back</button>
      <h2>Forgot Password</h2>
      <p>Enter your email to reset your password.</p>
      
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      
      {error && <p style={{ color: "red" }}>{error}</p>}
      {message && <p style={{ color: "green" }}>{message}</p>}
      
      <button onClick={handleResetPassword}>Reset Password</button>
    </div>
  );
}

const Leaderboard = () => {
  const [topUsers, setTopUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null); // Holds user data
  const { username, password } = location.state || {}; // Get user data from location state

  useEffect(() => {

    if (!username || !password) {
      setErrorMessage("Error: No user data passed.");
      return; // Exit early if there's no username or password
    }

    // Fetch user data from Firestore if username is valid
    const getUserData = async () => {
      try {
        const userRef = collection(db, "Users");
        const q = query(userRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setUserData({ ...userDoc.data(), id: userDoc.id }); // Store user data and userDoc ID
        } else {
          setErrorMessage("User not found.");
        }
      } catch (error) {
        setErrorMessage("Error fetching user data.");
        console.error("Error fetching user data:", error);
      }
    };

    getUserData();
    
    // Fetch the top 10 users sorted by balance
    const fetchLeaderboard = async () => {
      try {
        const userRef = collection(db, "Users");
        const q = query(userRef, where("displayable", "==", true), orderBy("balance", "desc"), limit(10));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const users = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }));
          setTopUsers(users);
        } else {
          setErrorMessage("No users found.");
        }
      } catch (error) {
        setErrorMessage("Error fetching leaderboard.");
        console.error("Error fetching leaderboard:", error);
      }
    };

    fetchLeaderboard();
  }, [username, password]); // Only run once on component mount

  return (
    <div className="min-h-screen bg-gray-100 text-center">
      {/* Navbar */}
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/portfolio", { state: userData })}>Portfolio</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={() => navigate("/login")}>Logout</button>
      </nav>

      {/* Leaderboard Section */}
      <div className="mt-10 mx-auto bg-white p-6 rounded-lg shadow-md inline-block">
        <h1 className="text-2xl font-bold">Leaderboard</h1>

        {/* Error message */}
        {errorMessage && <p style={{ color: 'red' }}>{errorMessage}</p>}

        {/* Table for displaying top users */}
        <div className="mt-4">
          <table className="min-w-full table-auto border-collapse">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b">Rank</th>
                <th className="py-2 px-4 border-b">Username</th>
                <th className="py-2 px-4 border-b">Balance</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user, index) => (
                <tr key={user.id} className={user.username === username ? "bg-red-100" : ""}>
                  <td className="py-2 px-4 border-b">{index + 1}</td>
                  <td className="py-2 px-4 border-b" style={user.username === username ? { color: 'red' } : {}}>
                    {user.username}
                  </td>
                  <td className="py-2 px-4 border-b">${user.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const Portfolio = () => {
  const [userData, setUserData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const location = useLocation();
  const navigate = useNavigate();
  const { username, password } = location.state || {};

  useEffect(() => {
    if (!username || !password) {
      setErrorMessage("Error: No user data passed.");
      return;
    }

    const getUserData = async () => {
      try {
        const userRef = collection(db, "Users");
        const q = query(userRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          setUserData({ ...userDoc.data(), id: userDoc.id });
        } else {
          setErrorMessage("User not found.");
        }
      } catch (error) {
        setErrorMessage("Error fetching user data.");
        console.error("Error fetching user data:", error);
      }
    };

    getUserData();
  }, [username, password]);

  const updatePassword = async () => {
    if (!newPassword.trim()) {
      setErrorMessage("Password cannot be empty.");
      return;
    }
    try {
      await updateDoc(doc(db, "Users", userData.id), {
        password: newPassword,
      });
      alert("Password updated successfully!");
      setNewPassword("");
    } catch (error) {
      setErrorMessage("Error updating password.");
      console.error("Error updating password:", error);
    }
  };

  return (
    <div className="container">
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      <nav>
        <button onClick={() => navigate("/trade", { state: userData })}>Trade</button>
        <button onClick={() => navigate("/portfolio", { state: userData })}>Portfolio</button>
        <button onClick={() => navigate("/leaderboard", { state: userData })}>Leaderboard</button>
        <button onClick={() => navigate("/login")}>Logout</button>
      </nav>
      <h2>Portfolio</h2>
      {userData && (
        <div>
          <p>Username: {userData.username}</p>
          <p>Email: {userData.email}</p>
          <h3>Change Password</h3>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
          <h3>Display on Leaderboard</h3>
          <label>
            <input
              type="checkbox"
              checked={userData.displayable}
              onChange={async (e) => {
                const newValue = e.target.checked;
                try {
                  const userDocRef = doc(db, "users", userData.uid);
                  await updateDoc(userDocRef, {
                    displayable: newValue,
                  });
                  setUserData((prev) => ({
                    ...prev,
                    displayable: newValue,
                  }));
                } catch (error) {
                  console.error("Error updating displayable:", error);
                  setErrorMessage("Failed to update leaderboard visibility.");
                }
              }}
            />
            Display my username on leaderboard
          </label>
          <button onClick={updatePassword}>Update Password</button>
          <h3>Account Balance</h3>
          <p>${userData.balance.toFixed(2)}</p>
          <h3>Stocks Owned</h3>
          <ul>
            {userData.stocksInvested && userData.stocksInvested.length > 0 ? (
              userData.stocksInvested.map((stock, index) => (
                <li key={index}>
                  {stock.symbol}: {stock.shares} shares
                </li>
              ))
            ) : (
              <p>No stocks owned.</p>
            )}
          </ul>
        </div>
      )}
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
        <Route path="/" element={<LoginPage />} />
      </Routes>
    </Router>
  );
}

export default App;
