import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import User from '../src/models/User.js';

if (!process.env.MONGODB_URI) throw Error('Set MONGODB_URI in server/.env first');
const io = readline.createInterface({ input: stdin, output: stdout });
try {
  const name = (await io.question('Admin full name: ')).trim();
  const email = (await io.question('Admin email: ')).trim().toLowerCase();
  const password = await io.question('Admin password (12+ chars; visible while typing): ');
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 12) {
    throw Error('Enter a name, a valid email, and a password of at least 12 characters.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  if (await User.exists({ email })) throw Error('A user with that email already exists.');
  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({ name, email, passwordHash, role: 'admin' });
  console.log('Admin account created. You can now sign in.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  io.close();
  await mongoose.disconnect();
}
