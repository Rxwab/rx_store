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
const CATEGORIES = ['Phones', 'Monitors', 'Audio', 'Projectors', 'Accessories', 'Other'];

/** Generates a unique, high-quality ID (Time-based + Random) */
const generateUniqueId = () => Date.now().toString(36) + Math.random().toString(36).substring(2, 9);


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
const fetchAndParseData = async (successView = 'contact') => {
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

            alert('✅ Live data fetched from index.html successfully!');
            changeAdminView(successView); // Move to the desired management view
        } else {
            throw new Error("Failed to find all START/END markers in index.html. Ensure all three sections are present.");
        }

    } catch (error) {
        alert(`❌ Error fetching data from GitHub: ${error.message}. Check your token and settings.`);
        console.error('GitHub Fetch Error:', error);
        changeAdminView('config'); // Return to config on failure
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
    
    // 1. Fetch current content again to ensure we have the latest SHA and prevent conflicts
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

    // 2. Prepare the new code blocks, using pretty print for readability
    const newProductsCode = `let products = ${JSON.stringify(adminProducts, null, 4)};`;
    const newServicesCode = `let userServices = ${JSON.stringify(adminUserServices, null, 4)};`;
    const newContactCode = `let settingsContact = ${JSON.stringify(adminSettingsContact, null, 4)};`;

    
    // 3. Replace the old code with the new using markers (RegEx)
    let updatedContent = freshContent;
    
    // Replace Products
    updatedContent = updatedContent.replace(
        /(\/\* START_PRODUCTS_DATA \*\/[\s\S]*?)(let products = [\s\S]*?;)(\s*?\/\* END_PRODUCTS_DATA \*\/)/,
        `$1\n${newProductsCode}\n$3`
    );
    
    // Replace Services
    updatedContent = updatedContent.replace(
        /(\/\* START_SERVICES_DATA \*\/[\s\S]*?)(let userServices = [\s\S]*?;)(\s*?\/\* END_SERVICES_DATA \*\/)/,
        `$1\n${newServicesCode}\n$3`
    );

    // Replace Contact
    updatedContent = updatedContent.replace(
        /(\/\* START_SETTINGS_CONTACT \*\/[\s\S]*?)(let settingsContact = [\s\S]*?;)(\s*?\/\* END_SETTINGS_CONTACT \*\/)/,
        `$1\n${newContactCode}\n$3`
    );


    // 4. Encode the new content to Base64
    const contentBase64 = btoa(updatedContent);

    // 5. Send PUT request to update the file
    const payload = {
        message: commitMessage,
        content: contentBase64,
        sha: currentSha, // Use the fresh SHA
        branch: branch
    };
    
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
// UTILITY/UI FUNCTIONS
// ====================================================

/** Generates an input field for a form */
const generateInputField = (id, label, type, value = '', required = true, placeholder = '', extraClass = '') => `
    <div class="form-group ${extraClass}">
        <label for="${id}" class="block text-sm font-medium text-gray-300 mb-2">${label}</label>
        <input type="${type}" id="${id}" name="${id}" value="${value}" ${required ? 'required' : ''} placeholder="${placeholder}" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-sky-500 focus:border-sky-500 text-white transition" dir="ltr">
    </div>
`;

/** Generates a textarea field for a form */
const generateTextareaField = (id, label, value = '', required = true, placeholder = '') => `
    <div>
        <label for="${id}" class="block text-sm font-medium text-gray-300 mb-2">${label}</label>
        <textarea id="${id}" name="${id}" rows="4" ${required ? 'required' : ''} placeholder="${placeholder}" class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-sky-500 focus:border-sky-500 text-white transition" dir="ltr">${value}</textarea>
    </div>
`;

/** Generates a dropdown select field */
const generateSelectField = (id, label, options, selectedValue) => `
    <div>
        <label for="${id}" class="block text-sm font-medium text-gray-300 mb-2">${label}</label>
        <select id="${id}" name="${id}" required class="w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:ring-sky-500 focus:border-sky-500 text-white transition">
            ${options.map(opt => `<option value="${opt}" ${opt === selectedValue ? 'selected' : ''}>${opt}</option>`).join('')}
        </select>
    </div>
`;


// ====================================================
// ADMIN VIEW SWITCHER
// ====================================================

/** Main view switcher */
const changeAdminView = (view, id = null) => {
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

    if (view !== 'config' && !getGitHubConfig()) {
        alert("Please set up GitHub configuration first.");
        view = 'config';
    } else if (view !== 'config' && (adminProducts.length === 0 && adminUserServices.length === 0 && Object.keys(adminSettingsContact).length === 0)) {
        // If data hasn't been fetched yet, try fetching it.
        fetchAndParseData(view);
        return;
    }

    switch (view) {
        case 'config':
            title.textContent = 'GitHub Configuration';
            renderConfigurationView();
            break;
        case 'contact':
            title.textContent = 'Manage My Contact Info';
            renderContactManagement();
            break;
        case 'products':
            title.textContent = 'Products Management (Store)';
            renderProductsManagement();
            break;
        case 'product-form':
            title.textContent = id ? 'Edit Product' : 'Add New Product';
            renderProductForm(id);
            break;
        case 'services':
            title.textContent = 'Services Management (Community)';
            renderServicesManagement();
            break;
        case 'service-form':
            title.textContent = id ? 'Edit Service' : 'Add New Service';
            renderServiceForm(id);
            break;
    }
    lucide.createIcons();
};

// ====================================================
// CONFIGURATION LOGIC
// ====================================================

const renderConfigurationView = () => {
    // ... (unchanged from previous version)
    const container = document.getElementById('admin-view');
    getGitHubConfig(); 

    const formHTML = `
        <div class="admin-section p-6 rounded-xl shadow-lg border border-red-600 mb-8">
            <h3 class="text-2xl font-bold text-red-400 mb-4">🔑 GitHub Configuration (Personal Access Token)</h3>
            <p class="text-sm text-gray-400 mb-4">Your token is stored locally in your browser and not saved to the file. **Requires 'repo' scope.**</p>
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

const saveConfig = () => {
    // ... (unchanged from previous version)
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
        fetchAndParseData('products'); // Move to products management after config
    } else {
        alert('Please fill in all required fields.');
    }
};

// ====================================================
// CONTACT MANAGEMENT LOGIC
// ====================================================

const renderContactManagement = () => {
    // ... (unchanged from previous version, uses existing adminSettingsContact)
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
        const success = await updateFileOnGitHub(`Update: My contact links via admin panel.`);
        if (success) changeAdminView('contact'); // Reload current view to show successful update
    } else {
        alert('All contact links are required.');
    }
};

// ====================================================
// PRODUCT MANAGEMENT LOGIC
// ====================================================

/** Render Products List View */
const renderProductsManagement = () => {
    const container = document.getElementById('admin-view');
    const productListHTML = adminProducts.map(p => `
        <li class="flex items-center justify-between p-4 bg-gray-800 rounded-lg shadow">
            <div class="flex items-center space-x-4 flex-grow min-w-0">
                <img src="${p.imageUrl || 'https://placehold.co/50x50/1f2937/d1d5db?text=IMG'}" class="w-12 h-12 object-cover rounded-md flex-shrink-0" alt="${p.title}">
                <div class="truncate">
                    <p class="text-white font-semibold truncate">${p.title}</p>
                    <p class="text-sm text-gray-400">$${parseFloat(p.price).toFixed(2)} | Category: ${p.category}</p>
                </div>
            </div>
            <div class="flex items-center space-x-3 flex-shrink-0 ml-4">
                <button onclick="changeAdminView('product-form', '${p.id}')" class="p-2 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-md transition" title="Edit">
                    <i data-lucide="edit" class="w-5 h-5"></i>
                </button>
                <button onclick="deleteProduct('${p.id}')" class="p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-md transition" title="Delete">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </li>
    `).join('');

    const content = `
        <div class="mb-6 flex justify-end">
            <button onclick="changeAdminView('product-form')" class="bg-sky-600 hover:bg-sky-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition duration-200 flex items-center space-x-2">
                <i data-lucide="plus" class="w-5 h-5"></i>
                <span>Add New Product</span>
            </button>
        </div>
        <div class="admin-section p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Product List (${adminProducts.length} items)</h3>
            <ul class="space-y-4">
                ${adminProducts.length > 0 ? productListHTML : '<li class="text-center py-6 text-gray-400">No products found. Add your first product now!</li>'}
            </ul>
        </div>
    `;
    container.innerHTML = content;
    lucide.createIcons();
};

/** Render Product Add/Edit Form */
const renderProductForm = (productId = null) => {
    const container = document.getElementById('admin-view');
    const isEditing = !!productId;
    const product = isEditing ? adminProducts.find(p => p.id === productId) : {};
    
    // Default values for a new product
    const defaultProduct = {
        id: '',
        title: '',
        description: '',
        price: 0.00,
        category: CATEGORIES[0],
        imageUrl: '',
        affiliateUrl: '',
        images: []
    };
    const data = isEditing ? product : defaultProduct;

    // --- Dynamic Images Input ---
    let extraImagesHTML = data.images.map((imgUrl, index) => `
        <div class="form-group relative">
            ${generateInputField(`image-${index}`, `Extra Image URL ${index + 1}`, 'url', imgUrl, false, 'https://...', 'mb-2')}
            <button type="button" onclick="removeImageField(this)" class="remove-image-btn bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');

    const formHTML = `
        <button onclick="changeAdminView('products')" class="text-gray-400 hover:text-white mb-6 flex items-center space-x-1.5 transition duration-200">
            <i data-lucide="arrow-left" class="w-4 h-4 mr-1"></i>
            <span>Back to Products List</span>
        </button>

        <div class="admin-section p-6 rounded-xl shadow-lg">
            <form id="product-form" class="space-y-6">
                <input type="hidden" id="product-id" value="${data.id}">
                
                <h3 class="text-xl font-bold text-sky-400 border-b border-gray-700 pb-2">Product Details</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${generateInputField('product-title', 'Product Title', 'text', data.title, true)}
                    ${generateSelectField('product-category', 'Category', CATEGORIES, data.category)}
                    ${generateInputField('product-price', 'Price ($)', 'number', data.price, true, '0.00', 'col-span-1', 'step="0.01" min="0"')}
                    ${generateInputField('product-affiliateUrl', 'Affiliate/Buy URL', 'url', data.affiliateUrl, true, 'https://amazon.com/...')}
                </div>
                
                ${generateTextareaField('product-description', 'Detailed Description', data.description, true, 'A full description of the product...')}

                <h3 class="text-xl font-bold text-sky-400 border-b border-gray-700 pb-2 mt-8">Media & Gallery</h3>
                ${generateInputField('product-imageUrl', 'Main Image URL (Required)', 'url', data.imageUrl, true, 'https://example.com/main-image.jpg')}
                
                <div id="extra-images-container" class="space-y-4 pt-2">
                    <p class="text-sm text-gray-400">Extra Images for Gallery (Optional)</p>
                    ${extraImagesHTML}
                </div>
                
                <button type="button" onclick="addImageField()" class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2">
                    <i data-lucide="image" class="w-5 h-5"></i>
                    <span>Add Extra Image Field</span>
                </button>
                
                <button type="submit" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 mt-8">
                    <i data-lucide="${isEditing ? 'save' : 'plus-circle'}" class="w-5 h-5 inline mr-2"></i>
                    <span>${isEditing ? 'Save Changes and Publish' : 'Add Product and Publish'}</span>
                </button>
                ${isEditing ? `<button type="button" onclick="deleteProduct('${data.id}', true)" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 mt-4">
                    <i data-lucide="trash-2" class="w-5 h-5 inline mr-2"></i>
                    <span>Delete This Product</span>
                </button>` : ''}
            </form>
        </div>
    `;
    container.innerHTML = formHTML;
    lucide.createIcons();
    document.getElementById('product-form').onsubmit = saveProduct;
};

/** Helper to add a dynamic image field */
const addImageField = (url = '') => {
    const container = document.getElementById('extra-images-container');
    const index = container.querySelectorAll('.form-group').length;
    const newField = document.createElement('div');
    newField.className = "form-group relative";
    newField.innerHTML = `
        ${generateInputField(`image-${index}`, `Extra Image URL ${index + 1}`, 'url', url, false, 'https://...', 'mb-2').replace('div class="form-group', 'div')}
        <button type="button" onclick="removeImageField(this)" class="remove-image-btn bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    container.appendChild(newField);
    lucide.createIcons();
};

/** Helper to remove a dynamic image field */
const removeImageField = (button) => {
    button.closest('.form-group').remove();
};

/** Handle Product Save (Add/Edit) */
const saveProduct = async (e) => {
    e.preventDefault();
    const form = e.target;
    const productId = form.querySelector('#product-id').value;
    const isEditing = !!productId;
    
    // Collect extra images
    const extraImageFields = form.querySelectorAll('#extra-images-container input[type="url"]');
    const images = Array.from(extraImageFields).map(input => input.value.trim()).filter(url => url.length > 0);

    const newProduct = {
        id: isEditing ? productId : generateUniqueId(),
        title: form.querySelector('#product-title').value.trim(),
        description: form.querySelector('#product-description').value.trim(),
        price: parseFloat(form.querySelector('#product-price').value),
        category: form.querySelector('#product-category').value,
        imageUrl: form.querySelector('#product-imageUrl').value.trim(),
        affiliateUrl: form.querySelector('#product-affiliateUrl').value.trim(),
        images: images,
    };

    if (isEditing) {
        // Update existing product
        const index = adminProducts.findIndex(p => p.id === productId);
        if (index !== -1) {
            adminProducts[index] = newProduct;
        }
    } else {
        // Add new product
        adminProducts.push(newProduct);
    }

    const message = isEditing 
        ? `Update: Edited product "${newProduct.title}"`
        : `Add: Added new product "${newProduct.title}"`;
        
    const success = await updateFileOnGitHub(message);
    if (success) changeAdminView('products');
};

/** Handle Product Delete */
const deleteProduct = async (productId, confirmAction = false) => {
    if (!confirmAction) {
        if (!confirm('Are you sure you want to delete this product? This action is irreversible.')) {
            return;
        }
    }
    
    const product = adminProducts.find(p => p.id === productId);
    adminProducts = adminProducts.filter(p => p.id !== productId);
    
    const success = await updateFileOnGitHub(`Delete: Removed product "${product ? product.title : productId}"`);
    if (success) changeAdminView('products');
};


// ====================================================
// SERVICE MANAGEMENT LOGIC
// ====================================================

/** Render Services List View */
const renderServicesManagement = () => {
    const container = document.getElementById('admin-view');
    const serviceListHTML = adminUserServices.map(s => `
        <li class="flex items-center justify-between p-4 bg-gray-800 rounded-lg shadow">
            <div class="flex items-center space-x-4 flex-grow min-w-0">
                <div class="w-12 h-12 bg-purple-900 rounded-md flex items-center justify-center flex-shrink-0">
                    <i data-lucide="users" class="w-6 h-6 text-purple-400"></i>
                </div>
                <div class="truncate">
                    <p class="text-white font-semibold truncate">${s.title}</p>
                    <p class="text-sm text-gray-400">Provider: ${s.provider} | Price: $${parseFloat(s.price).toFixed(2)}</p>
                </div>
            </div>
            <div class="flex items-center space-x-3 flex-shrink-0 ml-4">
                <button onclick="changeAdminView('service-form', '${s.id}')" class="p-2 text-sky-400 hover:text-white hover:bg-sky-500/20 rounded-md transition" title="Edit">
                    <i data-lucide="edit" class="w-5 h-5"></i>
                </button>
                <button onclick="deleteService('${s.id}')" class="p-2 text-red-400 hover:text-white hover:bg-red-500/20 rounded-md transition" title="Delete">
                    <i data-lucide="trash-2" class="w-5 h-5"></i>
                </button>
            </div>
        </li>
    `).join('');

    const content = `
        <div class="mb-6 flex justify-end">
            <button onclick="changeAdminView('service-form')" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-xl shadow-lg transition duration-200 flex items-center space-x-2">
                <i data-lucide="plus" class="w-5 h-5"></i>
                <span>Add New Service</span>
            </button>
        </div>
        <div class="admin-section p-6 rounded-xl shadow-lg">
            <h3 class="text-xl font-bold text-white mb-4 border-b border-gray-700 pb-2">Community Service List (${adminUserServices.length} items)</h3>
            <ul class="space-y-4">
                ${adminUserServices.length > 0 ? serviceListHTML : '<li class="text-center py-6 text-gray-400">No community services found. Add your first service now!</li>'}
            </ul>
        </div>
    `;
    container.innerHTML = content;
    lucide.createIcons();
};

/** Render Service Add/Edit Form */
const renderServiceForm = (serviceId = null) => {
    const container = document.getElementById('admin-view');
    const isEditing = !!serviceId;
    const service = isEditing ? adminUserServices.find(s => s.id === serviceId) : {};
    
    // Default values for a new service
    const defaultService = {
        id: '',
        title: '',
        provider: '',
        shortDescription: '',
        longDescription: '',
        price: 0.00,
        contact: {
            whatsapp: '',
            instagram: '',
            telegram: ''
        },
        portfolio: []
    };
    const data = isEditing ? service : defaultService;

    // --- Dynamic Portfolio Input ---
    let portfolioHTML = data.portfolio.map((imgUrl, index) => `
        <div class="form-group relative">
            ${generateInputField(`portfolio-${index}`, `Portfolio Image URL ${index + 1}`, 'url', imgUrl, false, 'https://...', 'mb-2')}
            <button type="button" onclick="removeImageField(this)" class="remove-image-btn bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>
    `).join('');
    
    const formHTML = `
        <button onclick="changeAdminView('services')" class="text-gray-400 hover:text-white mb-6 flex items-center space-x-1.5 transition duration-200">
            <i data-lucide="arrow-left" class="w-4 h-4 mr-1"></i>
            <span>Back to Services List</span>
        </button>

        <div class="admin-section p-6 rounded-xl shadow-lg">
            <form id="service-form" class="space-y-6">
                <input type="hidden" id="service-id" value="${data.id}">
                
                <h3 class="text-xl font-bold text-purple-400 border-b border-gray-700 pb-2">Service Details</h3>
                ${generateInputField('service-title', 'Service Title', 'text', data.title, true)}
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${generateInputField('service-provider', 'Service Provider Name', 'text', data.provider, true)}
                    ${generateInputField('service-price', 'Starting Price ($)', 'number', data.price, true, '0.00', 'col-span-1', 'step="0.01" min="0"')}
                </div>
                
                ${generateTextareaField('service-shortDescription', 'Short Description (Max 3 lines on card)', data.shortDescription, true, 'A brief summary of the service...')}
                ${generateTextareaField('service-longDescription', 'Full Detailed Description', data.longDescription || '', true, 'The complete explanation of what the service offers...')}
                
                <h3 class="text-xl font-bold text-purple-400 border-b border-gray-700 pb-2 mt-8">Provider Contact Info (Handle/Number only)</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${generateInputField('contact-whatsapp-handle', 'WhatsApp Number (e.g., 15550000000)', 'text', data.contact.whatsapp || '', true)}
                    ${generateInputField('contact-instagram-handle', 'Instagram Handle (e.g., @myuser)', 'text', data.contact.instagram || '', true)}
                    ${generateInputField('contact-telegram-handle', 'Telegram Handle (e.g., @myuser)', 'text', data.contact.telegram || '', true)}
                </div>

                <h3 class="text-xl font-bold text-purple-400 border-b border-gray-700 pb-2 mt-8">Portfolio Images</h3>
                <div id="portfolio-container" class="space-y-4 pt-2">
                    <p class="text-sm text-gray-400">URLs for portfolio images to display on the details page.</p>
                    ${portfolioHTML}
                </div>
                
                <button type="button" onclick="addImageFieldToPortfolio()" class="bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg flex items-center space-x-2">
                    <i data-lucide="image" class="w-5 h-5"></i>
                    <span>Add Portfolio Image Field</span>
                </button>
                
                <button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 mt-8">
                    <i data-lucide="${isEditing ? 'save' : 'plus-circle'}" class="w-5 h-5 inline mr-2"></i>
                    <span>${isEditing ? 'Save Changes and Publish' : 'Add Service and Publish'}</span>
                </button>
                ${isEditing ? `<button type="button" onclick="deleteService('${data.id}', true)" class="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-lg transition duration-200 mt-4">
                    <i data-lucide="trash-2" class="w-5 h-5 inline mr-2"></i>
                    <span>Delete This Service</span>
                </button>` : ''}
            </form>
        </div>
    `;
    container.innerHTML = formHTML;
    lucide.createIcons();
    document.getElementById('service-form').onsubmit = saveService;
};

/** Helper to add a dynamic image field to portfolio */
const addImageFieldToPortfolio = (url = '') => {
    const container = document.getElementById('portfolio-container');
    const index = container.querySelectorAll('.form-group').length;
    const newField = document.createElement('div');
    newField.className = "form-group relative";
    newField.innerHTML = `
        ${generateInputField(`portfolio-${index}`, `Portfolio Image URL ${index + 1}`, 'url', url, false, 'https://...', 'mb-2').replace('div class="form-group', 'div')}
        <button type="button" onclick="removeImageField(this)" class="remove-image-btn bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-lg">
            <i data-lucide="x" class="w-4 h-4"></i>
        </button>
    `;
    container.appendChild(newField);
    lucide.createIcons();
};


/** Handle Service Save (Add/Edit) */
const saveService = async (e) => {
    e.preventDefault();
    const form = e.target;
    const serviceId = form.querySelector('#service-id').value;
    const isEditing = !!serviceId;
    
    // Collect portfolio images
    const portfolioFields = form.querySelectorAll('#portfolio-container input[type="url"]');
    const portfolio = Array.from(portfolioFields).map(input => input.value.trim()).filter(url => url.length > 0);

    const newService = {
        id: isEditing ? serviceId : generateUniqueId(),
        title: form.querySelector('#service-title').value.trim(),
        provider: form.querySelector('#service-provider').value.trim(),
        shortDescription: form.querySelector('#service-shortDescription').value.trim(),
        longDescription: form.querySelector('#service-longDescription').value.trim(),
        price: parseFloat(form.querySelector('#service-price').value),
        contact: {
            whatsapp: form.querySelector('#contact-whatsapp-handle').value.trim(),
            instagram: form.querySelector('#contact-instagram-handle').value.trim(),
            telegram: form.querySelector('#contact-telegram-handle').value.trim()
        },
        portfolio: portfolio,
    };

    if (isEditing) {
        // Update existing service
        const index = adminUserServices.findIndex(s => s.id === serviceId);
        if (index !== -1) {
            adminUserServices[index] = newService;
        }
    } else {
        // Add new service
        adminUserServices.push(newService);
    }

    const message = isEditing 
        ? `Update: Edited community service "${newService.title}"`
        : `Add: Added new community service "${newService.title}"`;
        
    const success = await updateFileOnGitHub(message);
    if (success) changeAdminView('services');
};

/** Handle Service Delete */
const deleteService = async (serviceId, confirmAction = false) => {
    if (!confirmAction) {
        if (!confirm('Are you sure you want to delete this community service? This action is irreversible.')) {
            return;
        }
    }
    
    const service = adminUserServices.find(s => s.id === serviceId);
    adminUserServices = adminUserServices.filter(s => s.id !== serviceId);
    
    const success = await updateFileOnGitHub(`Delete: Removed community service "${service ? service.title : serviceId}"`);
    if (success) changeAdminView('services');
};


// Expose functions globally
window.changeAdminView = changeAdminView;
window.saveConfig = saveConfig;
window.fetchAndParseData = fetchAndParseData;
window.renderContactManagement = renderContactManagement;
window.renderProductsManagement = renderProductsManagement;
window.renderProductForm = renderProductForm;
window.saveProduct = saveProduct;
window.deleteProduct = deleteProduct;
window.addImageField = addImageField;
window.removeImageField = removeImageField;
window.addImageFieldToPortfolio = addImageFieldToPortfolio;
