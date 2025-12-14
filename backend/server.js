const express = require("express");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const mongoose = require('mongoose');

// Replace with your MongoDB Atlas connection string
const DB_CONNECTION_STRING = process.env.DB_CONNECTION_STRING;

mongoose.connect(DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas'))
.catch(err => console.error('Error connecting to MongoDB Atlas:', err));

const JWT_SECRET = process.env.JWT_SECRET;

const projectSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['completed', 'in-progress', 'cancelled'], default: 'in-progress' },
    link: { type: String },
    github: { type: String },
    tags: [{ type: String }]
});

const Project = mongoose.model('Project', projectSchema);

const newsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    image: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    comments: [{
        author: { type: String, required: true },
        text: { type: String, required: true },
        approved: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now }
    }],
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 }
});

const News = mongoose.model('News', newsSchema);

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: "vigigames2@gmail.com",
        pass: "idfs zedu ppzw pnav",
    },
});

const app = express();

// Stored hashed password
const ADMIN_PASSWORD_HASH =
    "2f6a74f14825e59f858c5fcf40e68d2a8fa83532a1cda7e02e54fcb606d40cbe";

async function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const hash = crypto.createHash("sha256");
        hash.update(password);
        resolve(hash.digest("hex"));
    });
}

app.use(express.json());
app.use(
    cors({
        origin: true,
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    }),
);

const authenticateJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(" ")[1];
        console.log("Auth Header:", authHeader);
        console.log("Token:", token);

        jwt.verify(token, "mysecretkey", (err, user) => {
            console.log("JWT_SECRET used for verification:", JWT_SECRET);
            if (err) {
                console.error("JWT Verification Error:", err);
                return res.sendStatus(403);
            }
            req.user = user;
            next();
        });
    } else {
        res.sendStatus(401);
    }
};

app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tiny.cloud https://unpkg.com https://cdnjs.cloudflare.com https://sp.tinymce.com; connect-src 'self' https://astonishing-pothos-d4a0f1.netlify.app https://cdn.tiny.cloud https://sp.tinymce.com https://cdnjs.cloudflare.com; img-src 'self' data: https://cdn.tiny.cloud https://raw.githubusercontent.com https://images.unsplash.com https://sp.tinymce.com",
    );
    next();
});

app.use(express.static(path.join(__dirname, "..")));

// API routes for Projects
app.get("/api/projects", async (req, res) => {
    try {
        const searchTerm = req.query.searchTerm
            ? req.query.searchTerm.toLowerCase()
            : "";
        const statusFilter = req.query.statusFilter || "";

        let query = {};
        if (searchTerm) {
            query.$or = [
                { title: { $regex: searchTerm, $options: "i" } },
                { description: { $regex: searchTerm, $options: "i" } },
            ];
        }
        if (statusFilter && statusFilter !== "all") {
            query.status = statusFilter;
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalItems = await Project.countDocuments(query);
        const projects = await Project.find(query)
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            totalItems,
            totalPages,
            currentPage: page,
            items: projects,
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).send("Error fetching projects data");
    }
});

app.post(
    "/api/projects",
    authenticateJWT,
    async (req, res) => {
        try {
            const newProject = new Project(req.body);
            await newProject.save();
            res.status(201).json(newProject);
        } catch (error) {
            console.error("Error creating project:", error);
            res.status(500).send("Error creating project");
        }
    },
);

app.put(
    "/api/projects/:id",
    authenticateJWT,
    async (req, res) => {
        try {
            const projectId = req.params.id;
            const updatedProject = await Project.findByIdAndUpdate(projectId, req.body, { new: true });
            if (!updatedProject) {
                return res.status(404).send("Project not found");
            }
            res.json(updatedProject);
        } catch (error) {
            console.error("Error updating project:", error);
            res.status(500).send("Error updating project");
        }
    },
);

