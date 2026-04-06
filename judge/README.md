# Persisto - Online Judge Platform

A full-stack code evaluation system designed for real-time submission and secure execution of untrusted code.

## 🚀 Key Features
* **Secure Sandbox:** Utilizes Docker containers to isolate user code execution, preventing unauthorized system access.
* **Resource Management:** Implements CPU and Memory limits to handle infinite loops or memory-intensive submissions.
* **RESTful Architecture:** Backend built with Node.js and Express to manage users, problems, and submission state.
* **AI Assistance:** Integrated Gemini API for providing intelligent code hints and feedback.

## 🛠️ Tech Stack
* **Frontend:** React.js (Client)
* **Backend:** Node.js, Express
* **Database:** MongoDB
* **DevOps:** Docker, Git

## 🧠 Technical Challenge: The Sandbox
The primary challenge was executing untrusted code without compromising the host server. I solved this by spawning ephemeral Docker containers for each submission. This ensures that even if a user submits malicious code, it is contained within a restricted, short-lived environment.
