/**
 * The words, in both languages, and the rule for which one opens first.
 *
 * Arabic is the default because the corpus and its readers are Arabic; English
 * is the second pass over the same screen, not a translation bolted on. Numbers
 * and file sizes stay Latin in both, which is how the site reads.
 */

export type Lang = 'ar' | 'en';

export function pickLang(uiLanguage: string | undefined): Lang {
  return (uiLanguage ?? '').toLowerCase().startsWith('ar') ? 'ar' : 'en';
}

const ar = {
  dir: 'rtl' as const,
  title: 'رفيق تلاوة',
  lede: 'اختر التلاوات التي تريد الاحتفاظ بها، فيحفظها هذا المتصفح ويشاركها مع المستمعين في تلاوة.',
  roster: 'القرّاء',
  loading: 'جارٍ تحميل القائمة…',
  empty: 'لا يوجد قرّاء منشورون الآن.',
  retry: 'أعد المحاولة',
  failed: 'تعذّر تحميل القائمة. تحقّق من اتصالك.',
  partial: 'جزئي',
  complete: 'كامل',
  selectedLabel: 'المختار',
  capLabel: 'الحد',
  settings: 'الإعدادات',
  maxReciters: 'أقصى عدد من القرّاء',
  upload: 'حدّ الرفع (ميغابت/ثانية)',
  pauseBattery: 'التوقّف على البطارية تحت 20%',
  pauseMetered: 'التوقّف على اتصال محدود البيانات',
  schedule: 'الرفع بين ساعتين فقط',
  scheduleFrom: 'من',
  scheduleTo: 'إلى',
  start: 'ابدأ المشاركة',
  saving: 'جارٍ الحفظ…',
  saved: 'تم الحفظ. المشاركة تعمل.',
  overCount: 'أزل قارئًا واحدًا للمتابعة.',
  overDisk: 'لا توجد مساحة كافية في المتصفح.',
  removeHint: 'إزالة قارئ تحذف نسخته من هذا الجهاز.',
  uploadedToday: 'المرفوع اليوم',
} as const;

const en: Record<keyof typeof ar, string> = {
  dir: 'ltr',
  title: 'Tilawah Companion',
  lede: 'Choose the recitations you want to keep. This browser holds them and shares them with Tilawa listeners.',
  roster: 'Reciters',
  loading: 'Loading the roster…',
  empty: 'No published reciters right now.',
  retry: 'Try again',
  failed: 'Could not load the roster. Check your connection.',
  partial: 'partial',
  complete: 'complete',
  selectedLabel: 'Selected',
  capLabel: 'Limit',
  settings: 'Settings',
  maxReciters: 'Most reciters to hold',
  upload: 'Upload limit (Mbps)',
  pauseBattery: 'Pause on battery below 20%',
  pauseMetered: 'Pause on a metered connection',
  schedule: 'Upload only between two hours',
  scheduleFrom: 'From',
  scheduleTo: 'To',
  start: 'Start sharing',
  saving: 'Saving…',
  saved: 'Saved. Sharing is running.',
  overCount: 'Remove one reciter to continue.',
  overDisk: 'The browser does not have room for that.',
  removeHint: 'Removing a reciter deletes its copy from this device.',
  uploadedToday: 'Uploaded today',
};

export const copyFor = (lang: Lang) => (lang === 'ar' ? ar : (en as unknown as typeof ar));
