// State Management
const DEFAULT_IMAGE_URL = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80';

function cleanImageUrls(items) {
    return items.map(item => {
        if (item.image && !isValidUrl(item.image)) {
            return { ...item, image: DEFAULT_IMAGE_URL };

    }
        return item;
    });
}

let projects = []; // Will be loaded from projects.json
let news = [];     // Will be loaded from news.json
let isAdmin = false;

// Pagination variables
let currentProjectPage = 1;
const projectsPerPage = 6; // Display 6 projects per page
let totalProjectPages = 1;

let currentNewsPage = 1;
const newsPerPage = 6; // Display 6 news items per page
let totalNewsPages = 1;

// Visitor counter logic
const VISITOR_KEY = 'vigigames_total_visitors';
const LAST_VISIT_KEY = 'vigigames_last_visit_timestamp';

function initializeVisitorCounter() {
    let totalVisitors = parseInt(localStorage.getItem(VISITOR_KEY) || '0');
    const lastVisitTimestamp = parseInt(localStorage.getItem(LAST_VISIT_KEY) || '0');
    const now = Date.now();

    // If it's been more than 24 hours since the last visit, reset daily count and add to total
    if (now - lastVisitTimestamp > 24 * 60 * 60 * 1000) {
        totalVisitors++; // Increment for the new unique visit after 24 hours
        localStorage.setItem(VISITOR_KEY, totalVisitors.toString());
        localStorage.setItem(LAST_VISIT_KEY, now.toString());
    } else if (!localStorage.getItem(LAST_VISIT_KEY)) {
        // First visit ever
        totalVisitors++;
        localStorage.setItem(VISITOR_KEY, totalVisitors.toString());
        localStorage.setItem(LAST_VISIT_KEY, now.toString());
    }

    // Update the visitor stat box
    const visitorStatBox = document.querySelector('.stat-label');
    if (visitorStatBox && visitorStatBox.textContent.includes('آمار بازدید از سایت')) {
        const visitorNumberElement = visitorStatBox.previousElementSibling;
        if (visitorNumberElement) {
            visitorNumberElement.setAttribute('data-target', totalVisitors.toString());
            visitorNumberElement.textContent = totalVisitors.toString();
        }
    }
}


// Function to fetch projects from projects.json
const BASE_URL = 'https://6c6dd505-6a11-48a5-91ab-380321138fb-00-3fllc2bfwra4u.worf.replit.dev';
async function fetchProjects(page = currentProjectPage, limit = projectsPerPage, searchTerm = '', statusFilter = '') {
    try {
        const response = await fetch(`${BASE_URL}/api/projects?page=${page}&limit=${limit}&searchTerm=${searchTerm}&statusFilter=${statusFilter}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        projects = cleanImageUrls(data.items); // Store only the items for the current page
        totalProjectPages = data.totalPages;
        currentProjectPage = data.currentPage;
    } catch (error) {
        console.error("Error fetching projects:", error);
        projects = []; // Fallback to empty array on error
        totalProjectPages = 1;
        currentProjectPage = 1;
    }
}

// Function to fetch news from news.json
async function fetchNews(page = currentNewsPage, limit = newsPerPage, searchTerm = '') {
    try {
        const response = await fetch(`${BASE_URL}/api/news?page=${page}&limit=${limit}&searchTerm=${searchTerm}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        news = cleanImageUrls(data.items); // Store only the items for the current page
        totalNewsPages = data.totalPages;
        currentNewsPage = data.currentPage;
    } catch (error) {
        console.error("Error fetching news:", error);
        news = []; // Fallback to empty array on error
        totalNewsPages = 1;
        currentNewsPage = 1;
    }
}

// Function to fetch stats from the backend
async function fetchStats() {
    try {
        const response = await fetch(`${BASE_URL}/api/stats`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const stats = await response.json();

        document.getElementById('completed-projects-count').textContent = stats.completedProjects;
        document.getElementById('in-progress-projects-count').textContent = stats.inProgressProjects;
        document.getElementById('cancelled-projects-count').textContent = stats.cancelledProjects;
        document.getElementById('total-news-count').textContent = stats.totalNews;

        // Update data-target for animation if needed
        document.getElementById('completed-projects-count').dataset.target = stats.completedProjects;
        document.getElementById('in-progress-projects-count').dataset.target = stats.inProgressProjects;
        document.getElementById('cancelled-projects-count').dataset.target = stats.cancelledProjects;
        document.getElementById('total-news-count').dataset.target = stats.totalNews;

    } catch (error) {
        console.error("Error fetching stats:", error);
    }
}

// DOM Elements
const projectsGrid = document.getElementById('projects-grid');
const newsGrid = document.getElementById('news-grid');
const projectPaginationContainer = document.getElementById('project-pagination');
const newsPaginationContainer = document.getElementById('news-pagination');

// duplicate declaration removed
const newsImageInput = document.getElementById('news-image');
const newsFileBtnText = document.querySelector('#news-form .file-upload-btn');
const loginModal = document.getElementById('login-modal');
const adminModal = document.getElementById('admin-modal');
const projectForm = document.getElementById('project-form');
const newsForm = document.getElementById('news-form');
const adminActionsContainer = document.getElementById('admin-actions-container');
const notification = document.getElementById('notification');
const adminBtn = document.getElementById('admin-btn');
const adminBtnText = adminBtn.querySelector('.btn-text');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const scrollTopBtn = document.getElementById('scroll-top');

// File Input Handler
const fileInput = document.getElementById('project-image');
const fileBtnText = document.querySelector('.file-upload-btn');

fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        fileBtnText.innerHTML = `<i class="fa-solid fa-check"></i> ${e.target.files[0].name}`;
        fileBtnText.style.color = 'var(--primary)';
    }
});

newsImageInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        newsFileBtnText.innerHTML = `<i class="fa-solid fa-check"></i> ${e.target.files[0].name}`;
        newsFileBtnText.style.color = 'var(--primary)';
    }
});

// Initial Render & Animations
document.addEventListener('DOMContentLoaded', async () => { // Make it async
    await fetchProjects(
        currentProjectPage,
        projectsPerPage,
        searchInput.value, // Pass initial search term
        document.querySelector('.filter-btn.active').dataset.filter // Pass initial status filter
    ); // Fetch projects
    await fetchNews(currentNewsPage, newsPerPage, searchInput.value);     // Fetch news

    renderProjects(projects);
    renderNews(news);
    renderProjectPagination(); // Render project pagination
    renderNewsPagination();    // Render news pagination
    updateAdminUI();
    initAnimations();
    initParticles();
    initTiltForStaticElements();
    initHackerRobot();
    initializeVisitorCounter(); // Ensure visitor counter is initialized after news is loaded
    fetchStats(); // Fetch and display stats

    // Initialize TinyMCE
    tinymce.init({
        selector: '#project-desc',
        plugins: 'advlist autolink lists link image charmap anchor',
        toolbar_mode: 'floating',
        toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        directionality: 'rtl',
        language: 'fa',
        height: 200,
        readonly: false
    });
    tinymce.init({
        selector: '#news-content',
        plugins: 'advlist autolink lists link image charmap anchor',
        toolbar_mode: 'floating',
        toolbar: 'undo redo | formatselect | bold italic backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        directionality: 'rtl',
        language: 'fa',
        height: 300,
        readonly: false
    });
});

// Hacker Robot Logic
function initHackerRobot() {
    const robot = document.getElementById('hacker-robot');
    const msgBox = document.getElementById('robot-msg');
    
    // Appear after 2 seconds
    setTimeout(() => {
        robot.classList.add('active');
        setTimeout(() => {
            robot.classList.add('speaking');
            typeWriter('به سایت VIGIGAMES خوش آمدید...', msgBox);
        }, 1000);
    }, 2000);

    // Interaction
    robot.addEventListener('click', () => {
        const messages = [
            'سیستم ایمن است...',
            'پروژه‌های جدید بارگذاری شدند.',
            'من مراقب سرور هستم.',
            'آیا شما ادمین هستید؟'
        ];
        const randomMsg = messages[Math.floor(Math.random() * messages.length)];
        msgBox.innerHTML = '';
        typeWriter(randomMsg, msgBox);
    });
}

