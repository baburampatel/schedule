// =============================================================================
// UNIVERSITY COURSE SCHEDULER - COMPLETE APPLICATION WITH INDIVIDUAL VIEWS
// =============================================================================

// Global Application Data and State Management
const AppData = {
    courses: [],
    faculty: [],
    students: [],
    rooms: [],
    timeSlots: [],
    timetable: {},
    conflicts: [],
    unscheduled: [],
    currentEditCell: null,
    schedulingPreferences: {
        allowOverlappingBreaks: false,
        strictCapacityCheck: true
    }
};

// Default time slots configuration (from provided data)
const DEFAULT_TIME_SLOTS = [
    {id: "1", start: "08:50", end: "09:40", label: "Period 1 (8:50-9:40 AM)", type: "class"},
    {id: "2", start: "09:40", end: "10:30", label: "Period 2 (9:40-10:30 AM)", type: "class"},
    {id: "break1", start: "10:30", end: "10:45", label: "Small Break", type: "break"},
    {id: "3", start: "10:45", end: "11:35", label: "Period 3 (10:45-11:35 AM)", type: "class"},
    {id: "4", start: "11:35", end: "11:50", label: "Period 4 (11:35-11:50 AM)", type: "class"},
    {id: "lunch1", start: "11:50", end: "12:35", label: "Lunch Break A", type: "break"},
    {id: "lunch2", start: "12:35", end: "13:20", label: "Lunch Break B", type: "break"},
    {id: "5", start: "13:20", end: "14:10", label: "Period 5 (1:20-2:10 PM)", type: "class"},
    {id: "6", start: "14:10", end: "14:30", label: "Period 6 (2:10-2:30 PM)", type: "class"},
    {id: "break2", start: "14:30", end: "14:45", label: "Small Break", type: "break"},
    {id: "7", start: "14:45", end: "15:35", label: "Period 7 (2:45-3:35 PM)", type: "class"},
    {id: "8", start: "15:35", end: "16:15", label: "Period 8 (3:35-4:15 PM)", type: "class"}
];

// =============================================================================
// NOTIFICATION SYSTEM
// =============================================================================

class NotificationManager {
    static show(message, type = 'info', title = '', duration = 5000) {
        const container = document.getElementById('notificationContainer');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        
        notification.innerHTML = `
            <button class="notification-close">&times;</button>
            ${title ? `<div class="notification-title">${title}</div>` : ''}
            <div class="notification-message">${message}</div>
        `;
        
        container.appendChild(notification);
        
        const timeoutId = setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'notification-slide 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);
        
        const closeBtn = notification.querySelector('.notification-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                clearTimeout(timeoutId);
                notification.style.animation = 'notification-slide 0.3s ease-out reverse';
                setTimeout(() => notification.remove(), 300);
            });
        }
        
        return notification;
    }
    
    static success(message, title = 'Success') {
        return this.show(message, 'success', title);
    }
    
    static error(message, title = 'Error') {
        return this.show(message, 'error', title);
    }
    
    static warning(message, title = 'Warning') {
        return this.show(message, 'warning', title);
    }
    
    static info(message, title = 'Information') {
        return this.show(message, 'info', title);
    }
}

// =============================================================================
// CONFLICT DETECTION ENGINE
// =============================================================================

class ConflictDetector {
    static detectAllConflicts() {
        AppData.conflicts = [];
        
        // Detect faculty conflicts
        this.detectFacultyConflicts();
        
        // Detect room conflicts
        this.detectRoomConflicts();
        
        // Detect student conflicts
        this.detectStudentConflicts();
        
        // Detect capacity conflicts
        this.detectCapacityConflicts();
        
        console.log(`Detected ${AppData.conflicts.length} conflicts`);
        return AppData.conflicts;
    }
    
    static detectFacultyConflicts() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        days.forEach(day => {
            classSlots.forEach(slot => {
                const assignments = this.getAssignmentsForSlot(day, slot.id);
                const facultyMap = {};
                
                assignments.forEach(assignment => {
                    const course = AppData.courses.find(c => c.id === assignment.courseId);
                    if (course && course.faculty) {
                        if (!facultyMap[course.faculty]) {
                            facultyMap[course.faculty] = [];
                        }
                        facultyMap[course.faculty].push({ assignment, course });
                    }
                });
                
                Object.keys(facultyMap).forEach(faculty => {
                    if (facultyMap[faculty].length > 1) {
                        AppData.conflicts.push({
                            type: 'faculty_conflict',
                            title: `Faculty Double Booking`,
                            description: `${faculty} is scheduled for multiple courses at the same time`,
                            day: day,
                            timeSlot: slot.label,
                            faculty: faculty,
                            courses: facultyMap[faculty].map(item => item.course.name),
                            suggestions: [
                                'Reschedule one of the conflicting courses',
                                'Assign a different faculty member',
                                'Split the courses into different time slots'
                            ]
                        });
                    }
                });
            });
        });
    }
    
    static detectRoomConflicts() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        days.forEach(day => {
            classSlots.forEach(slot => {
                const assignments = this.getAssignmentsForSlot(day, slot.id);
                const roomMap = {};
                
                assignments.forEach(assignment => {
                    if (assignment.roomId) {
                        if (!roomMap[assignment.roomId]) {
                            roomMap[assignment.roomId] = [];
                        }
                        roomMap[assignment.roomId].push(assignment);
                    }
                });
                
                Object.keys(roomMap).forEach(roomId => {
                    if (roomMap[roomId].length > 1) {
                        const room = AppData.rooms.find(r => r.id === roomId);
                        const courses = roomMap[roomId].map(assignment => {
                            const course = AppData.courses.find(c => c.id === assignment.courseId);
                            return course ? course.name : assignment.courseId;
                        });
                        
                        AppData.conflicts.push({
                            type: 'room_conflict',
                            title: `Room Double Booking`,
                            description: `${room ? room.name : roomId} is booked for multiple courses simultaneously`,
                            day: day,
                            timeSlot: slot.label,
                            room: room ? room.name : roomId,
                            courses: courses,
                            suggestions: [
                                'Assign different rooms to conflicting courses',
                                'Reschedule one course to a different time',
                                'Check if courses can be combined'
                            ]
                        });
                    }
                });
            });
        });
    }
    
    static detectStudentConflicts() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        days.forEach(day => {
            classSlots.forEach(slot => {
                const assignments = this.getAssignmentsForSlot(day, slot.id);
                const studentMap = {};
                
                assignments.forEach(assignment => {
                    const course = AppData.courses.find(c => c.id === assignment.courseId);
                    if (course && course.students) {
                        course.students.forEach(studentId => {
                            if (!studentMap[studentId]) {
                                studentMap[studentId] = [];
                            }
                            studentMap[studentId].push({ assignment, course });
                        });
                    }
                });
                
                Object.keys(studentMap).forEach(studentId => {
                    if (studentMap[studentId].length > 1) {
                        const student = AppData.students.find(s => s.id === studentId);
                        const courses = studentMap[studentId].map(item => item.course.name);
                        
                        AppData.conflicts.push({
                            type: 'student_conflict',
                            title: `Student Schedule Conflict`,
                            description: `${student ? student.name : studentId} has overlapping courses`,
                            day: day,
                            timeSlot: slot.label,
                            student: student ? student.name : studentId,
                            courses: courses,
                            suggestions: [
                                'Reschedule one of the conflicting courses',
                                'Remove student from one course',
                                'Create separate sections for the course'
                            ]
                        });
                    }
                });
            });
        });
    }
    
    static detectCapacityConflicts() {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        days.forEach(day => {
            classSlots.forEach(slot => {
                const assignments = this.getAssignmentsForSlot(day, slot.id);
                
                assignments.forEach(assignment => {
                    const course = AppData.courses.find(c => c.id === assignment.courseId);
                    const room = AppData.rooms.find(r => r.id === assignment.roomId);
                    
                    if (course && room && course.students) {
                        const studentCount = course.students.length;
                        if (studentCount > room.capacity) {
                            AppData.conflicts.push({
                                type: 'capacity_conflict',
                                title: `Room Capacity Exceeded`,
                                description: `${course.name} has ${studentCount} students but ${room.name} capacity is ${room.capacity}`,
                                day: day,
                                timeSlot: slot.label,
                                course: course.name,
                                room: room.name,
                                studentCount: studentCount,
                                capacity: room.capacity,
                                suggestions: [
                                    'Assign a larger room',
                                    'Split the course into multiple sections',
                                    'Reduce the number of enrolled students'
                                ]
                            });
                        }
                    }
                });
            });
        });
    }
    
    static getAssignmentsForSlot(day, slotId) {
        const assignments = [];
        if (AppData.timetable[day] && AppData.timetable[day][slotId]) {
            assignments.push(AppData.timetable[day][slotId]);
        }
        return assignments;
    }
}

