const myForm = document.getElementById('login-form');
document.getElementById('login-form').addEventListener('submit', function(e){
    e.preventDefault();
    const data = new FormData(myForm);
    data.append("button", myForm.submited);
    fetch('/auth',
        {
            method: "post",
            body: data
        }
    ).then(function(response){
        return response.status;
    }).then(function(status){
        if(status == 200){
            window.location.replace('/dashboard');
        }
        if(status == 401){
            document.getElementById('error').innerHTML = "Wrong username or password !";
        }
        if(status == 400){
            document.getElementById('error').innerHTML = "Username already exists !";
        }
        if(status == 500){
            window.location.replace('/dberror');
        }
        if(status == 201){
            document.getElementById('error').innerHTML = "Username created !"
        }
    });
})
