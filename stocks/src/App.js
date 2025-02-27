import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate } from "react-router-dom";
import { Card, CardContent } from "./components/ui/card";
import { Button } from "./components/ui/button";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = () => {
    if (username === "user" && password === "password") {
      navigate("/dashboard");
    } else {
      alert("Invalid credentials");
    }
  };

  return (
    <div className="flex h-screen items-center justify-center">
      <Card className="p-6 w-96">
        <CardContent>
          <h2 className="text-xl font-bold mb-4">Login</h2>
          <input
            className="w-full p-2 mb-2 border rounded"
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            className="w-full p-2 mb-4 border rounded"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button className="w-full" onClick={handleLogin}>Login</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function Dashboard() {
  const [stocks, setStocks] = useState({
    AAPL: 150,
    TSLA: 700,
    AMZN: 3300,
  });
  const [balance, setBalance] = useState(10000);
  const [portfolio, setPortfolio] = useState({});
  const [investments, setInvestments] = useState({});
  const [history, setHistory] = useState([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStocks((prevStocks) => {
        const updatedStocks = { ...prevStocks };
        Object.keys(updatedStocks).forEach((stock) => {
          updatedStocks[stock] += (Math.random() - 0.5) * 10;
        });
        return updatedStocks;
      });
      const totalInvestmentValue = Object.entries(portfolio).reduce(
        (sum, [symbol, shares]) => sum + (shares * (stocks[symbol] || 0)),
        0
      );
      setHistory((prevHistory) => [...prevHistory, { time: new Date().toLocaleTimeString(), balance, investmentValue: totalInvestmentValue }]);
    }, 2000);

    return () => clearInterval(interval);
  }, [balance, stocks, portfolio]);

  const buyStock = (symbol) => {
    const amount = parseInt(prompt(`How many shares of ${symbol} do you want to buy?`), 10);
    if (!amount || amount <= 0) return;
    const price = stocks[symbol] * amount;
    if (balance >= price) {
      setBalance(balance - price);
      setPortfolio((prevPortfolio) => ({
        ...prevPortfolio,
        [symbol]: (prevPortfolio[symbol] || 0) + amount,
      }));
      setInvestments((prevInvestments) => ({
        ...prevInvestments,
        [symbol]: (prevInvestments[symbol] || 0) + price,
      }));
    } else {
      alert("Not enough balance to buy this stock.");
    }
  };

  const sellStock = (symbol) => {
    const amount = parseInt(prompt(`How many shares of ${symbol} do you want to sell?`), 10);
    if (!amount || amount <= 0) return;
    if (portfolio[symbol] && portfolio[symbol] >= amount) {
      const saleValue = stocks[symbol] * amount;
      setBalance(balance + saleValue);
      setPortfolio((prevPortfolio) => ({
        ...prevPortfolio,
        [symbol]: prevPortfolio[symbol] - amount,
      }));
      setInvestments((prevInvestments) => ({
        ...prevInvestments,
        [symbol]: prevInvestments[symbol] - (investments[symbol] / portfolio[symbol]) * amount,
      }));
    } else {
      alert("You don't own enough of this stock.");
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Before Broke</h2>
      <h3 className="text-lg font-semibold">Account Balance: ${balance.toFixed(2)}</h3>
      <LineChart width={600} height={300} data={history} className="mt-4">
        <XAxis dataKey="time" />
        <YAxis domain={['dataMin', 'dataMax']} />
        <CartesianGrid strokeDasharray="3 3" />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="balance" stroke="#8884d8" name="Balance" />
        <Line type="monotone" dataKey="investmentValue" stroke="#82ca9d" name="Investment Value" />
      </LineChart>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {Object.entries(stocks).map(([symbol, price]) => (
          <Card key={symbol} className="p-4">
            <CardContent>
              <h3 className="text-lg font-semibold">{symbol}</h3>
              <p>Current Price: ${price.toFixed(2)}</p>
              <p>Owned: {portfolio[symbol] || 0} shares</p>
              <p>Invested: ${investments[symbol]?.toFixed(2) || 0}</p>
              <p>Current Value: ${(portfolio[symbol] ? portfolio[symbol] * price : 0).toFixed(2)}</p>
              <Button className="mt-2" onClick={() => buyStock(symbol)}>Buy</Button>
              <Button className="mt-2 ml-2" onClick={() => sellStock(symbol)}>Sell</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
      </Routes>
    </Router>
  );
}

export default App;
