# از یک ایمیج پایه Node.js استفاده می‌کنیم
FROM node:18-alpine

# دایرکتوری کاری را در کانتینر تنظیم می‌کنیم
WORKDIR /app

# فایل‌های package.json و package-lock.json را کپی می‌کنیم
COPY package*.json ./

# وابستگی‌های پروژه را نصب می‌کنیم
RUN npm install

# بقیه کدهای برنامه را کپی می‌کنیم
COPY . .

# پورت مورد استفاده برنامه را مشخص می‌کنیم
EXPOSE 3000

# دستور اجرای برنامه را تعریف می‌کنیم
CMD [ "node", "server.js" ]