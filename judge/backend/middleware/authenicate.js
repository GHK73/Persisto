import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const secret_key = process.env.SECRET_KEY;

export const authenicate = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith('Bearer ')){ 
        return res.status(401).json({message: 'Login required'});
    }
    const token = authHeader.split(' ')[1];

    try{
        const decoded = jwt.verify(token,secret_key );
        req.user = decoded;
        next();
    }catch(error){
        return res.status(403).json({message:'Login failed'});
    }
};