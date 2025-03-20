document.addEventListener("DOMContentLoaded", function () {
    // Create navigation bar
    const navbar = document.createElement("div");
    navbar.classList.add("navbar");
    
    const pages = [
        { name: "Trade", module: "./trade.js" },
        { name: "Portfolio", module: "./portfolio.js" },
        { name: "Leaderboard", module: "./leaderboard.js" },
        { name: "Logout", module: "./login.js" }
    ];
    
    pages.forEach(page => {
        const link = document.createElement("a");
        link.textContent = page.name;
        link.href = "#";
        link.addEventListener("click", function () {
            import(page.module).then(module => {
                module.loadPage();
            });
        });
        navbar.appendChild(link);
    });
    
    document.body.appendChild(navbar);
    
    // Create trade container
    const tradeContainer = document.createElement("div");
    tradeContainer.classList.add("trade-container");
    
    const title = document.createElement("h2");
    title.textContent = "Trade Stocks";
    tradeContainer.appendChild(title);
    
    const balance = document.createElement("p");
    balance.classList.add("balance");
    balance.innerHTML = "Balance: $<span id='balance'>1000.00</span>";
    tradeContainer.appendChild(balance);
    
    const stockInput = document.createElement("input");
    stockInput.type = "text";
    stockInput.id = "stock-symbol";
    stockInput.placeholder = "Enter stock symbol (e.g., AMZN)";
    tradeContainer.appendChild(stockInput);
    
    const searchButton = document.createElement("button");
    searchButton.classList.add("trade-btn", "buy-btn");
    searchButton.textContent = "Search";
    searchButton.addEventListener("click", searchStock);
    tradeContainer.appendChild(searchButton);
    
    const errorMessage = document.createElement("p");
    errorMessage.classList.add("error-message");
    errorMessage.id = "error-message";
    tradeContainer.appendChild(errorMessage);
    
    // Stock Info Section
    const stockInfo = document.createElement("div");
    stockInfo.classList.add("stock-info");
    stockInfo.id = "stock-info";
    stockInfo.innerHTML = `
        <p>Symbol: <span id="stock-symbol-display">N/A</span></p>
        <p>Current Price: <span id="stock-price">N/A</span></p>
        <p>Shares Owned: <span id="stock-holdings">0</span></p>
    `;
    tradeContainer.appendChild(stockInfo);
    
    // Buy/Sell Section
    const buySellContainer = document.createElement("div");
    buySellContainer.classList.add("buy-sell-container");
    buySellContainer.id = "buy-sell-container";
    buySellContainer.innerHTML = `
        <input type="number" id="buy-amount" placeholder="Enter amount to buy" min="1">
        <button class="trade-btn buy-btn" onclick="buyStock()">Buy</button>
        <input type="number" id="sell-amount" placeholder="Enter amount to sell" min="1">
        <button class="trade-btn sell-btn" onclick="sellStock()">Sell</button>
    `;
    tradeContainer.appendChild(buySellContainer);
    
    document.body.appendChild(tradeContainer);

    // JavaScript logic remains similar, defining searchStock, buyStock, sellStock functions
});
