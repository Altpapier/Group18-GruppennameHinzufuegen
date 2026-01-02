const loginName = "admin";
const loginPassword = "mysecretpassword";

const dbName = "livefeedback";
const dbUrl = `http://127.0.0.1:5984/${dbName}/`;

const request = new XMLHttpRequest();
const notifications = [];
request.onreadystatechange = () => {
    if (request.readyState !== 4) return; // only run when request is done

    const response = JSON.parse(request.responseText);
    if (request.responseURL === dbUrl && request.status === 404 && response.error === "not_found") {
        console.log(`Database ${dbName} not found. Creating...`);
        createDB();
    } else if (request.responseURL === dbUrl + "showSurvey") {
        if (request.status === 200) {
            if (response.value === false) window.location.href = "/index.html";
        } else {
            console.log("showSurvey document not found.");
        }
    } else if (request.responseURL === dbUrl + "survey") {
        if (request.status === 200) {
            handleSubmit(response);
        } else if (request.status === 404) {
            console.log("Document not found. Creating new document...");
            handleSubmit({ _id: "survey" });
        }
    }
};

window.addEventListener("load", async () => {
    get();
});

const interval = setInterval(checkSurvey, 1000);

function checkSurvey() {
    get("showSurvey");
}

function addNotification(message) {
    notifications.push({ message: message, time: Date.now() });
    displayNotifications();
}

function displayNotifications() {
    const container = document.getElementById("notification-container");
    container.innerHTML = "";

    notifications.forEach((item, index) => {
        const timeDiff = Date.now() - item.time;
        const minutes = Math.floor(timeDiff / 60000);
        const timeString = minutes === 0 ? "jetzt" : `vor ${minutes} ${n("Minute", minutes)}`;

        const box = document.createElement("div");
        box.className = "notification-box";
        box.innerHTML = `
                <div class="notification-content">
                    <span class="notification-type">${item.message}</span>
                    <span class="notification-time">${timeString}</span>
                </div>
                <button class="close-btn" onclick="removeNotification(${index})">✕</button>
            `;
        container.appendChild(box);
    });
}

function removeNotification(index) {
    notifications.splice(index, 1);
    displayNotifications();
}

function handleSubmit(response) {
    const selectedOption = document.querySelector('input[name="smiley"]:checked');
    if (!selectedOption) {
        addNotification("Keine Option ausgewählt!");
        return;
    }
    const value = response.votes ? response.votes : [];
    value.push(selectedOption.value);
    put(response, { votes: value });
    addNotification("Feedback übermittelt!");

    const req = new XMLHttpRequest();
    req.open("GET", dbUrl + "showSurvey", false);
    req.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    req.send();
    if (req.status === 200) {
        const doc = JSON.parse(req.responseText);
        doc.value = false;
        const putReq = new XMLHttpRequest();
        putReq.open("PUT", dbUrl + "showSurvey", true);
        putReq.setRequestHeader("Content-type", "application/json");
        putReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
        putReq.send(JSON.stringify(doc));
    }
}

function get(variable = "") {
    request.open("GET", dbUrl + variable, false);
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    request.send();
}

function put(response, message) {
    request.open("PUT", dbUrl + response._id, true);
    request.setRequestHeader("Content-type", "application/json");
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    message["_id"] = response._id;
    if (response._rev) {
        message["_rev"] = response._rev;
    }
    var s = JSON.stringify(message);
    request.send(s);
}

function set(name) {
    request.open("GET", dbUrl + name, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    request.withCredentials = true;
    request.send();
}

function createDB() {
    request.open("PUT", dbUrl, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    request.send();
}