function typeWriter(text, element) {
    let i = 0;
    element.innerHTML = '';
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, 50);
        }
    }
    type();
}

// Admin Button Click
adminBtn.addEventListener('click', () => {
    if (isAdmin) {
        openAdminPanel();
    } else {
        loginModal.classList.add('active');
    }
});

// Close Modals
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.target.closest('.modal-overlay').classList.remove('active');
    });
});





// Login Logic
window.checkPassword = async function() {
    const passwordInput = document.getElementById('password-input');
    const password = passwordInput.value;

    try {
        const response = await fetch(`${BASE_URL}/api/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            isAdmin = true;
            sessionStorage.setItem('vigigames_admin', 'true');
            // ذخیره توکن JWT
            sessionStorage.setItem('vigigames_jwt', data.token);
            loginModal.classList.remove('active');
            passwordInput.value = '';
            updateAdminUI();
            openAdminPanel();
            showNotification('دسترسی مدیریت تایید شد');
        } else {
            showNotification(data.message || 'خطا: رمز عبور نامعتبر است', 'error');
        }
    } catch (error) {
        console.error('Error during login:', error);
        showNotification('خطا در برقراری ارتباط با سرور', 'error');
    }
}

// Update UI based on Admin Status
function updateAdminUI() {
    if (isAdmin) {
        adminBtnText.textContent = 'پنل مدیریت';
        const tempBtn = document.getElementById('temp-news-admin-btn');
        if (tempBtn) tempBtn.remove();
    } else {
        adminBtnText.textContent = 'ورود مدیر';
        const tempBtn = document.getElementById('temp-news-admin-btn');
        if (tempBtn) tempBtn.remove();
    }
    // Re-render to show/hide admin controls
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    fetchProjects(currentProjectPage, projectsPerPage, searchInput.value, activeFilter).then(() => {
        renderProjects(projects);
        renderProjectPagination();
    });
    fetchNews(currentNewsPage, newsPerPage, searchInput.value).then(() => {
        renderNews(news);
        renderNewsPagination();
    });
}

// Render Project Pagination
function renderProjectPagination() {
    projectPaginationContainer.innerHTML = '';
    if (totalProjectPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination';

    for (let i = 1; i <= totalProjectPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentProjectPage ? 'active' : ''}`;
        li.innerHTML = `<a href="#" class="page-link" data-page="${i}">${i}</a>`;
        li.addEventListener('click', async (e) => {
            e.preventDefault();
            currentProjectPage = parseInt(e.target.dataset.page);
            await fetchProjects(currentProjectPage, projectsPerPage, searchInput.value, document.querySelector('.filter-btn.active').dataset.filter);
            renderProjects(projects);
            renderProjectPagination();
        });
        ul.appendChild(li);
    }
    projectPaginationContainer.appendChild(ul);
}

// Edit News
window.editNews = async function(id) {
    try {
        const response = await fetch(`${BASE_URL}/api/news/${id}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newsItem = await response.json();

        // Populate the form
        document.getElementById('news-id').value = newsItem.id;
        document.getElementById('news-title').value = newsItem.title;
        tinymce.get('news-content').setContent(newsItem.content); // Set content for TinyMCE
        // For image, we don't pre-fill the input for security reasons, but we can show current image
        // document.getElementById('news-image').value = newsItem.image; 
        newsFileBtnText.innerHTML = newsItem.image ? `<i class="fa-solid fa-image"></i> ${newsItem.image.split('/').pop()}` : '<i class="fa-solid fa-cloud-arrow-up"></i> انتخاب تصویر';
        newsFileBtnText.style.color = 'var(--text-muted)';

        // Update modal title
        document.getElementById('news-modal-title').textContent = 'ویرایش خبر';
        document.getElementById('news-modal-title').style.display = 'block';

        // Show the news form
        adminModal.classList.add('active');
        adminActionsContainer.style.display = 'none';
        projectForm.style.display = 'none';
        newsForm.style.display = 'block';

    } catch (error) {
        console.error("Error fetching news for edit:", error);
        showNotification('خطا در بارگذاری خبر برای ویرایش', 'error');
    }
}

// Delete News
window.deleteNews = async function(id) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (!confirm('آیا از حذف این خبر اطمینان دارید؟')) {
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/news/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedNews = await response.json();
        // news = cleanImageUrls(updatedNews); // Update local news array - This line is redundant as fetchNews will update it

        // Re-render news and pagination
        currentNewsPage = 1; // Reset to first page after deletion
        await fetchNews(currentNewsPage, newsPerPage, searchInput.value);
        renderNews(news); // Ensure news array is updated by fetchNews before rendering
        renderNewsPagination();
        
        showNotification('خبر با موفقیت حذف شد');
    } catch (error) {
        console.error("Error deleting news:", error);
        showNotification('خطا در حذف خبر', 'error');
    }
}

// Delete Project
window.deleteProject = async function(id) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (!confirm('آیا از حذف این پروژه اطمینان دارید؟')) {
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedProjects = await response.json();
        projects = cleanImageUrls(updatedProjects); // Update local projects array

        // Re-render projects and pagination
        currentProjectPage = 1; // Reset to first page after deletion
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        await fetchProjects(currentProjectPage, projectsPerPage, searchInput.value, activeFilter);
        renderProjects(projects);
        renderProjectPagination();
        
        showNotification('پروژه با موفقیت حذف شد');
    } catch (error) {
        console.error("Error deleting project:", error);
        showNotification('خطا در حذف پروژه', 'error');
    }
}

// Render News Pagination
function renderNewsPagination() {
    newsPaginationContainer.innerHTML = '';
    if (totalNewsPages <= 1) return;

    const ul = document.createElement('ul');
    ul.className = 'pagination';

    for (let i = 1; i <= totalNewsPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentNewsPage ? 'active' : ''}`;
        li.innerHTML = `<a href="#" class="page-link" data-page="${i}">${i}</a>`;
        li.addEventListener('click', async (e) => {
            e.preventDefault();
            currentNewsPage = parseInt(e.target.dataset.page);
            await fetchNews(currentNewsPage, newsPerPage);
            renderNews(news);
            renderNewsPagination();
        });
        ul.appendChild(li);
    }
    newsPaginationContainer.appendChild(ul);
}

function openAdminPanel() {
    adminModal.classList.add('active');
    adminActionsContainer.style.display = 'flex';
    projectForm.style.display = 'none';
    newsForm.style.display = 'none';
}

window.showProjectForm = function() {
    adminActionsContainer.style.display = 'none';
    projectForm.style.display = 'block';
    newsForm.style.display = 'none';
    document.getElementById('modal-title').textContent = 'ثبت پروژه جدید';
    // Reset project form fields
    document.getElementById('project-id').value = '';
    document.getElementById('project-title').value = '';
    document.getElementById('project-desc').value = '';
    document.getElementById('project-status').value = 'in-progress';
    document.getElementById('project-image').value = ''; 
    fileBtnText.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> انتخاب تصویر';
    fileBtnText.style.color = 'var(--text-muted)';
}

window.showNewsForm = function() {
    adminActionsContainer.style.display = 'none';
    projectForm.style.display = 'none';
    newsForm.style.display = 'block';
    document.getElementById('news-modal-title').textContent = 'ثبت خبر جدید';
    document.getElementById('news-modal-title').style.display = 'block';
    // Reset news form fields
    document.getElementById('news-id').value = '';
    document.getElementById('news-title').value = '';
    document.getElementById('news-content').value = '';
    document.getElementById('news-image').value = '';
    newsFileBtnText.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> انتخاب تصویر';
    newsFileBtnText.style.color = 'var(--text-muted)';
}

// Form Submission
projectForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('project-id').value;
    const title = document.getElementById('project-title').value;
    const desc = tinymce.get('project-desc').getContent(); // Get content from TinyMCE
    const status = document.getElementById('project-status').value;
    const imageInput = document.getElementById('project-image');
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('desc', desc);
    formData.append('status', status);
    if (id) {
        formData.append('id', id);
    }
    if (imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    await saveProjectData(id, formData);
});

async function saveProjectData(id, formData) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/projects/${id}` : '/api/projects';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            },
            body: formData // FormData will automatically set Content-Type: multipart/form-data
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedProjects = await response.json();
        projects = cleanImageUrls(updatedProjects); // Update local projects array

        adminModal.classList.remove('active');
        
        currentProjectPage = 1; // Reset to first page after saving a project
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        await fetchProjects(currentProjectPage, projectsPerPage, searchInput.value, activeFilter);
        renderProjects(projects);
        renderProjectPagination();
        
        showNotification('پروژه با موفقیت ذخیره شد');
    } catch (error) {
        console.error("Error saving project:", error);
        showNotification('خطا در ذخیره پروژه', 'error');
    }
}

newsForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('news-id').value;
    const title = document.getElementById('news-title').value;
    const content = tinymce.get('news-content').getContent(); // Get content from TinyMCE
    const imageInput = document.getElementById('news-image');
    
    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    if (id) {
        formData.append('id', id);
    }
    if (imageInput.files && imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    await saveNewsData(id, formData);
});

async function saveNewsData(id, formData) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    const method = id ? 'PUT' : 'POST';
    const url = id ? `/api/news/${id}` : '/api/news';

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            },
            body: formData // FormData will automatically set Content-Type: multipart/form-data
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedNews = await response.json();
        news = cleanImageUrls(updatedNews); // Update local news array

        adminModal.classList.remove('active');
        
        await fetchNews(currentNewsPage, newsPerPage, searchInput.value);
        renderNews(news);
        renderNewsPagination();
        
        showNotification('خبر با موفقیت ذخیره شد');
    } catch (error) {
        console.error("Error saving news:", error);
        showNotification('خطا در ذخیره خبر', 'error');
    }
}

// Search & Filter Logic
searchInput.addEventListener('input', (e) => {
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    filterProjects(e.target.value, activeFilter);
    fetchNews(currentNewsPage, newsPerPage, e.target.value).then(() => {
        renderNews(news);
        renderNewsPagination();
    });
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelector('.filter-btn.active').classList.remove('active');
        btn.classList.add('active');
        filterProjects(searchInput.value, btn.dataset.filter);
        // Ensure news is also updated with the current search term for consistency
        fetchNews(currentNewsPage, newsPerPage, searchInput.value).then(() => {
            renderNews(news);
            renderNewsPagination();
        });
    });
});

function filterProjects(searchTerm = '', statusFilter = 'all') {
    currentProjectPage = 1; // Reset to first page on new filter
    fetchProjects(currentProjectPage, projectsPerPage, searchTerm, statusFilter).then(() => {
        renderProjects(projects);
        renderProjectPagination();
    });
}

// Helper function to validate URL
function isValidUrl(string) {
    try {
        new URL(string);
        return true;
    } catch (e) {
        return false;
    }
}

// Delete Project
window.deleteProject = async function(id) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (!confirm('آیا از حذف این پروژه اطمینان دارید؟')) {
        return;
    }

    try {
        const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const updatedProjects = await response.json();
        projects = cleanImageUrls(updatedProjects); // Update local projects array

        // Re-render projects and pagination
        currentProjectPage = 1; // Reset to first page after deletion
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        await fetchProjects(currentProjectPage, projectsPerPage, searchInput.value, activeFilter);
        renderProjects(projects);
        renderProjectPagination();
        
        showNotification('پروژه با موفقیت حذف شد');
    } catch (error) {
        console.error("Error deleting project:", error);
        showNotification('خطا در حذف پروژه', 'error');
    }
}

// Render Projects
async function renderProjects(projectsList) {
    projectsGrid.innerHTML = projectsList.map(project => {
        const statusLabels = {
            'completed': '<i class="fa-solid fa-check"></i> تکمیل شده',
            'in-progress': '<i class="fa-solid fa-hammer"></i> در حال ساخت',
            'cancelled': '<i class="fa-solid fa-ban"></i> لغو شده'
        };

        const statusClass = `status-${project.status}`;

        let adminControls = '';
        if (isAdmin) {
            adminControls = `
                <div class="admin-controls">
                    <button class="edit-btn" onclick="editProject(${project.id})"><i class="fa-solid fa-edit"></i></button>
                    <button class="delete-btn" data-id="${project.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        }
        
        const imageUrl = isValidUrl(project.image) ? project.image : 'https://images.unsplash.com/photo-1542751371-adc38448a05e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80';

        return `
            <div class="card" data-aos="fade-up">
                <div class="card-img-wrapper">
                    <img src="${imageUrl}" alt="${project.title}" class="card-img">
                    <div class="card-overlay"></div>
                </div>
                <div class="card-body">
                    <h3>${project.title}</h3>
                    <span class="status-badge ${statusClass}">${statusLabels[project.status]}</span>
                    <div class="card-desc">${project.desc}</div>
                    ${adminControls}
                </div>
            </div>
        `;
    }).join('');

    // Add event listeners for delete buttons after rendering
    document.querySelectorAll('.card .delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteProject(id);
        });
    });
}

