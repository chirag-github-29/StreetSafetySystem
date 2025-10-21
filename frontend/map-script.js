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
`;
document.head.appendChild(style);

// Function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
}

// Function to check if user is near any crime locations
function checkProximityToCrimes(userLat, userLon) {
  const proximityRadius = 500; // 500 meters
  let nearCrime = false;

  allCrimes.forEach(crime => {
    const distance = calculateDistance(userLat, userLon, crime.latitude, crime.longitude);
    if (distance < proximityRadius) {
      alert(`Warning! You are near a ${crime.severity} severity crime location: ${crime.type} at ${crime.address}.`);
      nearCrime = true;
    }
  });
}

// Fetch and display crime data on the map
function fetchAndDisplayCrimes(userLat = null, userLon = null) {
  fetch('http://localhost:5000/api/crimes')
    .then(response => response.json())
    .then(crimes => {
      allCrimes = crimes; // Store crimes globally
      crimes.forEach(crime => {
        // Set color based on severity
        const color = crime.severity === 'red' ? '#ff0000' : '#ffff00';
        // Set shape based on severity (circle for red, square for yellow)
        const shape = crime.severity === 'red' ? '50%' : '0';

        // Create custom marker
        const customIcon = L.divIcon({
          className: 'crime-marker',
          html: `<div style="width: 20px; height: 20px; background-color: ${color}; border-radius: ${shape};"></div>`,
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        // Add marker to map
        L.marker([crime.latitude, crime.longitude], { icon: customIcon })
          .addTo(map)
          .bindPopup(`<b>${crime.type}</b><br>Severity: ${crime.severity}<br>Address: ${crime.address}`);
      });

      // After crimes are loaded, check proximity if user location is available
      if (userLat !== null && userLon !== null) {
        checkProximityToCrimes(userLat, userLon);
      }
    })
    .catch(error => console.error('Error fetching crimes:', error));
}

// Get current location using geolocation API
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(function(position) {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Set map view to current location
        map.setView([lat, lon], 13);

        // Add a marker at the current location
        const marker = L.marker([lat, lon]).addTo(map);
        marker.bindPopup("<b>Your Current Location</b>").openPopup();

        // Fetch and display crimes, then check proximity
        fetchAndDisplayCrimes(lat, lon);
    }, function(error) {
        console.error("Error getting geolocation: ", error);
        alert("Could not retrieve your location. Displaying default map.");
        const defaultMarker = L.marker([40.7128, -74.0060]).addTo(map);
        defaultMarker.bindPopup("<b>Default Location</b><br>Could not retrieve your location.");
        // Fetch and display crimes even if geolocation fails, but without proximity check
        fetchAndDisplayCrimes();
    });
} else {
    alert("Geolocation is not supported by your browser. Displaying default map.");
    const defaultMarker = L.marker([40.7128, -74.0060]).addTo(map);
    defaultMarker.bindPopup("<b>Default Location</b><br>Geolocation not supported.");
    // Fetch and display crimes if geolocation is not supported
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

    const crimeType = document.getElementById('crime-type').value;
    const crimeDetails = document.getElementById('crime-details').value;
    const locationName = document.getElementById('location').value; // Get the location name from the input
    const address = document.getElementById('address').value; // Get the address from the input

    if (!crimeType || !locationName || !address) {
        alert('Please fill in all required fields (Crime Type, Location, and Address).');
        return;
    }

    try {
        const coordinates = await getCoordinates(locationName); // Get coordinates from the location name
        if (!coordinates) {
            throw new Error('Could not find coordinates for the given location.');
        }

        const crimeData = {
            type: crimeType,
            details: crimeDetails,
            location: locationName, // Keep the original location name
            latitude: coordinates.lat,
            longitude: coordinates.lon,
            address: address, // Add the address to the crime data
        };

        const response = await fetch('http://localhost:5000/api/crimes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(crimeData),
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

        // Hide message and clear form after 3 seconds
        setTimeout(() => {
            successMessageDiv.style.display = 'none';
            crimeForm.reset();
        }, 3000);

    } catch (error) {
        console.error('Error reporting crime:', error);
        alert(`An error occurred while reporting the crime: ${error.message}`);
    }
});


async function getCoordinates(locationName) {
    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationName)}`
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
