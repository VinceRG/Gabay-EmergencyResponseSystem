// Global variables
let currentTable = 'police_stations';

// Column order for display
const columnOrder = ['id', 'name', 'address', 'contact', 'latitude', 'longitude'];

// Event Listeners
document.addEventListener('DOMContentLoaded', function () {
  // Automatically load police station data when the page loads
  loadData();
  
  const addForm = document.getElementById('addForm');
  if (addForm) {
    addForm.addEventListener('submit', function (e) {
      e.preventDefault();
      addRecord();
    });
  }

  const editForm = document.getElementById('editForm');
  if (editForm) {
    editForm.addEventListener('submit', function (e) {
      e.preventDefault();
      updateRecord();
    });
  }
  
  // Set the table select dropdown to police_stations if it exists
  const tableSelect = document.getElementById('tableSelect');
  if (tableSelect) {
    tableSelect.value = 'police_stations';
  }
});

// Function to load data from the selected table
function loadData() {
  // Hide the add form if visible
  const addFormContainer = document.getElementById('addFormContainer');
  if (addFormContainer) {
    addFormContainer.classList.add('hidden');
  }

  // Hide the edit form if visible
  const editFormContainer = document.getElementById('editFormContainer');
  if (editFormContainer) {
    editFormContainer.classList.add('hidden');
  }

  // Show the data table container
  const dataContainer = document.getElementById('dataContainer');
  if (dataContainer) {
    dataContainer.classList.remove('hidden');
  }

  // Get the selected table from dropdown if it exists, otherwise use the default
  const tableSelect = document.getElementById('tableSelect');
  if (tableSelect) {
    currentTable = tableSelect.value;
  }
  // else use the default 'police_stations'

  document.getElementById('dataContainer').innerHTML = '<div class="loading">Loading...</div>';

  fetch(`/api/${currentTable}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      if (data.length === 0) {
        document.getElementById('dataContainer').innerHTML = '<div class="empty-state"><p>No records found</p></div>';
        return;
      }

      let html = '<table>';
      html += '<thead><tr>';

      columnOrder.forEach(key => {
        const capitalizedKey = key.charAt(0).toUpperCase() + key.slice(1);
        html += `<th ${key === 'id' ? 'class="hidden"' : ''}>${capitalizedKey}</th>`;
      });
      html += '<th>Actions</th></tr></thead>';

      html += '<tbody>';
      data.forEach(row => {
        html += '<tr>';
        columnOrder.forEach(key => {
          const value = row[key] !== undefined ? row[key] : '';
          html += `<td ${key === 'id' ? 'class="hidden"' : ''}>${value}</td>`;
        });

        html += `<td>
          <button class="action-btn edit-btn" onclick="showEditForm(${row.id}, ${JSON.stringify(row).replace(/"/g, '&quot;')})">Edit</button>
          <button class="action-btn delete-btn" onclick="deleteRecord(${row.id})">Delete</button>
        </td>`;
        html += '</tr>';
      });
      html += '</tbody></table>';

      document.getElementById('dataContainer').innerHTML = html;
    })
    .catch(error => {
      console.error('Error fetching data:', error);
      document.getElementById('dataContainer').innerHTML = `
        <div class="empty-state">
          <p>Error loading data. Please try again.</p>
        </div>`;
    });
}

// Function to show the add form
function showAddForm() {
  document.getElementById('addFormContainer').classList.remove('hidden');

  const editFormContainer = document.getElementById('editFormContainer');
  if (editFormContainer) {
    editFormContainer.classList.add('hidden');
  }

  const dataContainer = document.getElementById('dataContainer');
  if (dataContainer) {
    dataContainer.classList.add('hidden');
  }
}

// Function to hide the add form
function hideAddForm() {
  document.getElementById('addFormContainer').classList.add('hidden');
  document.getElementById('addForm').reset();

  const dataContainer = document.getElementById('dataContainer');
  if (dataContainer) {
    dataContainer.classList.remove('hidden');
  }
}

// Function to show the edit form
function showEditForm(id, rowData) {
  document.getElementById('addFormContainer').classList.add('hidden');

  const dataContainer = document.getElementById('dataContainer');
  if (dataContainer) {
    dataContainer.classList.add('hidden');
  }

  let editFormContainer = document.getElementById('editFormContainer');
  if (!editFormContainer) {
    editFormContainer = document.createElement('div');
    editFormContainer.id = 'editFormContainer';
    editFormContainer.className = 'form-container';

    const addFormContainer = document.getElementById('addFormContainer');
    addFormContainer.parentNode.insertBefore(editFormContainer, addFormContainer.nextSibling);
  }

  let formHtml = `
    <h2>Edit Location</h2>
    <form id="editForm">
      <input type="hidden" id="edit_id" name="id" value="${rowData.id}">
      
      <div class="form-group">
        <label for="edit_name">Name:</label>
        <input type="text" id="edit_name" name="name" value="${rowData.name || ''}" required>
      </div>
      
      <div class="form-group">
        <label for="edit_address">Address:</label>
        <input type="text" id="edit_address" name="address" value="${rowData.address || ''}" required>
      </div>
      
      <div class="form-group">
        <label for="edit_contact">Contact:</label>
        <input type="text" id="edit_contact" name="contact" value="${rowData.contact || ''}">
      </div>
      
      <div class="form-group">
        <label for="edit_latitude">Latitude:</label>
        <input type="number" id="edit_latitude" name="latitude" step="0.000001" value="${rowData.latitude || ''}" required>
      </div>
      
      <div class="form-group">
        <label for="edit_longitude">Longitude:</label>
        <input type="number" id="edit_longitude" name="longitude" step="0.000001" value="${rowData.longitude || ''}" required>
      </div>
      
      <div class="form-actions">
        <button type="submit">Update</button>
        <button type="button" onclick="hideEditForm()">Cancel</button>
      </div>
    </form>
  `;

  editFormContainer.innerHTML = formHtml;
  editFormContainer.classList.remove('hidden');

  document.getElementById('editForm').addEventListener('submit', function (e) {
    e.preventDefault();
    updateRecord();
  });
}

// Function to hide edit form
function hideEditForm() {
  const editFormContainer = document.getElementById('editFormContainer');
  if (editFormContainer) {
    editFormContainer.classList.add('hidden');
  }

  const dataContainer = document.getElementById('dataContainer');
  if (dataContainer) {
    dataContainer.classList.remove('hidden');
  }
}

// Function to add a new record
function addRecord() {
  const formData = new FormData(document.getElementById('addForm'));
  const data = {};

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  const lat = parseFloat(data.latitude);
  const lng = parseFloat(data.longitude);

  if (!isWithinPasig(lat, lng)) {
    alert('Coordinates are outside of Pasig City. Please enter a valid location within Pasig.');
    return;
  }
}
  fetch(`/api/${currentTable}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

// Function to update a record
function updateRecord() {
  const formData = new FormData(document.getElementById('editForm'));
  const data = {};
  const id = formData.get('id');

  for (const [key, value] of formData.entries()) {
    data[key] = value;
  }

  fetch(`/api/${currentTable}/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(result => {
      alert(result.message);
      hideEditForm();
      loadData();
    })
    .catch(error => {
      console.error('Error updating record:', error);
      alert('Error updating record. Please try again.');
    });
}

// Function to delete a record
function deleteRecord(id) {
  if (!confirm('Are you sure you want to delete this record?')) {
    return;
  }

  fetch(`/api/${currentTable}/${id}`, {
    method: 'DELETE'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(result => {
      alert(result.message);
      loadData();
    })
    .catch(error => {
      console.error('Error deleting record:', error);
      alert('Error deleting record. Please try again.');
    });
} 