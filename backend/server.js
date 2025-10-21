const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const User = require('./user');
const Crime = require('./crime'); // Add this line to import the Crime model
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/streetSafetyDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// Registration endpoint
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(400).json({ error: 'Registration failed: ' + err.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).send('Invalid credentials');
    }
    // Redirect the browser to map.html
    res.redirect('/map.html');
  } catch (err) {
    res.status(500).send('Login failed: ' + err.message);
  }
});

// New endpoint to submit crime data
app.post('/api/crimes', async (req, res) => {
  try {
    const { type, location, details, latitude, longitude, address } = req.body; // Add 'address' here

    // Determine severity based on crime type
    let severity;
    const redSeverityCrimes = ['Murder', 'Rape', 'Robbery', 'Violent Assault'];
    const yellowSeverityCrimes = ['Theft', 'Drug', 'Nuisance'];

    if (redSeverityCrimes.includes(type)) {
        severity = 'red';
    } else if (yellowSeverityCrimes.includes(type)) {
        severity = 'yellow';
    } else {
        severity = 'yellow'; // Default to yellow if type not explicitly defined
    }

    const newCrime = new Crime({
        type,
        location,
        details,
        latitude,
        longitude,
        severity,
        address // Add address to the new Crime object
    });

    await newCrime.save();
    res.status(201).json({ message: 'Crime report submitted successfully!', crime: newCrime });
  } catch (error) {
    console.error('Error submitting crime report:', error);
    res.status(500).json({ message: 'Error submitting crime report', error: error.message });
  }
});

// New endpoint to fetch all crime data
app.get('/api/crimes', async (req, res) => {
  try {
    const crimes = await Crime.find({});
    res.status(200).json(crimes);
  } catch (error) {
    console.error('Error fetching crime data:', error);
    res.status(500).json({ message: 'Error fetching crime data', error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));