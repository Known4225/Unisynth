var firebase = window.firebase;

function authenticate() {
    const provider = new firebase.GoogleAuthProvider();
    return firebase.signInWithPopup(firebase.auth, provider);
}

function addData() {
    if (document.getElementById("key").value != "" && document.getElementById("duration").value != "") {
        let timestamp = Date.now();
        let key = document.getElementById("key").value;
        document.getElementById("key").value = "";
        let duration = document.getElementById("duration").value;
        document.getElementById("duration").value = "";

        firebase.push(firebase.ref(firebase.database, "Piano/"), {
            Timestamp: timestamp,
            Key: key,
            Duration: duration
        })
        .then(() => {
            // alert("success!");
        })
        .catch((error) => {
            alert(error);
        })
    } else {
        alert("must fill key and duration fields");
    }
}

var timestamp = {};
var key = {};
var velocity = {};
var duration = {};

function subnodeDFS(node) {
    if (node == null || node.key == null) {
        return;
    }
    // console.log(node.key);
    switch(node.key) {
        case "T": // Timestamp
        timestamp = document.createElement("td");
        let timestampValue = node.value.value_;
        timestamp.appendChild(document.createTextNode(timestampValue));
        break;

        case "K": // Key
        key = document.createElement("td");
        let keyValue = node.value.value_;
        key.appendChild(document.createTextNode(keyValue));
        break;

        case "D": // Duration
        duration = document.createElement("td");
        let durationValue = node.value.value_;
        duration.appendChild(document.createTextNode(durationValue));
        break;

        case "V": // Velocity
        velocity = document.createElement("td");
        let velocityValue = node.value.value_;
        velocity.appendChild(document.createTextNode(velocityValue));
        break;
    }

    subnodeDFS(node.left);
    subnodeDFS(node.right);
}

function databaseDFS(table, node) {
    if (node == null || node.key == null) {
        return;
    }
    let input = document.createElement("tr");
    let id = document.createElement("td");
    let idValue = node.key;
    id.appendChild(document.createTextNode(idValue));
    

    let subnode = node.value.children_.root_;
    subnodeDFS(subnode);
    input.appendChild(id);
    input.appendChild(timestamp);
    input.appendChild(key);
    input.appendChild(velocity);
    input.appendChild(duration);
    table.appendChild(input);

    databaseDFS(table, node.left);
    databaseDFS(table, node.right);
}

function streamData() {
    firebase.get(firebase.ref(firebase.database))
    .then((snapshot) => {
        // console.log(snapshot);
        let body = document.getElementsByTagName("body")[0];
        let table = document.getElementById("pianodata");
        table.innerHTML = "";
        // add headers
        let input = document.createElement("tr");
        let id = document.createElement("td");
        id.appendChild(document.createTextNode("ID"));
        let timestamp = document.createElement("td");
        timestamp.appendChild(document.createTextNode("Timestamp"));
        let key = document.createElement("td");
        key.appendChild(document.createTextNode("Key"));
        let velocity = document.createElement("td");
        velocity.appendChild(document.createTextNode("Velocity"));
        let duration = document.createElement("td");
        duration.appendChild(document.createTextNode("Duration"));
        
        input.appendChild(id);
        input.appendChild(timestamp);
        input.appendChild(key);
        input.appendChild(velocity);
        input.appendChild(duration);
        table.appendChild(input);
        // console.log(snapshot);
        if (snapshot._node.children_.root_ != null && snapshot._node.children_.root_.value != null) {
            var dbNode = snapshot._node.children_.root_.value.children_.root_; // okay so it's a tree structure
            // console.log(dbNode);
            // add data
            databaseDFS(table, dbNode); // do depth first search idk
            // alert("successfully got data!");
        }
    })
    .catch((error) => {
        alert(error);
    })   
}
