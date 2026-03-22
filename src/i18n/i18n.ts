/**
 * HAVEN IDE — Internationalization System (i18n)
 * ================================================
 * Lightweight i18n with zero external dependencies.
 * Supports 10 languages with Arabic (Saudi) as primary.
 *
 * Languages: ar | en | fr | es | ja | de | zh | ko | tr | hi
 *
 * @author  Sulaiman Alshammari (أبو خوارزم / @Grar00t)
 * @project HAVEN — Sovereign AI Development Environment
 * @website khawrizm.com
 * @license AGPL-3.0
 * @version 5.0.0
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LocaleCode =
  | 'ar'  // Arabic (Saudi — primary)
  | 'en'  // English
  | 'fr'  // French
  | 'es'  // Spanish
  | 'ja'  // Japanese
  | 'de'  // German
  | 'zh'  // Chinese (Simplified)
  | 'ko'  // Korean
  | 'tr'  // Turkish
  | 'hi'; // Hindi

export interface LocaleInfo {
  code: LocaleCode;
  name: string;          // Native name
  nameEn: string;        // English name
  dir: 'rtl' | 'ltr';   // Text direction
  flag: string;          // Emoji flag
}

export type TranslationKey =
  // ── Menu items ────────────────────────────────────────
  | 'menu.file'
  | 'menu.edit'
  | 'menu.view'
  | 'menu.terminal'
  | 'menu.help'
  | 'menu.settings'
  | 'menu.search'
  | 'menu.git'
  | 'menu.extensions'
  | 'menu.run'
  | 'menu.debug'
  // ── File actions ──────────────────────────────────────
  | 'file.new'
  | 'file.open'
  | 'file.save'
  | 'file.saveAll'
  | 'file.saveAs'
  | 'file.close'
  | 'file.closeAll'
  | 'file.revert'
  | 'file.rename'
  | 'file.delete'
  | 'file.duplicate'
  // ── Edit actions ──────────────────────────────────────
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.cut'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.selectAll'
  | 'edit.find'
  | 'edit.findReplace'
  | 'edit.format'
  | 'edit.comment'
  // ── View options ──────────────────────────────────────
  | 'view.explorer'
  | 'view.search'
  | 'view.sourceControl'
  | 'view.debug'
  | 'view.extensions'
  | 'view.terminal'
  | 'view.splitEditor'
  | 'view.fullscreen'
  | 'view.zoomIn'
  | 'view.zoomOut'
  // ── AI Panel ──────────────────────────────────────────
  | 'ai.panel.title'
  | 'ai.panel.cognitive'
  | 'ai.panel.executive'
  | 'ai.panel.sensory'
  | 'ai.panel.cognitiveDesc'
  | 'ai.panel.executiveDesc'
  | 'ai.panel.sensoryDesc'
  | 'ai.panel.intent'
  | 'ai.panel.confidence'
  | 'ai.panel.dialect'
  | 'ai.panel.tone'
  | 'ai.panel.domain'
  | 'ai.panel.sovereigntyScore'
  | 'ai.panel.model'
  | 'ai.panel.temperature'
  | 'ai.panel.context'
  | 'ai.panel.tokens'
  | 'ai.panel.latency'
  | 'ai.panel.lobeSync'
  // ── Status messages ───────────────────────────────────
  | 'status.connecting'
  | 'status.connected'
  | 'status.disconnected'
  | 'status.processing'
  | 'status.error'
  | 'status.ready'
  | 'status.loading'
  | 'status.saving'
  | 'status.saved'
  | 'status.unsaved'
  | 'status.syncing'
  | 'status.synced'
  | 'status.offline'
  | 'status.sovereign'
  // ── Common phrases ────────────────────────────────────
  | 'phrase.sovereigntyDuty'
  | 'phrase.tagline'
  | 'phrase.taglineAr'
  | 'phrase.poweredByOllama'
  | 'phrase.localInference'
  | 'phrase.noDataLeaks'
  | 'phrase.yourCodeYoursAlone'
  // ── Settings ──────────────────────────────────────────
  | 'settings.title'
  | 'settings.language'
  | 'settings.theme'
  | 'settings.fontSize'
  | 'settings.fontFamily'
  | 'settings.autoSave'
  | 'settings.sovereignMode'
  | 'settings.ollamaUrl'
  | 'settings.defaultModel'
  // ── Terminal ──────────────────────────────────────────
  | 'terminal.title'
  | 'terminal.newTerminal'
  | 'terminal.clear'
  | 'terminal.kill'
  | 'terminal.sandbox'
  // ── Git ───────────────────────────────────────────────
  | 'git.commit'
  | 'git.push'
  | 'git.pull'
  | 'git.branch'
  | 'git.merge'
  | 'git.clone'
  | 'git.init'
  | 'git.status'
  // ── General UI ────────────────────────────────────────
  | 'ui.ok'
  | 'ui.cancel'
  | 'ui.confirm'
  | 'ui.close'
  | 'ui.save'
  | 'ui.discard'
  | 'ui.apply'
  | 'ui.reset'
  | 'ui.search'
  | 'ui.loading'
  | 'ui.noResults'
  | 'ui.error'
  | 'ui.warning'
  | 'ui.info'
  | 'ui.success';

export type Translations = Record<TranslationKey, string>;

// ─────────────────────────────────────────────────────────────────────────────
// Locale Metadata
// ─────────────────────────────────────────────────────────────────────────────

export const LOCALE_INFO: Record<LocaleCode, LocaleInfo> = {
  ar: { code: 'ar', name: 'العربية',  nameEn: 'Arabic',   dir: 'rtl', flag: '🇸🇦' },
  en: { code: 'en', name: 'English',  nameEn: 'English',  dir: 'ltr', flag: '🇬🇧' },
  fr: { code: 'fr', name: 'Français', nameEn: 'French',   dir: 'ltr', flag: '🇫🇷' },
  es: { code: 'es', name: 'Español',  nameEn: 'Spanish',  dir: 'ltr', flag: '🇪🇸' },
  ja: { code: 'ja', name: '日本語',    nameEn: 'Japanese', dir: 'ltr', flag: '🇯🇵' },
  de: { code: 'de', name: 'Deutsch',  nameEn: 'German',   dir: 'ltr', flag: '🇩🇪' },
  zh: { code: 'zh', name: '中文',      nameEn: 'Chinese',  dir: 'ltr', flag: '🇨🇳' },
  ko: { code: 'ko', name: '한국어',    nameEn: 'Korean',   dir: 'ltr', flag: '🇰🇷' },
  tr: { code: 'tr', name: 'Türkçe',   nameEn: 'Turkish',  dir: 'ltr', flag: '🇹🇷' },
  hi: { code: 'hi', name: 'हिन्दी',    nameEn: 'Hindi',    dir: 'ltr', flag: '🇮🇳' },
};

export const availableLocales: LocaleCode[] = ['ar', 'en', 'fr', 'es', 'ja', 'de', 'zh', 'ko', 'tr', 'hi'];

// ─────────────────────────────────────────────────────────────────────────────
// Translation Tables
// ─────────────────────────────────────────────────────────────────────────────

const translations: Record<LocaleCode, Translations> = {

  // ══════════════════════════════════════════════════════════════════════════
  // ARABIC — PRIMARY LANGUAGE (Saudi dialect-aware formal Arabic)
  // ══════════════════════════════════════════════════════════════════════════
  ar: {
    'menu.file':           'ملف',
    'menu.edit':           'تحرير',
    'menu.view':           'عرض',
    'menu.terminal':       'الطرفية',
    'menu.help':           'مساعدة',
    'menu.settings':       'الإعدادات',
    'menu.search':         'بحث',
    'menu.git':            'Git',
    'menu.extensions':     'الإضافات',
    'menu.run':            'تشغيل',
    'menu.debug':          'تصحيح',

    'file.new':            'ملف جديد',
    'file.open':           'فتح',
    'file.save':           'حفظ',
    'file.saveAll':        'حفظ الكل',
    'file.saveAs':         'حفظ باسم',
    'file.close':          'إغلاق',
    'file.closeAll':       'إغلاق الكل',
    'file.revert':         'التراجع',
    'file.rename':         'إعادة التسمية',
    'file.delete':         'حذف',
    'file.duplicate':      'تكرار',

    'edit.undo':           'تراجع',
    'edit.redo':           'إعادة',
    'edit.cut':            'قص',
    'edit.copy':           'نسخ',
    'edit.paste':          'لصق',
    'edit.selectAll':      'تحديد الكل',
    'edit.find':           'بحث',
    'edit.findReplace':    'بحث واستبدال',
    'edit.format':         'تنسيق',
    'edit.comment':        'تعليق',

    'view.explorer':       'المستكشف',
    'view.search':         'البحث',
    'view.sourceControl':  'التحكم بالمصدر',
    'view.debug':          'التصحيح',
    'view.extensions':     'الإضافات',
    'view.terminal':       'الطرفية',
    'view.splitEditor':    'تقسيم المحرر',
    'view.fullscreen':     'ملء الشاشة',
    'view.zoomIn':         'تكبير',
    'view.zoomOut':        'تصغير',

    'ai.panel.title':        'لوحة الذكاء الاصطناعي',
    'ai.panel.cognitive':    'الفص المعرفي',
    'ai.panel.executive':    'الفص التنفيذي',
    'ai.panel.sensory':      'الفص الحسّي',
    'ai.panel.cognitiveDesc':'الفهم والتحليل وتوليد الكود',
    'ai.panel.executiveDesc':'التخطيط والتنسيق وتتبع الأهداف',
    'ai.panel.sensoryDesc':  'معالجة المدخلات والكشف عن الأنماط',
    'ai.panel.intent':       'النيّة',
    'ai.panel.confidence':   'الثقة',
    'ai.panel.dialect':      'اللهجة',
    'ai.panel.tone':         'النبرة',
    'ai.panel.domain':       'المجال',
    'ai.panel.sovereigntyScore': 'درجة السيادة',
    'ai.panel.model':        'النموذج',
    'ai.panel.temperature':  'الحرارة',
    'ai.panel.context':      'السياق',
    'ai.panel.tokens':       'الرموز',
    'ai.panel.latency':      'زمن الاستجابة',
    'ai.panel.lobeSync':     'تزامن الفصوص',

    'status.connecting':   'جارٍ الاتصال…',
    'status.connected':    'متصل',
    'status.disconnected': 'غير متصل',
    'status.processing':   'جارٍ المعالجة…',
    'status.error':        'خطأ',
    'status.ready':        'جاهز',
    'status.loading':      'جارٍ التحميل…',
    'status.saving':       'جارٍ الحفظ…',
    'status.saved':        'محفوظ',
    'status.unsaved':      'غير محفوظ',
    'status.syncing':      'جارٍ المزامنة…',
    'status.synced':       'تمت المزامنة',
    'status.offline':      'غير متصل بالإنترنت',
    'status.sovereign':    'سيادي',

    'phrase.sovereigntyDuty':   'السيادة الرقمية ليست خيارًا — إنها واجب',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'مدعوم بـ Ollama المحلي',
    'phrase.localInference':    'معالجة محلية بالكامل',
    'phrase.noDataLeaks':       'لا تسرّب للبيانات',
    'phrase.yourCodeYoursAlone':'كودك ملكك وحدك',

    'settings.title':        'الإعدادات',
    'settings.language':     'اللغة',
    'settings.theme':        'السمة',
    'settings.fontSize':     'حجم الخط',
    'settings.fontFamily':   'نوع الخط',
    'settings.autoSave':     'الحفظ التلقائي',
    'settings.sovereignMode':'وضع السيادة',
    'settings.ollamaUrl':    'عنوان Ollama',
    'settings.defaultModel': 'النموذج الافتراضي',

    'terminal.title':       'الطرفية',
    'terminal.newTerminal': 'طرفية جديدة',
    'terminal.clear':       'مسح',
    'terminal.kill':        'إنهاء',
    'terminal.sandbox':     'معزولة',

    'git.commit':  'الإيداع',
    'git.push':    'رفع',
    'git.pull':    'سحب',
    'git.branch':  'فرع',
    'git.merge':   'دمج',
    'git.clone':   'استنساخ',
    'git.init':    'تهيئة',
    'git.status':  'الحالة',

    'ui.ok':       'موافق',
    'ui.cancel':   'إلغاء',
    'ui.confirm':  'تأكيد',
    'ui.close':    'إغلاق',
    'ui.save':     'حفظ',
    'ui.discard':  'تجاهل',
    'ui.apply':    'تطبيق',
    'ui.reset':    'إعادة تعيين',
    'ui.search':   'بحث',
    'ui.loading':  'جارٍ التحميل',
    'ui.noResults':'لا توجد نتائج',
    'ui.error':    'خطأ',
    'ui.warning':  'تحذير',
    'ui.info':     'معلومات',
    'ui.success':  'نجاح',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // ENGLISH
  // ══════════════════════════════════════════════════════════════════════════
  en: {
    'menu.file':           'File',
    'menu.edit':           'Edit',
    'menu.view':           'View',
    'menu.terminal':       'Terminal',
    'menu.help':           'Help',
    'menu.settings':       'Settings',
    'menu.search':         'Search',
    'menu.git':            'Git',
    'menu.extensions':     'Extensions',
    'menu.run':            'Run',
    'menu.debug':          'Debug',

    'file.new':            'New File',
    'file.open':           'Open',
    'file.save':           'Save',
    'file.saveAll':        'Save All',
    'file.saveAs':         'Save As…',
    'file.close':          'Close',
    'file.closeAll':       'Close All',
    'file.revert':         'Revert',
    'file.rename':         'Rename',
    'file.delete':         'Delete',
    'file.duplicate':      'Duplicate',

    'edit.undo':           'Undo',
    'edit.redo':           'Redo',
    'edit.cut':            'Cut',
    'edit.copy':           'Copy',
    'edit.paste':          'Paste',
    'edit.selectAll':      'Select All',
    'edit.find':           'Find',
    'edit.findReplace':    'Find & Replace',
    'edit.format':         'Format Document',
    'edit.comment':        'Toggle Comment',

    'view.explorer':       'Explorer',
    'view.search':         'Search',
    'view.sourceControl':  'Source Control',
    'view.debug':          'Run & Debug',
    'view.extensions':     'Extensions',
    'view.terminal':       'Terminal',
    'view.splitEditor':    'Split Editor',
    'view.fullscreen':     'Full Screen',
    'view.zoomIn':         'Zoom In',
    'view.zoomOut':        'Zoom Out',

    'ai.panel.title':        'AI Panel',
    'ai.panel.cognitive':    'Cognitive Lobe',
    'ai.panel.executive':    'Executive Lobe',
    'ai.panel.sensory':      'Sensory Lobe',
    'ai.panel.cognitiveDesc':'Deep understanding, analysis & code generation',
    'ai.panel.executiveDesc':'Multi-step planning, coordination & goal tracking',
    'ai.panel.sensoryDesc':  'Input processing & real-time pattern detection',
    'ai.panel.intent':       'Intent',
    'ai.panel.confidence':   'Confidence',
    'ai.panel.dialect':      'Dialect',
    'ai.panel.tone':         'Tone',
    'ai.panel.domain':       'Domain',
    'ai.panel.sovereigntyScore': 'Sovereignty Score',
    'ai.panel.model':        'Model',
    'ai.panel.temperature':  'Temperature',
    'ai.panel.context':      'Context',
    'ai.panel.tokens':       'Tokens',
    'ai.panel.latency':      'Latency',
    'ai.panel.lobeSync':     'Lobe Sync',

    'status.connecting':   'Connecting…',
    'status.connected':    'Connected',
    'status.disconnected': 'Disconnected',
    'status.processing':   'Processing…',
    'status.error':        'Error',
    'status.ready':        'Ready',
    'status.loading':      'Loading…',
    'status.saving':       'Saving…',
    'status.saved':        'Saved',
    'status.unsaved':      'Unsaved',
    'status.syncing':      'Syncing…',
    'status.synced':       'Synced',
    'status.offline':      'Offline',
    'status.sovereign':    'Sovereign',

    'phrase.sovereigntyDuty':   'Digital sovereignty is not optional — it\'s a duty',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'Powered by local Ollama',
    'phrase.localInference':    '100% local inference',
    'phrase.noDataLeaks':       'Zero data leaks',
    'phrase.yourCodeYoursAlone':'Your code stays yours',

    'settings.title':        'Settings',
    'settings.language':     'Language',
    'settings.theme':        'Theme',
    'settings.fontSize':     'Font Size',
    'settings.fontFamily':   'Font Family',
    'settings.autoSave':     'Auto Save',
    'settings.sovereignMode':'Sovereign Mode',
    'settings.ollamaUrl':    'Ollama URL',
    'settings.defaultModel': 'Default Model',

    'terminal.title':       'Terminal',
    'terminal.newTerminal': 'New Terminal',
    'terminal.clear':       'Clear',
    'terminal.kill':        'Kill',
    'terminal.sandbox':     'Sandboxed',

    'git.commit':  'Commit',
    'git.push':    'Push',
    'git.pull':    'Pull',
    'git.branch':  'Branch',
    'git.merge':   'Merge',
    'git.clone':   'Clone',
    'git.init':    'Initialize',
    'git.status':  'Status',

    'ui.ok':       'OK',
    'ui.cancel':   'Cancel',
    'ui.confirm':  'Confirm',
    'ui.close':    'Close',
    'ui.save':     'Save',
    'ui.discard':  'Discard',
    'ui.apply':    'Apply',
    'ui.reset':    'Reset',
    'ui.search':   'Search',
    'ui.loading':  'Loading',
    'ui.noResults':'No results',
    'ui.error':    'Error',
    'ui.warning':  'Warning',
    'ui.info':     'Info',
    'ui.success':  'Success',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // FRENCH
  // ══════════════════════════════════════════════════════════════════════════
  fr: {
    'menu.file':           'Fichier',
    'menu.edit':           'Édition',
    'menu.view':           'Affichage',
    'menu.terminal':       'Terminal',
    'menu.help':           'Aide',
    'menu.settings':       'Paramètres',
    'menu.search':         'Rechercher',
    'menu.git':            'Git',
    'menu.extensions':     'Extensions',
    'menu.run':            'Exécuter',
    'menu.debug':          'Déboguer',

    'file.new':            'Nouveau fichier',
    'file.open':           'Ouvrir',
    'file.save':           'Enregistrer',
    'file.saveAll':        'Tout enregistrer',
    'file.saveAs':         'Enregistrer sous…',
    'file.close':          'Fermer',
    'file.closeAll':       'Tout fermer',
    'file.revert':         'Rétablir',
    'file.rename':         'Renommer',
    'file.delete':         'Supprimer',
    'file.duplicate':      'Dupliquer',

    'edit.undo':           'Annuler',
    'edit.redo':           'Rétablir',
    'edit.cut':            'Couper',
    'edit.copy':           'Copier',
    'edit.paste':          'Coller',
    'edit.selectAll':      'Tout sélectionner',
    'edit.find':           'Rechercher',
    'edit.findReplace':    'Rechercher et remplacer',
    'edit.format':         'Formater le document',
    'edit.comment':        'Basculer commentaire',

    'view.explorer':       'Explorateur',
    'view.search':         'Rechercher',
    'view.sourceControl':  'Contrôle de source',
    'view.debug':          'Exécuter et déboguer',
    'view.extensions':     'Extensions',
    'view.terminal':       'Terminal',
    'view.splitEditor':    'Diviser l\'éditeur',
    'view.fullscreen':     'Plein écran',
    'view.zoomIn':         'Zoom avant',
    'view.zoomOut':        'Zoom arrière',

    'ai.panel.title':        'Panneau IA',
    'ai.panel.cognitive':    'Lobe cognitif',
    'ai.panel.executive':    'Lobe exécutif',
    'ai.panel.sensory':      'Lobe sensoriel',
    'ai.panel.cognitiveDesc':'Compréhension profonde, analyse et génération de code',
    'ai.panel.executiveDesc':'Planification multi-étapes, coordination et suivi des objectifs',
    'ai.panel.sensoryDesc':  'Traitement des entrées et détection de patterns en temps réel',
    'ai.panel.intent':       'Intention',
    'ai.panel.confidence':   'Confiance',
    'ai.panel.dialect':      'Dialecte',
    'ai.panel.tone':         'Ton',
    'ai.panel.domain':       'Domaine',
    'ai.panel.sovereigntyScore': 'Score de souveraineté',
    'ai.panel.model':        'Modèle',
    'ai.panel.temperature':  'Température',
    'ai.panel.context':      'Contexte',
    'ai.panel.tokens':       'Tokens',
    'ai.panel.latency':      'Latence',
    'ai.panel.lobeSync':     'Sync des lobes',

    'status.connecting':   'Connexion en cours…',
    'status.connected':    'Connecté',
    'status.disconnected': 'Déconnecté',
    'status.processing':   'Traitement en cours…',
    'status.error':        'Erreur',
    'status.ready':        'Prêt',
    'status.loading':      'Chargement…',
    'status.saving':       'Enregistrement…',
    'status.saved':        'Enregistré',
    'status.unsaved':      'Non enregistré',
    'status.syncing':      'Synchronisation…',
    'status.synced':       'Synchronisé',
    'status.offline':      'Hors ligne',
    'status.sovereign':    'Souverain',

    'phrase.sovereigntyDuty':   'La souveraineté numérique n\'est pas optionnelle — c\'est un devoir',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'Propulsé par Ollama local',
    'phrase.localInference':    'Inférence 100% locale',
    'phrase.noDataLeaks':       'Aucune fuite de données',
    'phrase.yourCodeYoursAlone':'Votre code vous appartient',

    'settings.title':        'Paramètres',
    'settings.language':     'Langue',
    'settings.theme':        'Thème',
    'settings.fontSize':     'Taille de police',
    'settings.fontFamily':   'Famille de polices',
    'settings.autoSave':     'Enregistrement auto',
    'settings.sovereignMode':'Mode souverain',
    'settings.ollamaUrl':    'URL Ollama',
    'settings.defaultModel': 'Modèle par défaut',

    'terminal.title':       'Terminal',
    'terminal.newTerminal': 'Nouveau terminal',
    'terminal.clear':       'Effacer',
    'terminal.kill':        'Tuer',
    'terminal.sandbox':     'Bac à sable',

    'git.commit':  'Valider',
    'git.push':    'Pousser',
    'git.pull':    'Tirer',
    'git.branch':  'Branche',
    'git.merge':   'Fusionner',
    'git.clone':   'Cloner',
    'git.init':    'Initialiser',
    'git.status':  'Statut',

    'ui.ok':       'OK',
    'ui.cancel':   'Annuler',
    'ui.confirm':  'Confirmer',
    'ui.close':    'Fermer',
    'ui.save':     'Enregistrer',
    'ui.discard':  'Ignorer',
    'ui.apply':    'Appliquer',
    'ui.reset':    'Réinitialiser',
    'ui.search':   'Rechercher',
    'ui.loading':  'Chargement',
    'ui.noResults':'Aucun résultat',
    'ui.error':    'Erreur',
    'ui.warning':  'Avertissement',
    'ui.info':     'Info',
    'ui.success':  'Succès',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SPANISH
  // ══════════════════════════════════════════════════════════════════════════
  es: {
    'menu.file':           'Archivo',
    'menu.edit':           'Editar',
    'menu.view':           'Ver',
    'menu.terminal':       'Terminal',
    'menu.help':           'Ayuda',
    'menu.settings':       'Configuración',
    'menu.search':         'Buscar',
    'menu.git':            'Git',
    'menu.extensions':     'Extensiones',
    'menu.run':            'Ejecutar',
    'menu.debug':          'Depurar',

    'file.new':            'Nuevo archivo',
    'file.open':           'Abrir',
    'file.save':           'Guardar',
    'file.saveAll':        'Guardar todo',
    'file.saveAs':         'Guardar como…',
    'file.close':          'Cerrar',
    'file.closeAll':       'Cerrar todo',
    'file.revert':         'Revertir',
    'file.rename':         'Renombrar',
    'file.delete':         'Eliminar',
    'file.duplicate':      'Duplicar',

    'edit.undo':           'Deshacer',
    'edit.redo':           'Rehacer',
    'edit.cut':            'Cortar',
    'edit.copy':           'Copiar',
    'edit.paste':          'Pegar',
    'edit.selectAll':      'Seleccionar todo',
    'edit.find':           'Buscar',
    'edit.findReplace':    'Buscar y reemplazar',
    'edit.format':         'Formatear documento',
    'edit.comment':        'Alternar comentario',

    'view.explorer':       'Explorador',
    'view.search':         'Buscar',
    'view.sourceControl':  'Control de código fuente',
    'view.debug':          'Ejecutar y depurar',
    'view.extensions':     'Extensiones',
    'view.terminal':       'Terminal',
    'view.splitEditor':    'Dividir editor',
    'view.fullscreen':     'Pantalla completa',
    'view.zoomIn':         'Acercar',
    'view.zoomOut':        'Alejar',

    'ai.panel.title':        'Panel IA',
    'ai.panel.cognitive':    'Lóbulo cognitivo',
    'ai.panel.executive':    'Lóbulo ejecutivo',
    'ai.panel.sensory':      'Lóbulo sensorial',
    'ai.panel.cognitiveDesc':'Comprensión profunda, análisis y generación de código',
    'ai.panel.executiveDesc':'Planificación multi-paso, coordinación y seguimiento de objetivos',
    'ai.panel.sensoryDesc':  'Procesamiento de entradas y detección de patrones en tiempo real',
    'ai.panel.intent':       'Intención',
    'ai.panel.confidence':   'Confianza',
    'ai.panel.dialect':      'Dialecto',
    'ai.panel.tone':         'Tono',
    'ai.panel.domain':       'Dominio',
    'ai.panel.sovereigntyScore': 'Puntuación de soberanía',
    'ai.panel.model':        'Modelo',
    'ai.panel.temperature':  'Temperatura',
    'ai.panel.context':      'Contexto',
    'ai.panel.tokens':       'Tokens',
    'ai.panel.latency':      'Latencia',
    'ai.panel.lobeSync':     'Sync de lóbulos',

    'status.connecting':   'Conectando…',
    'status.connected':    'Conectado',
    'status.disconnected': 'Desconectado',
    'status.processing':   'Procesando…',
    'status.error':        'Error',
    'status.ready':        'Listo',
    'status.loading':      'Cargando…',
    'status.saving':       'Guardando…',
    'status.saved':        'Guardado',
    'status.unsaved':      'Sin guardar',
    'status.syncing':      'Sincronizando…',
    'status.synced':       'Sincronizado',
    'status.offline':      'Sin conexión',
    'status.sovereign':    'Soberano',

    'phrase.sovereigntyDuty':   'La soberanía digital no es opcional — es un deber',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'Impulsado por Ollama local',
    'phrase.localInference':    'Inferencia 100% local',
    'phrase.noDataLeaks':       'Cero fugas de datos',
    'phrase.yourCodeYoursAlone':'Tu código es tuyo',

    'settings.title':        'Configuración',
    'settings.language':     'Idioma',
    'settings.theme':        'Tema',
    'settings.fontSize':     'Tamaño de fuente',
    'settings.fontFamily':   'Familia de fuentes',
    'settings.autoSave':     'Guardado automático',
    'settings.sovereignMode':'Modo soberano',
    'settings.ollamaUrl':    'URL de Ollama',
    'settings.defaultModel': 'Modelo predeterminado',

    'terminal.title':       'Terminal',
    'terminal.newTerminal': 'Nueva terminal',
    'terminal.clear':       'Limpiar',
    'terminal.kill':        'Terminar',
    'terminal.sandbox':     'Aislado',

    'git.commit':  'Confirmar',
    'git.push':    'Enviar',
    'git.pull':    'Traer',
    'git.branch':  'Rama',
    'git.merge':   'Fusionar',
    'git.clone':   'Clonar',
    'git.init':    'Inicializar',
    'git.status':  'Estado',

    'ui.ok':       'Aceptar',
    'ui.cancel':   'Cancelar',
    'ui.confirm':  'Confirmar',
    'ui.close':    'Cerrar',
    'ui.save':     'Guardar',
    'ui.discard':  'Descartar',
    'ui.apply':    'Aplicar',
    'ui.reset':    'Restablecer',
    'ui.search':   'Buscar',
    'ui.loading':  'Cargando',
    'ui.noResults':'Sin resultados',
    'ui.error':    'Error',
    'ui.warning':  'Advertencia',
    'ui.info':     'Información',
    'ui.success':  'Éxito',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // JAPANESE
  // ══════════════════════════════════════════════════════════════════════════
  ja: {
    'menu.file':           'ファイル',
    'menu.edit':           '編集',
    'menu.view':           '表示',
    'menu.terminal':       'ターミナル',
    'menu.help':           'ヘルプ',
    'menu.settings':       '設定',
    'menu.search':         '検索',
    'menu.git':            'Git',
    'menu.extensions':     '拡張機能',
    'menu.run':            '実行',
    'menu.debug':          'デバッグ',

    'file.new':            '新しいファイル',
    'file.open':           '開く',
    'file.save':           '保存',
    'file.saveAll':        'すべて保存',
    'file.saveAs':         '名前を付けて保存…',
    'file.close':          '閉じる',
    'file.closeAll':       'すべて閉じる',
    'file.revert':         '元に戻す',
    'file.rename':         '名前の変更',
    'file.delete':         '削除',
    'file.duplicate':      '複製',

    'edit.undo':           '元に戻す',
    'edit.redo':           'やり直す',
    'edit.cut':            '切り取り',
    'edit.copy':           'コピー',
    'edit.paste':          '貼り付け',
    'edit.selectAll':      'すべて選択',
    'edit.find':           '検索',
    'edit.findReplace':    '検索と置換',
    'edit.format':         'ドキュメントのフォーマット',
    'edit.comment':        'コメントの切り替え',

    'view.explorer':       'エクスプローラー',
    'view.search':         '検索',
    'view.sourceControl':  'ソース管理',
    'view.debug':          '実行とデバッグ',
    'view.extensions':     '拡張機能',
    'view.terminal':       'ターミナル',
    'view.splitEditor':    'エディターの分割',
    'view.fullscreen':     'フルスクリーン',
    'view.zoomIn':         'ズームイン',
    'view.zoomOut':        'ズームアウト',

    'ai.panel.title':        'AIパネル',
    'ai.panel.cognitive':    '認知葉',
    'ai.panel.executive':    '実行葉',
    'ai.panel.sensory':      '感覚葉',
    'ai.panel.cognitiveDesc':'深い理解、分析、コード生成',
    'ai.panel.executiveDesc':'多段階計画、調整、目標追跡',
    'ai.panel.sensoryDesc':  '入力処理とリアルタイムパターン検出',
    'ai.panel.intent':       '意図',
    'ai.panel.confidence':   '信頼度',
    'ai.panel.dialect':      '方言',
    'ai.panel.tone':         'トーン',
    'ai.panel.domain':       'ドメイン',
    'ai.panel.sovereigntyScore': '主権スコア',
    'ai.panel.model':        'モデル',
    'ai.panel.temperature':  '温度',
    'ai.panel.context':      'コンテキスト',
    'ai.panel.tokens':       'トークン',
    'ai.panel.latency':      'レイテンシ',
    'ai.panel.lobeSync':     '葉の同期',

    'status.connecting':   '接続中…',
    'status.connected':    '接続済み',
    'status.disconnected': '切断',
    'status.processing':   '処理中…',
    'status.error':        'エラー',
    'status.ready':        '準備完了',
    'status.loading':      '読み込み中…',
    'status.saving':       '保存中…',
    'status.saved':        '保存済み',
    'status.unsaved':      '未保存',
    'status.syncing':      '同期中…',
    'status.synced':       '同期済み',
    'status.offline':      'オフライン',
    'status.sovereign':    '主権',

    'phrase.sovereigntyDuty':   'デジタル主権はオプションではありません — それは義務です',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'ローカルOllamaで動作',
    'phrase.localInference':    '100%ローカル推論',
    'phrase.noDataLeaks':       'データ漏洩ゼロ',
    'phrase.yourCodeYoursAlone':'あなたのコードはあなただけのもの',

    'settings.title':        '設定',
    'settings.language':     '言語',
    'settings.theme':        'テーマ',
    'settings.fontSize':     'フォントサイズ',
    'settings.fontFamily':   'フォントファミリー',
    'settings.autoSave':     '自動保存',
    'settings.sovereignMode':'主権モード',
    'settings.ollamaUrl':    'Ollama URL',
    'settings.defaultModel': 'デフォルトモデル',

    'terminal.title':       'ターミナル',
    'terminal.newTerminal': '新しいターミナル',
    'terminal.clear':       'クリア',
    'terminal.kill':        '終了',
    'terminal.sandbox':     'サンドボックス',

    'git.commit':  'コミット',
    'git.push':    'プッシュ',
    'git.pull':    'プル',
    'git.branch':  'ブランチ',
    'git.merge':   'マージ',
    'git.clone':   'クローン',
    'git.init':    '初期化',
    'git.status':  'ステータス',

    'ui.ok':       'OK',
    'ui.cancel':   'キャンセル',
    'ui.confirm':  '確認',
    'ui.close':    '閉じる',
    'ui.save':     '保存',
    'ui.discard':  '破棄',
    'ui.apply':    '適用',
    'ui.reset':    'リセット',
    'ui.search':   '検索',
    'ui.loading':  '読み込み中',
    'ui.noResults':'結果なし',
    'ui.error':    'エラー',
    'ui.warning':  '警告',
    'ui.info':     '情報',
    'ui.success':  '成功',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // GERMAN
  // ══════════════════════════════════════════════════════════════════════════
  de: {
    'menu.file':           'Datei',
    'menu.edit':           'Bearbeiten',
    'menu.view':           'Ansicht',
    'menu.terminal':       'Terminal',
    'menu.help':           'Hilfe',
    'menu.settings':       'Einstellungen',
    'menu.search':         'Suchen',
    'menu.git':            'Git',
    'menu.extensions':     'Erweiterungen',
    'menu.run':            'Ausführen',
    'menu.debug':          'Debuggen',

    'file.new':            'Neue Datei',
    'file.open':           'Öffnen',
    'file.save':           'Speichern',
    'file.saveAll':        'Alle speichern',
    'file.saveAs':         'Speichern unter…',
    'file.close':          'Schließen',
    'file.closeAll':       'Alle schließen',
    'file.revert':         'Zurücksetzen',
    'file.rename':         'Umbenennen',
    'file.delete':         'Löschen',
    'file.duplicate':      'Duplizieren',

    'edit.undo':           'Rückgängig',
    'edit.redo':           'Wiederholen',
    'edit.cut':            'Ausschneiden',
    'edit.copy':           'Kopieren',
    'edit.paste':          'Einfügen',
    'edit.selectAll':      'Alles auswählen',
    'edit.find':           'Suchen',
    'edit.findReplace':    'Suchen und Ersetzen',
    'edit.format':         'Dokument formatieren',
    'edit.comment':        'Kommentar umschalten',

    'view.explorer':       'Explorer',
    'view.search':         'Suchen',
    'view.sourceControl':  'Quellcodeverwaltung',
    'view.debug':          'Ausführen und Debuggen',
    'view.extensions':     'Erweiterungen',
    'view.terminal':       'Terminal',
    'view.splitEditor':    'Editor teilen',
    'view.fullscreen':     'Vollbild',
    'view.zoomIn':         'Vergrößern',
    'view.zoomOut':        'Verkleinern',

    'ai.panel.title':        'KI-Panel',
    'ai.panel.cognitive':    'Kognitiver Lappen',
    'ai.panel.executive':    'Exekutiver Lappen',
    'ai.panel.sensory':      'Sensorischer Lappen',
    'ai.panel.cognitiveDesc':'Tiefes Verstehen, Analyse und Code-Generierung',
    'ai.panel.executiveDesc':'Mehrstufige Planung, Koordination und Zielverfolgung',
    'ai.panel.sensoryDesc':  'Eingabeverarbeitung und Echtzeit-Mustererkennung',
    'ai.panel.intent':       'Absicht',
    'ai.panel.confidence':   'Konfidenz',
    'ai.panel.dialect':      'Dialekt',
    'ai.panel.tone':         'Ton',
    'ai.panel.domain':       'Domäne',
    'ai.panel.sovereigntyScore': 'Souveränitätswert',
    'ai.panel.model':        'Modell',
    'ai.panel.temperature':  'Temperatur',
    'ai.panel.context':      'Kontext',
    'ai.panel.tokens':       'Token',
    'ai.panel.latency':      'Latenz',
    'ai.panel.lobeSync':     'Lappen-Sync',

    'status.connecting':   'Verbinden…',
    'status.connected':    'Verbunden',
    'status.disconnected': 'Getrennt',
    'status.processing':   'Verarbeitung…',
    'status.error':        'Fehler',
    'status.ready':        'Bereit',
    'status.loading':      'Laden…',
    'status.saving':       'Speichern…',
    'status.saved':        'Gespeichert',
    'status.unsaved':      'Ungespeichert',
    'status.syncing':      'Synchronisieren…',
    'status.synced':       'Synchronisiert',
    'status.offline':      'Offline',
    'status.sovereign':    'Souverän',

    'phrase.sovereigntyDuty':   'Digitale Souveränität ist keine Option — sie ist eine Pflicht',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'Betrieben von lokalem Ollama',
    'phrase.localInference':    '100% lokale Inferenz',
    'phrase.noDataLeaks':       'Null Datenlecks',
    'phrase.yourCodeYoursAlone':'Ihr Code gehört nur Ihnen',

    'settings.title':        'Einstellungen',
    'settings.language':     'Sprache',
    'settings.theme':        'Design',
    'settings.fontSize':     'Schriftgröße',
    'settings.fontFamily':   'Schriftfamilie',
    'settings.autoSave':     'Automatisch speichern',
    'settings.sovereignMode':'Souveräner Modus',
    'settings.ollamaUrl':    'Ollama-URL',
    'settings.defaultModel': 'Standardmodell',

    'terminal.title':       'Terminal',
    'terminal.newTerminal': 'Neues Terminal',
    'terminal.clear':       'Löschen',
    'terminal.kill':        'Beenden',
    'terminal.sandbox':     'Sandbox',

    'git.commit':  'Commit',
    'git.push':    'Pushen',
    'git.pull':    'Pullen',
    'git.branch':  'Branch',
    'git.merge':   'Mergen',
    'git.clone':   'Klonen',
    'git.init':    'Initialisieren',
    'git.status':  'Status',

    'ui.ok':       'OK',
    'ui.cancel':   'Abbrechen',
    'ui.confirm':  'Bestätigen',
    'ui.close':    'Schließen',
    'ui.save':     'Speichern',
    'ui.discard':  'Verwerfen',
    'ui.apply':    'Anwenden',
    'ui.reset':    'Zurücksetzen',
    'ui.search':   'Suchen',
    'ui.loading':  'Laden',
    'ui.noResults':'Keine Ergebnisse',
    'ui.error':    'Fehler',
    'ui.warning':  'Warnung',
    'ui.info':     'Info',
    'ui.success':  'Erfolg',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CHINESE (Simplified)
  // ══════════════════════════════════════════════════════════════════════════
  zh: {
    'menu.file':           '文件',
    'menu.edit':           '编辑',
    'menu.view':           '视图',
    'menu.terminal':       '终端',
    'menu.help':           '帮助',
    'menu.settings':       '设置',
    'menu.search':         '搜索',
    'menu.git':            'Git',
    'menu.extensions':     '扩展',
    'menu.run':            '运行',
    'menu.debug':          '调试',

    'file.new':            '新建文件',
    'file.open':           '打开',
    'file.save':           '保存',
    'file.saveAll':        '全部保存',
    'file.saveAs':         '另存为…',
    'file.close':          '关闭',
    'file.closeAll':       '关闭全部',
    'file.revert':         '恢复',
    'file.rename':         '重命名',
    'file.delete':         '删除',
    'file.duplicate':      '复制',

    'edit.undo':           '撤销',
    'edit.redo':           '重做',
    'edit.cut':            '剪切',
    'edit.copy':           '复制',
    'edit.paste':          '粘贴',
    'edit.selectAll':      '全选',
    'edit.find':           '查找',
    'edit.findReplace':    '查找和替换',
    'edit.format':         '格式化文档',
    'edit.comment':        '切换注释',

    'view.explorer':       '资源管理器',
    'view.search':         '搜索',
    'view.sourceControl':  '源代码管理',
    'view.debug':          '运行和调试',
    'view.extensions':     '扩展',
    'view.terminal':       '终端',
    'view.splitEditor':    '拆分编辑器',
    'view.fullscreen':     '全屏',
    'view.zoomIn':         '放大',
    'view.zoomOut':        '缩小',

    'ai.panel.title':        'AI面板',
    'ai.panel.cognitive':    '认知叶',
    'ai.panel.executive':    '执行叶',
    'ai.panel.sensory':      '感觉叶',
    'ai.panel.cognitiveDesc':'深度理解、分析与代码生成',
    'ai.panel.executiveDesc':'多步规划、协调与目标跟踪',
    'ai.panel.sensoryDesc':  '输入处理与实时模式检测',
    'ai.panel.intent':       '意图',
    'ai.panel.confidence':   '置信度',
    'ai.panel.dialect':      '方言',
    'ai.panel.tone':         '语气',
    'ai.panel.domain':       '领域',
    'ai.panel.sovereigntyScore': '主权评分',
    'ai.panel.model':        '模型',
    'ai.panel.temperature':  '温度',
    'ai.panel.context':      '上下文',
    'ai.panel.tokens':       'Token',
    'ai.panel.latency':      '延迟',
    'ai.panel.lobeSync':     '叶同步',

    'status.connecting':   '连接中…',
    'status.connected':    '已连接',
    'status.disconnected': '已断开',
    'status.processing':   '处理中…',
    'status.error':        '错误',
    'status.ready':        '就绪',
    'status.loading':      '加载中…',
    'status.saving':       '保存中…',
    'status.saved':        '已保存',
    'status.unsaved':      '未保存',
    'status.syncing':      '同步中…',
    'status.synced':       '已同步',
    'status.offline':      '离线',
    'status.sovereign':    '主权',

    'phrase.sovereigntyDuty':   '数字主权不是可选项 — 它是一种责任',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   '由本地Ollama驱动',
    'phrase.localInference':    '100%本地推理',
    'phrase.noDataLeaks':       '零数据泄露',
    'phrase.yourCodeYoursAlone':'您的代码仅属于您',

    'settings.title':        '设置',
    'settings.language':     '语言',
    'settings.theme':        '主题',
    'settings.fontSize':     '字体大小',
    'settings.fontFamily':   '字体系列',
    'settings.autoSave':     '自动保存',
    'settings.sovereignMode':'主权模式',
    'settings.ollamaUrl':    'Ollama地址',
    'settings.defaultModel': '默认模型',

    'terminal.title':       '终端',
    'terminal.newTerminal': '新建终端',
    'terminal.clear':       '清除',
    'terminal.kill':        '终止',
    'terminal.sandbox':     '沙箱',

    'git.commit':  '提交',
    'git.push':    '推送',
    'git.pull':    '拉取',
    'git.branch':  '分支',
    'git.merge':   '合并',
    'git.clone':   '克隆',
    'git.init':    '初始化',
    'git.status':  '状态',

    'ui.ok':       '确定',
    'ui.cancel':   '取消',
    'ui.confirm':  '确认',
    'ui.close':    '关闭',
    'ui.save':     '保存',
    'ui.discard':  '放弃',
    'ui.apply':    '应用',
    'ui.reset':    '重置',
    'ui.search':   '搜索',
    'ui.loading':  '加载中',
    'ui.noResults':'无结果',
    'ui.error':    '错误',
    'ui.warning':  '警告',
    'ui.info':     '信息',
    'ui.success':  '成功',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // KOREAN
  // ══════════════════════════════════════════════════════════════════════════
  ko: {
    'menu.file':           '파일',
    'menu.edit':           '편집',
    'menu.view':           '보기',
    'menu.terminal':       '터미널',
    'menu.help':           '도움말',
    'menu.settings':       '설정',
    'menu.search':         '검색',
    'menu.git':            'Git',
    'menu.extensions':     '확장',
    'menu.run':            '실행',
    'menu.debug':          '디버그',

    'file.new':            '새 파일',
    'file.open':           '열기',
    'file.save':           '저장',
    'file.saveAll':        '모두 저장',
    'file.saveAs':         '다른 이름으로 저장…',
    'file.close':          '닫기',
    'file.closeAll':       '모두 닫기',
    'file.revert':         '되돌리기',
    'file.rename':         '이름 바꾸기',
    'file.delete':         '삭제',
    'file.duplicate':      '복제',

    'edit.undo':           '실행 취소',
    'edit.redo':           '다시 실행',
    'edit.cut':            '잘라내기',
    'edit.copy':           '복사',
    'edit.paste':          '붙여넣기',
    'edit.selectAll':      '모두 선택',
    'edit.find':           '찾기',
    'edit.findReplace':    '찾기 및 바꾸기',
    'edit.format':         '문서 서식',
    'edit.comment':        '주석 토글',

    'view.explorer':       '탐색기',
    'view.search':         '검색',
    'view.sourceControl':  '소스 제어',
    'view.debug':          '실행 및 디버그',
    'view.extensions':     '확장',
    'view.terminal':       '터미널',
    'view.splitEditor':    '편집기 분할',
    'view.fullscreen':     '전체 화면',
    'view.zoomIn':         '확대',
    'view.zoomOut':        '축소',

    'ai.panel.title':        'AI 패널',
    'ai.panel.cognitive':    '인지 엽',
    'ai.panel.executive':    '실행 엽',
    'ai.panel.sensory':      '감각 엽',
    'ai.panel.cognitiveDesc':'깊은 이해, 분석 및 코드 생성',
    'ai.panel.executiveDesc':'다단계 계획, 조정 및 목표 추적',
    'ai.panel.sensoryDesc':  '입력 처리 및 실시간 패턴 감지',
    'ai.panel.intent':       '의도',
    'ai.panel.confidence':   '신뢰도',
    'ai.panel.dialect':      '방언',
    'ai.panel.tone':         '어조',
    'ai.panel.domain':       '도메인',
    'ai.panel.sovereigntyScore': '주권 점수',
    'ai.panel.model':        '모델',
    'ai.panel.temperature':  '온도',
    'ai.panel.context':      '컨텍스트',
    'ai.panel.tokens':       '토큰',
    'ai.panel.latency':      '지연',
    'ai.panel.lobeSync':     '엽 동기화',

    'status.connecting':   '연결 중…',
    'status.connected':    '연결됨',
    'status.disconnected': '연결 끊김',
    'status.processing':   '처리 중…',
    'status.error':        '오류',
    'status.ready':        '준비됨',
    'status.loading':      '로딩 중…',
    'status.saving':       '저장 중…',
    'status.saved':        '저장됨',
    'status.unsaved':      '저장 안 됨',
    'status.syncing':      '동기화 중…',
    'status.synced':       '동기화됨',
    'status.offline':      '오프라인',
    'status.sovereign':    '주권',

    'phrase.sovereigntyDuty':   '디지털 주권은 선택이 아닙니다 — 의무입니다',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   '로컬 Ollama로 구동',
    'phrase.localInference':    '100% 로컬 추론',
    'phrase.noDataLeaks':       '데이터 유출 없음',
    'phrase.yourCodeYoursAlone':'코드는 오직 당신의 것',

    'settings.title':        '설정',
    'settings.language':     '언어',
    'settings.theme':        '테마',
    'settings.fontSize':     '글꼴 크기',
    'settings.fontFamily':   '글꼴 패밀리',
    'settings.autoSave':     '자동 저장',
    'settings.sovereignMode':'주권 모드',
    'settings.ollamaUrl':    'Ollama URL',
    'settings.defaultModel': '기본 모델',

    'terminal.title':       '터미널',
    'terminal.newTerminal': '새 터미널',
    'terminal.clear':       '지우기',
    'terminal.kill':        '종료',
    'terminal.sandbox':     '샌드박스',

    'git.commit':  '커밋',
    'git.push':    '푸시',
    'git.pull':    '풀',
    'git.branch':  '브랜치',
    'git.merge':   '병합',
    'git.clone':   '클론',
    'git.init':    '초기화',
    'git.status':  '상태',

    'ui.ok':       '확인',
    'ui.cancel':   '취소',
    'ui.confirm':  '확인',
    'ui.close':    '닫기',
    'ui.save':     '저장',
    'ui.discard':  '버리기',
    'ui.apply':    '적용',
    'ui.reset':    '초기화',
    'ui.search':   '검색',
    'ui.loading':  '로딩 중',
    'ui.noResults':'결과 없음',
    'ui.error':    '오류',
    'ui.warning':  '경고',
    'ui.info':     '정보',
    'ui.success':  '성공',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // TURKISH
  // ══════════════════════════════════════════════════════════════════════════
  tr: {
    'menu.file':           'Dosya',
    'menu.edit':           'Düzenle',
    'menu.view':           'Görünüm',
    'menu.terminal':       'Terminal',
    'menu.help':           'Yardım',
    'menu.settings':       'Ayarlar',
    'menu.search':         'Ara',
    'menu.git':            'Git',
    'menu.extensions':     'Uzantılar',
    'menu.run':            'Çalıştır',
    'menu.debug':          'Hata Ayıkla',

    'file.new':            'Yeni Dosya',
    'file.open':           'Aç',
    'file.save':           'Kaydet',
    'file.saveAll':        'Tümünü Kaydet',
    'file.saveAs':         'Farklı Kaydet…',
    'file.close':          'Kapat',
    'file.closeAll':       'Tümünü Kapat',
    'file.revert':         'Geri Al',
    'file.rename':         'Yeniden Adlandır',
    'file.delete':         'Sil',
    'file.duplicate':      'Çoğalt',

    'edit.undo':           'Geri Al',
    'edit.redo':           'Yinele',
    'edit.cut':            'Kes',
    'edit.copy':           'Kopyala',
    'edit.paste':          'Yapıştır',
    'edit.selectAll':      'Tümünü Seç',
    'edit.find':           'Bul',
    'edit.findReplace':    'Bul ve Değiştir',
    'edit.format':         'Belgeyi Biçimlendir',
    'edit.comment':        'Yorum Geçiş',

    'view.explorer':       'Gezgin',
    'view.search':         'Ara',
    'view.sourceControl':  'Kaynak Denetimi',
    'view.debug':          'Çalıştır ve Hata Ayıkla',
    'view.extensions':     'Uzantılar',
    'view.terminal':       'Terminal',
    'view.splitEditor':    'Düzenleyiciyi Böl',
    'view.fullscreen':     'Tam Ekran',
    'view.zoomIn':         'Yakınlaştır',
    'view.zoomOut':        'Uzaklaştır',

    'ai.panel.title':        'YZ Paneli',
    'ai.panel.cognitive':    'Bilişsel Lob',
    'ai.panel.executive':    'Yürütücü Lob',
    'ai.panel.sensory':      'Duyusal Lob',
    'ai.panel.cognitiveDesc':'Derin anlayış, analiz ve kod üretimi',
    'ai.panel.executiveDesc':'Çok adımlı planlama, koordinasyon ve hedef takibi',
    'ai.panel.sensoryDesc':  'Girdi işleme ve gerçek zamanlı örüntü tespiti',
    'ai.panel.intent':       'Niyet',
    'ai.panel.confidence':   'Güven',
    'ai.panel.dialect':      'Lehçe',
    'ai.panel.tone':         'Ton',
    'ai.panel.domain':       'Alan',
    'ai.panel.sovereigntyScore': 'Egemenlik Puanı',
    'ai.panel.model':        'Model',
    'ai.panel.temperature':  'Sıcaklık',
    'ai.panel.context':      'Bağlam',
    'ai.panel.tokens':       'Token',
    'ai.panel.latency':      'Gecikme',
    'ai.panel.lobeSync':     'Lob Senkronizasyonu',

    'status.connecting':   'Bağlanıyor…',
    'status.connected':    'Bağlandı',
    'status.disconnected': 'Bağlantı Kesildi',
    'status.processing':   'İşleniyor…',
    'status.error':        'Hata',
    'status.ready':        'Hazır',
    'status.loading':      'Yükleniyor…',
    'status.saving':       'Kaydediliyor…',
    'status.saved':        'Kaydedildi',
    'status.unsaved':      'Kaydedilmedi',
    'status.syncing':      'Eşitleniyor…',
    'status.synced':       'Eşitlendi',
    'status.offline':      'Çevrimdışı',
    'status.sovereign':    'Egemen',

    'phrase.sovereigntyDuty':   'Dijital egemenlik isteğe bağlı değil — bir yükümlülüktür',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'Yerel Ollama ile desteklenmektedir',
    'phrase.localInference':    '%100 yerel çıkarım',
    'phrase.noDataLeaks':       'Sıfır veri sızıntısı',
    'phrase.yourCodeYoursAlone':'Kodunuz yalnızca sizindir',

    'settings.title':        'Ayarlar',
    'settings.language':     'Dil',
    'settings.theme':        'Tema',
    'settings.fontSize':     'Yazı Tipi Boyutu',
    'settings.fontFamily':   'Yazı Tipi Ailesi',
    'settings.autoSave':     'Otomatik Kaydet',
    'settings.sovereignMode':'Egemenlik Modu',
    'settings.ollamaUrl':    'Ollama URL',
    'settings.defaultModel': 'Varsayılan Model',

    'terminal.title':       'Terminal',
    'terminal.newTerminal': 'Yeni Terminal',
    'terminal.clear':       'Temizle',
    'terminal.kill':        'Sonlandır',
    'terminal.sandbox':     'Korumalı Alan',

    'git.commit':  'Kaydet',
    'git.push':    'İt',
    'git.pull':    'Çek',
    'git.branch':  'Dal',
    'git.merge':   'Birleştir',
    'git.clone':   'Klonla',
    'git.init':    'Başlat',
    'git.status':  'Durum',

    'ui.ok':       'Tamam',
    'ui.cancel':   'İptal',
    'ui.confirm':  'Onayla',
    'ui.close':    'Kapat',
    'ui.save':     'Kaydet',
    'ui.discard':  'Yoksay',
    'ui.apply':    'Uygula',
    'ui.reset':    'Sıfırla',
    'ui.search':   'Ara',
    'ui.loading':  'Yükleniyor',
    'ui.noResults':'Sonuç Yok',
    'ui.error':    'Hata',
    'ui.warning':  'Uyarı',
    'ui.info':     'Bilgi',
    'ui.success':  'Başarı',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // HINDI
  // ══════════════════════════════════════════════════════════════════════════
  hi: {
    'menu.file':           'फ़ाइल',
    'menu.edit':           'संपादन',
    'menu.view':           'दृश्य',
    'menu.terminal':       'टर्मिनल',
    'menu.help':           'सहायता',
    'menu.settings':       'सेटिंग्स',
    'menu.search':         'खोज',
    'menu.git':            'Git',
    'menu.extensions':     'एक्सटेंशन',
    'menu.run':            'चलाएं',
    'menu.debug':          'डीबग',

    'file.new':            'नई फ़ाइल',
    'file.open':           'खोलें',
    'file.save':           'सहेजें',
    'file.saveAll':        'सभी सहेजें',
    'file.saveAs':         'इस रूप में सहेजें…',
    'file.close':          'बंद करें',
    'file.closeAll':       'सभी बंद करें',
    'file.revert':         'वापस करें',
    'file.rename':         'नाम बदलें',
    'file.delete':         'हटाएं',
    'file.duplicate':      'डुप्लीकेट',

    'edit.undo':           'पूर्ववत करें',
    'edit.redo':           'फिर करें',
    'edit.cut':            'काटें',
    'edit.copy':           'कॉपी करें',
    'edit.paste':          'चिपकाएं',
    'edit.selectAll':      'सभी चुनें',
    'edit.find':           'खोजें',
    'edit.findReplace':    'खोजें और बदलें',
    'edit.format':         'दस्तावेज़ फ़ॉर्मेट करें',
    'edit.comment':        'टिप्पणी टॉगल',

    'view.explorer':       'एक्सप्लोरर',
    'view.search':         'खोज',
    'view.sourceControl':  'स्रोत नियंत्रण',
    'view.debug':          'चलाएं और डीबग करें',
    'view.extensions':     'एक्सटेंशन',
    'view.terminal':       'टर्मिनल',
    'view.splitEditor':    'संपादक विभाजित करें',
    'view.fullscreen':     'पूर्ण स्क्रीन',
    'view.zoomIn':         'ज़ूम इन',
    'view.zoomOut':        'ज़ूम आउट',

    'ai.panel.title':        'AI पैनल',
    'ai.panel.cognitive':    'संज्ञानात्मक लोब',
    'ai.panel.executive':    'कार्यकारी लोब',
    'ai.panel.sensory':      'संवेदी लोब',
    'ai.panel.cognitiveDesc':'गहरी समझ, विश्लेषण और कोड उत्पादन',
    'ai.panel.executiveDesc':'बहु-चरण योजना, समन्वय और लक्ष्य ट्रैकिंग',
    'ai.panel.sensoryDesc':  'इनपुट प्रसंस्करण और रीयल-टाइम पैटर्न पहचान',
    'ai.panel.intent':       'आशय',
    'ai.panel.confidence':   'विश्वास',
    'ai.panel.dialect':      'बोली',
    'ai.panel.tone':         'स्वर',
    'ai.panel.domain':       'डोमेन',
    'ai.panel.sovereigntyScore': 'संप्रभुता स्कोर',
    'ai.panel.model':        'मॉडल',
    'ai.panel.temperature':  'तापमान',
    'ai.panel.context':      'संदर्भ',
    'ai.panel.tokens':       'टोकन',
    'ai.panel.latency':      'विलंब',
    'ai.panel.lobeSync':     'लोब सिंक',

    'status.connecting':   'कनेक्ट हो रहा है…',
    'status.connected':    'कनेक्टेड',
    'status.disconnected': 'डिस्कनेक्टेड',
    'status.processing':   'प्रसंस्करण हो रहा है…',
    'status.error':        'त्रुटि',
    'status.ready':        'तैयार',
    'status.loading':      'लोड हो रहा है…',
    'status.saving':       'सहेजा जा रहा है…',
    'status.saved':        'सहेजा गया',
    'status.unsaved':      'सहेजा नहीं गया',
    'status.syncing':      'सिंक हो रहा है…',
    'status.synced':       'सिंक हो गया',
    'status.offline':      'ऑफलाइन',
    'status.sovereign':    'संप्रभु',

    'phrase.sovereigntyDuty':   'डिजिटल संप्रभुता वैकल्पिक नहीं है — यह एक कर्तव्य है',
    'phrase.tagline':           'There is nothing impossible — We are heirs of Al-Khwarizmi',
    'phrase.taglineAr':         'لا يوجد مستحيل في الدنيا — نحن ورثة الخوارزمي',
    'phrase.poweredByOllama':   'स्थानीय Ollama द्वारा संचालित',
    'phrase.localInference':    '100% स्थानीय अनुमान',
    'phrase.noDataLeaks':       'शून्य डेटा लीक',
    'phrase.yourCodeYoursAlone':'आपका कोड केवल आपका है',

    'settings.title':        'सेटिंग्स',
    'settings.language':     'भाषा',
    'settings.theme':        'थीम',
    'settings.fontSize':     'फ़ॉन्ट आकार',
    'settings.fontFamily':   'फ़ॉन्ट परिवार',
    'settings.autoSave':     'स्वत: सहेजें',
    'settings.sovereignMode':'संप्रभु मोड',
    'settings.ollamaUrl':    'Ollama URL',
    'settings.defaultModel': 'डिफ़ॉल्ट मॉडल',

    'terminal.title':       'टर्मिनल',
    'terminal.newTerminal': 'नया टर्मिनल',
    'terminal.clear':       'साफ़ करें',
    'terminal.kill':        'समाप्त करें',
    'terminal.sandbox':     'सैंडबॉक्स',

    'git.commit':  'कमिट',
    'git.push':    'पुश',
    'git.pull':    'पुल',
    'git.branch':  'ब्रांच',
    'git.merge':   'मर्ज',
    'git.clone':   'क्लोन',
    'git.init':    'आरंभ करें',
    'git.status':  'स्थिति',

    'ui.ok':       'ठीक है',
    'ui.cancel':   'रद्द करें',
    'ui.confirm':  'पुष्टि करें',
    'ui.close':    'बंद करें',
    'ui.save':     'सहेजें',
    'ui.discard':  'त्यागें',
    'ui.apply':    'लागू करें',
    'ui.reset':    'रीसेट करें',
    'ui.search':   'खोजें',
    'ui.loading':  'लोड हो रहा है',
    'ui.noResults':'कोई परिणाम नहीं',
    'ui.error':    'त्रुटि',
    'ui.warning':  'चेतावनी',
    'ui.info':     'जानकारी',
    'ui.success':  'सफलता',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Runtime State
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_LOCALE: LocaleCode = 'ar';

let _currentLocale: LocaleCode = (() => {
  // Auto-detect from environment (browser or Node)
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('haven:locale') as LocaleCode | null;
      if (stored && availableLocales.includes(stored)) return stored;
    }
    if (typeof navigator !== 'undefined') {
      const browserLang = navigator.language.split('-')[0] as LocaleCode;
      if (availableLocales.includes(browserLang)) return browserLang;
    }
  } catch {
    // SSR / no localStorage — fall through to default
  }
  return DEFAULT_LOCALE;
})();

// ─────────────────────────────────────────────────────────────────────────────
// Core API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Translate a key using the current locale (or a specified one).
 * Falls back to English, then returns the raw key if no translation found.
 *
 * @param key  - Translation key
 * @param lang - Optional locale override
 * @returns    Translated string
 *
 * @example
 *   t('menu.file')               // → 'ملف'  (if locale is 'ar')
 *   t('menu.file', 'en')         // → 'File' (forced English)
 *   t('ui.ok', 'fr')             // → 'OK'
 */
