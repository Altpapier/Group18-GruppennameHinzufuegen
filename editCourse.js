document.addEventListener('DOMContentLoaded', function () {
    const ratingRadios = document.querySelectorAll('input[name="rating_type"]');
    const customRadio = document.getElementById('custom');
    const customArea = document.getElementById('custom_area');
    const addBtn = document.getElementById('add_option_btn');
    const removeBtn = document.getElementById('remove_option_btn');
    const optionsContainer = document.getElementById('custom_options_container');

    let optionCount = 0;

    function updateCustomVisibility() {
        customArea.style.display = customRadio.checked ? 'flex' : 'none';
    }

    function createOptionElement(index) {
        const wrapper = document.createElement('div');
        wrapper.className = 'custom-option';
        wrapper.style.display = 'flex';
        wrapper.style.gap = '6px';
        wrapper.style.alignItems = 'center';
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.style.flex = '1';
        checkbox.style.marginLeft = '-0.6rem';
        const input = document.createElement('input');
        input.style.flex = '8';
        input.type = 'text';
        input.name = 'custom_options';
        input.placeholder = 'Option ' + index;
        input.className = 'textinput course-text';
        wrapper.appendChild(checkbox);
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
    
    ratingRadios.forEach(r => r.addEventListener('change', updateCustomVisibility));
    addBtn.addEventListener('click', addOption);
    removeBtn.addEventListener('click', removeOption);
    
    updateCustomVisibility();
    
    loadCourseName();
});

function loadCourseName() {
    const params = new URLSearchParams(window.location.search);
    const courseId = parseInt(params.get('courseId'));
    
    if (courseId) {
        const course = courseManager.getCourseById(courseId);
        if (course) {
            document.getElementById('courseTitle').textContent = course.name + ' - EINSTELLUNGEN';
            document.getElementById('createSurveyBtn').href = `create_survey.html?courseId=${courseId}`;
            loadSurveys(courseId);
        }
    }
}

function loadSurveys(courseId) {
    const container = document.getElementById('surveysContainer');
    const surveys = surveyManager.getSurveysByCourseId(courseId);
    
    container.innerHTML = '';
    
    if (surveys.length === 0) {
        container.innerHTML = '<p>Keine Umfragen erstellt.</p>';
        return;
    }
    
    surveys.forEach(survey => {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-between';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '1rem';
        
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'survey-button';
        button.style.flex = '1';
        button.dataset.surveyId = survey.id;
        button.onclick = () => onSurveyClick(survey.id);

        const ratingTypeText = getRatingTypeText(survey.ratingType);
        button.innerHTML = `
            <label>${survey.name}</label>
            <label style="font-weight: 400;">Umfragenart: ${ratingTypeText}</label>
        `;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.title = 'Umfrage löschen';
        deleteBtn.onclick = (event) => deleteSurvey(event, survey.id);
        deleteBtn.style.padding = '0.5rem';
        deleteBtn.style.minWidth = '2.5rem';
        deleteBtn.style.height = '2.5rem';
        deleteBtn.style.border = 'none';
        deleteBtn.style.background = 'transparent';
        deleteBtn.style.cursor = 'pointer';
        deleteBtn.style.fontSize = '1.5rem';
        deleteBtn.style.display = 'flex';
        deleteBtn.style.alignItems = 'center';
        deleteBtn.style.justifyContent = 'center';
        
        wrapper.appendChild(button);
        wrapper.appendChild(deleteBtn);
        container.appendChild(wrapper);
    });
}

function getRatingTypeText(ratingType) {
    if(ratingType === 'custom-multiple') return 'Custom (Mehrfachauswahl)';
    if(ratingType === 'custom-single') return 'Custom (Einfachauswahl)';  
    if(ratingType === '1-10-Points') return '1-10 Punkte';
    if(ratingType === 'thumb') return '👍 / 👎';
    if(ratingType === 'smiley') return '😀 / 😊 / 😐 / ☹️ / 😧';
    return 'Keine Bewertung';
}

function deleteSurvey(event, surveyId) {
    event.stopPropagation();
        surveyManager.deleteSurvey(surveyId);
        const params = new URLSearchParams(window.location.search);
        const courseId = parseInt(params.get('courseId'));
        loadSurveys(courseId);
}

function onSurveyClick(surveyId) {
    console.log('Umfrage angeklickt mit ID:', surveyId);
    const survey = surveyManager.getSurveyById(surveyId);
    if (survey) {
        console.log('Umfrage:', survey);
        window.location.href = `create_survey.html?courseId=${survey.courseId}&surveyId=${survey.id}`;
    }else{
        console.error('Umfrage nicht gefunden');
    }
}
document.addEventListener('DOMContentLoaded', loadCourseName);
