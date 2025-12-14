const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const multer = require('multer'); // Add multer
const crypto = require('crypto'); // Add crypto for password hashing
const jwt = require('jsonwebtoken'); // Add jsonwebtoken for JWT
const nodemailer = require('nodemailer'); // Add nodemailer for email sending

const JWT_SECRET = 'mysecretkey';

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'vigigames2@gmail.com',
        pass: 'idfs zedu ppzw pnav'
    }
});

const app = express();
const PORT = 3000;

// Stored hashed password (replace with a strong, securely generated hash in a real application)
const ADMIN_PASSWORD_HASH = '2f6a74f14825e59f858c5fcf40e68d2a8fa83532a1cda7e02e54fcb606d40cbe'; // SHA-256 hash of 'Vigigames_S3cur3P@ss!'

// Helper function to hash password
async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash('sha256');
        hash.update(password);
        resolve(hash.digest('hex'));
    });
}

// Middleware to parse JSON bodies
app.use(express.json());
app.use(cors({
    origin: 'http://localhost:3000', // Allow requests from your frontend origin
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
})); // Enable CORS for all routes

// Middleware for JWT authentication
const authenticateJWT = (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (authHeader) {
            const token = authHeader.split(' ')[1];
            console.log('Auth Header:', authHeader);
            console.log('Token:', token);

            jwt.verify(token, 'mysecretkey', (err, user) => {
                console.log('JWT_SECRET used for verification:', JWT_SECRET);
                if (err) {
                console.error("JWT Verification Error:", err);
                return res.sendStatus(403); // Forbidden
            }
                req.user = user;
                next();
            });
        } else {
            res.sendStatus(401); // Unauthorized
        }
    };

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tiny.cloud https://unpkg.com https://cdnjs.cloudflare.com https://sp.tinymce.com; connect-src 'self' https://cdn.tiny.cloud https://*tinymce.com https://cdnjs.cloudflare.com; img-src 'self' data: https://cdn.tiny.cloud https://raw.githubusercontent.com https://images.unsplash.com https://sp.tinymce.com");
    next();
});

// Serve static files from the parent directory (your frontend)
app.use(express.static(path.join(__dirname, '..')));

// Create 'uploads' directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });

// Serve uploaded files
app.use('/uploads', express.static(uploadsDir));

// API routes for Projects
app.get('/api/projects', (req, res) => {
    const projectsFilePath = path.join(__dirname, '..', 'projects.json');
    fs.readFile(projectsFilePath, 'utf8', (err, data) => {
        console.log('Reading projects.json. Error:', err, 'Data length:', data ? data.length : 0);
        let projects = [];
        if (err) {
            if (err.code === 'ENOENT') {
                console.log("projects.json not found, returning empty array.");
            } else {
                console.error("Error reading projects.json:", err);
                return res.status(500).send('Error reading projects data');
            }
        } else {
            try {
                projects = JSON.parse(data);
                console.log('Projects after JSON.parse:', projects.length, 'items');
            } catch (parseError) {
                console.error("Error parsing projects.json:", parseError);
                return res.status(500).send('Error parsing projects data');
            }
        }

        const searchTerm = req.query.searchTerm ? req.query.searchTerm.toLowerCase() : '';
        const statusFilter = req.query.statusFilter || '';
        console.log('Search Term:', searchTerm, 'Status Filter:', statusFilter);

        let filteredProjects = projects.filter(project => {
            const matchesSearchTerm = searchTerm === '' ||
                (project.title && project.title.toLowerCase().includes(searchTerm)) ||
                (project.description && project.description.toLowerCase().includes(searchTerm));
            const matchesStatusFilter = statusFilter === 'all' || project.status === statusFilter;
            return matchesSearchTerm && matchesStatusFilter;
        });
        console.log('Filtered projects:', filteredProjects.length, 'items');

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit to 10 items per page
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};
        results.totalItems = filteredProjects.length;
        results.totalPages = Math.ceil(filteredProjects.length / limit);
        results.currentPage = page;
        results.items = filteredProjects.slice(startIndex, endIndex);
        console.log('Results sent to frontend:', results.items.length, 'items');

        res.json(results);
    });
});

