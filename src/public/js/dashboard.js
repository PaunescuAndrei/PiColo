const myForm = document.getElementById('setParams');
document.getElementById('setParams').addEventListener('submit', function(e){
    e.preventDefault();
    const data = new FormData(myForm);
    for (let [key, value] of data.entries()) { 
        console.log(key, value);
    }
    fetch('/addSW', 
        {
            method: "post",
            // credentials: 'include',
            body: data,
        }
    ).then(function(response){
        return response.text();
    }).then(function(text){
        document.getElementById('warning').innerHTML = text;
    })
});

function logout(){
    fetch("/logout", {
        method: "GET"
    }).then(res => {
        console.log("Request complete! response:", res);
    });
}

function mysw(){
    fetch("/mysw",{
        method: "GET"
    }).then(res => {
        console.log("Request complete! response:", res);
    });
}
