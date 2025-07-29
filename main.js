import { initializeAuth, login, register, logout, updateUserProfile, deleteAccount } from './modules/auth.js';
import { submitPost, loadPosts, loadMorePosts } from './modules/posts.js';
import { showNotification } from './modules/ui.js';

document.addEventListener('DOMContentLoaded', () => {
    initializeAuth(main);
});

function main() {
    // Hide loading overlay and show main content
    document.getElementById('loading-overlay').style.display = 'none';
    document.getElementById('profile-section').style.display = 'block';
    document.getElementById('forum-section').style.display = 'block';

    // Load initial posts
    loadPosts();

    // Event Listeners
    document.getElementById('login-btn').onclick = async () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        if (!email || !password) {
            showNotification('Ingresa correo y contraseña.');
            return;
        }
        try {
            await login(email, password);
            document.getElementById('login-modal').style.display = 'none';
            main();
        } catch (error) {
            showNotification(error.code === 'auth/wrong-password' ? 'Contraseña incorrecta.' : 'Error al iniciar sesión.');
        }
    };

    document.getElementById('register-btn').onclick = async () => {
        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value.trim();
        if (!email || !password) {
            showNotification('Ingresa correo y contraseña.');
            return;
        }
        try {
            await register(email, password);
            document.getElementById('login-modal').style.display = 'none';
            document.getElementById('modal').style.display = 'flex';
        } catch (error) {
            showNotification(error.code === 'auth/email-already-in-use' ? 'Correo ya registrado.' : 'Error al registrarse.');
        }
    };

    document.getElementById('logout-btn').onclick = async () => {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
            await logout();
            document.getElementById('profile-section').style.display = 'none';
            document.getElementById('forum-section').style.display = 'none';
            document.getElementById('login-modal').style.display = 'flex';
        }
    };

    document.getElementById('modal-save-profile').onclick = async () => {
        const name = document.getElementById('modal-display-name').value.trim();
        const newPassword = document.getElementById('modal-password').value.trim();
        const bio = document.getElementById('modal-bio').value.trim();
        const file = document.getElementById('modal-profile-pic-input').files[0];
        if (!name) {
            showNotification('Ingresa un nombre.');
            return;
        }
        try {
            await updateUserProfile(name, newPassword, bio, file);
            document.getElementById('modal').style.display = 'none';
        } catch (error) {
            showNotification('Error al guardar el perfil.');
        }
    };

    document.getElementById('modal-delete-account').onclick = async () => {
        if (confirm('¿Estás seguro de eliminar tu cuenta? Esta acción no se puede deshacer.')) {
            try {
                await deleteAccount();
                document.getElementById('profile-section').style.display = 'none';
                document.getElementById('forum-section').style.display = 'none';
                document.getElementById('login-modal').style.display = 'flex';
            } catch (error) {
                showNotification('Error al eliminar la cuenta.');
            }
        }
    };

    document.getElementById('submit-post').onclick = async () => {
        const content = document.getElementById('post-content').value.trim();
        const imageFile = document.getElementById('post-image').files[0];
        const videoFile = document.getElementById('post-video').files[0];
        await submitPost(content, imageFile, videoFile);
        document.getElementById('post-content').value = '';
        document.getElementById('post-image').value = '';
        document.getElementById('post-video').value = '';
    };

    document.getElementById('posts').addEventListener('click', (e) => {
        if (e.target.classList.contains('reply-submit-btn')) {
            const postId = e.target.closest('.post').dataset.postId;
            const content = document.getElementById(`reply-content-${postId}`).value.trim();
            submitReply(postId, content);
            document.getElementById(`reply-content-${postId}`).value = '';
        }
    });

    window.addEventListener('scroll', () => {
        if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
            loadMorePosts();
        }
    });
}

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

