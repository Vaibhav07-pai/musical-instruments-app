const express = require('express');
const bcrypt = require('bcrypt'); // For hashing passwords
const path = require('path');
const session = require('express-session'); // For session handling
const db = require('./db/database'); // Import the database instance
const app = express();
const port = 3000;

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // For parsing JSON requests
app.use(express.static('public')); // Serve static files
  
// Update this near the top of your server.js file

app.use(session({
    secret: 'your-secret-key',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// POST route to handle registration
app.post('/register', async (req, res) => {
    const { name, email, phone, address, password, confirmPassword } = req.body;
  
    if (!name || !email || !phone || !address || !password || !confirmPassword) {
      return res.status(400).send('All fields are required.');
    }
  
    if (password !== confirmPassword) {
      return res.status(400).send('Passwords do not match.');
    }
  
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
  
      const sql = `INSERT INTO Customer (name, email, password, phone_number, address) 
                   VALUES (?, ?, ?, ?, ?)`;
      const params = [name, email, hashedPassword, phone, address];
  
      db.run(sql, params, function (err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).send('Email is already registered.');
          }
          console.error('Error inserting customer:', err.message);
          return res.status(500).send('Error registering user.');
        }
        res.redirect('/login.html');
      });
    } catch (err) {
      console.error('Error hashing password:', err.message);
      res.status(500).send('Server error.');
    }
  });
  
// Serve the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
  });
  
  // Serve the registration page
  app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'Registration.html'));
  });

  // POST route to handle user login
  app.post('/login', (req, res) => {
      const { email, password } = req.body;
  
      if (!email || !password) {
          return res.status(400).send('Email and password are required.');
      }
  
      const sql = `SELECT * FROM Customer WHERE email = ?`;
      db.get(sql, [email], async (err, row) => {
          if (err) {
              console.error('Error fetching user:', err.message);
              return res.status(500).send('Server error.');
          }
  
          if (!row) {
              return res.status(400).send('Invalid email or password.');
          }
  
          const isPasswordValid = await bcrypt.compare(password, row.password);
          if (!isPasswordValid) {
              return res.status(400).send('Invalid email or password.');
          }
  
          // Log the customer ID to verify it's correct
          console.log('Setting session for customer:', row.customer_id);
          
          req.session.userId = row.customer_id;
          req.session.userName = row.name;
          
          req.session.save((err) => {
              if (err) {
                  console.error('Session save error:', err);
                  return res.status(500).send('Error creating session.');
              }
              console.log('Session saved successfully:', req.session);
              res.redirect('/index.html');
          });
      });
  });

  // Add this route to server.js
app.delete('/api/cart/remove', (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Please log in to remove items from cart' });
  }

  const { itemName } = req.body;
  const customer_id = req.session.userId;

  const sql = `DELETE FROM Cart WHERE name = ? AND customer_id = ?`;
  
  db.run(sql, [itemName, customer_id], function(err) {
      if (err) {
          console.error('Error removing item from cart:', err);
          return res.status(500).json({ error: 'Failed to remove item from cart' });
      }
      res.json({ message: 'Items removed from cart successfully', changes: this.changes });
  });
});
  
  // Route to verify user authentication status
  app.get('/api/user/status', (req, res) => {
      const isAuthenticated = req.session && 
                            req.session.userId && 
                            typeof req.session.userId !== 'undefined';
      
      if (isAuthenticated) {
          res.json({
              loggedIn: true,
              userName: req.session.userName,
              userId: req.session.userId
          });
      } else {
          res.json({
              loggedIn: false
          });
      }
  });
  // Add this to your server.js
app.post('/api/cart/add', (req, res) => {
  // Check if user is logged in
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Please log in to add items to cart' });
  }

  const { name, prize, details, image_url } = req.body;
  const customer_id = req.session.userId;

  const sql = `INSERT INTO Cart (name, prize, details, image_url, customer_id) 
               VALUES (?, ?, ?, ?, ?)`;
  
  db.run(sql, [name, prize, details, image_url, customer_id], function(err) {
      if (err) {
          console.error('Error adding item to cart:', err);
          return res.status(500).json({ error: 'Failed to add item to cart' });
      }
      res.json({ message: 'Item added to cart successfully', cartItemId: this.lastID });
  });
});

app.get('/api/cart/items', (req, res) => {
  if (!req.session.userId) {
      return res.status(401).json({ error: 'Please log in to view cart' });
  }

  const sql = `SELECT * FROM Cart WHERE customer_id = ?`;
  
  db.all(sql, [req.session.userId], (err, items) => {
      if (err) {
          console.error('Error fetching cart items:', err);
          return res.status(500).json({ error: 'Failed to fetch cart items' });
      }
      res.json(items);
  });
});



// Fallback route to serve index.html for SPA routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });


// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });