// Import Firebase knižníc cez CDN (nepotrebuješ inštalovať cez npm)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 1. KROK: Tu neskôr vložíš svoje konfiguračné údaje z Firebase
const firebaseConfig = {
  apiKey: "TVOJ_API_KEY",
  authDomain: "tvoj-projekt.firebaseapp.com",
  projectId: "tvoj-projekt",
  // ... ďalšie údaje ti vygeneruje Firebase
};

// Inicializácia aplikácie a databázy
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Referencie na HTML elementy
const taskNameInput = document.getElementById('taskName');
const taskTimeInput = document.getElementById('taskTime');
const addTaskBtn = document.getElementById('addTaskBtn');
const taskList = document.getElementById('taskList');

// Pole pre uloženie načítaných úloh do pamäte pre potreby časovača
let tasksData = [];

// 2. KROK: Funkcia na pridanie úlohy do databázy
addTaskBtn.addEventListener('click', async () => {
    const name = taskNameInput.value;
    const time = taskTimeInput.value;

    if (name && time) {
        try {
            await addDoc(collection(db, "tasks"), {
                name: name,
                time: time,
                timestamp: Date.now() // pre zoradenie
            });
            // Vyčistenie inputov po pridaní
            taskNameInput.value = '';
            taskTimeInput.value = '';
        } catch (e) {
            console.error("Chyba pri pridávaní úlohy: ", e);
        }
    } else {
        alert("Prosím, vyplň názov aj čas úlohy.");
    }
});

// 3. KROK: Čítanie úloh v reálnom čase (Synchronizácia)
const q = query(collection(db, "tasks"), orderBy("time", "asc"));

onSnapshot(q, (snapshot) => {
    taskList.innerHTML = ''; // Vyčistíme zoznam pred novým vykreslením
    tasksData = []; // Vyčistíme lokálne pole

    snapshot.forEach((doc) => {
        const task = doc.data();
        tasksData.push(task); // Uložíme si úlohu do poľa pre kontrolu času

        // Vykreslenie do HTML
        const li = document.createElement('li');
        li.className = 'task-item';
        
        // Formátovanie dátumu pre lepšie čítanie
        const dateObj = new Date(task.time);
        const formattedDate = dateObj.toLocaleString('sk-SK');

        li.innerHTML = `
            <span><strong>${task.name}</strong></span>
            <span>${formattedDate}</span>
        `;
        taskList.appendChild(li);
    });
});

// 4. KROK: Slučka na kontrolu času (spúšťa sa každú minútu)
setInterval(() => {
    const now = new Date();
    // Odsekneme sekundy, aby sme porovnávali len presnú minútu
    const currentTimeStr = now.toISOString().slice(0, 16); 

    tasksData.forEach(task => {
        if (task.time === currentTimeStr) {
            alert(`ČAS NA ÚLOHU: ${task.name}`);
            // Tu neskôr nasadíme systémové Push notifikácie
        }
    });
}, 60000); // 60000 ms = 1 minúta