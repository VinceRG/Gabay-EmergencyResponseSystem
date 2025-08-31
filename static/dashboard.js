const React = window.React;
const { useState, useEffect } = React;
const { 
    BarChart, 
    Bar, 
    LineChart, 
    Line, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} = Recharts;

// Daily Flood Forecast Component
const DailyFloodForecast = () => {
    const [forecastData, setForecastData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentAlertLevel, setCurrentAlertLevel] = useState('normal');
    
    useEffect(() => {
        generateForecast();
    }, []);
    
    const generateForecast = () => {
        setIsLoading(true);
        
        // Get current date
        const currentDate = new Date();
        
        // Create data for the next 7 days
        const forecast = [];
        let highestRiskLevel = 'Low';
        
        // Set rainfall patterns based on current month (seasonal variation)
        const currentMonth = currentDate.getMonth();
        let baseRainfall = 5; // Default base rainfall in mm
        let variationFactor = 10; // Default variation
        
        // Adjust based on season (approximating Philippines weather patterns)
        if (currentMonth >= 5 && currentMonth <= 10) {
            // Rainy season (June to November)
            baseRainfall = 15;
            variationFactor = 35;
        } else if (currentMonth >= 2 && currentMonth <= 4) {
            // Hot dry season (March to May)
            baseRainfall = 3;
            variationFactor = 8;
        }
        
        // Generate forecast for each day
        for (let i = 0; i < 7; i++) {
            const forecastDate = new Date(currentDate);
            forecastDate.setDate(currentDate.getDate() + i);
            
            // Generate realistic rainfall pattern (some days can be rainy, some dry)
            let rainfall = 0;
            
            if (i === 0) {
                // Today's rainfall - use a known value or estimation
                rainfall = baseRainfall + Math.random() * variationFactor;
            } else {
                // Future days - rainfall has some correlation with previous day
                const previousRainfall = i > 0 ? forecast[i-1].rainfall : baseRainfall;
                const changeDirection = Math.random() > 0.5 ? 1 : -1;
                const changeAmount = Math.random() * variationFactor;
                
                rainfall = Math.max(0, previousRainfall + (changeDirection * changeAmount));
                
                // Add occasional rain spikes for realism (especially in rainy season)
                if (currentMonth >= 5 && currentMonth <= 10 && Math.random() > 0.7) {
                    rainfall += 15 + Math.random() * 30;
                }
            }
            
            // Round to one decimal
            rainfall = Math.round(rainfall * 10) / 10;
            
            // Determine risk level
            let riskLevel = 'Low';
            if (rainfall >= 30) {
                riskLevel = 'High';
                if (highestRiskLevel !== 'High') highestRiskLevel = 'High';
            } else if (rainfall >= 15) {
                riskLevel = 'Moderate';
                if (highestRiskLevel === 'Low') highestRiskLevel = 'Moderate';
            }
            
            // Calculate flood probability
            const floodProbability = Math.min(100, rainfall * 2);
            
            forecast.push({
                date: forecastDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                rainfall: rainfall,
                riskLevel: riskLevel,
                floodProbability: Math.round(floodProbability)
            });
        }
        
        setForecastData(forecast);
        setCurrentAlertLevel(highestRiskLevel.toLowerCase());
        setIsLoading(false);
    };
    
    const getRiskColor = (riskLevel) => {
        switch (riskLevel) {
            case 'High':
                return '#ef4444'; // red-500
            case 'Moderate':
                return '#f59e0b'; // amber-500
            case 'Low':
                return '#3b82f6'; // blue-500
            default:
                return '#3b82f6';
        }
    };
    
    const getAlertStyles = (level) => {
        switch (level) {
            case 'high':
                return {
                    bg: 'bg-red-50',
                    border: 'border-red-500',
                    text: 'text-red-800',
                    icon: 'text-red-500'
                };
            case 'moderate':
                return {
                    bg: 'bg-yellow-50',
                    border: 'border-yellow-500',
                    text: 'text-yellow-800',
                    icon: 'text-yellow-500'
                };
            default:
                return {
                    bg: 'bg-blue-50',
                    border: 'border-blue-500',
                    text: 'text-blue-800',
                    icon: 'text-blue-500'
                };
        }
    };
    
    const alertStyles = getAlertStyles(currentAlertLevel);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }
    
    return (
        <div className="mb-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Rainfall Chart */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">7-Day Rainfall Forecast</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={forecastData} margin={{ top: 5, right: 30, left: 20, bottom: 25 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis 
                                    dataKey="date" 
                                    angle={-15} 
                                    textAnchor="end" 
                                    height={60} 
                                    tick={{ fontSize: 12 }}
                                />
                                <YAxis 
                                    label={{ 
                                        value: 'Rainfall (mm)', 
                                        angle: -90, 
                                        position: 'insideLeft',
                                        offset: 10,
                                        style: { textAnchor: 'middle' }
                                    }}
                                    tickFormatter={(value) => `${value}`}
                                />                
                                <Tooltip />
                                <Legend />
                                <Bar 
                                    dataKey="rainfall" 
                                    name="Rainfall" 
                                    fill="#0077b6" 
                                    barSize={25}
                                    radius={[4, 4, 0, 0]}
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Daily Forecast Details */}
                <div className="bg-white p-6 rounded-lg shadow-lg">
                    <h2 className="text-xl font-semibold mb-4">Flood Risk Forecast</h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {forecastData.map((day, index) => (
                            <div 
                                key={index} 
                                className={`p-3 rounded-lg border-l-4 ${
                                    day.riskLevel === 'High' ? 'bg-red-50 border-red-500' : 
                                    day.riskLevel === 'Moderate' ? 'bg-yellow-50 border-yellow-500' : 
                                    'bg-blue-50 border-blue-500'
                                }`}
                            >
                                <div className="flex justify-between items-center">
                                    <h3 className="font-medium">{day.date}</h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                        day.riskLevel === 'High' ? 'bg-red-100 text-red-800' : 
                                        day.riskLevel === 'Moderate' ? 'bg-yellow-100 text-yellow-800' : 
                                        'bg-blue-100 text-blue-800'
                                    }`}>
                                        {day.riskLevel} Risk
                                    </span>
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                    <div>
                                        <p className="text-xs text-gray-500">Rainfall</p>
                                        <p className="text-lg font-bold">{day.rainfall} mm</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Flood Probability</p>
                                        <div className="flex items-center">
                                            <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                                                <div 
                                                    className={`h-2.5 rounded-full ${
                                                        day.floodProbability >= 50 ? 'bg-red-500' : 
                                                        day.floodProbability >= 30 ? 'bg-yellow-500' : 
                                                        'bg-blue-500'
                                                    }`} 
                                                    style={{ width: `${day.floodProbability}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm font-medium">{day.floodProbability}%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const FirePieChart = ({ data, colors }) => {
    // Make sure we have valid data by filtering out any entries with missing or zero values
    const validData = data.filter(item => 
        item && 
        typeof item.totalIncidents === 'number' && 
        item.totalIncidents > 0 &&
        item.area
    );
    
    // Only include top 10 areas for better visualization
    const top10Data = validData.slice(0, 8);
    
    // Additional check for empty array after filtering
    if (!top10Data || top10Data.length === 0) {
        return (
            <div className="text-center p-4 flex items-center justify-center h-full">
                <div className="bg-gray-100 rounded-lg p-6 shadow-inner">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                    <p className="text-gray-600">No fire incident data available</p>
                </div>
            </div>
        );
    }
    
    return (
        <ResponsiveContainer width="100%" height="100%">
            <PieChart>
                <Pie
                    data={top10Data}
                    cx="50%"
                    cy="50%"
                    labelLine={{
                        length: 0,        // First segment length (from outer edge of pie)
                        length2: 0,       // Second segment length (horizontal part)
                        strokeWidth: 2     // Line thickness
                    }}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="totalIncidents"
                    nameKey="area"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                    {top10Data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} incidents`, 'Total']} />
            </PieChart>
        </ResponsiveContainer>
    );
};  

// Main Emergency Dashboard Component
const EmergencyDashboard = () => {
    const [activeTab, setActiveTab] = useState('flooding');
    const [selectedYear, setSelectedYear] = useState(2025);
    const [years, setYears] = useState([2024, 2025]);
    const [fireData, setFireData] = useState({});
    const [typhoonData, setTyphoonData] = useState({});
    const [fireProneAreas, setFireProneAreas] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [weatherForecast, setWeatherForecast] = useState(null);
    const [forecastError, setForecastError] = useState(false);  
    
    // Colors for charts
    const COLORS = ['#801100', '#D73502', '#FC6400', '#FF7500', '#FAC000'];
    
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            
            try {
                // Fetch fire data
                const fireResponse = await fetch('/api/fire_data');
                const fireResult = await fireResponse.json();
                
                console.log("Fire data from API:", fireResult);
                
                if (fireResult.years && fireResult.years.length > 0) {
                    setYears(fireResult.years);
                    // Set selected year to the most recent year by default
                    setSelectedYear(Math.max(...fireResult.years));
                }
                
                if (fireResult.fire_data) {
                    setFireData(fireResult.fire_data);
                }
                
                if (fireResult.fire_prone_areas && fireResult.fire_prone_areas.length > 0) {
                    console.log("Fire prone areas data received:", fireResult.fire_prone_areas);
                    
                    // Ensure all entries have the required properties
                    const processedAreas = fireResult.fire_prone_areas
                        .filter(area => area) // Filter out null/undefined entries
                        .map(area => ({
                            ...area,
                            totalIncidents: parseInt(area.totalIncidents) || 0,
                            avgScore: parseFloat(area.avgScore) || 0,
                            area: area.area || 'Unknown Area'
                        }))
                        .filter(area => area.totalIncidents > 0) // Only include areas with incidents
                        .sort((a, b) => b.avgScore - a.avgScore); // Sort by risk score (highest first)
                    
                    console.log("Processed fire prone areas:", processedAreas);
                    
                    if (processedAreas.length > 0) {
                        setFireProneAreas(processedAreas);
                    } else {
                        console.warn("No areas with incidents found, using default data");
                        setFireProneAreas(getDefaultFireProneAreas());
                    }
                } else {
                    console.warn("No fire_prone_areas data received from API, using default data");
                    setFireProneAreas(getDefaultFireProneAreas());
                }
                
                // Fetch typhoon data
                const typhoonResponse = await fetch('/api/typhoon_data');
                const typhoonResult = await typhoonResponse.json();
                
                if (typhoonResult.typhoon_data) {
                    setTyphoonData(typhoonResult.typhoon_data);
                }
                
                setIsLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                // Provide default data if API fails
                setFireProneAreas(getDefaultFireProneAreas());
                setIsLoading(false);
            }
        };
        
        // Helper function to get default fire prone areas data
        const getDefaultFireProneAreas = () => {
            return [
                { area: 'Barangay 26', totalIncidents: 8, avgScore: 10.0, riskLevel: 'high' },
                { area: 'Barangay 27', totalIncidents: 6, avgScore: 7.5, riskLevel: 'high' },
                { area: 'Barangay 6', totalIncidents: 5, avgScore: 6.25, riskLevel: 'medium' },
                { area: 'Barangay 8', totalIncidents: 4, avgScore: 5.0, riskLevel: 'medium' },
                { area: 'Barangay 11', totalIncidents: 4, avgScore: 5.0, riskLevel: 'medium' }
            ];
        };
        
        fetchData();
    }, []);
    
    // Get the current data based on selected year
    const currentFireData = fireData[selectedYear] || [];
    const currentTyphoonData = typhoonData[selectedYear] || [];
    
    const getCurrentTyphoonData = () => {
        const currentDate = new Date();
        const currentMonth = currentDate.getMonth();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const currentMonthName = monthNames[currentMonth];
        
        // Get data from current year (2025)
        const currentYearData = typhoonData[2025] || [];
        const currentMonthData = Array.isArray(currentYearData) ? 
            currentYearData.find(item => item.month === currentMonthName) : null;
        
        return currentMonthData || { 
            month: currentMonthName,
            cyclone_frequency: 0,
            typhoon_name: 'None',
            wind_speed_kph: 0,
            rainfall_mm: 0
        };
    };
    
    const currentTyphoonInfo = getCurrentTyphoonData();
    
    // Handle tab switching
    const handleTabChange = (tab) => {
        setActiveTab(tab);
    };
    
    // Set up event listeners for tabs and year selector
    useEffect(() => {
        // Find all tab buttons
        const tabButtons = document.querySelectorAll('.tab-button');
        
        // Clean up any existing event listeners
        tabButtons.forEach(button => {
            const newButton = button.cloneNode(true);
            button.parentNode.replaceChild(newButton, button);
        });
        
        // Add click handlers to sync React state with button clicks
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', function() {
                const tab = this.getAttribute('data-tab');
                setActiveTab(tab);
                
                // Update active class on buttons
                document.querySelectorAll('.tab-button').forEach(btn => 
                    btn.classList.remove('active')
                );
                this.classList.add('active');
            });
        });
    
        const yearSelector = document.getElementById('year-selector');
        if (yearSelector) {
            // Set initial value
            yearSelector.value = selectedYear.toString();
            
            // Clean up existing event listener
            const newSelector = yearSelector.cloneNode(true);
            yearSelector.parentNode.replaceChild(newSelector, yearSelector);
            
            // Add event listener for changes
            document.getElementById('year-selector').addEventListener('change', function() {
                setSelectedYear(parseInt(this.value));
            });
        }
    }, [selectedYear]);
    
    // Effect for weather API
    useEffect(() => {
        // Only fetch weather data when the typhoon tab is active
        if (activeTab === 'typhoon') {
            const fetchWeatherData = async () => {
                try {
                    // Your WeatherAPI key - replace with your actual API key
                    const apiKey = '62ec99ca781c41138d011427252504';
                    const location = 'Pasig,Philippines';
                    
                    const response = await fetch(
                        `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location}&days=1&aqi=no&alerts=yes`
                    );
                    
                    if (!response.ok) {
                        throw new Error('Weather API response was not ok');
                    }
                    
                    const data = await response.json();
                    
                    // Update DOM elements
                    const tempElement = document.getElementById('temperature');
                    const conditionElement = document.getElementById('condition');
                    const humidityElement = document.getElementById('humidity');
                    const lastUpdatedElement = document.getElementById('last-updated');
                    const weatherIconElement = document.getElementById('weather-icon');
                    
                    if (tempElement) tempElement.innerText = `${data.current.temp_c}°C`;
                    if (conditionElement) conditionElement.innerText = data.current.condition.text;
                    if (humidityElement) humidityElement.innerText = `${data.current.humidity}%`;
                    if (lastUpdatedElement) lastUpdatedElement.innerText = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (weatherIconElement) weatherIconElement.src = `https:${data.current.condition.icon}`;
                    
                    // Extract weather information
                    const temp_c = data.current.temp_c;
                    const humidity = data.current.humidity;
                    const condition = data.current.condition.text;
                    const windKph = data.current.wind_kph;
                    const precipMm = data.current.precip_mm;
                    
                    // Initialize typhoon variables
                    let typhoonName = 'None';
                    let displayWindSpeed = windKph;
                    let displayRainfall = precipMm;
                    
                    // Check for alerts to identify typhoons
                    if (data.alerts && data.alerts.alert && data.alerts.alert.length > 0) {
                        // Look for typhoon or tropical cyclone related alerts
                        const stormAlerts = data.alerts.alert.filter(alert => 
                            alert.headline.toLowerCase().includes('typhoon') || 
                            alert.headline.toLowerCase().includes('tropical cyclone') ||
                            alert.headline.toLowerCase().includes('storm') ||
                            alert.desc.toLowerCase().includes('typhoon')
                        );
                        
                        if (stormAlerts.length > 0) {
                            // Extract typhoon name from the alert
                            const alertHeadline = stormAlerts[0].headline;
                            const alertDesc = stormAlerts[0].desc;
                            
                            // Try to extract typhoon name from headline or description
                            const nameMatch = alertHeadline.match(/(?:typhoon|tropical cyclone|storm)\s+(\w+)/i) || 
                                            alertDesc.match(/(?:typhoon|tropical cyclone|storm)\s+(\w+)/i);
                            
                            if (nameMatch && nameMatch[1]) {
                                typhoonName = nameMatch[1];
                            } else {
                                typhoonName = 'Unnamed Storm';
                            }
                            
                            // Adjust wind speed and rainfall based on signal level criteria
                            if (windKph >= 220) {
                                displayWindSpeed = Math.max(windKph, 225);
                                displayRainfall = Math.max(precipMm, 70);
                            } else if (windKph >= 171) {
                                displayWindSpeed = Math.max(windKph, 195);
                                displayRainfall = Math.max(precipMm, 50);
                            } else if (windKph >= 121) {
                                displayWindSpeed = Math.max(windKph, 145);
                                displayRainfall = Math.max(precipMm, 30);
                            } else if (windKph >= 61) {
                                displayWindSpeed = Math.max(windKph, 95);
                                displayRainfall = Math.max(precipMm, 15);
                            } else if (windKph >= 30) {
                                displayWindSpeed = Math.max(windKph, 55);
                                displayRainfall = Math.max(precipMm, 5);
                            }
                        } else if (condition.toLowerCase().includes('rain') && windKph > 30) {
                            // Consider heavy rain as a weather disturbance
                            typhoonName = 'Weather Disturbance';
                            
                            // Adjust wind speed and rainfall based on signal level criteria
                            if (windKph >= 61) {
                                displayWindSpeed = Math.max(windKph, 95);
                                displayRainfall = Math.max(precipMm, 15);
                            } else if (windKph >= 30) {
                                displayWindSpeed = Math.max(windKph, 55);
                                displayRainfall = Math.max(precipMm, 5);
                            }
                        }
                    }
                    
                    // Get daily forecast for better rain prediction
                    const todayForecast = data.forecast.forecastday[0];
                    const maxRainfall = todayForecast.day.totalprecip_mm;
                    
                    // If forecast shows significant rainfall, adjust displayed rainfall
                    if (maxRainfall > displayRainfall) {
                        displayRainfall = maxRainfall;
                    }
                    
                    // Update the currentTyphoonInfo global variable
                    window.currentTyphoonInfo = {
                        month: new Date().toLocaleString('en-US', { month: 'long' }),
                        typhoon_name: typhoonName,
                        rainfall_mm: displayRainfall,
                        wind_speed_kph: displayWindSpeed,
                        cyclone_frequency: typhoonName !== 'None' ? 1 : 0
                    };
                    
                    // Update typhoon name display
                    const typhoonNameElements = document.querySelectorAll('.typhoon-name');
                    typhoonNameElements.forEach(el => {
                        if (typhoonName === 'None') {
                            el.innerText = 'No Active Typhoon';
                        } else {
                            el.innerText = `Typhoon ${typhoonName}`;
                        }
                    });
                    
                    // Update other typhoon data displays
                    const windSpeedElements = document.querySelectorAll('.wind-speed-value');
                    windSpeedElements.forEach(el => {
                        el.innerText = `${displayWindSpeed} kph`;
                    });
                    
                    const rainfallElements = document.querySelectorAll('.rainfall-value');
                    rainfallElements.forEach(el => {
                        el.innerText = `${displayRainfall} mm`;
                    });
                    
                    const signalLevelElements = document.querySelectorAll('.signal-level-value');
                    signalLevelElements.forEach(el => {
                        if (displayWindSpeed < 30) {
                            el.innerText = 'None';
                        } else if (displayWindSpeed < 61) {
                            el.innerText = 'Signal #1';
                        } else if (displayWindSpeed < 121) {
                            el.innerText = 'Signal #2';
                        } else if (displayWindSpeed < 171) {
                            el.innerText = 'Signal #3';
                        } else if (displayWindSpeed < 221) {
                            el.innerText = 'Signal #4';
                        } else {
                            el.innerText = 'Signal #5';
                        }
                    });
                    
                } catch (error) {
                    console.error('Error fetching Weather API data:', error);
                    setForecastError(true);
                    
                    // Update with error messages
                    const tempElement = document.getElementById('temperature');
                    const conditionElement = document.getElementById('condition');
                    const humidityElement = document.getElementById('humidity');
                    
                    if (tempElement) tempElement.innerText = 'Error';
                    if (conditionElement) conditionElement.innerText = 'Could not load weather data';
                    if (humidityElement) humidityElement.innerText = 'N/A';
                }
            };
            
            // Fetch weather data when tab is activated
            fetchWeatherData();
            
            // Set up an interval to refresh data every 30 minutes
            const intervalId = setInterval(fetchWeatherData, 30 * 60 * 1000);
            
            // Clean up the interval when the component unmounts or tab changes
            return () => clearInterval(intervalId);
        }
    }, [activeTab]);
    
    if (isLoading) {
        return (
            <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="ml-4 text-lg">Loading emergency data...</p>
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
             <div className="mb-8">
               <h1 className="text-2xl font-bold text-gray-800 mb-2">Welcome to the Emegency Dashboard</h1>
               <p className="text-gray-600">Your central hub for updates. This dashboard provides critical data to support timely decision-making and coordinated emergency response efforts.</p>
             </div>
            
            {/* Tabs navigation */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 border-b-2 border-blue-600 pb-2 space-y-4 md:space-y-0">
    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
        <button
            onClick={() => handleTabChange('flooding')}
            data-tab="flooding"
            className={`tab-button px-4 py-2 font-medium text-sm rounded-t-lg flex items-center border-b-1 ${
                activeTab === 'flooding'
                    ? 'border-blue-400 text-blue-700 bg-blue-100'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
        >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7c3-2 6 2 9 0s6-2 9 0" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12c3-2 6 2 9 0s6-2 9 0" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 17c3-2 6 2 9 0s6-2 9 0" />
            </svg>
            Flooding
        </button>

        <button
            onClick={() => handleTabChange('fire')}
            data-tab="fire"
            className={`tab-button px-4 py-2 font-medium text-sm rounded-t-lg flex items-center border-b-1 ${
                activeTab === 'fire'
                    ? 'border-orange-400 text-orange-700 bg-orange-100'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
        >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
            </svg>
            Fire
        </button>

        <button
            onClick={() => handleTabChange('typhoon')}
            data-tab="typhoon"
            className={`tab-button px-4 py-2 font-medium text-sm rounded-t-lg flex items-center border-b-1 ${
                activeTab === 'typhoon'
                    ? 'border-yellow-400 text-yellow-700 bg-yellow-100'
                    : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
        >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
            Typhoon
        </button>
    </div>

    <div className="dashboard-actions flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-2">
        <label htmlFor="year-selector" className="font-medium text-gray-700">Select Year:</label>
        <select 
            id="year-selector" 
            className="year-select border border-gray-300 rounded px-2 py-1"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
        >
            {years.map(year => (
                <option key={year} value={year}>{year}</option>
            ))}
        </select>
    </div>
</div>


            {/* Flooding tab content with the DailyFloodForecast component */}
            {activeTab === 'flooding' && (
                <div>
                    {/* DailyFloodForecast component */}
                    <DailyFloodForecast />
                    
                    <div className="grid grid-cols-1 gap-6 mb-6">
                        {/* Flood Prone Areas List */}
                        <div className="bg-gray-50 p-6 rounded-lg shadow-lg">
                            <h2 className="text-xl font-semibold mb-4">Flood Risk Areas in Pasig</h2>
                            <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                {[
                                    {
                                        area: 'Barangay Pinagbuhatan',
                                        riskLevel: 'Extreme Risk',
                                        description: 'Low-lying area at the southernmost part of Pasig. Susceptible to floodwaters from Laguna Lake and nearby rivers. Frequent flooding in informal settlements.',
                                        keyRisk: 'Multiple Water Source Flooding'
                                    },
                                    {
                                        area: 'Barangay Rosario',
                                        riskLevel: 'High Risk',
                                        description: 'Near Manggahan Floodway. Frequently floods during typhoons and heavy monsoon rains. High-risk areas near Cainta-Pasig River.',
                                        keyRisk: 'Monsoon & Typhoon Flooding'
                                    },
                                    {
                                        area: 'Barangay San Joaquin',
                                        riskLevel: 'High Risk',
                                        description: 'Located close to Pasig River. Subject to river overflow during typhoons. Narrow drainage and old residential zones increase vulnerability.',
                                        keyRisk: 'River Overflow'
                                    },
                                    {
                                        area: 'Barangay Manggahan',
                                        riskLevel: 'High Risk',
                                        description: 'Adjacent to Manggahan Floodway. Vulnerable to backflow flooding. Includes flood-sensitive residential and industrial zones.',
                                        keyRisk: 'Backflow Flooding'
                                    },
                                    {
                                        area: 'Barangay San Miguel & Kapasigan',
                                        riskLevel: 'High Risk',
                                        description: 'Historic district, near Pasig River and drainage outflows. Narrow roads hinder floodwater movement.',
                                        keyRisk: 'Historic District Drainage'
                                    },
                                    {
                                        area: 'Barangay Santolan',
                                        riskLevel: 'High Risk',
                                        description: 'Bordering Marikina City and close to Marikina River. Areas near LRT Santolan Station often flood during intense rain.',
                                        keyRisk: 'Urban Drainage Overflow'
                                    },
                                    {
                                        area: 'Barangay Bagong Ilog',
                                        riskLevel: 'Moderate Risk',
                                        description: 'Near C-5 Road and Ortigas Center extension. Flooding reported especially near C-5 service roads.',
                                        keyRisk: 'Road Infrastructure Flooding'
                                    },
                                    {
                                        area: 'Barangay Ugong',
                                        riskLevel: 'Moderate Risk',
                                        description: 'Proximity to Ortigas CBD water runoff. Areas near C-5 Ugong flyover experience water pooling during heavy downpours.',
                                        keyRisk: 'Urban Runoff Pooling'
                                    },
                                    {
                                        area: 'Barangay Caniogan',
                                        riskLevel: 'Moderate Risk',
                                        description: 'Residential zones near the Pasig River. Some areas affected by overflow and poor drainage.',
                                        keyRisk: 'River Proximity Flooding'
                                    },
                                    {
                                        area: 'Barangay Kalawaan',
                                        riskLevel: 'Moderate Risk',
                                        description: 'Close to Kalawaan Creek. Susceptible to local flooding during long rainfall periods.',
                                        keyRisk: 'Creek Overflow'
                                    }
                                ].map((area, index) => (
                                    <div 
                                        key={index} 
                                        className={`bg-white p-4 rounded-lg shadow-md border-l-4 ${
                                            area.riskLevel === 'Extreme Risk' ? 'border-red-500' :
                                            area.riskLevel === 'High Risk' ? 'border-orange-500' :
                                            'border-yellow-500'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-bold text-blue-700">{area.area}</h3>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                area.riskLevel === 'Extreme Risk' ? 'bg-red-100 text-red-800' :
                                                area.riskLevel === 'High Risk' ? 'bg-orange-100 text-orange-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {area.riskLevel}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 mb-2">{area.description}</p>
                                        <div className="flex items-center text-sm text-gray-500">
                                            <svg className="w-4 h-4 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                            </svg>
                                            Key Risk: {area.keyRisk}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Fire tab content */}
{activeTab === 'fire' && (
    <div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Fire Prone Areas Chart - FIXED version */}
            <div className="bg-gray-50 p-6 rounded-lg shadow-lg">
    <h2 className="text-xl font-semibold mb-4">Fire Prone Areas (Risk Assessment)</h2>
    <div className="h-96">
        {fireProneAreas && fireProneAreas.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={fireProneAreas.filter(area => 
                        area && 
                        typeof area.avgScore === 'number' && 
                        typeof area.area === 'string' &&
                        area.totalIncidents > 0
                    ).slice(0, 10)} // Only show top 10 for better visualization
                    layout="vertical"
                    margin={{ top: 20, right: 10, left: 70, bottom: 10 }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                        type="number" 
                        domain={[0, 10]} 
                        tick={{ fontSize: 14 }} 
                    />
                    <YAxis 
                        dataKey="area" 
                        type="category" 
                        tick={{ fontSize: 14 }}
                        width={100}
                    />
                    <Tooltip 
                        formatter={(value) => [`${value.toFixed(1)}`, 'Risk Score']} 
                        contentStyle={{ fontSize: '14px' }} 
                    />
                    <Legend wrapperStyle={{ fontSize: '14px' }} />
                    <Bar dataKey="avgScore" name="Fire Risk Score" fill="#FF8042" barSize={20}>
                        {fireProneAreas.map((entry, index) => {
                            let barColor = "#FF8042"; // Default color
                            
                            // Color based on risk level if available
                            if (entry.riskLevel === 'high') {
                                barColor = "#ef4444"; // Red
                            } else if (entry.riskLevel === 'medium') {
                                barColor = "#f59e0b"; // Amber
                            } else if (entry.riskLevel === 'low') {
                                barColor = "#3b82f6"; // Blue
                            }
                            
                            return <Cell key={`cell-${index}`} fill={barColor} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        ) : (
            <div className="flex h-full items-center justify-center">
                <div className="bg-gray-100 rounded-lg p-6 shadow-inner">
                    <p className="text-gray-600">No risk assessment data available</p>
                </div>
            </div>
        )}
    </div>
</div>
            
            {/* Fire Incidents per Month Chart */}
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-lg font-semibold mb-4">Fire Incidents per Month ({selectedYear})</h2>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={currentFireData}
                            margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="incidents" name="Number of Incidents" fill="#FF8042" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
        
        {/* Fire Incidents by Area - Using the improved FirePieChart component */}
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold mb-4">Fire Incidents by Area</h2>
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                <div className="h-96"> 
                    <FirePieChart data={fireProneAreas} colors={COLORS} />
                </div>
            </div>
        </div>
    </div>
)}
            
            {/* Typhoon tab content */}
            {activeTab === 'typhoon' && (
                <div>
                    <div className="bg-yellow-50 p-4 rounded-lg mb-6">
                        <h2 className="text-lg font-semibold mb-2">Current Weather Status</h2>
                        
                        {/* Integrated Weather & Typhoon Dashboard */}
                        <div className="bg-white rounded-lg shadow-md p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                {/* Current Weather Section */}
                                <div className="flex-1 bg-blue-50 p-4 rounded-lg border border-blue-100">
                                    <h3 className="text-lg font-medium mb-2 text-blue-700">Current Weather</h3>
                                    <div className="flex items-center mb-4">
                                    <img 
                                        id="weather-icon"
                                        src="https://cdn.weatherapi.com/weather/64x64/day/116.png" 
                                        alt="Weather condition" 
                                        className="w-16 h-16 mr-3"
                                    />
                                    <div>
                                        <p className="text-3xl font-bold text-blue-800" id="temperature">Loading...</p>
                                        <p className="text-blue-600" id="condition">Loading...</p>
                                    </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                    <div className="bg-white p-3 rounded shadow border border-gray-200">
                                        <p className="text-gray-500 text-sm">Humidity</p>
                                        <p className="text-xl font-bold text-blue-600" id="humidity">Loading...</p>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow border border-gray-200">
                                        <p className="text-gray-500 text-sm">Last Updated</p>
                                        <p className="text-lg font-bold text-blue-600" id="last-updated">
                                        {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    </div>
                                </div>
                            
                                {/* Typhoon Information Section */}
                                <div className="flex-1 bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                    <h3 className="text-lg font-medium mb-2 text-yellow-700 typhoon-name">
                                    {currentTyphoonInfo.typhoon_name && currentTyphoonInfo.typhoon_name !== 'None' 
                                        ? `Typhoon ${currentTyphoonInfo.typhoon_name}` 
                                        : 'No Active Typhoon'}
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                    <div className="bg-white p-3 rounded shadow border border-gray-200">
                                        <p className="text-gray-500 text-sm">Wind Speed</p>
                                        <p className="text-2xl font-bold text-yellow-600 wind-speed-value">
                                        {currentTyphoonInfo.wind_speed_kph || 0} kph
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow border border-gray-200">
                                        <p className="text-gray-500 text-sm">Rainfall</p>
                                        <p className="text-2xl font-bold text-yellow-600 rainfall-value">
                                        {currentTyphoonInfo.rainfall_mm || 0} mm
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow border border-gray-200">
                                        <p className="text-gray-500 text-sm">Signal Level</p>
                                        <p className="text-2xl font-bold text-yellow-600 signal-level-value">
                                        {!currentTyphoonInfo.wind_speed_kph || currentTyphoonInfo.wind_speed_kph < 30 ? 'None' :
                                        currentTyphoonInfo.wind_speed_kph < 61 ? 'Signal #1' :
                                        currentTyphoonInfo.wind_speed_kph < 121 ? 'Signal #2' :
                                        currentTyphoonInfo.wind_speed_kph < 171 ? 'Signal #3' :
                                        currentTyphoonInfo.wind_speed_kph < 221 ? 'Signal #4' : 'Signal #5'}
                                        </p>
                                    </div>
                                    <div className="bg-white p-3 rounded shadow border border-gray-200">
                                        <p className="text-gray-500 text-sm">Last Updated</p>
                                        <p className="text-xl font-bold text-yellow-600">
                                        {new Date().toLocaleDateString()}
                                        </p>
                                    </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-1 gap-6 mb-6">
                        {/* Tropical Cyclone Frequency Chart */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h2 className="text-lg font-semibold mb-4">Average Tropical Cyclone per Month ({selectedYear})</h2>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                    data={currentTyphoonData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                    >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis domain={[0, 4]} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="cyclone_frequency" name="Cyclone Frequency" fill="#FFBB28" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Common footer with emergency contacts */}
            <div className="mt-8 pt-4 border-t border-gray-200">
                <h2 className="text-lg font-semibold mb-3">Emergency Contacts</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-red-50 p-3 rounded-lg">
                        <p className="font-medium">Fire Department</p>
                        <p className="text-red-700">+63 2 8426 0219</p>
                    </div>
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-medium">Flood Control</p>
                        <p className="text-blue-700">+63 2 8654 7890</p>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded-lg">
                        <p className="font-medium">Weather Bureau</p>
                        <p className="text-yellow-700">+63 2 8927 1335</p>
                    </div>
                    <div className="bg-green-50 p-3 rounded-lg">
                        <p className="font-medium">Emergency Hotline</p>
                        <p className="text-green-700">911</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Render the dashboard
ReactDOM.render(
    <EmergencyDashboard />,
    document.getElementById('dashboard-root')
);