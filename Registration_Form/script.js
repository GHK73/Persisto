document.getElementById("registerForm").addEventListener("submit",async(e)=>{
    e.preventDefault();
    const form = e.target;

    const data ={
        firstname: form.firstname.value,
        lastname: form.lastname.value,
        email: form.email.value,
        password: form.password.value,
    };

    try {
        const response = await fetch("/api/register",{
            method: "POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify(data),
        });
        const result = await response.json();
        document.getElementById("responseMsg").innerText = result.message || "Registered!";
    
    }catch(error){
        document.getElementById("responseMsg").innerText = "Error submitting form";
        console.error(error);
    }

});