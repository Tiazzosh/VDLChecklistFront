// =================================================================
//                    Configuration & State
// =================================================================
const backendUrl = "https://vdlchecklist-0pfo.onrender.com";
let currentUser = "";

// =================================================================
//                    Page Load Logic
// =================================================================
window.onload = () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
        showView('reset-password-card');
    } else {
        showView('login-card');
    }
};

// =================================================================
//                    Navigation Functions
// =================================================================
function showView(viewId) {
    document.querySelectorAll('.card').forEach(card => card.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
}

function goToLogin(event) {
    if(event) event.preventDefault();
    window.history.pushState({}, '', window.location.pathname);
    showView('login-card');
}

function goToChecklist() {
    document.getElementById('checklist-username').innerText = currentUser;
    showView('checklist-card');
}

function goBackToLanding() {
    showView('landing-card');
}

function goToProfile() {
    showView('profile-card');
}

function goToForgotPassword(event) {
    if(event) event.preventDefault();
    showView('forgot-password-card');
}

// =================================================================
//                  User & Password Management
// =================================================================
async function login() {
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    try {
        const response = await fetch(`${backendUrl}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const result = await response.json();
        if (result.token) {
            localStorage.setItem('authToken', result.token);
            currentUser = username;
            document.getElementById('logged-in-user').innerText = username;
            
            if (result.isAdmin) {
                document.getElementById('user-management-btn').classList.remove('hidden');
            } else {
                document.getElementById('user-management-btn').classList.add('hidden');
            }
            showView('landing-card');
        } else {
            alert(result.message);
        }
    } catch (error) {
        alert("Login failed. Could not connect to the server.");
    }
}

function logout() {
    localStorage.removeItem('authToken');
    currentUser = "";
    document.getElementById('user-management-btn').classList.add('hidden');
    showView('login-card');
}

async function changePassword() {
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const token = localStorage.getItem('authToken');

    try {
        const response = await fetch(`${backendUrl}/user/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ currentPassword, newPassword })
        });

        const result = await response.json();
        alert(result.message);

        if (response.ok) {
            document.getElementById('current-password').value = '';
            document.getElementById('new-password').value = '';
            goBackToLanding();
        }
    } catch (error) {
        alert('An error occurred while changing the password.');
    }
}

async function requestPasswordReset() {
    const email = document.getElementById('forgot-email').value;
    try {
        const response = await fetch(`${backendUrl}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        alert(result.message);
    } catch (error) {
        alert('An error occurred.');
    }
}

async function performPasswordReset() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const newPassword = document.getElementById('reset-new-password').value;

    if (!token || !newPassword) {
        alert("Invalid link or missing new password.");
        return;
    }

    try {
        const response = await fetch(`${backendUrl}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
        });
        const result = await response.json();
        alert(result.message);
        if(response.ok) {
            goToLogin();
        }
    } catch (error) {
        alert('An error occurred.');
    }
}

