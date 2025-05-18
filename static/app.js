// Pasig City Emergency Areas Finder
// A simplified application to find the nearest emergency facilities in Pasig City

// Global variables
let map;
let marker;
let userLocation = null;

// Pasig City's center coordinates
const PASIG_CENTER = [14.5764, 121.0851];

// Initialize empty object to store emergency facilities
const emergencyFacilities = {
    hospitals: [],
    policeStations: [],
    fireStations: [],
    evacuationSites: []
};

async function fetchCoordinatesFromAddress(address) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ' Pasig City')}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.length > 0) {
            const { lat, lon } = data[0];
            return {
                latitude: parseFloat(lat),
                longitude: parseFloat(lon)
            };
        } else {
            return null;
        }
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
}

// Pasig City boundaries (approximate)
const PASIG_BOUNDS = {
    north: 14.6100,
    south: 14.5400,
    east: 121.1100,
    west: 121.0500
};

// Known addresses in Pasig City with their coordinates
const pasigAddressCoordinates = {
    // Major areas
    "ortigas avenue": { latitude: 14.590513331478874, longitude: 121.06943181081918 },
    "c. raymundo avenue": { latitude: 14.576003837648456, longitude: 121.08520212362293 },
    "kapasigan": { latitude: 14.5728, longitude: 121.0712 },
    "greenwoods executive village": { latitude: 14.5938, longitude: 121.0943 },
    "valle verde 1": { latitude: 14.5839, longitude: 121.0637 },
    "san joaquin": { latitude: 14.5537, longitude: 121.0825 },
    "manggahan": { latitude: 14.598893821738267, longitude: 121.09165363188811 },
    "pasig city hall": { latitude: 14.5768, longitude: 121.0682 },
    "evangelista avenue": { latitude: 14.615464892545381, longitude: 121.08185317978386 },
    "pasig boulevard": { latitude: 14.5692, longitude: 121.0738 },
    "ortigas center": { latitude: 14.5891, longitude: 121.0585 },
    "kapitolyo": { latitude: 14.57179311409301, longitude: 121.05927847978327 },
    "pinagbuhatan": { latitude: 14.558434026713494, longitude: 121.09578680465825 },
    "bagong ilog": { latitude: 14.56383203904563, longitude: 121.07126461904527 },
    "rosario": { latitude: 14.585483755624793, longitude: 121.08370605812752 }
};

// Custom marker icons for different facility types
const customIcons = {
    hospital: L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color: #e74c3c; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;'></div>",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    }),
    police: L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color: #3498db; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;'></div>",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    }),
    fire: L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color: #e67e22; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;'></div>",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    }),
    evacuation: L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color: #2ecc71; width: 10px; height: 10px; border-radius: 50%; border: 2px solid white;'></div>",
        iconSize: [14, 14],
        iconAnchor: [7, 7]
    }),
    user: L.divIcon({
        className: 'custom-div-icon',
        html: "<div style='background-color: #9b59b6; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white;'></div>",
        iconSize: [22, 22],
        iconAnchor: [11, 11]
    })
};

