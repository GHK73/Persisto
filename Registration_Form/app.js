document.getElementById("registerForm").addEventListener("submit", async function(e) {
    e.preventDefault();

    const name = document.getElementsByName("name")[0].value.trim();
    const phone_number = document.getElementsByName("phone_number")[0].value.trim();
    const email = document.getElementsByName("email")[0].value.trim();
    const password = document.getElementsByName("password")[0].value;
    const confirmPassword = document.getElementsByName("confirm_Password")[0].value;
    const responseMsg = document.getElementById("responseMsg");

    if (!(name && phone_number && email && password)) {
        responseMsg.textContent = "Please enter all information!";
        responseMsg.style.color = "red";
        return;
    }

    if (password !== confirmPassword) {
        responseMsg.textContent = "Passwords do not match!";
        responseMsg.style.color = "red";
        return;
    }

    try {
        const response = await fetch('http://localhost:5500/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, phone_number, email, password })
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw new Error("Invalid or empty JSON response from server");
        }

        if (!response.ok) {
            throw new Error(data.message || 'Registration failed');
        }

        responseMsg.textContent = "✅ " + data.message;
        responseMsg.style.color = "green";
        document.getElementById("registerForm").reset();
    } catch (error) {
        console.error("Error:", error);
        responseMsg.textContent = "❌ Registration failed: " + error.message;
        responseMsg.style.color = "red";
    }
});
