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
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    // Send user email in the response for client-side storage and redirect
    res.status(200).json({ message: 'Login successful', userEmail: user.email });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

// New endpoint to submit crime data
app.post('/api/crimes', async (req, res) => {
  try {
    const { type, location, details, latitude, longitude, address } = req.body;

    // Determine severity based on crime type
    let severity;
    const redSeverityCrimes = ['murder', 'rape', 'robbery', 'violent assault']; // Changed to lowercase
    const yellowSeverityCrimes = ['theft', 'drug', 'nuisance']; // Changed to lowercase

    const crimeTypeLower = type.toLowerCase(); // Convert incoming type to lowercase

    if (redSeverityCrimes.includes(crimeTypeLower)) {
        severity = 'red';
    } else if (yellowSeverityCrimes.includes(crimeTypeLower)) {
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
        address,
        severity,
        upvotes: 0,
        downvotes: 0
    });

    await newCrime.save();
    res.status(201).json({ message: 'Crime report submitted successfully!', crime: newCrime });
  } catch (error) {
    console.error('Error submitting crime report:', error);
    res.status(500).json({ message: 'Error submitting crime report', error: error.message });
  }
});

// New endpoint to get all crimes, sorted by upvotes
app.get('/api/crimes', async (req, res) => {
    try {
        const crimes = await Crime.find().sort({ upvotes: -1 }); // Sort by upvotes in descending order
        res.status(200).json(crimes);
    } catch (error) {
        console.error('Error fetching crimes:', error);
        res.status(500).json({ message: 'Error fetching crimes', error: error.message });
    }
});

// New endpoint to upvote a crime
app.post('/api/crimes/:id/upvote', async (req, res) => {
    try {
        const { userEmail } = req.body;
        const crime = await Crime.findById(req.params.id);

        if (!crime) {
            return res.status(404).json({ message: 'Crime not found' });
        }

        // If the user has already upvoted, do nothing or send a message indicating so
        if (crime.upvotedBy.includes(userEmail)) {
            return res.status(200).json({ message: 'You have already upvoted this crime', crime });
        }

        // If the user previously downvoted, remove their downvote first
        if (crime.downvotedBy.includes(userEmail)) {
            crime.downvotes--;
            crime.downvotedBy = crime.downvotedBy.filter(email => email !== userEmail);
        }

        crime.upvotes++;
        crime.upvotedBy.push(userEmail);
        await crime.save();

        res.status(200).json(crime);
    } catch (error) {
        console.error('Error upvoting crime:', error);
        res.status(500).json({ message: 'Error upvoting crime', error: error.message });
    }
});

// New endpoint to downvote a crime
app.post('/api/crimes/:id/downvote', async (req, res) => {
    try {
        const { userEmail } = req.body;
        const crime = await Crime.findById(req.params.id);

        if (!crime) {
            return res.status(404).json({ message: 'Crime not found' });
        }

        // Check if the user has already downvoted
        if (crime.downvotedBy.includes(userEmail)) {
            // Return 200 OK with the current crime object, similar to upvote endpoint
            return res.status(200).json({ message: 'You have already downvoted this crime', crime });
        }

        // If the user previously upvoted, remove their upvote
        if (crime.upvotedBy.includes(userEmail)) {
            crime.upvotes--;
            crime.upvotedBy = crime.upvotedBy.filter(email => email !== userEmail);
        }

        crime.downvotes++;
        crime.downvotedBy.push(userEmail);
        await crime.save();

        res.status(200).json(crime);
    } catch (error) {
        console.error('Error downvoting crime:', error);
        res.status(500).json({ message: 'Error downvoting crime', error: error.message });
    }
});

app.listen(5000, () => {
  console.log('Server running on port 5000');
});