// ====================================================
// ADMIN PANEL STATE & GITHUB CONFIG
// ====================================================

// These variables will hold the live data arrays/objects fetched from index.html
let adminProducts = [];
let adminUserServices = [];
let adminSettingsContact = {};
let githubConfig = {};
let fileSha = ''; 

const CONFIG_KEY = 'githubAdminConfig';
const FILE_PATH = 'index.html'; 

// Helper function to read config
const getGitHubConfig = () => {
    try {
        const storedConfig = localStorage.getItem(CONFIG_KEY);
        githubConfig = storedConfig ? JSON.parse(storedConfig) : {};
        updateStatusDisplay();
        return githubConfig.token && githubConfig.owner && githubConfig.repo && githubConfig.branch;
    } catch (e) {
        console.error("Error reading config from local storage", e);
        return false;
    }
};

// Update connection status display
const updateStatusDisplay = () => {
    const statusDiv = document.getElementById('live-status');
    if (githubConfig.token && githubConfig.owner) {
        statusDiv.textContent = `Connected to: ${githubConfig.owner}/${githubConfig.repo} (${githubConfig.branch})`;
        statusDiv.classList.remove('bg-gray-700/50', 'text-red-400');
        statusDiv.classList.add('bg-green-600/50', 'text-green-300');
    } else {
        statusDiv.textContent = "(Please Enter Token and Settings First)";
        statusDiv.classList.add('bg-gray-700/50', 'text-red-400');
        statusDiv.classList.remove('bg-green-600/50', 'text-green-300');
    }
    lucide.createIcons();
};

// ====================================================
// GITHUB API INTERACTION & CORE LOGIC
// ====================================================

/**
 * Fetches index.html content and extracts the three data sections.
 * Initializes admin data for editing.
 */
const fetchAndParseData = async () => {
    const config = getGitHubConfig();
    if (!config) return;

    const { owner, repo, branch, token } = githubConfig;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}?ref=${branch}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3.json' }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch content: ${response.statusText}`);
        }

        const data = await response.json();
        const fileContent = atob(data.content.replace(/\n/g, ''));
        fileSha = data.sha; 
        
        // Extract all three data sections using the markers
        const productsMatch = fileContent.match(/\/\* START_PRODUCTS_DATA \*\/[\s\S]*?(let products = [\s\S]*?);[\s\S]*?\/\* END_PRODUCTS_DATA \*\//);
        const servicesMatch = fileContent.match(/\/\* START_SERVICES_DATA \*\/[\s\S]*?(let userServices = [\s\S]*?);[\s\S]*?\/\* END_SERVICES_DATA \*\//);
        const contactMatch = fileContent.match(/\/\* START_SETTINGS_CONTACT \*\/[\s\S]*?(let settingsContact = [\s\S]*?);[\s\S]*?\/\* END_SETTINGS_CONTACT \*\//);


        if (productsMatch && servicesMatch && contactMatch) {
            const tempScope = {};
            // Execute the extracted code to get array/object values
            eval(`(function(scope) { ${productsMatch[1]}; scope.products = products; })(tempScope);`);
            eval(`(function(scope) { ${servicesMatch[1]}; scope.userServices = userServices; })(tempScope);`);
            eval(`(function(scope) { ${contactMatch[1]}; scope.settingsContact = settingsContact; })(tempScope);`);
            
            adminProducts = tempScope.products || [];
            adminUserServices = tempScope.userServices || [];
            adminSettingsContact = tempScope.settingsContact || {};

            alert('✅ Live data fetched from index.html successfully! You can now manage your contact info.');
            changeAdminView('contact'); // Move to contact management
        } else {
            throw new Error("Failed to find all START/END markers in index.html. Ensure all three sections are present.");
        }

    } catch (error) {
        alert(`❌ Error fetching data from GitHub: ${error.message}. Check your token and settings.`);
        console.error('GitHub Fetch Error:', error);
    }
};

/**
 * Updates the file on GitHub by replacing the content between all markers.
 */
const updateFileOnGitHub = async (commitMessage) => {
    const config = getGitHubConfig();
    if (!config || !fileSha) {
        alert('Error: GitHub settings or file SHA not available. Please save settings and fetch data first.');
        return false;
    }
    
    // 1. Fetch current content again to ensure we have the latest SHA
    const { owner, repo, branch, token } = githubConfig;
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}?ref=${branch}`;
    
    const freshResponse = await fetch(url, { headers: { 'Authorization': `token ${token}`, 'Accept': 'application/vnd.github.v3.json' } });
    if (!freshResponse.ok) {
        alert('Failed to fetch latest content. Conflict detected. Try refreshing the page.');
        return false;
    }
    const freshData = await freshResponse.json();
    const freshContent = atob(freshData.content.replace(/\n/g, ''));
    const currentSha = freshData.sha; 

    // 2. Prepare the new code blocks, using pretty print for readability if user edits manually later.
    const newProductsCode = `let products = ${JSON.stringify(adminProducts, null, 4)};`;
    const newServicesCode = `let userServices = ${JSON.stringify(adminUserServices, null, 4)};`;
    const newContactCode = `let settingsContact = ${JSON.stringify(adminSettingsContact, null, 4)};`;

    
    // 3. Replace the old code with the new using markers (RegEx)
    let updatedContent = freshContent;
    
    updatedContent = updatedContent.replace(
        /(\/\* START_PRODUCTS_DATA \*\/[\s\S]*?)(let products = [\s\S]*?;)(\s*?\/\* END_PRODUCTS_DATA \*\/)/,
        `$1\n${newProductsCode}\n$3`
    );
    
    updatedContent = updatedContent.replace(
        /(\/\* START_SERVICES_DATA \*\/[\s\S]*?)(let userServices = [\s\S]*?;)(\s*?\/\* END_SERVICES_DATA \*\/)/,
        `$1\n${newServicesCode}\n$3`
    );

    updatedContent = updatedContent.replace(
        /(\/\* START_SETTINGS_CONTACT \*\/[\s\S]*?)(let settingsContact = [\s\S]*?;)(\s*?\/\* END_SETTINGS_CONTACT \*\/)/,
        `$1\n${newContactCode}\n$3`
    );


    // 4. Encode the new content to Base64
    const contentBase64 = btoa(updatedContent);

    // 5. Send PUT request to update the file
    const updateUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${FILE_PATH}`;
    const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (updateResponse.ok) {
        const result = await updateResponse.json();
        fileSha = result.content.sha; // Update SHA for next commit
        alert('✅ Published successfully! Changes will appear on your website shortly.');
        return true;
    } else {
        const errorData = await updateResponse.json();
        alert(`❌ Automatic Publishing Failed: ${errorData.message || updateResponse.statusText}. Check if your PAT has 'repo' scope.`);
        console.error('GitHub Publish Error:', errorData);
        return false;
    }
};

