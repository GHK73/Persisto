const express = require("express");
const app = express();
const cors = require("cors");
const { DBConnection } = require("./database/db");
const User = require("./Models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Connect to the database
DBConnection();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5500;

app.post('/register', async (req, res) => {
    try {
        const { name, phone_number, email, password } = req.body;

        if (!(name && phone_number && email && password)) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            phone_number,
            email,
            password: hashedPassword,
        });

        const token = jwt.sign(
            { id: user._id, email },
            process.env.SECRET_KEY,
            { expiresIn: '2h' }
        );

        res.status(200).json({
            message: 'You have successfully registered!',
            user: { id: user._id, name: user.name, email: user.email },
            token
        });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