window.validateFile = function(input) {
    const file = input.files[0];
    if (!file) return;
    const isVideo = input.accept.includes('video');
    const maxSizeMB = isVideo ? 100 : 10;
    if (file.size > maxSizeMB * 1024 * 1024) {
        errorDiv.textContent = `El archivo es demasiado grande. Máximo ${maxSizeMB}MB.`;
        input.value = '';
        return;
    }
    if (input.id.includes('image') && !['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) {
        errorDiv.textContent = 'Selecciona una imagen válida (JPEG, PNG, GIF).';
        input.value = '';
    } else if (input.id.includes('video')) {
        if (!['video/mp4', 'video/webm', 'video/ogg'].includes(file.type)) {
            errorDiv.textContent = 'Selecciona un video válido (MP4, WebM, OGG).';
            input.value = '';
            return;
        }
        const video = document.createElement('video');
        if (!video.canPlayType(file.type)) {
            errorDiv.textContent = `El formato ${file.type} no es compatible con este navegador.`;
            input.value = '';
        }
    }
};

async function compressMedia(file, isVideo = false) {
    if (!file) return null;

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
                console.error(`Error uploading ${isVideo ? 'video' : 'image'} to Firebase Storage:`, error);
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

function createPostHeader(post) {
    return `
        <div class="post-header">
            <img src="${post.profilePic || 'https://via.placeholder.com/40'}" alt="Usuario" onclick="viewUserProfile('${post.clientId}')">
            <p><strong class="username" data-client-id="${post.clientId}">${post.user || 'Anónimo'}</strong></p>
        </div>`;
}

function createPostContent(post) {
    const mediaContent = post.image ?
        `<img src="${post.image}" alt="Imagen de Publicación" onerror="this.style.display='none';">` :
        post.video ?
        `<div class="video-container">
                <video src="${post.video}" controls playsinline webkit-playsinline preload="metadata"></video>
            </div>` :
        '';
    return `
        <div class="post-content">
            <p>${post.content || ''}</p>
            ${mediaContent}
        </div>`;
}

function createPostActions(post, postLikes) {
    const isFollowing = profile?.following?.includes(post.clientId) || false;
    const followButton = post.clientId !== clientId ?
        (isFollowing ?
            `<button class="btn btn-cancel unfollow-btn">Dejar de Seguir</button>` :
            `<button class="btn follow-btn">Seguir</button>`) :
        '';
    return `
        <div class="post-actions">
            <button class="like-btn ${postLikes.includes(clientId) ? 'liked' : ''}">
                <div class="icon-like"></div> ${postLikes.length} Me gusta
            </button>
            <button class="reply-btn">
                <div class="icon-comment"></div> Comentar (${Object.keys(post.replies || {}).length})
            </button>
            <button class="clean-mode-btn">
                <div class="icon-eye"></div>
            </button>
            <button class="save-post-btn">
                <div class="icon-save"></div>
            </button>
            ${post.clientId === clientId ? `<button class="btn delete-btn"><div class="icon-delete"></div></button>` : followButton}
        </div>`;
}

function createEditForm(post) {
    return `
        <div id="edit-form-${post.id}" style="display: none;">
            <textarea id="edit-content-${post.id}">${post.content}</textarea>
            <div class="file-input-wrapper">
                <label for="edit-image-${post.id}" class="file-input-label"><div class="icon-add-photo"></div></label>
                <input type="file" id="edit-image-${post.id}" accept="image/*" onchange="validateFile(this)">
                <label for="edit-video-${post.id}" class="file-input-label"><div class="icon-add-video"></div></label>
                <input type="file" id="edit-video-${post.id}" accept="video/mp4,video/webm,video/ogg" onchange="validateFile(this)">
            </div>
            <button class="btn edit-submit-btn">Guardar Cambios</button>
        </div>`;
}

function createReplyForm(post) {
    return `
        <div id="reply-form-${post.id}" class="reply-form" style="display: none;">
            <textarea id="reply-content-${post.id}" placeholder="Escribe tu comentario..."></textarea>
            <div class="file-input-wrapper">
                <label for="reply-image-${post.id}" class="file-input-label"><div class="icon-add-photo"></div></label>
                <input type="file" id="reply-image-${post.id}" accept="image/*" onchange="validateFile(this)">
                <label for="reply-video-${post.id}" class="file-input-label"><div class="icon-add-video"></div></label>
                <input type="file" id="reply-video-${post.id}" accept="video/mp4,video/webm,video/ogg" onchange="validateFile(this)">
            </div>
            <button class="btn reply-submit-btn"><div class="icon-comment"></div>Comentar</button>
        </div>`;
}


function renderPosts(postsToRender, targetDiv = postsDiv, append = false) {
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
        if (targetDiv === videosDiv && !post.video) return;

        const postLikes = Array.isArray(post.likes) ? post.likes : [];
        const postElement = document.createElement('div');
        postElement.className = 'post';
        postElement.dataset.postId = post.id;
        postElement.innerHTML = `
            ${createPostHeader(post)}
            ${createPostContent(post)}
            ${createPostActions(post, postLikes)}
            ${createEditForm(post)}
            ${createReplyForm(post)}
            <div class="replies">
                ${renderReplies(post.replies, post.id)}
            </div>
        `;
        targetDiv.appendChild(postElement);

        postElement.querySelector('.like-btn')?.addEventListener('click', () => toggleLike(post.id));
        postElement.querySelector('.like-btn')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            showLikes(post.id);
        });
        postElement.querySelector('.edit-btn')?.addEventListener('click', () => editPost(post.id));
        postElement.querySelector('.delete-btn')?.addEventListener('click', () => deletePost(post.id));
        postElement.querySelector('.follow-btn')?.addEventListener('click', () => followUser(post.clientId));
        postElement.querySelector('.unfollow-btn')?.addEventListener('click', () => unfollowUser(post.clientId));
        postElement.querySelector('.reply-btn')?.addEventListener('click', () => showComments(post.id));
        postElement.querySelector('.reply-to-reply-btn')?.addEventListener('click', (e) => {
            const postId = e.currentTarget.dataset.postId;
            const replyId = e.currentTarget.dataset.replyId;
            const replyForm = document.getElementById(`reply-form-${postId}`);
            replyForm.style.display = 'block';
            replyForm.dataset.parentId = replyId;
        });
        postElement.querySelector('.clean-mode-btn')?.addEventListener('click', (e) => {
            const replies = postElement.querySelector('.replies');
            if (replies) {
                replies.style.display = replies.style.display === 'none' ? 'block' : 'none';
                e.currentTarget.classList.toggle('active');
            }
        });
        postElement.querySelector('.edit-submit-btn')?.addEventListener('click', () => submitEdit(post.id));
        postElement.querySelector('.reply-submit-btn')?.addEventListener('click', () => {
            const replyForm = postElement.querySelector('.reply-form');
            submitReply(post.id, replyForm.dataset.parentId);
        });
        postElement.querySelector('.save-post-btn')?.addEventListener('click', (e) => savePost(post.id, e.currentTarget));

        const fileInputWrapper = postElement.querySelector('.file-input-wrapper');
        if (fileInputWrapper) {
            fileInputWrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileInputWrapper.classList.add('dragover');
            });
            fileInputWrapper.addEventListener('dragleave', () => {
                fileInputWrapper.classList.remove('dragover');
            });
            fileInputWrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                fileInputWrapper.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                const input = fileInputWrapper.querySelector('input[type="file"]');
                input.files = e.dataTransfer.files;
                validateFile(input);
            });
        }

        postElement.querySelectorAll('.delete-reply-btn')?.forEach(btn => {
            btn.addEventListener('click', () => deleteReply(post.id, btn.dataset.replyId));
        });

        if (targetDiv === videosDiv) {
            const videoElement = postElement.querySelector('video');
            if (videoElement) {
                videoElement.addEventListener('error', (e) => {
                    console.error('Error al cargar el video:', e);
                    const videoContainer = postElement.querySelector('.video-container');
                    if (videoContainer) {
                        videoContainer.innerHTML = '<p>Error al cargar el video. Intenta con otro formato o archivo.</p>';
                    }
                });
            }
        }
    });
}

document.getElementById('login-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!email || !password) {
        document.getElementById('login-error').textContent = 'Ingresa correo y contraseña.';
        return;
    }
    try {
        await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
        document.getElementById('login-error').textContent = error.code === 'auth/wrong-password' ? 'Contraseña incorrecta.' : 'Error al iniciar sesión.';
    }
};

document.getElementById('register-btn').onclick = async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    if (!email || !password) {
        document.getElementById('login-error').textContent = 'Ingresa correo y contraseña.';
        return;
    }
    try {
        await createUserWithEmailAndPassword(auth, email, password);
        clientId = generateUUID();
        localStorage.setItem('clientId', clientId);
        modal.style.display = 'flex';
    } catch (error) {
        document.getElementById('login-error').textContent = error.code === 'auth/email-already-in-use' ? 'Correo ya registrado.' : 'Error al registrarse.';
    }
};

document.getElementById('logout-btn').onclick = async () => {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
        await signOut(auth);
        localStorage.removeItem('clientId');
        localStorage.removeItem('profile');
        profileSection.style.display = 'none';
        loginModal.style.display = 'flex';
        showNotification('¡Sesión cerrada!');
    }
};

function showMessages() {
    currentSection = 'messages';
    forumSection.style.display = 'none';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    statsSection.style.display = 'none';
    savedPostsSection.style.display = 'none';
    exploreSection.style.display = 'none';
    trendingSection.style.display = 'none';
    messagesSection.style.display = 'flex';
    renderConversations();
}

function initializeThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    themeToggle.textContent = currentTheme === 'light' ? 'Cambiar a Tema Oscuro' : 'Cambiar a Tema Claro';

    themeToggle.addEventListener('click', () => {
        const newTheme = document.documentElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeToggle.textContent = newTheme === 'light' ? 'Cambiar a Tema Oscuro' : 'Cambiar a Tema Claro';
    });
}

function initializeSectionToggle() {
    document.getElementById('show-posts').addEventListener('click', () => {
        currentSection = 'posts';
        forumSection.style.display = 'block';
        videoSection.style.display = 'none';
        followersSection.style.display = 'none';
        userProfileSection.style.display = 'none';
        document.getElementById('show-posts').classList.add('active');
        document.getElementById('show-videos').classList.remove('active');
        document.getElementById('show-followers').classList.remove('active');
        initializePostsListener();
    });
    document.getElementById('show-videos').addEventListener('click', () => {
        currentSection = 'videos';
        forumSection.style.display = 'none';
        videoSection.style.display = 'block';
        followersSection.style.display = 'none';
        userProfileSection.style.display = 'none';
        document.getElementById('show-videos').classList.add('active');
        document.getElementById('show-posts').classList.remove('active');
        document.getElementById('show-followers').classList.remove('active');
        initializePostsListener();
    });
    document.getElementById('show-followers').addEventListener('click', () => {
        currentSection = 'followers';
        forumSection.style.display = 'none';
        videoSection.style.display = 'none';
        followersSection.style.display = 'block';
        userProfileSection.style.display = 'none';
        document.getElementById('show-followers').classList.add('active');
        document.getElementById('show-posts').classList.remove('active');
        document.getElementById('show-videos').classList.remove('active');
        renderFollowers();
    });
    document.getElementById('show-explore').addEventListener('click', () => {
        currentSection = 'explore';
        forumSection.style.display = 'none';
        videoSection.style.display = 'none';
        followersSection.style.display = 'none';
        userProfileSection.style.display = 'none';
        statsSection.style.display = 'none';
        savedPostsSection.style.display = 'none';
        exploreSection.style.display = 'block';
        renderExplore();
    });
}

