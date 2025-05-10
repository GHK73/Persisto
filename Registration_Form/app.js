document.getElementById("registerForm").addEventListener("submit", function(e){
    e.preventDefault();

    const name = document.getElementsByName("name")[0].value;
    const phone_number = document.getElementsByName("phone_number")[0].value;
    const email = document.getElementsByName("email")[0].value; 
    const password = document.getElementsByName("password")[0].value;
    const confirmPassword = document.getElementsByName("confirm_Password")[0].value;

    if(!(name &&  phone_number && email && password)){
        alert("Please Enter all Information!");
        return;
    }

    if(password != confirmPassword){
        alert("Passwords do not match");
        return;
    }

    fetch('http://localhost:3000/register',{
        method:'Post',
        headers : {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({name, phone_number, email, password})
    })
    .then(response=> response.json)
    .then(data =>{
        alert("User Registered: "+ data.message);
    })
    .catch(error=>{
        console.error("Error",error);
    });

})