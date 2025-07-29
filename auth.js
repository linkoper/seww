import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { ref, set, get, remove } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { auth, database } from './firebase.js';
import { showNotification } from './ui.js';
import { generateUUID } from '../utils.js';

let clientId = localStorage.getItem('clientId');
let profile = null;

function initializeAuth(main) {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const email = user.email.replace(/\./g, '_');
            const profileSnapshot = await get(ref(database, `users/${email}/${clientId}`));
            profile = profileSnapshot.val();

            if (clientId && profile) {
                localStorage.setItem('profile', JSON.stringify(profile));
                main();
            } else {
                clientId = generateUUID();
                localStorage.setItem('clientId', clientId);
                profile = {
                    displayName: 'Anónimo',
                    profilePic: 'https://via.placeholder.com/40',
                    bio: '',
                    email: user.email,
                    followers: [],
                    postCount: 0,
                    following: [],
                    points: 0,
                    badges: []
                };
                await set(ref(database, `users/${user.email.replace(/\./g, '_')}/${clientId}`), profile);
                localStorage.setItem('profile', JSON.stringify(profile));
                main();
            }
        } else {
            document.getElementById('login-modal').style.display = 'flex';
        }
    });
}

async function login(email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        throw error;
    }
}

async function register(email, password) {
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        clientId = generateUUID();
        localStorage.setItem('clientId', clientId);
    } catch (error) {
        throw error;
    }
}

async function logout() {
    await signOut(auth);
    localStorage.removeItem('clientId');
    localStorage.removeItem('profile');
    showNotification('¡Sesión cerrada!');
}

async function updateUserProfile(name, newPassword, bio, file) {
    try {
        let profilePicUrl = profile?.profilePic || 'https://via.placeholder.com/40';
        if (file) {
            profilePicUrl = await compressMedia(file);
        }
        profile = {
            displayName: name,
            profilePic: profilePicUrl,
            bio: bio || '',
            email: auth.currentUser.email,
            followers: profile?.followers || [],
            postCount: profile?.postCount || 0,
            following: profile?.following || [],
            points: profile?.points || 0,
            badges: profile?.badges || []
        };
        if (newPassword) {
            await updatePassword(auth.currentUser, newPassword);
        }
        await set(ref(database, `users/${auth.currentUser.email.replace(/\./g, '_')}/${clientId}`), profile);
        localStorage.setItem('profile', JSON.stringify(profile));
        showNotification('¡Perfil guardado!');
    } catch (error) {
        throw error;
    }
}

async function deleteAccount() {
    try {
        await remove(ref(database, `users/${auth.currentUser.email.replace(/\./g, '_')}/${clientId}`));
        await deleteUser(auth.currentUser);
        localStorage.removeItem('clientId');
        localStorage.removeItem('profile');
        showNotification('¡Cuenta eliminada!');
    } catch (error) {
        throw error;
    }
}

function getProfile() {
    return profile;
}

export { initializeAuth, login, register, logout, updateUserProfile, deleteAccount, getProfile };