document.getElementById('view-stats').addEventListener('click', () => {
    currentSection = 'stats';
    forumSection.style.display = 'none';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    statsSection.style.display = 'block';
    renderStats();
});

document.getElementById('back-to-home-stats').addEventListener('click', () => {
    currentSection = 'posts';
    forumSection.style.display = 'block';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    statsSection.style.display = 'none';
    document.getElementById('show-posts').classList.add('active');
    document.getElementById('show-videos').classList.remove('active');
    document.getElementById('show-followers').classList.remove('active');
    initializePostsListener();
});

document.getElementById('saved-posts-btn').addEventListener('click', () => {
    currentSection = 'saved-posts';
    forumSection.style.display = 'none';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    statsSection.style.display = 'none';
    savedPostsSection.style.display = 'block';
    renderSavedPosts();
});

document.getElementById('back-to-home-saved').addEventListener('click', () => {
    currentSection = 'posts';
    forumSection.style.display = 'block';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    statsSection.style.display = 'none';
    savedPostsSection.style.display = 'none';
    document.getElementById('show-posts').classList.add('active');
    document.getElementById('show-videos').classList.remove('active');
    document.getElementById('show-followers').classList.remove('active');
    initializePostsListener();
});

document.getElementById('view-followers').addEventListener('click', () => {
    currentSection = 'followers';
    forumSection.style.display = 'none';
    videoSection.style.display = 'none';
    followersSection.style.display = 'block';
    userProfileSection.style.display = 'none';
    statsSection.style.display = 'none';
    savedPostsSection.style.display = 'none';
    exploreSection.style.display = 'none';
    trendingSection.style.display = 'none';
    messagesSection.style.display = 'none';
    document.getElementById('show-followers').classList.add('active');
    document.getElementById('show-posts').classList.remove('active');
    document.getElementById('show-videos').classList.remove('active');
    renderFollowers();
});

document.getElementById('back-to-home-profile').addEventListener('click', () => {
    currentSection = 'posts';
    forumSection.style.display = 'block';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    document.getElementById('show-posts').classList.add('active');
    document.getElementById('show-videos').classList.remove('active');
    document.getElementById('show-followers').classList.remove('active');
    initializePostsListener();
});

document.getElementById('go-back-profile').addEventListener('click', () => {
    userProfileSection.style.display = 'none';
    if (currentSection === 'posts') {
        forumSection.style.display = 'block';
    } else if (currentSection === 'videos') {
        videoSection.style.display = 'block';
    } else if (currentSection === 'followers') {
        followersSection.style.display = 'block';
    }
    initializePostsListener();
});

window.goToHome = function() {
    currentSection = 'posts';
    forumSection.style.display = 'block';
    videoSection.style.display = 'none';
    followersSection.style.display = 'none';
    userProfileSection.style.display = 'none';
    document.getElementById('show-posts').classList.add('active');
    document.getElementById('show-videos').classList.remove('active');
    document.getElementById('show-followers').classList.remove('active');
    initializePostsListener();
};

function updateProfileUI() {
    if (profile) {
        document.getElementById('profile-pic').src = profile.profilePic || 'https://via.placeholder.com/40';
        document.getElementById('profile-name').textContent = profile.displayName || 'Anónimo';
        document.getElementById('profile-bio').textContent = profile.bio || '';
        document.getElementById('follower-count').textContent = `Seguidores: ${profile.followers?.length || 0}`;
        document.getElementById('post-count').textContent = `Publicaciones: ${profile.postCount || 0}`;
    }
}

async function renderFollowers() {
    followersDiv.innerHTML = '';
    if (!profile?.followers?.length) {
        followersDiv.innerHTML = '<p>No tienes seguidores.</p>';
        return;
    }
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val() || {};
        const followerList = [];

        for (const [email, clientIds] of Object.entries(users)) {
            for (const [id, userData] of Object.entries(clientIds)) {
                if (typeof userData === 'object' && userData !== null && profile.followers.includes(id)) {
                    followerList.push({
                        clientId: id,
                        ...userData,
                        email
                    });
                }
            }
        }

        if (followerList.length === 0) {
            followersDiv.innerHTML = '<p>No tienes seguidores.</p>';
            return;
        }

        followerList.forEach(follower => {
            const followerElement = document.createElement('div');
            followerElement.className = 'follower-item';
            followerElement.innerHTML = `
                <img src="${follower.profilePic || 'https://via.placeholder.com/32'}" alt="Foto de ${follower.displayName}" onclick="viewUserProfile('${follower.clientId}')">
                <p>${follower.displayName || 'Anónimo'}</p>
                <button class="btn btn-cancel unfollow-btn" data-client-id="${follower.clientId}">Dejar de Seguir</button>
            `;
            followersDiv.appendChild(followerElement);
        });

        followersDiv.querySelectorAll('.unfollow-btn').forEach(btn => {
            btn.addEventListener('click', () => unfollowUser(btn.dataset.clientId));
        });
    } catch (error) {
        followersDiv.innerHTML = '<p>Error al cargar seguidores.</p>';
        console.error('Error rendering followers:', error);
    }
}

async function initializeFollowersListener() {
    const usersRef = ref(database, 'users');
    onValue(usersRef, async (snapshot) => {
        const users = snapshot.val() || {};
        for (const [email, clientIds] of Object.entries(users)) {
            for (const [id, userData] of Object.entries(clientIds)) {
                if (id === clientId && typeof userData === 'object' && userData !== null) {
                    profile = { ...userData,
                        email: email.replace(/_/g, '.'),
                        clientId
                    };
                    localStorage.setItem('profile', JSON.stringify(profile));
                    updateProfileUI();
                    break;
                }
            }
        }
    }, (error) => {
        errorDiv.textContent = 'Error al actualizar seguidores.';
        console.error('Error in followers listener:', error);
    });
}

async function followUser(targetClientId) {
    if (!profile || targetClientId === clientId) return;
    try {
        const email = profile.email.replace(/\./g, '_');
        const targetUserRef = ref(database, `users/${email}/${targetClientId}`);
        const targetSnapshot = await get(targetUserRef);
        const targetProfile = targetSnapshot.val();

        if (targetProfile && !targetProfile.followers?.includes(clientId)) {
            const updatedFollowers = [...(targetProfile.followers || []), clientId];
            await update(targetUserRef, {
                followers: updatedFollowers
            });
            showNotification('¡Te empezó a seguir alguien!', true, targetClientId);
        }

        const userRef = ref(database, `users/${email}/${clientId}`);
        const userSnapshot = await get(userRef);
        const userProfile = userSnapshot.val() || {};

        if (!userProfile.following?.includes(targetClientId)) {
            const updatedFollowing = [...(userProfile.following || []), targetClientId];
            await update(userRef, {
                following: updatedFollowing
            });
            profile.following = updatedFollowing;
            localStorage.setItem('profile', JSON.stringify(profile));
            initializePostsListener();
        }
    } catch (error) {
        errorDiv.textContent = 'Error al seguir usuario.';
        console.error('Error following user:', error);
    }
}

