const express = require("express");
const axios = require("axios");
const app = express();
const PORT = 8080;

app.use(express.json());


app.listen(PORT, () => console.log(`running on http://localhost:${PORT}`));
