const loginName = "admin";
const loginPassword = "mysecretpassword";

const dbName = "livefeedback";
const dbUrl = `http://127.0.0.1:5984/${dbName}/`;

const request = new XMLHttpRequest();
const notifications = [];
let currentSurvey = null;

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
            currentSurvey = response;
            displaySurveyOptions(response);
        } else if (request.status === 404) {
            console.log("No survey found.");
            window.location.href = "/index.html";
        }
    }
};

window.addEventListener("load", async () => {
    get();
    loadSurvey();
});

const interval = setInterval(checkSurvey, 1000);

function checkSurvey() {
    get("showSurvey");
}

function loadSurvey() {
    const req = new XMLHttpRequest();
    req.open("GET", dbUrl + "survey", false);
    req.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    req.send();

    if (req.status === 200) {
        currentSurvey = JSON.parse(req.responseText);
        displaySurveyOptions(currentSurvey);
    } else {
        console.log("No survey found.");
    }
}

function displaySurveyOptions(survey) {
    const questionEl = document.getElementById("frage");
    const optionsContainer = document.getElementById("survey-options");

    questionEl.innerText = survey.name || "Umfrage";
    optionsContainer.innerHTML = "";

    const ratingType = survey.ratingType;

    if (ratingType === "thumb") {
        optionsContainer.className = "radio flex rating";
        optionsContainer.innerHTML = `
            <label>
                <input type="radio" name="vote" value="1" />
                <span>👍</span>
            </label>
            <label>
                <input type="radio" name="vote" value="0" />
                <span>👎</span>
            </label>
        `;
    } else if (ratingType === "smiley") {
        optionsContainer.className = "radio flex rating";
        optionsContainer.innerHTML = `
            <label>
                <input type="radio" name="vote" value="4" />
                <span>😀</span>
            </label>
            <label>
                <input type="radio" name="vote" value="3" />
                <span>😊</span>
            </label>
            <label>
                <input type="radio" name="vote" value="2" />
                <span>😐</span>
            </label>
            <label>
                <input type="radio" name="vote" value="1" />
                <span>☹️</span>
            </label>
            <label>
                <input type="radio" name="vote" value="0" />
                <span>😧</span>
            </label>
        `;
    } else if (ratingType === "1-10-Points") {
        optionsContainer.className = "radio flex rating points-rating";
        let html = "";
        for (let i = 1; i <= 10; i++) {
            html += `
                <label>
                    <input type="radio" name="vote" value="${i}" />
                    <span>${i}</span>
                </label>
            `;
        }
        optionsContainer.innerHTML = html;
    } else if (ratingType === "custom-single") {
        optionsContainer.className = "custom-options";
        const options = survey.options || [];
        let html = "";
        options.forEach((opt, index) => {
            html += `
                <label class="custom-option-label">
                    <input type="radio" name="vote" value="${opt}" />
                    <span>${opt}</span>
                </label>
            `;
        });
        optionsContainer.innerHTML = html;
    } else if (ratingType === "custom-multiple") {
        optionsContainer.className = "custom-options";
        const options = survey.options || [];
        let html = "";
        options.forEach((opt, index) => {
            html += `
                <label class="custom-option-label">
                    <input type="checkbox" name="vote" value="${opt}" />
                    <span>${opt}</span>
                </label>
            `;
        });
        optionsContainer.innerHTML = html;
    } else {
        optionsContainer.innerHTML = "<p>Unbekannter Umfragetyp</p>";
    }
}

function submitVote() {
    if (!currentSurvey) {
        addNotification("Keine aktive Umfrage gefunden!");
        return;
    }

    const ratingType = currentSurvey.ratingType;
    let voteValue;

    if (ratingType === "custom-multiple") {
        const checkedBoxes = document.querySelectorAll('input[name="vote"]:checked');
        if (checkedBoxes.length === 0) {
            addNotification("Bitte mindestens eine Option auswählen!");
            return;
        }
        voteValue = Array.from(checkedBoxes).map((cb) => cb.value);
    } else {
        const selectedOption = document.querySelector('input[name="vote"]:checked');
        if (!selectedOption) {
            addNotification("Keine Option ausgewählt!");
            return;
        }
        voteValue = selectedOption.value;
    }

    const req = new XMLHttpRequest();
    req.open("GET", dbUrl + "survey", false);
    req.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    req.send();

    if (req.status === 200) {
        const surveyDoc = JSON.parse(req.responseText);
        const votes = surveyDoc.votes || [];
        votes.push(voteValue);

        put(surveyDoc, {
            name: surveyDoc.name,
            ratingType: surveyDoc.ratingType,
            options: surveyDoc.options,
            votes: votes,
            createdAt: surveyDoc.createdAt,
        });

        addNotification("Feedback übermittelt!");

        const showReq = new XMLHttpRequest();
        showReq.open("GET", dbUrl + "showSurvey", false);
        showReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
        showReq.send();
        if (showReq.status === 200) {
            const doc = JSON.parse(showReq.responseText);
            doc.value = false;
            const putReq = new XMLHttpRequest();
            putReq.open("PUT", dbUrl + "showSurvey", true);
            putReq.setRequestHeader("Content-type", "application/json");
            putReq.setRequestHeader(
                "Authorization",
                "Basic " + btoa(loginName + ":" + loginPassword),
            );
            putReq.send(JSON.stringify(doc));
        }
    } else {
        addNotification("Fehler beim Speichern!");
    }
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

function n(string, length) {
    return length === 1 ? string : string + "n";
}

function removeNotification(index) {
    notifications.splice(index, 1);
    displayNotifications();
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