export function t(key: TranslationKey, lang?: LocaleCode): string {
  const locale = lang ?? _currentLocale;
  const table = translations[locale];
  if (table && key in table) return table[key];

  // Fallback to English
  if (locale !== 'en' && translations.en[key]) return translations.en[key];

  // Last resort: return the key itself
  return key;
}

/**
 * Set the active locale globally.
 * Persists to localStorage if available.
 * Also updates the `<html lang>` and `dir` attributes in browser contexts.
 *
 * @param lang - Locale code to activate
 */
export function setLocale(lang: LocaleCode): void {
  if (!availableLocales.includes(lang)) {
    console.warn(`[HAVEN i18n] Unknown locale: "${lang}". Ignoring.`);
    return;
  }
  _currentLocale = lang;

  try {
    if (typeof window !== 'undefined') {
      window.localStorage?.setItem('haven:locale', lang);

      // Update HTML attributes for proper rendering
      const info = LOCALE_INFO[lang];
      document.documentElement.setAttribute('lang', lang);
      document.documentElement.setAttribute('dir', info.dir);
    }
  } catch {
    // SSR — ignore
  }
}

/**
 * Get the currently active locale code.
 */
export function getLocale(): LocaleCode {
  return _currentLocale;
}

/**
 * Get metadata (name, direction, flag) for the current or specified locale.
 */