async function unfollowUser(targetClientId) {
    if (!profile || targetClientId === clientId) return;
    try {
        const email = profile.email.replace(/\./g, '_');
        const targetUserRef = ref(database, `users/${email}/${targetClientId}`);
        const targetSnapshot = await get(targetUserRef);
        const targetProfile = targetSnapshot.val();

        if (targetProfile && targetProfile.followers?.includes(clientId)) {
            const updatedFollowers = targetProfile.followers.filter(id => id !== clientId);
            await update(targetUserRef, {
                followers: updatedFollowers
            });
            showNotification('¡Alguien dejó de seguirte!', true, targetClientId);
        }

        const userRef = ref(database, `users/${email}/${clientId}`);
        const userSnapshot = await get(userRef);
        const userProfile = userSnapshot.val() || {};

        if (userProfile.following?.includes(targetClientId)) {
            const updatedFollowing = userProfile.following.filter(id => id !== targetClientId);
            await update(userRef, {
                following: updatedFollowing
            });
            profile.following = updatedFollowing;
            localStorage.setItem('profile', JSON.stringify(profile));
            initializePostsListener();
        }
    } catch (error) {
        errorDiv.textContent = 'Error al dejar de seguir usuario.';
        console.error('Error unfollowing user:', error);
    }
}

async function filterPostsAndUsers(searchTerm, date, user) {
    const postsRef = ref(database, 'posts');
    const usersRef = ref(database, 'users');
    try {
        const [postsSnapshot, usersSnapshot] = await Promise.all([get(postsRef), get(usersRef)]);
        const posts = [];
        postsSnapshot.forEach(child => {
            const postData = child.val();
            if (postData && postData.id && postData.content) {
                postData.likes = Array.isArray(postData.likes) ? postData.likes : [];
                if (postData.replies) {
                    Object.values(postData.replies).forEach(reply => {
                        reply.likes = Array.isArray(reply.likes) ? reply.likes : [];
                    });
                }
                posts.push(postData);
            }
        });

        const users = [];
        usersSnapshot.forEach(emailNode => {
            emailNode.forEach(clientNode => {
                const userData = clientNode.val();
                if (typeof userData === 'object' && userData !== null) {
                    users.push({
                        clientId: clientNode.key,
                        email: emailNode.key.replace(/_/g, '.'),
                        ...userData
                    });
                }
            });
        });

        let filteredPosts = posts;
        if (searchTerm) {
            searchTerm = searchTerm.toLowerCase();
            filteredPosts = filteredPosts.filter(post =>
                (post.content || '').toLowerCase().includes(searchTerm) ||
                (post.user || '').toLowerCase().includes(searchTerm)
            );
        }
        if (date) {
            filteredPosts = filteredPosts.filter(post => {
                const postDate = new Date(post.timestamp).toLocaleDateString();
                return postDate === new Date(date).toLocaleDateString();
            });
        }
        if (user) {
            user = user.toLowerCase();
            filteredPosts = filteredPosts.filter(post =>
                (post.user || '').toLowerCase().includes(user)
            );
        }

        const filteredUsers = users.filter(u =>
            (u.displayName || '').toLowerCase().includes(searchTerm)
        );

        return {
            posts: filteredPosts,
            users: filteredUsers
        };
    } catch (error) {
        console.error('Error filtering posts and users:', error);
        return {
            posts: [],
            users: []
        };
    }
}


let lastPostTimestamp = null;
const postsPerLoad = 10;

function initializePostsListener() {
    const postsRef = query(ref(database, 'posts'), orderByChild('timestamp'), limitToLast(postsPerLoad));
    onValue(postsRef, (snapshot) => {
        const posts = [];
        console.log('Snapshot de posts:', snapshot.val());
        snapshot.forEach(child => {
            const postData = child.val();
            console.log('Post individual:', postData);
            if (postData && postData.id) {
                postData.content = postData.content || 'Contenido no disponible';
                postData.likes = Array.isArray(postData.likes) ? postData.likes : [];
                if (postData.replies) {
                    Object.values(postData.replies).forEach(reply => {
                        reply.likes = Array.isArray(reply.likes) ? reply.likes : [];
                    });
                }
                posts.push(postData);
            } else {
                console.warn('Publicación ignorada por datos incompletos:', postData);
            }
        });
        console.log('Posts filtrados:', posts);
        const sortedPosts = posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (sortedPosts.length > 0) {
            lastPostTimestamp = sortedPosts[sortedPosts.length - 1].timestamp;
        }
        renderPosts(sortedPosts, currentSection === 'posts' ? postsDiv : videosDiv);
    }, (error) => {
        console.error('Error en posts listener:', error);
        errorDiv.textContent = 'Error al cargar contenido.';
    });

    onChildChanged(ref(database, 'posts'), (snapshot) => {
        const postData = snapshot.val();
        console.log('Post changed:', postData);
        if (postData && postData.id) {
            const postElement = document.querySelector(`.post[data-post-id="${postData.id}"]`);
            console.log('Post element:', postElement);
            if (postElement) {
                const repliesContainer = postElement.querySelector('.replies');
                if (repliesContainer) {
                    repliesContainer.innerHTML = renderReplies(postData.replies, postData.id);
                }
            }
        }
    });
}

window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
        loadMorePosts();
    }
});

async function loadMorePosts() {
    if (!lastPostTimestamp) return;
    const postsRef = query(ref(database, 'posts'), orderByChild('timestamp'), endAt(lastPostTimestamp - 1), limitToLast(postsPerLoad));
    const snapshot = await get(postsRef);
    const posts = [];
    snapshot.forEach(child => {
        const postData = child.val();
        if (postData && postData.id && postData.content) {
            postData.likes = Array.isArray(postData.likes) ? postData.likes : [];
            if (postData.replies) {
                Object.values(postData.replies).forEach(reply => {
                    reply.likes = Array.isArray(reply.likes) ? reply.likes : [];
                });
            }
            posts.push(postData);
        }
    });
    const sortedPosts = posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    if (sortedPosts.length > 0) {
        lastPostTimestamp = sortedPosts[sortedPosts.length - 1].timestamp;
        renderPosts(sortedPosts, currentSection === 'posts' ? postsDiv : videosDiv, true);
    }
}

