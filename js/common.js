const SIDEBAR_BREAKPOINT = 992;
const SIDEBAR_STATE_KEY = 'sidebarCollapsed';
let sidebarResizeTimer = null;

// Inject Users link in sidebar for admin/superuser across pages
(function(){
    document.addEventListener('DOMContentLoaded', function(){
        try {
            // استخدم مستخدم الجلسة الفعلي بدون إدخال افتراضي
            let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            const role = (currentUser && currentUser.role ? currentUser.role : '').toLowerCase();
            // تحديث الاسم والأفاتار في الهيدر
            const nameEl = document.querySelector('.user-name');
            const avatarEl = document.querySelector('.user-avatar');
            if (nameEl && currentUser && currentUser.name) nameEl.textContent = currentUser.name;
            if (avatarEl && currentUser && currentUser.name) avatarEl.textContent = String(currentUser.name).charAt(0).toUpperCase();
            const page = (location.pathname.split('/').pop()||'').toLowerCase();
            if (['admin','superuser'].includes(role)) {
                const menu = document.querySelector('.sidebar-menu');
                if (menu && !menu.querySelector('a.menu-item[href="users.html"]')) {
                    const link = document.createElement('a');
                    link.className = 'menu-item';
                    link.href = 'users.html';
                    const langPref = (localStorage.getItem('lang') || 'ar').toLowerCase();
                    const label = langPref === 'ar' ? 'المستخدمين' : 'Users';
                    link.setAttribute('data-label-key','sidebar-users');
                    link.innerHTML = `<i class="fas fa-user-shield"></i><span>${label}</span>`;
                    const logout = menu.querySelector('.logout-item');
                    if (logout) menu.insertBefore(link, logout); else menu.appendChild(link);
                }
            }
        } catch(e) { /* ignore */ }
        
        const sidebarToggleButton = ensureMenuToggle();
        initSidebarToggle(sidebarToggleButton);

        const settingsIcon = document.querySelector('.nav-icons .icon-item[title="الإعدادات"], .nav-icons a.icon-item[title="الإعدادات"], .icon-item .fa-cog');
        if (settingsIcon) {
            const linkEl = settingsIcon.closest('.icon-item') || settingsIcon;
            linkEl.addEventListener('click', function(e){
                e.preventDefault();
                try { localStorage.setItem('openSettingsSidebar', '1'); } catch(_) {}
                window.location.href = 'settings.html';
            });
        }

        const bellIcon = document.querySelector('.nav-icons .icon-item[title="الإشعارات"], .nav-icons .fa-bell');
        if (bellIcon) {
            const linkEl = bellIcon.closest('.icon-item') || bellIcon;
            linkEl.addEventListener('click', function(e){
                e.preventDefault();
                window.location.href = 'notifications.html';
            });
        }

        const profileIcon = document.querySelector('.nav-icons .user-profile');
        if (profileIcon) {
            profileIcon.addEventListener('click', function(e){
                e.preventDefault();
                window.location.href = 'settings.html';
            });
        }

        applyLanguage(localStorage.getItem('lang') || 'ar');
        setupLanguageToggle();
        setupLanguageSelect();
        
        // حواجز الوصول وروابط حسب الدور
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
            const role = (currentUser && currentUser.role ? currentUser.role : '').toLowerCase();
            const page = (location.pathname.split('/').pop()||'').toLowerCase();
            if (role === 'user') {
                // منع الوصول المباشر
                if (page === 'settings.html' || page === 'report.html' || page === 'users.html') {
                    window.location.href = 'home.html';
                    return;
                }
                // إخفاء روابط السايدبار
                const menu = document.querySelector('.sidebar-menu');
                if (menu) {
                    const settingsLink = menu.querySelector('a.menu-item[href="settings.html"]');
                    const reportsLink = menu.querySelector('a.menu-item[href="report.html"]');
                    const analyticsLink = menu.querySelector('a.menu-item[href="report.html?view=dashboard"]');
                    const usersLink = menu.querySelector('a.menu-item[href="users.html"]');
                    [settingsLink, reportsLink, analyticsLink, usersLink].forEach(el => { if (el) el.remove(); });
                }
                // إخفاء السايدبار بالكامل
                const sidebar = document.querySelector('.sidebar');
                if (sidebar) sidebar.style.display = 'none';
                // إخفاء أيقونة الإعدادات في الهيدر
                const settingsIconEl = document.querySelector('.nav-icons .icon-item[title="الإعدادات"], .nav-icons a.icon-item[title="الإعدادات"], .icon-item .fa-cog');
                if (settingsIconEl) {
                    const el = settingsIconEl.closest('.icon-item') || settingsIconEl;
                    if (el && el.parentNode) el.parentNode.removeChild(el);
                }
            } else if (role === 'superuser') {
                // إخفاء أزرار الموافقة/الرفض إن وجدت
                const selectors = [
                    '.approve-btn', '.refuse-btn',
                    'button[title*="موافقة"]', 'button[title*="رفض"]'
                ];
                selectors.forEach(sel => {
                    document.querySelectorAll(sel).forEach(el => { el.style.display = 'none'; });
                });
            }
        } catch(_) {}
    });
})();

function initSidebarToggle(toggleButton) {
    if (!toggleButton) return;
    syncSidebarWithViewport(toggleButton);
    toggleButton.addEventListener('click', function() {
        handleSidebarToggle(this);
    });
    window.addEventListener('resize', function() {
        clearTimeout(sidebarResizeTimer);
        sidebarResizeTimer = setTimeout(function(){
            syncSidebarWithViewport(toggleButton);
        }, 120);
    });
    document.addEventListener('click', function(e){
        handleSidebarOutsideClick(e, toggleButton);
    }, true);
}

