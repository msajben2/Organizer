import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// FIREBASE KONFIGURÁCIA (Zatiaľ pripravené, neskôr sem vložíme tvoje údaje)
const firebaseConfig = {
  apiKey: "TVOJ_API_KEY",
  authDomain: "tvoj-projekt.firebaseapp.com",
  projectId: "tvoj-projekt",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// REFERENCIE NA HTML ELEMENTY
const taskNameInput = document.getElementById('taskName');
const taskTimeInput = document.getElementById('taskTime');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYear');

let tasksData = [];
let currentDate = new Date(); 

// --- LOGIKA DATABÁZY ---
addTaskBtn.addEventListener('click', async () => {
    const name = taskNameInput.value;
    const time = taskTimeInput.value;

    if (name && time) {
        try {
            await addDoc(collection(db, "tasks"), {
                name: name,
                time: time,
                timestamp: Date.now()
            });
            taskNameInput.value = '';
            taskTimeInput.value = '';
        } catch (e) {
            console.error("Chyba pri pridávaní úlohy: ", e);
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
        
        const li = document.createElement('li');
        li.className = 'task-item';
        const dateObj = new Date(task.time);
        const formattedDate = dateObj.toLocaleString('sk-SK');

        li.innerHTML = `
            <span><strong>${task.name}</strong></span>
            <span>${formattedDate}</span>
        `;
        taskList.appendChild(li);
    });
});

setInterval(() => {
    const now = new Date();
    const currentTimeStr = now.toISOString().slice(0, 16); 
    tasksData.forEach(task => {
        if (task.time === currentTimeStr) {
            alert(`ČAS NA ÚLOHU: ${task.name}`);
        }
    });
}, 60000);

// --- LOGIKA KALENDÁRA ---
const slovakHolidays = {
    "1-1": "Deň vzniku SR", "1-6": "Traja králi", "5-1": "Sviatok práce",
    "5-8": "Deň víťazstva", "7-5": "Cyril a Metod", "8-29": "SNP",
    "9-1": "Deň Ústavy", "9-15": "Sedembolestná P. Mária",
    "11-1": "Všetkých svätých", "11-17": "Deň boja za slobodu",
    "12-24": "Štedrý deň", "12-25": "1. sviatok vianočný", "12-26": "2. sviatok vianočný"
};

const slovakNameDays = {
    "1-1": "Nový rok", "8-29": "Nikola", "8-30": "Ružena",
    "8-31": "Nora", "9-1": "Drahoslava"
    // Doplníme neskôr
};

const monthNames = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];

function renderCalendar(date) {
    calendarGrid.innerHTML = '';
    const year = date.getFullYear();
    const month = date.getMonth();
    monthYearDisplay.innerText = `${monthNames[month]} ${year}`;

    let firstDay = new Date(year, month, 1).getDay();
    firstDay = firstDay === 0 ? 6 : firstDay - 1; 
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'empty');
        calendarGrid.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        
        const today = new Date();
        if (i === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        const dateKey = `${month + 1}-${i}`; 
        let dayHTML = `<span class="day-number">${i}.</span>`;

        if (slovakHolidays[dateKey]) dayHTML += `<span class="holiday">${slovakHolidays[dateKey]}</span>`;
        if (slovakNameDays[dateKey]) dayHTML += `<span class="name-day">${slovakNameDays[dateKey]}</span>`;

        dayDiv.innerHTML = dayHTML;

        dayDiv.addEventListener('click', () => {
            const clickedDate = new Date(year, month, i, 12, 0); 
            clickedDate.setMinutes(clickedDate.getMinutes() - clickedDate.getTimezoneOffset());
            taskTimeInput.value = clickedDate.toISOString().slice(0, 16);
            taskTimeInput.scrollIntoView({ behavior: "smooth" });
        });

        calendarGrid.appendChild(dayDiv);
    }
}

document.getElementById('prevMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar(currentDate);
});

document.getElementById('nextMonth').addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar(currentDate);
});

renderCalendar(currentDate);