// Edit Project
window.editProject = function(id) {
    const project = projects.find(p => p.id === id);
    if (project) {
        showProjectForm(); // Reset form and show it
        document.getElementById('modal-title').textContent = 'ویرایش پروژه';
        document.getElementById('project-id').value = project.id;
        document.getElementById('project-title').value = project.title;
        document.getElementById('project-desc').value = project.desc;
        document.getElementById('project-status').value = project.status;
        // For image, we don't pre-fill file input for security reasons
        // We can show current image if needed, but not set the input value
        fileBtnText.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> انتخاب تصویر (تصویر فعلی حفظ می‌شود)';
        fileBtnText.style.color = 'var(--text-muted)';
        adminModal.classList.add('active');
    }
};

// Delete Project
window.deleteProject = async function(id) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (!confirm('آیا از حذف این پروژه اطمینان دارید؟')) return;

    try {
        const response = await fetch(`/api/projects/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        await fetchProjects(currentProjectPage, projectsPerPage, searchInput.value, activeFilter);
        renderProjects(projects);
        renderProjectPagination();

        showNotification('پروژه با موفقیت حذف شد');
    } catch (error) {
        console.error("Error deleting project:", error);
        showNotification('خطا در حذف پروژه', 'error');
    }
};

// Edit News
window.editNews = function(id) {
    const newsItem = news.find(n => n.id === id);
    if (newsItem) {
        showNewsForm();
        document.getElementById('news-modal-title').textContent = 'ویرایش خبر';
        document.getElementById('news-id').value = newsItem.id;
        document.getElementById('news-title').value = newsItem.title;
        tinymce.get('news-content').setContent(newsItem.content);
        newsFileBtnText.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> انتخاب تصویر (تصویر فعلی حفظ می‌شود)';
        newsFileBtnText.style.color = 'var(--text-muted)';
        adminModal.classList.add('active');
    }
};



// Render News
function renderNews(newsList) {
    if (newsList.length === 0) {
        newsGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">
                <i class="fa-solid fa-newspaper" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
                <p>خبری یافت نشد.</p>
            </div>
        `;
        return;
    }

    newsGrid.innerHTML = newsList.map(item => {
        let adminControls = '';
        if (isAdmin) {
            adminControls = `
                <div class="admin-controls">
                    <button class="edit-btn" data-id="${item.id}"><i class="fa-solid fa-edit"></i></button>
                    <button class="delete-btn" data-id="${item.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
        }
        const imageUrl = isValidUrl(item.image) ? item.image : DEFAULT_IMAGE_URL;
        const date = new Date(item.createdAt);
        const formattedDate = isNaN(date.getTime()) ? 'تاریخ نامعتبر' : date.toLocaleDateString('fa-IR', { year: 'numeric', month: 'long', day: 'numeric' });
        return `
            <div class="news-card" data-aos="fade-up">
                <a href="news-detail.html?id=${item.id}" class="news-card-link">
                    <img src="${imageUrl}" alt="${item.title}" class="news-card-image">
                    <div class="news-card-content">
                        <h3 class="news-card-title">${item.title}</h3>
                        <div class="news-card-meta">
                            <span class="news-card-date"><i class="fa-regular fa-calendar-days"></i> ${formattedDate}</span>
                            <span class="news-card-likes"><i class="fa-solid fa-thumbs-up"></i> ${item.likes || 0}</span>
                            <span class="news-card-dislikes"><i class="fa-solid fa-thumbs-down"></i> ${item.dislikes || 0}</span>
                        </div>
                        <p class="news-card-description">${item.content.substring(0, 150)}...</p>
                    </div>
                </a>
                <div class="news-card-actions">
                    <a href="news-detail.html?id=${item.id}#comments" class="news-card-comments-link"><i class="fa-solid fa-comments"></i> نظرات</a>
                </div>
                ${adminControls}
            </div>
        `;
    }).join('');

    // Add event listeners for delete buttons after rendering
    document.querySelectorAll('.news-card .delete-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteNews(id);
        });
    });

    // Add event listeners for edit buttons after rendering
    document.querySelectorAll('.news-card .edit-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            editNews(id);
        });
    });
}

// Edit News
window.editNews = function(id) {
    const newsItem = news.find(n => n.id === id);
    if (newsItem) {
        showNewsForm(); // Reset form and show it
        document.getElementById('news-modal-title').textContent = 'ویرایش خبر';
        document.getElementById('news-id').value = newsItem.id;
        document.getElementById('news-title').value = newsItem.title;
        document.getElementById('news-content').value = newsItem.content;
        // For image, we don't pre-fill file input for security reasons
        newsFileBtnText.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> انتخاب تصویر (تصویر فعلی حفظ می‌شود)';
        newsFileBtnText.style.color = 'var(--text-muted)';
        adminModal.classList.add('active');
    }
};

// Delete News
window.deleteNews = async function(id) {
    const jwtToken = sessionStorage.getItem('vigigames_jwt');
    if (!confirm('آیا از حذف این خبر اطمینان دارید؟')) return;

    try {
        const response = await fetch(`/api/news/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': jwtToken ? `Bearer ${jwtToken}` : ''
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        await fetchNews(currentNewsPage, newsPerPage, searchInput.value);
        renderNews(news);
        renderNewsPagination();

        showNotification('خبر با موفقیت حذف شد');
    } catch (error) {
        console.error("Error deleting news:", error);
        showNotification('خطا در حذف خبر', 'error');
    }
};

// Edit Project
window.editProject = function(id) {
    const project = projects.find(p => p.id == id);
    if (!project) return;

    document.getElementById('project-id').value = project.id;
    document.getElementById('project-title').value = project.title;
    document.getElementById('project-desc').value = project.desc;
    document.getElementById('project-status').value = project.status;
    document.getElementById('modal-title').textContent = 'ویرایش پروژه';
    
    // Reset file input visual
    fileBtnText.innerHTML = '<i class="fa-solid fa-image"></i> تصویر فعلی حفظ می‌شود';
    fileBtnText.style.color = 'var(--text-muted)';
    
    adminModal.classList.add('active');
}

// Edit News
window.editNews = function(id) {
    const newsItem = news.find(n => n.id == id);
    if (!newsItem) return;

    document.getElementById('news-id').value = newsItem.id;
    document.getElementById('news-title').value = newsItem.title;
    document.getElementById('news-content').value = newsItem.content;
    document.getElementById('news-modal-title').textContent = 'ویرایش خبر';
    document.getElementById('news-modal-title').style.display = 'block';
    
    newsFileBtnText.innerHTML = '<i class="fa-solid fa-image"></i> تصویر فعلی حفظ می‌شود';
    newsFileBtnText.style.color = 'var(--text-muted)';
    
    adminModal.classList.add('active');
}



// Notification
function showNotification(msg, type = 'success') {
    notification.innerHTML = msg;
    if (type === 'error') {
        notification.style.borderRightColor = 'var(--danger)';
        notification.style.color = '#ffcccc';
    } else {
        notification.style.borderRightColor = 'var(--success)';
        notification.style.color = 'white';
    }
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Scroll To Top Logic
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollTopBtn.classList.add('visible');
    } else {
        scrollTopBtn.classList.remove('visible');
    }
});

scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
});

// Animations (Typed.js & Counting)
function initAnimations() {
    // Typed.js
    if (document.getElementById('typing-text')) {
        new Typed('#typing-text', {
            strings: [
                'مرجع حرفه‌ای‌ترین پروژه‌های بازی‌سازی وب',
                'تکنولوژی‌های مدرن برای بازی‌های عالی',
                'تجربه کاربری بی‌نظیر و انیمیشن‌های جذاب',
                'طراحی شده با عشق برای گیمرها'
            ],
            typeSpeed: 40,
            backSpeed: 20,
            backDelay: 2000,
            loop: true,
            showCursor: true,
            cursorChar: '|'
        });
    }

    // Initialize stat counters
    const statCounters = document.querySelectorAll('.stat-number');

    // Visitor counter logic
    const VISITOR_KEY = 'vigigames_total_visitors';
    const LAST_VISIT_KEY = 'vigigames_last_visit_timestamp';

    // No longer calling initializeVisitorCounter here, it's called in DOMContentLoaded


    statCounters.forEach(counter => {
        const target = +counter.getAttribute('data-target');
        const updateCount = () => {
            const count = +counter.innerText;
            const increment = target / 200;

            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(updateCount, 1);
            } else {
                counter.innerText = target;
            }
        };
        updateCount();
    });
}

