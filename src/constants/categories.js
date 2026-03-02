export const CATEGORIES = [
    { key: 'personal', label: 'Kişisel', icon: '🌱' },
    { key: 'career', label: 'Kariyer', icon: '💼' },
    { key: 'health', label: 'Sağlık', icon: '💪' },
    { key: 'education', label: 'Eğitim', icon: '📚' },
    { key: 'finance', label: 'Finans', icon: '💰' },
    { key: 'relationships', label: 'İlişkiler', icon: '❤️' },
    { key: 'hobby', label: 'Hobi', icon: '🎨' },
    { key: 'other', label: 'Diğer', icon: '📌' },
];

export const CATEGORY_MAP = Object.fromEntries(
    CATEGORIES.map(c => [c.label, c.icon])
);

// AsyncStorage'da Türkçe label saklandığından, display için çeviri fonksiyonu
export function getCategoryLabel(turkishLabel, t) {
    const cat = CATEGORIES.find(c => c.label === turkishLabel);
    if (!cat) return turkishLabel;
    return t(`cat.${cat.key}`);
}
