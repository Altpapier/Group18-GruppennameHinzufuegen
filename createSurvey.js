
let currentCourseId = null;
let currentSurveyId = null;

document.addEventListener('DOMContentLoaded', function() {
    const params = new URLSearchParams(window.location.search);
    currentCourseId = parseInt(params.get('courseId'));
    currentSurveyId = parseInt(params.get('surveyId'));
    
    const cancelBtn = document.getElementById('cancelBtn');
    if (currentCourseId) {
        cancelBtn.href = `edit_course.html?courseId=${currentCourseId}`;
    } else {
        cancelBtn.href = 'edit_course.html';
    }

    if(currentSurveyId){
        load_survey_data(currentSurveyId);
    }else{
        initializeCustomOptions();
    }

    if(currentSurveyId){
        initializeSurveyForm(false);
    }else{
        initializeSurveyForm();
    }
    
    
});

function load_survey_data(surveyId) {
    console.log('Lade Umfragedaten für ID:', surveyId);
    const titleElement = document.getElementById('Umfrage_title');
    const survey_name_input = document.getElementById('survey_name');
    const ratingRadios = document.querySelectorAll('input[name="rating_type"]');
    const customOptionsContainer = document.getElementById('custom_options_container');
    const survey = surveyManager.getSurveyById(surveyId);
    const createSurveyBtn = document.getElementById('create_course');

    titleElement.textContent = 'UMFRAGE BEARBEITEN';
    survey_name_input.value = survey.name;

    const ratingTypeRadio = survey.ratingType;
    ratingRadios.forEach(radio => {
        if (radio.id === ratingTypeRadio) {
            radio.checked = true;
        }
    });
    
    if (ratingTypeRadio === 'custom-multiple' || ratingTypeRadio === 'custom-single') {
        const options = survey.options || [];
        let customArea = document.getElementById("custom_area");
        let optionsContainer = document.getElementById("custom_options_container");
        let counter = 0;
        initializeCustomOptions(options.length);
        
    }

    createSurveyBtn.textContent = 'Umfrage aktualisieren';

}

function initializeCustomOptions(optionCount = 0) {
    const ratingRadios = document.querySelectorAll('input[name="rating_type"]');
    const customMultipleRadio = document.getElementById("custom-multiple");
    const customSingleRadio = document.getElementById("custom-single");
    const customArea = document.getElementById("custom_area");
    const addBtn = document.getElementById("add_option_btn");
    const removeBtn = document.getElementById("remove_option_btn");
    const optionsContainer = document.getElementById("custom_options_container");
    const survey = surveyManager.getSurveyById(currentSurveyId);
    
    if (optionCount !=0 && survey) {
        for (let i = 0; i < optionCount; i++) {
            optionsContainer.appendChild(createOptionElement(i + 1, survey.options[i]));
        }
    }

    function updateCustomVisibility() {
        const isCustomChecked = customMultipleRadio.checked || customSingleRadio.checked;
        customArea.style.display = isCustomChecked ? "flex" : "none";
    }

    function createOptionElement(index, value = "") {
        const wrapper = document.createElement("div");
        wrapper.className = "custom-option";
        const input = document.createElement("input");
        input.type = "text";
        input.name = "custom_options[]";
        input.placeholder = "Option " + index;
        if(value){
            input.value = value;
        }
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

    if(!survey){
        addOption();
    }
    

    ratingRadios.forEach((r) => r.addEventListener("change", updateCustomVisibility));
    addBtn.addEventListener("click", addOption);
    removeBtn.addEventListener("click", removeOption);

    updateCustomVisibility();
}

function initializeSurveyForm(create = true) {
    document.getElementById('surveyForm').addEventListener('submit', function(event) {
        event.preventDefault();

        const surveyName = document.getElementById('survey_name').value.trim();
        const ratingType = document.querySelector('input[name="rating_type"]:checked')?.id;

        let options = [];
        if (ratingType === 'custom-multiple' || ratingType === 'custom-single') {
            const inputs = document.querySelectorAll('#custom_options_container input[type="text"]');
            options = Array.from(inputs).map(input => input.value.trim()).filter(value => value.length > 0);
            
            if (options.length === 0) {
                alert('Bitte mindestens eine Auswahlmöglichkeit hinzufügen');
                return;
            }
        }

        if (currentCourseId) {
            if(!create){
                const survey = surveyManager.updateSurvey(currentSurveyId, surveyName, ratingType, options);
            }else{
                const survey = surveyManager.addSurvey(currentCourseId, surveyName, ratingType, options);
            }
                window.location.href = `edit_course.html?courseId=${currentCourseId}`;
        } else {
            alert('Fehler: CourseId nicht gefunden');
        }
    });
}