// Load facilities data from the API
async function loadFacilitiesData() {
    try {
        // Fetch hospitals data
        const hospitalsResponse = await fetch('/api/hospitals');
        if (hospitalsResponse.ok) {
            const hospitalsData = await hospitalsResponse.json();
            emergencyFacilities.hospitals = hospitalsData.map(hospital => ({
                id: hospital.id,
                name: hospital.name,
                address: hospital.address,
                contact: hospital.contact,
                coordinates: {
                    latitude: parseFloat(hospital.latitude),
                    longitude: parseFloat(hospital.longitude)
                }
            }));
        }

        // Fetch police stations data
        const policeResponse = await fetch('/api/police_stations');
        if (policeResponse.ok) {
            const policeData = await policeResponse.json();
            emergencyFacilities.policeStations = policeData.map(station => ({
                id: station.id,
                name: station.name,
                address: station.address,
                contact: station.contact,
                coordinates: {
                    latitude: parseFloat(station.latitude),
                    longitude: parseFloat(station.longitude)
                }
            }));
        }

        // Fetch fire stations data
        const fireResponse = await fetch('/api/fire_stations');
        if (fireResponse.ok) {
            const fireData = await fireResponse.json();
            emergencyFacilities.fireStations = fireData.map(station => ({
                id: station.id,
                name: station.name,
                address: station.address,
                contact: station.contact,
                coordinates: {
                    latitude: parseFloat(station.latitude),
                    longitude: parseFloat(station.longitude)
                }
            }));
        }

        // Fetch evacuation centers data
        const evacuationResponse = await fetch('/api/evacuation_centers');
        if (evacuationResponse.ok) {
            const evacuationData = await evacuationResponse.json();
            emergencyFacilities.evacuationSites = evacuationData.map(center => ({
                id: center.id,
                name: center.name,
                address: center.address,
                contact: center.contact,
                coordinates: {
                    latitude: parseFloat(center.latitude),
                    longitude: parseFloat(center.longitude)
                }
            }));
        }

        console.log('All facilities data loaded successfully');
        
        // Initialize map once data is loaded
        initializeMap();
        setupEventListeners();
        
    } catch (error) {
        console.error('Error loading facilities data:', error);
        // Initialize map anyway with whatever data we have
        initializeMap();
        setupEventListeners();
    }
}

// Initialize document when loaded
document.addEventListener('DOMContentLoaded', function() {
    loadFacilitiesData();
});

// Initialize the Leaflet map
function initializeMap() {
    // Create map centered on Pasig City
    map = L.map('map', {
        center: PASIG_CENTER,
        zoom: 14,
        minZoom: 12,
        maxZoom: 19
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
    }).addTo(map);
    
    // Add city boundary (approximate)
    const pasigBoundary = [
        [14.5400, 121.0600], // Southwest
        [14.5400, 121.1100], // Southeast
        [14.6200, 121.1100], // Northeast
        [14.6200, 121.0600]  // Northwest
    ];
    
    // Create a polygon for Pasig City boundary
    L.polygon(pasigBoundary, {
        color: '#3498db',
        weight: 2,
        fillColor: '#3498db',
        fillOpacity: 0.05
    }).addTo(map);
    
    // Make sure map is fully initialized
    setTimeout(() => {
        map.invalidateSize();
    }, 100);
    
    // Add emergency facilities markers
    addEmergencyFacilitiesMarkers();
    
    // Add legend to the map
    addLegendToMap();
}

// Set up event listeners
// Add this helper function to check if a point is within Pasig City boundaries
function isWithinPasigBoundary(lat, lng) {
    return (
        lat >= PASIG_BOUNDS.south &&
        lat <= PASIG_BOUNDS.north &&
        lng >= PASIG_BOUNDS.west &&
        lng <= PASIG_BOUNDS.east
    );
}

// Updated setupEventListeners function
function setupEventListeners() {
    // Location selection radio buttons
    const enterAddressRadio = document.getElementById('enter-address');
    const pinLocationRadio = document.getElementById('pin-location');
    
    if (enterAddressRadio && pinLocationRadio) {
        enterAddressRadio.addEventListener('change', toggleLocationInput);
        pinLocationRadio.addEventListener('change', toggleLocationInput);
    }
    
    // Find button
    const findBtn = document.getElementById('find-emergency-btn');
    if (findBtn) {
        findBtn.addEventListener('click', function() {
            // Show loading indicator
            const loadingIndicator = document.getElementById('loading-indicator');
            if (loadingIndicator) {
                loadingIndicator.classList.add('visible');
            }
            
            // Short delay to allow UI to update before potentially heavy calculations
            setTimeout(function() {
                findNearestEmergencyAreas();
                // Hide loading indicator
                if (loadingIndicator) {
                    loadingIndicator.classList.remove('visible');
                }
            }, 300);
        });
    }
    
    // Map click event for pinning location
    if (map && pinLocationRadio) {
        map.on('click', function(e) {
            if (pinLocationRadio.checked) {
                // Check if the clicked location is within Pasig City boundaries
                if (isWithinPasigBoundary(e.latlng.lat, e.latlng.lng)) {
                    placeUserMarker([e.latlng.lat, e.latlng.lng]);
                } else {
                    // Alert the user that they can't place pins outside Pasig City
                    alert("You can only place pins within Pasig City boundaries.");
                }
            }
        });
    }
    
    // Facility filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Apply filter
            const filterType = this.getAttribute('data-type');
            filterFacilities(filterType);
        });
    });
}

