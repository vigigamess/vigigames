# VIGIGAMES

A Persian gaming portfolio and news website built with Node.js/Express backend.

## Overview
This is a gaming portfolio site featuring:
- Projects showcase with filtering and pagination
- News section with comments, likes/dislikes
- Admin authentication with JWT
- Contact form with email notifications
- RTL (Right-to-Left) Persian language support

## Project Structure
- `backend/server.js` - Express server (serves static files + API)
- `index.html`, `style.css`, `script.js` - Frontend
- `news-detail.html`, `news-detail.js` - Individual news pages
- `projects.json`, `news.json` - Data storage (JSON files)
- `uploads/` - Uploaded images
- `images/` - Static images

## Tech Stack
- **Backend**: Node.js 20, Express 5
- **Auth**: JWT (jsonwebtoken)
- **File Upload**: Multer
- **Email**: Nodemailer (Gmail)
- **Frontend**: Vanilla JS, CSS, AOS animations, TinyMCE editor

## Running
The server runs on port 5000, serving both static files and API endpoints.

## API Endpoints
- `GET/POST/PUT/DELETE /api/projects` - Project CRUD
- `GET/POST/PUT/DELETE /api/news` - News CRUD
- `POST /api/login` - Admin authentication
- `POST /api/contact` - Contact form submission
- `GET /api/stats` - Dashboard statistics
