document.addEventListener("DOMContentLoaded", function () {
    // Create login container
    const loginContainer = document.createElement("div");
    loginContainer.classList.add("login-container");
    
    // Create title
    const title = document.createElement("h2");
    title.textContent = "Login";
    loginContainer.appendChild(title);
    
    // Create username field
    const usernameGroup = document.createElement("div");
    usernameGroup.classList.add("form-group");
    usernameGroup.innerHTML = `
        <label for="username">Username</label>
        <input type="text" id="username" placeholder="Enter your username" required>
    `;
    loginContainer.appendChild(usernameGroup);
    
    // Create password field
    const passwordGroup = document.createElement("div");
    passwordGroup.classList.add("form-group");
    passwordGroup.innerHTML = `
        <label for="password">Password</label>
        <input type="password" id="password" placeholder="Enter your password" required>
    `;
    loginContainer.appendChild(passwordGroup);
    
    // Create login button
    const loginButton = document.createElement("button");
    loginButton.classList.add("login-btn");
    loginButton.textContent = "Login";
    loginButton.addEventListener("click", login);
    loginContainer.appendChild(loginButton);
    
    // Create links container
    const links = document.createElement("div");
    links.classList.add("links");
    links.innerHTML = `
        <a href="forgotPassword.html">Forgot Password?</a>
        <a href="createAccount.html">Create an Account</a>
    `;
    loginContainer.appendChild(links);
    
    // Append login container to body
    document.body.appendChild(loginContainer);
    
    // Apply styles dynamically
    const style = document.createElement("style");
    style.textContent = `
        body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #f4f4f4;
            margin: 0;
        }
        .login-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            width: 300px;
        }
        .form-group {
            margin-bottom: 15px;
            text-align: left;
        }
        label {
            font-weight: bold;
            display: block;
            margin-bottom: 5px;
        }
        input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
            box-sizing: border-box;
        }
        .login-btn {
            background-color: #007bff;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        }
        .login-btn:hover {
            background-color: #0056b3;
        }
        .links {
            margin-top: 15px;
        }
        .links a {
            color: #007bff;
            text-decoration: none;
            display: block;
            margin-top: 5px;
        }
    `;
    document.head.appendChild(style);
});

// Login function
function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    
    if (username && password) {
        window.location.href = "trade.html";
    } else {
        alert("Please enter both username and password");
    }
}