app.post('/api/projects', authenticateJWT, upload.single('image'), (req, res) => {
    const projectsFilePath = path.join(__dirname, '..', 'projects.json');
    fs.readFile(projectsFilePath, 'utf8', (err, data) => {
        let projects = [];
        if (err) {
            if (err.code === 'ENOENT') {
                console.log("projects.json not found, initializing with empty array.");
            } else {
                console.error("Error reading projects.json:", err);
                return res.status(500).send('Error reading projects data');
            }
        } else {
            try {
                projects = JSON.parse(data);
            } catch (parseError) {
                console.error("Error parsing projects.json:", parseError);
                return res.status(500).send('Error parsing projects data');
            }
        }
        const newProject = { id: Date.now(), ...req.body };
        if (req.file) {
            newProject.image = '/uploads/' + req.file.filename;
        }
        projects.push(newProject);
        fs.writeFile(path.join(__dirname, '..', 'projects.json'), JSON.stringify(projects, null, 2), 'utf8', (err) => {
            if (err) {
                console.error("Error writing projects.json:", err);
                return res.status(500).send('Error saving project data');
            }
            res.status(201).json(projects);
        });
    });
});

app.put('/api/projects/:id', authenticateJWT, upload.single('image'), (req, res) => {
    const projectId = Number(req.params.id);
    const projectsFilePath = path.join(__dirname, '..', 'projects.json');
    fs.readFile(projectsFilePath, 'utf8', (err, data) => {
        let projects = [];
        if (err) {
            if (err.code === 'ENOENT') {
                console.log("projects.json not found for PUT, initializing with empty array.");
            } else {
                console.error("Error reading projects.json:", err);
                return res.status(500).send('Error reading projects data');
            }
        } else {
            try {
                projects = JSON.parse(data);
            } catch (parseError) {
                console.error("Error parsing projects.json:", parseError);
                return res.status(500).send('Error parsing projects data');
            }
        }
        const index = projects.findIndex(p => p.id === projectId);
        if (index !== -1) {
            const updatedProject = { ...projects[index], ...req.body, id: projectId };
            if (req.file) {
                updatedProject.image = '/uploads/' + req.file.filename;
            }
            projects[index] = updatedProject;
            fs.writeFile(path.join(__dirname, '..', 'projects.json'), JSON.stringify(projects, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing projects.json:", err);
                    return res.status(500).send('Error saving project data');
                }
                res.json(projects);
            });
        } else {
            res.status(404).send('Project not found');
        }
    });
});

app.delete('/api/projects/:id', authenticateJWT, (req, res) => {
    const projectId = Number(req.params.id);
    const projectsFilePath = path.join(__dirname, '..', 'projects.json');
    fs.readFile(projectsFilePath, 'utf8', (err, data) => {
        let projects = [];
        if (err) {
            if (err.code === 'ENOENT') {
                console.log("projects.json not found for DELETE, returning empty array.");
                return res.status(404).send('Project not found');
            } else {
                console.error("Error reading projects.json:", err);
                return res.status(500).send('Error reading projects data');
            }
        } else {
            try {
                projects = JSON.parse(data);
            } catch (parseError) {
                console.error("Error parsing projects.json:", parseError);
                return res.status(500).send('Error parsing projects data');
            }
        }
        const initialLength = projects.length;
        projects = projects.filter(p => p.id !== projectId);
        if (projects.length < initialLength) {
            fs.writeFile(path.join(__dirname, '..', 'projects.json'), JSON.stringify(projects, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing projects.json:", err);
                    return res.status(500).send('Error deleting project data');
                }
                res.status(200).json(projects);
            });
        } else {
            res.status(404).send('Project not found');
        }
    });
});

// API routes for News
app.get('/api/news', (req, res) => {
    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);

        const searchTerm = req.query.searchTerm ? req.query.searchTerm.toLowerCase() : '';

        let filteredNews = news.filter(item => {
            const matchesSearchTerm = searchTerm === '' ||
                item.title.toLowerCase().includes(searchTerm) ||
                item.content.toLowerCase().includes(searchTerm);
            return matchesSearchTerm;
        });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10; // Default limit to 10 items per page
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        const results = {};
        results.totalItems = filteredNews.length;
        results.totalPages = Math.ceil(filteredNews.length / limit);
        results.currentPage = page;
        results.items = filteredNews.slice(startIndex, endIndex);

        res.json(results);
    });
});

// API route for getting a single news item by ID
app.get('/api/news/:id', (req, res) => {
    const newsId = Number(req.params.id);
    const newsFilePath = path.join(__dirname, '..', 'news.json');
    fs.readFile(newsFilePath, 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        const news = JSON.parse(data);
        const newsItem = news.find(n => n.id === newsId);
        if (newsItem) {
            res.json(newsItem);
        } else {
            res.status(404).send('News not found');
        }
    });
});

