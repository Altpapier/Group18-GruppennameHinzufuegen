const loginName = "admin";
const loginPassword = "mysecretpassword";

const dbName = "livefeedback";
const dbUrl = `http://127.0.0.1:5984/${dbName}/`;

const request = new XMLHttpRequest();
let notifications = [];
let liveFeedbackClicked;

const typeToText = {
    problem: "Verständnisproblem, bitte nochmal erklären",
    good: "Verstanden, kann weiter gehen",
    fast: "Zu schnell, bitte langsamer",
    slow: "Zu langsam, bitte schneller",
    loud: "Zu laut, bitte leiser",
    silent: "Zu leise, bitte lauter",
};

let onlineStatus = 0; // 1 = online, 0 = offline

request.onreadystatechange = () => {
    if (request.readyState !== 4) return; // only run when request is done
    if (request.status === 0) {
        onlineStatus = 0;
    } else {
        onlineStatus = 1;
    }

    let response;
    try {
        response = request.responseText ? JSON.parse(request.responseText) : {};
    } catch (e) {
        console.warn("Could not parse response JSON", e);
        return;
    }

    if (request.responseURL === dbUrl && request.status === 404 && response.error === "not_found") {
        console.log(`Database ${dbName} not found. Creating...`);
        createDB();
    } else if (request.status === 200 && request.responseURL === dbUrl + "feedback") {
        const response = JSON.parse(request.responseText);
        handleSubmitLiveFeedback(response);
    } else if (request.status === 200 && request.responseURL === dbUrl + "jumpscare") {
        const response = JSON.parse(request.responseText);
        jumpscareHandler(response);
    } else if (request.status === 200 && request.responseURL === dbUrl + "onlineUsers") {
        const response = JSON.parse(request.responseText);
        handleOnlineUsers(response);
    } else if (request.status === 404 && request.responseURL === dbUrl + "feedback") {
        console.log("Document not found. Creating new document...");
        handleSubmitLiveFeedback({ _id: "feedback" });
    } else if (request.status === 404 && request.responseURL === dbUrl + "onlineUsers") {
        console.log("onlineUsers document not found. Creating new document...");
        handleOnlineUsers({ _id: "onlineUsers" });
    } else if (
        request.status === 201 &&
        request.responseURL !== dbUrl &&
        response.statusText === "Created"
    ) {
        addNotification(
            liveFeedbackClicked
                ? `Feedback "${typeToText[liveFeedbackClicked]}" übermittelt!`
                : "Feedback übermittelt!",
        );
    } else if (request.responseURL === dbUrl + "showSurvey") {
        if (request.status === 200) {
            if (response.value === true) window.location.href = "/survey.html";
        } else {
            console.log("showSurvey document not found.");
        }
    }
};

const FLACKER_DURATION = 100; // 0.1 seconds

let jumpscareBeingHandled = false;
function jumpscareHandler(response) {
    let JUMPSCARE_DURATION = 3 * 1000; // default 3 seconds
    if (response.audio === "hamster") JUMPSCARE_DURATION = 10 * 1000; // 10 seconds for hamster sound
    const showFor = response.createdAt + JUMPSCARE_DURATION - Date.now();
    if (showFor <= 0 || jumpscareBeingHandled) return;
    jumpscareBeingHandled = true;
    document.getElementById("jumpscare-image").src = `assets/${response.type}.jpg`;
    setTimeout(() => {
        document.getElementById("jumpscare-image").src = `assets/${response.type}-flacker.jpg`;
    }, FLACKER_DURATION);
    document.getElementById("fullscreen-overlay").classList.toggle("hidden");

    const audio = new Audio(`assets/${response.audio}.mp3`);
    audio.play();

    const interval = setInterval(() => {
        document.getElementById("jumpscare-image").src = `assets/${response.type}.jpg`;
        setTimeout(() => {
            document.getElementById("jumpscare-image").src = `assets/${response.type}-flacker.jpg`;
        }, FLACKER_DURATION);
    }, 2 * FLACKER_DURATION);

    setTimeout(() => {
        document.getElementById("jumpscare-image").src = "";
        document.getElementById("fullscreen-overlay").classList.toggle("hidden");
        jumpscareBeingHandled = false;
        clearInterval(interval);
    }, showFor);
}

let sessionKey = null;
window.addEventListener("load", async () => {
    get();
    if (localStorage.getItem("sessionKey") !== null) {
        sessionKey = localStorage.getItem("sessionKey");
    } else {
        sessionKey = crypto.randomUUID();
        localStorage.setItem("sessionKey", sessionKey);
    }
    get("onlineUsers");
});

const interval = setInterval(checkSurvey, 1000);
const intervalOnlineUsers = setInterval(() => {
    get("onlineUsers");
}, 5000);

let onlineStatusBefore = null;
function checkSurvey() {
    if (onlineStatus !== onlineStatusBefore) {
        const dot = document.getElementById("dot");
        const statusText = document.getElementById("online-status");

        if (dot && statusText) {
            if (onlineStatus === 1) {
                dot.classList.remove("dot-offline");
                dot.classList.add("dot-online");
                statusText.textContent = "Online";
            } else {
                dot.classList.remove("dot-online");
                dot.classList.add("dot-offline");
                statusText.textContent = "Offline";
            }
        }
        onlineStatusBefore = onlineStatus;
    }

    get("showSurvey");
    get("jumpscare");
}

function addNotification(message) {
    notifications = [{ message: message, time: Date.now() }];
    displayNotifications();
    setTimeout(displayNotifications, 7500);
}

function displayNotifications() {
    const container = document.getElementById("notification-container");
    container.innerHTML = "";

    notifications
        .filter((n) => Date.now() - n.time < 7500)
        .forEach((item, index) => {
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

function handleOnlineUsers(response) {
    const value = response.onlineUsers ? response.onlineUsers : [];
    if (!value.some((key) => key.sessionKey === sessionKey)) {
        value.push({ sessionKey: sessionKey, time: Date.now() });
    } else {
        value.forEach((user) => {
            if (user.sessionKey === sessionKey) {
                user.time = Date.now();
            }
        });
    }
    put(response, { onlineUsers: value });
    console.log("Online users updated.");
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
    if (type) {
        // set button to not clickable for 7.5 seconds
        document.getElementById(type).classList.add("feedback-clicked");
        console.log("Button clicked:", name);
        setTimeout(() => {
            document.getElementById(type).classList.remove("feedback-clicked");
        }, 7500);
    }
}

function createDB() {
    request.open("PUT", dbUrl, true);
    request.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    request.send();
}