// =================================================================
//                  Admin Functions
// =================================================================
async function goToUserManagement() {
    showView('user-management-card');
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${backendUrl}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 403) throw new Error('Access denied.');
        if (!response.ok) throw new Error('Failed to fetch users.');
        
        const users = await response.json();
        const tableBody = document.getElementById('users-table-body');
        tableBody.innerHTML = '';
        users.forEach(user => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.name} ${user.surname}</td>
                <td>${user.email}</td>
                <td>${user.job_role}</td>
                <td>${user.is_admin ? '✔️' : '❌'}</td>
            `;
        });
    } catch (error) {
        alert(error.message);
        showView('landing-card');
    }
}

async function createNewUser() {
    const userDetails = {
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value,
        name: document.getElementById('reg-name').value,
        surname: document.getElementById('reg-surname').value,
        email: document.getElementById('reg-email').value,
        job_role: document.getElementById('reg-job-role').value
    };
    for(const key in userDetails) {
        if(!userDetails[key]) {
            alert(`Please fill out the ${key} field.`);
            return;
        }
    }
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${backendUrl}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(userDetails)
        });
        const result = await response.json();
        alert(result.message);
        if (response.ok) {
            document.getElementById('register-form').reset();
            goToUserManagement();
        }
    } catch (error) {
        alert("Failed to create user.");
    }
}

// =================================================================
//                  Checklist Functions
// =================================================================
function addUrnPair() {
  const urnList = document.getElementById("urn-list");
  const group = document.createElement("div");
  group.className = "urn-group";
  group.innerHTML = `
    <button type="button" class="remove" onclick="this.parentElement.remove()">Remove</button>
    <label>URN</label>
    <input type="text" name="urn[]">
    <label>Trigger Type Configured</label>
    <input type="text" name="trigger[]">
    <div class="cv-cuv-live-areas"></div>
    <button type="button" class="add-sub-entry-btn" onclick="addCvCuvLiveArea(this, 'CV')">Add CV</button>
    <button type="button" class="add-sub-entry-btn" onclick="addCvCuvLiveArea(this, 'CUV')">Add CUV</button>
    <button type="button" class="add-sub-entry-btn" onclick="addCvCuvLiveArea(this, 'Live Area')">Add Live Area</button>
  `;
  urnList.appendChild(group);
}

function addCvCuvLiveArea(buttonElement, type) {
  const urnGroup = buttonElement.closest('.urn-group');
  const subEntryContainer = urnGroup.querySelector('.cv-cuv-live-areas');
  const newIndex = subEntryContainer.querySelectorAll(`[data-type="${type}"]`).length + 1;
  const uniqueId = `${type.toLowerCase().replace(' ', '-')}-${Date.now()}`;
  const subEntry = document.createElement("div");
  subEntry.className = "sub-entry";
  subEntry.setAttribute("data-type", type);
  let additionalFields = '';
  if (type === 'CUV') {
    additionalFields = `<label>Location Code</label><input type="text" name="cuv_location_code[]"><label>Engine ID</label><input type="text" name="cuv_engine_id[]"><label>Camera ID</label><input type="text" name="cuv_camera_id[]">`;
  } else if (type === 'CV') {
    additionalFields = `<label>Camera ID</label><input type="text" name="cv_camera_id[]">`;
  }
  subEntry.innerHTML = `
    <button type="button" class="remove-sub-entry" onclick="this.parentElement.remove()">Remove</button>
    <label>${type}${newIndex}</label>
    ${additionalFields}
    <input type="file" accept="image/*" onchange="previewImage(event, '${uniqueId}')">
    <div id="image-preview-wrapper-${uniqueId}" class="image-preview-wrapper hidden">
      <img id="preview-${uniqueId}" class="image-preview">
      <button type="button" onclick="removeImageSection('${uniqueId}')" class="remove-image-button">Remove Image</button>
    </div>`;
  subEntryContainer.appendChild(subEntry);
}

function previewImage(event, id) {
  const reader = new FileReader();
  reader.onload = function() {
    const output = document.getElementById(`preview-${id}`);
    const wrapper = document.getElementById(`image-preview-wrapper-${id}`);
    if (output && wrapper) {
      output.src = reader.result;
      wrapper.classList.remove('hidden');
    }
  };
  reader.readAsDataURL(event.target.files[0]);
}

function removeImageSection(id) {
  const wrapper = document.getElementById(`image-preview-wrapper-${id}`);
  const fileInput = wrapper ? wrapper.previousElementSibling : null;
  if (wrapper) {
    wrapper.classList.add('hidden');
    const output = wrapper.querySelector(`#preview-${id}`);
    if (output) output.src = "";
  }
  if (fileInput && fileInput.type === 'file') fileInput.value = '';
}

function toggleCheck(item) {
  const checkbox = item.querySelector('.checkbox');
  const text = item.querySelector('.item-text');
  checkbox.classList.toggle('checked');
  text.classList.toggle('checked');
}

async function exportPDF() {
  alert("PDF export functionality needs to be reviewed and updated for the full application layout.");
}

// =================================================================
//                    EVENT LISTENERS
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    // --- Auth Buttons ---
    document.getElementById('login-btn')?.addEventListener('click', login);
    document.getElementById('forgot-password-link')?.addEventListener('click', goToForgotPassword);
    document.getElementById('send-reset-link-btn')?.addEventListener('click', requestPasswordReset);
    document.getElementById('back-to-login-link')?.addEventListener('click', goToLogin);
    document.getElementById('reset-password-btn')?.addEventListener('click', performPasswordReset);

    // --- Main App Buttons ---
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    document.getElementById('go-to-profile-btn')?.addEventListener('click', goToProfile);
    document.getElementById('change-password-btn')?.addEventListener('click', changePassword);
    document.getElementById('go-to-checklist-btn')?.addEventListener('click', goToChecklist);
    
    // --- Admin Buttons ---
    document.getElementById('user-management-btn')?.addEventListener('click', goToUserManagement);
    document.getElementById('register-form')?.addEventListener('submit', createNewUser);

    // --- Back Buttons ---
    document.querySelectorAll('.back-to-landing-btn').forEach(button => {
        button.addEventListener('click', goBackToLanding);
    });

    // --- Checklist Buttons ---
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportPDF);
    document.getElementById('add-urn-btn')?.addEventListener('click', addUrnPair);

    // Add event listeners for the static checklist items
    document.querySelectorAll('#checklist li').forEach(item => {
        item.addEventListener('click', () => toggleCheck(item));
    });
});