// Shared metadata for the 15 institute facilities (icons + bilingual help
// + bilingual labels) used by both the profile editor and the preview modal.

export const FACILITY_KEYS = [
  'play_ground',
  'electricity',
  'tubewell',
  'tap',
  'transport',
  'auditorium',
  'gas',
  'canteen',
  'audio_sound',
  'health_aid',
  'gymnasium',
  'audio_visual',
  'television',
  'boundary_wall',
  'solar_panel',
] as const

export const FACILITY_ICONS: Record<string, string> = {
  play_ground: 'fa-futbol',
  electricity: 'fa-bolt',
  tubewell: 'fa-faucet-drip',
  tap: 'fa-faucet',
  transport: 'fa-bus-school',
  auditorium: 'fa-people-roof',
  gas: 'fa-fire',
  canteen: 'fa-utensils',
  audio_sound: 'fa-volume-high',
  health_aid: 'fa-kit-medical',
  gymnasium: 'fa-dumbbell',
  audio_visual: 'fa-projector',
  television: 'fa-tv',
  boundary_wall: 'fa-bricks',
  solar_panel: 'fa-solar-panel',
}

/** Bilingual tooltip for each facility toggle */
export const FACILITY_HELP: Record<string, { en: string; bn: string }> = {
  play_ground: { en: 'Toggle play ground facility', bn: 'খেলার মাঠ সুবিধা চালু/বন্ধ করুন' },
  electricity: { en: 'Toggle electricity connection', bn: 'বিদ্যুৎ সংযোগ চালু/বন্ধ করুন' },
  tubewell: { en: 'Toggle tubewell / safe water', bn: 'টিউবওয়েল / নিরাপদ পানি চালু/বন্ধ করুন' },
  tap: { en: 'Toggle tap water supply', bn: 'পানির কল চালু/বন্ধ করুন' },
  transport: { en: 'Toggle transport facility', bn: 'পরিবহন সুবিধা চালু/বন্ধ করুন' },
  auditorium: { en: 'Toggle auditorium', bn: 'অডিটোরিয়াম চালু/বন্ধ করুন' },
  gas: { en: 'Toggle gas connection', bn: 'গ্যাস সংযোগ চালু/বন্ধ করুন' },
  canteen: { en: 'Toggle canteen', bn: 'ক্যান্টিন চালু/বন্ধ করুন' },
  audio_sound: { en: 'Toggle audio / sound system', bn: 'অডিও / সাউন্ড সিস্টেম চালু/বন্ধ করুন' },
  health_aid: { en: 'Toggle health aid / first-aid', bn: 'স্বাস্থ্য সহায়তা চালু/বন্ধ করুন' },
  gymnasium: { en: 'Toggle gymnasium', bn: 'জিমনেশিয়াম চালু/বন্ধ করুন' },
  audio_visual: { en: 'Toggle audio-visual equipment', bn: 'অডিও-ভিজ্যুয়াল সরঞ্জাম চালু/বন্ধ করুন' },
  television: { en: 'Toggle television', bn: 'টেলিভিশন চালু/বন্ধ করুন' },
  boundary_wall: { en: 'Toggle boundary wall', bn: 'প্রাচীর / সীমানা চালু/বন্ধ করুন' },
  solar_panel: { en: 'Toggle solar panel', bn: 'সোলার প্যানেল চালু/বন্ধ করুন' },
}

/** Bilingual display labels */
export const FACILITY_LABELS: Record<string, { en: string; bn: string }> = {
  play_ground: { en: 'Play Ground', bn: 'খেলার মাঠ' },
  electricity: { en: 'Electricity', bn: 'বিদ্যুৎ' },
  tubewell: { en: 'Tubewell', bn: 'টিউবওয়েল' },
  tap: { en: 'Tap', bn: 'পানির কল' },
  transport: { en: 'Transport', bn: 'পরিবহন' },
  auditorium: { en: 'Auditorium', bn: 'অডিটোরিয়াম' },
  gas: { en: 'Gas', bn: 'গ্যাস' },
  canteen: { en: 'Canteen', bn: 'ক্যান্টিন' },
  audio_sound: { en: 'Audio Sound', bn: 'অডিও সাউন্ড' },
  health_aid: { en: 'Health Aid', bn: 'স্বাস্থ্য সহায়তা' },
  gymnasium: { en: 'Gymnasium', bn: 'জিমনেশিয়াম' },
  audio_visual: { en: 'Audio Visual', bn: 'অডিও ভিজ্যুয়াল' },
  television: { en: 'Television', bn: 'টেলিভিশন' },
  boundary_wall: { en: 'Boundary Wall', bn: 'প্রাচীর' },
  solar_panel: { en: 'Solar Panel', bn: 'সোলার প্যানেল' },
}