// ====================================================
// CONFIGURATION & UI LOGIC
// ====================================================

/** Generates an input field for a form */
const generateInputField = (id, label, type, value = '', required = true, placeholder = '') => `
    <div>
        <label for="${id}" class="block text-sm font-medium text-gray-300 mb-2">${label}</label>
        <input type="${type}" id="${id}" name="${id}" value="${value}" ${required ? 'required' : ''} placeholder="${placeholder}" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-sky-500 focus:border-sky-500 text-white transition" dir="ltr">
    </div>
`;

/** Render GitHub Configuration View */
const renderConfigurationView = () => {
    const container = document.getElementById('admin-view');
    getGitHubConfig(); 

    const formHTML = `
        <div class="admin-section p-6 rounded-xl shadow-lg border border-red-600 mb-8">
            <h3 class="text-2xl font-bold text-red-400 mb-4">🔑 GitHub Configuration (Personal Access Token)</h3>
            <p class="text-sm text-gray-400 mb-4">Your token is stored locally in your browser and not saved to the file.</p>
            <form id="config-form" class="space-y-4">
                ${generateInputField('token', 'GitHub Personal Access Token (PAT)', 'password', githubConfig.token || '', true)}
                ${generateInputField('owner', 'Repository Owner (Username)', 'text', githubConfig.owner || '', true)}
                ${generateInputField('repo', 'Repository Name', 'text', githubConfig.repo || '', true)}
                ${generateInputField('branch', 'Branch Name (e.g., main or gh-pages)', 'text', githubConfig.branch || 'main', true)}
                <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200">
                    Save Settings and Fetch Live Data
                </button>
            </form>
        </div>
    `;
    container.innerHTML = formHTML;
    
    document.getElementById('config-form').onsubmit = (e) => {
        e.preventDefault();
        saveConfig();
    };
    lucide.createIcons();
};

