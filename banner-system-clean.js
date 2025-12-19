// ════════════════════════════════════════════════════════
// 🎯 BANNER SYSTEM - Clean & Simple
// ════════════════════════════════════════════════════════

const BANNER_URL = 'https://raw.githubusercontent.com/russianff13-crypto/PDF-Library/main/banner.jpg';
const BANNER_CACHE_KEY = 'cached_banner_image';
const BANNER_CLOSED_KEY = 'banner_closed';

async function loadBanner() {
    const bannerContainer = document.getElementById('banner-container');
    const bannerImage = document.getElementById('banner-image');
    
    if (!bannerContainer || !bannerImage) {
        console.error('❌ Banner elements not found');
        return;
    }
    
    // Check if user closed the banner
    if (localStorage.getItem(BANNER_CLOSED_KEY) === 'true') {
        console.log('⏩ Banner was closed by user');
        return;
    }
    
    try {
        // Try to load from GitHub
        console.log('📡 Loading banner from GitHub...');
        const response = await fetch(BANNER_URL, {
            cache: 'no-cache',
            headers: { 'Cache-Control': 'no-cache' }
        });
        
        if (response.ok) {
            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            
            // Cache for offline use
            const reader = new FileReader();
            reader.onloadend = () => {
                localStorage.setItem(BANNER_CACHE_KEY, reader.result);
            };
            reader.readAsDataURL(blob);
            
            bannerImage.src = imageUrl;
            console.log('✅ Banner loaded from GitHub');
            showBanner();
        } else {
            throw new Error('GitHub load failed');
        }
    } catch (error) {
        console.log('⚠️ Loading from cache...');
        const cachedBanner = localStorage.getItem(BANNER_CACHE_KEY);
        if (cachedBanner) {
            bannerImage.src = cachedBanner;
            console.log('✅ Banner loaded from cache');
            showBanner();
        } else {
            console.log('❌ No banner available');
        }
    }
}

function showBanner() {
    const bannerContainer = document.getElementById('banner-container');
    const bannerImage = document.getElementById('banner-image');
    
    if (!bannerContainer || !bannerImage) return;
    
    bannerImage.onload = function() {
        const height = Math.min(bannerImage.naturalHeight, 350);
        bannerContainer.style.maxHeight = height + 'px';
        bannerContainer.classList.add('show');
        console.log(`✅ Banner visible (${height}px)`);
    };
    
    if (bannerImage.complete && bannerImage.naturalHeight > 0) {
        const height = Math.min(bannerImage.naturalHeight, 350);
        bannerContainer.style.maxHeight = height + 'px';
        bannerContainer.classList.add('show');
        console.log(`✅ Banner visible (${height}px)`);
    }
}

function hideBanner() {
    const bannerContainer = document.getElementById('banner-container');
    if (bannerContainer) {
        bannerContainer.classList.remove('show');
        localStorage.setItem(BANNER_CLOSED_KEY, 'true');
        console.log('🚫 Banner closed');
    }
}

function resetBanner() {
    localStorage.removeItem(BANNER_CLOSED_KEY);
    console.log('🔄 Banner reset');
    loadBanner();
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const closeBannerBtn = document.getElementById('close-banner');
    if (closeBannerBtn) {
        closeBannerBtn.addEventListener('click', hideBanner);
    }
    
    const resetBannerBtn = document.getElementById('reset-banner-btn');
    if (resetBannerBtn) {
        resetBannerBtn.addEventListener('click', () => {
            resetBanner();
            alert('Banner will show again!');
        });
    }
    
    loadBanner();
});

// ════════════════════════════════════════════════════════
// END BANNER SYSTEM
// ════════════════════════════════════════════════════════
