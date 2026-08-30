import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
// NOVÉ: getDocs a writeBatch pre prácu so sekvenciami úloh
import { getFirestore, collection, addDoc, onSnapshot, query, where, doc, deleteDoc, updateDoc, increment, getDoc, setDoc, writeBatch, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, sendPasswordResetEmail, browserLocalPersistence, setPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyB3s66YOemJTt5xAarMZwSq4rT6G43dACw",
  authDomain: "organizator-977e1.firebaseapp.com",
  projectId: "organizator-977e1",
  storageBucket: "organizator-977e1.firebasestorage.app",
  messagingSenderId: "578176410373",
  appId: "1:578176410373:web:0c67cdd0b090439c048d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(console.error);

if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
    Notification.requestPermission();
}

let isLoginMode = true; 
const loginScreen = document.getElementById('loginScreen'); const appContainer = document.getElementById('appContainer');
const authTitle = document.getElementById('authTitle'); const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput'); const confirmPasswordWrapper = document.getElementById('confirmPasswordWrapper');
const confirmPasswordInput = document.getElementById('confirmPasswordInput'); const togglePassword = document.getElementById('togglePassword');
const mainAuthBtn = document.getElementById('mainAuthBtn'); const toggleAuthModeBtn = document.getElementById('toggleAuthMode');
const forgotPasswordBtn = document.getElementById('forgotPassword'); const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess'); const logoutBtn = document.getElementById('logoutBtn');
const coinBalanceDisplay = document.getElementById('coinBalance');

// PRVKY PRE RUTINY
const taskTypeSelect = document.getElementById('taskType');
const weeklyConfig = document.getElementById('weeklyConfig');
const intervalConfig = document.getElementById('intervalConfig');
const routineEndConfig = document.getElementById('routineEndConfig');
const routineEndDateInput = document.getElementById('routineEndDate');
// Predvolený dátum ukončenia rutiny (+1 mesiac)
let defaultEnd = new Date(); defaultEnd.setMonth(defaultEnd.getMonth() + 1);
routineEndDateInput.value = defaultEnd.toISOString().split('T')[0];

taskTypeSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    weeklyConfig.style.display = val === 'weekly' ? 'flex' : 'none';
    intervalConfig.style.display = val === 'interval' ? 'flex' : 'none';
    routineEndConfig.style.display = (val === 'weekly' || val === 'interval') ? 'block' : 'none';
});

const taskNameInput = document.getElementById('taskName'); const taskTimeInput = document.getElementById('taskTime');
const taskPriorityInput = document.getElementById('taskPriority'); const taskImageInput = document.getElementById('taskImage');
const addTaskBtn = document.getElementById('addTaskBtn'); const taskList = document.getElementById('taskList');
const calendarGrid = document.getElementById('calendarGrid'); const monthYearDisplay = document.getElementById('monthYear');
const modal = document.getElementById('taskModal'); const closeModal = document.getElementById('closeModal');
const modalTaskName = document.getElementById('modalTaskName'); const modalTaskTime = document.getElementById('modalTaskTime');
const modalRoutineInfo = document.getElementById('modalRoutineInfo');
const modalTaskReward = document.getElementById('modalTaskReward'); const modalTaskImage = document.getElementById('modalTaskImage');

const completeTaskBtn = document.getElementById('completeTaskBtn'); const snoozeTaskBtn = document.getElementById('snoozeTaskBtn');
const deleteTaskBtn = document.getElementById('deleteTaskBtn');

let tasksData = []; let weekOffset = 0; let currentUser = null; let currentOpenedTask = null; 
let unsubscribeTasks = null; let unsubscribeUser = null;

// Auth toggles & login functions
togglePassword.addEventListener('click', () => {
    if (passwordInput.type === 'password') { passwordInput.type = 'text'; confirmPasswordInput.type = 'text'; togglePassword.innerText = '🙈'; } 
    else { passwordInput.type = 'password'; confirmPasswordInput.type = 'password'; togglePassword.innerText = '👁️‍🗨️'; }
});
toggleAuthModeBtn.addEventListener('click', (e) => {
    e.preventDefault(); isLoginMode = !isLoginMode; authError.style.display = 'none'; authSuccess.style.display = 'none';
    if (isLoginMode) {
        authTitle.innerText = "Prihlásenie"; confirmPasswordWrapper.style.display = 'none'; mainAuthBtn.innerText = "Prihlásiť sa"; toggleAuthModeBtn.innerText = "Nemáš účet? Zaregistruj sa"; forgotPasswordBtn.style.display = 'inline-block';
    } else {
        authTitle.innerText = "Registrácia"; confirmPasswordWrapper.style.display = 'block'; mainAuthBtn.innerText = "Vytvoriť účet"; toggleAuthModeBtn.innerText = "Už máš účet? Prihlás sa"; forgotPasswordBtn.style.display = 'none';
    }
});

