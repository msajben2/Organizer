import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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
let unsubscribeTasks = null; let unsubscribeUser = null; let currentTotalCoins = 0;

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
        if (docSnap.exists()) { 
            currentTotalCoins = docSnap.data().totalCoins || 0;
            coinBalanceDisplay.innerText = `🪙 ${currentTotalCoins}`; 
        } else { 
            currentTotalCoins = 0;
            coinBalanceDisplay.innerText = `🪙 0`; 
        }
        if (!document.getElementById('shopModal').classList.contains('hidden')) {
            renderShop(); // Aktualizuje tlačidlá v obchode naživo
        }
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

forgotPasswordBtn.addEventListener('click', async (e) => {
    e.preventDefault(); authError.style.display = 'none'; authSuccess.style.display = 'none'; const email = emailInput.value;
    if (!email) { authError.innerText = "Zadaj e-mail."; authError.style.display = 'block'; return; }
    try { await sendPasswordResetEmail(auth, email); authSuccess.innerText = "Odkaz na reset odoslaný!"; authSuccess.style.display = 'block'; } 
    catch (err) { authError.innerText = "Nepodarilo sa odoslať reset."; authError.style.display = 'block'; }
});
logoutBtn.addEventListener('click', () => signOut(auth));

function compressImage(file) { return new Promise((resolve) => { const reader = new FileReader(); reader.readAsDataURL(file); reader.onload = (event) => { const img = new Image(); img.src = event.target.result; img.onload = () => { const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); let width = img.width, height = img.height; const MAX = 800; if (width > height) { if (width > MAX) { height *= MAX / width; width = MAX; } } else { if (height > MAX) { width *= MAX / height; height = MAX; } } canvas.width = width; canvas.height = height; ctx.drawImage(img, 0, 0, width, height); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; }; }); }
function getTaskReward(task) { const p = task.priority || 'low'; let baseReward = p === 'high' ? 30 : (p === 'medium' ? 20 : 10); let odlozenia = task.odlozenia || 0; return odlozenia > 1 ? 0 : baseReward; }

function formatLocalTime(d) {
    let YYYY = d.getFullYear(); let MM = String(d.getMonth() + 1).padStart(2, '0'); let DD = String(d.getDate()).padStart(2, '0');
    let HH = String(d.getHours()).padStart(2, '0'); let MIN = String(d.getMinutes()).padStart(2, '0');
    return `${YYYY}-${MM}-${DD}T${HH}:${MIN}`;
}

