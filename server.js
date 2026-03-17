require('dotenv').config();
const express = require('express');
const path = require('path');
const routes = require('./src/routes');
const { syncContainers } = require('./src/docker');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api', routes);

app.listen(PORT, async () => {
  console.log(`MakeADB running on port ${PORT}`);
  try {
    await syncContainers();
  } catch (e) {
    console.warn('Docker sync skipped:', e.message);
  }
});
