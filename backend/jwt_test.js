const jwt = require('jsonwebtoken');

const secret = 'mysecretkey';
const payload = { isAdmin: true };

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc0FkbWluIjp0cnVlLCJpYXQiOjE3NjU1Nzc1MTIsImV4cCI6MTc2NTU4MTExMn0.SABB9UDiuFcs5KLP0ZR_Yn8q00i2YzZXMFKy4sij';
console.log("Generated Token:", token);

jwt.verify(token, secret, (err, user) => {
    if (err) {
        console.error("Verification Error:", err);
    } else {
        console.log("Verified User:", user);
    }
});

// Test with a slightly different secret
const wrongSecret = 'wrongsecretkey';
jwt.verify(token, wrongSecret, (err, user) => {
    if (err) {
        console.error("Verification Error with wrong secret:", err);
    } else {
        console.log("Verified User with wrong secret:", user);
    }
});