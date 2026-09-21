const mongoose = require('mongoose');

const uri = "mongodb://tabraizsmd_db_user:M3EcmHNdVHln8Utf@ac-qjeax1t-shard-00-00.31mtvlo.mongodb.net:27017,ac-qjeax1t-shard-00-01.31mtvlo.mongodb.net:27017,ac-qjeax1t-shard-00-02.31mtvlo.mongodb.net:27017/My-Platform?ssl=true&replicaSet=atlas-kcsha4-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0";

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