export function getLocaleInfo(lang?: LocaleCode): LocaleInfo {
  return LOCALE_INFO[lang ?? _currentLocale];
}

/**
 * Check if the current (or specified) locale is RTL.
 */
export function isRTL(lang?: LocaleCode): boolean {
  return LOCALE_INFO[lang ?? _currentLocale].dir === 'rtl';
}

/**
 * Get all available translations for a given key (useful for debugging / UI).
 */
export function getAllTranslations(key: TranslationKey): Record<LocaleCode, string> {
  return availableLocales.reduce((acc, locale) => {
    acc[locale] = translations[locale]?.[key] ?? '';
    return acc;
  }, {} as Record<LocaleCode, string>);
}

/**
 * Get all keys that are missing in a given locale (useful for completeness checks).
 */
export function getMissingKeys(lang: LocaleCode): TranslationKey[] {
  const base = translations.en;
  const target = translations[lang] ?? {};
  return (Object.keys(base) as TranslationKey[]).filter((k) => !(k in target));
}

// ─────────────────────────────────────────────────────────────────────────────
// React Hook (optional — only works in React environments)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * React hook for consuming translations with automatic re-render on locale change.
 * Import only in React components.
 *
 * @example
 *   const { t, locale, setLocale } = useI18n();
 *   return <button>{t('ui.ok')}</button>;
 */
