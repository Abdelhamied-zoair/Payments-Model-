// دالة لعرض الرسائل
function showAlert(message, type = 'error') {
    const alertDiv = document.getElementById('alertMessage');
    alertDiv.textContent = message;
    alertDiv.className = `alert ${type}`;
    alertDiv.style.display = 'block';
    
    // إخفاء الرسالة بعد 5 ثواني
    setTimeout(() => {
        alertDiv.style.display = 'none';
    }, 5000);
}

// تسجيل دخول عبر الـ API وإعداد التوكن في التخزين المحلي
async function apiLogin(identifier, password) {
    const id = String(identifier||'').trim();
    const isEmail = id.includes('@');
    const res = isEmail ? await API.login(id, password) : await API.loginWithUsername(id, password);
    if (!res || !res.token || !res.user) {
        const err = new Error('unauthorized');
        err.code = 'UNAUTHORIZED';
        throw err;
    }
    const user = { name: res.user.username || res.user.email.split('@')[0], role: res.user.role, email: res.user.email };
    localStorage.setItem('auth', JSON.stringify({ token: res.token, user: res.user }));
    localStorage.setItem('currentUser', JSON.stringify(user));
    return user;
}

// دالة التحقق من صحة البيانات
function validateForm(identifier, password) {
    if (!identifier || !password) {
        showAlert('من فضلك أكمل جميع الحقول');
        return false;
    }
    return true;
}

// event listener للفورم
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const loginBtn = document.getElementById('loginBtn');
    
    // التحقق من البيانات
    if (!validateForm(email, password)) {
        return;
    }
    
    // عرض حالة التحميل
    loginBtn.classList.add('loading');
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جارٍ تسجيل الدخول...';
    
    try {
        const user = await apiLogin(email, password);
        if (user) {
            showAlert(`مرحبًا بعودتك، ${user.name}!`, 'success');
            setTimeout(() => { window.location.href = 'home.html'; }, 1200);
        }
    } catch (error) {
        showAlert('غير مصرح بالدخول. تأكد من البريد وكلمة المرور.');
        console.error('Login error:', error);
    } finally {
        // إخفاء حالة التحميل
        loginBtn.classList.remove('loading');
        loginBtn.disabled = false;
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> دخول';
    }
});

// event listener لنسيت الباسوورد
document.getElementById('forgotPassword').addEventListener('click', function(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    
    if (!email) {
        showAlert('من فضلك أدخل بريدك الإلكتروني أولاً');
        document.getElementById('email').focus();
        return;
    }
    
    showAlert(`سيتم إرسال تعليمات إعادة تعيين كلمة المرور إلى: ${email}`, 'success');
});

// تأثيرات إضافية عند التركيز على الحقول
document.querySelectorAll('input').forEach(input => {
    input.addEventListener('focus', function() {
        this.parentElement.style.transform = 'scale(1.02)';
    });
    
    input.addEventListener('blur', function() {
        this.parentElement.style.transform = 'scale(1)';
    });
});

// إدخال تلقائي للبيانات للتجربة (يمكن حذفها لاحقاً)
document.addEventListener('DOMContentLoaded', function() {
    try {
        const input = document.getElementById('apiBaseInput');
        const btn = document.getElementById('saveApiBaseBtn');
        const saved = localStorage.getItem('apiBase') || '';
        if (input) input.value = saved;
        if (btn) {
            btn.addEventListener('click', async function(){
                const val = (input && input.value || '').trim();
                if (!val) { showAlert('أدخل رابط السيرفر أولاً'); return; }
                try {
                    localStorage.setItem('apiBase', val);
                    const ok = await fetch(val + '/health').then(r => r.ok).catch(()=>false);
                    if (ok) {
                        showAlert('تم حفظ رابط السيرفر بنجاح', 'success');
                    } else {
                        showAlert('تعذر الوصول للسيرفر. تحقق من الرابط');
                    }
                } catch(e) {
                    showAlert('فشل حفظ الرابط');
                }
            });
        }
        const p = new URLSearchParams(window.location.search);
        const q = p.get('api') || p.get('apiBase');
        if (q) {
            localStorage.setItem('apiBase', q);
            if (input) input.value = q;
        }
    } catch(_) {}
});