/** Save config to Local Storage and fetch data */
const saveConfig = () => {
    const form = document.getElementById('config-form');
    const newConfig = {
        token: form.querySelector('#token').value.trim(),
        owner: form.querySelector('#owner').value.trim(),
        repo: form.querySelector('#repo').value.trim(),
        branch: form.querySelector('#branch').value.trim()
    };
    
    if (newConfig.token && newConfig.owner && newConfig.repo && newConfig.branch) {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(newConfig));
        githubConfig = newConfig;
        updateStatusDisplay();
        fetchAndParseData(); // Attempt to fetch data directly
    } else {
        alert('Please fill in all required fields.');
    }
};

/** Main view switcher */
const changeAdminView = (view) => {
    const title = document.getElementById('admin-title');
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        if (btn.getAttribute('data-view') === view) {
            btn.classList.add('bg-gray-700', 'text-white');
            btn.classList.remove('text-gray-400');
        } else {
            btn.classList.remove('bg-gray-700', 'text-white');
            btn.classList.add('text-gray-400');
        }
    });

    switch (view) {
        case 'config':
            title.textContent = 'GitHub Configuration';
            renderConfigurationView();
            break;
        case 'contact':
            title.textContent = 'Manage My Contact Info';
            renderContactManagement();
            break;
    }
    lucide.createIcons();
};

// ====================================================
// CONTACT MANAGEMENT LOGIC
// ====================================================

const renderContactManagement = () => {
    const container = document.getElementById('admin-view');
    const contact = adminSettingsContact;

    const formHTML = `
        <div class="admin-section p-6 rounded-xl shadow-lg">
            <h3 class="text-2xl font-bold text-sky-400 mb-4">Links for "Build Your Site" and "Contact Us" pages</h3>
            <p class="text-sm text-gray-400 mb-6">These links will be used when a customer clicks the "Contact Me" button on your site. Use full URL format (e.g., https://wa.me/...).</p>
            
            <form id="contact-form" class="space-y-4">
                ${generateInputField('contact-whatsapp', 'WhatsApp Link (Full URL)', 'url', contact.whatsapp || '', true, 'https://wa.me/15550000000')}
                ${generateInputField('contact-instagram', 'Instagram Link (Full URL)', 'url', contact.instagram || '', true, 'https://instagram.com/myusername')}
                ${generateInputField('contact-telegram', 'Telegram Link (Full URL)', 'url', contact.telegram || '', true, 'https://t.me/myusername')}
                
                <button type="submit" class="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 mt-6">
                    Update Contact Info and Publish
                </button>
            </form>
            
            <div class="mt-8 pt-4 border-t border-gray-700">
                <h3 class="text-lg font-bold text-white mb-2">Note on Products & Services:</h3>
                <p class="text-sm text-gray-400">The current status of Products and Community Services is: 
                    <span class="font-bold text-sky-300">${adminProducts.length} Product(s)</span> and 
                    <span class="font-bold text-purple-300">${adminUserServices.length} Service(s)</span> in index.html.
                    To add/edit them, you must currently edit the arrays in the <code>index.html</code> file manually. The 'Publish' button above will preserve those arrays along with your contact changes.
                </p>
            </div>
        </div>
    `;
    container.innerHTML = formHTML;

    document.getElementById('contact-form').onsubmit = (e) => {
        e.preventDefault();
        saveContactSettings();
    };
    lucide.createIcons();
};

const saveContactSettings = async () => {
    const form = document.getElementById('contact-form');
    
    const newContact = {
        whatsapp: form.querySelector('#contact-whatsapp').value.trim(),
        instagram: form.querySelector('#contact-instagram').value.trim(),
        telegram: form.querySelector('#contact-telegram').value.trim(),
    };

    if (newContact.whatsapp && newContact.instagram && newContact.telegram) {
        adminSettingsContact = newContact;
        
        // Automatic Publishing, updates all 3 sections (Products, Services, Contact)
        await updateFileOnGitHub(`Update: My contact links via admin panel.`);
    } else {
        alert('All contact links are required.');
    }
};


// Expose functions globally
window.changeAdminView = changeAdminView;
window.saveConfig = saveConfig;
window.fetchAndParseData = fetchAndParseData;
window.renderContactManagement = renderContactManagement;
