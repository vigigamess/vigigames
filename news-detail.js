// news-detail.js

let isAdmin = false;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const newsId = urlParams.get('id');
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (jwtToken) {
        // In a real application, you would decode the JWT to verify admin status
        // For this example, we'll assume any valid token means admin for simplicity
        isAdmin = true;
    }

    if (newsId) {
        loadNewsDetail(newsId, isAdmin);
        renderCommentForm(newsId);
    } else {
        document.getElementById('news-detail-content').innerHTML = '<p>شناسه خبر یافت نشد.</p>';
    }
});

async function loadNewsDetail(id) {
    try {
        const response = await fetch(`/api/news/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newsItem = await response.json();
        console.log('News item received:', newsItem);

        if (newsItem) {
            document.getElementById('page-title').textContent = `جزئیات خبر - ${newsItem.title}`;
            document.getElementById('news-detail-title').textContent = newsItem.title;
            document.getElementById('news-detail-image').src = newsItem.image || './images/placeholder.png';
            document.getElementById('news-detail-image').alt = newsItem.title || 'تصویر خبر';
            document.getElementById('news-detail-content').innerHTML = newsItem.content;
            const newsDateElement = document.getElementById('news-detail-date');
            if (newsItem.createdAt) {
                newsDateElement.textContent = `تاریخ: ${new Date(newsItem.createdAt).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' })}`;
            } else {
                newsDateElement.textContent = 'تاریخ: نامشخص';
            }
            document.getElementById('news-detail-likes').textContent = newsItem.likes || 0;


            const heartIcon = document.getElementById('news-detail-heart-icon');
            if (heartIcon) {
                if (checkIfLiked(newsItem.id)) {
                    heartIcon.classList.add('liked');
                } else {
                    heartIcon.classList.remove('liked');
                }
                heartIcon.addEventListener('click', () => toggleLike(newsItem.id));
            }

            renderComments(newsItem.comments, newsItem.id, isAdmin);

        } else {
            document.getElementById('news-detail-content').innerHTML = '<p>خبر مورد نظر یافت نشد.</p>';
        }
    } catch (error) {
        console.error("Error fetching news for detail page:", error);
        document.getElementById('news-detail-content').innerHTML = '<p>خطا در بارگذاری خبر.</p>';
    }
}

function renderComments(comments, newsId, isAdmin) {
    const commentsContainer = document.getElementById('news-comments-container');
    if (!commentsContainer) return;

    const commentsToDisplay = isAdmin ? comments : comments.filter(comment => comment.approved);

    if (commentsToDisplay.length === 0) {
        commentsContainer.innerHTML = '<p>هیچ نظری برای این خبر وجود ندارد.</p>';
        return;
    }

    commentsContainer.innerHTML = commentsToDisplay.map(comment => {
        const formattedDate = new Date(comment.date).toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
        let adminControls = '';
        if (isAdmin) {
            adminControls = `
                <div class="admin-comment-controls">
                    <button class="approve-comment-btn" data-comment-id="${comment.id}" data-news-id="${newsId}" ${comment.approved ? 'disabled' : ''}>تایید</button>
                    <button class="reject-comment-btn" data-comment-id="${comment.id}" data-news-id="${newsId}" ${!comment.approved ? 'disabled' : ''}>رد</button>
                </div>
            `;
        }
        return `
            <div class="comment-item ${comment.approved ? '' : 'unapproved'}">
                <h4 class="comment-author">${comment.author}</h4>
                <p class="comment-date">${formattedDate} ${comment.approved ? '' : '(در انتظار تایید)'}</p>
                <p class="comment-text">${comment.text}</p>
                ${adminControls}
            </div>
        `;
    }).join('');

    if (isAdmin) {
        document.querySelectorAll('.approve-comment-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const commentId = e.currentTarget.dataset.commentId;
                const newsId = e.currentTarget.dataset.newsId;
                updateCommentStatus(newsId, commentId, true);
            });
        });

        document.querySelectorAll('.reject-comment-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const commentId = e.currentTarget.dataset.commentId;
                const newsId = e.currentTarget.dataset.newsId;
                updateCommentStatus(newsId, commentId, false);
            });
        });
    }
}

