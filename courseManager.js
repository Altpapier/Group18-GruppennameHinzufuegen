
class CourseManager {
    constructor() {
        this.storageKey = 'courses';
        this.initializeStorage();
    }

    initializeStorage() {
        if (!localStorage.getItem(this.storageKey)) {
            localStorage.setItem(this.storageKey, JSON.stringify([]));
        }
    }

    addCourse(courseName, courseDate) {
        if (!courseName || !courseDate) {
            console.error('Kursname und Datum sind erforderlich');
            return false;
        }

        const courses = this.getCourses();
        const newCourse = {
            id: Date.now(),
            name: courseName,
            date: courseDate,
            createdAt: new Date().toISOString()
        };

        courses.push(newCourse);
        localStorage.setItem(this.storageKey, JSON.stringify(courses));
        console.log('Kurs hinzugefügt:', newCourse);
        return newCourse;
    }

    getCourses() {
        const courses = localStorage.getItem(this.storageKey);
        return courses ? JSON.parse(courses) : [];
    }

    getCourseById(id) {
        const courses = this.getCourses();
        return courses.find(course => course.id === id);
    }

    deleteCourse(id) {
        let courses = this.getCourses();
        courses = courses.filter(course => course.id !== id);
        localStorage.setItem(this.storageKey, JSON.stringify(courses));
        console.log('Kurs gelöscht mit ID:', id);
        return true;
    }

    updateCourse(id, courseName, courseDate) {
        const courses = this.getCourses();
        const courseIndex = courses.findIndex(course => course.id === id);
        
        if (courseIndex === -1) {
            console.error('Kurs nicht gefunden');
            return false;
        }

        courses[courseIndex].name = courseName;
        courses[courseIndex].date = courseDate;
        localStorage.setItem(this.storageKey, JSON.stringify(courses));
        console.log('Kurs aktualisiert:', courses[courseIndex]);
        return true;
    }

    clearAllCourses() {
        localStorage.setItem(this.storageKey, JSON.stringify([]));
        console.log('Alle Kurse gelöscht');
    }
}

const courseManager = new CourseManager();
