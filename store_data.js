/**
 * هذا الملف يتم توليده وتحديثه تلقائياً بواسطة لوحة التحكم الإدارية (admin_panel.html).
 * يحتوي على جميع بيانات المتجر في صيغة JavaScript Object.
 */
const storeData = {
    // ----------------------------------------------------------------
    // 1. Categories Data (فئات المنتجات والخدمات)
    // - يتم استخدام هذه الفئات لتصنيف كل من المنتجات والخدمات.
    // ----------------------------------------------------------------
    categories: [
        { id: "cat-1", name: "E-Books & Guides" },
        { id: "cat-2", name: "Web & Graphic Design" },
        { id: "cat-3", name: "Programming Tools" },
        { id: "cat-4", name: "Digital Art" }
    ],

    // ----------------------------------------------------------------
    // 2. Products Data (المنتجات المعروضة في index.html)
    // ----------------------------------------------------------------
    products: [
        {
            id: "prod-101",
            title: "Advanced CSS Mastery",
            description: "كتاب إلكتروني شامل يغطي أحدث تقنيات CSS، مثل Flexbox وGrid، والتصميم المتجاوب للمحترفين.",
            price: 49.99,
            buyUrl: "https://example.com/buy/prod-101",
            categoryId: "cat-1", // يجب أن يتطابق مع ID في قائمة categories
            imageUrls: [
                "https://placehold.co/400x400/FFD700/1C1C1C?text=CSS+Book"
            ],
            isNew: true
        },
        {
            id: "prod-102",
            title: "Minimalist Web Template (React)",
            description: "قالب React نظيف وعالي الأداء لبناء مواقع بورتفوليو احترافية بسرعة.",
            price: 79.00,
            buyUrl: "https://example.com/buy/prod-102",
            categoryId: "cat-3", // يجب أن يتطابق مع ID في قائمة categories
            imageUrls: [
                "https://placehold.co/400x400/1C1C1C/FFD700?text=React+Template"
            ],
            isNew: false
        }
        // أضف المزيد من المنتجات هنا...
    ],

    // ----------------------------------------------------------------
    // 3. Services Data (الخدمات المعروضة في community_services_showcase.html)
    // ----------------------------------------------------------------
    services: [
        {
            id: "serv-201",
            title: "Professional Logo Design",
            description: "باقة متكاملة لتصميم الشعار والهوية البصرية. تشمل 3 مفاهيم فريدة، مراجعات، وجميع ملفات المصدر.",
            price: 150.00,
            provider: "DesignMaster",
            categoryId: "cat-2", // يجب أن يتطابق مع ID في قائمة categories
            coverUrl: "https://placehold.co/600x400/3B82F6/FFFFFF?text=Logo+Design",
            deliverables: "ملفات فيكتور (AI, EPS)، PNG، JPG، دليل العلامة التجارية PDF.",
            contacts: {
                telegram: "https://t.me/DesignMaster_username",
                whatsapp: "https://wa.me/966500000000",
                instagram: "https://instagram.com/designmaster_pro"
            }
        },
        {
            id: "serv-202",
            title: "Custom Shopify Development",
            description: "بناء متجر إلكتروني مخصص بالكامل باستخدام Shopify، محسّن للسرعة والهواتف المحمولة.",
            price: 800.00,
            provider: "EcomDev_Pro",
            categoryId: "cat-3", // يجب أن يتطابق مع ID في قائمة categories
            coverUrl: "https://placehold.co/600x400/10B981/FFFFFF?text=Shopify+Dev",
            deliverables: "إعداد المتجر بالكامل، قالب مخصص، دعم لمدة 3 أشهر.",
            contacts: {
                telegram: "https://t.me/EcomDev_Pro_username",
                whatsapp: "https://wa.me/966501111111",
                instagram: "" // اتركها فارغة إذا لم يكن لديك حساب
            }
        }
        // أضف المزيد من الخدمات هنا...
    ]
};
