document.addEventListener("DOMContentLoaded", function () {
    // Create forgot password container
    const forgotContainer = document.createElement("div");
    forgotContainer.classList.add("forgot-container");

    // Create back button
    const backButton = document.createElement("button");
    backButton.classList.add("back-btn");
    backButton.innerHTML = "&#8592; Back";
    backButton.addEventListener("click", function () {
        import("./login.js").then(module => {
            module.loadLogin();
        });
    });
    forgotContainer.appendChild(backButton);

    // Create title
    const title = document.createElement("h2");
    title.textContent = "Forgot Password";
    forgotContainer.appendChild(title);

    // Create description
    const description = document.createElement("p");
    description.textContent = "An email will be sent with a new temporary password.";
    forgotContainer.appendChild(description);

    // Create email input field
    const emailInput = document.createElement("input");
    emailInput.type = "email";
    emailInput.id = "email";
    emailInput.placeholder = "Email";
    emailInput.required = true;
    forgotContainer.appendChild(emailInput);

    // Create reset password button
    const resetButton = document.createElement("button");
    resetButton.classList.add("forgot-btn");
    resetButton.textContent = "Reset Password";
    resetButton.addEventListener("click", sendEmail);
    forgotContainer.appendChild(resetButton);

    // Create message paragraph
    const message = document.createElement("p");
    message.classList.add("message");
    message.id = "message";
    message.textContent = "An email has been sent to your account's email address with a new password.";
    message.style.display = "none";
    forgotContainer.appendChild(message);

    // Append forgot container to body
    document.body.appendChild(forgotContainer);

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
        .forgot-container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
            text-align: center;
            width: 300px;
            position: relative;
        }
        .back-btn {
            position: absolute;
            top: 10px;
            left: 10px;
            background: none;
            border: none;
            color: #007bff;
            font-size: 16px;
            cursor: pointer;
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
        .forgot-btn {
            background-color: #dc3545;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        }
        .forgot-btn:hover {
            background-color: #c82333;
        }
        .message {
            margin-top: 15px;
            color: green;
            display: none;
        }
    `;
    document.head.appendChild(style);
});

// Function to show message
function sendEmail() {
    document.getElementById("message").style.display = "block";
}
