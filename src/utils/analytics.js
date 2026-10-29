import analytics from '@react-native-firebase/analytics';

/**
 * Custom event loglama yardımcısı (Firebase Analytics)
 */
export const logEvent = async (eventName, params = {}) => {
  try {
    await analytics().logEvent(eventName, params);
  } catch (error) {
    // Analytics dev/web ortamında veya devre dışıyken hata vermez
  }
};

/**
 * Ekran görüntüleme kaydı
 */
export const logScreenView = async (screenName, screenClass = screenName) => {
  try {
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass,
    });
  } catch (error) {
    // Silent catch
  }
};
