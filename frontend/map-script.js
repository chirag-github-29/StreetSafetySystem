// Initialize map with a default view (e.g., New York City) in case geolocation fails
const map = L.map('map').setView([40.7128, -74.0060], 13);

// Add OpenStreetMap tile layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

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
    }, function(error) {
        console.error("Error getting geolocation: ", error);
        alert("Could not retrieve your location. Displaying default map.");
        // Optionally, add a marker at the default location if geolocation fails
        const defaultMarker = L.marker([40.7128, -74.0060]).addTo(map);
        defaultMarker.bindPopup("<b>Default Location</b><br>Could not retrieve your location.");
    });
} else {
    alert("Geolocation is not supported by your browser. Displaying default map.");
    // Optionally, add a marker at the default location if geolocation is not supported
    const defaultMarker = L.marker([40.7128, -74.0060]).addTo(map);
    defaultMarker.bindPopup("<b>Default Location</b><br>Geolocation not supported.");
}