// API for stats
app.get('/api/stats', (req, res) => {
    const projectsFilePath = path.join(__dirname, '..', 'projects.json');
    const newsFilePath = path.join(__dirname, '..', 'news.json');

    let stats = {
        completedProjects: 0,
        inProgressProjects: 0,
        cancelledProjects: 0,
        totalNews: 0
    };

    fs.readFile(projectsFilePath, 'utf8', (err, projectsData) => {
        let projects = [];
        if (!err && projectsData) {
            try {
                projects = JSON.parse(projectsData);
                stats.completedProjects = projects.filter(p => p.status === 'completed').length;
                stats.inProgressProjects = projects.filter(p => p.status === 'in-progress').length;
                stats.cancelledProjects = projects.filter(p => p.status === 'cancelled').length;
            } catch (parseError) {
                console.error("Error parsing projects.json for stats:", parseError);
            }
        }

        fs.readFile(newsFilePath, 'utf8', (err, newsData) => {
            let news = [];
            if (!err && newsData) {
                try {
                    news = JSON.parse(newsData);
                    stats.totalNews = news.length;
                } catch (parseError) {
                    console.error("Error parsing news.json for stats:", parseError);
                }
            }
            res.json(stats);
        });
    });
});

app.post('/api/news', authenticateJWT, upload.single('image'), (req, res) => {
    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        const news = JSON.parse(data);
        const newNews = { id: Date.now(), createdAt: new Date().toISOString(), comments: [], likes: 0, dislikes: 0, ...req.body };
        if (req.file) {
            newNews.image = '/uploads/' + req.file.filename;
        }
        news.push(newNews);
        fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
            if (err) {
                console.error("Error writing news.json:", err);
                return res.status(500).send('Error saving news data');
            }
            res.status(201).json(news);
        });
    });
});

app.put('/api/news/:id', authenticateJWT, upload.single('image'), (req, res) => {
    const newsId = Number(req.params.id);
    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);
        const index = news.findIndex(n => n.id === newsId);
        if (index !== -1) {
            const updatedNews = { ...news[index], ...req.body, id: newsId };
            if (req.file) {
                updatedNews.image = '/uploads/' + req.file.filename;
            }
            news[index] = updatedNews;
            fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing news.json:", err);
                    return res.status(500).send('Error saving news data');
                }
                res.json(news);
            });
        } else {
            res.status(404).send('News not found');
        }
    });
});

// API route for liking a news item
app.post('/api/news/:id/like', (req, res) => {
    const newsId = Number(req.params.id);

    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (newsIndex !== -1) {
            news[newsIndex].likes = (news[newsIndex].likes || 0) + 1;

            fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing news.json:", err);
                    return res.status(500).send('Error saving like');
                }
                res.status(200).json({ success: true, message: 'خبر لایک شد.', likes: news[newsIndex].likes });
            });
        } else {
            res.status(404).send('News not found');
        }
    });
});

// API route for disliking a news item
app.post('/api/news/:id/dislike', (req, res) => {
    const newsId = Number(req.params.id);

    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (newsIndex !== -1) {
            news[newsIndex].dislikes = (news[newsIndex].dislikes || 0) + 1;

            fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing news.json:", err);
                    return res.status(500).send('Error saving dislike');
                }
                res.status(200).json({ success: true, message: 'خبر دیس‌لایک شد.', dislikes: news[newsIndex].dislikes });
            });
        } else {
            res.status(404).send('News not found');
        }
    });
});

// API route for approving/rejecting a comment
app.put('/api/news/:newsId/comments/:commentId/approve', authenticateJWT, (req, res) => {
    const newsId = Number(req.params.newsId);
    const commentId = Number(req.params.commentId);
    const { approved } = req.body;

    if (typeof approved !== 'boolean') {
        return res.status(400).json({ success: false, message: 'وضعیت تایید (approved) باید بولی باشد.' });
    }

    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (newsIndex !== -1) {
            const commentIndex = news[newsIndex].comments.findIndex(c => c.id === commentId);

            if (commentIndex !== -1) {
                news[newsIndex].comments[commentIndex].approved = approved;

                fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
                    if (err) {
                        console.error("Error writing news.json:", err);
                        return res.status(500).send('Error updating comment status');
                    }
                    res.status(200).json({ success: true, message: 'وضعیت کامنت با موفقیت به‌روزرسانی شد.', comment: news[newsIndex].comments[commentIndex] });
                });
            } else {
                res.status(404).send('Comment not found');
            }
        } else {
            res.status(404).send('News not found');
        }
    });
});