addTaskBtn.addEventListener('click', async () => {
    const name = taskNameInput.value; const timeStr = taskTimeInput.value; const priority = taskPriorityInput.value; 
    const file = taskImageInput.files[0]; const taskType = taskTypeSelect.value;
    
    if (name && timeStr && currentUser) {
        addTaskBtn.innerText = "Generujem..."; addTaskBtn.disabled = true;
        try {
            let base64Image = null;
            if (file) base64Image = await compressImage(file);
            
            const batch = writeBatch(db); 
            const routineId = "rutina_" + Date.now(); 
            let generatedCount = 0;
            
            const baseTaskData = { 
                name: name, priority: priority, imageUrl: base64Image, 
                userId: currentUser.uid, timestamp: Date.now(), 
                status: "aktivna", odlozenia: 0 
            };

            if (taskType === 'single') {
                await addDoc(collection(db, "tasks"), { ...baseTaskData, time: timeStr });
                generatedCount = 1;
            } else {
                let currentDate = new Date(timeStr);
                const endDate = new Date(routineEndDateInput.value);
                endDate.setHours(23, 59, 59); 
                
                if (taskType === 'weekly') {
                    const checkedDays = Array.from(document.querySelectorAll('.day-cb:checked')).map(cb => parseInt(cb.value));
                    if(checkedDays.length === 0) throw new Error("Vyber aspoň jeden deň v týždni!");
                    
                    while (currentDate <= endDate) {
                        if (checkedDays.includes(currentDate.getDay())) {
                            const docRef = doc(collection(db, "tasks"));
                            batch.set(docRef, { ...baseTaskData, time: formatLocalTime(currentDate), rutinaId: routineId });
                            generatedCount++;
                        }
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                } else if (taskType === 'interval') {
                    const activeDays = parseInt(document.getElementById('intervalActive').value) || 1;
                    const restDays = parseInt(document.getElementById('intervalRest').value) || 1;
                    const cycleLength = activeDays + restDays;
                    let cycleCounter = 0;
                    
                    while (currentDate <= endDate) {
                        if (cycleCounter < activeDays) {
                            const docRef = doc(collection(db, "tasks"));
                            batch.set(docRef, { ...baseTaskData, time: formatLocalTime(currentDate), rutinaId: routineId });
                            generatedCount++;
                        }
                        cycleCounter = (cycleCounter + 1) % cycleLength; 
                        currentDate.setDate(currentDate.getDate() + 1);
                    }
                }
                
                if(generatedCount > 0) {
                    await batch.commit();
                    alert(`Úspešne vygenerovaných ${generatedCount} úloh do kalendára!`);
                }
            }

            taskNameInput.value = ''; taskImageInput.value = ''; taskPriorityInput.value = 'low'; taskTypeSelect.value = 'single';
            taskTypeSelect.dispatchEvent(new Event('change')); 
            const newD = new Date(); newD.setMinutes(newD.getMinutes() - newD.getTimezoneOffset());
            taskTimeInput.value = newD.toISOString().slice(0, 16);
        } catch (e) {
            alert(e.message || "Nastala chyba pri generovaní.");
        } finally {
            addTaskBtn.innerText = "Vygenerovať a Pridať"; addTaskBtn.disabled = false;
        }
    }
});

// --- 1. UNIVERZÁLNE FUNKCIE (Mozog pre všetky modaly) ---
async function processComplete(task) {
    let reward = getTaskReward(task);
    await updateDoc(doc(db, "tasks", task.id), { status: "splnena" });
    if (reward > 0) {
        const userRef = doc(db, "users", currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) await setDoc(userRef, { totalCoins: reward });
        else await updateDoc(userRef, { totalCoins: increment(reward) });
    }
}

async function processSnooze(task) {
    let posunutCeluSekvenciu = false;
    if (task.rutinaId) {
        posunutCeluSekvenciu = confirm("Tento plán je súčasťou rutiny.\n\nKlikni [OK] pre posunutie CELEJ SEKVENCIE.\n(Posunie túto a všetky budúce úlohy v sérii o 1 deň).\n\nKlikni [ZRUŠIŤ] pre posunutie IBA TEJTO JEDNEJ úlohy.");
    }
    
    if (posunutCeluSekvenciu) {
        const q = query(collection(db, "tasks"), where("rutinaId", "==", task.rutinaId));
        const querySnapshot = await getDocs(q);
        const batch = writeBatch(db);
        querySnapshot.forEach((docSnap) => {
            let taskData = docSnap.data();
            if (taskData.time >= task.time) {
                let d = new Date(taskData.time); d.setDate(d.getDate() + 1);
                batch.update(docSnap.ref, { time: formatLocalTime(d), odlozenia: increment(1) });
            }
        });
        await batch.commit();
    } else {
        let d = new Date(task.time); d.setDate(d.getDate() + 1);
        await updateDoc(doc(db, "tasks", task.id), { time: formatLocalTime(d), odlozenia: increment(1) });
    }
}

async function processDelete(task) {
    let success = false;
    if (task.rutinaId) {
        const zmazatCelu = confirm("Táto úloha je súčasťou rutiny.\n\nKlikni [OK], ak chceš zmazať CELÚ SEKVENCIU.\nKlikni [ZRUŠIŤ], pre zmazanie IBA TEJTO JEDNEJ úlohy.");
        if (zmazatCelu) {
            const q = query(collection(db, "tasks"), where("rutinaId", "==", task.rutinaId));
            const querySnapshot = await getDocs(q);
            const batch = writeBatch(db);
            querySnapshot.forEach((docSnap) => {
                let taskData = docSnap.data();
                if (taskData.time >= task.time) { batch.delete(docSnap.ref); }
            });
            await batch.commit(); success = true;
        } else {
            const zmazatJednu = confirm("Chceš trvalo zmazať IBA TÚTO JEDNU konkrétnu úlohu?");
            if (zmazatJednu) { await deleteDoc(doc(db, "tasks", task.id)); success = true; }
        }
    } else {
        const confirmDelete = confirm("Naozaj chceš túto úlohu trvalo zmazať?");
        if (confirmDelete) { await deleteDoc(doc(db, "tasks", task.id)); success = true; }
    }
    return success; // Informácia pre kartu, či má po zmazaní prejsť na ďalšiu
}

// --- 2. KLASICKÝ DETAIL ÚLOHY (V kalendári) ---
completeTaskBtn.addEventListener('click', async () => {
    if (!currentOpenedTask) return;
    await processComplete(currentOpenedTask);
    modal.classList.add('hidden');
});

snoozeTaskBtn.addEventListener('click', async () => {
    if (!currentOpenedTask) return;
    await processSnooze(currentOpenedTask);
    modal.classList.add('hidden');
});

deleteTaskBtn.addEventListener('click', async () => {
    if (!currentOpenedTask) return;
    const zmazane = await processDelete(currentOpenedTask);
    if (zmazane) modal.classList.add('hidden');
});

// --- 3. NOVÉ: VEČERNÉ ZHODNOTENIE (Tinder štýl kariet) ---
let reviewTasks = [];
let currentReviewIndex = 0;
const reviewModal = document.getElementById('reviewModal');

document.getElementById('startReviewBtn').addEventListener('click', () => {
    const now = new Date();
    now.setHours(23, 59, 59); // Filtrujeme všetko do konca dnešného dňa
    const endOfDayIso = formatLocalTime(now);
    
    // Nájde len nekompletné úlohy z dneška a minulosti
    reviewTasks = tasksData.filter(t => t.time <= endOfDayIso && t.status !== 'splnena');
    
    if (reviewTasks.length === 0) {
        alert("Paráda! Na dnes máš všetko hotové alebo vyčistené. 🏆");
        return;
    }
    currentReviewIndex = 0;
    showReviewTask();
});

function showReviewTask() {
    if (currentReviewIndex >= reviewTasks.length) {
        reviewModal.classList.add('hidden');
        alert("Večerné zhodnotenie je kompletne hotové! Skvelá práca. 🎉");
        return;
    }
    
    const task = reviewTasks[currentReviewIndex];
    
    document.getElementById('reviewProgress').innerText = `Úloha ${currentReviewIndex + 1} z ${reviewTasks.length}`;
    document.getElementById('reviewTaskName').innerText = task.name;
    document.getElementById('reviewTaskTime').innerText = new Date(task.time).toLocaleString('sk-SK');
    document.getElementById('reviewTaskRoutine').style.display = task.rutinaId ? 'block' : 'none';
    
    let reward = getTaskReward(task);
    if (reward > 0) {
        document.getElementById('reviewTaskReward').innerHTML = `<span style="color: #28a745;">🪙 +${reward} mincí</span>`;
    } else {
        document.getElementById('reviewTaskReward').innerHTML = `<span style="color: #dc3545; text-decoration: line-through;">🪙 0 mincí</span>`;
    }
    
    reviewModal.classList.remove('hidden');
}

document.getElementById('closeReviewModal').addEventListener('click', () => reviewModal.classList.add('hidden'));

// Ovládanie tlačidiel na kartách hodnotenia
document.getElementById('reviewCompleteBtn').addEventListener('click', async () => {
    const btn = document.getElementById('reviewCompleteBtn'); btn.disabled = true;
    await processComplete(reviewTasks[currentReviewIndex]);
    btn.disabled = false; currentReviewIndex++; showReviewTask();
});

document.getElementById('reviewSnoozeBtn').addEventListener('click', async () => {
    const btn = document.getElementById('reviewSnoozeBtn'); btn.disabled = true;
    await processSnooze(reviewTasks[currentReviewIndex]);
    btn.disabled = false; currentReviewIndex++; showReviewTask();
});

document.getElementById('reviewDeleteBtn').addEventListener('click', async () => {
    const btn = document.getElementById('reviewDeleteBtn'); btn.disabled = true;
    const zmazane = await processDelete(reviewTasks[currentReviewIndex]);
    btn.disabled = false;
    if (zmazane) { currentReviewIndex++; showReviewTask(); }
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
            let routineIcon = task.rutinaId ? "🔄 " : ""; 
            
            li.innerHTML = `<span><span class="p-dot ${dotClass}"></span><strong>${routineIcon}${icon}${task.name}</strong></span> <span>${dateObj.toLocaleString('sk-SK')}</span>`;
            li.addEventListener('click', () => openTaskModal(task)); taskList.appendChild(li);
        });
        renderTasksIntoCalendar();
    });
}