app.delete("/api/projects/:id", authenticateJWT, async (req, res) => {
    try {
        const projectId = req.params.id;
        const deletedProject = await Project.findByIdAndDelete(projectId);
        if (!deletedProject) {
            return res.status(404).send("Project not found");
        }
        res.status(200).json({ message: "Project deleted successfully" });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).send("Error deleting project");
    }
});

// API routes for News
app.get("/api/news", async (req, res) => {
    try {
        const searchTerm = req.query.searchTerm
            ? req.query.searchTerm.toLowerCase()
            : "";

        let query = {};
        if (searchTerm) {
            query.$or = [
                { title: { $regex: searchTerm, $options: "i" } },
                { content: { $regex: searchTerm, $options: "i" } },
            ];
        }

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const totalItems = await News.countDocuments(query);
        const news = await News.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalPages = Math.ceil(totalItems / limit);

        res.json({
            totalItems,
            totalPages,
            currentPage: page,
            items: news,
        });
    } catch (error) {
        console.error("Error fetching news:", error);
        res.status(500).send("Error fetching news data");
    }
});

app.get("/api/news/:id", async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return res.status(404).send("News not found");
        }
        res.json(newsItem);
    } catch (error) {
        console.error("Error fetching news item:", error);
        res.status(500).send("Error fetching news item");
    }
});

app.get("/api/stats", async (req, res) => {
    try {
        const completedProjects = await Project.countDocuments({ status: "completed" });
        const inProgressProjects = await Project.countDocuments({ status: "in-progress" });
        const cancelledProjects = await Project.countDocuments({ status: "cancelled" });
        const totalNews = await News.countDocuments();

        res.json({
            completedProjects,
            inProgressProjects,
            cancelledProjects,
            totalNews,
        });
    } catch (error) {
        console.error("Error fetching stats:", error);
        res.status(500).send("Error fetching stats data");
    }
});

app.post("/api/news", authenticateJWT, async (req, res) => {
    try {
        const newNews = new News({
            ...req.body,
            createdAt: new Date().toISOString(),
        });
        await newNews.save();
        res.status(201).json(newNews);
    } catch (error) {
        console.error("Error creating news:", error);
        res.status(500).send("Error creating news");
    }
});

app.put(
    "/api/news/:id",
    authenticateJWT,
    async (req, res) => {
        try {
            const newsId = req.params.id;
            const updatedNews = await News.findByIdAndUpdate(newsId, req.body, { new: true });
            if (!updatedNews) {
                return res.status(404).send("News not found");
            }
            res.json(updatedNews);
        } catch (error) {
            console.error("Error updating news:", error);
            res.status(500).send("Error updating news");
        }
    },
);

// API route for liking a news item
app.post("/api/news/:id/like", async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return res.status(404).send("News not found");
        }
        newsItem.likes = (newsItem.likes || 0) + 1;
        await newsItem.save();
        res.status(200).json({
            success: true,
            message: "خبر لایک شد.",
            likes: newsItem.likes,
        });
    } catch (error) {
        console.error("Error liking news item:", error);
        res.status(500).send("Error liking news item");
    }
});

// API route for disliking a news item
app.post("/api/news/:id/dislike", async (req, res) => {
    try {
        const newsId = req.params.id;
        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return res.status(404).send("News not found");
        }
        newsItem.dislikes = (newsItem.dislikes || 0) + 1;
        await newsItem.save();
        res.status(200).json({
            success: true,
            message: "خبر دیس‌لایک شد.",
            dislikes: newsItem.dislikes,
        });
    } catch (error) {
        console.error("Error disliking news item:", error);
        res.status(500).send("Error disliking news item");
    }
});

