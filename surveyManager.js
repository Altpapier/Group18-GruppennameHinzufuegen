
class SurveyManager {
    constructor() {
        this.storageKey = 'surveys';
        this.initializeStorage();
    }

    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    addSurvey(courseId, surveyName, ratingType, options = []) {
        if (!courseId || !surveyName || !ratingType) {
            console.error('CourseId, Umfragetitel und Bewertungsart sind erforderlich');
            return false;
        }

        const surveys = this.getSurveys();
        const newSurvey = {
            id: Date.now(),
            courseId: courseId,
            name: surveyName,
            ratingType: ratingType,
            options: options,
            createdAt: new Date().toISOString()
        };

        surveys.push(newSurvey);
        localStorage.setItem(this.storageKey, JSON.stringify(surveys));
        console.log('Umfrage hinzugefügt:', newSurvey);
        return newSurvey;
    }

    getSurveys() {
        const surveys = localStorage.getItem(this.storageKey);
        return surveys ? JSON.parse(surveys) : [];
    }

    getSurveysByCourseId(courseId) {
        const surveys = this.getSurveys();
        return surveys.filter(survey => survey.courseId === courseId);
    }

    getSurveyById(id) {
        const surveys = this.getSurveys();
        return surveys.find(survey => survey.id === id);
    }

    deleteSurvey(id) {
        let surveys = this.getSurveys();
        surveys = surveys.filter(survey => survey.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(surveys));
        console.log('Umfrage gelöscht mit ID:', id);
        return true;
    }

    updateSurvey(id, surveyName, ratingType, options = []) {
        const surveys = this.getSurveys();
        const surveyIndex = surveys.findIndex(survey => survey.id === id);
        
        if (surveyIndex === -1) {
            console.error('Umfrage nicht gefunden');
            return false;
        }

        surveys[surveyIndex].name = surveyName;
        surveys[surveyIndex].ratingType = ratingType;
        surveys[surveyIndex].options = options;
        localStorage.setItem(this.storageKey, JSON.stringify(surveys));
        console.log('Umfrage aktualisiert:', surveys[surveyIndex]);
        return true;
    }

    clearAllSurveys() {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
        console.log('Alle Umfragen gelöscht');
    }
}

const surveyManager = new SurveyManager();
