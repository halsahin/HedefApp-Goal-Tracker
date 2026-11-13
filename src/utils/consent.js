import { setAnalyticsEnabled } from './analytics';

// react-native-google-mobile-ads yalnızca özel/production build'de vardır (Expo Go ve web'de yok)
let ads = null;
try {
    ads = require('react-native-google-mobile-ads');
} catch {
    ads = null;
}

/**
 * Reklam SDK'sını başlatmadan önce Google UMP ile kullanıcı onayını (GDPR/AEA) toplar.
 * Reklam isteği yapılabiliyorsa true döner.
 *
 * - Onay gerekmiyorsa (AEA dışı) veya verildiyse: reklamlar başlatılır.
 * - Onay bilgisi alınamıyorsa (çevrimdışı ya da AdMob'da onay mesajı henüz yapılandırılmamış):
 *   önceki davranış korunur — yalnızca kişiselleştirilmemiş reklam istenir.
 * - Analitik: onay gerekli olup kullanıcı cihazda depolamaya izin vermediyse kapatılır.
 */
export async function initAdsWithConsent() {
    if (!ads?.AdsConsent) return false;
    const { AdsConsent } = ads;

    let info = null;
    try {
        info = await AdsConsent.gatherConsent();
    } catch (err) {
        console.warn('[consent] gather error:', err?.message);
        try { info = await AdsConsent.getConsentInfo(); } catch { info = null; }
    }

    const status = info?.status ?? 'UNKNOWN';
    const canRequestAds = status === 'UNKNOWN' ? true : !!info?.canRequestAds;

    let analyticsAllowed = true;
    if (status === 'REQUIRED') {
        analyticsAllowed = false;
    } else if (status === 'OBTAINED') {
        try {
            analyticsAllowed = !!(await AdsConsent.getUserChoices()).storeAndAccessInformationOnDevice;
        } catch {
            analyticsAllowed = false;
        }
    }
    await setAnalyticsEnabled(analyticsAllowed);

    if (canRequestAds) {
        try { await ads.default().initialize(); } catch { /* reklam başlatılamazsa uygulama etkilenmez */ }
    }
    return canRequestAds;
}

/** Kullanıcıya "gizlilik seçenekleri" girişi gösterilmeli mi? (UMP, onay gerektiren bölgelerde zorunlu tutar) */
export async function isPrivacyOptionsRequired() {
    if (!ads?.AdsConsent) return false;
    try {
        const info = await ads.AdsConsent.getConsentInfo();
        return info?.privacyOptionsRequirementStatus === 'REQUIRED';
    } catch {
        return false;
    }
}

/** Onay tercihlerini değiştirme formunu açar. */
export async function showPrivacyOptions() {
    if (!ads?.AdsConsent) return;
    try {
        await ads.AdsConsent.showPrivacyOptionsForm();
    } catch (err) {
        console.warn('[consent] privacy options error:', err?.message);
    }
}