// Toggle location input fields
function toggleLocationInput() {
    const addressInputContainer = document.getElementById('address-input-container');
    if (addressInputContainer) {
        if (document.getElementById('enter-address').checked) {
            addressInputContainer.style.display = 'block';
        } else {
            addressInputContainer.style.display = 'none';
        }
    }
}

// Filter facilities on the map
function filterFacilities(type) {
    // Show/hide markers based on type
    map.eachLayer(function(layer) {
        if (layer instanceof L.Marker) {
            // Skip user marker
            if (layer === marker) return;
            
            // Determine marker type
            let markerType = '';
            
            // Get marker position
            const pos = layer.getLatLng();
            
            // Check which type of facility this marker represents
            const isHospital = emergencyFacilities.hospitals.some(f => 
                Math.abs(f.coordinates.latitude - pos.lat) < 0.0001 && 
                Math.abs(f.coordinates.longitude - pos.lng) < 0.0001
            );
            
            const isPolice = emergencyFacilities.policeStations.some(f => 
                Math.abs(f.coordinates.latitude - pos.lat) < 0.0001 && 
                Math.abs(f.coordinates.longitude - pos.lng) < 0.0001
            );
            
            const isFire = emergencyFacilities.fireStations.some(f => 
                Math.abs(f.coordinates.latitude - pos.lat) < 0.0001 && 
                Math.abs(f.coordinates.longitude - pos.lng) < 0.0001
            );
            
            const isEvacuation = emergencyFacilities.evacuationSites.some(f => 
                Math.abs(f.coordinates.latitude - pos.lat) < 0.0001 && 
                Math.abs(f.coordinates.longitude - pos.lng) < 0.0001
            );
            
            if (isHospital) markerType = 'hospital';
            else if (isPolice) markerType = 'police';
            else if (isFire) markerType = 'fire';
            else if (isEvacuation) markerType = 'evacuation';
            
            // Show/hide based on filter
            if (type === 'all' || type === markerType) {
                layer.setOpacity(1);
            } else {
                layer.setOpacity(0.2);
            }
        }
    });
}