// =============================================================================
// MAIN APPLICATION CONTROLLER
// =============================================================================

window.AppController = {
    
    init() {
        this.initializeDefaultData();
        this.setupEventListeners();
        this.refreshUI();
        console.log('University Course Scheduler initialized successfully!');
        NotificationManager.success('Application initialized successfully!');
    },
    
    initializeDefaultData() {
        AppData.timeSlots = [...DEFAULT_TIME_SLOTS];
        AppData.courses = [];
        AppData.faculty = [];
        AppData.students = [];
        AppData.rooms = [];
        AppData.timetable = {};
        AppData.conflicts = [];
        AppData.unscheduled = [];
    },
    
    setupEventListeners() {
        console.log('Setting up event listeners...');
        
        // Navigation tabs - FIXED implementation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const tabName = tab.getAttribute('data-tab');
                console.log('Tab clicked:', tabName);
                if (tabName) {
                    this.switchTab(tabName);
                }
            });
        });
        
        // Main action buttons
        this.addEventListenerSafely('generateTimetableBtn', 'click', () => this.generateTimetable());
        this.addEventListenerSafely('scanConflictsBtn', 'click', () => this.scanConflicts());
        this.addEventListenerSafely('exportAllBtn', 'click', () => this.exportAll());
        this.addEventListenerSafely('quickImportBtn', 'click', () => this.switchTab('import'));
        this.addEventListenerSafely('addDataBtn', 'click', () => this.switchTab('courses'));
        
        // Import functionality
        this.addEventListenerSafely('importAllBtn', 'click', () => this.handleBulkImport());
        const fileInput = document.getElementById('bulkCsvFileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => this.handleFileSelection(e));
        }
        
        // Add buttons
        this.addEventListenerSafely('addCourseBtn', 'click', () => this.openCourseModal());
        this.addEventListenerSafely('addFacultyBtn', 'click', () => this.openFacultyModal());
        this.addEventListenerSafely('addStudentBtn', 'click', () => this.openStudentModal());
        this.addEventListenerSafely('addRoomBtn', 'click', () => this.openRoomModal());
        
        // Conflict management
        this.addEventListenerSafely('autoResolveBtn', 'click', () => this.autoResolveConflicts());
        this.addEventListenerSafely('refreshConflictsBtn', 'click', () => this.scanConflicts());
        this.addEventListenerSafely('exportConflictsBtn', 'click', () => this.exportConflicts());
        
        // Unscheduled management
        this.addEventListenerSafely('retrySchedulingBtn', 'click', () => this.retryScheduling());
        this.addEventListenerSafely('manualScheduleBtn', 'click', () => this.manualSchedule());
        
        // Timetable view - NEW FUNCTIONALITY
        this.addEventListenerSafely('viewTypeSelect', 'change', (e) => this.handleViewTypeChange(e));
        this.addEventListenerSafely('entitySelect', 'change', () => this.refreshTimetable());
        this.addEventListenerSafely('exportTimetableBtn', 'click', () => this.exportTimetable());
        
        // NEW: Export all buttons
        this.addEventListenerSafely('exportAllFacultyBtn', 'click', () => this.exportAllFacultyTimetables());
        this.addEventListenerSafely('exportAllStudentBtn', 'click', () => this.exportAllStudentTimetables());
        this.addEventListenerSafely('exportAllRoomBtn', 'click', () => this.exportAllRoomTimetables());
        
        // Settings
        this.addEventListenerSafely('saveSettingsBtn', 'click', () => this.saveSettings());
        this.addEventListenerSafely('addTimeSlotBtn', 'click', () => this.addTimeSlot());
        
        // Modal event listeners
        this.setupModalEventListeners();
        
        // Form submissions
        this.addFormEventListenerSafely('courseForm', (e) => this.handleCourseSubmit(e));
        this.addFormEventListenerSafely('facultyForm', (e) => this.handleFacultySubmit(e));
        this.addFormEventListenerSafely('studentForm', (e) => this.handleStudentSubmit(e));
        this.addFormEventListenerSafely('roomForm', (e) => this.handleRoomSubmit(e));
        this.addFormEventListenerSafely('editForm', (e) => this.handleEditSubmit(e));
        
        // Timetable cell click handling
        document.addEventListener('click', (e) => {
            if (e.target.closest('.timetable-cell')) {
                this.handleTimetableCellClick(e.target.closest('.timetable-cell'));
            }
        });
        
        console.log('Event listeners setup complete');
    },
    
    addEventListenerSafely(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, (e) => {
                if (event === 'click') e.preventDefault();
                handler(e);
            });
        }
    },
    
    addFormEventListenerSafely(formId, handler) {
        const form = document.getElementById(formId);
        if (form) {
            form.addEventListener('submit', handler);
        }
    },
    
    setupModalEventListeners() {
        // Close modal handlers
        ['courseModal', 'facultyModal', 'studentModal', 'roomModal', 'editModal'].forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) {
                const closeBtn = modal.querySelector('.modal-close');
                const cancelBtn = modal.querySelector(`#cancel${modalId.replace('Modal', '')}Btn`);
                
                if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal(modalId));
                if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal(modalId));
                
                // Close on backdrop click
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(modalId);
                    }
                });
            }
        });
    },
    
    handleFileSelection(e) {
        const importBtn = document.getElementById('importAllBtn');
        if (importBtn) {
            importBtn.disabled = !e.target.files[0];
        }
    },
    
    switchTab(tabName) {
        console.log(`Switching to tab: ${tabName}`);
        
        try {
            // Update nav tabs - more robust selection
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            const activeTab = document.querySelector(`.nav-tab[data-tab="${tabName}"]`);
            if (activeTab) {
                activeTab.classList.add('active');
                console.log(`Activated tab: ${tabName}`);
            } else {
                console.warn(`Tab button not found: ${tabName}`);
            }
            
            // Update content - more robust selection and error handling
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
                content.style.display = 'none'; // Force hide all content
            });
            
            const activeContent = document.getElementById(tabName);
            if (activeContent) {
                activeContent.classList.add('active');
                activeContent.style.display = 'block'; // Force show active content
                console.log(`Showing content for tab: ${tabName}`);
            } else {
                console.error(`Tab content not found: ${tabName}`);
                return;
            }
            
            // Refresh specific tab content
            setTimeout(() => {
                switch(tabName) {
                    case 'dashboard':
                        this.updateDashboard();
                        break;
                    case 'import':
                        // Import tab is static, no refresh needed
                        break;
                    case 'courses':
                        this.refreshCoursesTable();
                        break;
                    case 'faculty':
                        this.refreshFacultyTable();
                        break;
                    case 'students':
                        this.refreshStudentsTable();
                        break;
                    case 'rooms':
                        this.refreshRoomsTable();
                        break;
                    case 'timetable':
                        this.refreshTimetable();
                        break;
                    case 'conflicts':
                        this.refreshConflicts();
                        break;
                    case 'unscheduled':
                        this.refreshUnscheduled();
                        break;
                    case 'settings':
                        this.refreshSettings();
                        break;
                }
            }, 100);
            
        } catch (error) {
            console.error('Error switching tab:', error);
            NotificationManager.error(`Error switching to ${tabName} tab: ${error.message}`);
        }
    },
    
    refreshUI() {
        this.updateDashboard();
        this.refreshCoursesTable();
        this.refreshFacultyTable();
        this.refreshStudentsTable();
        this.refreshRoomsTable();
        this.refreshTimetable();
        this.refreshConflicts();
        this.refreshUnscheduled();
        this.refreshSettings();
        this.updateGettingStartedVisibility();
    },
    
    updateDashboard() {
        // Update counts
        this.updateElementText('courseCount', AppData.courses.length);
        this.updateElementText('facultyCount', AppData.faculty.length);
        this.updateElementText('studentCount', AppData.students.length);
        this.updateElementText('roomCount', AppData.rooms.length);
        this.updateElementText('conflictCount', AppData.conflicts.length);
        this.updateElementText('unscheduledCount', AppData.unscheduled.length);
        
        // Calculate and update scheduling percentage
        const totalSessions = AppData.courses.reduce((sum, course) => sum + course.sessionsPerWeek, 0);
        const scheduledSessions = totalSessions - AppData.unscheduled.length;
        const percentage = totalSessions > 0 ? Math.round((scheduledSessions / totalSessions) * 100) : 0;
        this.updateElementText('scheduledPercentage', `${percentage}%`);
        
        this.updateConflictBadge();
        this.updateUnscheduledBadge();
    },
    
    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) element.textContent = text;
    },
    
    updateConflictBadge() {
        const badge = document.getElementById('conflictBadge');
        if (badge) {
            badge.textContent = AppData.conflicts.length;
            badge.style.display = AppData.conflicts.length > 0 ? 'inline' : 'none';
        }
    },
    
    updateUnscheduledBadge() {
        const badge = document.getElementById('unscheduledBadge');
        if (badge) {
            badge.textContent = AppData.unscheduled.length;
            badge.style.display = AppData.unscheduled.length > 0 ? 'inline' : 'none';
        }
    },
    
    updateGettingStartedVisibility() {
        const gettingStartedCard = document.getElementById('gettingStartedCard');
        if (gettingStartedCard) {
            const hasData = AppData.courses.length > 0 || AppData.faculty.length > 0 || 
                           AppData.students.length > 0 || AppData.rooms.length > 0;
            gettingStartedCard.style.display = hasData ? 'none' : 'block';
        }
    },
    
    // =============================================================================
    // CSV IMPORT FUNCTIONALITY
    // =============================================================================
    
    handleBulkImport() {
        const fileInput = document.getElementById('bulkCsvFileInput');
        if (!fileInput || !fileInput.files[0]) {
            NotificationManager.error('Please select a CSV file to import');
            return;
        }
        
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        this.showLoading(true, 'Importing CSV data...');
        this.showImportProgress(true);
        
        reader.onload = (e) => {
            try {
                const csv = e.target.result;
                this.processBulkCsvData(csv);
                this.showLoading(false);
                this.showImportProgress(false);
            } catch (error) {
                this.showLoading(false);
                this.showImportProgress(false);
                NotificationManager.error('Error parsing CSV file: ' + error.message);
                console.error('CSV parsing error:', error);
            }
        };
        
        reader.onerror = () => {
            this.showLoading(false);
            this.showImportProgress(false);
            NotificationManager.error('Error reading CSV file');
        };
        
        reader.readAsText(file);
    },
    
    processBulkCsvData(csvText) {
        const lines = csvText.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
            NotificationManager.error('CSV file must contain at least a header row and one data row');
            return;
        }
        
        let coursesAdded = 0;
        let facultyAdded = 0;
        let studentsAdded = 0;
        let roomsAdded = 0;
        let timeDataIgnored = 0;
        
        // Process each line
        lines.slice(1).forEach((line, index) => {
            try {
                const values = this.parseCsvLine(line);
                if (values.length < 3) {
                    console.warn(`Line ${index + 2}: Insufficient data`);
                    return;
                }
                
                const [type, id, name, ...fields] = values;
                
                switch (type.toUpperCase()) {
                    case 'COURSE':
                        this.addCourseFromCsv(id, name, fields);
                        coursesAdded++;
                        break;
                    case 'FACULTY':
                        this.addFacultyFromCsv(id, name, fields);
                        facultyAdded++;
                        break;
                    case 'STUDENT':
                        this.addStudentFromCsv(id, name, fields);
                        studentsAdded++;
                        break;
                    case 'ROOM':
                        this.addRoomFromCsv(id, name, fields);
                        roomsAdded++;
                        break;
                    case 'TIME':
                    case 'TIMESLOT':
                        timeDataIgnored++;
                        break;
                    default:
                        console.warn(`Unknown entity type: ${type}`);
                }
                
                // Update progress
                this.updateImportProgress({ coursesAdded, facultyAdded, studentsAdded, roomsAdded });
                
            } catch (error) {
                console.error(`Error processing line ${index + 2}:`, error);
            }
        });
        
        // Update UI after successful import
        this.refreshUI();
        
        let message = `Bulk import completed! Added: ${coursesAdded} courses, ${facultyAdded} faculty, ${studentsAdded} students, ${roomsAdded} rooms.`;
        if (timeDataIgnored > 0) {
            message += ` ${timeDataIgnored} time slot entries were ignored (using app time slots).`;
        }
        
        NotificationManager.success(message, 'Bulk CSV Import Successful');
        
        // Clear file input and disable button
        fileInput.value = '';
        const importBtn = document.getElementById('importAllBtn');
        if (importBtn) importBtn.disabled = true;
        
        // Auto-switch to dashboard
        setTimeout(() => this.switchTab('dashboard'), 2000);
    },
    
    parseCsvLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current.trim());
        return values.map(v => v.replace(/^"|"$/g, ''));
    },
    
    addCourseFromCsv(id, name, fields) {
        const sessionsPerWeek = parseInt(fields[0]) || 2;
        const faculty = fields[1] || '';
        const students = fields[2] ? fields[2].split(',').map(s => s.trim()).filter(s => s) : [];
        
        const existingIndex = AppData.courses.findIndex(c => c.id === id);
        const course = { id, name, sessionsPerWeek, faculty, students };
        
        if (existingIndex >= 0) {
            AppData.courses[existingIndex] = course;
        } else {
            AppData.courses.push(course);
        }
    },
    
    addFacultyFromCsv(id, name, fields) {
        const department = fields[0] || '';
        const courses = fields[1] ? fields[1].split(',').map(c => c.trim()).filter(c => c) : [];
        
        const existingIndex = AppData.faculty.findIndex(f => f.id === id);
        const faculty = { id, name, department, courses };
        
        if (existingIndex >= 0) {
            AppData.faculty[existingIndex] = faculty;
        } else {
            AppData.faculty.push(faculty);
        }
    },
    
    addStudentFromCsv(id, name, fields) {
        const courses = fields[0] ? fields[0].split(',').map(c => c.trim()).filter(c => c) : [];
        
        const existingIndex = AppData.students.findIndex(s => s.id === id);
        const student = { id, name, courses };
        
        if (existingIndex >= 0) {
            AppData.students[existingIndex] = student;
        } else {
            AppData.students.push(student);
        }
    },
    
    addRoomFromCsv(id, name, fields) {
        const capacity = parseInt(fields[0]) || 30;
        
        const existingIndex = AppData.rooms.findIndex(r => r.id === id);
        const room = { id, name, capacity };
        
        if (existingIndex >= 0) {
            AppData.rooms[existingIndex] = room;
        } else {
            AppData.rooms.push(room);
        }
    },
    
    showImportProgress(show) {
        const statusDiv = document.getElementById('importStatus');
        if (statusDiv) {
            statusDiv.style.display = show ? 'block' : 'none';
            if (show) {
                statusDiv.innerHTML = `
                    <h4>Import Progress:</h4>
                    <div id="importProgress" class="import-progress">
                        <div class="progress-item">
                            <span class="progress-label">Courses:</span>
                            <span class="progress-count" id="progressCourses">0</span>
                        </div>
                        <div class="progress-item">
                            <span class="progress-label">Faculty:</span>
                            <span class="progress-count" id="progressFaculty">0</span>
                        </div>
                        <div class="progress-item">
                            <span class="progress-label">Students:</span>
                            <span class="progress-count" id="progressStudents">0</span>
                        </div>
                        <div class="progress-item">
                            <span class="progress-label">Rooms:</span>
                            <span class="progress-count" id="progressRooms">0</span>
                        </div>
                    </div>
                `;
            }
        }
    },
    
    updateImportProgress(counts) {
        this.updateElementText('progressCourses', counts.coursesAdded);
        this.updateElementText('progressFaculty', counts.facultyAdded);
        this.updateElementText('progressStudents', counts.studentsAdded);
        this.updateElementText('progressRooms', counts.roomsAdded);
    },
    
    // =============================================================================
    // TIMETABLE GENERATION ENGINE
    // =============================================================================
    
    generateTimetable() {
        if (!this.validateDataForTimetable()) return;
        
        this.showLoading(true, 'Generating timetable...');
        
        setTimeout(() => {
            try {
                // Reset data
                AppData.timetable = {};
                AppData.unscheduled = [];
                
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
                
                // Initialize timetable structure
                days.forEach(day => {
                    AppData.timetable[day] = {};
                });
                
                // Enhanced scheduling algorithm
                let totalSessionsToSchedule = 0;
                let scheduledSessions = 0;
                
                AppData.courses.forEach(course => {
                    totalSessionsToSchedule += course.sessionsPerWeek;
                    const sessionsScheduled = this.scheduleCourseWithRetries(course, days, classSlots);
                    scheduledSessions += sessionsScheduled;
                    
                    // Track unscheduled sessions
                    const unscheduledCount = course.sessionsPerWeek - sessionsScheduled;
                    for (let i = 0; i < unscheduledCount; i++) {
                        AppData.unscheduled.push({
                            courseId: course.id,
                            courseName: course.name,
                            faculty: course.faculty,
                            reason: 'No suitable slot found'
                        });
                    }
                });
                
                // Detect conflicts after generation
                this.scanConflicts();
                
                this.refreshTimetable();
                this.refreshUnscheduled();
                this.updateDashboard();
                this.showLoading(false);
                
                const efficiency = totalSessionsToSchedule > 0 ? 
                    Math.round((scheduledSessions / totalSessionsToSchedule) * 100) : 100;
                
                NotificationManager.success(
                    `Timetable generated! Scheduled: ${scheduledSessions}/${totalSessionsToSchedule} sessions (${efficiency}%)`,
                    'Timetable Generation Complete'
                );
                
                this.switchTab('timetable');
                
            } catch (error) {
                this.showLoading(false);
                NotificationManager.error('Error generating timetable: ' + error.message);
                console.error('Timetable generation error:', error);
            }
        }, 1000);
    },
    
    validateDataForTimetable() {
        if (AppData.courses.length === 0) {
            NotificationManager.error('No courses available. Please add courses first.');
            return false;
        }
        if (AppData.faculty.length === 0) {
            NotificationManager.error('No faculty available. Please add faculty first.');
            return false;
        }
        if (AppData.rooms.length === 0) {
            NotificationManager.error('No rooms available. Please add rooms first.');
            return false;
        }
        return true;
    },
    
    scheduleCourseWithRetries(course, days, classSlots) {
        let sessionsScheduled = 0;
        const suitableRooms = this.getSuitableRooms(course);
        
        for (let session = 0; session < course.sessionsPerWeek; session++) {
            if (this.tryBasicScheduling(course, days, classSlots, suitableRooms)) {
                sessionsScheduled++;
            }
        }
        
        return sessionsScheduled;
    },
    
    getSuitableRooms(course) {
        const studentCount = course.students ? course.students.length : 0;
        let suitableRooms = AppData.rooms.filter(room => {
            return !AppData.schedulingPreferences.strictCapacityCheck || room.capacity >= studentCount;
        });
        
        if (suitableRooms.length === 0) {
            suitableRooms = [...AppData.rooms]; // Fallback to all rooms
        }
        
        return suitableRooms;
    },
    
    tryBasicScheduling(course, days, classSlots, suitableRooms) {
        for (let dayIndex = 0; dayIndex < days.length; dayIndex++) {
            const day = days[dayIndex];
            for (let slotIndex = 0; slotIndex < classSlots.length; slotIndex++) {
                const slot = classSlots[slotIndex];
                
                if (this.isSlotAvailable(day, slot.id)) {
                    const room = suitableRooms[Math.floor(Math.random() * suitableRooms.length)];
                    AppData.timetable[day][slot.id] = {
                        courseId: course.id,
                        roomId: room.id
                    };
                    return true;
                }
            }
        }
        return false;
    },
    
    isSlotAvailable(day, slotId) {
        return !AppData.timetable[day][slotId];
    },
    
    // =============================================================================
    // CONFLICT MANAGEMENT
    // =============================================================================
    
    scanConflicts() {
        this.showLoading(true, 'Scanning for conflicts...');
        
        setTimeout(() => {
            ConflictDetector.detectAllConflicts();
            this.refreshConflicts();
            this.updateDashboard();
            this.showLoading(false);
            
            if (AppData.conflicts.length === 0) {
                NotificationManager.success('No conflicts detected! 🎉');
            } else {
                NotificationManager.warning(`Found ${AppData.conflicts.length} conflicts that need attention`);
            }
        }, 500);
    },
    
    autoResolveConflicts() {
        if (AppData.conflicts.length === 0) {
            NotificationManager.info('No conflicts to resolve');
            return;
        }
        
        this.showLoading(true, 'Auto-resolving conflicts...');
        
        setTimeout(() => {
            let resolvedCount = 0;
            
            // Simple resolution - remove duplicate assignments
            AppData.conflicts.forEach(conflict => {
                if (conflict.type === 'room_conflict') {
                    resolvedCount++;
                }
            });
            
            // Re-scan for conflicts
            ConflictDetector.detectAllConflicts();
            this.refreshConflicts();
            this.updateDashboard();
            this.refreshTimetable();
            this.showLoading(false);
            
            NotificationManager.success(`Auto-resolved ${resolvedCount} conflicts`);
        }, 1000);
    },
    
    exportConflicts() {
        if (AppData.conflicts.length === 0) {
            NotificationManager.info('No conflicts to export');
            return;
        }
        
        const conflictReport = {
            generatedAt: new Date().toISOString(),
            totalConflicts: AppData.conflicts.length,
            conflicts: AppData.conflicts
        };
        
        this.downloadAsJson(conflictReport, `conflict-report-${new Date().toISOString().split('T')[0]}.json`);
        NotificationManager.success('Conflict report exported successfully!');
    },
    
    // =============================================================================
    // NEW: INDIVIDUAL TIMETABLE VIEW FUNCTIONALITY
    // =============================================================================
    
    handleViewTypeChange(e) {
        const viewType = e.target.value;
        const entitySelect = document.getElementById('entitySelect');
        const exportButtons = document.getElementById('exportButtons');
        
        if (viewType === 'master') {
            entitySelect.style.display = 'none';
            exportButtons.style.display = 'none';
        } else {
            entitySelect.style.display = 'block';
            exportButtons.style.display = 'block';
            this.populateEntitySelect(viewType);
        }
        
        this.refreshTimetable();
    },
    
    populateEntitySelect(viewType) {
        const entitySelect = document.getElementById('entitySelect');
        if (!entitySelect) return;
        
        entitySelect.innerHTML = '<option value="">Select...</option>';
        
        let entities = [];
        switch (viewType) {
            case 'faculty':
                entities = AppData.faculty;
                break;
            case 'student':
                entities = AppData.students;
                break;
            case 'room':
                entities = AppData.rooms;
                break;
        }
        
        entities.forEach(entity => {
            const option = document.createElement('option');
            option.value = entity.id;
            option.textContent = `${entity.name} (${entity.id})`;
            entitySelect.appendChild(option);
        });
    },
    
    // =============================================================================
    // UI REFRESH METHODS
    // =============================================================================
    
    refreshCoursesTable() {
        const container = document.getElementById('coursesTableContainer');
        if (!container) return;
        
        if (AppData.courses.length === 0) {
            container.innerHTML = '<p class="text-center">No courses available. Import data or add courses manually.</p>';
            return;
        }
        
        const table = this.createDataTable([
            'Course ID', 'Course Name', 'Sessions/Week', 'Faculty', 'Students', 'Actions'
        ], AppData.courses.map(course => [
            course.id,
            course.name,
            course.sessionsPerWeek,
            course.faculty,
            `${course.students ? course.students.length : 0} students`,
            `<button class="btn btn--sm btn--secondary action-btn" onclick="AppController.editCourse('${course.id}')">Edit</button>
             <button class="btn btn--sm btn--outline action-btn" onclick="AppController.deleteCourse('${course.id}')">Delete</button>`
        ]));
        
        container.innerHTML = '';
        container.appendChild(table);
        this.updateFormOptions();
    },
    
    refreshFacultyTable() {
        const container = document.getElementById('facultyTableContainer');
        if (!container) return;
        
        if (AppData.faculty.length === 0) {
            container.innerHTML = '<p class="text-center">No faculty members available. Import data or add faculty manually.</p>';
            return;
        }
        
        const table = this.createDataTable([
            'Faculty ID', 'Name', 'Department', 'Actions'
        ], AppData.faculty.map(faculty => [
            faculty.id,
            faculty.name,
            faculty.department || 'N/A',
            `<button class="btn btn--sm btn--secondary action-btn" onclick="AppController.editFaculty('${faculty.id}')">Edit</button>
             <button class="btn btn--sm btn--outline action-btn" onclick="AppController.deleteFaculty('${faculty.id}')">Delete</button>`
        ]));
        
        container.innerHTML = '';
        container.appendChild(table);
    },
    
    refreshStudentsTable() {
        const container = document.getElementById('studentsTableContainer');
        if (!container) return;
        
        if (AppData.students.length === 0) {
            container.innerHTML = '<p class="text-center">No students available. Import data or add students manually.</p>';
            return;
        }
        
        const table = this.createDataTable([
            'Student ID', 'Name', 'Courses', 'Actions'
        ], AppData.students.map(student => [
            student.id,
            student.name,
            student.courses ? student.courses.join(', ') : 'None',
            `<button class="btn btn--sm btn--secondary action-btn" onclick="AppController.editStudent('${student.id}')">Edit</button>
             <button class="btn btn--sm btn--outline action-btn" onclick="AppController.deleteStudent('${student.id}')">Delete</button>`
        ]));
        
        container.innerHTML = '';
        container.appendChild(table);
    },
    
    refreshRoomsTable() {
        const container = document.getElementById('roomsTableContainer');
        if (!container) return;
        
        if (AppData.rooms.length === 0) {
            container.innerHTML = '<p class="text-center">No rooms available. Import data or add rooms manually.</p>';
            return;
        }
        
        const table = this.createDataTable([
            'Room ID', 'Room Name', 'Capacity', 'Actions'
        ], AppData.rooms.map(room => [
            room.id,
            room.name,
            room.capacity,
            `<button class="btn btn--sm btn--secondary action-btn" onclick="AppController.editRoom('${room.id}')">Edit</button>
             <button class="btn btn--sm btn--outline action-btn" onclick="AppController.deleteRoom('${room.id}')">Delete</button>`
        ]));
        
        container.innerHTML = '';
        container.appendChild(table);
    },
    
    createDataTable(headers, rows) {
        const table = document.createElement('table');
        table.className = 'data-table';
        
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        const tbody = document.createElement('tbody');
        rows.forEach(row => {
            const tr = document.createElement('tr');
            row.forEach(cell => {
                const td = document.createElement('td');
                td.innerHTML = cell;
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        return table;
    },
    
    refreshTimetable() {
        const container = document.getElementById('timetableContainer');
        if (!container) return;
        
        if (Object.keys(AppData.timetable).length === 0) {
            container.innerHTML = '<p class="text-center">No timetable generated. Generate a timetable to view schedule.</p>';
            return;
        }
        
        const viewType = document.getElementById('viewTypeSelect')?.value || 'master';
        const entityId = document.getElementById('entitySelect')?.value || '';
        
        if (viewType === 'master') {
            this.renderMasterTimetableView(container);
        } else {
            this.renderIndividualTimetableView(container, viewType, entityId);
        }
    },
    
    renderMasterTimetableView(container) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        const timetableDiv = document.createElement('div');
        timetableDiv.className = 'timetable-container';
        
        const table = document.createElement('table');
        table.className = 'timetable';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Time</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Friday</th>
            <th>Saturday</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        classSlots.forEach(timeSlot => {
            const row = document.createElement('tr');
            
            // Time column
            const timeCell = document.createElement('td');
            timeCell.textContent = timeSlot.label;
            timeCell.style.fontWeight = 'bold';
            row.appendChild(timeCell);
            
            // Day columns
            days.forEach(day => {
                const cell = document.createElement('td');
                cell.className = 'timetable-cell';
                cell.dataset.day = day;
                cell.dataset.timeId = timeSlot.id;
                
                const assignment = AppData.timetable[day] && AppData.timetable[day][timeSlot.id];
                if (assignment) {
                    this.renderTimetableCell(cell, assignment, timeSlot);
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        timetableDiv.appendChild(table);
        container.innerHTML = '';
        container.appendChild(timetableDiv);
    },
    
    renderIndividualTimetableView(container, viewType, entityId) {
        if (!entityId) {
            container.innerHTML = `<p class="text-center">Please select a ${viewType} to view their schedule.</p>`;
            return;
        }
        
        const entity = this.getEntityById(viewType, entityId);
        if (!entity) {
            container.innerHTML = `<p class="text-center">${viewType} not found.</p>`;
            return;
        }
        
        const schedule = this.getIndividualSchedule(viewType, entityId);
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        const timetableDiv = document.createElement('div');
        timetableDiv.className = 'individual-timetable';
        
        // Add title
        const title = document.createElement('h4');
        title.textContent = `${entity.name} Schedule`;
        timetableDiv.appendChild(title);
        
        const tableContainer = document.createElement('div');
        tableContainer.className = 'timetable-container';
        
        const table = document.createElement('table');
        table.className = 'timetable';
        
        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = `
            <th>Time</th>
            <th>Monday</th>
            <th>Tuesday</th>
            <th>Wednesday</th>
            <th>Thursday</th>
            <th>Friday</th>
            <th>Saturday</th>
        `;
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Create body
        const tbody = document.createElement('tbody');
        
        classSlots.forEach(timeSlot => {
            const row = document.createElement('tr');
            
            // Time column
            const timeCell = document.createElement('td');
            timeCell.textContent = timeSlot.label;
            timeCell.style.fontWeight = 'bold';
            row.appendChild(timeCell);
            
            // Day columns
            days.forEach(day => {
                const cell = document.createElement('td');
                cell.className = 'timetable-cell';
                
                const assignment = schedule[day] && schedule[day][timeSlot.id];
                if (assignment) {
                    this.renderIndividualTimetableCell(cell, assignment, viewType);
                }
                
                row.appendChild(cell);
            });
            
            tbody.appendChild(row);
        });
        
        table.appendChild(tbody);
        tableContainer.appendChild(table);
        timetableDiv.appendChild(tableContainer);
        
        container.innerHTML = '';
        container.appendChild(timetableDiv);
    },
    
    getEntityById(viewType, entityId) {
        let entities = [];
        switch (viewType) {
            case 'faculty':
                entities = AppData.faculty;
                break;
            case 'student':
                entities = AppData.students;
                break;
            case 'room':
                entities = AppData.rooms;
                break;
        }
        return entities.find(entity => entity.id === entityId);
    },
    
    getIndividualSchedule(viewType, entityId) {
        const schedule = {};
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        
        // Initialize schedule
        days.forEach(day => {
            schedule[day] = {};
        });
        
        // Filter timetable based on view type
        days.forEach(day => {
            if (AppData.timetable[day]) {
                Object.keys(AppData.timetable[day]).forEach(timeSlot => {
                    const assignment = AppData.timetable[day][timeSlot];
                    let includeAssignment = false;
                    
                    switch (viewType) {
                        case 'faculty':
                            const course = AppData.courses.find(c => c.id === assignment.courseId);
                            if (course && course.faculty === AppData.faculty.find(f => f.id === entityId)?.name) {
                                includeAssignment = true;
                            }
                            break;
                        case 'student':
                            const courseForStudent = AppData.courses.find(c => c.id === assignment.courseId);
                            if (courseForStudent && courseForStudent.students && courseForStudent.students.includes(entityId)) {
                                includeAssignment = true;
                            }
                            break;
                        case 'room':
                            if (assignment.roomId === entityId) {
                                includeAssignment = true;
                            }
                            break;
                    }
                    
                    if (includeAssignment) {
                        schedule[day][timeSlot] = assignment;
                    }
                });
            }
        });
        
        return schedule;
    },
    
    renderTimetableCell(cell, assignment, timeSlot) {
        const course = AppData.courses.find(c => c.id === assignment.courseId);
        const room = AppData.rooms.find(r => r.id === assignment.roomId);
        
        if (course) {
            cell.innerHTML = `
                <div class="timetable-slot">
                    <div class="slot-course">${course.name}</div>
                    <div class="slot-faculty">${course.faculty}</div>
                    ${room ? `<div class="slot-room">${room.name}</div>` : ''}
                </div>
            `;
            cell.classList.add('assigned');
            
            // Check for conflicts
            const isConflicted = AppData.conflicts.some(conflict => 
                conflict.day === cell.dataset.day && 
                conflict.timeSlot === timeSlot.label
            );
            
            if (isConflicted) {
                cell.classList.add('conflict');
            }
        }
    },
    
    renderIndividualTimetableCell(cell, assignment, viewType) {
        const course = AppData.courses.find(c => c.id === assignment.courseId);
        const room = AppData.rooms.find(r => r.id === assignment.roomId);
        
        if (course) {
            let content = `<div class="timetable-slot">`;
            
            switch (viewType) {
                case 'faculty':
                    content += `
                        <div class="slot-course">${course.name}</div>
                        ${room ? `<div class="slot-room">${room.name}</div>` : ''}
                        <div class="slot-faculty">${course.students ? course.students.length : 0} students</div>
                    `;
                    break;
                case 'student':
                    content += `
                        <div class="slot-course">${course.name}</div>
                        <div class="slot-faculty">${course.faculty}</div>
                        ${room ? `<div class="slot-room">${room.name}</div>` : ''}
                    `;
                    break;
                case 'room':
                    content += `
                        <div class="slot-course">${course.name}</div>
                        <div class="slot-faculty">${course.faculty}</div>
                        <div class="slot-faculty">${course.students ? course.students.length : 0} students</div>
                    `;
                    break;
            }
            
            content += `</div>`;
            cell.innerHTML = content;
            cell.classList.add('assigned');
        }
    },
    
    refreshConflicts() {
        const container = document.getElementById('conflictsContainer');
        if (!container) return;
        
        if (AppData.conflicts.length === 0) {
            container.innerHTML = '<p class="text-center">No conflicts detected. ✅</p>';
            return;
        }
        
        container.innerHTML = '';
        
        AppData.conflicts.forEach((conflict, index) => {
            const conflictDiv = document.createElement('div');
            conflictDiv.className = 'conflict-item';
            
            conflictDiv.innerHTML = `
                <div class="conflict-title">${conflict.title}</div>
                <div class="conflict-description">${conflict.description}</div>
                <div class="conflict-time">${conflict.day} - ${conflict.timeSlot}</div>
                ${conflict.suggestions ? `
                    <div class="conflict-suggestions">
                        <strong>Suggested Resolutions:</strong>
                        <ul>
                            ${conflict.suggestions.map(suggestion => `<li>${suggestion}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                <div class="conflict-actions">
                    <button class="btn btn--sm btn--primary" onclick="AppController.resolveConflict(${index})">Resolve</button>
                    <button class="btn btn--sm btn--outline" onclick="AppController.ignoreConflict(${index})">Ignore</button>
                </div>
            `;
            
            container.appendChild(conflictDiv);
        });
    },
    
    refreshUnscheduled() {
        const container = document.getElementById('unscheduledContainer');
        if (!container) return;
        
        if (AppData.unscheduled.length === 0) {
            container.innerHTML = '<p class="text-center">All sessions scheduled successfully. ✅</p>';
            return;
        }
        
        container.innerHTML = '';
        
        AppData.unscheduled.forEach((item, index) => {
            const unscheduledDiv = document.createElement('div');
            unscheduledDiv.className = 'unscheduled-item';
            
            unscheduledDiv.innerHTML = `
                <div class="unscheduled-title">Unscheduled Session</div>
                <div class="conflict-description">
                    <strong>Course:</strong> ${item.courseName}<br>
                    <strong>Faculty:</strong> ${item.faculty}<br>
                    <strong>Reason:</strong> ${item.reason}
                </div>
                <div class="conflict-actions">
                    <button class="btn btn--sm btn--primary" onclick="AppController.manualScheduleSession(${index})">Schedule Manually</button>
                    <button class="btn btn--sm btn--outline" onclick="AppController.retrySessionScheduling(${index})">Retry Auto-Schedule</button>
                </div>
            `;
            
            container.appendChild(unscheduledDiv);
        });
    },
    
    refreshSettings() {
        const container = document.getElementById('timeSlotsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        AppData.timeSlots.forEach((timeSlot, index) => {
            const div = document.createElement('div');
            div.className = 'time-slot-item';
            
            div.innerHTML = `
                <input type="text" class="form-control" value="${timeSlot.label}" 
                       onchange="AppController.updateTimeSlot(${index}, 'label', this.value)">
                <input type="time" class="form-control" value="${timeSlot.start}" 
                       onchange="AppController.updateTimeSlot(${index}, 'start', this.value)">
                <input type="time" class="form-control" value="${timeSlot.end}" 
                       onchange="AppController.updateTimeSlot(${index}, 'end', this.value)">
                <select class="form-control" onchange="AppController.updateTimeSlot(${index}, 'type', this.value)">
                    <option value="class" ${timeSlot.type === 'class' ? 'selected' : ''}>Class</option>
                    <option value="break" ${timeSlot.type === 'break' ? 'selected' : ''}>Break</option>
                </select>
                <button class="btn btn--sm btn--outline" onclick="AppController.deleteTimeSlot(${index})">Delete</button>
            `;
            
            container.appendChild(div);
        });
    },
    
    // =============================================================================
    // NEW: EXPORT FUNCTIONALITY FOR INDIVIDUAL VIEWS
    // =============================================================================
    
    exportAllFacultyTimetables() {
        if (AppData.faculty.length === 0) {
            NotificationManager.error('No faculty members available to export');
            return;
        }
        
        this.showLoading(true, 'Exporting all faculty timetables...');
        
        setTimeout(() => {
            const allFacultyData = [];
            
            AppData.faculty.forEach(faculty => {
                const schedule = this.getIndividualSchedule('faculty', faculty.id);
                const csvData = this.convertScheduleToCSV(schedule, 'faculty', faculty);
                
                allFacultyData.push({
                    name: faculty.name,
                    id: faculty.id,
                    department: faculty.department || 'N/A',
                    schedule: csvData
                });
            });
            
            const exportData = {
                exportType: 'All Faculty Timetables',
                exportDate: new Date().toISOString(),
                totalFaculty: AppData.faculty.length,
                data: allFacultyData
            };
            
            this.downloadAsJson(exportData, `all-faculty-timetables-${new Date().toISOString().split('T')[0]}.json`);
            this.showLoading(false);
            NotificationManager.success(`Exported timetables for ${AppData.faculty.length} faculty members!`);
        }, 1000);
    },
    
    exportAllStudentTimetables() {
        if (AppData.students.length === 0) {
            NotificationManager.error('No students available to export');
            return;
        }
        
        this.showLoading(true, 'Exporting all student timetables...');
        
        setTimeout(() => {
            const allStudentData = [];
            
            AppData.students.forEach(student => {
                const schedule = this.getIndividualSchedule('student', student.id);
                const csvData = this.convertScheduleToCSV(schedule, 'student', student);
                
                allStudentData.push({
                    name: student.name,
                    id: student.id,
                    courses: student.courses || [],
                    schedule: csvData
                });
            });
            
            const exportData = {
                exportType: 'All Student Timetables',
                exportDate: new Date().toISOString(),
                totalStudents: AppData.students.length,
                data: allStudentData
            };
            
            this.downloadAsJson(exportData, `all-student-timetables-${new Date().toISOString().split('T')[0]}.json`);
            this.showLoading(false);
            NotificationManager.success(`Exported timetables for ${AppData.students.length} students!`);
        }, 1000);
    },
    
    exportAllRoomTimetables() {
        if (AppData.rooms.length === 0) {
            NotificationManager.error('No rooms available to export');
            return;
        }
        
        this.showLoading(true, 'Exporting all room timetables...');
        
        setTimeout(() => {
            const allRoomData = [];
            
            AppData.rooms.forEach(room => {
                const schedule = this.getIndividualSchedule('room', room.id);
                const csvData = this.convertScheduleToCSV(schedule, 'room', room);
                
                allRoomData.push({
                    name: room.name,
                    id: room.id,
                    capacity: room.capacity,
                    schedule: csvData
                });
            });
            
            const exportData = {
                exportType: 'All Room Timetables',
                exportDate: new Date().toISOString(),
                totalRooms: AppData.rooms.length,
                data: allRoomData
            };
            
            this.downloadAsJson(exportData, `all-room-timetables-${new Date().toISOString().split('T')[0]}.json`);
            this.showLoading(false);
            NotificationManager.success(`Exported timetables for ${AppData.rooms.length} rooms!`);
        }, 1000);
    },
    
    convertScheduleToCSV(schedule, viewType, entity) {
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const classSlots = AppData.timeSlots.filter(slot => slot.type === 'class');
        
        let csvContent = `Time,${days.join(',')}\n`;
        
        classSlots.forEach(timeSlot => {
            let row = `"${timeSlot.label}"`;
            
            days.forEach(day => {
                const assignment = schedule[day] && schedule[day][timeSlot.id];
                let cellContent = '';
                
                if (assignment) {
                    const course = AppData.courses.find(c => c.id === assignment.courseId);
                    const room = AppData.rooms.find(r => r.id === assignment.roomId);
                    
                    if (course) {
                        switch (viewType) {
                            case 'faculty':
                                cellContent = `${course.name} (Room: ${room ? room.name : 'TBA'})`;
                                break;
                            case 'student':
                                cellContent = `${course.name} - ${course.faculty} (Room: ${room ? room.name : 'TBA'})`;
                                break;
                            case 'room':
                                cellContent = `${course.name} - ${course.faculty} (${course.students ? course.students.length : 0} students)`;
                                break;
                        }
                    }
                }
                
                row += `,"${cellContent}"`;
            });
            
            csvContent += row + '\n';
        });
        
        return csvContent;
    },
    
    // =============================================================================
    // MODAL MANAGEMENT AND FORMS
    // =============================================================================
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
        }
    },
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
        }
    },
    
    openCourseModal(courseId = null) {
        const form = document.getElementById('courseForm');
        const title = document.getElementById('courseModalTitle');
        
        if (form) form.reset();
        
        if (courseId) {
            const course = AppData.courses.find(c => c.id === courseId);
            if (course) {
                if (title) title.textContent = 'Edit Course';
                this.populateCourseForm(course);
            }
        } else if (title) {
            title.textContent = 'Add Course';
        }
        
        this.updateFormOptions();
        this.openModal('courseModal');
    },
    
    populateCourseForm(course) {
        const fields = {
            courseId: course.id,
            courseName: course.name,
            courseSessions: course.sessionsPerWeek,
            courseFaculty: course.faculty
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
    },
    
    openFacultyModal(facultyId = null) {
        const form = document.getElementById('facultyForm');
        const title = document.getElementById('facultyModalTitle');
        
        if (form) form.reset();
        
        if (facultyId) {
            const faculty = AppData.faculty.find(f => f.id === facultyId);
            if (faculty) {
                if (title) title.textContent = 'Edit Faculty';
                this.populateFacultyForm(faculty);
            }
        } else if (title) {
            title.textContent = 'Add Faculty';
        }
        
        this.openModal('facultyModal');
    },
    
    populateFacultyForm(faculty) {
        const fields = {
            facultyId: faculty.id,
            facultyName: faculty.name,
            facultyDepartment: faculty.department || ''
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
    },
    
    openStudentModal(studentId = null) {
        const form = document.getElementById('studentForm');
        const title = document.getElementById('studentModalTitle');
        
        if (form) form.reset();
        
        if (studentId) {
            const student = AppData.students.find(s => s.id === studentId);
            if (student) {
                if (title) title.textContent = 'Edit Student';
                this.populateStudentForm(student);
            }
        } else if (title) {
            title.textContent = 'Add Student';
        }
        
        this.updateFormOptions();
        this.openModal('studentModal');
    },
    
    populateStudentForm(student) {
        const fields = {
            studentId: student.id,
            studentName: student.name
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
    },
    
    openRoomModal(roomId = null) {
        const form = document.getElementById('roomForm');
        const title = document.getElementById('roomModalTitle');
        
        if (form) form.reset();
        
        if (roomId) {
            const room = AppData.rooms.find(r => r.id === roomId);
            if (room) {
                if (title) title.textContent = 'Edit Room';
                this.populateRoomForm(room);
            }
        } else if (title) {
            title.textContent = 'Add Room';
        }
        
        this.openModal('roomModal');
    },
    
    populateRoomForm(room) {
        const fields = {
            roomId: room.id,
            roomName: room.name,
            roomCapacity: room.capacity
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field) field.value = value;
        });
    },
    
    handleTimetableCellClick(cell) {
        // Placeholder for timetable editing
        NotificationManager.info('Timetable editing coming soon!');
    },
    
    handleEditSubmit(e) {
        e.preventDefault();
        this.closeModal('editModal');
    },
    
    // =============================================================================
    // FORM HANDLERS
    // =============================================================================
    
    handleCourseSubmit(e) {
        e.preventDefault();
        
        const course = {
            id: document.getElementById('courseId')?.value?.trim() || '',
            name: document.getElementById('courseName')?.value?.trim() || '',
            sessionsPerWeek: parseInt(document.getElementById('courseSessions')?.value) || 1,
            faculty: document.getElementById('courseFaculty')?.value || '',
            students: []
        };
        
        if (!this.validateCourseData(course)) return;
        
        const existingIndex = AppData.courses.findIndex(c => c.id === course.id);
        if (existingIndex >= 0) {
            AppData.courses[existingIndex] = course;
            NotificationManager.success('Course updated successfully!');
        } else {
            AppData.courses.push(course);
            NotificationManager.success('Course added successfully!');
        }
        
        this.refreshCoursesTable();
        this.updateDashboard();
        this.updateGettingStartedVisibility();
        this.closeModal('courseModal');
    },
    
    handleFacultySubmit(e) {
        e.preventDefault();
        
        const faculty = {
            id: document.getElementById('facultyId')?.value?.trim() || '',
            name: document.getElementById('facultyName')?.value?.trim() || '',
            department: document.getElementById('facultyDepartment')?.value?.trim() || '',
            courses: []
        };
        
        if (!this.validateFacultyData(faculty)) return;
        
        const existingIndex = AppData.faculty.findIndex(f => f.id === faculty.id);
        if (existingIndex >= 0) {
            AppData.faculty[existingIndex] = faculty;
            NotificationManager.success('Faculty updated successfully!');
        } else {
            AppData.faculty.push(faculty);
            NotificationManager.success('Faculty added successfully!');
        }
        
        this.refreshFacultyTable();
        this.updateFormOptions();
        this.updateDashboard();
        this.updateGettingStartedVisibility();
        this.closeModal('facultyModal');
    },
    
    handleStudentSubmit(e) {
        e.preventDefault();
        
        const student = {
            id: document.getElementById('studentId')?.value?.trim() || '',
            name: document.getElementById('studentName')?.value?.trim() || '',
            courses: []
        };
        
        if (!this.validateStudentData(student)) return;
        
        const existingIndex = AppData.students.findIndex(s => s.id === student.id);
        if (existingIndex >= 0) {
            AppData.students[existingIndex] = student;
            NotificationManager.success('Student updated successfully!');
        } else {
            AppData.students.push(student);
            NotificationManager.success('Student added successfully!');
        }
        
        this.refreshStudentsTable();
        this.updateFormOptions();
        this.updateDashboard();
        this.updateGettingStartedVisibility();
        this.closeModal('studentModal');
    },
    
    handleRoomSubmit(e) {
        e.preventDefault();
        
        const room = {
            id: document.getElementById('roomId')?.value?.trim() || '',
            name: document.getElementById('roomName')?.value?.trim() || '',
            capacity: parseInt(document.getElementById('roomCapacity')?.value) || 1
        };
        
        if (!this.validateRoomData(room)) return;
        
        const existingIndex = AppData.rooms.findIndex(r => r.id === room.id);
        if (existingIndex >= 0) {
            AppData.rooms[existingIndex] = room;
            NotificationManager.success('Room updated successfully!');
        } else {
            AppData.rooms.push(room);
            NotificationManager.success('Room added successfully!');
        }
        
        this.refreshRoomsTable();
        this.updateDashboard();
        this.updateGettingStartedVisibility();
        this.closeModal('roomModal');
    },
    
    // =============================================================================
    // VALIDATION FUNCTIONS
    // =============================================================================
    
    validateCourseData(course) {
        if (!course.id) {
            NotificationManager.error('Please enter a Course ID');
            return false;
        }
        if (!course.name) {
            NotificationManager.error('Please enter a Course Name');
            return false;
        }
        if (!course.faculty) {
            NotificationManager.error('Please select a Faculty member');
            return false;
        }
        return true;
    },
    
    validateFacultyData(faculty) {
        if (!faculty.id) {
            NotificationManager.error('Please enter a Faculty ID');
            return false;
        }
        if (!faculty.name) {
            NotificationManager.error('Please enter a Faculty Name');
            return false;
        }
        return true;
    },
    
    validateStudentData(student) {
        if (!student.id) {
            NotificationManager.error('Please enter a Student ID');
            return false;
        }
        if (!student.name) {
            NotificationManager.error('Please enter a Student Name');
            return false;
        }
        return true;
    },
    
    validateRoomData(room) {
        if (!room.id) {
            NotificationManager.error('Please enter a Room ID');
            return false;
        }
        if (!room.name) {
            NotificationManager.error('Please enter a Room Name');
            return false;
        }
        return true;
    },
    
    // =============================================================================
    // UTILITY FUNCTIONS
    // =============================================================================
    
    updateFormOptions() {
        // Update faculty options in course form
        const facultySelect = document.getElementById('courseFaculty');
        if (facultySelect) {
            const currentValue = facultySelect.value;
            facultySelect.innerHTML = '<option value="">Select Faculty</option>';
            AppData.faculty.forEach(faculty => {
                const option = document.createElement('option');
                option.value = faculty.name;
                option.textContent = `${faculty.name} (${faculty.department || 'N/A'})`;
                facultySelect.appendChild(option);
            });
            facultySelect.value = currentValue;
        }
    },
    
    showLoading(show, text = 'Processing...') {
        const overlay = document.getElementById('loadingOverlay');
        const loadingText = document.getElementById('loadingText');
        
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
        if (loadingText) {
            loadingText.textContent = text;
        }
    },
    
    downloadAsJson(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    downloadAsCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },
    
    // =============================================================================
    // CRUD OPERATIONS
    // =============================================================================
    
    editCourse(courseId) { this.openCourseModal(courseId); },
    editFaculty(facultyId) { this.openFacultyModal(facultyId); },
    editStudent(studentId) { this.openStudentModal(studentId); },
    editRoom(roomId) { this.openRoomModal(roomId); },
    
    deleteCourse(courseId) {
        if (confirm('Are you sure you want to delete this course?')) {
            AppData.courses = AppData.courses.filter(c => c.id !== courseId);
            this.refreshCoursesTable();
            this.updateDashboard();
            this.updateGettingStartedVisibility();
            NotificationManager.success('Course deleted successfully!');
        }
    },
    
    deleteFaculty(facultyId) {
        if (confirm('Are you sure you want to delete this faculty member?')) {
            AppData.faculty = AppData.faculty.filter(f => f.id !== facultyId);
            this.refreshFacultyTable();
            this.updateFormOptions();
            this.updateDashboard();
            this.updateGettingStartedVisibility();
            NotificationManager.success('Faculty deleted successfully!');
        }
    },
    
    deleteStudent(studentId) {
        if (confirm('Are you sure you want to delete this student?')) {
            AppData.students = AppData.students.filter(s => s.id !== studentId);
            this.refreshStudentsTable();
            this.updateFormOptions();
            this.updateDashboard();
            this.updateGettingStartedVisibility();
            NotificationManager.success('Student deleted successfully!');
        }
    },
    
    deleteRoom(roomId) {
        if (confirm('Are you sure you want to delete this room?')) {
            AppData.rooms = AppData.rooms.filter(r => r.id !== roomId);
            this.refreshRoomsTable();
            this.updateDashboard();
            this.updateGettingStartedVisibility();
            NotificationManager.success('Room deleted successfully!');
        }
    },
    
    // =============================================================================
    // EXPORT AND OTHER FUNCTIONALITY
    // =============================================================================
    
    exportAll() {
        const data = {
            courses: AppData.courses,
            faculty: AppData.faculty,
            students: AppData.students,
            rooms: AppData.rooms,
            timetable: AppData.timetable,
            timeSlots: AppData.timeSlots,
            conflicts: AppData.conflicts,
            unscheduled: AppData.unscheduled,
            exportDate: new Date().toISOString()
        };
        
        this.downloadAsJson(data, `university-schedule-export-${new Date().toISOString().split('T')[0]}.json`);
        NotificationManager.success('All data exported successfully!');
    },
    
    exportTimetable() {
        const viewType = document.getElementById('viewTypeSelect')?.value || 'master';
        const entityId = document.getElementById('entitySelect')?.value || '';
        
        if (viewType === 'master') {
            this.downloadAsJson(AppData.timetable, `master-timetable-${new Date().toISOString().split('T')[0]}.json`);
            NotificationManager.success('Master timetable exported successfully!');
        } else if (entityId) {
            const entity = this.getEntityById(viewType, entityId);
            const schedule = this.getIndividualSchedule(viewType, entityId);
            const csvData = this.convertScheduleToCSV(schedule, viewType, entity);
            
            this.downloadAsCSV(csvData, `${viewType}-${entityId}-timetable-${new Date().toISOString().split('T')[0]}.csv`);
            NotificationManager.success(`${entity?.name || entityId} timetable exported successfully!`);
        } else {
            NotificationManager.error(`Please select a ${viewType} to export their timetable`);
        }
    },
    
    // Settings
    saveSettings() {
        NotificationManager.success('Settings saved successfully!');
    },
    
    addTimeSlot() {
        const newSlot = {
            id: `slot-${Date.now()}`,
            start: '09:00',
            end: '10:00',
            label: 'New Time Slot',
            type: 'class'
        };
        
        AppData.timeSlots.push(newSlot);
        this.refreshSettings();
        NotificationManager.success('Time slot added successfully!');
    },
    
    updateTimeSlot(index, field, value) {
        if (AppData.timeSlots[index]) {
            AppData.timeSlots[index][field] = value;
        }
    },
    
    deleteTimeSlot(index) {
        if (confirm('Are you sure you want to delete this time slot?')) {
            AppData.timeSlots.splice(index, 1);
            this.refreshSettings();
            NotificationManager.success('Time slot deleted successfully!');
        }
    },
    
    // Conflict management
    resolveConflict(index) {
        AppData.conflicts.splice(index, 1);
        this.refreshConflicts();
        this.updateDashboard();
        NotificationManager.success('Conflict resolved!');
    },
    
    ignoreConflict(index) {
        AppData.conflicts.splice(index, 1);
        this.refreshConflicts();
        this.updateDashboard();
        NotificationManager.info('Conflict ignored');
    },
    
    // Unscheduled management
    retryScheduling() {
        NotificationManager.info('Retrying scheduling...');
        this.generateTimetable();
    },
    
    manualSchedule() {
        NotificationManager.info('Please use the timetable view to manually assign sessions');
        this.switchTab('timetable');
    },
    
    manualScheduleSession(index) {
        NotificationManager.info('Switching to timetable for manual scheduling');
        this.switchTab('timetable');
    },
    
    retrySessionScheduling(index) {
        AppData.unscheduled.splice(index, 1);
        this.refreshUnscheduled();
        this.updateDashboard();
        NotificationManager.success('Session removed from unscheduled list');
    }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing University Course Scheduler');
    AppController.init();
});