function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Particle Background Animation
function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // Set canvas style to absolute to overlay correctly
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    
    container.appendChild(canvas);
    
    let width, height;
    let particles = [];
    
    function resize() {
        width = canvas.width = container.offsetWidth;
        height = canvas.height = container.offsetHeight;
    }
    
    window.addEventListener('resize', resize);
    resize();
    
    class Particle {
        constructor() {
            this.x = Math.random() * width;
            this.y = Math.random() * height;
            this.vx = (Math.random() - 0.5) * 0.5;
            this.vy = (Math.random() - 0.5) * 0.5;
            this.size = Math.random() * 2;
            
            const rand = Math.random();
            if (rand < 0.33) {
                this.color = 'rgba(255, 0, 60, '; // Red
            } else if (rand < 0.66) {
                this.color = 'rgba(0, 243, 255, '; // Cyan
            } else {
                this.color = 'rgba(57, 255, 20, '; // Green
            }
            
            this.opacity = Math.random() * 0.5 + 0.1;
        }
        
        update() {
            this.x += this.vx;
            this.y += this.vy;
            
            if (this.x < 0) this.x = width;
            if (this.x > width) this.x = 0;
            if (this.y < 0) this.y = height;
            if (this.y > height) this.y = 0;
        }
        
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fillStyle = this.color + this.opacity + ')';
            ctx.fill();
        }
    }
    
    for (let i = 0; i < 50; i++) {
        particles.push(new Particle());
    }
    
    function animate() {
        ctx.clearRect(0, 0, width, height);
        particles.forEach(p => {
            p.update();
            p.draw();
        });
        requestAnimationFrame(animate);
    }
    
    animate();
}