function handleSidebarToggle(toggleButton) {
    const body = document.body;
    const isDesktop = window.innerWidth >= SIDEBAR_BREAKPOINT;
    if (isDesktop) {
        const collapsed = body.classList.toggle('sidebar-collapsed');
        try {
            localStorage.setItem(SIDEBAR_STATE_KEY, collapsed ? '1' : '0');
        } catch(_) {}
    } else {
        const opened = body.classList.toggle('sidebar-mobile-open');
        body.classList.toggle('lock-scroll', opened);
    }
    updateToggleVisual(toggleButton);
}

function handleSidebarOutsideClick(event, toggleButton) {
    const body = document.body;
    if (window.innerWidth >= SIDEBAR_BREAKPOINT) return;
    if (!body.classList.contains('sidebar-mobile-open')) return;
    const sidebar = document.querySelector('.sidebar');
    const clickedInsideSidebar = sidebar && sidebar.contains(event.target);
    const clickedToggle = event.target.closest && event.target.closest('.menu-toggle');
    if (!clickedInsideSidebar && !clickedToggle) {
        body.classList.remove('sidebar-mobile-open');
        body.classList.remove('lock-scroll');
        updateToggleVisual(toggleButton);
    }
}

function syncSidebarWithViewport(toggleButton) {
    const body = document.body;
    const isDesktop = window.innerWidth >= SIDEBAR_BREAKPOINT;
    if (isDesktop) {
        body.classList.remove('sidebar-mobile-open', 'lock-scroll');
        const collapsed = (localStorage.getItem(SIDEBAR_STATE_KEY) === '1');
        body.classList.toggle('sidebar-collapsed', collapsed);
    } else {
        body.classList.remove('sidebar-collapsed');
    }
    updateToggleVisual(toggleButton);
}