app.delete('/api/news/:id', authenticateJWT, (req, res) => {
    const newsId = Number(req.params.id);
    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);
        const initialLength = news.length;
        news = news.filter(n => n.id !== newsId);
        if (news.length < initialLength) {
            console.log(`News item with ID ${newsId} deleted. Remaining news count: ${news.length}`);
            fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing news.json:", err);
                    return res.status(500).send('Error deleting news data');
                }
                res.status(200).json(news);
            });
        } else {
            res.status(404).send('News not found');
        }
    });
});

// API route for adding comments to a news item
app.post('/api/news/:id/comments', (req, res) => {
    console.log('Received comment submission for news ID:', req.params.id, 'with body:', req.body);
    const newsId = Number(req.params.id);
    const { author, text } = req.body;

    if (!author || !text) {
        return res.status(400).json({ success: false, message: 'نام نویسنده و متن کامنت الزامی است.' });
    }

    fs.readFile(path.join(__dirname, '..', 'news.json'), 'utf8', (err, data) => {
        if (err) {
            console.error("Error reading news.json:", err);
            return res.status(500).send('Error reading news data');
        }
        let news = JSON.parse(data);
        const newsIndex = news.findIndex(n => n.id === newsId);

        if (newsIndex !== -1) {
            const newComment = {
                id: Date.now(),
                author,
                text,
                date: new Date().toISOString(),
                approved: false, // Comments need admin approval
                likes: 0,
                dislikes: 0
            };
            news[newsIndex].comments.push(newComment);

// API route for contact form submission
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'لطفاً تمام فیلدهای فرم را پر کنید.' });
    }

    try {
        const mailOptions = {
            from: email, // Sender's email
            to: 'vigigames2@gmail.com', // Recipient's email
            subject: `پیام جدید از فرم تماس: ${subject}`,
            html: `
                <p><b>نام:</b> ${name}</p>
                <p><b>ایمیل:</b> ${email}</p>
                <p><b>موضوع:</b> ${subject}</p>
                <p><b>پیام:</b></p>
                <p>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'پیام شما با موفقیت ارسال شد.' });
    } catch (error) {
        console.error("Error sending contact email:", error);
        res.status(500).json({ success: false, message: 'خطا در ارسال پیام. لطفاً بعداً دوباره امتحان کنید.' });
    }
});

            fs.writeFile(path.join(__dirname, '..', 'news.json'), JSON.stringify(news, null, 2), 'utf8', (err) => {
                if (err) {
                    console.error("Error writing news.json:", err);
                    return res.status(500).send('Error saving comment');
                }
                res.status(201).json({ success: true, message: 'کامنت شما با موفقیت ثبت شد و پس از تایید نمایش داده خواهد شد.', comment: newComment });
            });
        } else {
            res.status(404).send('News not found');
        }
    });
});



// Admin Login Route
app.post('/api/login', async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ success: false, message: 'رمز عبور الزامی است.' });
    }

    const hashedPassword = await hashPassword(password);

    if (hashedPassword === ADMIN_PASSWORD_HASH) {
                // In a real application, you would issue a JWT or set a session cookie here
                console.log('JWT_SECRET used for signing:', JWT_SECRET);
                const token = jwt.sign({ isAdmin: true }, JWT_SECRET);
        res.json({ success: true, message: 'ورود موفقیت‌آمیز.', token });
    } else {
        res.status(401).json({ success: false, message: 'رمز عبور نامعتبر است.' });
    }
});

// API route for Contact Form Submissions
// API route for contact form submission
app.post('/api/contact', async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({ success: false, message: 'لطفاً تمام فیلدهای فرم را پر کنید.' });
    }

    try {
        const mailOptions = {
            from: email, // Sender's email
            to: 'vigigames2@gmail.com', // Recipient's email
            subject: `پیام جدید از فرم تماس: ${subject}`,
            html: `
                <p><b>نام:</b> ${name}</p>
                <p><b>ایمیل:</b> ${email}</p>
                <p><b>موضوع:</b> ${subject}</p>
                <p><b>پیام:</b></p>
                <p>${message}</p>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'پیام شما با موفقیت ارسال شد.' });
    } catch (error) {
        console.error("Error sending contact email:", error);
        res.status(500).json({ success: false, message: 'خطا در ارسال پیام. لطفاً بعداً دوباره امتحان کنید.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
