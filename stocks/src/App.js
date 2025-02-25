import { useState, useEffect } from "react";
import { Card, CardContent } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Button } from "./components/ui/button";

const STOCK_API_URL = "https://finnhub.io/api/v1/quote?symbol=";
const API_KEY = "cuigmfpr01qtqfmiku40cuigmfpr01qtqfmiku4g"; // Gavin's API Key

const stocksList = ["AAPL", "GOOGL", "MSFT", "TSLA", "AMZN"];

export default function StockApp() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [customStock, setCustomStock] = useState("");

  useEffect(() => {
    fetchStockData(stocksList);
  }, []);

  const fetchStockData = async (symbols) => {
    setLoading(true);
    setError(null);
    try {
      const promises = symbols.map(async (symbol) => {
        const response = await fetch(`${STOCK_API_URL}${symbol}&token=${API_KEY}`);
        const data = await response.json();
        return { symbol, price: data.c };
      });
      const results = await Promise.all(promises);
      setStocks(results);
    } catch (err) {
      setError("Failed to fetch stock data");
    }
    setLoading(false);
  };

  const addCustomStock = () => {
    if (customStock.trim()) {
      fetchStockData([customStock.toUpperCase()]);
      setCustomStock("");
    }
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold mb-4">Stock Prices</h1>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 gap-4">
        {stocks.map((stock) => (
          <Card key={stock.symbol}>
            <CardContent className="p-4 flex justify-between">
              <span className="font-semibold">{stock.symbol}</span>
              <span>${stock.price}</span>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-4 flex gap-2">
        <Input
          type="text"
          placeholder="Enter stock symbol"
          value={customStock}
          onChange={(e) => setCustomStock(e.target.value)}
        />
        <Button onClick={addCustomStock}>Add</Button>
      </div>
    </div>
  );
}