setInterval(() => {
    if(!currentUser) return;
    const now = new Date(); const currentStr = now.toISOString().slice(0, 16); 

    tasksData.forEach(task => {
        if(!task.time || task.status === 'splnena') return; 
        const priority = task.priority || 'low'; let offsetMinutes = 0;
        if(priority === 'low') offsetMinutes = 30; else if(priority === 'medium') offsetMinutes = 60; else if(priority === 'high') offsetMinutes = 120;

        const taskTime = new Date(task.time);
        const alertTime = new Date(taskTime.getTime() - offsetMinutes * 60000);
        const alertStr = alertTime.toISOString().slice(0, 16);

        if (currentStr === alertStr) {
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Pripomienka úlohy", { body: `${task.name} začína o ${offsetMinutes} minút!` });
            } else { alert(`PRIPOMIENKA: ${task.name} (začína o ${offsetMinutes} minút!)`); }
        }
    });
}, 60000);

const slovakHolidays = { "1-1": "Deň vzniku SR", "1-6": "Traja králi", "5-1": "Sviatok práce", "5-8": "Deň víťazstva", "7-5": "Cyril a Metod", "8-29": "SNP", "9-1": "Deň Ústavy", "9-15": "Sedembolestná P. Mária", "11-1": "Všetkých svätých", "11-17": "Deň boja za slobodu", "12-24": "Štedrý deň", "12-25": "1. sviatok vianočný", "12-26": "2. sviatok vianočný" };
const slovakNameDays = {
    "1-1":"Nový rok", "1-2":"Alexandra, Karina", "1-3":"Daniela", "1-4":"Drahoslav", "1-5":"Andrea", "1-6":"Antónia", "1-7":"Bohuslava", "1-8":"Severín", "1-9":"Alexej", "1-10":"Dáša", "1-11":"Malvína", "1-12":"Ernest", "1-13":"Rastislav", "1-14":"Radovan", "1-15":"Dobroslav", "1-16":"Kristína", "1-17":"Nataša", "1-18":"Bohdana", "1-19":"Drahomíra", "1-20":"Dalibor", "1-21":"Vincent", "1-22":"Zora", "1-23":"Miloš", "1-24":"Timotej", "1-25":"Gejza", "1-26":"Tamara", "1-27":"Bohuš", "1-28":"Alfonz", "1-29":"Gašpar", "1-30":"Ema", "1-31":"Emil",
    "2-1":"Tatiana", "2-2":"Erik, Erika", "2-3":"Blažej", "2-4":"Veronika", "2-5":"Agáta", "2-6":"Dorota", "2-7":"Vanda", "2-8":"Zoja", "2-9":"Zdenko", "2-10":"Gabriela", "2-11":"Dezider", "2-12":"Perla", "2-13":"Arpád", "2-14":"Valentín", "2-15":"Pravoslav", "2-16":"Ida, Liana", "2-17":"Miloslava", "2-18":"Jaromír", "2-19":"Vlasta", "2-20":"Lívia", "2-21":"Eleonóra", "2-22":"Etela", "2-23":"Roman, Romana", "2-24":"Matej", "2-25":"Frederik, Frederika", "2-26":"Viktor", "2-27":"Alexander", "2-28":"Zlatica", "2-29":"Radomír",
    "3-1":"Albín", "3-2":"Anežka", "3-3":"Bohumil, Bohumila", "3-4":"Kazimír", "3-5":"Fridrich", "3-6":"Radoslav, Radoslava", "3-7":"Tomáš", "3-8":"Alan, Alana", "3-9":"Františka", "3-10":"Branislav, Bruno", "3-11":"Angela, Angelika", "3-12":"Gregor", "3-13":"Vlastimil", "3-14":"Matilda", "3-15":"Svetlana", "3-16":"Boleslav", "3-17":"Ľubica", "3-18":"Eduard", "3-19":"Jozef", "3-20":"Víťazoslav", "3-21":"Blahoslav", "3-22":"Beňadik", "3-23":"Adrián", "3-24":"Gabriel", "3-25":"Marián", "3-26":"Emanuel", "3-27":"Alena", "3-28":"Soňa", "3-29":"Miroslav", "3-30":"Vieroslava", "3-31":"Benjamín",
    "4-1":"Hugo", "4-2":"Zita", "4-3":"Richard", "4-4":"Izidor", "4-5":"Miroslava", "4-6":"Irena", "4-7":"Zoltán", "4-8":"Albert", "4-9":"Milena", "4-10":"Igor", "4-11":"Július", "4-12":"Estera", "4-13":"Aleš", "4-14":"Justína", "4-15":"Fedor", "4-16":"Dana, Danica", "4-17":"Rudolf", "4-18":"Valér", "4-19":"Jela", "4-20":"Marcel", "4-21":"Ervín", "4-22":"Slavomír", "4-23":"Vojtech", "4-24":"Juraj", "4-25":"Marek", "4-26":"Jaroslava", "4-27":"Jaroslav", "4-28":"Jarmila", "4-29":"Lea", "4-30":"Anastázia",
    "5-1":"Sviatok práce", "5-2":"Žigmund", "5-3":"Galina", "5-4":"Florián", "5-5":"Lesana, Lesia", "5-6":"Hermína", "5-7":"Monika", "5-8":"Ingrida", "5-9":"Roland", "5-10":"Viktória", "5-11":"Blažena", "5-12":"Pankrác", "5-13":"Servác", "5-14":"Bonifác", "5-15":"Žofia", "5-16":"Svetozár", "5-17":"Gizela", "5-18":"Viola", "5-19":"Gertrúda", "5-20":"Bernard", "5-21":"Zina", "5-22":"Júlia, Juliana", "5-23":"Želmíra", "5-24":"Ela", "5-25":"Urban", "5-26":"Dušan", "5-27":"Iveta", "5-28":"Viliam", "5-29":"Vilma", "5-30":"Ferdinand", "5-31":"Petrana, Petronela",
    "6-1":"Žaneta", "6-2":"Xénia, Oxana", "6-3":"Karolína", "6-4":"Lenka", "6-5":"Laura", "6-6":"Norbert", "6-7":"Róbert", "6-8":"Medard", "6-9":"Stanislava", "6-10":"Margaréta", "6-11":"Dobroslava", "6-12":"Zlatko", "6-13":"Anton", "6-14":"Vasil", "6-15":"Vít", "6-16":"Blanka, Bianka", "6-17":"Adolf", "6-18":"Vratislav", "6-19":"Alfréd", "6-20":"Valéria", "6-21":"Alojz", "6-22":"Paulína", "6-23":"Sidónia", "6-24":"Ján", "6-25":"Olívia, Tadeáš", "6-26":"Adriána", "6-27":"Ladislav, Ladislava", "6-28":"Beáta", "6-29":"Peter, Pavol, Petra", "6-30":"Melánia",
    "7-1":"Diana", "7-2":"Berta", "7-3":"Miloslav", "7-4":"Prokop", "7-5":"Cyril, Metod", "7-6":"Patrik, Patrícia", "7-7":"Oliver", "7-8":"Ivan", "7-9":"Lujza", "7-10":"Amália", "7-11":"Milota", "7-12":"Nina", "7-13":"Margita", "7-14":"Kamil", "7-15":"Henrich", "7-16":"Drahomír", "7-17":"Bohuslav", "7-18":"Kamila", "7-19":"Dušana", "7-20":"Iľja, Eliáš", "7-21":"Daniel", "7-22":"Magdaléna", "7-23":"Oľga", "7-24":"Vladimír", "7-25":"Jakub", "7-26":"Anna, Hana", "7-27":"Božena", "7-28":"Krištof", "7-29":"Marta", "7-30":"Libuša", "7-31":"Ignác",
    "8-1":"Božidara", "8-2":"Gustáv", "8-3":"Jerguš", "8-4":"Dominik, Dominika", "8-5":"Hortenzia", "8-6":"Jozefína", "8-7":"Štefánia", "8-8":"Oskar", "8-9":"Ľubomíra", "8-10":"Vavrinec", "8-11":"Zuzana", "8-12":"Darina", "8-13":"Ľubomír", "8-14":"Mojmír", "8-15":"Marcela", "8-16":"Leonard", "8-17":"Milica", "8-18":"Elena, Helena", "8-19":"Lýdia", "8-20":"Anabela", "8-21":"Jana", "8-22":"Tichomír", "8-23":"Filip", "8-24":"Bartolomej", "8-25":"Ľudovít", "8-26":"Samuel", "8-27":"Silvia", "8-28":"Augustín", "8-29":"Nikola, Nikolaj", "8-30":"Ružena", "8-31":"Nora",
    "9-1":"Drahoslava", "9-2":"Linda, Rebeka", "9-3":"Belo", "9-4":"Rozália", "9-5":"Regína", "9-6":"Alica", "9-7":"Marianna", "9-8":"Miriama", "9-9":"Martina", "9-10":"Oleg", "9-11":"Bystrík", "9-12":"Mária", "9-13":"Ctibor", "9-14":"Ľudomil", "9-15":"Jolana", "9-16":"Ľudmila", "9-17":"Olympia", "9-18":"Eugénia", "9-19":"Konštantín", "9-20":"Ľuboslav, Ľuboslava", "9-21":"Matúš", "9-22":"Móric", "9-23":"Zdenka", "9-24":"Ľuboš, Ľubor", "9-25":"Vladislav", "9-26":"Edita", "9-27":"Cyprián", "9-28":"Václav", "9-29":"Michal, Michaela", "9-30":"Jarolím",
    "10-1":"Arnold", "10-2":"Levoslav", "10-3":"Stela", "10-4":"František", "10-5":"Viera", "10-6":"Natália", "10-7":"Eliška", "10-8":"Brigita", "10-9":"Dionýz", "10-10":"Slavomíra", "10-11":"Valentína", "10-12":"Maximilián", "10-13":"Koloman", "10-14":"Boris", "10-15":"Terézia", "10-16":"Vladimíra", "10-17":"Hedviga", "10-18":"Lukáš", "10-19":"Kristián", "10-20":"Vendelín", "10-21":"Uršuľa", "10-22":"Sergej", "10-23":"Alojzia", "10-24":"Kvetoslava", "10-25":"Aurel", "10-26":"Demeter", "10-27":"Sabína", "10-28":"Dobromila", "10-29":"Klára", "10-30":"Šimon, Simona", "10-31":"Aurélia",
    "11-1":"Denis, Denisa", "11-2":"Pamiatka zosnulých", "11-3":"Hubert", "11-4":"Karol", "11-5":"Imrich", "11-6":"Renáta", "11-7":"René", "11-8":"Bohumír", "11-9":"Teodor", "11-10":"Tibor", "11-11":"Martin, Maroš", "11-12":"Svätopluk", "11-13":"Stanislav", "11-14":"Irma", "11-15":"Leopold", "11-16":"Agnesa", "11-17":"Klaudia", "11-18":"Eugen", "11-19":"Alžbeta", "11-20":"Félix", "11-21":"Elvíra", "11-22":"Cecília", "11-23":"Klement", "11-24":"Emília", "11-25":"Katarína", "11-26":"Kornel", "11-27":"Milan", "11-28":"Henrieta", "11-29":"Vratko", "11-30":"Ondrej, Andrej",
    "12-1":"Edmund", "12-2":"Bibiána", "12-3":"Oldrich", "12-4":"Barbora, Barbara", "12-5":"Oto", "12-6":"Mikuláš", "12-7":"Ambróz", "12-8":"Marína", "12-9":"Izabela", "12-10":"Radúz", "12-11":"Hilda", "12-12":"Otília", "12-13":"Lucia", "12-14":"Branislava, Bronislava", "12-15":"Ivica", "12-16":"Albína", "12-17":"Kornélia", "12-18":"Sláva", "12-19":"Judita", "12-20":"Dagmara", "12-21":"Bohdan", "12-22":"Adela", "12-23":"Nadežda", "12-24":"Adam, Eva", "12-25":"Vianoce", "12-26":"Štefan", "12-27":"Filoména", "12-28":"Ivana, Ivona", "12-29":"Milada", "12-30":"Dávid", "12-31":"Silvester"
};
const monthNames = ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"];

