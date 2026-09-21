require('dotenv').config();
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Please set MONGODB_URI in .env");
  process.exit(1);
}

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected successfully");
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log("Users in DB:", users.map(u => ({ email: u.email, role: u.role })));
  } catch (err) {
    console.error("Connection failed:", err.message);
  } finally {
    await mongoose.disconnect();
  }
}
run();