function renderCommentForm(newsId) {
    const formContainer = document.getElementById('news-comment-form-container');
    if (!formContainer) return;

    formContainer.innerHTML = `
        <div class="comment-form">
            <h3>ارسال نظر</h3>
            <div class="form-group">
                <label for="comment-author">نام شما:</label>
                <input type="text" id="comment-author" placeholder="نام خود را وارد کنید" required>
            </div>
            <div class="form-group">
                <label for="comment-text">نظر شما:</label>
                <textarea id="comment-text" placeholder="نظر خود را وارد کنید" required></textarea>
            </div>
            <button type="submit" id="submit-comment-btn">ارسال نظر</button>
        </div>
    `;

    const submitBtn = document.getElementById('submit-comment-btn');
    submitBtn.addEventListener('click', async () => {
        const author = document.getElementById('comment-author').value;
        const text = document.getElementById('comment-text').value;

        if (!author || !text) {
            alert('لطفا نام و نظر خود را وارد کنید.');
            return;
        }

        try {
            const apiUrl = `/api/news/${newsId}/comments`;
            console.log('Submitting comment to:', apiUrl);
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ author, text })
            });

            if (response.ok) {
                alert('نظر شما با موفقیت ارسال شد و پس از تایید ادمین نمایش داده خواهد شد.');
                document.getElementById('comment-author').value = '';
                document.getElementById('comment-text').value = '';
            } else {
                throw new Error('خطا در ثبت نظر');
            }
        } catch (error) {
            console.error('Error submitting comment:', error);
            alert('خطا در ثبت نظر. لطفا دوباره تلاش کنید.');
        }
    });
}


async function updateCommentStatus(newsId, commentId, approved) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (!jwtToken) {
        alert('برای انجام این کار باید وارد شوید.');
        return;
    }

    try {
        const response = await fetch(`/api/news/${newsId}/comments/${commentId}/approve`, {
                method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwtToken}`
            },
            body: JSON.stringify({ approved })
        });

        if (response.ok) {
            loadNewsDetail(newsId); // Reload news detail to update comments
            alert('وضعیت نظر با موفقیت به‌روزرسانی شد.');
        } else {
            throw new Error('خطا در به‌روزرسانی وضعیت نظر');
        }
    } catch (error) {
        console.error('Error updating comment status:', error);
        alert('خطا در به‌روزرسانی وضعیت نظر. لطفا دوباره تلاش کنید.');
    }
}

function checkIfLiked(newsId) {
    const likedNews = JSON.parse(localStorage.getItem('likedNews')) || {};
    return likedNews[newsId] === true;
}

function setLiked(newsId, liked) {
    const likedNews = JSON.parse(localStorage.getItem('likedNews')) || {};
    likedNews[newsId] = liked;
    localStorage.setItem('likedNews', JSON.stringify(likedNews));
}

async function toggleLike(newsId) {
    if (checkIfLiked(newsId)) {
        alert('شما قبلاً این خبر را لایک کرده‌اید.');
        return;
    }

    try {
        const response = await fetch(`/api/news/${newsId}/like`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.ok) {
            const updatedNews = await response.json();
            document.getElementById('news-detail-likes').textContent = updatedNews.likes;
            const heartIcon = document.getElementById('news-detail-heart-icon');
            if (heartIcon) {
                heartIcon.classList.add('liked'); // Add a class to change color
            }
            setLiked(newsId, true); // Mark as liked in local storage
        } else {
            throw new Error('Error liking news');
        }
    } catch (error) {
        console.error('Error liking news:', error);
        alert('خطا در ثبت لایک. لطفا دوباره تلاش کنید.');
    }
}

