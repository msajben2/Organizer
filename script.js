import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Úložisko (Storage) sme úplne vymazali, už ho nepotrebujeme

// TVOJE FIREBASE KĽÚČE
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
const taskImageInput = document.getElementById('taskImage'); // Input pre fotku
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');
const calendarGrid = document.getElementById('calendarGrid');
const monthYearDisplay = document.getElementById('monthYear');

// Modal elementy
const modal = document.getElementById('taskModal');
const closeModal = document.getElementById('closeModal');
const modalTaskName = document.getElementById('modalTaskName');
const modalTaskTime = document.getElementById('modalTaskTime');
const modalTaskImage = document.getElementById('modalTaskImage'); // Fotka v okne

let tasksData = [];
let weekOffset = 0; 

// --- FUNKCIA NA ZMENŠENIE FOTKY A PREMENU NA TEXT (Base64) ---
function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file); // Načítame fotku
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                // Vytvoríme neviditeľné plátno pre zmenšenie
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Maximálne rozmery pre záchranu miesta v databáze
                const MAX_WIDTH = 800;
                const MAX_HEIGHT = 800;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                // Vyplujeme obrázok ako textový kód (kvalita znížená na 70%)
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                resolve(compressedBase64);
            };
        };
    });
}

// --- LOGIKA DATABÁZY A FOTIEK ---
addTaskBtn.addEventListener('click', async () => {
    const name = taskNameInput.value;
    const time = taskTimeInput.value;
    const file = taskImageInput.files[0];

    if (name && time) {
        addTaskBtn.innerText = "Nahrávam..."; 
        addTaskBtn.disabled = true;

        try {
            let base64Image = null;
            
            // Ak je vložená fotka, skomprimujeme ju
            if (file) {
                base64Image = await compressImage(file);
            }

            // Uložíme všetko pekne do Firestore databázy
            await addDoc(collection(db, "tasks"), { 
                name: name, 
                time: time, 
                imageUrl: base64Image, // Fotka sa uloží ako jeden dlhý text
                timestamp: Date.now() 
            });

            taskNameInput.value = '';
            taskTimeInput.value = '';
            taskImageInput.value = '';
        } catch (e) {
            console.error("Chyba: ", e);
            alert("Nastala chyba. Možno je obrázok aj po kompresii na databázu privelký.");
        } finally {
            addTaskBtn.innerText = "Pridať úlohu";
            addTaskBtn.disabled = false;
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
        
        const hasPhotoIcon = task.imageUrl ? "📸 " : "";
        li.innerHTML = `<span><strong>${hasPhotoIcon}${task.name}</strong></span> <span>${dateObj.toLocaleString('sk-SK')}</span>`;
        taskList.appendChild(li);
    });
    renderTasksIntoCalendar();
});

// --- LOGIKA KALENDÁRA ---
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
    
    let dayOfWeek = today.getDay();
    let diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    let startDay = new Date(today);
    startDay.setDate(today.getDate() + diffToMonday + (weekOffset * 7));

    monthYearDisplay.innerText = `${monthNames[startDay.getMonth()]} ${startDay.getFullYear()}`;

    for (let i = 0; i < 14; i++) {
        const currentDay = new Date(startDay);
        currentDay.setDate(startDay.getDate() + i);
        
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        
        if (currentDay.toDateString() === today.toDateString()) {
            dayDiv.classList.add('today');
        }

        const m = currentDay.getMonth() + 1;
        const d = currentDay.getDate();
        const dateKey = `${m}-${d}`; 
        
        let dayHTML = `<span class="day-number">${d}.</span>`;
        if (slovakHolidays[dateKey]) dayHTML += `<span class="holiday">${slovakHolidays[dateKey]}</span>`;
        if (slovakNameDays[dateKey]) dayHTML += `<span class="name-day">${slovakNameDays[dateKey]}</span>`;
        
        const isoDate = currentDay.toISOString().split('T')[0]; 
        dayHTML += `<div class="day-tasks-container" id="tasks-${isoDate}"></div>`;

        dayDiv.innerHTML = dayHTML;

        dayDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('task-indicator')) return;
            const clickedDate = new Date(currentDay);
            clickedDate.setHours(12, 0, 0, 0); 
            clickedDate.setMinutes(clickedDate.getMinutes() - clickedDate.getTimezoneOffset());
            taskTimeInput.value = clickedDate.toISOString().slice(0, 16);
            taskTimeInput.scrollIntoView({ behavior: "smooth" });
        });

        calendarGrid.appendChild(dayDiv);
    }
    renderTasksIntoCalendar();
}

function renderTasksIntoCalendar() {
    tasksData.forEach(task => {
        if(!task.time) return;
        const taskDateOnly = task.time.split('T')[0]; 
        const targetContainer = document.getElementById(`tasks-${taskDateOnly}`);
        
        if (targetContainer) {
            const taskBlock = document.createElement('div');
            taskBlock.classList.add('task-indicator');
            const hasPhotoIcon = task.imageUrl ? "📸 " : "";
            taskBlock.innerText = hasPhotoIcon + task.name;
            
            taskBlock.addEventListener('click', (e) => {
                e.stopPropagation(); 
                openTaskModal(task);
            });
            
            targetContainer.appendChild(taskBlock);
        }
    });
}

// --- LOGIKA MODALU ---
function openTaskModal(task) {
    modalTaskName.innerText = task.name;
    const d = new Date(task.time);
    modalTaskTime.innerText = d.toLocaleString('sk-SK');
    
    if (task.imageUrl) {
        modalTaskImage.src = task.imageUrl;
        modalTaskImage.style.display = 'block';
    } else {
        modalTaskImage.src = '';
        modalTaskImage.style.display = 'none';
    }

    modal.classList.remove('hidden');
}

closeModal.addEventListener('click', () => modal.classList.add('hidden'));

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.add('hidden');
});

document.getElementById('prevPeriod').addEventListener('click', () => { weekOffset -= 1; renderCalendar(); });
document.getElementById('nextPeriod').addEventListener('click', () => { weekOffset += 1; renderCalendar(); });

renderCalendar();