// Add all emergency facilities markers to the map
function addEmergencyFacilitiesMarkers() {
    // Add hospital markers
    if (emergencyFacilities.hospitals && emergencyFacilities.hospitals.length > 0) {
        emergencyFacilities.hospitals.forEach(facility => {
            const marker = L.marker(
                [facility.coordinates.latitude, facility.coordinates.longitude],
                { icon: customIcons.hospital }
            ).addTo(map);
            
            marker.bindPopup(`
                <div class="custom-popup">
                    <h3>${facility.name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${facility.address}</p>
                    <p><i class="fas fa-phone"></i> ${facility.contact || 'N/A'}</p>
                    <a href="${createDirectionsLink({latitude: PASIG_CENTER[0], longitude: PASIG_CENTER[1]}, facility.coordinates)}" 
                       target="_blank" class="popup-directions">
                       <i class="fas fa-directions"></i> Get Directions
                    </a>
                </div>
            `);
        });
    }
    
    // Add police station markers
    if (emergencyFacilities.policeStations && emergencyFacilities.policeStations.length > 0) {
        emergencyFacilities.policeStations.forEach(facility => {
            const marker = L.marker(
                [facility.coordinates.latitude, facility.coordinates.longitude],
                { icon: customIcons.police }
            ).addTo(map);
            
            marker.bindPopup(`
                <div class="custom-popup">
                    <h3>${facility.name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${facility.address}</p>
                    <p><i class="fas fa-phone"></i> ${facility.contact || 'N/A'}</p>
                    <a href="${createDirectionsLink({latitude: PASIG_CENTER[0], longitude: PASIG_CENTER[1]}, facility.coordinates)}" 
                       target="_blank" class="popup-directions">
                       <i class="fas fa-directions"></i> Get Directions
                    </a>
                </div>
            `);
        });
    }
    
    // Add fire station markers
    if (emergencyFacilities.fireStations && emergencyFacilities.fireStations.length > 0) {
        emergencyFacilities.fireStations.forEach(facility => {
            const marker = L.marker(
                [facility.coordinates.latitude, facility.coordinates.longitude],
                { icon: customIcons.fire }
            ).addTo(map);
            
            marker.bindPopup(`
                <div class="custom-popup">
                    <h3>${facility.name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${facility.address}</p>
                    <p><i class="fas fa-phone"></i> ${facility.contact || 'N/A'}</p>
                    <a href="${createDirectionsLink({latitude: PASIG_CENTER[0], longitude: PASIG_CENTER[1]}, facility.coordinates)}" 
                       target="_blank" class="popup-directions">
                       <i class="fas fa-directions"></i> Get Directions
                    </a>
                </div>
            `);
        });
    }
    
    // Add evacuation site markers
    if (emergencyFacilities.evacuationSites && emergencyFacilities.evacuationSites.length > 0) {
        emergencyFacilities.evacuationSites.forEach(facility => {
            const marker = L.marker(
                [facility.coordinates.latitude, facility.coordinates.longitude],
                { icon: customIcons.evacuation }
            ).addTo(map);
            
            marker.bindPopup(`
                <div class="custom-popup">
                    <h3>${facility.name}</h3>
                    <p><i class="fas fa-map-marker-alt"></i> ${facility.address}</p>
                    <p><i class="fas fa-phone"></i> ${facility.contact || 'N/A'}</p>
                    <a href="${createDirectionsLink({latitude: PASIG_CENTER[0], longitude: PASIG_CENTER[1]}, facility.coordinates)}" 
                       target="_blank" class="popup-directions">
                       <i class="fas fa-directions"></i> Get Directions
                    </a>
                </div>
            `);
        });
    }
}

