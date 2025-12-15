const app = require('../../backend/server');

exports.handler = async (event, context) => {
  // Create a mock response object for Express
  const res = {
    statusCode: 200,
    headers: {},
    body: '',
    end: function(body) {
      this.body = body;
      return {
        statusCode: this.statusCode,
        headers: this.headers,
        body: this.body,
      };
    },
    status: function(code) {
      this.statusCode = code;
      return this;
    },
    send: function(body) {
      return this.end(body);
    },
    json: function(body) {
      this.headers['Content-Type'] = 'application/json';
      return this.end(JSON.stringify(body));
    },
    setHeader: function(key, value) {
      this.headers[key] = value;
    },
  };

  // Create a mock request object for Express
  const req = {
    method: event.httpMethod,
    url: event.path.replace('/.netlify/functions/api', ''), // Adjust URL for Express routing
    headers: event.headers,
    body: event.body,
    // Add other properties as needed by your Express app
  };

  // Call the Express app
  // This assumes your Express app is a function that takes (req, res) and handles it.
  // If your Express app is an instance (e.g., const app = express();), this needs adjustment.
  await app(req, res);

  return res.end();
};