function initializeRealTimeNotifications() {
    const usersRef = ref(database, 'users');
    onChildChanged(usersRef, async (snapshot) => {
        const emailNode = snapshot.val();
        for (const [id, userData] of Object.entries(emailNode)) {
            if (id === clientId && profile && userData.followers?.includes(clientId)) {
                const followerSnapshot = await get(ref(database, `users/${profile.email.replace(/\./g, '_')}/${clientId}`));
                const followerProfile = followerSnapshot.val();
                if (followerProfile && !profile.followers?.includes(clientId)) {
                    showNotification(`${followerProfile.displayName || 'Anónimo'} te empezó a seguir`, true);
                }
            }
        }
    }, (error) => {
        console.error('Error in users child changed listener:', error);
    });

    const postsRef = ref(database, 'posts');
    onChildChanged(postsRef, async (snapshot) => {
        const post = snapshot.val();
        if (!post || post.clientId === clientId || !profile) return;

        const postLikes = Array.isArray(post.likes) ? post.likes : [];
        const prevLikes = Array.isArray(post.prevLikes) ? post.prevLikes : [];
        if (postLikes.includes(clientId) && !prevLikes.includes(clientId)) {
            const userSnapshot = await get(ref(database, `users/${post.email.replace(/\./g, '_')}/${post.clientId}`));
            const user = userSnapshot.val();
            if (typeof user === 'object' && user !== null) {
                const message = post.video ?
                    `${user.displayName || 'Anónimo'} le dio like a tu video` :
                    `${user.displayName || 'Anónimo'} le dio like a tu publicación`;
                showNotification(message, true, post.clientId, user.profilePic);
            }
        }

        if (post.replies) {
            for (const [replyId, reply] of Object.entries(post.replies)) {
                if (reply.clientId !== clientId && !post.prevReplies?.[replyId]) {
                    const userSnapshot = await get(ref(database, `users/${reply.email.replace(/\./g, '_')}/${reply.clientId}`));
                    const user = userSnapshot.val();
                    if (typeof user === 'object' && user !== null) {
                        showNotification(`${user.displayName || 'Anónimo'} comentó en tu ${post.video ? 'video' : 'publicación'}`, true, post.clientId);
                    }
                }
            }
        }
        await update(ref(database, `posts/${post.id}`), {
            prevLikes: postLikes,
            prevReplies: post.replies || {}
        });
    }, (error) => {
        console.error('Error in posts child changed listener:', error);
    });

    onChildAdded(postsRef, async (snapshot) => {
        const post = snapshot.val();
        if (!post || post.clientId !== clientId || !profile) return;
        await update(ref(database, `posts/${post.id}`), {
            prevLikes: [],
            prevReplies: {}
        });
    }, (error) => {
        console.error('Error in posts child added listener:', error);
    });
}

document.getElementById('modal-save-profile').onclick = async () => {
    const name = document.getElementById('modal-display-name').value.trim();
    const password = document.getElementById('modal-password').value.trim();
    const bio = document.getElementById('modal-bio').value.trim();
    const file = document.getElementById('modal-profile-pic-input').files[0];
    if (!name) {
        document.getElementById('modal-error').textContent = 'Ingresa un nombre.';
        return;
    }
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
            points: 0,
            badges: []
        };
        if (password) {
            await updatePassword(auth.currentUser, password);
        }
        await set(ref(database, `users/${auth.currentUser.email.replace(/\./g, '_')}/${clientId}`), profile);
        localStorage.setItem('profile', JSON.stringify(profile));
        updateProfileUI();
        modal.style.display = 'none';
        profileSection.style.display = 'block';
        showNotification('¡Perfil guardado!');
        initializePostsListener();
    } catch (error) {
        document.getElementById('modal-error').textContent = 'Error al guardar el perfil o actualizar la contraseña.';
        console.error('Error saving profile:', error);
    }
};

document.getElementById('modal-delete-account').onclick = async () => {
    if (confirm('¿Estás seguro de eliminar tu cuenta? Esta acción no se puede deshacer.')) {
        try {
            await deleteUser(auth.currentUser);
            await remove(ref(database, `users/${auth.currentUser.email.replace(/\./g, '_')}/${clientId}`));
            localStorage.removeItem('clientId');
            localStorage.removeItem('profile');
            profileSection.style.display = 'none';
            loginModal.style.display = 'flex';
            showNotification('¡Cuenta eliminada!');
        } catch (error) {
            document.getElementById('modal-error').textContent = 'Error al eliminar la cuenta.';
            console.error('Error deleting account:', error);
        }
    }
};

document.getElementById('edit-profile').onclick = () => {
    modal.style.display = 'flex';
    document.getElementById('modal-display-name').value = profile.displayName || '';
    document.getElementById('modal-password').value = '';
    document.getElementById('modal-bio').value = profile.bio || '';
};

document.getElementById('modal-cancel-profile').onclick = () => {
    modal.style.display = 'none';
};

document.getElementById('submit-post').onclick = async () => {
    const content = document.getElementById('post-content').value.trim();
    if (!content) {
        errorDiv.textContent = 'Ingresa un mensaje.';
        return;
    }
    try {
        const imageFile = document.getElementById('post-image').files[0];
        const videoFile = document.getElementById('post-video').files[0];
        if (imageFile && videoFile) {
            errorDiv.textContent = 'Selecciona solo una imagen o un video.';
            return;
        }
        let imageUrl = null,
            videoUrl = null;
        if (imageFile) {
            imageUrl = await compressMedia(imageFile);
        } else if (videoFile) {
            videoUrl = await compressMedia(videoFile, true);
        }
        const newPost = {
            id: generateUUID(),
            content: content,
            user: profile.displayName,
            profilePic: profile.profilePic,
            clientId: clientId,
            timestamp: Date.now(),
            image: imageUrl,
            video: videoUrl,
            replies: {},
            likes: [],
            prevLikes: [],
            prevReplies: {},
            followers: [],
            email: auth.currentUser.email
        };
        await set(ref(database, 'posts/' + newPost.id), newPost);
        const newPostCount = (profile.postCount || 0) + 1;
        await update(ref(database, `users/${auth.currentUser.email.replace(/\./g, '_')}/${clientId}`), {
            postCount: newPostCount
        });
        profile.postCount = newPostCount;
        localStorage.setItem('profile', JSON.stringify(profile));
        updateUserPoints('post');
        document.getElementById('post-content').value = '';
        document.getElementById('post-image').value = '';
        document.getElementById('post-video').value = '';
        document.getElementById('post-form').classList.remove('active');
        showNotification('¡Publicación creada!');
    } catch (error) {
        errorDiv.textContent = 'Error al publicar. Revisa la consola para más detalles.';
        console.error('Error submitting post:', error);
        if (error.code) {
            console.error('Firebase error code:', error.code);
            console.error('Firebase error message:', error.message);
        }
    }
};

window.deletePost = async (postId) => {
    try {
        const postRef = ref(database, 'posts/' + postId);
        const snapshot = await get(postRef);
        if (snapshot.val()?.clientId === clientId) {
            await remove(postRef);
            await update(ref(database, `users/${auth.currentUser.email.replace(/\./g, '_')}/${clientId}`), {
                postCount: Math.max(0, (profile.postCount || 0) - 1)
            });
        } else {
            errorDiv.textContent = 'No tienes permiso para eliminar esta publicación.';
        }
    } catch (error) {
        errorDiv.textContent = 'Error al eliminar publicación.';
        console.error('Error deleting post:', error);
    }
};

window.editPost = (postId) => {
    document.getElementById(`edit-form-${postId}`).style.display = 'block';
};