function loadUserCoins() {
    const userRef = doc(db, "users", currentUser.uid);
    unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) { coinBalanceDisplay.innerText = `🪙 ${docSnap.data().totalCoins || 0}`; } 
        else { coinBalanceDisplay.innerText = `🪙 0`; }
    });
}

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user; loginScreen.style.display = 'none'; appContainer.style.display = 'block';
        loadUserTasks(); loadUserCoins(); 
    } else {
        currentUser = null; loginScreen.style.display = 'flex'; appContainer.style.display = 'none';
        if(unsubscribeTasks) unsubscribeTasks(); if(unsubscribeUser) unsubscribeUser(); tasksData = []; renderCalendar(); 
    }
});

mainAuthBtn.addEventListener('click', async () => {
    authError.style.display = 'none'; authSuccess.style.display = 'none';
    const email = emailInput.value; const password = passwordInput.value;
    if (isLoginMode) {
        try { await signInWithEmailAndPassword(auth, email, password); } 
        catch (e) { authError.innerText = "Nesprávny e-mail alebo heslo."; authError.style.display = 'block'; }
    } else {
        const confirmPassword = confirmPasswordInput.value;
        if (password !== confirmPassword) { authError.innerText = "Heslá sa nezhodujú!"; authError.style.display = 'block'; return; }
        if (password.length < 6) { authError.innerText = "Heslo musí mať aspoň 6 znakov."; authError.style.display = 'block'; return; }
        try {
            await createUserWithEmailAndPassword(auth, email, password); await signOut(auth); 
            authSuccess.innerText = "Účet vytvorený! Teraz sa prihlás."; authSuccess.style.display = 'block';
            passwordInput.value = ''; confirmPasswordInput.value = '';
            isLoginMode = true; authTitle.innerText = "Prihlásenie"; confirmPasswordWrapper.style.display = 'none';
            mainAuthBtn.innerText = "Prihlásiť sa"; toggleAuthModeBtn.innerText = "Nemáš účet? Zaregistruj sa"; forgotPasswordBtn.style.display = 'inline-block';
        } catch (e) { authError.innerText = "E-mail už zrejme existuje."; authError.style.display = 'block'; }
    }
});
forgotPasswordBtn.addEventListener('click', async (e) => { /* Existujúci kód ignorovaný pre zjednodušenie, tu je funkčný: */
    e.preventDefault(); authError.style.display = 'none'; authSuccess.style.display = 'none'; const email = emailInput.value;
    if (!email) { authError.innerText = "Zadaj e-mail."; authError.style.display = 'block'; return; }
    try { await sendPasswordResetEmail(auth, email); authSuccess.innerText = "Odkaz na reset odoslaný!"; authSuccess.style.display = 'block'; } 
    catch (err) { authError.innerText = "Nepodarilo sa odoslať reset."; authError.style.display = 'block'; }
});
logoutBtn.addEventListener('click', () => signOut(auth));

function compressImage(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); let width = img.width, height = img.height; const MAX = 800; if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } else { if (height > MAX) { width *= MAX / height; height = MAX; } } canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; }; }); }
function getTaskReward(task) { const p = task.priority || 'low'; let baseReward = p === 'high' ? 30 : (p === 'medium' ? 20 : 10); let odlozenia = task.odlozenia || 0; return odlozenia > 1 ? 0 : baseReward; }

