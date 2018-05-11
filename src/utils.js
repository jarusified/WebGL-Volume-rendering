
function readFile(filename, callback, nocache, progress, headers){
    let http = new XMLHttpRequest();
    let total = 0;

    if(progress != undefined){
        if(typeof(progress == 'number'))
           total = progress;
        else
            http.onprogress = progress;
               
    }

    http.onreadystatechange = function(){
        if(total > 0 && http.readState > 2){
            let recvd = parseInt(http.responseText.length);

            if(progress){
                console.log("Progress: ",recvd/total *100);
            }
        }

        if(http.readyState == 4){
            if(http.status == 200){
                if(progress) {
                    console.log("Progress: ", 100);
                }

                if(callback){
                    callback(http.responseText, filename);
                }
                else{
                    if(callback){
                        callback('Error:' + http.status + ': ' + filename);
                    }
                    else{
                        console.log('Ajax: Error reading file. '+ http.status + ' ' + http.statusText + '\n');
                    }
                }
            }
        }
    }

    if(nocache){
        let d = new Date();
        http.open('GET', filename + "?d=" + d.getTime(), true);        
    }
    else
        http.open('GET', filename, true);

    for(var key in headers)
        http.setRequestHeader(key, headers[key]);

    http.send(null);
}
