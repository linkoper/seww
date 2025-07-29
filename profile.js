import { ref, get } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { database } from './firebase.js';
import { renderPosts } from './ui.js';
import { getProfile } from './auth.js';

async function viewUserProfile(targetClientId) {
    const profile = getProfile();
    if (!profile) return;

    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val() || {};
        let targetProfile = null;

        for (const [email, clientIds] of Object.entries(users)) {
            for (const [id, userData] of Object.entries(clientIds)) {
                if (id === targetClientId && typeof userData === 'object' && userData !== null) {
                    targetProfile = { ...userData, email: email.replace(/_/g, '.'), clientId: id };
                    break;
                }
            }
            if (targetProfile) break;
        }

        if (targetProfile) {
            const userProfileSection = document.getElementById('user-profile-section');
            const userProfileContent = document.getElementById('user-profile-content');
            userProfileSection.style.display = 'block';
            document.getElementById('forum-section').style.display = 'none';

            const isFollowing = profile.following?.includes(targetClientId) || false;
            const followButton = targetClientId !== profile.clientId ?
                (isFollowing ?
                    `<button class="btn btn-cancel unfollow-btn" data-client-id="${targetClientId}">Dejar de Seguir</button>` :
                    `<button class="btn follow-btn" data-client-id="${targetClientId}">Seguir</button>`) :
                '';

            const postsRef = ref(database, 'posts');
            const postsSnapshot = await get(postsRef);
            const userPosts = [];
            postsSnapshot.forEach(child => {
                const postData = child.val();
                if (postData && postData.clientId === targetClientId) {
                    userPosts.push(postData);
                }
            });
            const sortedPosts = userPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

            userProfileContent.innerHTML = `
                <img class="profile-pic" src="${targetProfile.profilePic || 'https://via.placeholder.com/80'}" alt="Foto de Perfil">
                <h3>${targetProfile.displayName || 'Anónimo'}</h3>
                <p>${targetProfile.bio || ''}</p>
                <p>Seguidores: ${targetProfile.followers?.length || 0} · Publicaciones: ${targetProfile.postCount || 0}</p>
                ${followButton}
                <h4>Publicaciones</h4>
                <div id="user-posts"></div>
            `;
            renderPosts(sortedPosts, document.getElementById('user-posts'));
        } else {
            console.error('Perfil no encontrado');
        }
    } catch (error) {
        console.error('Error viewing user profile:', error);
    }
}

export { viewUserProfile };
