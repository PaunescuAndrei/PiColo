function logout(){
    fetch("/logout", {
        method: "POST",
    }).then(res => {
        console.log("Request complete! response:", res);
    });
}

function goDashboard(){
    fetch("/dashboard",{
        method: "GET"
    }).then(res => {
        console.log("Request complete! response:", res);
    });
}

function sendData(sw_id){
    fetch("/delSW",
        {
            method: "POST",
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({"sw_id" : sw_id})
        }
    ).then(function(response){
        return response.status;
    }).then(function(status){
        if(status == 200){
            location.reload();
        }
        if(status == 400){
            fetch('/dberror',{
                method: "GET"
            });
        }
    });
}

function getSW(){
    fetch("/getSW",{
        method: "GET"
    }).then(res =>{
        return res.text();
    }).then(text =>{
        json = JSON.parse(text);
        json.forEach(element => {
            var user_id = element.user_id;
            var sw_id = element.id;
            var lossy = element.is_lossy;
            var quality = element.quality;
            var watermark = element.watermark;
            
            var tr = document.createElement('tr');

            var td = document.createElement('td');
            td.innerHTML = sw_id;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = watermark;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = lossy;
            tr.appendChild(td);

            td = document.createElement('td');
            td.innerHTML = quality;
            tr.appendChild(td);




            // <button type="submit" name="login_button"  class="button" onclick="this.form.submited=this.value;" value="login">Log in</button>
            // <button type="submit" formaction="https://www.w3docs.com">Click me</button>
            var td = document.createElement('td');
            var inputType = document.createElement('button');
            inputType.type = "submit";
            inputType.name = "download_button";
            inputType.className = "btn-blue"
            inputType.onclick = function(){
                window.location.href = `./users/${user_id}/${sw_id}/data/sw.js`;
            }
            inputType.value = sw_id;
            inputType.innerHTML = "Download";
            td.appendChild(inputType);
            tr.append(td);

            td = document.createElement('td');
            inputType = document.createElement('button');
            inputType.type = "submit";
            inputType.name = "download_button";
            inputType.className = "btn-red"
            inputType.onclick = function(){
                sendData(sw_id);
            }
            inputType.value = sw_id
            inputType.innerHTML = "Delete";
            td.appendChild(inputType);
            tr.append(td);

            document.getElementById("table").appendChild(tr);

        });
    });
}