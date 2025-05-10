const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        default: null,
        required: true,
        trim: true,
    },
    phone_number:{
        type: String,
        default: null,
        required: true,
    },
    email:{
        type: String,
        default: null,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
});

module.exports = mongoose.module("user",userSchema);