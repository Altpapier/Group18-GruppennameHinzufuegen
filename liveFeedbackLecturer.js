const loginName = "admin";
const loginPassword = "mysecretpassword";

const dbName = "livefeedback";
const dbUrl = `http://127.0.0.1:5984/${dbName}/`;

let lastFeedbackData = "";
const request = new XMLHttpRequest();
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
            displaySurvey(response);
        } else if (request.status === 404) {
            console.log("No survey found. There is no survey active.");
            displayNoSurvey();
        }
    } else if (request.responseURL === dbUrl + "feedback") {
        if (request.status === 200) {
            displayFeedback(response);
        } else if (request.status === 404) {
            console.log("No feedback document found.");
            document.getElementById("notification-container").innerHTML = "";
        }
    } else if (request.responseURL === dbUrl + "onlineUsers") {
        if (request.status === 200) {
            const onlineUsers = response.onlineUsers.filter(
                (user) => Date.now() - user.time < 10000,
            );
            console.log(`Online users: ${onlineUsers.length}`);
            document.getElementById("participant-count").innerText = onlineUsers.length;
        } else if (request.status === 404) {
            console.log("No onlineUsers document found.");
            document.getElementById("participant-count").innerText = "0";
        }
    }
};

window.addEventListener("load", async () => {
    get();
});

const interval = setInterval(check, 1000);

function check() {
    get("survey");
    get("feedback");
    get("onlineUsers");
}

function displayPopup() {
    document.getElementById("survey-popup").style.display = "flex";
}

function hidePopup() {
    document.getElementById("survey-popup").style.display = "none";
}

const typeToText = {
    problem: "Verständnisproblem, bitte nochmal erklären",
    good: "Verstanden, kann weiter gehen",
    fast: "Zu schnell, bitte langsamer",
    slow: "Zu langsam, bitte schneller",
    loud: "Zu laut, bitte leiser",
    silent: "Zu leise, bitte lauter",
};

function displayFeedback(response) {
    const feedbackList = response.feedback || [];
    const currentData = JSON.stringify(feedbackList);

    if (currentData !== lastFeedbackData) {
        lastFeedbackData = currentData;
        const container = document.getElementById("notification-container");
        container.innerHTML = "";

        feedbackList.forEach((item, index) => {
            const timeDiff = Date.now() - item.time;
            const minutes = Math.floor(timeDiff / 60000);
            const timeString = minutes <= 0 ? "jetzt" : `vor ${minutes} ${n("Minute", minutes)}`;

            const box = document.createElement("div");
            box.className = "notification-box";
            box.innerHTML = `
                <div class="notification-content">
                    <span class="notification-type">${typeToText[item.type]}</span>
                    <span class="notification-time">${timeString}</span>
                </div>
                <button class="close-btn" onclick="removeFeedback(${index})">✕</button>
            `;
            container.appendChild(box);
        });
    }
}

function n(string, length) {
    return length === 1 ? string : string + "n";
}

function removeFeedback(index) {
    const getReq = new XMLHttpRequest();
    getReq.open("GET", dbUrl + "feedback", false);
    getReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    getReq.send();

    if (getReq.status === 200) {
        const doc = JSON.parse(getReq.responseText);
        if (doc.feedback && doc.feedback[index]) {
            doc.feedback.splice(index, 1);

            const putReq = new XMLHttpRequest();
            putReq.open("PUT", dbUrl + "feedback", false);
            putReq.setRequestHeader("Content-type", "application/json");
            putReq.setRequestHeader(
                "Authorization",
                "Basic " + btoa(loginName + ":" + loginPassword),
            );
            putReq.send(JSON.stringify(doc));

            lastFeedbackData = "";
            get("feedback");
        }
    }
}

function startSurvey() {
    const checkReq = new XMLHttpRequest();
    checkReq.open("GET", dbUrl + "survey", false);
    checkReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    checkReq.send();

    if (checkReq.status === 200) {
        deleteSurvey();
        startSurvey();
        return;
    }

    const createReq = new XMLHttpRequest();
    createReq.open("PUT", dbUrl + "survey", false);
    createReq.setRequestHeader("Content-type", "application/json");
    createReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    createReq.send(JSON.stringify({ votes: [] }));

    setShowSurvey(true);

    hidePopup();
}

function setShowSurvey(value) {
    const getShowReq = new XMLHttpRequest();
    getShowReq.open("GET", dbUrl + "showSurvey", false);
    getShowReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    getShowReq.send();

    let showData = { value };
    if (getShowReq.status === 200) {
        const resp = JSON.parse(getShowReq.responseText);
        showData._rev = resp._rev;
    }

    const setShowReq = new XMLHttpRequest();
    setShowReq.open("PUT", dbUrl + "showSurvey", false);
    setShowReq.setRequestHeader("Content-type", "application/json");
    setShowReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    setShowReq.send(JSON.stringify(showData));
}

function displaySurvey(response) {
    console.log(response);
    document.getElementById("survey").style.display = "flex";
    document.getElementById("no-survey").style.display = "none";
    const average = response.votes.length
        ? response.votes.reduce((a, b) => parseInt(a) + parseInt(b)) / response.votes.length / 4
        : 0;
    if (response.votes.length) {
        document.getElementById("positive-feedback").innerText = (average * 100).toFixed() + "%";
        document.getElementById("negative-feedback").innerText =
            ((1 - average) * 100).toFixed() + "%";
        document.getElementById("progress-fill").outerHTML =
            `<div class="progress-fill" id="progress-fill" style="width: ${(
                average * 100
            ).toFixed()}%"></div>`;
    } else {
        document.getElementById("positive-feedback").innerText = "0%";
        document.getElementById("negative-feedback").innerText = "0%";
        document.getElementById("progress-fill").outerHTML =
            `<div class="progress-fill" id="progress-fill" style="width: 0%"></div>`;
    }
}

function deleteSurvey() {
    const getReq = new XMLHttpRequest();
    getReq.open("GET", dbUrl + "survey", false);
    getReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    getReq.send();

    if (getReq.status === 200) {
        const response = JSON.parse(getReq.responseText);
        const req = new XMLHttpRequest();
        req.open("DELETE", dbUrl + "survey?rev=" + response._rev, false);
        req.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
        req.send();
    }

    setShowSurvey(false);
}

function displayNoSurvey() {
    document.getElementById("survey").style.display = "none";
    document.getElementById("no-survey").style.display = "flex";
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
