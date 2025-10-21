const mongoose = require('mongoose');

const crimeSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    latitude: {
        type: Number,
        required: true
    },
    longitude: {
        type: Number,
        required: true
    },
    severity: {
        type: String,
        enum: ['red', 'yellow'],
        required: true
    },
    address: { // Add this new field
        type: String,
        required: true
    },
    details: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Crime', crimeSchema, 'crime'); // Explicitly set collection name