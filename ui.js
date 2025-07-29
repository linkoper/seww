import { getProfile } from './auth.js';
import { toggleLike, deletePost, submitEdit, followUser, unfollowUser, showComments, savePost, deleteReply } from './posts.js';
import { viewUserProfile } from './profile.js';

function showNotification(message, realTime = false, targetClientId = null, profilePic = null) {
    if (message.includes('eliminada') || message.includes('eliminado')) return;

    const notificationContainer = document.getElementById('notification-container');
    const notificationBadge = document.getElementById('notification-badge');
    let notificationCount = parseInt(notificationBadge.textContent) || 0;

    notificationCount++;
    notificationBadge.textContent = notificationCount;
    notificationBadge.style.display = 'block';

    const notification = document.createElement('div');
    notification.className = 'notification';
    const profilePicUrl = profilePic || 'https://via.placeholder.com/20';
    notification.innerHTML = `
        <img src="${profilePicUrl}" alt="Notificación">
        ${message}
        <button onclick="this.parentElement.remove()">✕</button>
    `;
    notificationContainer.appendChild(notification);
    if (!realTime) {
        setTimeout(() => notification.remove(), 3000);
    } else {
        notification.addEventListener('click', () => {
            notification.remove();
            if (message.includes('te empezó a seguir') || message.includes('dejó de seguirte')) {
                viewUserProfile(targetClientId);
            } else if (message.includes('le dio like') || message.includes('comentó')) {
                // ...
            }
        });
    }
}

function renderPosts(postsToRender, targetDiv, append = false) {
    if (!append) {
        targetDiv.innerHTML = '';
    }
    if (!postsToRender || postsToRender.length === 0) {
        if (!append) {
            targetDiv.innerHTML = '<p>No hay contenido disponible.</p>';
        }
        return;
    }
    postsToRender.forEach(post => {
        if (!post || !post.id) return;

        const profile = getProfile();
        const postLikes = Array.isArray(post.likes) ? post.likes : [];
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.dataset.postId = post.id;
        postElement.innerHTML = `
            <div class="post-header">
                <img src="${post.profilePic || 'https://via.placeholder.com/40'}" alt="Usuario" onclick="viewUserProfile('${post.clientId}')">
                <p><strong class="username" data-client-id="${post.clientId}">${post.user || 'Anónimo'}</strong></p>
            </div>
            <div class="post-content">
                <p>${post.content || ''}</p>
                ${post.image ? `<img src="${post.image}" alt="Imagen de Publicación" onerror="this.style.display='none';">` : ''}
                ${post.video ? `<div class="video-container"><video src="${post.video}" controls playsinline webkit-playsinline preload="metadata"></video></div>` : ''}
            </div>
            <div class="post-actions">
                <button class="like-btn ${postLikes.includes(profile.clientId) ? 'liked' : ''}">
                    <i data-lucide="heart" class="icon"></i> ${postLikes.length}
                </button>
                <button class="reply-btn">
                    <i data-lucide="message-circle" class="icon"></i> ${Object.keys(post.replies || {}).length}
                </button>
                <button class="save-post-btn">
                    <i data-lucide="bookmark" class="icon"></i>
                </button>
                ${post.clientId === profile.clientId ? `<button class="btn delete-btn"><i data-lucide="trash-2" class="icon"></i></button>` : ''}
            </div>
            <div class="replies">
                ${renderReplies(post.replies, post.id)}
            </div>
            <div class="reply-form" style="display: none;">
                <textarea id="reply-content-${post.id}" placeholder="Escribe tu comentario..."></textarea>
                <button class="btn reply-submit-btn">Comentar</button>
            </div>
        `;
        targetDiv.appendChild(postElement);

        postElement.querySelector('.like-btn')?.addEventListener('click', () => toggleLike(post.id));
        postElement.querySelector('.delete-btn')?.addEventListener('click', () => deletePost(post.id));
        postElement.querySelector('.reply-btn')?.addEventListener('click', () => {
            const replyForm = postElement.querySelector('.reply-form');
            replyForm.style.display = replyForm.style.display === 'none' ? 'block' : 'none';
        });
        postElement.querySelector('.save-post-btn')?.addEventListener('click', (e) => savePost(post.id, e.currentTarget));
    });
}

function renderReplies(replies, postId, parentId = null) {
    if (!replies) return '';
    return Object.entries(replies)
        .filter(([_, reply]) => reply.parentId === parentId)
        .map(([replyId, reply]) => {
            const profile = getProfile();
            return `
                <div class="reply" data-reply-id="${replyId}">
                    <div class="post-header">
                        <img src="${reply.profilePic || 'https://via.placeholder.com/40'}" alt="Usuario" onclick="viewUserProfile('${reply.clientId}')">
                        <p><strong class="username" data-client-id="${reply.clientId}">${reply.user || 'Anónimo'}</strong></p>
                        ${reply.clientId === profile.clientId ? `<button class="btn delete-reply-btn" data-reply-id="${replyId}"><i data-lucide="trash-2" class="icon"></i></button>` : ''}
                    </div>
                    <p>${reply.content || ''}</p>
                </div>`;
        }).join('');
}


export { showNotification, renderPosts, renderReplies };
