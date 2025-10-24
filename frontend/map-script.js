// Initialize map with a default view (e.g., New York City) in case geolocation fails
const map = L.map('map').setView([40.7128, -74.0060], 13);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

let allCrimes = []; // Global variable to store all crimes

// Create a div for crime details display
const crimeDetailsDiv = L.control({position: 'topleft'});

crimeDetailsDiv.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'crime-details-display');
    this._div.innerHTML = '<h4>Nearby Crime Details</h4><p>Move closer to a crime to see details.</p>';
    return this._div;
};

crimeDetailsDiv.addTo(map);

// Style for the crime details display (you might want to move this to map-style.css)
const style = document.createElement('style');
style.innerHTML = `
    .crime-details-display {
        background: white;
        padding: 10px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0,0,0,0.6);
        max-width: 250px;
        font-family: Arial, sans-serif;
        color: #333;
    }
    .crime-details-display h4 {
        margin-top: 0;
        color: #d32f2f;
    }
    .crime-details-display p {
        margin-bottom: 5px;
        font-size: 0.9em;
    }
    .vote-buttons button {
        margin-right: 5px;
        padding: 5px 10px;
        cursor: pointer;
    }
`;
document.head.appendChild(style);

// Function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // Distance in kilometers
}

// Function to check if user is near any crime locations
function checkProximityToCrimes(userLat, userLng) {
    let nearbyCrimes = [];
    allCrimes.forEach(crime => {
        const distance = calculateDistance(userLat, userLng, crime.latitude, crime.longitude);
        nearbyCrimes.push({
            ...crime,
            distance: distance
        });
    });

    if (nearbyCrimes.length === 0) {
        crimeDetailsDiv._div.innerHTML = '<h4>Nearby Crime Details</h4><p>No crimes reported yet.</p>';
        return;
    }

    // Sort crimes: first by distance (ascending), then by upvotes (descending)
    nearbyCrimes.sort((a, b) => {
        if (a.distance !== b.distance) {
            return a.distance - b.distance; // Sort by distance first
        } else {
            return b.upvotes - a.upvotes; // If distances are equal, sort by upvotes (descending)
        }
    });

    const selectedCrime = nearbyCrimes[0]; // Get the single most relevant crime

    let detailsHtml = '<h4>Nearby Crime Details</h4>';
    detailsHtml += `
        <p>
            <strong>Type:</strong> ${selectedCrime.type}<br>
            <strong>Location:</strong> ${selectedCrime.address || selectedCrime.location}<br>
            <strong>Distance:</strong> ~${selectedCrime.distance.toFixed(2)} km<br>
            <strong>Details:</strong> ${selectedCrime.details}<br>
            <span id="upvotes-${selectedCrime._id}">Upvotes: ${selectedCrime.upvotes}</span> | <span id="downvotes-${selectedCrime._id}">Downvotes: ${selectedCrime.downvotes}</span><br>
            <div class="vote-buttons">
                <button onclick="voteCrime('${selectedCrime._id}', 'upvote')">Upvote</button>
                <button onclick="voteCrime('${selectedCrime._id}', 'downvote')">Downvote</button>
            </div>
        </p>
    `;
    crimeDetailsDiv._div.innerHTML = detailsHtml;
    // alert('Nearby crime information updated!'); // Removed this line
}

