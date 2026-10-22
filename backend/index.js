require("dotenv").config({ path: require("node:path").join(__dirname, ".env") });
const { createApp } = require("./app");
const PORT = Number(process.env.PORT || 5000);
const app = createApp();
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
