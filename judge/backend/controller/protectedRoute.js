export const protectedRoute = (req, res)=>{
    res.status(200).json({message:`Hello, user ${req.user.email}. You are authenticated.`});
}