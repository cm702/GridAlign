const loginForm = document.getElementById("login-form");
const errorMessage = document.getElementById("login-error");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    errorMessage.textContent = "";

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                password: password
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            errorMessage.textContent =
                errorData.detail || "Login failed.";
            return;
        }

        const data = await response.json();

        if (data.success) {
            window.location.href = "/dashboard";
        }

    } catch (error) {
        errorMessage.textContent =
            "Unable to connect to the server.";
    }
});