// Add a legend to the map
function addLegendToMap() {
    const legend = L.control({ position: 'bottomright' });
    
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <h4>Legend</h4>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #e74c3c;"></div>
                <span>Hospital</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #3498db;"></div>
                <span>Police Station</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #e67e22;"></div>
                <span>Fire Station</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #2ecc71;"></div>
                <span>Evacuation Site</span>
            </div>
            <div class="legend-item">
                <div class="legend-color" style="background-color: #9b59b6;"></div>
                <span>Your Location</span>
            </div>
        `;
        return div;
    };
    
    legend.addTo(map);
}

// Place a marker on the map at the user's location
function placeUserMarker(coords) {
    // Remove existing marker
    if (marker) {
        map.removeLayer(marker);
    }
    
    // Make sure coordinates are valid numbers
    const validLat = parseFloat(coords[0]);
    const validLng = parseFloat(coords[1]);
    
    if (isNaN(validLat) || isNaN(validLng)) {
        console.error("Invalid coordinates:", coords);
        alert("Invalid location coordinates. Please try again.");
        return;
    }
    
    // Create new marker at selected location
    marker = L.marker([validLat, validLng], { icon: customIcons.user }).addTo(map);
    
    // Add a popup with location information
    marker.bindPopup(`
        <div class="custom-popup">
            <h3>Your Location</h3>
            <p class="location-hint">Click "Find Nearest Emergency Areas" to see results</p>
        </div>
    `).openPopup();
    
    // Store user location in the proper format
    userLocation = {
        latitude: validLat,
        longitude: validLng
    };
    
    // Center the map on the new location with appropriate zoom
    map.setView([validLat, validLng], 15);
    
    // Enable find button
    const findBtn = document.getElementById('find-emergency-btn');
    if (findBtn) {
        findBtn.classList.add('ready');
    }
}

// Find the nearest emergency facilities from the user's location

function findNearestEmergencyAreas() {
    const enterAddressRadio = document.getElementById('enter-address');
    const homeAddressRadio = document.getElementById('home-address');
    
    // Get location from address input, home address, or map pin
    if ((enterAddressRadio && enterAddressRadio.checked) || 
        (homeAddressRadio && homeAddressRadio.checked)) {
        
        const addressInput = document.getElementById('address-input');
        if (!addressInput || !addressInput.value.trim()) {
            alert("Please enter an address in Pasig City");
            return;
        }
        
        fetchCoordinatesFromAddress(addressInput.value.trim()).then(location => {
            if (!location) {
                alert("Could not find coordinates for the entered address. Please try a different address or use the map.");
                return;
            }
            
            // Check if the location is within Pasig City boundaries
            if (isWithinPasigBoundary(location.latitude, location.longitude)) {
                // Set marker and continue
                placeUserMarker([location.latitude, location.longitude]);
                
                // Proceed to find nearest emergency areas
                findNearestEmergencyAreasFromCoords(location);
            } else {
                alert("The entered address is outside Pasig City boundaries. Please enter an address within Pasig City.");
            }
        });
        
        return;
    } else {
        // Use the pinned location
        if (!userLocation) {
            alert("Please click on the map to set your location");
            return;
        }
        
        findNearestEmergencyAreasFromCoords(userLocation);
    }
}

// Find nearest emergency areas from coordinates
function findNearestEmergencyAreasFromCoords(location) {
    // Show loading indicator
    const loadingIndicator = document.getElementById('loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.classList.add('visible');
    }
    
    // Add a small delay to allow UI to update
    setTimeout(() => {
        // Find the nearest facilities (limiting to desired number)
        const nearestHospitals = findNearestFacilities(location, emergencyFacilities.hospitals, 3);
        const nearestPoliceStations = findNearestFacilities(location, emergencyFacilities.policeStations, 3);
        const nearestFireStations = findNearestFacilities(location, emergencyFacilities.fireStations, 3);
        const nearestEvacuationSites = findNearestFacilities(location, emergencyFacilities.evacuationSites, 3);
        
        // Log distances for debugging
        console.log("User location:", location);
        console.log("Nearest hospitals:", nearestHospitals.map(f => `${f.name}: ${f.distance.toFixed(2)} km`));
        console.log("Nearest police stations:", nearestPoliceStations.map(f => `${f.name}: ${f.distance.toFixed(2)} km`));
        console.log("Nearest fire stations:", nearestFireStations.map(f => `${f.name}: ${f.distance.toFixed(2)} km`));
        console.log("Nearest evacuation sites:", nearestEvacuationSites.map(f => `${f.name}: ${f.distance.toFixed(2)} km`));
        
        // Display the results
        displayFacilities('hospitals-list', nearestHospitals, location);
        displayFacilities('police-list', nearestPoliceStations, location);
        displayFacilities('fire-list', nearestFireStations, location);
        displayFacilities('evacuation-list', nearestEvacuationSites, location);
        
        // Hide loading indicator
        if (loadingIndicator) {
            loadingIndicator.classList.remove('visible');
        }
        
        // Show the results container
        const resultsContainer = document.getElementById('results-container');
        if (resultsContainer) {
            resultsContainer.classList.remove('hidden');
            // Scroll to results
            resultsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }, 300);
}

// Display facilities in the specified container
function displayFacilities(containerId, facilities, userLocation) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    container.innerHTML = '';
    
    facilities.forEach(facility => {
        const directionsLink = createDirectionsLink(userLocation, facility.coordinates);
        const formattedDistance = formatDistance(facility.distance);
        
        const facilityCard = document.createElement('div');
        facilityCard.className = 'facility-card';
        facilityCard.innerHTML = `
            <div class="facility-name">${facility.name}</div>
            <div class="facility-address"><i class="fas fa-map-marker-alt"></i> ${facility.address}</div>
            <div class="facility-contact"><i class="fas fa-phone"></i> ${facility.contact || 'N/A'}</div>
            <div class="facility-distance"><i class="fas fa-route"></i> ${formattedDistance} away</div>
            <a href="${directionsLink}" target="_blank" class="direction-link">
                <i class="fas fa-directions"></i> Get Directions
            </a>
        `;
        
        container.appendChild(facilityCard);
        
        // Add click event to show this facility on the map when clicking the card
        facilityCard.addEventListener('click', function() {
            // Center the map on this facility
            map.setView([facility.coordinates.latitude, facility.coordinates.longitude], 16);
            
            // Find and open the popup for this facility
            map.eachLayer(function(layer) {
                if (layer instanceof L.Marker) {
                    const latlng = layer.getLatLng();
                    if (Math.abs(latlng.lat - facility.coordinates.latitude) < 0.0001 && 
                        Math.abs(latlng.lng - facility.coordinates.longitude) < 0.0001) {
                        layer.openPopup();
                    }
                }
            });
        });
    });
}

// Find the nearest facilities from a given location
function findNearestFacilities(userLocation, facilities, count = 3) {
    if (!facilities || !Array.isArray(facilities) || facilities.length === 0) {
        return [];
    }
    
    // Calculate distance for each facility
    const facilitiesWithDistance = facilities.map(facility => {
        const distance = calculateHaversineDistance(userLocation, facility.coordinates);
        return {
            ...facility,
            distance: distance
        };
    });
    
    // Sort by distance (ascending)
    facilitiesWithDistance.sort((a, b) => a.distance - b.distance);
    
    // Return the specified number of nearest facilities
    return facilitiesWithDistance.slice(0, count);
}

// Calculate the distance between two sets of coordinates using the Haversine formula
function calculateHaversineDistance(coord1, coord2) {
    // Earth's radius in kilometers
    const R = 6371;
    
    // Convert latitude and longitude from degrees to radians
    const lat1 = toRadians(coord1.latitude);
    const lon1 = toRadians(coord1.longitude);
    const lat2 = toRadians(coord2.latitude);
    const lon2 = toRadians(coord2.longitude);
    
    // Differences in coordinates
    const dLat = lat2 - lat1;
    const dLon = lon2 - lon1;
    
    // Haversine formula
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    // Distance in kilometers
    const distance = R * c;
    
    return distance;
}

// Convert degrees to radians
function toRadians(degrees) {
    return degrees * (Math.PI / 180);
}

// Create a Google Maps directions link
function createDirectionsLink(start, end) {
    return `https://www.google.com/maps/dir/${start.latitude},${start.longitude}/${end.latitude},${end.longitude}`;
}

// Format distance for display
function formatDistance(distance) {
    // For very short distances, show in meters
    if (distance < 0.1) {
        return `${Math.round(distance * 1000)} meters`;
    }
    // For short distances (under 1km), show in meters
    else if (distance < 1) {
        const meters = Math.round(distance * 1000 / 10) * 10;
        return `${meters} meters`;
    }
    // For distances less than 10km, show one decimal place
    else if (distance < 10) {
        return `${distance.toFixed(1)} km`;
    }
    // For longer distances, round to whole kilometers
    else {
        return `${Math.round(distance)} km`;
    }
}

// Get coordinates from a Pasig City address
function getCoordinatesFromAddress(address) {
    // Try exact match first
    if (pasigAddressCoordinates[address]) {
        return pasigAddressCoordinates[address];
    }
    
    // Try partial match
    for (const [key, coords] of Object.entries(pasigAddressCoordinates)) {
        if (address.includes(key)) {
            return coords;
        }
    }
    
    // If no match, return Pasig City center as fallback
    return { latitude: PASIG_CENTER[0], longitude: PASIG_CENTER[1] };
}