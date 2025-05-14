import axios from 'axios';

const API_URL =  'http://localhost:8000';

export const signupUser = async(data)=>{
    try{
        const response = axios.post(`${API_URL}/upload`, data);
    }catch(error){
        console.log("Error while calling the uploading api",error.message);
    }
}