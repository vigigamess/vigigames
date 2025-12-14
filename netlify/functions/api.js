const server = require('../../backend/server'); // مسیر صحیح به فایل server.js شما
const serverless = require('serverless-http');

module.exports.handler = serverless(server);