// 3D Tilt Effect
function initTiltForStaticElements() {
    const cards = document.querySelectorAll('.feature-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);
    });
}

function handleTilt(e) {
    const card = e.currentTarget;
    const cardRect = card.getBoundingClientRect();
    const centerX = cardRect.left + cardRect.width / 2;
    const centerY = cardRect.top + cardRect.height / 2;
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    const rotateX = (mouseY / (cardRect.height / 2)) * -10;
    const rotateY = (mouseX / (cardRect.width / 2)) * 10;
    
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
}

function resetTilt(e) {
    const card = e.currentTarget;
    card.style.transform = `perspective(1000px) rotateX(0) rotateY(0) scale(1)`;
}

// Contact Form Submission
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const subject = document.getElementById('contact-subject').value;
        const message = document.getElementById('contact-message').value;

        try {
            const response = await fetch('/api/contact', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, subject, message })
            });

            if (response.ok) {
                showNotification('پیام شما با موفقیت ارسال شد!', 'success');
                contactForm.reset(); // Clear the form
            } else {
                const errorData = await response.json();
                showNotification(errorData.message || 'خطا در ارسال پیام', 'error');
            }
        } catch (error) {
            console.error('Error submitting contact form:', error);
            showNotification('خطا در برقراری ارتباط با سرور', 'error');
        }
    });
}