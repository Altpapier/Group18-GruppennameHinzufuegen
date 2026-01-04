const loginName = "admin";
const loginPassword = "mysecretpassword";

const dbName = "livefeedback";
const dbUrl = `http://127.0.0.1:5984/${dbName}/`;

const request = new XMLHttpRequest();
const notifications = [];
let liveFeedbackClicked;

const typeToText = {
    problem: "Verständnisproblem, bitte nochmal erklären",
    good: "Verstanden, kann weiter gehen",
    fast: "Zu schnell, bitte langsamer",
    slow: "Zu langsam, bitte schneller",
    loud: "Zu laut, bitte leiser",
    silent: "Zu leise, bitte lauter",
};

request.onreadystatechange = () => {
    if (request.readyState !== 4) return; // only run when request is done
    console.log(request);
    const response = JSON.parse(request.responseText);
    if (request.responseURL === dbUrl && request.status === 404 && response.error === "not_found") {
        console.log(`Database ${dbName} not found. Creating...`);
        createDB();
    } else if (request.status === 200 && request.responseURL === dbUrl + "feedback") {
        const response = JSON.parse(request.responseText);
        handleSubmitLiveFeedback(response);
    } else if (request.status === 404 && request.responseURL !== dbUrl) {
        console.log("Document not found. Creating new document...");
        handleSubmitLiveFeedback({ _id: "feedback" });
    } else if (
        request.status === 201 &&
        request.responseURL !== dbUrl &&
        response.statusText === "Created"
    ) {
        addNotification(
            liveFeedbackClicked
                ? `Feedback "${typeToText[liveFeedbackClicked]}" übermittelt!`
                : "Feedback übermittelt!"
        );
    } else if (request.responseURL === dbUrl + "showSurvey") {
        if (request.status === 200) {
            if (response.value === true) window.location.href = "/survey.html";
        } else {
            console.log("showSurvey document not found.");
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

function handleSubmitLiveFeedback(response) {
    const value = response.feedback ? response.feedback : [];
    value.push({ type: liveFeedbackClicked, time: Date.now() });
    put(response, { feedback: value });
    addNotification(`Feedback "${typeToText[liveFeedbackClicked]}" übermittelt!`);
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

function set(name, type) {
    request.open("GET", dbUrl + name, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    request.withCredentials = true;
    request.send();
    liveFeedbackClicked = type;
}

function createDB() {
    request.open("PUT", dbUrl, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    request.send();
}
