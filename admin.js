// ===================================================
// GitHub Configuration & State Management
// ===================================================

let githubConfig = {};
const FILE_PATH = 'index.html'; // اسم ملف المحتوى الذي يتم تعديله

// تحميل الإعدادات من Local Storage عند بدء التشغيل
function loadConfig() {
    const config = localStorage.getItem('githubConfig');
    if (config) {
        githubConfig = JSON.parse(config);
        document.getElementById('pat').value = githubConfig.pat || '';
        document.getElementById('owner').value = githubConfig.owner || '';
        document.getElementById('repo').value = githubConfig.repo || '';
        document.getElementById('branch').value = githubConfig.branch || 'main';
        updateGitHubStatus(true);
        // عند التحميل، انتقل مباشرة إلى لوحة القيادة
        changeAdminView('dashboard'); 
        return true;
    }
    updateGitHubStatus(false);
    changeAdminView('settings');
    return false;
}

// تحديث حالة الاتصال في الشريط الجانبي
function updateGitHubStatus(connected) {
    const indicator = document.getElementById('github-status-indicator');
    const text = document.getElementById('github-status-text');
    if (connected) {
        indicator.classList.remove('bg-red-500');
        indicator.classList.add('bg-green-500');
        text.classList.remove('text-red-400');
        text.classList.add('text-green-400');
        text.textContent = 'متصل';
    } else {
        indicator.classList.remove('bg-green-500');
        indicator.classList.add('bg-red-500');
        text.classList.remove('text-green-400');
        text.classList.add('text-red-400');
        text.textContent = 'غير متصل';
    }
}

// معالجة حفظ إعدادات GitHub
document.getElementById('github-config-form').onsubmit = function(event) {
    event.preventDefault();
    githubConfig = {
        pat: document.getElementById('pat').value,
        owner: document.getElementById('owner').value,
        repo: document.getElementById('repo').value,
        branch: document.getElementById('branch').value
    };
    localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
    updateGitHubStatus(true);
    alertCustom('نجاح', 'تم حفظ إعدادات GitHub بنجاح.', 'success');
    changeAdminView('dashboard');
};

// مسح الإعدادات المحلية
function clearLocalStorage() {
    localStorage.removeItem('githubConfig');
    githubConfig = {};
    document.getElementById('pat').value = '';
    document.getElementById('owner').value = '';
    document.getElementById('repo').value = '';
    document.getElementById('branch').value = 'main';
    updateGitHubStatus(false);
    alertCustom('نجاح', 'تم مسح الإعدادات المحلية.', 'success');
    changeAdminView('settings');
}

// ===================================================
// UI Helpers (Alerts, Modals, Navigation)
// ===================================================

function alertCustom(title, message, type = 'info') {
    const alertContainer = document.getElementById('alert-container');
    const alertDiv = document.createElement('div');
    
    let bgColor, icon;
    if (type === 'success') { bgColor = 'bg-green-500'; icon = 'check-circle'; }
    else if (type === 'error') { bgColor = 'bg-red-500'; icon = 'x-circle'; }
    else { bgColor = 'bg-sky-500'; icon = 'info'; }

    alertDiv.className = `p-4 rounded-lg shadow-lg mb-3 ${bgColor} text-white flex items-center justify-between w-full max-w-sm transition-opacity duration-300`;
    alertDiv.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="${icon}" class="w-5 h-5 ml-3"></i>
            <div>
                <div class="font-bold">${title}</div>
                <p class="text-sm">${message}</p>
            </div>
        </div>
    `;

    alertContainer.appendChild(alertDiv);
    lucide.createIcons();

    // إخفاء التنبيه بعد 5 ثواني
    setTimeout(() => {
        alertDiv.style.opacity = '0';
        setTimeout(() => alertDiv.remove(), 300);
    }, 5000);
}

function closeModal() {
    document.getElementById('modal-container').classList.add('hidden');
    document.getElementById('product-modal').classList.add('hidden');
    document.getElementById('service-modal').classList.add('hidden');
}

function updateNavState() {
    const currentView = document.querySelector('#admin-content > div:not(.hidden)').dataset.view;
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === currentView) {
            btn.classList.add('active');
        }
    });
}

// ===================================================
// Core GitHub API Functions
// ===================================================

const GITHUB_API = 'https://api.github.com';

// جلب محتوى index.html الحالي
async function fetchFileContent() {
    if (!githubConfig.pat) {
        alertCustom('خطأ في الاتصال', 'يرجى حفظ إعدادات GitHub أولاً.', 'error');
        changeAdminView('settings');
        return null;
    }

    const url = `${GITHUB_API}/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${FILE_PATH}?ref=${githubConfig.branch}`;
    
    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `token ${githubConfig.pat}`,
                'Accept': 'application/vnd.github.v3.raw'
            }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`GitHub API Error: ${response.statusText}. Details: ${errorData.message}`);
        }

        const content = await response.text();
        // جلب الـ SHA للملف لاستخدامه في الـ commit
        const shaResponse = await fetch(url, {
            headers: {
                'Authorization': `token ${githubConfig.pat}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        const shaData = await shaResponse.json();
        githubConfig.sha = shaData.sha;
        localStorage.setItem('githubConfig', JSON.stringify(githubConfig));
        
        return content;
    } catch (error) {
        console.error("Error fetching file content:", error);
        alertCustom('خطأ في الجلب', `فشل في جلب ${FILE_PATH}: ${error.message}`, 'error');
        return null;
    }
}