window.submitEdit = async (postId) => {
    const content = document.getElementById(`edit-content-${postId}`).value.trim();
    if (!content) {
        errorDiv.textContent = 'Ingresa un mensaje.';
        return;
    }
    try {
        const imageFile = document.getElementById(`edit-image-${postId}`).files[0];
        const videoFile = document.getElementById(`edit-video-${postId}`).files[0];
        if (imageFile && videoFile) {
            errorDiv.textContent = 'Selecciona solo una imagen o un video.';
            return;
        }
        let imageUrl = null,
            videoUrl = null;
        if (imageFile) {
            imageUrl = await compressMedia(imageFile);
        } else if (videoFile) {
            videoUrl = await compressMedia(videoFile, true);
        }
        const postRef = ref(database, 'posts/' + postId);
        const snapshot = await get(postRef);
        if (snapshot.val()?.clientId === clientId) {
            await update(postRef, {
                content,
                image: imageUrl,
                video: videoUrl
            });
            document.getElementById(`edit-form-${postId}`).style.display = 'none';
            showNotification('¡Publicación actualizada!');
        } else {
            errorDiv.textContent = 'No tienes permiso para editar esta publicación.';
        }
    } catch (error) {
        errorDiv.textContent = 'Error al actualizar publicación.';
        console.error('Error editing post:', error);
    }
};

window.toggleLike = async (postId) => {
    try {
        const postRef = ref(database, `posts/${postId}`);
        const snapshot = await get(postRef);
        const postData = snapshot.val();
        let likes = Array.isArray(postData?.likes) ? postData.likes : [];
        if (likes.includes(clientId)) {
            likes = likes.filter(id => id !== clientId);
        } else {
            likes.push(clientId);
            updateUserPoints('like');
        }
        await update(postRef, {
            likes
        });
        showNotification('¡Like actualizado!');
    } catch (error) {
        errorDiv.textContent = 'Error al actualizar like.';
        console.error('Error toggling like:', error);
    }
};

window.showReplyForm = (postId) => {
    document.getElementById(`reply-form-${postId}`).style.display = 'block';
};

window.submitReply = async (postId, parentId = null) => {
    console.log('Submitting reply for post:', postId, 'with parent:', parentId);
    const content = document.getElementById(`reply-content-${postId}`).value.trim();
    if (!content) {
        errorDiv.textContent = 'Ingresa un comentario.';
        return;
    }
    try {
        const imageFile = document.getElementById(`reply-image-${postId}`).files[0];
        const videoFile = document.getElementById(`reply-video-${postId}`).files[0];
        if (imageFile && videoFile) {
            errorDiv.textContent = 'Selecciona solo una imagen o un video.';
            return;
        }
        let imageUrl = null,
            videoUrl = null;
        if (imageFile) {
            imageUrl = await compressMedia(imageFile);
        } else if (videoFile) {
            videoUrl = await compressMedia(videoFile, true);
        }
        const reply = {
            content: content,
            user: profile.displayName,
            profilePic: profile.profilePic,
            clientId: clientId,
            timestamp: Date.now(),
            image: imageUrl,
            video: videoUrl,
            likes: [],
            email: auth.currentUser.email,
            parentId: parentId
        };
        await push(ref(database, `posts/${postId}/replies`), reply);
        updateUserPoints('comment');

        const postElement = document.querySelector(`.post[data-post-id="${postId}"]`);
        if (postElement) {
            const replyBtn = postElement.querySelector('.reply-btn');
            const snapshot = await get(ref(database, `posts/${postId}/replies`));
            const replies = snapshot.val() || {};
            if (replyBtn) {
                replyBtn.innerHTML = `<div class="icon-comment"></div> Comentar (${Object.keys(replies).length})`;
            }
        }
        document.getElementById(`reply-form-${postId}`).style.display = 'none';
        document.getElementById(`reply-content-${postId}`).value = '';
        document.getElementById(`reply-image-${postId}`).value = '';
        document.getElementById(`reply-video-${postId}`).value = '';
        showNotification('¡Comentario publicado!');
    } catch (error) {
        errorDiv.textContent = 'Error al publicar comentario.';
        console.error('Error submitting reply:', error);
    }
};

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('reply-to-reply-btn')) {
        const postId = e.target.dataset.postId;
        const replyId = e.target.dataset.replyId;
        const replyForm = document.getElementById(`reply-form-${postId}`);
        replyForm.style.display = 'block';
        replyForm.dataset.parentId = replyId;
    }
});

function renderReplies(replies, postId, parentId = null) {
    if (!replies) return '';
    return Object.entries(replies)
        .filter(([_, reply]) => reply.parentId === parentId)
        .map(([replyId, reply]) => {
            const replyLikes = Array.isArray(reply.likes) ? reply.likes : [];
            return `
                <div class="reply" data-reply-id="${replyId}">
                    <div class="post-header">
                        <img src="${reply.profilePic || 'https://via.placeholder.com/40'}" alt="Usuario" onclick="viewUserProfile('${reply.clientId}')">
                        <p><strong class="username" data-client-id="${reply.clientId}">${reply.user || 'Anónimo'}</strong></p>
                        ${reply.clientId === clientId ? `<button class="btn delete-reply-btn" data-reply-id="${replyId}"><div class="icon-delete"></div></button>` : ''}
                        <button class="btn reply-to-reply-btn" data-post-id="${postId}" data-reply-id="${replyId}"><div class="icon-reply"></div></button>
                    </div>
                    <p>${reply.content || ''}</p>
                    ${reply.image ? `<img src="${reply.image}" alt="Imagen de Respuesta">` : reply.video ? `<video src="${reply.video}" controls playsinline webkit-playsinline preload="metadata"></video>` : ''}
                    <div class="replies">
                        ${renderReplies(replies, postId, replyId)}
                    </div>
                </div>`;
        }).join('');
}

window.deleteReply = async (postId, replyId) => {
    try {
        const replyRef = ref(database, `posts/${postId}/replies/${replyId}`);
        const snapshot = await get(replyRef);
        if (snapshot.val()?.clientId === clientId) {
            await remove(replyRef);
        } else {
            errorDiv.textContent = 'No tienes permiso para eliminar este comentario.';
        }
    } catch (error) {
        errorDiv.textContent = 'Error al eliminar comentario.';
        console.error('Error deleting reply:', error);
    }
};

async function viewUserProfile(targetClientId) {
    if (!profile) return;
    try {
        const usersRef = ref(database, 'users');
        const snapshot = await get(usersRef);
        const users = snapshot.val() || {};
        let targetProfile = null;

        for (const [email, clientIds] of Object.entries(users)) {
            for (const [id, userData] of Object.entries(clientIds)) {
                if (id === targetClientId && typeof userData === 'object' && userData !== null) {
                    targetProfile = { ...userData,
                        email: email.replace(/_/g, '.'),
                        clientId: id
                    };
                    break;
                }
            }
            if (targetProfile) break;
        }

        if (targetProfile) {
            currentSection = 'user-profile';
            forumSection.style.display = 'none';
            videoSection.style.display = 'none';
            followersSection.style.display = 'none';
            userProfileSection.style.display = 'block';

            const isFollowing = profile?.following?.includes(targetClientId) || false;
            const followButton = targetClientId !== clientId ?
                (isFollowing ?
                    `<button class="btn btn-cancel unfollow-btn" onclick="unfollowUser('${targetClientId}')">Dejar de Seguir</button>` :
                    `<button class="btn follow-btn" onclick="followUser('${targetClientId}')">Seguir</button>`) :
                '';
            const messageButton = targetClientId !== clientId ? `<button class="btn" onclick="sendMessage('${targetClientId}')">Enviar Mensaje</button>` : '';

            const postsRef = ref(database, 'posts');
            const postsSnapshot = await get(postsRef);
            const userPosts = [];
            postsSnapshot.forEach(child => {
                const postData = child.val();
                if (postData && postData.clientId === targetClientId) {
                    postData.likes = Array.isArray(postData.likes) ? postData.likes : [];
                    if (postData.replies) {
                        Object.values(postData.replies).forEach(reply => {
                            reply.likes = Array.isArray(reply.likes) ? reply.likes : [];
                        });
                    }
                    userPosts.push(postData);
                }
            });
            const sortedPosts = userPosts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            const userProfilePic = userProfileContent.querySelector('.profile-pic');
            userProfilePic.src = targetProfile.profilePic || 'https://via.placeholder.com/40';

            userProfileContent.innerHTML = `
                <h3>${targetProfile.displayName || 'Anónimo'}</h3>
                <p>${targetProfile.bio || ''}</p>
                <p>Seguidores: ${targetProfile.followers?.length || 0} · Publicaciones: ${targetProfile.postCount || 0}</p>
                ${followButton}
                ${messageButton}
                <h4>Publicaciones</h4>
                <div id="user-posts">${sortedPosts.length > 0 ? '' : '<p>Este usuario no ha publicado nada.</p>'}</div>
            `;
            renderPosts(sortedPosts, document.getElementById('user-posts'));
        } else {
            userProfileContent.innerHTML = '<p>Perfil no encontrado.</p>';
        }
    } catch (error) {
        userProfileContent.innerHTML = '<p>Error al cargar el perfil.</p>';
        console.error('Error viewing user profile:', error);
    }
}
window.viewUserProfile = viewUserProfile;

