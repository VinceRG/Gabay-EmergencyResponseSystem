document.addEventListener('DOMContentLoaded', () => {
  const chatMessages = document.getElementById('chatMessages');
  const userInput = document.getElementById('userInput');
  const sendButton = document.getElementById('sendButton');
  const weatherInfo = document.getElementById('weatherInfo');
  const currentAlerts = document.getElementById('currentAlerts');

  // Your WeatherAPI credentials
  const apiKey = "d3a5b0469d574841bc780053251104";
  const city = "Pasig,PH";
  const apiUrl = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${city}`;

  function getTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function addMessage(role, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role === 'user' ? 'user-message' : 'bot-message'}`;

    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    
    // Handle markdown formatting from Python response
    if (role === 'bot' && text.includes('\n')) {
      // Replace newlines with <br>
      text = text.replace(/\n/g, '<br>');
      
      // Handle lists
      text = text.replace(/\d+\.\s(.*?)(<br>|$)/g, '<strong>$1</strong>$2');
      
      // Handle bolded text (using **text**)
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      messageText.innerHTML = text;
    } else {
      messageText.textContent = text;
    }

    const timestamp = document.createElement('div');
    timestamp.className = 'timestamp';
    timestamp.textContent = getTime();

    messageDiv.appendChild(messageText);
    messageDiv.appendChild(timestamp);
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
  }

  function sendMessage() {
    const message = userInput.value.trim();
    if (!message) return;

    addMessage('user', message);
    userInput.value = '';

    // Show loading indicator with BERT animation
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message bot-message';
    loadingDiv.innerHTML = `
      <div class="message-text thinking-bert">
        <div class="bert-animation"></div>
        <span>BERT is analyzing your question...</span>
      </div>
    `;
    chatMessages.appendChild(loadingDiv);
    scrollToBottom();

    // Making API request to the Flask backend
    fetch('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    })
      .then(response => {
        if (!response.ok) throw new Error('Network error');
        return response.json();
      })
      .then(data => {
        // Remove loading indicator
        chatMessages.removeChild(loadingDiv);
        
        addMessage('bot', data.response || '⚠️ No response received.');
        
        // Check if the message is weather-related and update weather info
        if (message.toLowerCase().includes('weather') || 
            message.toLowerCase().includes('rain') || 
            message.toLowerCase().includes('flood')) {
          fetchWeatherData();
        }
      })
      .catch(error => {
        // Remove loading indicator
        chatMessages.removeChild(loadingDiv);
        
        console.error(error);
        addMessage('bot', '⚠️ Unable to connect to Gabay. Please check if the server is running.');
      });
  }

  sendButton.addEventListener('click', sendMessage);

  userInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Quick actions
  const quickActions = document.querySelectorAll('.quick-action');
  quickActions.forEach(action => {
    action.addEventListener('click', () => {
      const message = action.getAttribute('data-query');
      userInput.value = message;
      sendMessage();
    });
  });

  // Weather information using real API
  function fetchWeatherData() {
    fetch(apiUrl)
      .then(response => {
        if (!response.ok) throw new Error('Weather API error');
        return response.json();
      })
      .then(data => {
        const weatherData = {
          city: data.location.name,
          condition: data.current.condition.text,
          temperature: `${data.current.temp_c}°C`,
          humidity: `${data.current.humidity}%`,
          feelsLike: `${data.current.feelslike_c}°C`,
          windSpeed: `${data.current.wind_kph} km/h`,
          updated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        
        updateWeatherInfo(weatherData);
        updateWeatherAlerts(weatherData);
      })
      .catch(error => {
        console.error('Error fetching weather data:', error);
        weatherInfo.innerHTML = "Weather information unavailable";
      });
  }

  function updateWeatherInfo(data) {
    weatherInfo.innerHTML = `
      <strong>${data.city}</strong>:<br> ${data.condition}<br>
      Temperature: ${data.temperature} | Feels like: ${data.feelsLike}<br>
      Humidity: ${data.humidity} | Wind: ${data.windSpeed}<br>
      <small>Updated: ${data.updated}</small>
    `;
  }
  
  function updateWeatherAlerts(data) {
    // Check weather conditions to set appropriate alerts
    // This is a simple implementation - in a production system,
    // you would get actual alerts from a weather API
    if (currentAlerts) {
      const condition = data.condition.toLowerCase();
      
      if (condition.includes('rain') || condition.includes('drizzle')) {
        currentAlerts.innerHTML = "<strong style='color: #FFC107;'>⚠️ YELLOW ALERT:</strong> Light rainfall detected. Monitor updates if you're in flood-prone areas.";
      } 
      else if (condition.includes('thunder') || condition.includes('heavy rain')) {
        currentAlerts.innerHTML = "<strong style='color: #FF9800;'>🚨 ORANGE ALERT:</strong> Heavy rainfall expected. Flooding possible in low-lying areas.";
      }
      else if (condition.includes('storm') || condition.includes('typhoon')) {
        currentAlerts.innerHTML = "<strong style='color: #F44336;'>🚨 RED ALERT:</strong> Severe weather conditions. Stay indoors and follow evacuation orders if issued.";
      }
      else {
        currentAlerts.innerHTML = "No active alerts for Pasig City at this time.";
      }
    }
  }

  // Load weather data immediately
  fetchWeatherData();
  
  // Refresh weather every 30 minutes
  setInterval(fetchWeatherData, 30 * 60 * 1000);

  // Initial greeting with BERT badge
  addMessage('bot', "Hello! I'm Gabay, your disaster response assistant for Pasig City powered by BERT technology. How can I help you today?");
});