require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../src/models/User');
const Question = require('../src/models/Question');
const Submission = require('../src/models/Submission');
const { getIsConnected, inMemoryStore, saveLocalUsersBackup, connectDB } = require('../src/config/db');

// Essential accounts only (Clean environment, zero dummy problems/submissions)
const initialUsers = [
  {
    name: 'SMD Tabraiz (ADMIN)',
    teamName: 'Administration',
    email: 'tabraizsmd@gmail.com',
    password: 'Shamstabraiz@7931',
    role: 'admin'
  },
  {
    name: 'SMD Tabraiz (ADMIN)',
    teamName: 'Administration',
    email: 'admin@platform.com',
    password: 'Shamstabraiz@7931',
    role: 'admin'
  },
  {
    name: 'Student Participant',
    teamName: 'Coders Club Team 1',
    email: 'student@codearena.com',
    password: 'student123',
    role: 'student',
    score: 100,
    solvedCount: 1
  },
  {
    name: 'Student Participant',
    teamName: 'Coders Club Team 2',
    email: 'student@platform.com',
    password: 'student123',
    role: 'student',
    score: 0,
    solvedCount: 0
  }
];

const seedData = async () => {
  try {
    for (let i = 0; i < initialUsers.length; i++) {
      const u = initialUsers[i];
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(u.password, salt);
      const now = new Date();

      // 1. Always update local users backup
      saveLocalUsersBackup({
        _id: u.role === 'admin' ? ('admin_user_' + i) : ('student_user_' + i),
        name: u.name,
        teamName: u.teamName || u.name,
        email: u.email.toLowerCase(),
        password: hashedPassword,
        role: u.role,
        score: u.score || 0,
        solvedCount: u.solvedCount || 0,
        createdAt: now,
        lastLogin: now
      });

      // 2. If in-memory store is used
      let memExisting = (inMemoryStore.users || []).find(x => x.email.toLowerCase() === u.email.toLowerCase());
      if (!memExisting) {
        inMemoryStore.users.push({
          _id: u.role === 'admin' ? ('admin_user_' + i) : ('student_user_' + i),
          name: u.name,
          teamName: u.teamName || u.name,
          email: u.email.toLowerCase(),
          password: hashedPassword,
          role: u.role,
          score: u.score || 0,
          solvedCount: u.solvedCount || 0,
          createdAt: now,
          lastLogin: now
        });
      } else {
        memExisting.password = hashedPassword;
        memExisting.name = u.name;
        memExisting.role = u.role;
      }

      // 3. If MongoDB is connected
      if (getIsConnected()) {
        let dbExisting = await User.findOne({ email: u.email.toLowerCase() });
        if (!dbExisting) {
          await User.create({
            name: u.name,
            teamName: u.teamName || u.name,
            email: u.email.toLowerCase(),
            password: hashedPassword,
            role: u.role,
            score: u.score || 0,
            solvedCount: u.solvedCount || 0,
            createdAt: now,
            lastLogin: now
          });
        } else {
          dbExisting.name = u.name;
          dbExisting.teamName = u.teamName || u.name;
          dbExisting.password = hashedPassword;
          dbExisting.role = u.role;
          await dbExisting.save();
        }
      }
    }

    console.log('✅ System accounts and security configuration verified.');
  } catch (err) {
    console.error('Seed error:', err.message);
  }
};

if (require.main === module) {
  (async () => {
    try {
      await connectDB();
      await seedData();
      process.exit(0);
    } catch (e) {
      console.error(e);
      process.exit(1);
    }
  })();
}

module.exports = { seedData };