async function voteCrime(crimeId, voteType) {
    try {
        const userEmail = localStorage.getItem('userEmail'); // Get user email from localStorage
        if (!userEmail) {
            alert('You must be logged in to vote.');
            return;
        }

        const response = await fetch(`http://localhost:5000/api/crimes/${crimeId}/${voteType}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userEmail }) // Send user email in the request body
        });
        const updatedCrime = await response.json();
        if (response.ok) {
            // Update the displayed vote count by checking for nested crime object
            const crimeData = updatedCrime.crime || updatedCrime;
            document.getElementById(`upvotes-${crimeId}`).innerText = `Upvotes: ${crimeData.upvotes}`;
            document.getElementById(`downvotes-${crimeId}`).innerText = `Downvotes: ${crimeData.downvotes}`;
            // Optionally, re-fetch and re-display crimes to re-sort
            fetchAndDisplayCrimes();
        } else {
            console.error(`Error ${voteType}ing crime:`, updatedCrime.message);
            alert(`Failed to ${voteType} crime: ` + updatedCrime.message);
        }
    } catch (error) {
        console.error(`Error ${voteType}ing crime:`, error);
        alert(`An error occurred while ${voteType}ing crime.`);
    }
}

function fetchAndDisplayCrimes() {
    fetch('http://localhost:5000/api/crimes')
        .then(response => response.json())
        .then(crimes => {
            allCrimes = crimes; // Store crimes globally
            // Clear existing markers before adding new ones
            map.eachLayer(function (layer) {
                // Only remove crime markers, not the user's location marker
                if (layer instanceof L.Marker && layer !== userLocationMarker) {
                    map.removeLayer(layer);
                }
            });

            crimes.forEach(crime => {
                // Set marker color based on crime severity
                let markerColor;
                
                // Use crime.severity directly
                if (crime.severity === 'red') {
                    markerColor = 'red';
                } else if (crime.severity === 'yellow') {
                    markerColor = 'yellow';
                } else {
                    markerColor = 'yellow'; // Default to yellow if severity is not explicitly defined
                }
                
                const customIcon = L.divIcon({
                    className: 'custom-div-icon triangle',
                    html: `<div style="width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 20px solid ${markerColor};"></div>`, // Triangle with no borders
                    iconSize: [20, 20],
                    iconAnchor: [10, 20] // Adjust anchor for triangle shape
                });

                const marker = L.marker([crime.latitude, crime.longitude], { icon: customIcon }).addTo(map);
                marker.bindPopup(`<b>${crime.type}</b><br>${crime.address || crime.location}<br>${crime.details}<br>Upvotes: ${crime.upvotes}<br>Downvotes: ${crime.downvotes}`);
            });
        })
        .catch(error => console.error('Error fetching crimes:', error));
}

let userLocationMarker = null; // Global variable to store the user's marker

// Function to handle user location updates
function handleUserLocation(position) {
    const lat = position.coords.latitude;
    const lon = position.coords.longitude;
    
    // Store the location permission in localStorage
    localStorage.setItem('locationPermissionGranted', 'true');
    localStorage.setItem('lastLat', lat.toString());
    localStorage.setItem('lastLon', lon.toString());

    if (!userLocationMarker) {
        // Create a distinct custom icon for the user's location
        const userIcon = L.divIcon({
            className: 'user-location-marker',
            html: '<div style="background-color: #007bff; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white;"></div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10]
        });
        // Create the marker with the custom icon
        userLocationMarker = L.marker([lat, lon], { icon: userIcon }).addTo(map);
        userLocationMarker.bindPopup("<b>Your Current Location</b>").openPopup();
        map.setView([lat, lon], 13); // Set map view only on initial location
    } else {
        // Update marker position if it already exists
        userLocationMarker.setLatLng([lat, lon]);
        // Optionally, re-center the map on the user's new position if they move significantly
        map.panTo([lat, lon]);
    }

    // Check proximity to crimes with the updated location
    checkProximityToCrimes(lat, lon);

    // Fetch and display crimes
    fetchAndDisplayCrimes();
}

// Function to handle geolocation errors
function handleLocationError(error) {
    console.error("Error getting geolocation: ", error);
    localStorage.setItem('locationPermissionGranted', 'false');
    alert("Could not retrieve your location. Displaying default map.");
    const defaultMarker = L.marker([40.7128, -74.0060]).addTo(map);
    defaultMarker.bindPopup("<b>Default Location</b><br>Could not retrieve your location.");
    // Fetch and display crimes even if geolocation fails, but without proximity check
    fetchAndDisplayCrimes();
}

// Check if we've already asked for permission
const locationPermissionGranted = localStorage.getItem('locationPermissionGranted');

if (navigator.geolocation) {
    if (locationPermissionGranted === 'true') {
        // If permission was previously granted, use the stored coordinates initially
        const lastLat = parseFloat(localStorage.getItem('lastLat'));
        const lastLon = parseFloat(localStorage.getItem('lastLon'));
        
        if (!isNaN(lastLat) && !isNaN(lastLon)) {
            // Create a position object with the stored coordinates
            const storedPosition = {
                coords: {
                    latitude: lastLat,
                    longitude: lastLon
                }
            };
            
            // Use the stored position immediately
            handleUserLocation(storedPosition);
            
            // Then start watching position for updates (without prompting again)
            navigator.geolocation.watchPosition(handleUserLocation, handleLocationError);
        } else {
            // If stored coordinates are invalid, request once
            navigator.geolocation.getCurrentPosition(handleUserLocation, handleLocationError);
        }
    } else {
        // First time asking for permission or previously denied
        navigator.geolocation.getCurrentPosition(handleUserLocation, handleLocationError);
    }
} else {
    alert("Geolocation is not supported by your browser. Displaying default map.");
    const defaultMarker = L.marker([40.7128, -74.0060]).addTo(map);
    defaultMarker.bindPopup("<b>Default Location</b><br>Geolocation not supported.");
    fetchAndDisplayCrimes();
}

// Crime Report Form Logic
const reportCrimeBtn = document.getElementById('reportCrimeBtn');
const crimeReportForm = document.getElementById('crimeReportForm');
const crimeForm = document.getElementById('crimeForm'); // Listen to form submit
const cancelCrimeReportBtn = document.getElementById('cancelCrimeReport');
const locationInput = document.getElementById('location');
const addressInput = document.getElementById('address'); // Get the address input field

reportCrimeBtn.addEventListener('click', () => {
    crimeReportForm.style.display = 'block';
    locationInput.value = '';
    addressInput.value = ''; // Clear address input as well
});

cancelCrimeReportBtn.addEventListener('click', () => {
    crimeReportForm.style.display = 'none';
});

// Listen for form submit instead of button click
crimeForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    // Add null checks for each element
    const typeElement = document.getElementById('crime-type');
    const detailsElement = document.getElementById('crime-details'); // Changed 'details' to 'crime-details'
    
    if (!typeElement || !locationInput || !detailsElement || !addressInput) {
        alert("Error: One or more form fields could not be found. Please check the HTML form structure.");
        console.error("Missing form elements:", {
            typeElement,
            locationInput,
            detailsElement,
            addressInput
        });
        return;
    }

    const type = typeElement.value;
    const location = locationInput.value;
    const details = detailsElement.value;
    const address = addressInput.value;

    try {
        // Use both location and address for a more precise geocoding query
        const coords = await getCoordinates(`${location}, ${address}`);
        const latitude = coords.lat;
        const longitude = coords.lon;

        const response = await fetch('http://localhost:5000/api/crimes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ type, location, details, latitude, longitude, address })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to report crime');
        }

        const result = await response.json();
        console.log('Crime reported:', result);

        // Display success message
        const successMessageDiv = document.getElementById('successMessage');
        successMessageDiv.textContent = 'Crime reported successfully!';
        successMessageDiv.style.display = 'block';
        
        // Refresh the map with the new crime marker
        fetchAndDisplayCrimes();

        // Hide message and clear form after 3 seconds
        setTimeout(() => {
            successMessageDiv.style.display = 'none';
            crimeForm.reset();
            crimeReportForm.style.display = 'none'; // Hide the form after successful submission
        }, 3000);
        
    } catch (error) {
        console.error('Error reporting crime:', error);
        let errorMessage = `An error occurred while reporting the crime: ${error.message}`;
        if (error.message === "Location not found") {
            errorMessage = "Could not find coordinates for the provided location. Please try a more specific address.";
        }
        alert(errorMessage);
    }
});


async function getCoordinates(query) { // Changed parameter name to 'query'
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    if (data.length > 0) {
        return {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon),
        };
    } else {
        throw new Error("Location not found");
    }
}

// Call the function to display crimes when the map loads
fetchAndDisplayCrimes();