export function useI18n() {
  // Dynamic React import to avoid breaking non-React environments
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let reactHooks: { useState: any; useCallback: any } | undefined;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react');
    reactHooks = { useState: React.useState, useCallback: React.useCallback };
  } catch {
    throw new Error('[HAVEN i18n] useI18n() requires React to be installed.');
  }

  if (!reactHooks) {
    throw new Error('[HAVEN i18n] useI18n() requires React to be installed.');
  }

  const { useState, useCallback } = reactHooks;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [locale, setLocaleState]: [LocaleCode, (v: LocaleCode) => void] = useState(_currentLocale) as any;

  const changeLocale = useCallback(
    (lang: LocaleCode) => {
      setLocale(lang);
      setLocaleState(lang);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const translate = useCallback(
    (key: TranslationKey, lang?: LocaleCode) => t(key, lang ?? locale),
    [locale]
  );

  return {
    t: translate as (key: TranslationKey, lang?: LocaleCode) => string,
    locale,
    setLocale: changeLocale as (lang: LocaleCode) => void,
    localeInfo: LOCALE_INFO[locale],
    isRTL: isRTL(locale),
    availableLocales,
    LOCALE_INFO,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Named exports for convenience
// ─────────────────────────────────────────────────────────────────────────────

export default {
  t,
  setLocale,
  getLocale,
  getLocaleInfo,
  isRTL,
  getAllTranslations,
  getMissingKeys,
  availableLocales,
  LOCALE_INFO,
  useI18n,
};
