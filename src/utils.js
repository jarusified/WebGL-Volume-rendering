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

function getSearchVariable(variable, defaultVal) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i=0;i<vars.length;i++) {
        var pair = vars[i].split("=");
        if (unescape(pair[0]) == variable) {
            return unescape(pair[1]);
        }
    }
    return defaultVal;
}

//Get some data stored in a script element
function getSourceFromElement(id) {
    var script = document.getElementById(id);
    if (!script) return null;
    var str = "";
    var k = script.firstChild;
    while (k) {
        if (k.nodeType == 3)
            str += k.textContent;
        k = k.nextSibling;
    }
    return str;
}

function getSourceFromShaders(id){
    var script = document.getElementById(id);
    if( !script) return null;
    readFile(script.getAttribute('src'), function(res){
        console.log(res);
        return res;
    });
}