async function updateUserPoints(action) {
    if (!profile) return;
    let points = 0;
    switch (action) {
        case 'post':
            points = 10;
            break;
        case 'like':
            points = 1;
            break;
        case 'comment':
            points = 2;
            break;
    }
    const userRef = ref(database, `users/${profile.email.replace(/\./g, '_')}/${clientId}`);
    const newPoints = (profile.points || 0) + points;
    await update(userRef, {
        points: newPoints
    });
    profile.points = newPoints;
    localStorage.setItem('profile', JSON.stringify(profile));
    checkBadges();
}

async function checkBadges() {
    if (!profile) return;
    const badges = profile.badges || [];
    if (profile.points >= 100 && !badges.includes('bronze')) {
        badges.push('bronze');
        showNotification('¡Has ganado la medalla de bronce!');
    }
    if (profile.points >= 500 && !badges.includes('silver')) {
        badges.push('silver');
        showNotification('¡Has ganado la medalla de plata!');
    }
    if (profile.points >= 1000 && !badges.includes('gold')) {
        badges.push('gold');
        showNotification('¡Has ganado la medalla de oro!');
    }
    const userRef = ref(database, `users/${profile.email.replace(/\./g, '_')}/${clientId}`);
    await update(userRef, {
        badges
    });
    profile.badges = badges;
    localStorage.setItem('profile', JSON.stringify(profile));
}

async function savePost(postId, button) {
    if (!profile) return;
    try {
        const userRef = ref(database, `users/${profile.email.replace(/\./g, '_')}/${clientId}`);
        const userSnapshot = await get(userRef);
        const userProfile = userSnapshot.val() || {};
        const savedPosts = userProfile.savedPosts || [];

        if (savedPosts.includes(postId)) {
            // Unsave the post
            const updatedSavedPosts = savedPosts.filter(id => id !== postId);
            await update(userRef, {
                savedPosts: updatedSavedPosts
            });
            profile.savedPosts = updatedSavedPosts;
            localStorage.setItem('profile', JSON.stringify(profile));
            showNotification('¡Publicación eliminada de guardados!');
            button.classList.remove('saved');
        } else {
            // Save the post
            const updatedSavedPosts = [...savedPosts, postId];
            await update(userRef, {
                savedPosts: updatedSavedPosts
            });
            profile.savedPosts = updatedSavedPosts;
            localStorage.setItem('profile', JSON.stringify(profile));
            showNotification('¡Publicación guardada!');
            button.classList.add('saved');
        }
    } catch (error) {
        errorDiv.textContent = 'Error al guardar la publicación.';
        console.error('Error saving post:', error);
    }
}

async function renderSavedPosts() {
    const savedPostsDiv = document.getElementById('saved-posts');
    savedPostsDiv.innerHTML = '';
    if (!profile?.savedPosts?.length) {
        savedPostsDiv.innerHTML = '<p>No tienes publicaciones guardadas.</p>';
        return;
    }
    try {
        const postsRef = ref(database, 'posts');
        const snapshot = await get(postsRef);
        const posts = [];
        snapshot.forEach(child => {
            const postData = child.val();
            if (postData && profile.savedPosts.includes(postData.id)) {
                posts.push(postData);
            }
        });
        renderPosts(posts, savedPostsDiv);
    } catch (error) {
        savedPostsDiv.innerHTML = '<p>Error al cargar las publicaciones guardadas.</p>';
        console.error('Error rendering saved posts:', error);
    }
}

async function showLikes(postId) {
    likesModal.style.display = 'flex';
    likesList.innerHTML = '';
    try {
        const postRef = ref(database, `posts/${postId}`);
        const snapshot = await get(postRef);
        const postData = snapshot.val();
        const likes = postData.likes || [];

        if (likes.length === 0) {
            likesList.innerHTML = '<p>A nadie le ha gustado esta publicación todavía.</p>';
            return;
        }

        const usersRef = ref(database, 'users');
        const usersSnapshot = await get(usersRef);
        const users = usersSnapshot.val() || {};
        const likers = [];

        for (const [email, clientIds] of Object.entries(users)) {
            for (const [id, userData] of Object.entries(clientIds)) {
                if (likes.includes(id)) {
                    likers.push(userData);
                }
            }
        }

        likers.forEach(liker => {
            const likerElement = document.createElement('div');
            likerElement.className = 'follower-item';
            likerElement.innerHTML = `
                <img src="${liker.profilePic || 'https://via.placeholder.com/32'}" alt="Foto de ${liker.displayName}">
                <p>${liker.displayName || 'Anónimo'}</p>
            `;
            likesList.appendChild(likerElement);
        });
    } catch (error) {
        likesList.innerHTML = '<p>Error al cargar los Me gusta.</p>';
        console.error('Error showing likes:', error);
    }
}

document.getElementById('close-likes-modal').addEventListener('click', () => {
    likesModal.style.display = 'none';
});

document.getElementById('close-comments-modal').addEventListener('click', () => {
    document.getElementById('comments-modal').style.display = 'none';
});

async function showComments(postId) {
    const commentsModal = document.getElementById('comments-modal');
    const commentsList = document.getElementById('comments-list');
    commentsModal.style.display = 'flex';
    commentsList.innerHTML = '';
    try {
        const postRef = ref(database, `posts/${postId}`);
        const snapshot = await get(postRef);
        const postData = snapshot.val();
        const replies = postData.replies || {};

        if (Object.keys(replies).length === 0) {
            commentsList.innerHTML = '<p>No hay comentarios en esta publicación.</p>';
            return;
        }
        commentsList.innerHTML = renderReplies(replies, postId);
    } catch (error) {
        commentsList.innerHTML = '<p>Error al cargar los comentarios.</p>';
        console.error('Error showing comments:', error);
    }
}