function updateToggleVisual(toggleButton) {
    if (!toggleButton) return;
    const body = document.body;
    const isDesktop = window.innerWidth >= SIDEBAR_BREAKPOINT;
    const isOpen = isDesktop ? !body.classList.contains('sidebar-collapsed') : body.classList.contains('sidebar-mobile-open');
    toggleButton.innerHTML = isOpen ? '<i class="fas fa-times"></i>' : '<i class="fas fa-bars"></i>';
    toggleButton.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

// تنظيف جلسة المستخدم عند تسجيل الخروج (يمكن استدعاؤها من الصفحات)
function performLogout() {
    try {
        localStorage.removeItem('auth');
        localStorage.removeItem('currentUser');
    } catch(_) {}
    window.location.href = 'index.html';
}

function applyLanguage(lang) {
    const l = (lang||'ar').toLowerCase();
    const html = document.documentElement;
    html.lang = l;
    html.dir = (l === 'ar') ? 'rtl' : 'ltr';
    translateCommon(l);
    translatePage(l);
}

function setLanguage(lang) {
    try { localStorage.setItem('lang', lang); } catch(_) {}
    applyLanguage(lang);
}

function setupLanguageToggle() {
    const nav = document.querySelector('.nav-icons');
    if (!nav) return;
    if (nav.querySelector('.lang-toggle')) return;
    const btn = document.createElement('div');
    btn.className = 'icon-item lang-toggle';
    const cur = (localStorage.getItem('lang')||'ar').toLowerCase();
    btn.innerHTML = cur === 'ar' ? 'EN' : 'AR';
    btn.title = 'Language';
    btn.addEventListener('click', function(){
        const next = ((localStorage.getItem('lang')||'ar').toLowerCase() === 'ar') ? 'en' : 'ar';
        setLanguage(next);
        this.innerHTML = next === 'ar' ? 'EN' : 'AR';
    });
    nav.appendChild(btn);
}

function setupLanguageSelect() {
    const sel = document.getElementById('language');
    if (!sel) return;
    const cur = (localStorage.getItem('lang')||'ar').toLowerCase();
    sel.value = cur;
    sel.addEventListener('change', function(){ setLanguage(this.value); });
}

function translatePage(lang) {
    const page = (location.pathname.split('/').pop()||'').toLowerCase();
    const l = (lang||'ar').toLowerCase();
    const sectionHeader = document.querySelector('.sidebar .section-header');
    if (sectionHeader) sectionHeader.textContent = l==='ar' ? 'المدفوعات' : 'Payments';
    const items = document.querySelectorAll('.sidebar .menu-item span');
    if (items && items.length) {
        let map = [];
        if (page === 'report.html') {
            map = l==='ar' ? ['الرئيسية','طلب دفعة','بحث الطلبات','بحث الموردين','التقارير'] : ['Home','Payment Request','Search Requests','Search Suppliers','Reports'];
        } else {
            map = l==='ar'
                ? ['المدفوعات المكتملة','المدفوعات المعلقة','المدفوعات المرفوضة','الموردين','التقارير','التحليلات','الإعدادات']
                : ['Completed Payments','Pending Payments','Rejected Payments','Suppliers','Reports','Analytics','Settings'];
        }
        for (let i=0;i<items.length && i<map.length;i++) items[i].textContent = map[i];
    }
    const logout = document.querySelector('.sidebar .logout-item span');
    if (logout) logout.textContent = l==='ar' ? 'تسجيل الخروج' : 'Logout';
    const menuUsersLink = document.querySelector('.sidebar .menu-item[data-label-key="sidebar-users"] span');
    if (menuUsersLink) menuUsersLink.textContent = l==='ar' ? 'المستخدمين' : 'Users';

    if (page === 'add-payment.html') {
        setText('.form-section .section-title', l==='ar' ? 'البيانات الأساسية' : 'Basic Data');
        setText('#quickRequestSearchSection .form-label', l==='ar' ? 'ابحث عن طلب دفعة موجود' : 'Search existing payment request');
        setPlaceholder('#quickRequestSearch', l==='ar' ? 'اكتب عنوان الطلب / المشروع / ملاحظة / رقم الفاتورة' : 'Type request title / project / note / invoice number');
        setText('label[for="supplierSelect"]', l==='ar' ? 'اختر المورد' : 'Select Supplier');
        setPlaceholder('#supplierSearch', l==='ar' ? 'ابحث عن مورد بالاسم/البريد/الضريبي' : 'Search supplier by name/email/tax');
        setButton('#manageSuppliersBtn', l==='ar' ? '<i class="fas fa-list"></i> إدارة الموردين' : '<i class="fas fa-list"></i> Manage Suppliers');
        setButton('#addSupplierBtn', l==='ar' ? '<i class="fas fa-user-plus"></i> إضافة مورد' : '<i class="fas fa-user-plus"></i> Add Supplier');
        const selSupp = document.querySelector('#supplierSelect');
        if (selSupp && selSupp.options && selSupp.options.length) {
            selSupp.options[0].text = l==='ar' ? 'اختر المورد' : 'Select Supplier';
        }
        setText('label[for="supplierEmail"]', l==='ar' ? 'البريد الإلكتروني' : 'Email');
        setPlaceholder('#supplierEmail', l==='ar' ? 'البريد الإلكتروني' : 'Email');
        setText('label[for="supplierName"]', l==='ar' ? 'اسم المورد' : 'Supplier Name');
        setPlaceholder('#supplierName', l==='ar' ? 'اسم المورد' : 'Supplier Name');
        setText('label[for="taxNumberView"]', l==='ar' ? 'الرقم الضريبي' : 'Tax Number');
        setPlaceholder('#taxNumberView', l==='ar' ? 'الرقم الضريبي' : 'Tax Number');
        setText('label[for="bankNameView"]', l==='ar' ? 'اسم البنك' : 'Bank Name');
        setPlaceholder('#bankNameView', l==='ar' ? 'اسم البنك' : 'Bank Name');
        setText('label[for="ibanNumberView"]', l==='ar' ? 'رقم الأيبان' : 'IBAN');
        setPlaceholder('#ibanNumberView', l==='ar' ? 'رقم الأيبان' : 'IBAN');
        setText('label[for="paymentType"]', l==='ar' ? 'نوع الدفعة' : 'Payment Type');
        if (l==='ar') {
            setSelectOptions('#paymentType', ['اختر نوع الدفعة','فاتورة','تحت الحساب','أخرى']);
        } else {
            setSelectOptions('#paymentType', ['Select payment type','Invoice','Advance','Other']);
        }
        setText('label[for="projectName"]', l==='ar' ? 'اسم المشروع' : 'Project Name');
        setPlaceholder('#projectName', l==='ar' ? 'أدخل اسم المشروع' : 'Enter project name');
        setText('label[for="invoiceNumber"]', l==='ar' ? 'رقم الفاتورة' : 'Invoice Number');
        setPlaceholder('#invoiceNumber', l==='ar' ? 'أدخل رقم الفاتورة' : 'Enter invoice number');
        setText('#invoiceExtras .form-group .form-label', l==='ar' ? 'صورة الفاتورة' : 'Invoice Image');
        setButton('#uploadInvoiceBtn', l==='ar' ? '<i class="fas fa-upload"></i> رفع الصورة' : '<i class="fas fa-upload"></i> Upload Image');
        setText('#invoiceImageName', l==='ar' ? 'لم يتم اختيار ملف' : 'No file chosen');
        setText('label[for="amount"]', l==='ar' ? 'مبلغ الدفعة' : 'Amount');
        setPlaceholder('#amount', l==='ar' ? 'أدخل مبلغ الدفعة' : 'Enter amount');
        setText('label[for="notes"]', l==='ar' ? 'ملاحظات' : 'Notes');
        setPlaceholder('#notes', l==='ar' ? 'أدخل أي ملاحظات إضافية' : 'Enter any additional notes');
        setButton('#addRequestDetailsBtn', l==='ar' ? '<i class="fas fa-plus"></i> إضافة تفاصيل الطلب' : '<i class="fas fa-plus"></i> Add Request Details');
        setButton('#paymentForm .btn.btn-primary[type="submit"]', l==='ar' ? '<i class="fas fa-paper-plane"></i> إرسال الطلب' : '<i class="fas fa-paper-plane"></i> Submit');
        setButton('#cancelBtn', l==='ar' ? '<i class="fas fa-times"></i> إلغاء' : '<i class="fas fa-times"></i> Cancel');
        setText('#additionalRequestFields .section-title', l==='ar' ? 'تفاصيل الطلب' : 'Request Details');
        setText('label[for="requestTitle"]', l==='ar' ? 'عنوان الطلب' : 'Request Title');
        setPlaceholder('#requestTitle', l==='ar' ? 'أدخل عنوان الطلب' : 'Enter request title');
        setText('label[for="requestRef"]', l==='ar' ? 'مرجع الطلب (اختياري)' : 'Request Reference (optional)');
        setPlaceholder('#requestRef', l==='ar' ? 'أدخل مرجع داخلي للطلب' : 'Enter internal reference');
        setText('label[for="dueDate"]', l==='ar' ? 'تاريخ الاستحقاق (اختياري)' : 'Due Date (optional)');
        setText('label[for="requestDescription"]', l==='ar' ? 'وصف الطلب (اختياري)' : 'Request Description (optional)');
        setPlaceholder('#requestDescription', l==='ar' ? 'أدخل وصفًا مختصرًا' : 'Enter a short description');
        const t = document.querySelector('.form-title');
        if (t) t.innerHTML = l==='ar' ? '<i class="fas fa-file-invoice-dollar"></i> طلب دفعة' : '<i class="fas fa-file-invoice-dollar"></i> Payment Request';
        const s = document.querySelector('.form-subtitle');
        if (s) s.textContent = l==='ar' ? 'أدخل بيانات طلب الدفعة' : 'Enter payment request data';
    }

    if (page === 'add-supplier.html') {
        setText('.form-title', l==='ar' ? 'إضافة مورد جديد' : 'Add New Supplier');
        setText('.form-subtitle', l==='ar' ? 'أدخل بيانات المورد الجديد' : 'Enter new supplier data');
        setText('.form-section .section-title', l==='ar' ? 'البيانات الأساسية' : 'Basic Data');
        setText('label[for="supplierName"]', l==='ar' ? 'اسم المورد' : 'Supplier Name');
        setPlaceholder('#supplierName', l==='ar' ? 'أدخل اسم المورد' : 'Enter supplier name');
        setText('label[for="taxNumber"]', l==='ar' ? 'الرقم الضريبي' : 'Tax Number');
        setPlaceholder('#taxNumber', l==='ar' ? 'أدخل الرقم الضريبي' : 'Enter tax number');
        setText('label[for="bankName"]', l==='ar' ? 'البنك' : 'Bank');
        setPlaceholder('#bankName', l==='ar' ? 'أدخل اسم البنك' : 'Enter bank name');
        setText('label[for="ibanNumber"]', l==='ar' ? 'رقم الأيبان' : 'IBAN');
        setPlaceholder('#ibanNumber', l==='ar' ? 'أدخل رقم الأيبان' : 'Enter IBAN');
        setText('.form-section:nth-of-type(2) .section-title', l==='ar' ? 'بيانات الاتصال (اختياري)' : 'Contact Info (optional)');
        setText('label[for="supplierAddress"]', l==='ar' ? 'العنوان' : 'Address');
        setPlaceholder('#supplierAddress', l==='ar' ? 'أدخل عنوان المورد' : 'Enter supplier address');
        setText('label[for="supplierEmail"]', l==='ar' ? 'البريد الإلكتروني' : 'Email');
        setPlaceholder('#supplierEmail', l==='ar' ? 'أدخل البريد الإلكتروني' : 'Enter email');
        setText('label[for="contactNumber"]', l==='ar' ? 'رقم الاتصال' : 'Contact Number');
        setPlaceholder('#contactNumber', l==='ar' ? 'أدخل رقم الاتصال' : 'Enter contact number');
        setButton('#supplierForm .btn.btn-primary[type="submit"]', l==='ar' ? '<i class="fas fa-plus"></i> إضافة مورد' : '<i class="fas fa-plus"></i> Add Supplier');
        setButton('#cancelBtn', l==='ar' ? '<i class="fas fa-times"></i> إلغاء' : '<i class="fas fa-times"></i> Cancel');
        setText('#quickSupplierSearchSection .form-label', l==='ar' ? 'ابحث عن مورد موجود' : 'Search existing supplier');
        setPlaceholder('#quickSupplierSearch', l==='ar' ? 'اكتب الاسم / البريد / الرقم الضريبي / الجوال' : 'Type name/email/tax/mobile');
    }

    if (page === 'search-suppliers.html') {
        setText('.form-title', l==='ar' ? 'البحث عن مورد' : 'Search Suppliers');
        setText('.form-subtitle', l==='ar' ? 'ابحث باستخدام الاسم، البنك، البريد، أو التاريخ' : 'Search by name, bank, email, or date');
        setText('.form-section .section-title', l==='ar' ? 'فلاتر البحث' : 'Filters');
        setText('label[for="q"]', l==='ar' ? 'كلمة البحث' : 'Search keyword');
        setPlaceholder('#q', l==='ar' ? 'اسم المورد / الإيميل / الرقم الضريبي' : 'Supplier name / email / tax number');
        setText('label[for="bank"]', l==='ar' ? 'اسم البنك' : 'Bank Name');
        setPlaceholder('#bank', l==='ar' ? 'بحث باسم البنك' : 'Search by bank');
        setText('label[for="dateFrom"]', l==='ar' ? 'من تاريخ' : 'From Date');
        setText('label[for="dateTo"]', l==='ar' ? 'إلى تاريخ' : 'To Date');
        setButton('#resetFilters', l==='ar' ? '<i class="fas fa-undo"></i> تصفية جديدة' : '<i class="fas fa-undo"></i> Reset');
        setButton('#applyFilters', l==='ar' ? '<i class="fas fa-search"></i> بحث' : '<i class="fas fa-search"></i> Search');
        setText('.form-section:nth-of-type(2) .section-title', l==='ar' ? 'الموردون' : 'Suppliers');
        const headers = ['اسم المورد','الرقم الضريبي','رقم الأيبان','اسم البنك','البريد الإلكتروني'];
        const headersEn = ['Supplier','Tax Number','IBAN','Bank Name','Email'];
        const ths = document.querySelectorAll('#requestsTable thead th');
        for (let i=0;i<ths.length;i++) ths[i].textContent = l==='ar' ? headers[i]||ths[i].textContent : headersEn[i]||ths[i].textContent;
        setButton('#supViewBasic', l==='ar' ? '<i class="fas fa-list"></i> أساسي' : '<i class="fas fa-list"></i> Basic');
        setButton('#supViewDetails', l==='ar' ? '<i class="fas fa-table"></i> تفاصيل' : '<i class="fas fa-table"></i> Details');
    }

    if (page === 'search-requests.html') {
        setText('.form-title', l==='ar' ? 'البحث عن طلب' : 'Search Requests');
        setText('.form-subtitle', l==='ar' ? 'ابحث باستخدام الحالة، النوع، النص، والتاريخ' : 'Search by status, type, text, and date');
        setText('.form-section .section-title', l==='ar' ? 'فلاتر البحث' : 'Filters');
        setText('label[for="q"]', l==='ar' ? 'كلمة البحث' : 'Search keyword');
        setPlaceholder('#q', l==='ar' ? 'اسم الطلب / المشروع / الملاحظات / رقم الفاتورة' : 'Request name / project / notes / invoice number');
        setText('label[for="status"]', l==='ar' ? 'الحالة' : 'Status');
        if (l==='ar') setSelectOptions('#status', ['الكل','معلق','مقبول','ملغي']); else setSelectOptions('#status', ['All','Pending','Accepted','Canceled']);
        setText('label[for="paymentTypeFilter"]', l==='ar' ? 'نوع الدفعة' : 'Payment Type');
        if (l==='ar') setSelectOptions('#paymentTypeFilter', ['الكل','فاتورة','تحت الحساب','أخرى']); else setSelectOptions('#paymentTypeFilter', ['All','Invoice','Advance','Other']);
        setText('label[for="dateFrom"]', l==='ar' ? 'من تاريخ' : 'From Date');
        setText('label[for="dateTo"]', l==='ar' ? 'إلى تاريخ' : 'To Date');
        setButton('#resetFilters', l==='ar' ? '<i class="fas fa-undo"></i> تصفية جديدة' : '<i class="fas fa-undo"></i> Reset');
        setButton('#applyFilters', l==='ar' ? '<i class="fas fa-search"></i> بحث' : '<i class="fas fa-search"></i> Search');
        setText('.form-section:nth-of-type(2) .section-title', l==='ar' ? 'الطلبات' : 'Requests');
        const headers = ['اسم الطلب','الحالة','تاريخ الطلب','نوع الدفعة','مبلغ الدفعة','رقم الفاتورة'];
        const headersEn = ['Request Name','Status','Request Date','Payment Type','Amount','Invoice Number'];
        const ths = document.querySelectorAll('#requestsTable thead th');
        for (let i=0;i<ths.length;i++) ths[i].textContent = l==='ar' ? headers[i]||ths[i].textContent : headersEn[i]||ths[i].textContent;
        setButton('#reqViewBasic', l==='ar' ? '<i class="fas fa-list"></i> أساسي' : '<i class="fas fa-list"></i> Basic');
        setButton('#reqViewDetails', l==='ar' ? '<i class="fas fa-table"></i> تفاصيل' : '<i class="fas fa-table"></i> Details');
    }

    if (page === 'users.html') {
        setText('.form-title', l==='ar' ? 'إدارة المستخدمين' : 'User Management');
        setText('.form-subtitle', l==='ar' ? 'عرض الإيميلات والأدوار وإضافة مستخدم جديد' : 'View emails, roles, and add new user');
        setButton('#addUserBtn', l==='ar' ? '<i class="fas fa-user-plus"></i> إضافة مستخدم' : '<i class="fas fa-user-plus"></i> Add User');
        setText('#addUserSection .section-title', l==='ar' ? 'إضافة مستخدم جديد' : 'Add New User');
        setText('label[for="new-user-name"]', l==='ar' ? 'اسم المستخدم' : 'Username');
        setPlaceholder('#new-user-name', l==='ar' ? 'أدخل اسم المستخدم' : 'Enter username');
        setText('label[for="new-user-email"]', l==='ar' ? 'البريد الإلكتروني' : 'Email');
        setPlaceholder('#new-user-email', l==='ar' ? 'أدخل البريد الإلكتروني' : 'Enter email');
        setText('label[for="new-user-password"]', l==='ar' ? 'كلمة المرور' : 'Password');
        setPlaceholder('#new-user-password', l==='ar' ? 'أدخل كلمة المرور' : 'Enter password');
        setText('label[for="new-user-role"]', l==='ar' ? 'الدور' : 'Role');
        if (l==='ar') setSelectOptions('#new-user-role', ['مستخدم','مدير','مدير النظام']); else setSelectOptions('#new-user-role', ['User','Admin','System Admin']);
        setButton('#addUserSubmitBtn', l==='ar' ? '<i class="fas fa-check"></i> إضافة' : '<i class="fas fa-check"></i> Add');
        setText('.form-section:nth-of-type(2) .section-title', l==='ar' ? 'المستخدمون' : 'Users');
        const ths = document.querySelectorAll('#requestsTable thead th');
        const headers = ['الإيميل','الدور','إجراءات'];
        const headersEn = ['Email','Role','Actions'];
        for (let i=0;i<ths.length;i++) ths[i].textContent = l==='ar' ? headers[i]||ths[i].textContent : headersEn[i]||ths[i].textContent;
    }

    if (page === 'notifications.html') {
        setText('.form-title', l==='ar' ? 'الإشعارات' : 'Notifications');
        setText('.form-subtitle', l==='ar' ? 'إدارة طلبات الإضافة والدفعات' : 'Manage addition and payment requests');
        const headers = ['العنوان', 'النوع', 'من', 'الحالة', 'التاريخ', 'إجراءات'];
        const headersEn = ['Title', 'Type', 'From', 'Status', 'Date', 'Actions'];
        const ths = document.querySelectorAll('#notificationsTable thead th');
        for (let i=0;i<ths.length;i++) ths[i].textContent = l==='ar' ? headers[i]||ths[i].textContent : headersEn[i]||ths[i].textContent;
    }

    if (page === 'settings.html') {
        setText('.content-header h1', l==='ar' ? 'إعدادات النظام' : 'System Settings');
        const adminBadge = document.querySelector('.admin-badge');
        if (adminBadge) adminBadge.innerHTML = l==='ar' ? '<i class="fas fa-crown"></i> مدير النظام' : '<i class="fas fa-crown"></i> System Admin';
        const labels = [['username','اسم المستخدم','Username'],['email','البريد الإلكتروني','Email'],['password','كلمة المرور','Password'],['language','اللغة','Language']];
        labels.forEach(([id, ar, en]) => setText(`label[for="${id}"]`, l==='ar' ? ar : en));
        const changePwd = document.querySelector('.change-password-btn');
        if (changePwd) changePwd.textContent = l==='ar' ? 'تغيير كلمة المرور' : 'Change Password';
        const saveBtns = document.querySelectorAll('.save-btn');
        saveBtns.forEach(btn => btn.textContent = l==='ar' ? 'حفظ التغييرات' : 'Save Changes');
        const titles = document.querySelectorAll('.settings-title');
        titles.forEach(t => {
            const txt = t.textContent.trim();
            if (l==='ar') return; 
            t.textContent = txt
                .replace('معلومات المستخدم (مدير النظام)','User Info (System Admin)')
                .replace('إدارة المستخدمين','User Management')
                .replace('إدارة الصلاحيات','Permissions Management')
                .replace('إعدادات الإشعارات','Notifications Settings')
                .replace('إعدادات النظام','System Settings');
        });
        const tableHeaders = document.querySelectorAll('.users-table thead th');
        const headers = ['اسم المستخدم','البريد الإلكتروني','الدور','الإجراءات'];
        const headersEn = ['Username','Email','Role','Actions'];
        for (let i=0;i<tableHeaders.length;i++) tableHeaders[i].textContent = l==='ar' ? headers[i]||tableHeaders[i].textContent : headersEn[i]||tableHeaders[i].textContent;
        const roleBadges = document.querySelectorAll('.role-badge');
        roleBadges.forEach(rb => { rb.textContent = l==='ar' ? rb.textContent.replace('System Admin','مدير النظام').replace('Admin','مدير').replace('User','مستخدم') : rb.textContent.replace('مدير النظام','System Admin').replace('مدير','Admin').replace('مستخدم','User'); });
        const tabBtns = document.querySelectorAll('.tab-header .tab-btn');
        tabBtns.forEach((b,i)=>{ b.textContent = l==='ar' ? (i===0?'مدير':'مستخدم') : (i===0?'Admin':'User'); });
        const permTitles = document.querySelectorAll('#admin-permissions h3, #user-permissions h3');
        permTitles.forEach(p=>{ p.textContent = l==='ar' ? p.textContent.replace('Admin Permissions','صلاحيات المدير').replace('User Permissions','صلاحيات المستخدم') : p.textContent.replace('صلاحيات المدير','Admin Permissions').replace('صلاحيات المستخدم','User Permissions'); });
        const permGroups = document.querySelectorAll('.permissions-group h4');
        permGroups.forEach(g=>{ g.textContent = l==='ar' ? g.textContent.replace('إدارة المدفوعات','Payments Management').replace('إدارة المستخدمين','Users Management') : g.textContent.replace('Payments Management','إدارة المدفوعات').replace('Users Management','إدارة المستخدمين'); });
        const labelsPerm = document.querySelectorAll('.permissions-group .settings-item.checkbox label');
        labelsPerm.forEach(lbl=>{ const t=lbl.textContent.trim(); if (l==='ar') {
            lbl.textContent = t
                .replace('View Payments','عرض المدفوعات')
                .replace('Add Payments','إضافة مدفوعات')
                .replace('Edit Payments','تعديل المدفوعات')
                .replace('Delete Payments','حذف المدفوعات')
                .replace('Approve Payments','الموافقة على المدفوعات')
                .replace('View Users','عرض المستخدمين')
                .replace('Add Users','إضافة مستخدمين')
                .replace('Edit Users','تعديل المستخدمين')
                .replace('Delete Users','حذف المستخدمين');
        } else {
            lbl.textContent = t
                .replace('عرض المدفوعات','View Payments')
                .replace('إضافة مدفوعات','Add Payments')
                .replace('تعديل المدفوعات','Edit Payments')
                .replace('حذف المدفوعات','Delete Payments')
                .replace('الموافقة على المدفوعات','Approve Payments')
                .replace('عرض المستخدمين','View Users')
                .replace('إضافة مستخدمين','Add Users')
                .replace('تعديل المستخدمين','Edit Users')
                .replace('حذف المستخدمين','Delete Users');
        }});
        const notifLabels = document.querySelectorAll('.settings-section .settings-item label');
        notifLabels.forEach(lbl=>{ const t=lbl.textContent.trim(); if (l==='ar') {
            lbl.textContent = t
                .replace('Notification System','نظام الإشعارات')
                .replace('Email Notifications','إشعارات البريد الإلكتروني')
                .replace('New Payments Notifications','إشعارات المدفوعات الجديدة')
                .replace('Payment Status Change Notifications','إشعارات تغيير حالة المدفوعات')
                .replace('New Suppliers Notifications','إشعارات الموردين الجدد')
                .replace('New Users Notifications','إشعارات المستخدمين الجدد')
                .replace('Notifications Frequency','تكرار الإشعارات');
        } else {
            lbl.textContent = t
                .replace('تفعيل نظام الإشعارات','Notification System')
                .replace('تفعيل إشعارات البريد الإلكتروني','Email Notifications')
                .replace('إشعارات المدفوعات الجديدة','New Payments Notifications')
                .replace('إشعارات تغيير حالة المدفوعات','Payment Status Change Notifications')
                .replace('إشعارات الموردين الجدد','New Suppliers Notifications')
                .replace('إشعارات المستخدمين الجدد','New Users Notifications')
                .replace('تكرار الإشعارات','Notifications Frequency');
        }});
        const nf = document.querySelector('#notification-frequency');
        if (nf) { if (l==='ar') setSelectOptions('#notification-frequency',['فوري','كل ساعة','يومي','أسبوعي']); else setSelectOptions('#notification-frequency',['Instant','Hourly','Daily','Weekly']); }

        // System settings section labels and options
        setText('.settings-section .settings-title', l==='ar' ? 'إعدادات النظام' : 'System Settings');
        setText('label[for="currency"]', l==='ar' ? 'العملة الافتراضية' : 'Default Currency');
        setText('label[for="date-format"]', l==='ar' ? 'تنسيق التاريخ' : 'Date Format');
        setText('label[for="dark-mode"]', l==='ar' ? 'الوضع الداكن' : 'Dark Mode');
        setText('label[for="items-per-page"]', l==='ar' ? 'عدد العناصر في الصفحة' : 'Items per page');
        setText('label[for="payment-approval"]', l==='ar' ? 'الموافقة على المدفوعات' : 'Payment Approval');
        const curSel = document.querySelector('#currency');
        if (curSel) {
            if (l==='ar') setSelectOptions('#currency',['ريال سعودي (SAR)','دولار أمريكي (USD)','يورو (EUR)']);
            else setSelectOptions('#currency',['Saudi Riyal (SAR)','US Dollar (USD)','Euro (EUR)']);
        }
        const dfSel = document.querySelector('#date-format');
        if (dfSel) {
            if (l==='ar') setSelectOptions('#date-format',['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD']);
            else setSelectOptions('#date-format',['DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD']);
        }
        const iaSel = document.querySelector('#items-per-page');
        if (iaSel) {
            // numeric options unchanged
        }
        const paSel = document.querySelector('#payment-approval');
        if (paSel) {
            if (l==='ar') setSelectOptions('#payment-approval',['تلقائي','يدوي']);
            else setSelectOptions('#payment-approval',['Auto','Manual']);
        }

        // Add User form inside settings page
        setText('.users-management .add-user-form h3', l==='ar' ? 'إضافة مستخدم جديد' : 'Add New User');
        setText('.users-management .users-list h3', l==='ar' ? 'قائمة المستخدمين' : 'Users List');
        setText('label[for="new-user-name"]', l==='ar' ? 'اسم المستخدم' : 'Username');
        setPlaceholder('#new-user-name', l==='ar' ? 'أدخل اسم المستخدم' : 'Enter username');
        setText('label[for="new-user-email"]', l==='ar' ? 'البريد الإلكتروني' : 'Email');
        setPlaceholder('#new-user-email', l==='ar' ? 'أدخل البريد الإلكتروني' : 'Enter email');
        setText('label[for="new-user-password"]', l==='ar' ? 'كلمة المرور' : 'Password');
        setPlaceholder('#new-user-password', l==='ar' ? 'أدخل كلمة المرور' : 'Enter password');
        setText('label[for="new-user-role"]', l==='ar' ? 'الدور' : 'Role');
        if (l==='ar') setSelectOptions('#new-user-role', ['مستخدم عادي','مدير','مدير النظام']); else setSelectOptions('#new-user-role', ['User','Admin','System Admin']);
        const addUserBtn = document.querySelector('.add-user-form .add-user-btn');
        if (addUserBtn) addUserBtn.textContent = l==='ar' ? 'إضافة مستخدم' : 'Add User';
    }

    if (page === 'report.html') {
        const cards = document.querySelectorAll('.cards-grid .card');
        if (cards[0]) {
            setText('#metricUsers .card-title', l==='ar' ? 'المستخدمون' : 'Users');
            setText('#metricUsers .card-description', l==='ar' ? 'إجمالي المستخدمين المسجلين' : 'Total registered users');
            setButton('#metricUsers .card-btn', l==='ar' ? 'Open' : 'Open');
        }
        if (cards[1]) {
            setText('#metricVisits .card-title', l==='ar' ? 'زيارات الموقع' : 'Site Visits');
            setText('#metricVisits .card-description', l==='ar' ? 'عدد مرات الدخول' : 'Number of visits');
            setButton('#metricVisits .card-btn', l==='ar' ? 'Open' : 'Open');
        }
        setText('.form-section:nth-of-type(1) .section-title', l==='ar' ? 'الإشعارات' : 'Notifications');
        const notifTh = document.querySelectorAll('#requestsTable thead th');
        const ar = ['العنوان','المرسل','الوقت','الحالة'];
        const en = ['Title','Sender','Time','Status'];
        for (let i=0;i<notifTh.length;i++) notifTh[i].textContent = l==='ar' ? ar[i]||notifTh[i].textContent : en[i]||notifTh[i].textContent;
        setText('.form-section:nth-of-type(2) .section-title', l==='ar' ? 'ملاحظات الموردين' : 'Supplier Notes');
        const notesTh = document.querySelectorAll('.form-section:nth-of-type(2) #requestsTable thead th');
        const ar2 = ['اسم المورد','رقم الضريبي','البنك','الأيبان','الملاحظة','التاريخ'];
        const en2 = ['Supplier','Tax Number','Bank','IBAN','Note','Date'];
        for (let i=0;i<notesTh.length;i++) notesTh[i].textContent = l==='ar' ? ar2[i]||notesTh[i].textContent : en2[i]||notesTh[i].textContent;
    }

    if (page === 'home.html') {
        setPlaceholder('.nav-search .search-box input', l==='ar' ? 'البحث...' : 'Search...');
        setText('.sidebar .section-header', l==='ar' ? 'المدفوعات' : 'Payments');
        const items = document.querySelectorAll('.sidebar .menu-item span');
        if (items && items.length) {
            const ar = ['المدفوعات المكتملة','المدفوعات المعلقة','المدفوعات المرفوضة','الموردين','التقارير','التحليلات','الإعدادات'];
            const en = ['Completed Payments','Pending Payments','Rejected Payments','Suppliers','Reports','Analytics','Settings'];
            const map = l==='ar' ? ar : en;
            for (let i=0;i<items.length && i<map.length;i++) items[i].textContent = map[i];
        }
        const logout = document.querySelector('.sidebar .logout-item span');
        if (logout) logout.textContent = l==='ar' ? 'تسجيل الخروج' : 'Logout';
        const usersLink = document.querySelector('.sidebar .menu-item[data-label-key="sidebar-users"] span');
        if (usersLink) usersLink.textContent = l==='ar' ? 'المستخدمين' : 'Users';
        setText('.cards-section .section-title', l==='ar' ? 'الإجراءات السريعة' : 'Quick Actions');
        const cards = document.querySelectorAll('.cards-grid .card');
        const titlesAr = ['إضافة مورد','طلب دفعة','البحث عن طلب','البحث عن مورد','تقرير'];
        const titlesEn = ['Add Supplier','Payment Request','Search Requests','Search Suppliers','Reports'];
        const descAr = ['إضافة مورد جديد للنظام','إنشاء طلب دفع جديد','البحث في طلبات الدفع','البحث في قائمة الموردين','عرض التقارير والإحصائيات'];
        const descEn = ['Add a new supplier','Create a new payment request','Search payment requests','Search suppliers list','View reports and analytics'];
        cards.forEach((card, i)=>{
            const t = card.querySelector('.card-title');
            const d = card.querySelector('.card-description');
            const b = card.querySelector('.card-btn');
            if (t) t.textContent = l==='ar' ? (titlesAr[i]||t.textContent) : (titlesEn[i]||t.textContent);
            if (d) d.textContent = l==='ar' ? (descAr[i]||d.textContent) : (descEn[i]||d.textContent);
            if (b) b.textContent = l==='ar' ? 'فتح' : 'Open';
        });
        const footer = document.querySelector('.footer .footer-content p');
        if (footer) footer.textContent = l==='ar' ? '© 2024 جميع الحقوق محفوظة لـ C4 "Core Code"' : '© 2024 All rights for C4 "Core Code"';
    }

    if (page === 'index.html') {
        const isEn = (l==='en');
        const logoTitle = document.querySelector('.logo-section h1');
        const logoDesc = document.querySelector('.logo-section p');
        if (logoTitle) logoTitle.innerHTML = '<img src="Logo-removebg.png" alt="C4 Payment Logo" class="logo-icon"> C4 Payment';
        if (logoDesc) logoDesc.textContent = isEn ? 'Payment and suppliers management system' : 'نظام إدارة المدفوعات والموردين';
        const title = document.querySelector('.title-section h2');
        if (title) title.textContent = isEn ? 'Please enter your information' : 'برجاء إدخال بياناتك';
        setText('label[for="email"]', isEn ? 'Email' : 'البريد الإلكتروني');
        setPlaceholder('#email', isEn ? 'Enter email or username' : 'أدخل البريد الإلكتروني أو اسم المستخدم');
        setText('label[for="password"]', isEn ? 'Password' : 'كلمة المرور');
        setPlaceholder('#password', isEn ? 'Enter password' : 'أدخل كلمة المرور');
        const fp = document.querySelector('#forgotPassword');
        if (fp) fp.textContent = isEn ? 'Forgot password?' : 'نسيت كلمة المرور؟';
        const lb = document.querySelector('#loginBtn');
        if (lb) lb.innerHTML = isEn ? '<i class="fas fa-sign-in-alt"></i> LOG IN' : '<i class="fas fa-sign-in-alt"></i> تسجيل الدخول';
    }
}

function setText(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.textContent = text;
}

function setPlaceholder(selector, text) {
    const el = document.querySelector(selector);
    if (el) el.placeholder = text;
}

function setButton(selector, html) {
    const el = document.querySelector(selector);
    if (el) el.innerHTML = html;
}

function setSelectOptions(selector, options) {
    const sel = document.querySelector(selector);
    if (!sel || !Array.isArray(options) || options.length < sel.options.length) return;
    const map = options.slice(0, sel.options.length);
    for (let i=0;i<map.length;i++) sel.options[i].text = map[i];
}

function translateCommon(lang) {
    const l = (lang||'ar').toLowerCase();
    setPlaceholder('.nav-search .search-box input', l==='ar' ? 'البحث...' : 'Search...');
    const brand = document.querySelector('.brand-text');
    if (brand) brand.textContent = 'C4 Payments';
    const footer = document.querySelector('.footer .footer-content p');
    if (footer) footer.textContent = l==='ar' ? '© 2024 جميع الحقوق محفوظة لـ C4 "Core Code"' : '© 2024 All rights for C4 "Core Code"';
}

function ensureMenuToggle() {
    let btn = document.querySelector('.menu-toggle');
    if (btn) return btn;
    const container = document.querySelector('.nav-container');
    if (!container) return null;
    btn = document.createElement('button');
    btn.className = 'menu-toggle';
    btn.type = 'button';
    btn.setAttribute('aria-label','Toggle sidebar');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML = '<i class="fas fa-bars"></i>';
    container.insertBefore(btn, container.firstChild);
    return btn;
}

//


