// Ekran görüntüleri için örnek veri (bugüne göre göreli tarihler)
const pad = (n) => String(n).padStart(2, '0');
const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const iso = (n, h = 20) => { const d = new Date(); d.setDate(d.getDate() + n); d.setHours(h, 15, 0, 0); return d.toISOString(); };

const base = { startDate: null, description: '', completed: false, pinned: false, progress: 0, recurring: null, subtasks: [], updates: [], reminderDays: [3, 1], folderId: 'default', tracking: false, trackingUnit: '', dailyReminder: true, dayLog: {}, streak: 0 };

// 30 günlük okuma takibi: 11 gün önce başladı, bugün 12. gün
const pages = [32, 41, 28, 0, 36, 45, 39, 30, 27, 44, 38];
const notes = { 1: 'Güzel bir başlangıç', 2: '39 sayfa hedefini geçtim', 4: 'Yoğun gün, okuyamadım', 7: '3. bölüm bitti', 11: 'Tasarım ilkeleri bölümü' };
const dayLog = {};
pages.forEach((p, i) => {
  const e = { done: p > 0, note: notes[i + 1] || '' };
  if (p > 0) e.value = p;
  dayLog[day(-11 + i)] = e;
});

const goals = [
  { ...base, id: 'g1', name: 'TURKUAVZ GCS v5.1 Arayüz Tasarımı', category: 'career', deadline: day(2), startDate: day(-13), pinned: true, progress: 75,
    description: 'Karanlık mod telemetri hiyerarşisi, MiniHUD vektörel göstergeleri ve Behance vaka analizi.', createdAt: iso(-13),
    subtasks: [
      { id: 's1', text: 'Renk tokenları ve kontrast testleri', completed: true },
      { id: 's2', text: 'MiniHUD yapay ufuk QML bileşeni', completed: true },
      { id: 's3', text: 'Çoklu İHA sürü yönetimi paneli', completed: true },
      { id: 's4', text: 'Behance 1400px sunum paftaları', completed: false },
    ],
    updates: [
      { id: 'u1', text: 'Telemetri kartlarındaki okunabilirlik testleri tamamlandı. 13px–28px tipografik skala onaylandı.', date: iso(-2) },
      { id: 'u2', text: 'MiniHUD ve PID kalibrasyon çekmecesi karanlık mod yüzey katmanlarına uyarlandı.', date: iso(-6) },
      { id: 'u3', text: 'Operatör saha görüşmeleri ve bilgi mimarisi akış diyagramı çıkarıldı.', date: iso(-11) },
    ] },
  { ...base, id: 'g2', name: '30 Gün Kitap Oku', category: 'education', deadline: day(18), startDate: day(-11), tracking: true, trackingUnit: 'sayfa', dayLog,
    progress: Math.round(10 / 30 * 100), description: 'Her gün en az 30 sayfa.', createdAt: iso(-11) },
  { ...base, id: 'g3', name: 'Haftalık 10K Koşu Antrenmanı', category: 'health', deadline: day(5), startDate: day(-2), progress: 67, streak: 3,
    recurring: { type: 'weekly', interval: 7 }, description: 'Haftada 4 gün tempo koşusu ve nabız bölgesi (Zone 2) dayanıklılık programı.', createdAt: iso(-2),
    subtasks: [ { id: 'a', text: 'Tempo koşusu 6 km', completed: true }, { id: 'b', text: 'Interval 8×400 m', completed: true }, { id: 'c', text: 'Uzun koşu 10 km', completed: false } ] },
  { ...base, id: 'g4', name: 'Acil Durum Fonu: 3 Aylık Gider', category: 'finance', deadline: day(24), progress: 50, description: 'Her maaş günü otomatik birikim talimatı.', createdAt: iso(-20) },
  { ...base, id: 'g5', name: 'Portfolyo Sitesini Yayınla', category: 'career', deadline: day(-2), progress: 25, description: 'Alan adı, barındırma ve vaka çalışması sayfaları.', createdAt: iso(-30), folderId: 'f1' },
  { ...base, id: 'g6', name: 'İspanyolca A2 Sertifikası', category: 'education', deadline: day(46), description: 'DELE A2 sınavına hazırlık.', createdAt: iso(-5), folderId: 'f2' },
  { ...base, id: 'g7', name: 'Yıllık Sağlık Kontrolü', category: 'health', deadline: day(-9), completed: true, progress: 100, createdAt: iso(-40) },
  { ...base, id: 'g8', name: 'Vergi Beyannamesi', category: 'finance', deadline: day(-15), completed: true, createdAt: iso(-45) },
];

const folders = [ { id: 'default', name: '__default__' }, { id: 'f1', name: 'İş' }, { id: 'f2', name: 'Kişisel Gelişim' } ];
const counters = [
  { id: 'c1', type: 'pomodoro', label: 'Pomodoro Çalışma Seansı', startTime: iso(0, 9), duration: 1500, notes: [] },
  { id: 'c2', type: 'pomodoro', label: 'Pomodoro Çalışma Seansı', startTime: iso(0, 10), duration: 1500, notes: [] },
];

module.exports = { goals, folders, counters };
