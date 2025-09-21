// =================================================================
//                    Configuration & State
// =================================================================
const backendUrl = "https://vdlchecklist-0pfo.onrender.com";
let currentUser = "";
let currentChecklistId = null;

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

function createNewChecklist() {
    currentChecklistId = null;
    document.getElementById('checklist-title').innerText = 'Videalert Post-Install Checklist';
    document.getElementById('checklist-username').innerText = currentUser;
    document.getElementById('client-name').value = '';
    document.getElementById('project-id').value = '';
    document.getElementById('notes-section').value = '';
    document.getElementById('urn-list').innerHTML = '';
    document.querySelectorAll('#checklist li .checkbox').forEach(cb => cb.classList.remove('checked'));
    document.querySelectorAll('#checklist li .item-text').forEach(t => t.classList.remove('checked'));
    showView('checklist-card');
}

async function goToMyChecklists() {
    showView('my-checklists-card');
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${backendUrl}/checklists`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch checklists.');
        
        const checklists = await response.json();
        const tableBody = document.getElementById('checklists-table-body');
        tableBody.innerHTML = '';
        checklists.forEach(checklist => {
            const row = tableBody.insertRow();
            row.innerHTML = `
                <td>${checklist.client_name}</td>
                <td>${checklist.project_id}</td>
                <td>${new Date(checklist.updated_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="editChecklist('${checklist.id}')">Edit</button>
                    <button onclick="deleteChecklist('${checklist.id}')" style="background-color: #dc3545;">Delete</button>
                </td>
            `;
        });
    } catch (error) {
        alert(error.message);
        goBackToLanding();
    }
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
            addUserToTable(result.user);
        }
    } catch (error) {
        alert("Failed to create user.");
    }
}

function addUserToTable(user) {
    const tableBody = document.getElementById('users-table-body');
    const row = tableBody.insertRow();
    row.innerHTML = `
        <td>${user.id}</td>
        <td>${user.username}</td>
        <td>${user.name} ${user.surname}</td>
        <td>${user.email}</td>
        <td>${user.job_role}</td>
        <td>${user.is_admin ? '✔️' : '❌'}</td>
    `;
}

// =================================================================
//                  Checklist Functions
// =================================================================
async function saveChecklist() {
    const clientName = document.getElementById('client-name').value;
    const projectId = document.getElementById('project-id').value;
    const notes = document.getElementById('notes-section').value;
    const checklistItems = Array.from(document.querySelectorAll('#checklist li')).map(item => ({
        text: item.querySelector('.item-text').innerText,
        checked: item.querySelector('.checkbox').classList.contains('checked')
    }));

    const urnData = [];
    document.querySelectorAll('.urn-group').forEach(group => {
        const urn = group.querySelector('input[name="urn[]"]').value;
        const trigger = group.querySelector('input[name="trigger[]"]').value;
        const subEntries = [];
        group.querySelectorAll('.sub-entry').forEach(subEntry => {
            const type = subEntry.getAttribute('data-type');
            const data = { type };
            if (type === 'CUV') {
                data.location_code = subEntry.querySelector('input[name="cuv_location_code[]"]').value;
                data.engine_id = subEntry.querySelector('input[name="cuv_engine_id[]"]').value;
                data.camera_id = subEntry.querySelector('input[name="cuv_camera_id[]"]').value;
            } else if (type === 'CV') {
                data.camera_id = subEntry.querySelector('input[name="cv_camera_id[]"]').value;
            }
            subEntries.push(data);
        });
        urnData.push({ urn, trigger, subEntries });
    });

    const checklist = {
        client_name: clientName,
        project_id: projectId,
        notes: notes,
        checklist_items: checklistItems,
        urn_data: urnData
    };

    const token = localStorage.getItem('authToken');
    const method = currentChecklistId ? 'PUT' : 'POST';
    const url = currentChecklistId ? `${backendUrl}/checklists/${currentChecklistId}` : `${backendUrl}/checklists`;

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(checklist)
        });

        const result = await response.json();
        alert(result.message);
        if (response.ok) {
            goToMyChecklists();
        }
    } catch (error) {
        alert('An error occurred while saving the checklist.');
    }
}

async function editChecklist(checklistId) {
    currentChecklistId = checklistId;
    document.getElementById('checklist-title').innerText = 'Edit Checklist';
    document.getElementById('checklist-username').innerText = currentUser;
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${backendUrl}/checklists/${checklistId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Failed to fetch checklist details.');

        const checklist = await response.json();
        document.getElementById('client-name').value = checklist.client_name;
        document.getElementById('project-id').value = checklist.project_id;
        document.getElementById('notes-section').value = checklist.notes;

        const checklistItems = JSON.parse(checklist.checklist_items);
        document.querySelectorAll('#checklist li').forEach(item => {
            const text = item.querySelector('.item-text').innerText;
            const savedItem = checklistItems.find(i => i.text === text);
            if (savedItem && savedItem.checked) {
                item.querySelector('.checkbox').classList.add('checked');
                item.querySelector('.item-text').classList.add('checked');
            } else {
                item.querySelector('.checkbox').classList.remove('checked');
                item.querySelector('.item-text').classList.remove('checked');
            }
        });
        
        const urnList = document.getElementById('urn-list');
        urnList.innerHTML = '';
        checklist.urn_data.forEach(urn => {
            const group = addUrnPair();
            group.querySelector('input[name="urn[]"]').value = urn.urn;
            group.querySelector('input[name="trigger[]"]').value = urn.trigger;
            const subEntryContainer = group.querySelector('.cv-cuv-live-areas');
            subEntryContainer.innerHTML = '';
            urn.sub_entries.forEach(sub => {
                const button = group.querySelector(`.add-sub-entry-btn[onclick*="${sub.type}"]`);
                const subEntry = addCvCuvLiveArea(button, sub.type);
                if (sub.type === 'CUV') {
                    subEntry.querySelector('input[name="cuv_location_code[]"]').value = sub.location_code;
                    subEntry.querySelector('input[name="cuv_engine_id[]"]').value = sub.engine_id;
                    subEntry.querySelector('input[name="cuv_camera_id[]"]').value = sub.camera_id;
                } else if (sub.type === 'CV') {
                    subEntry.querySelector('input[name="cv_camera_id[]"]').value = sub.camera_id;
                }
            });
        });
        showView('checklist-card');

    } catch (error) {
        alert(error.message);
        goToMyChecklists();
    }
}

async function deleteChecklist(checklistId) {
    if (!confirm('Are you sure you want to delete this checklist?')) {
        return;
    }

    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`${backendUrl}/checklists/${checklistId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        alert(result.message);
        if (response.ok) {
            goToMyChecklists();
        }
    } catch (error) {
        alert('An error occurred while deleting the checklist.');
    }
}

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
  return group;
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
  return subEntry;
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
    document.getElementById('go-to-checklist-btn')?.addEventListener('click', createNewChecklist);
    document.getElementById('go-to-my-checklists-btn')?.addEventListener('click', goToMyChecklists);
    
    // --- Admin Buttons ---
    document.getElementById('user-management-btn')?.addEventListener('click', goToUserManagement);
    document.getElementById('register-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        createNewUser();
    });

    // --- Back Buttons ---
    document.querySelectorAll('.back-to-landing-btn').forEach(button => {
        button.addEventListener('click', goBackToLanding);
    });

    // --- Checklist Buttons ---
    document.getElementById('save-checklist-btn')?.addEventListener('click', saveChecklist);
    document.getElementById('export-pdf-btn')?.addEventListener('click', exportPDF);
    document.getElementById('add-urn-btn')?.addEventListener('click', addUrnPair);

    // Add event listeners for the static checklist items
    document.querySelectorAll('#checklist li').forEach(item => {
        item.addEventListener('click', () => toggleCheck(item));
    });
});