function renderCalendar() {
    calendarGrid.innerHTML = '';
    const today = new Date(); let dayOfWeek = today.getDay(); let diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    let startDay = new Date(today); startDay.setDate(today.getDate() + diffToMonday + (weekOffset * 7));
    monthYearDisplay.innerText = `${monthNames[startDay.getMonth()]} ${startDay.getFullYear()}`;

    for (let i = 0; i < 14; i++) {
        const currentDay = new Date(startDay); currentDay.setDate(startDay.getDate() + i);
        const dayDiv = document.createElement('div'); dayDiv.classList.add('calendar-day');
        if (currentDay.toDateString() === today.toDateString()) dayDiv.classList.add('today');

        const m = currentDay.getMonth() + 1; const d = currentDay.getDate(); const dateKey = `${m}-${d}`; 
        
        let dayHTML = `<span class="day-number">${d}.</span>`;
        if (slovakHolidays[dateKey]) dayHTML += `<span class="holiday">${slovakHolidays[dateKey]}</span>`;
        if (slovakNameDays[dateKey]) dayHTML += `<span class="name-day">${slovakNameDays[dateKey]}</span>`;
        
        const isoDate = currentDay.toISOString().split('T')[0]; 
        dayHTML += `<div class="day-tasks-container" id="tasks-${isoDate}"></div>`;
        dayDiv.innerHTML = dayHTML;

        dayDiv.addEventListener('click', (e) => {
            if (e.target.classList.contains('task-indicator')) return;
            const clickedDate = new Date(currentDay); clickedDate.setHours(12, 0, 0, 0); 
            clickedDate.setMinutes(clickedDate.getMinutes() - clickedDate.getTimezoneOffset());
            taskTimeInput.value = clickedDate.toISOString().slice(0, 16);
            taskTimeInput.scrollIntoView({ behavior: "smooth" });
        });
        calendarGrid.appendChild(dayDiv);
    }
    renderTasksIntoCalendar();
}

