import { ref, set, get, remove, push, update, query, orderByChild, limitToLast, endAt } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-database.js";
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";
import { database, storage } from './firebase.js';
import { getProfile } from './auth.js';
import { showNotification, renderPosts } from './ui.js';
import { generateUUID } from '../utils.js';

let lastPostTimestamp = null;
const postsPerLoad = 10;

async function submitPost(content, imageFile, videoFile) {
    const profile = getProfile();
    if (!content) {
        showNotification('Ingresa un mensaje.');
        return;
    }
    try {
        if (imageFile && videoFile) {
            showNotification('Selecciona solo una imagen o un video.');
            return;
        }
        let imageUrl = null,
            videoUrl = null;
        if (imageFile) {
            imageUrl = await uploadMedia(imageFile);
        } else if (videoFile) {
            videoUrl = await uploadMedia(videoFile, true);
        }
        const newPost = {
            id: generateUUID(),
            content: content,
            user: profile.displayName,
            profilePic: profile.profilePic,
            clientId: profile.clientId,
            timestamp: Date.now(),
            image: imageUrl,
            video: videoUrl,
            replies: {},
            likes: [],
        };
        await set(ref(database, 'posts/' + newPost.id), newPost);
        const newPostCount = (profile.postCount || 0) + 1;
        await update(ref(database, `users/${profile.email.replace(/\./g, '_')}/${profile.clientId}`), { postCount: newPostCount });
        profile.postCount = newPostCount;
        localStorage.setItem('profile', JSON.stringify(profile));
        showNotification('¡Publicación creada!');
    } catch (error) {
        showNotification('Error al publicar.');
        console.error('Error submitting post:', error);
    }
}

async function uploadMedia(file, isVideo = false) {
    return new Promise((resolve, reject) => {
        const mediaRef = storageRef(storage, `${isVideo ? 'videos' : 'images'}/${generateUUID()}_${file.name}`);
        const uploadTask = uploadBytesResumable(mediaRef, file);
        const progressBar = document.getElementById('upload-progress');
        progressBar.style.display = 'block';

        uploadTask.on('state_changed',
            (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                progressBar.value = progress;
            },
            (error) => {
                progressBar.style.display = 'none';
                reject(error);
            },
            () => {
                getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
                    progressBar.style.display = 'none';
                    resolve(downloadURL);
                });
            }
        );
    });
}

async function loadPosts() {
    const postsRef = query(ref(database, 'posts'), orderByChild('timestamp'), limitToLast(postsPerLoad));
    const snapshot = await get(postsRef);
    const posts = [];
    snapshot.forEach(child => {
        posts.push({ id: child.key, ...child.val() });
    });
    const sortedPosts = posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (sortedPosts.length > 0) {
        lastPostTimestamp = sortedPosts[sortedPosts.length - 1].timestamp;
    }
    renderPosts(sortedPosts, document.getElementById('posts'));
}

async function loadMorePosts() {
    if (!lastPostTimestamp) return;
    const postsRef = query(ref(database, 'posts'), orderByChild('timestamp'), endAt(lastPostTimestamp - 1), limitToLast(postsPerLoad));
    const snapshot = await get(postsRef);
    const posts = [];
    snapshot.forEach(child => {
        posts.push({ id: child.key, ...child.val() });
    });
    const sortedPosts = posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (sortedPosts.length > 0) {
        lastPostTimestamp = sortedPosts[sortedPosts.length - 1].timestamp;
        renderPosts(sortedPosts, document.getElementById('posts'), true);
    }
}

async function toggleLike(postId) {
    const profile = getProfile();
    const postRef = ref(database, `posts/${postId}`);
    const snapshot = await get(postRef);
    const postData = snapshot.val();
    let likes = Array.isArray(postData?.likes) ? postData.likes : [];
    if (likes.includes(profile.clientId)) {
        likes = likes.filter(id => id !== profile.clientId);
    } else {
        likes.push(profile.clientId);
    }
    await update(postRef, { likes });
}

async function deletePost(postId) {
    const profile = getProfile();
    const postRef = ref(database, 'posts/' + postId);
    const snapshot = await get(postRef);
    if (snapshot.val()?.clientId === profile.clientId) {
        if (confirm('¿Estás seguro de que quieres eliminar esta publicación?')) {
            await remove(postRef);
            const newPostCount = Math.max(0, (profile.postCount || 0) - 1);
            await update(ref(database, `users/${profile.email.replace(/\./g, '_')}/${profile.clientId}`), { postCount: newPostCount });
            profile.postCount = newPostCount;
            localStorage.setItem('profile', JSON.stringify(profile));
        }
    } else {
        showNotification('No tienes permiso para eliminar esta publicación.');
    }
}

async function submitReply(postId, content) {
    const profile = getProfile();
    if (!content) {
        showNotification('Ingresa un comentario.');
        return;
    }
    try {
        const reply = {
            id: generateUUID(),
            content: content,
            user: profile.displayName,
            profilePic: profile.profilePic,
            clientId: profile.clientId,
            timestamp: Date.now(),
            likes: [],
        };
        await push(ref(database, `posts/${postId}/replies`), reply);
    } catch (error) {
        showNotification('Error al publicar comentario.');
        console.error('Error submitting reply:', error);
    }
}

export { submitPost, loadPosts, loadMorePosts, toggleLike, deletePost, submitReply };
