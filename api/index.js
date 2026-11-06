// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json)
// and handled by the FuelLab Express app. The web app is served as static files.
const { buildApp } = require('../fuellab-server/dist/index.js');

module.exports = buildApp();