function renderTasksIntoCalendar() {
    document.querySelectorAll('.day-tasks-container').forEach(c => c.innerHTML = '');
    tasksData.forEach(task => {
        if(!task.time) return;
        const taskDateOnly = task.time.split('T')[0]; 
        const targetContainer = document.getElementById(`tasks-${taskDateOnly}`);
        if (targetContainer) {
            const taskBlock = document.createElement('div');
            const priorityClass = task.priority || 'low';
            taskBlock.className = `task-indicator ${priorityClass}`;
            
            if (task.status === 'splnena') {
                taskBlock.style.textDecoration = 'line-through';
                taskBlock.style.opacity = '0.5';
            }

            const icon = task.imageUrl ? "📸 " : "";
            const routineIcon = task.rutinaId ? "🔄 " : "";
            taskBlock.innerText = routineIcon + icon + task.name;
            taskBlock.addEventListener('click', (e) => { e.stopPropagation(); openTaskModal(task); });
            targetContainer.appendChild(taskBlock);
        }
    });
}

function openTaskModal(task) {
    currentOpenedTask = task;
    modalTaskName.innerText = task.name;
    const d = new Date(task.time);
    modalTaskTime.innerText = d.toLocaleString('sk-SK');
    
    if(task.rutinaId) { modalRoutineInfo.style.display = 'block'; } 
    else { modalRoutineInfo.style.display = 'none'; }
    
    let actualReward = getTaskReward(task);
    if (task.status === 'splnena') {
    modalTaskReward.innerHTML = `<span style="color: #6c757d;">Úloha je už splnená</span>`;
    completeTaskBtn.style.display = 'none'; snoozeTaskBtn.style.display = 'none';
    deleteTaskBtn.style.display = 'none'; // PRIDANÉ: Schová tlačidlo vymazať
    } else {
    completeTaskBtn.style.display = 'block'; snoozeTaskBtn.style.display = 'block';
    deleteTaskBtn.style.display = 'block'; // PRIDANÉ: Ukáže tlačidlo vymazať pre aktívne
        if (actualReward > 0) { modalTaskReward.innerHTML = `<span style="color: #28a745; font-weight: bold;">🪙 +${actualReward} mincí</span>`; } 
        else { modalTaskReward.innerHTML = `<span style="color: #dc3545; text-decoration: line-through;">🪙 0 mincí (opakovane odložené)</span>`; }
    }
    
    if (task.imageUrl) { modalTaskImage.src = task.imageUrl; modalTaskImage.style.display = 'block'; } 
    else { modalTaskImage.src = ''; modalTaskImage.style.display = 'none'; }
    modal.classList.remove('hidden');
}

