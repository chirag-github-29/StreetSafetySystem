// 1. Initialize the map (start zoomed out)
var map = L.map('map').setView([0, 0], 2);

// 2. Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// 3. Enable user location tracking
map.locate({ setView: true, maxZoom: 16, watch: true });

// 4. Marker for user location
var userMarker, accuracyCircle;

function onLocationFound(e) {
  var lat = e.latlng.lat;
  var lng = e.latlng.lng;
  var accuracy = e.accuracy; // in meters

  if (userMarker) {
    // update position
    userMarker.setLatLng([lat, lng]);
    accuracyCircle.setLatLng([lat, lng]).setRadius(accuracy);
  } else {
    // create marker + accuracy circle
    userMarker = L.marker([lat, lng]).addTo(map)
      .bindPopup("You are here").openPopup();

    accuracyCircle = L.circle([lat, lng], { radius: accuracy }).addTo(map);
  }


}

function loadCrimeData() {
    fetch('./data/crimes.json')
        .then(response => response.json())
        .then(crimeData => {
            crimeData.forEach(crime => {
                let color;
                if (crime.risk === 'high') {
                    color = 'red';
                } else if (crime.risk === 'medium') {
                    color = 'orange';
                } else {
                    color = 'green';
                }

                L.circleMarker([crime.lat, crime.lng], {
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.7,
                    radius: 8
                }).addTo(map)
                  .bindPopup(`<b>${crime.type}</b><br>${crime.warning}`);
            });
        })
        .catch(error => console.error('Error loading crime data:', error));
}

function onLocationError(e) {
  alert("Location access denied or unavailable.");
}

// Leaflet events
map.on('locationfound', onLocationFound);
map.on('locationerror', onLocationError);

// Load crime data on map initialization
loadCrimeData();