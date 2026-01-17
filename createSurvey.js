// Create Survey Script

let currentCourseId = null;

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    currentCourseId = parseInt(params.get('courseId'));
    
    // Set cancel button href
    const cancelBtn = document.getElementById('cancelBtn');
    if (currentCourseId) {
        cancelBtn.href = `edit_course.html?courseId=${currentCourseId}`;
    } else {
        cancelBtn.href = 'edit_course.html';
    }
    
    initializeCustomOptions();
    initializeSurveyForm();
});

function initializeCustomOptions() {
    const ratingRadios = document.querySelectorAll('input[name="rating_type"]');
    const customMultipleRadio = document.getElementById("custom-multiple");
    const customSingleRadio = document.getElementById("custom-single");
    const customArea = document.getElementById("custom_area");
    const addBtn = document.getElementById("add_option_btn");
    const removeBtn = document.getElementById("remove_option_btn");
    const optionsContainer = document.getElementById("custom_options_container");

    let optionCount = 0;

    function updateCustomVisibility() {
        const isCustomChecked = customMultipleRadio.checked || customSingleRadio.checked;
        customArea.style.display = isCustomChecked ? "flex" : "none";
    }

    function createOptionElement(index) {
        const wrapper = document.createElement("div");
        wrapper.className = "custom-option";
        const input = document.createElement("input");
        input.type = "text";
        input.name = "custom_options[]";
        input.placeholder = "Option " + index;
        input.className = "textinput course-text";
        wrapper.appendChild(input);
        return wrapper;
    }

    function addOption() {
        optionCount++;
        optionsContainer.appendChild(createOptionElement(optionCount));
    }

    function removeOption() {
        if (optionsContainer.children.length > 1) {
            optionsContainer.removeChild(optionsContainer.lastElementChild);
            optionCount--;
        }
    }

    addOption();

    ratingRadios.forEach((r) => r.addEventListener("change", updateCustomVisibility));
    addBtn.addEventListener("click", addOption);
    removeBtn.addEventListener("click", removeOption);

    updateCustomVisibility();
}

function initializeSurveyForm() {
    document.getElementById('surveyForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const surveyName = document.getElementById('survey_name').value.trim();
        const ratingType = document.querySelector('input[name="rating_type"]:checked')?.id;

        let options = [];
        if (ratingType === 'custom-multiple' || ratingType === 'custom-single') {
            const inputs = document.querySelectorAll('#custom_options_container input[type="text"]');
            options = Array.from(inputs)
                .map(input => input.value.trim())
                .filter(value => value.length > 0);
            
            if (options.length === 0) {
                alert('Bitte mindestens eine Auswahlmöglichkeit hinzufügen');
                return;
            }
        }

        if (currentCourseId) {
            const survey = surveyManager.addSurvey(currentCourseId, surveyName, ratingType, options);
            if (survey) {
                alert('Umfrage erfolgreich erstellt: ' + surveyName);
                window.location.href = `edit_course.html?courseId=${currentCourseId}`;
            } else {
                alert('Fehler beim Erstellen der Umfrage');
            }
        } else {
            alert('Fehler: CourseId nicht gefunden');
        }
    });
}