closeModal.addEventListener('click', () => modal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.add('hidden'); });
document.getElementById('prevPeriod').addEventListener('click', () => { weekOffset -= 1; renderCalendar(); });
document.getElementById('nextPeriod').addEventListener('click', () => { weekOffset += 1; renderCalendar(); });

const initDate = new Date(); initDate.setMinutes(initDate.getMinutes() - initDate.getTimezoneOffset());
taskTimeInput.value = initDate.toISOString().slice(0, 16);

renderCalendar();

// --- 4. OBCHOD S ODMENAMI ---
const shopModal = document.getElementById('shopModal');
const closeShopModal = document.getElementById('closeShopModal');
const shopItemsContainer = document.getElementById('shopItemsContainer');

const rewardsList = [
    { name: "Vychladené pivko", price: 100, icon: "🍺" },
    { name: "Fľaša vínka", price: 350, icon: "🍷" },
    { name: "Cheat day", price: 500, icon: "🍔" },
    { name: "Courvoisier", price: 1200, icon: "🥃" },
    { name: "Dovolenka", price: 2000, icon: "✈️" }
];

document.getElementById('openShopBtn').addEventListener('click', () => {
    renderShop();
    shopModal.classList.remove('hidden');
});

closeShopModal.addEventListener('click', () => shopModal.classList.add('hidden'));

