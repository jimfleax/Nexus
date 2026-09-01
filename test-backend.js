const http = require('http');

const req = http.request('http://localhost:8080/api/resources/6a94904eb99f24c84405a890/file', {
  method: 'GET',
}, (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', JSON.stringify(res.headers, null, 2));
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});
req.end();
