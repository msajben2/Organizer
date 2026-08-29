import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3s66YOemJTt5xAarMZwsQ4rT6G43dACw",
  authDomain: "organizator-977e1.firebaseapp.com",
  projectId: "organizator-977e1",
  storageBucket: "organizator-977e1.firebasestorage.app",
  messagingSenderId: "578176410373",
  appId: "1:578176410373:web:0c67cdd0b090439c048d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// REFERENCIE NA ELEMENTY
const taskNameInput = document.getElementById('taskName');
const taskTimeInput = document.getElementById('taskTime');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYear');

// Modal elementy
const modal = document.getElementById('taskModal');
const closeModal = document.getElementById('closeModal');
const modalTaskName = document.getElementById('modalTaskName');
const modalTaskTime = document.getElementById('modalTaskTime');

let tasksData = [];
let weekOffset = 0; // Posun po týždňoch (0 = aktuálny týždeň, 1 = ďalší...)

// --- LOGIKA DATABÁZY ---
addTaskBtn.addEventListener('click', async () => {
    const name = taskNameInput.value;
    const time = taskTimeInput.value;

    if (name && time) {
        try {
            await addDoc(collection(db, "tasks"), { name, time, timestamp: Date.now() });
            taskNameInput.value = '';
            taskTimeInput.value = '';
        } catch (e) {
            console.error("Chyba: ", e);
        }
    } else {
        alert("Prosím, vyplň názov aj čas úlohy.");
    }
});

const q = query(collection(db, "tasks"), orderBy("time", "asc"));
onSnapshot(q, (snapshot) => {
    taskList.innerHTML = ''; 
    tasksData = []; 

    snapshot.forEach((doc) => {
        const task = doc.data();
        tasksData.push(task); 
        
        // Vykreslenie do spodného zoznamu
        const li = document.createElement('li');
        li.className = 'task-item';
        const dateObj = new Date(task.time);
        li.innerHTML = `<span><strong>${task.name}</strong></span> <span>${dateObj.toLocaleString('sk-SK')}</span>`;
        taskList.appendChild(li);
    });

    // Keď stiahneme údaje z databázy, zakreslíme ich aj do kalendára
    renderTasksIntoCalendar();
});

// --- LOGIKA KALENDÁRA (14-dňový pohľad) ---
const slovakHolidays = {
    "1-1": "Deň vzniku SR", "1-6": "Traja králi", "5-1": "Sviatok práce",
    "5-8": "Deň víťazstva", "7-5": "Cyril a Metod", "8-29": "SNP",
    "9-1": "Deň Ústavy", "9-15": "Sedembolestná P. Mária",
    "11-1": "Všetkých svätých", "11-17": "Deň boja za slobodu",
    "12-24": "Štedrý deň", "12-25": "1. sviatok vianočný", "12-26": "2. sviatok vianočný"
};

const slovakNameDays = { "1-1": "Nový rok", "8-29": "Nikola", "8-30": "Ružena", "8-31": "Nora", "9-1": "Drahoslava" };
const monthNames = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];

function renderCalendar() {
    calendarGrid.innerHTML = '';
    const today = new Date();
    
    // Zistenie pondelka aktuálneho týždňa s ohľadom na to, či sme sa posunuli
    let dayOfWeek = today.getDay();
    let diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    let startDay = new Date(today);
    startDay.setDate(today.getDate() + diffToMonday + (weekOffset * 7));

    // Nadpis (Mesiac a Rok)
    monthYearDisplay.innerText = `${monthNames[startDay.getMonth()]} ${startDay.getFullYear()}`;

    // Vykreslenie presne 14 dní (2 riadky x 7 dní)
    for (let i = 0; i < 14; i++) {
        const currentDay = new Date(startDay);
        currentDay.setDate(startDay.getDate() + i);
        
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        
        // Zvýrazni, ak je tento deň "Dnes"
        if (currentDay.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        const m = currentDay.getMonth() + 1;
        const d = currentDay.getDate();
        const dateKey = `${m}-${d}`; 
        
        // Zobrazenie čísla dňa
        let dayHTML = `<span class="day-number">${d}.</span>`;
        if (slovakHolidays[dateKey]) dayHTML += `<span class="holiday">${slovakHolidays[dateKey]}</span>`;
        if (slovakNameDays[dateKey]) dayHTML += `<span class="name-day">${slovakNameDays[dateKey]}</span>`;
        
        // Tento kontajner (div) bude držať naše úlohy pre daný deň
        const isoDate = currentDay.toISOString().split('T')[0]; // Výsledok: "RRRR-MM-DD"
        dayHTML += `<div class="day-tasks-container" id="tasks-${isoDate}"></div>`;

        dayDiv.innerHTML = dayHTML;

        // Kliknutie na prázdny deň predvyplní formulár
        dayDiv.addEventListener('click', (e) => {
            // Ak klikneme priamo na úlohu, nechceme meniť čas vo formulári
            if (e.target.classList.contains('task-indicator')) return;

            const clickedDate = new Date(currentDay);
            clickedDate.setHours(12, 0, 0, 0); 
            clickedDate.setMinutes(clickedDate.getMinutes() - clickedDate.getTimezoneOffset());
            taskTimeInput.value = clickedDate.toISOString().slice(0, 16);
            taskTimeInput.scrollIntoView({ behavior: "smooth" });
        });

        calendarGrid.appendChild(dayDiv);
    }
    
    // Keď sa vykreslia nové dni, musíme tam nahrať znova aj úlohy
    renderTasksIntoCalendar();
}

// Zoberie údaje z databázy a vloží malé obdĺžničky do správnych dní
function renderTasksIntoCalendar() {
    tasksData.forEach(task => {
        if(!task.time) return;
        const taskDateOnly = task.time.split('T')[0]; // Získa "RRRR-MM-DD"
        const targetContainer = document.getElementById(`tasks-${taskDateOnly}`);
        
        if (targetContainer) {
            const taskBlock = document.createElement('div');
            taskBlock.classList.add('task-indicator');
            taskBlock.innerText = task.name;
            
            // Kliknutie na úlohu otvorí Modal
            taskBlock.addEventListener('click', (e) => {
                e.stopPropagation(); // Zastaví kliknutie, aby sa neprenieslo na deň
                openTaskModal(task);
            });
            
            targetContainer.appendChild(taskBlock);
        }
    });
}

// --- LOGIKA MODALU (Vyskakovacie okno) ---
function openTaskModal(task) {
    modalTaskName.innerText = task.name;
    const d = new Date(task.time);
    modalTaskTime.innerText = d.toLocaleString('sk-SK');
    modal.classList.remove('hidden');
}

closeModal.addEventListener('click', () => modal.classList.add('hidden'));

// Kliknutie mimo okna ho zatvorí
window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
});

// Tlačidlá posunu (o týždeň dopredu a dozadu)
document.getElementById('prevPeriod').addEventListener('click', () => { weekOffset -= 1; renderCalendar(); });
document.getElementById('nextPeriod').addEventListener('click', () => { weekOffset += 1; renderCalendar(); });

// Spustenie pri načítaní
renderCalendar();