function renderShop() {
    shopItemsContainer.innerHTML = '';
    rewardsList.forEach(reward => {
        const canAfford = currentTotalCoins >= reward.price;
        const itemDiv = document.createElement('div');
        itemDiv.className = 'shop-item';
        
        itemDiv.innerHTML = `
            <div class="shop-icon">${reward.icon}</div>
            <div class="shop-title">${reward.name}</div>
            <button class="shop-btn" ${!canAfford ? 'disabled' : ''}>
                🪙 ${reward.price}
            </button>
        `;
        
        const buyBtn = itemDiv.querySelector('.shop-btn');
        // ZMENA: Tu posielame do funkcie aj samotné tlačidlo (e.target), aby sme ho vedeli zamknúť
        buyBtn.addEventListener('click', (e) => buyReward(reward, e.target));
        
        shopItemsContainer.appendChild(itemDiv);
    });
}

async function buyReward(reward, btnElement) {
    // Ešte jedna poistka, či máš naozaj dosť mincí
    if (currentTotalCoins >= reward.price) {
        const confirmBuy = confirm(`Naozaj si chceš kúpiť "${reward.name}" za ${reward.price} mincí?`);
        if (confirmBuy) {
            // OKAMŽITÉ ZAMKNUTIE TLAČIDLA PROTI DVOJKLIKOM
            btnElement.disabled = true;
            btnElement.innerText = "Kupujem...";
            
            try {
                const userRef = doc(db, "users", currentUser.uid);
                await updateDoc(userRef, { totalCoins: increment(-reward.price) });
                alert(`Gratulujem! Zakúpil si: ${reward.name} 🎉 Uži si odmenu!`);
                // Po úspešnom nákupe sa obchod sám prekreslí vďaka Firebase onSnapshot
            } catch (error) {
                alert("Nastala chyba pri nákupe.");
                // Ak by internet vypadol, odomkneme tlačidlo naspäť
                btnElement.disabled = false;
                btnElement.innerText = `🪙 ${reward.price}`;
            }
        }
    }
}