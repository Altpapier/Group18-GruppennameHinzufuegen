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
                (user) => Date.now() - user.time < 20000,
            );
            console.log(`Online users: ${onlineUsers.length}`);
            document.getElementById("participant-count").innerText = onlineUsers.length;
        } else if (request.status === 404) {
            console.log("No onlineUsers document found.");
            document.getElementById("participant-count").innerText = "0";
        }
    }
};

function beenden() {
    const courseId = window.location.search.split("courseId=")[1];
    window.location.href = `summary_lecturer.html?courseId=${courseId}`;
}

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

function startSurvey(surveyData) {
    const checkReq = new XMLHttpRequest();
    checkReq.open("GET", dbUrl + "survey", false);
    checkReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    checkReq.send();

    if (checkReq.status === 200) {
        deleteSurvey();
        startSurvey(surveyData);
        return;
    }

    const surveyDoc = {
        name: surveyData.name,
        ratingType: surveyData.ratingType,
        options: surveyData.options || [],
        votes: [],
        createdAt: new Date().toISOString(),
    };

    const createReq = new XMLHttpRequest();
    createReq.open("PUT", dbUrl + "survey", false);
    createReq.setRequestHeader("Content-type", "application/json");
    createReq.setRequestHeader("Authorization", "Basic " + btoa(loginName + ":" + loginPassword));
    createReq.send(JSON.stringify(surveyDoc));

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

    const surveyTitle = document.getElementById("survey-title");
    const surveyContent = document.getElementById("survey-content");

    surveyTitle.innerText = response.name || "Umfrage";

    const ratingType = response.ratingType;
    const votes = response.votes || [];

    if (ratingType === "thumb") {
        const positive = votes.filter((v) => v === 1 || v === "1").length;
        const negative = votes.filter((v) => v === 0 || v === "0").length;
        const total = positive + negative;
        const positivePercent = total > 0 ? ((positive / total) * 100).toFixed() : 0;
        const negativePercent = total > 0 ? ((negative / total) * 100).toFixed() : 0;

        surveyContent.innerHTML = `
            <div style="display: flex; justify-content: center" class="overview">
                <div class="stat-box">
                    <span class="emoji">👍</span>
                    <h3>${positivePercent}%</h3>
                    <small>(${positive} Stimmen)</small>
                </div>
                <div class="stat-box">
                    <span class="emoji">👎</span>
                    <h3>${negativePercent}%</h3>
                    <small>(${negative} Stimmen)</small>
                </div>
            </div>
            <div class="progress-wrapper">
                <div class="progress" role="progressbar">
                    <div class="progress-fill" style="width: ${positivePercent}%"></div>
                </div>
            </div>
        `;
    } else if (ratingType === "smiley") {
        const average = votes.length
            ? votes.reduce((a, b) => parseInt(a) + parseInt(b), 0) / votes.length / 4
            : 0;
        const positivePercent = (average * 100).toFixed();
        const negativePercent = ((1 - average) * 100).toFixed();

        surveyContent.innerHTML = `
            <div style="display: flex; justify-content: center" class="overview">
                <div class="stat-box">
                    <span class="emoji">😀</span>
                    <h3>${positivePercent}%</h3>
                </div>
                <div class="stat-box">
                    <span class="emoji">😧</span>
                    <h3>${negativePercent}%</h3>
                </div>
            </div>
            <div class="progress-wrapper">
                <div class="progress" role="progressbar">
                    <div class="progress-fill" style="width: ${positivePercent}%"></div>
                </div>
            </div>
            <p>Durchschnitt: ${votes.length ? (votes.reduce((a, b) => parseInt(a) + parseInt(b), 0) / votes.length).toFixed(1) : 0} / 4</p>
            <p>Anzahl Stimmen: ${votes.length}</p>
        `;
    } else if (ratingType === "1-10-Points") {
        const average = votes.length
            ? votes.reduce((a, b) => parseInt(a) + parseInt(b), 0) / votes.length
            : 0;
        const averagePercent = ((average / 10) * 100).toFixed();

        surveyContent.innerHTML = `
            <div style="display: flex; justify-content: center; flex-direction: column; align-items: center" class="overview">
                <div class="stat-box" style="min-width: 150px;">
                    <span class="emoji">📊</span>
                    <h3>${average.toFixed(1)} / 10</h3>
                    <small>Durchschnitt</small>
                </div>
            </div>
            <div class="progress-wrapper">
                <div class="progress" role="progressbar">
                    <div class="progress-fill" style="width: ${averagePercent}%"></div>
                </div>
            </div>
            <p>Anzahl Stimmen: ${votes.length}</p>
        `;
    } else if (ratingType === "custom-single" || ratingType === "custom-multiple") {
        const options = response.options || [];
        const voteCounts = {};

        options.forEach((opt) => (voteCounts[opt] = 0));
        votes.forEach((vote) => {
            if (Array.isArray(vote)) {
                vote.forEach((v) => {
                    if (voteCounts[v] !== undefined) voteCounts[v]++;
                });
            } else {
                if (voteCounts[vote] !== undefined) voteCounts[vote]++;
            }
        });

        const totalVotes = votes.length;

        let optionsHtml = '<div class="custom-results" style="width: 100%;">';
        options.forEach((opt) => {
            const count = voteCounts[opt];
            const percent = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed() : 0;
            optionsHtml += `
                <div class="option-result" style="margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.25rem;">
                        <span>${opt}</span>
                        <span>${count} Stimmen (${percent}%)</span>
                    </div>
                    <div class="progress-wrapper">
                        <div class="progress" role="progressbar">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
            `;
        });
        optionsHtml += "</div>";

        surveyContent.innerHTML = `
            <p style="margin-bottom: 1rem;">Typ: ${ratingType === "custom-single" ? "Einfachauswahl" : "Mehrfachauswahl"}</p>
            ${optionsHtml}
            <p>Anzahl Teilnehmer: ${totalVotes}</p>
        `;
    } else {
        // für den unwahrscheinlich fall, dass der typ for some fucking reason nicht existiert
        surveyContent.innerHTML = `<p>Unbekannter Umfragetyp: ${ratingType}</p><p>Stimmen: ${votes.length}</p>`;
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
