window.onload = function() {
    if (localStorage.getItem("body-dark") == "true") {
        document.body.classList.add("dark");
    }
    document.body.classList.add("transition");
    document.body.style.display = "inherit";
};

function toggle() {
    document.body.classList.toggle("dark");
    localStorage.setItem("body-dark", document.body.classList.contains("dark")? "true":"false");
}