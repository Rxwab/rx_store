/**
 * Consolidated Store Data 
 * This file is generated and updated by the Admin Panel (admin_panel.html)
 * * يحتوي على البيانات المنظمة لجميع الفئات والمنتجات والخدمات
 * ويتم تصديره كوحدة (module) ليتم استيراده في صفحات العرض
 */
const storeData = {
    // --- بيانات الفئات (Categories) ---
    categories: [
        { 
            id: 'c-101', 
            name: 'Digital Courses' 
        },
        { 
            id: 'c-102', 
            name: 'E-Books & Guides' 
        }
    ],
    
    // --- بيانات المنتجات (Products) ---
    products: [
        {
            id: 'p-1001',
            categoryId: 'c-101',
            title: 'Advanced Backend Development Bootcamp',
            price: 299.00,
            description: 'A comprehensive, 10-module course covering Node.js, databases, and API security. Learn to build scalable web applications from scratch.',
            imageUrls: [
                'https://placehold.co/600x400/FFD700/1C1C1C?text=BACKEND+COURSE+COVER'
            ],
            buyUrl: 'https://checkout.example.com/backend-bootcamp'
        }
    ],
    
    // --- بيانات الخدمات (Services) ---
    services: [
        {
            "id": "s-2001",
            "title": "Custom Mobile App Development",
            "price": 1800.00,
            "description": "Full-cycle development of a native or cross-platform mobile application, tailored to your business needs, starting from wireframes to final deployment.",
            "coverUrl": "https://placehold.co/400x300/1C1C1C/FFFFFF?text=MOBILE+DEV+SERVICE",
            "provider": "Rx Development Team", // اسم موفر الخدمة
            "deliverables": "Full source code, 3 months post-launch support, and app store submission assistance.", // ما سيتم تسليمه
            "portfolioImages": [
                "https://placehold.co/600x400/4B5563/FFFFFF?text=App+Design+Mockup"
            ],
            "contacts": {
                "whatsapp": "https://wa.me/1234567890",
                "telegram": "https://t.me/dev_telegram_contact",
                "instagram": "https://instagram.com/dev_instagram_contact"
            }
        }
    ]
};

// Exporting the object for use in other files (like index.html and community_services_showcase.html)
export default storeData;
