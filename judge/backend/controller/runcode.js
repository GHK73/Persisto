import dotenv from 'dotenv';
import {generateFile} from '../generateFile.js';
dotenv.config();

export const runcode = async(req, res) =>{
    const {language='cpp', code} = req.body;
    if(code == undefined){
        return res.status(400).json({sucess:false, error:'code is required'});
    }
    try{
        const filePath = generateFile(language, code);
        
    }catch(error){
        console.error("Error in running code",error.message);
        return res.status(500).json({success: false, erro : error.message});
    }
    res.json({languge,code});
};