// POMOCNÁ FUNKCIA pre čistý čas bez časových posunov
function formatLocalTime(d) {
    let YYYY = d.getFullYear(); let MM = String(d.getMonth() + 1).padStart(2, '0'); let DD = String(d.getDate()).padStart(2, '0');
    let HH = String(d.getHours()).padStart(2, '0'); let MIN = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}T${HH}:${MIN}`;
}

// HROMADNÉ PRIDÁVANIE (Jednorazové aj Rutiny)
addTaskBtn.addEventListener('click', async () => {
    const name = taskNameInput.value; const timeStr = taskTimeInput.value; const priority = taskPriorityInput.value; 
    const file = taskImageInput.files[0]; const taskType = taskTypeSelect.value;
    
    if (name && timeStr && currentUser) {
        addTaskBtn.innerText = "Generujem..."; addTaskBtn.disabled = true;
        try {
            let base64Image = null;
            if (file) base64Image = await compressImage(file);
            
            const batch = writeBatch(db); // Príprava balíčka pre hromadný zápis
            const routineId = "rutina_" + Date.now(); // Spoločné ID pre cykly
            let generatedCount = 0;
            
            // Základné údaje úlohy
            const baseTaskData = { 
                name: name, priority: priority, imageUrl: base64Image, 
                userId: currentUser.uid, timestamp: Date.now(), 
                status: "aktivna", odlozenia: 0 
            };

            if (taskType === 'single') {
                // Klasická 1 úloha
                await addDoc(collection(db, "tasks"), { ...baseTaskData, time: timeStr });
                generatedCount = 1;
            } else {
                // GENERÁTOR RUTÍN
                let currentDate = new Date(timeStr);
                const endDate = new Date(routineEndDateInput.value);
                endDate.setHours(23, 59, 59); // Do konca zvoleného dňa
                
                if (taskType === 'weekly') {
                    // Cvičenie podľa dní v týždni
                    const checkedDays = Array.from(document.querySelectorAll('.day-cb:checked')).map(cb => parseInt(cb.value));
                    if(checkedDays.length === 0) throw new Error("Vyber aspoň jeden deň v týždni!");
                    
                    while (currentDate <= endDate) {
                        if (checkedDays.includes(currentDate.getDay())) {
                            const docRef = doc(collection(db, "tasks")); // Vygeneruje čisté ID
                            batch.set(docRef, { ...baseTaskData, time: formatLocalTime(currentDate), rutinaId: routineId });
                            generatedCount++;
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                } else if (taskType === 'interval') {
                    // Cvičenie Interval (napr. 3 dni on, 1 deň off)
                    const activeDays = parseInt(document.getElementById('intervalActive').value) || 1;
                    const restDays = parseInt(document.getElementById('intervalRest').value) || 1;
                    const cycleLength = activeDays + restDays;
                    let cycleCounter = 0;
                    
                    while (currentDate <= endDate) {
                        if (cycleCounter < activeDays) { // Sme v pracovnom dni
                            const docRef = doc(collection(db, "tasks"));
                            batch.set(docRef, { ...baseTaskData, time: formatLocalTime(currentDate), rutinaId: routineId });
                            generatedCount++;
                        }
                        cycleCounter = (cycleCounter + 1) % cycleLength; // Skok v cykle
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
                
                if(generatedCount > 0) {
                    await batch.commit(); // Odošle balíček (napr. 90 úloh) do databázy v jednej sekunde!
                    alert(`Úspešne vygenerovaných ${generatedCount} úloh do kalendára!`);
                }
            }

            taskNameInput.value = ''; taskImageInput.value = ''; taskPriorityInput.value = 'low'; taskTypeSelect.value = 'single';
            taskTypeSelect.dispatchEvent(new Event('change')); // Resetne zobrazenie formulára
            const newD = new Date(); newD.setMinutes(newD.getMinutes() - newD.getTimezoneOffset());
            taskTimeInput.value = newD.toISOString().slice(0, 16);
        } catch (e) {
            alert(e.message || "Nastala chyba pri generovaní.");
        } finally {
            addTaskBtn.innerText = "Vygenerovať a Pridať"; addTaskBtn.disabled = false;
        }
    }
});

// SPLNENIE ÚLOHY
completeTaskBtn.addEventListener('click', async () => {
    if (!currentOpenedTask) return;
    const task = currentOpenedTask; let reward = getTaskReward(task);
    await updateDoc(doc(db, "tasks", task.id), { status: "splnena" });
    if (reward > 0) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) await setDoc(userRef, { totalCoins: reward });
        else await updateDoc(userRef, { totalCoins: increment(reward) });
    }
    modal.classList.add('hidden');
});

// ODLOŽENIE S DOMINO EFEKTOM (Snooze)
snoozeTaskBtn.addEventListener('click', async () => {
    if (!currentOpenedTask) return;
    
    let posunutCeluSekvenciu = false;
    
    // Ak má úloha značku rutiny, spýta sa na Domino efekt
    if (currentOpenedTask.rutinaId) {
        posunutCeluSekvenciu = confirm(
            "Tento plán je súčasťou rutiny (cyklu).\n\n" +
            "Klikni [OK] pre posunutie CELEJ SEKVENCIE.\n" +
            "(Posunie túto a všetky tvoje budúce úlohy v sérii o 1 deň dopredu, aby sa nezrušil interval).\n\n" +
            "Klikni [ZRUŠIŤ] pre posunutie IBA TEJTO JEDNEJ úlohy."
        );
    }
    
    if (posunutCeluSekvenciu) {
        // Záchrana celej rutiny! Vyhľadáme všetky úlohy z tohto cyklu v budúcnosti
        const q = query(collection(db, "tasks"), 
            where("rutinaId", "==", currentOpenedTask.rutinaId),
            where("time", ">=", currentOpenedTask.time) // Hľadá len od tohto dátumu vyššie
        );
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        
        querySnapshot.forEach((docSnap) => {
            let taskData = docSnap.data();
            let d = new Date(taskData.time); d.setDate(d.getDate() + 1); // Posun
            batch.update(docSnap.ref, { 
                time: formatLocalTime(d), 
                odlozenia: increment(1) // Zvýšime odloženie, aby vedel o penalizácii mincí
            });
        });
        await batch.commit(); // Updatne všetky v 1 sekunde
    } else {
        // Klasické posunutie pre jednorazovú alebo len 1 vybranú úlohu z rutiny
        let d = new Date(currentOpenedTask.time); d.setDate(d.getDate() + 1);
        await updateDoc(doc(db, "tasks", currentOpenedTask.id), { time: formatLocalTime(d), odlozenia: increment(1) });
    }
    
    modal.classList.add('hidden');
});

deleteTaskBtn.addEventListener('click', async () => {
    if (currentOpenedTask) {
        const confirmDelete = confirm("Naozaj chceš trvalo zmazať bez splnenia? (Zmaže sa len táto konkrétna, nie celá séria)");
        if (confirmDelete) { await deleteDoc(doc(db, "tasks", currentOpenedTask.id)); modal.classList.add('hidden'); }
    }
});

function loadUserTasks() {
    const q = query(collection(db, "tasks"), where("userId", "==", currentUser.uid));
    unsubscribeTasks = onSnapshot(q, (snapshot) => {
        taskList.innerHTML = ''; tasksData = []; 
        snapshot.forEach((doc) => { const task = doc.data(); task.id = doc.id; tasksData.push(task); });
        tasksData.sort((a, b) => new Date(a.time) - new Date(b.time));

        tasksData.forEach((task) => {
            const li = document.createElement('li'); const priority = task.priority || 'low';
            li.className = `task-item priority-${priority}`;
            if(task.status === 'splnena') li.classList.add('task-completed');

            const dateObj = new Date(task.time); const icon = task.imageUrl ? "📸 " : "";
            let dotClass = priority === 'high' ? 'dot-high' : (priority === 'medium' ? 'dot-medium' : 'dot-low');
            let routineIcon = task.rutinaId ? "🔄 " : ""; // Malá indikácia rutiny v zozname
            
            li.innerHTML = `<span><span class="p-dot ${dotClass}"></span><strong>${routineIcon}${icon}${task.name}</strong></span> <span>${dateObj.toLocaleString('sk-SK')}</span>`;
            li.addEventListener('click', () => openTaskModal(task)); taskList.appendChild(li);
        });
        renderTasksIntoCalendar();
    });
}

setInterval(() => { /* Funkcia pripomienok - nezmenená, ignoruje 'splnena' úlohy */ }, 60000);

// Názvy a sviatky (nezmenené, pre zjednodušenie kódu vynechané len v náhľade)
// ... sem patrí tvoj štandardný slovník slovakHolidays a slovakNameDays ...
``` *(Poznámka k nakopírovaniu do tvojho reálneho skriptu: Daj pozor, aby si naspodok nezabudol skopírovať tú dlhú funkciu kalendára a mien `slovakHolidays`, ktorú sme mali predtým, tu som ju vo výpise skrátil len kvôli prehľadnosti).*

Otestuj si to na nanečisto – daj si vytvoriť cvičenie v intervale 3/1 a klikni na "Odložiť" nejakého konkrétneho cvičenia. Uvidíš, ako ťa pekne upozorní na Domino efekt!