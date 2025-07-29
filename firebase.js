import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyAd1GyJ7xsCjw_BkuEyBbzyyzbXjPH-Pww",
    authDomain: "luner-a8aae.firebaseapp.com",
    databaseURL: "https://luner-a8aae-default-rtdb.firebaseio.com",
    projectId: "luner-a8aae",
    storageBucket: "luner-a8aae.appspot.com",
    messagingSenderId: "792035263055",
    appId: "1:792035263055:web:d9d2b1c69153b04c82203a",
    measurementId: "G-Y0NWKHWKG6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

export { auth, database, storage };