async function renderConversations() {
    const conversationsList = document.getElementById('conversations-list');
    conversationsList.innerHTML = '';
    if (!profile) return;
    try {
        const conversationsRef = ref(database, `users/${profile.email.replace(/\./g, '_')}/${clientId}/conversations`);
        const snapshot = await get(conversationsRef);
        const conversations = snapshot.val() || {};

        if (Object.keys(conversations).length === 0) {
            conversationsList.innerHTML = '<p>No tienes conversaciones.</p>';
            return;
        }

        for (const conversationId in conversations) {
            const conversation = conversations[conversationId];
            const otherUserId = conversation.members.find(id => id !== clientId);

            const usersRef = ref(database, 'users');
            const usersSnapshot = await get(usersRef);
            const users = usersSnapshot.val() || {};
            let otherUser = null;

            for (const [email, clientIds] of Object.entries(users)) {
                for (const [id, userData] of Object.entries(clientIds)) {
                    if (id === otherUserId) {
                        otherUser = { ...userData,
                            clientId: id
                        };
                        break;
                    }
                }
                if (otherUser) break;
            }

            if (otherUser) {
                const conversationElement = document.createElement('div');
                conversationElement.className = 'follower-item';
                conversationElement.innerHTML = `
                    <img src="${otherUser.profilePic || 'https://via.placeholder.com/32'}" alt="Foto de ${otherUser.displayName}">
                    <p>${otherUser.displayName || 'Anónimo'}</p>
                `;
                conversationElement.addEventListener('click', () => openChat(conversationId, otherUser));
                conversationsList.appendChild(conversationElement);
            }
        }
    } catch (error) {
        conversationsList.innerHTML = '<p>Error al cargar las conversaciones.</p>';
        console.error('Error rendering conversations:', error);
    }
}

async function openChat(conversationId, otherUser) {
    const chatHeader = document.getElementById('chat-header');
    const chatMessages = document.getElementById('chat-messages');
    const sendMessageBtn = document.getElementById('send-message-btn');

    chatHeader.innerHTML = `<h3>${otherUser.displayName || 'Anónimo'}</h3>`;
    chatMessages.innerHTML = '';

    const messagesRef = ref(database, `messages/${conversationId}`);
    onValue(messagesRef, (snapshot) => {
        chatMessages.innerHTML = '';
        snapshot.forEach(child => {
            const message = child.val();
            const messageElement = document.createElement('div');
            messageElement.textContent = message.text;
            chatMessages.appendChild(messageElement);
        });
    });

    sendMessageBtn.onclick = async () => {
        const chatInput = document.getElementById('chat-input');
        const text = chatInput.value.trim();
        if (!text) return;
        const message = {
            text,
            senderId: clientId,
            timestamp: Date.now()
        };
        await push(messagesRef, message);
        chatInput.value = '';
    };
}

async function sendMessage(targetClientId) {
    if (!profile) return;
    try {
        const conversationId = [clientId, targetClientId].sort().join('_');
        const userRef = ref(database, `users/${profile.email.replace(/\./g, '_')}/${clientId}/conversations/${conversationId}`);
        await set(userRef, {
            members: [clientId, targetClientId]
        });

        const targetUserRef = ref(database, `users/${targetClientId.replace(/\./g, '_')}/${targetClientId}/conversations/${conversationId}`);
        await set(targetUserRef, {
            members: [clientId, targetClientId]
        });

        openChat(conversationId, {
            clientId: targetClientId
        });
    } catch (error) {
        console.error('Error sending message:', error);
    }
}

async function renderExplore() {
    const exploreDiv = document.getElementById('explore');
    exploreDiv.innerHTML = '';
    try {
        const postsRef = ref(database, 'posts');
        const snapshot = await get(postsRef);
        const posts = [];
        snapshot.forEach(child => {
            const postData = child.val();
            if (postData.image || postData.video) {
                posts.push(postData);
            }
        });
        const shuffledPosts = posts.sort(() => 0.5 - Math.random());
        renderPosts(shuffledPosts, exploreDiv);
    } catch (error) {
        exploreDiv.innerHTML = '<p>Error al cargar el contenido.</p>';
        console.error('Error rendering explore:', error);
    }
}

async function renderStats() {
    const postsRef = ref(database, 'posts');
    const snapshot = await get(postsRef);
    const posts = [];
    snapshot.forEach(child => {
        const postData = child.val();
        if (postData && postData.clientId === clientId) {
            posts.push(postData);
        }
    });

    const likesPerPost = posts.map(post => post.likes?.length || 0);
    const commentsPerPost = posts.map(post => Object.keys(post.replies || {}).length);
    const postsPerDay = {};
    posts.forEach(post => {
        const date = new Date(post.timestamp).toLocaleDateString();
        postsPerDay[date] = (postsPerDay[date] || 0) + 1;
    });
    const postLabels = posts.map((post, index) => `Post ${index + 1}`);

    const ctx = document.getElementById('stats-chart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: postLabels,
            datasets: [{
                label: 'Me gusta',
                data: likesPerPost,
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                borderColor: 'rgba(255, 99, 132, 1)',
                borderWidth: 1
            }, {
                label: 'Comentarios',
                data: commentsPerPost,
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function showNotification(message, realTime = false, targetClientId = null, profilePic = null) {
    // Solo mostrar notificaciones para ciertas acciones, excluyendo eliminación de publicaciones y comentarios
    if (message.includes('eliminada') || message.includes('eliminado')) return;

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
                currentSection = 'posts';
                forumSection.style.display = 'block';
                videoSection.style.display = 'none';
                followersSection.style.display = 'none';
                userProfileSection.style.display = 'none';
                document.getElementById('show-posts').classList.add('active');
                document.getElementById('show-videos').classList.remove('active');
                document.getElementById('show-followers').classList.remove('active');
                initializePostsListener();
            }
        });
    }
}

notificationIcon.addEventListener('click', () => {
    notificationContainer.classList.toggle('active');
    notificationCount = 0;
    notificationBadge.style.display = 'none';
});

document.getElementById('search-bar').addEventListener('input', async () => {
    const searchTerm = document.getElementById('search-bar').value;
    const {
        posts,
        users
    } = await filterPostsAndUsers(searchTerm);
    if (currentSection === 'posts') {
        renderPosts(posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)), postsDiv);
        if (users.length > 0) {
            const userResults = document.createElement('div');
            userResults.innerHTML = '<h3>Usuarios</h3>';
            users.forEach(user => {
                const userElement = document.createElement('div');
                userElement.className = 'follower-item';
                const isFollowing = profile?.following?.includes(user.clientId) || false;
                const followButton = isFollowing ?
                    `<button class="btn btn-cancel unfollow-btn" data-client-id="${user.clientId}">Dejar de Seguir</button>` :
                    `<button class="btn follow-btn" data-client-id="${user.clientId}">Seguir</button>`;
                userElement.innerHTML = `
                    <img src="${user.profilePic || 'https://via.placeholder.com/32'}" alt="Foto de ${user.displayName}" onclick="viewUserProfile('${user.clientId}')">
                    <p>${user.displayName || 'Anónimo'}</p>
                    ${user.clientId !== clientId ? followButton : ''}
                `;
                userResults.appendChild(userElement);
            });
            postsDiv.prepend(userResults);
            postsDiv.querySelectorAll('.follow-btn').forEach(btn => {
                btn.addEventListener('click', () => followUser(btn.dataset.clientId));
            });
            postsDiv.querySelectorAll('.unfollow-btn').forEach(btn => {
                btn.addEventListener('click', () => unfollowUser(btn.dataset.clientId));
            });
        }
    } else if (currentSection === 'videos') {
        renderPosts(posts.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)), videosDiv);
    } else {
        renderFollowers();
    }
});