// API route for approving/rejecting a comment
app.put(
    "/api/news/:newsId/comments/:commentId/approve",
    authenticateJWT,
    async (req, res) => {
        const newsId = req.params.newsId;
        const commentId = req.params.commentId;
        const { approved } = req.body;

        if (typeof approved !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "وضعیت تایید (approved) باید بولی باشد.",
            });
        }

        try {
            const newsItem = await News.findById(newsId);
            if (!newsItem) {
                return res.status(404).json({ success: false, message: "خبر یافت نشد." });
            }

            const comment = newsItem.comments.id(commentId);
            if (!comment) {
                return res.status(404).json({ success: false, message: "کامنت یافت نشد." });
            }

            comment.approved = approved;
            await newsItem.save();
            res.status(200).json({ success: true, message: "وضعیت کامنت با موفقیت به‌روزرسانی شد." });
        } catch (error) {
            console.error("Error updating comment approval status:", error);
            res.status(500).json({ success: false, message: "خطا در به‌روزرسانی وضعیت کامنت." });
        }
    },
);

app.delete("/api/news/:id", authenticateJWT, async (req, res) => {
    try {
        const newsId = req.params.id;
        const deletedNews = await News.findByIdAndDelete(newsId);
        if (!deletedNews) {
            return res.status(404).send("News not found");
        }
        res.status(200).json({ message: "News deleted successfully" });
    } catch (error) {
        console.error("Error deleting news:", error);
        res.status(500).send("Error deleting news");
    }
});

// API route for adding comments to a news item
app.post("/api/news/:id/comments", async (req, res) => {
    console.log(
        "Received comment submission for news ID:",
        req.params.id,
        "with body:",
        req.body,
    );
    const newsId = req.params.id;
    const { author, text } = req.body;

    if (!author || !text) {
        return res.status(400).json({
            success: false,
            message: "نام نویسنده و متن کامنت الزامی است.",
        });
    }

    try {
        const newsItem = await News.findById(newsId);
        if (!newsItem) {
            return res.status(404).send("News not found");
        }

        const newComment = {
            author,
            text,
            createdAt: new Date().toISOString(),
            approved: false, // Comments need admin approval
        };
        newsItem.comments.push(newComment);
        await newsItem.save();

        res.status(201).json({
            success: true,
            message:
                "کامنت شما با موفقیت ثبت شد و پس از تایید نمایش داده خواهد شد.",
            comment: newComment,
        });
    } catch (error) {
        console.error("Error adding comment:", error);
        res.status(500).send("Error saving comment");
    }
});

// Admin Login Route
app.post("/api/login", async (req, res) => {
    const { password } = req.body;

    if (!password) {
        return res
            .status(400)
            .json({ success: false, message: "رمز عبور الزامی است." });
    }

    const hashedPassword = await hashPassword(password);

    if (hashedPassword === ADMIN_PASSWORD_HASH) {
        // In a real application, you would issue a JWT or set a session cookie here
        console.log("JWT_SECRET used for signing:", JWT_SECRET);
        const token = jwt.sign({ isAdmin: true }, JWT_SECRET);
        res.json({ success: true, message: "ورود موفقیت‌آمیز.", token });
    } else {
        res.status(401).json({
            success: false,
            message: "رمز عبور نامعتبر است.",
        });
    }
});

// API route for Contact Form Submissions
app.post("/api/contact", async (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: "لطفاً تمام فیلدهای فرم را پر کنید.",
        });
    }

    try {
        const mailOptions = {
            from: email, // Sender's email
            to: "vigigames2@gmail.com", // Recipient's email
            subject: `پیام جدید از فرم تماس: ${subject}`,
            html: `
                <p><b>نام:</b> ${name}</p>
                <p><b>ایمیل:</b> ${email}</p>
                <p><b>موضوع:</b> ${subject}</p>
                <p><b>پیام:</b></p>
                <p>${message}</p>
            `,
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({
            success: true,
            message: "پیام شما با موفقیت ارسال شد.",
        });
    } catch (error) {
        console.error("Error sending contact email:", error);
        res.status(500).json({
            success: false,
            message: "خطا در ارسال پیام. لطفاً بعداً دوباره امتحان کنید.",
        });
    }
});

module.exports = app;
