const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcrypt');

// Ensure correct and accessible database path
const dbPath = path.resolve(__dirname, '../data/instrument.db');

// Open a database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Create Customer table
const createCustomerTable = `
CREATE TABLE IF NOT EXISTS Customer (
  customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone_number TEXT,
  address TEXT
);
`;

// Create Cart table
const createCartTable = `
CREATE TABLE IF NOT EXISTS Cart (
  cart_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  details TEXT,
  prize REAL NOT NULL,
  image_url TEXT,
  customer_id INTEGER NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
);
`;
// Execute the table creation SQL
db.serialize(() => {
    db.run(createCustomerTable, (err) => {
      if (err) {
        console.error('Error creating Customer table:', err.message);
      } else {
        console.log('Customer table created (or already exists).');
      }
    });

    db.run(createCartTable, (err) => {
      if (err) {
        console.error('Error creating Cart table:', err.message);
      } else {
        console.log('Cart table created (or already exists).');
      }
    });
  });
  
  module.exports = db;