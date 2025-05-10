const express = require('express');
const app = express();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const {DBConnection} = require("./database/db");
const User = require("./Models/User")

app.use(express.json());

app.use(express.json());
app.use(express.urlencoded({extended: true}));

app.post('/register',async(req, res)=>{
    try{
        const { name, phone_number, email, password} = req.body;

        const existingUser = await User.findOne({email});
        if(existingUser){
            return res.status(400).send("User already exists with the same email");
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            name,
            phone_number,
            email,
            password:hashedPassword,
        });

        const token = jwt.sign({id:user._id,email},
        process.env.Secret_KEY,{expiresIn: '2h',});
        user.token = token;
        user.password = undefined;
        res.status(200).json({ message: 'You have successfully registered!', user });
    }catch(error){
        console.log(error);
        res.status(500).send("Something went wrong");
    }
    
});