// تحديث الملف ونشره (Commit)
async function updateFileContent(newContent, commitMessage) {
    if (!githubConfig.sha) {
        alertCustom('خطأ', 'فشل في الحصول على SHA للملف، يرجى إعادة تحميل الصفحة.', 'error');
        return;
    }

    const url = `${GITHUB_API}/repos/${githubConfig.owner}/${githubConfig.repo}/contents/${FILE_PATH}`;
    const base64Content = btoa(unescape(encodeURIComponent(newContent)));

    const commitData = {
        message: commitMessage,
        content: base64Content,
        sha: githubConfig.sha,
        branch: githubConfig.branch
    };
    
    // Show loading state
    document.body.style.cursor = 'wait';

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${githubConfig.pat}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commitData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Commit Error: ${response.statusText}. Details: ${errorData.message}`);
        }

        const data = await response.json();
        githubConfig.sha = data.content.sha; // تحديث الـ SHA الجديد
        localStorage.setItem('githubConfig', JSON.stringify(githubConfig));

        alertCustom('نجاح النشر', 'تم تحديث الموقع بنجاح!.', 'success');
        return true;

    } catch (error) {
        console.error("Error committing file content:", error);
        alertCustom('فشل النشر', `فشل في النشر على GitHub: ${error.message}`, 'error');
        return false;
    } finally {
        document.body.style.cursor = 'default';
    }
}

// ===================================================
// Navigation Logic
// ===================================================

async function changeAdminView(viewName) {
    // Hide all views first
    document.querySelectorAll('[data-view]').forEach(view => view.classList.add('hidden'));

    if (viewName !== 'settings' && !loadConfig()) {
        return; 
    }

    const content = await fetchFileContent();
    if (!content && viewName !== 'settings') return;
    
    // Call the appropriate render function
    switch (viewName) {
        case 'dashboard':
            renderDashboardView(content);
            break;
        case 'products':
            renderProductsView(content);
            break;
        case 'services':
            renderServicesView(content);
            break;
        case 'contact': // <--- الحالة الجديدة لإدارة التواصل
            renderContactView(content);
            break;
        case 'settings':
            document.getElementById('settings-view').classList.remove('hidden');
            break;
        default:
            document.getElementById('dashboard-view').classList.remove('hidden');
            break;
    }

    updateNavState();
    lucide.createIcons();
}

// ===================================================
// Data Parsing and Array Manipulation
// ===================================================

// دالة شاملة لاستخراج مصفوفة من المحتوى بناءً على اسم المتغير
function extractArray(content, varName) {
    const regex = new RegExp(`let ${varName} = (\\s*\\[[\\s\\S]*?\\]\\s*);`);
    const match = content.match(regex);
    if (!match) return [];
    
    try {
        let arrayString = match[1].trim();
        if (arrayString.endsWith(';')) arrayString = arrayString.slice(0, -1);
        // استخدام new Function لتحليل المصفوفة بشكل آمن من النص
        return new Function('return ' + arrayString)();
    } catch (e) {
        console.error(`Error parsing ${varName} array:`, e);
        alertCustom('خطأ في البيانات', `فشل في تحليل بيانات ${varName} من الملف.`, 'error');
        return [];
    }
}

// دالة شاملة لاستخراج كائن settings
function extractSettings(content) {
    const settingsMatch = content.match(/let settings = (\{[\s\S]*?\});/);
    if (!settingsMatch) return { contact: {} };

    try {
        let settingsString = settingsMatch[1].trim().replace(/;$/, '');
        return new Function('return ' + settingsString)();
    } catch (e) {
        console.error("Error parsing settings object:", e);
        return { contact: {} };
    }
}

// ===================================================
// Core Feature: Deletion Logic (منطق الحذف - مُحدث)
// ===================================================

async function deleteItem(id, type) {
    if (!confirm(`هل أنت متأكد من حذف هذا ${type === 'product' ? 'المنتج' : 'الخدمة'}؟ لا يمكن التراجع عن هذا الإجراء.`)) {
        return;
    }

    const currentContent = await fetchFileContent();
    if (!currentContent) return;
    
    const itemType = type === 'product' ? 'products' : 'userServices';
    const regex = new RegExp(`let ${itemType} = (\\s*\\[[\\s\\S]*?\\]\\s*);`);
    const match = currentContent.match(regex);
    
    if (!match) {
        alertCustom('خطأ', `لم يتم العثور على مصفوفة ${itemType} في index.html.`, 'error');
        return;
    }
    
    try {
        // استخراج المصفوفة
        let arrayString = match[1].trim();
        if (arrayString.endsWith(';')) arrayString = arrayString.slice(0, -1);
        const items = new Function('return ' + arrayString)();

        // الحذف
        const updatedItems = items.filter(item => item.id !== id);
        
        if (updatedItems.length === items.length) {
             alertCustom('خطأ', `لم يتم العثور على العنصر برقم ${id}.`, 'error');
             return;
        }

        // تحويل المصفوفة المحدثة إلى سلسلة JavaScript منسقة
        const updatedArrayString = JSON.stringify(updatedItems, null, 4);

        // استبدال المصفوفة القديمة بالجديدة في المحتوى
        const updatedContent = currentContent.replace(
            regex,
            `let ${itemType} = ${updatedArrayString};`
        );
        
        const success = await updateFileContent(updatedContent, `Delete ${type} with ID ${id}.`);

        if (success) {
            // تحديث الواجهة بعد النشر الناجح
            changeAdminView(type === 'product' ? 'products' : 'services');
        }
        
    } catch (e) {
        alertCustom('خطأ', `فشل في تحليل أو حذف مصفوفة ${itemType}.`, 'error');
        console.error("Deletion error:", e);
    }
}


// ===================================================
// 1. Contact Info Management (الميزة الجديدة المكتملة)
// ===================================================

function renderContactView(content) {
    const settings = extractSettings(content);
    
    document.getElementById('contact-whatsapp').value = settings.contact.whatsapp || '';
    document.getElementById('contact-instagram').value = settings.contact.instagram || '';
    document.getElementById('contact-telegram').value = settings.contact.telegram || '';
    
    document.getElementById('contact-view').classList.remove('hidden');
    document.getElementById('contact-update-form').onsubmit = handleContactUpdate;
}

async function handleContactUpdate(event) {
    event.preventDefault();
    const newWhatsapp = document.getElementById('contact-whatsapp').value;
    const newInstagram = document.getElementById('contact-instagram').value;
    const newTelegram = document.getElementById('contact-telegram').value;

    const newSettings = {
        contact: {
            whatsapp: newWhatsapp,
            instagram: newInstagram,
            telegram: newTelegram
        }
    };
    
    const settingsJson = JSON.stringify(newSettings, null, 4);
    
    const currentContent = await fetchFileContent();
    if (!currentContent) return;

    // استبدال كائن settings بالكامل
    const updatedContent = currentContent.replace(
        /let settings = \{[\s\S]*?\};/, 
        `let settings = ${settingsJson};`
    );

    const success = await updateFileContent(updatedContent, 'Update primary contact info links.');
    if (success) {
        changeAdminView('contact');
    }
}


// ===================================================
// 2. Product Management Logic
// ===================================================

function renderProductsView(content) {
    const products = extractArray(content, 'products');
    const productsList = document.getElementById('products-list');
    productsList.innerHTML = '';
    
    document.getElementById('products-empty').classList.toggle('hidden', products.length > 0);

    products.forEach(product => {
        const productDiv = document.createElement('div');
        productDiv.className = 'bg-gray-800 p-4 rounded-xl shadow flex justify-between items-center';
        productDiv.innerHTML = `
            <div>
                <h3 class="text-lg font-bold text-white">${product.title}</h3>
                <p class="text-sm text-gray-400">${product.category} - $${product.price}</p>
            </div>
            <div class="space-x-2 flex">
                <button onclick="showProductModal('edit', ${product.id})" class="text-sky-400 hover:text-sky-300 transition flex items-center">
                    <i data-lucide="square-pen" class="w-5 h-5 ml-1"></i> تعديل
                </button>
                <button onclick="deleteItem(${product.id}, 'product')" class="text-red-400 hover:text-red-300 transition flex items-center">
                    <i data-lucide="trash-2" class="w-5 h-5 ml-1"></i> حذف
                </button>
            </div>
        `;
        productsList.appendChild(productDiv);
    });

    document.getElementById('products-view').classList.remove('hidden');
}

function showProductModal(action, id = null) {
    document.getElementById('product-form').reset();
    document.getElementById('product-id').value = id;
    document.getElementById('product-action-type').value = action;
    
    const modalTitle = document.getElementById('product-modal-title');
    const submitBtn = document.getElementById('product-submit-btn');

    if (action === 'add') {
        modalTitle.textContent = 'إضافة منتج جديد';
        submitBtn.innerHTML = '<i data-lucide="upload" class="w-5 h-5 ml-2"></i> نشر المنتج';
        
    } else if (action === 'edit') {
        modalTitle.textContent = 'تعديل المنتج';
        submitBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5 ml-2"></i> حفظ التعديلات والنشر';
        loadProductDataForEdit(id);
    }

    document.getElementById('modal-container').classList.remove('hidden');
    document.getElementById('product-modal').classList.remove('hidden');
    lucide.createIcons();
}

async function loadProductDataForEdit(id) {
    const content = await fetchFileContent();
    const products = extractArray(content, 'products');
    const product = products.find(p => p.id === id);
    
    if (product) {
        document.getElementById('product-title').value = product.title;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-affiliate').value = product.affiliateUrl;
        document.getElementById('product-image').value = product.imageUrl;
        document.getElementById('product-gallery').value = (product.gallery || []).join(', ');
        document.getElementById('product-description').value = product.description;
    }
}

document.getElementById('product-form').onsubmit = handleProductSubmit;

async function handleProductSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('product-id').value ? parseInt(document.getElementById('product-id').value) : Date.now();
    const action = document.getElementById('product-action-type').value;

    const newProduct = {
        id: id,
        title: document.getElementById('product-title').value,
        category: document.getElementById('product-category').value,
        price: parseFloat(document.getElementById('product-price').value),
        affiliateUrl: document.getElementById('product-affiliate').value,
        imageUrl: document.getElementById('product-image').value,
        description: document.getElementById('product-description').value,
        gallery: document.getElementById('product-gallery').value.split(',').map(url => url.trim()).filter(url => url)
    };
    
    const currentContent = await fetchFileContent();
    if (!currentContent) return;

    let products = extractArray(currentContent, 'products');
    let commitMsg = '';

    if (action === 'add') {
        products.unshift(newProduct);
        commitMsg = `Add new product: ${newProduct.title}`;
    } else if (action === 'edit') {
        const index = products.findIndex(p => p.id === id);
        if (index !== -1) {
            products[index] = newProduct;
            commitMsg = `Update product: ${newProduct.title}`;
        } else {
            alertCustom('خطأ', 'فشل في العثور على المنتج للتعديل.', 'error');
            return;
        }
    }

    const productsJson = JSON.stringify(products, null, 4);
    
    const updatedContent = currentContent.replace(
        /let products = (\[[\s\S]*?\]);/, 
        `let products = ${productsJson};`
    );

    closeModal();
    const success = await updateFileContent(updatedContent, commitMsg);
    if (success) {
        changeAdminView('products');
    }
}

// ===================================================
// 3. Service Management Logic (إدارة الخدمات)
// ===================================================

function renderServicesView(content) {
    const services = extractArray(content, 'userServices');
    const servicesList = document.getElementById('services-list');
    servicesList.innerHTML = '';
    
    document.getElementById('services-empty').classList.toggle('hidden', services.length > 0);

    services.forEach(service => {
        const serviceDiv = document.createElement('div');
        serviceDiv.className = 'bg-gray-800 p-4 rounded-xl shadow flex justify-between items-center';
        serviceDiv.innerHTML = `
            <div>
                <h3 class="text-lg font-bold text-white">${service.title}</h3>
                <p class="text-sm text-gray-400">مقدم الخدمة: ${service.provider} - $${service.price}</p>
            </div>
            <div class="space-x-2 flex">
                <button onclick="showServiceModal('edit', ${service.id})" class="text-purple-400 hover:text-purple-300 transition flex items-center">
                    <i data-lucide="square-pen" class="w-5 h-5 ml-1"></i> تعديل
                </button>
                <button onclick="deleteItem(${service.id}, 'service')" class="text-red-400 hover:text-red-300 transition flex items-center">
                    <i data-lucide="trash-2" class="w-5 h-5 ml-1"></i> حذف
                </button>
            </div>
        `;
        servicesList.appendChild(serviceDiv);
    });

    document.getElementById('services-view').classList.remove('hidden');
}

function showServiceModal(action, id = null) {
    document.getElementById('service-form').reset();
    document.getElementById('service-id').value = id;
    document.getElementById('service-action-type').value = action;

    const modalTitle = document.getElementById('service-modal-title');
    const submitBtn = document.getElementById('service-submit-btn');

    if (action === 'add') {
        modalTitle.textContent = 'إضافة خدمة جديدة';
        submitBtn.innerHTML = '<i data-lucide="upload" class="w-5 h-5 ml-2"></i> نشر الخدمة';
    } else if (action === 'edit') {
        modalTitle.textContent = 'تعديل الخدمة';
        submitBtn.innerHTML = '<i data-lucide="save" class="w-5 h-5 ml-2"></i> حفظ التعديلات والنشر';
        loadServiceDataForEdit(id);
    }

    document.getElementById('modal-container').classList.remove('hidden');
    document.getElementById('service-modal').classList.remove('hidden');
    lucide.createIcons();
}

async function loadServiceDataForEdit(id) {
    const content = await fetchFileContent();
    const services = extractArray(content, 'userServices');
    const service = services.find(s => s.id === id);

    if (service) {
        document.getElementById('service-title').value = service.title;
        document.getElementById('service-provider').value = service.provider;
        document.getElementById('service-price').value = service.price;
        document.getElementById('service-short-desc').value = service.shortDescription;
        document.getElementById('service-long-desc').value = service.longDescription;
        
        // Contact Info
        document.getElementById('service-whatsapp').value = service.contact.whatsapp || '';
        document.getElementById('service-instagram').value = service.contact.instagram || '';
        document.getElementById('service-telegram').value = service.contact.telegram || '';
        
        // Portfolio Images
        document.getElementById('service-portfolio').value = (service.portfolio || []).join(', ');
    }
}

document.getElementById('service-form').onsubmit = handleServiceSubmit;

async function handleServiceSubmit(event) {
    event.preventDefault();

    const id = document.getElementById('service-id').value ? parseInt(document.getElementById('service-id').value) : Date.now();
    const action = document.getElementById('service-action-type').value;

    const newService = {
        id: id,
        title: document.getElementById('service-title').value,
        provider: document.getElementById('service-provider').value,
        price: parseFloat(document.getElementById('service-price').value),
        shortDescription: document.getElementById('service-short-desc').value,
        longDescription: document.getElementById('service-long-desc').value,
        contact: {
            whatsapp: document.getElementById('service-whatsapp').value,
            instagram: document.getElementById('service-instagram').value,
            telegram: document.getElementById('service-telegram').value,
        },
        portfolio: document.getElementById('service-portfolio').value.split(',').map(url => url.trim()).filter(url => url)
    };

    const currentContent = await fetchFileContent();
    if (!currentContent) return;

    let services = extractArray(currentContent, 'userServices');
    let commitMsg = '';

    if (action === 'add') {
        services.unshift(newService);
        commitMsg = `Add new service: ${newService.title}`;
    } else if (action === 'edit') {
        const index = services.findIndex(s => s.id === id);
        if (index !== -1) {
            services[index] = newService;
            commitMsg = `Update service: ${newService.title}`;
        } else {
            alertCustom('خطأ', 'فشل في العثور على الخدمة للتعديل.', 'error');
            return;
        }
    }

    const servicesJson = JSON.stringify(services, null, 4);

    const updatedContent = currentContent.replace(
        /let userServices = (\[[\s\S]*?\]);/,
        `let userServices = ${servicesJson};`
    );

    closeModal();
    const success = await updateFileContent(updatedContent, commitMsg);
    if (success) {
        changeAdminView('services');
    }
}

// ===================================================
// 4. Dashboard Logic
// ===================================================

function renderDashboardView(content) {
    const products = extractArray(content, 'products');
    const services = extractArray(content, 'userServices');
    
    document.getElementById('product-count').textContent = products.length;
    document.getElementById('service-count').textContent = services.length;
    
    document.getElementById('dashboard-view').classList.remove('hidden');
}


// ===================================================
// Initialization
// ===================================================
document.addEventListener('DOMContentLoaded', () => {
    loadConfig();
});
