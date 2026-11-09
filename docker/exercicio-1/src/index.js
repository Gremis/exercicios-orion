const express = require('express');

const app = express();

app.get('/', (request, response) => {
  response.status(200).type('text/plain').send('Hello from Docker!');
});

app.listen(3000, '0.0.0.0');
