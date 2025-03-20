document.addEventListener("DOMContentLoaded", function () {
    // Create account container
    const accountContainer = document.createElement("div");
    accountContainer.classList.add("account-container");

    // Create back button
    const backButton = document.createElement("button");
    backButton.classList.add("back-btn");
    backButton.innerHTML = "&#8592; Back";
    backButton.addEventListener("click", function () {
        import("./login.js").then(module => {
            module.loadLogin();
        });
    });
    accountContainer.appendChild(backButton);

    // Create title
    const title = document.createElement("h2");
    title.textContent = "Create Account";
    accountContainer.appendChild(title);

    // Create form fields
    const formFields = [
        { label: "Email", type: "email", id: "email", placeholder: "Enter your email" },
        { label: "Username", type: "text", id: "username", placeholder: "Enter your username" },
        { label: "Password", type: "password", id: "password", placeholder: "Enter your password" },
        { label: "Confirm Password", type: "password", id: "confirm-password", placeholder: "Confirm your password" }
    ];

    formFields.forEach(field => {
        const formGroup = document.createElement("div");
        formGroup.classList.add("form-group");
        
        const label = document.createElement("label");
        label.setAttribute("for", field.id);
        label.textContent = field.label;
        
        const input = document.createElement("input");
        input.type = field.type;
        input.id = field.id;
        input.placeholder = field.placeholder;
        input.required = true;
        
        formGroup.appendChild(label);
        formGroup.appendChild(input);
        accountContainer.appendChild(formGroup);
    });

    // Create sign-up button
    const signUpButton = document.createElement("button");
    signUpButton.classList.add("account-btn");
    signUpButton.textContent = "Sign Up";
    accountContainer.appendChild(signUpButton);

    // Append account container to body
    document.body.appendChild(accountContainer);

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
        .account-container {
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
        .account-btn {
            background-color: #28a745;
            color: white;
            padding: 10px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            width: 100%;
            font-size: 16px;
        }
        .account-btn:hover {
            background-color: #218838;
        }
    `;
    document.head.appendChild(style);
});
