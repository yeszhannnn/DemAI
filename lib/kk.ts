/**
 * kk.ts — Kazakh UI dictionary (DESIGN §6 + onboarding copy §5.4).
 *
 * Best-effort translation. EVERY value is marked `// REVIEW: native speaker`
 * so a Kazakh editor can sweep the file in one pass. The key set is identical
 * to ru.ts (enforced by the `satisfies Dict` check below and by the
 * lint:design rule in PROMPTS §12.3).
 */

import type { ru } from "./ru";

export type Dict = typeof ru;

export const kk = {
  // App / city
  "app.name": "DemAI", // REVIEW: native speaker
  "app.city": "Алматы", // REVIEW: native speaker
  "app.country": "Қазақстан", // REVIEW: native speaker

  // Badges
  "badge.now": "Real-time", // REVIEW: native speaker
  "badge.live": "Live", // REVIEW: native speaker

  // Home screen (§5.2)
  "home.title": "Қауіп деңгейі және ауа сапасы", // REVIEW: native speaker
  "home.places": "Менің орындарым", // REVIEW: native speaker
  "home.addTitle": "Орын қосу", // REVIEW: native speaker
  "home.addHint": "Атау мен ауданды таңдаңыз", // REVIEW: native speaker
  "home.addLabel": "Атау", // REVIEW: native speaker
  "home.addDistrict": "Аудан", // REVIEW: native speaker
  "home.addConfirm": "Қосу", // REVIEW: native speaker
  "home.addCancel": "Бас тарту", // REVIEW: native speaker

  // Search overlay (Home search circle)
  "search.placeholder": "Орындар бойынша іздеу", // REVIEW: native speaker
  "search.aria.open": "Іздеу", // REVIEW: native speaker
  "search.aria.clear": "Тазалау", // REVIEW: native speaker
  "search.aria.close": "Жабу", // REVIEW: native speaker
  "search.empty": "Ештеңе табылмады", // REVIEW: native speaker
  "search.hint": "Басты бетте орын қосыңыз", // REVIEW: native speaker

  // Places
  "place.home": "Үй", // REVIEW: native speaker
  "place.school": "Мектеп", // REVIEW: native speaker
  "place.section": "Секция", // REVIEW: native speaker
  "place.add": "+ Орын қосу", // REVIEW: native speaker

  // Detail screen (§5.1)
  "detail.forecast": "Қауіп деңгейінің болжамы", // REVIEW: native speaker
  "detail.forecastTooltip": "{risk}/10 · {day} {time}", // REVIEW: native speaker
  "detail.why": "Неге {risk}/10", // REVIEW: native speaker
  "detail.actionsTitle": "Ертеңге 3 әрекет", // REVIEW: native speaker
  "detail.pollenSubtitle": "Тозаң", // REVIEW: native speaker
  "detail.airSubtitle": "Ауа", // REVIEW: native speaker
  "detail.disclaimer":
    "Ақпараттық қызмет, медициналық ұсыныс емес. Әрекеттерді дәрігермен келісіңіз", // REVIEW: native speaker
  "detail.botText": "Таңертеңгі болжам — Telegram-да 7:30-да", // REVIEW: native speaker
  "detail.botConnect": "Қосу", // REVIEW: native speaker
  "detail.botUnavailable": "Бот уақытша қолжетімсіз — кейінірек байқаныңыз", // REVIEW: native speaker
  "detail.botLinkFailed": "Ботпен байланыс сәтсіз ({status})", // REVIEW: native speaker
  "detail.botPopupBlocked": "Қалқымалы терезелерге рұқсат беріп, қайталап көріңіз", // REVIEW: native speaker
  "detail.botDebug": "bot: {bot} · api: {status}", // REVIEW: native speaker
  "detail.botLater": "Кейін", // REVIEW: native speaker
  "detail.botLaterReminder": "Кейін еске салу", // REVIEW: native speaker
  "detail.sparse": "Ауданыңызда датчик аз — қаланы көрсетеміз", // REVIEW: native speaker
  "detail.stale": "Деректер кешігуде — соңғы суретті көрсетеміз", // REVIEW: native speaker
  "detail.diaryLink": "Күйді белгілеу", // REVIEW: native speaker
  "detail.diaryQuestion": "Бүгін қалайсыз?", // REVIEW: native speaker
  "detail.diaryGood": "Жақсы", // REVIEW: native speaker
  "detail.diaryMeh": "Онша емес", // REVIEW: native speaker
  "detail.diaryBad": "Жаман", // REVIEW: native speaker
  "detail.diarySaved": "Жазылды ✅", // REVIEW: native speaker
  "detail.diarySavedOk": "Жазылды ✓", // REVIEW: native speaker
  "detail.diaryUpdatedOk": "Жаңартылды ✓", // REVIEW: native speaker
  "detail.diaryLearning": "Күнделік үйренуде: {n}/7 күн қалды", // REVIEW: native speaker
  "detail.diaryError": "Сақтау мүмкін болмады — қайталап көріңіз", // REVIEW: native speaker
  "detail.diaryToday": "Бүгін: белгіленді ✓", // REVIEW: native speaker
  "detail.diaryInfo":
    "Күніне бір рет күйіңізді белгелеңіз. 7 күннен кейін DemAI сіздің жеке PM2.5 шегіңізді табады — және қауіп деңгейінің болжамы жалпы шкала бойынша емес, дәл сізге есептеледі.", // REVIEW: native speaker
  "detail.personalThreshold":
    "Жеке шегі: {pm} мкг/м³ — күнделігіңізден {n} күннен табылды", // REVIEW: native speaker

  // Units
  "unit.risk": "/10", // REVIEW: native speaker
  "unit.pm": "мкг/м³", // REVIEW: native speaker
  "unit.pollen": "/5", // REVIEW: native speaker

  // Pollen level words (MetricCard word mode)
  "level.none": "жоқ", // REVIEW: native speaker
  "level.low": "төмен", // REVIEW: native speaker
  "level.moderate": "орташа", // REVIEW: native speaker
  "level.high": "жоғары", // REVIEW: native speaker

  // Risk chips (§6 verdict table)
  "risk.low": "Төмен қауіп деңгейі", // REVIEW: native speaker
  "risk.mid": "Орта қауіп деңгейі", // REVIEW: native speaker
  "risk.high": "Жоғары қауіп деңгейі", // REVIEW: native speaker
  "risk.severe": "Өте жоғары", // REVIEW: native speaker

  // Verdicts (§6 verdict table) — text to the right of the blob
  "verdict.low": "Бүгін ауа тап-таза — еркін серуендеуге болады", // REVIEW: native speaker
  "verdict.mid": "Ауа сапасы орташа — өзіңізді байқап жүріңіз", // REVIEW: native speaker
  "verdict.high": "Ауа сапасы нашар — сақтанғаныңыз жөн", // REVIEW: native speaker
  "verdict.severe": "Ауа сапасы өте нашар — бүгін далаға шықпағаның дұрыс", // REVIEW: native speaker

  // Actions (§5.1.3) — reminders, never prescriptions (§8)
  "action.ventilate": "7:00-ге дейін желдетіп, содан терезені жабыңыз", // REVIEW: native speaker
  "action.indoorSport": "Бүгін жаттығуды — залға", // REVIEW: native speaker
  "action.inhaler": "Ингаляторыңыз бірге екенін тексеріңіз", // REVIEW: native speaker
  "action.mask": "Көшеде — маска немесе қашықтық", // REVIEW: native speaker
  "action.window": "Терезені кешке дейін жабық ұстаңыз", // REVIEW: native speaker
  "action.outdoor": "Жаңбырдан кейін ауа таза — серуендеңіз", // REVIEW: native speaker

  // Onboarding — shared
  "onb.continue": "Жалғастыру", // REVIEW: native speaker
  "onb.start": "Бастайық", // REVIEW: native speaker
  "onb.back": "Артқа", // REVIEW: native speaker
  "onb.skip": "Өткізу", // REVIEW: native speaker

  // S0 — language
  "onb.s0.title": "Тілді таңдаңыз", // REVIEW: native speaker
  "onb.s0.hint": "Кейін өзгерте аласыз", // REVIEW: native speaker
  "onb.lang.kk": "KZ", // REVIEW: native speaker
  "onb.lang.ru": "RU", // REVIEW: native speaker

  // S1 — who
  "onb.s1.title": "Болжам кімге?", // REVIEW: native speaker
  "onb.s1.hint": "Бұл формулировкаларды дұрыс таңдауға көмектеседі", // REVIEW: native speaker
  "onb.who.self": "Өзіме", // REVIEW: native speaker
  "onb.who.parent": "Балама", // REVIEW: native speaker

  // S2 — diagnosis (labels live in lib/conditions.ts — single source of truth)
  "onb.s2.title": "Диагноз", // REVIEW: native speaker
  "onb.s2.hint": "Барлығы тек осы телефонда сақталады", // REVIEW: native speaker
  "onb.childAge.label": "Баланың жасы", // REVIEW: native speaker
  "onb.childAge.suffix": "жас", // REVIEW: native speaker
  "onb.sensitive.copy":
    "Сонда сақ шектерді қолданамыз — 7 күндік күнделік сіздің жекеңізді табады", // REVIEW: native speaker

  // S3 — triggers
  "onb.s3.title": "Деніңізді нашарлататын не?", // REVIEW: native speaker
  "onb.s3.hint": "Бірнешеуін таңдауға болады", // REVIEW: native speaker
  "onb.group.pollen": "Тозаң", // REVIEW: native speaker
  "onb.group.air": "Ауа", // REVIEW: native speaker
  "onb.trigger.wormwood": "Жусан", // REVIEW: native speaker
  "onb.trigger.birch": "Қайың", // REVIEW: native speaker
  "onb.trigger.ragweed": "Амброзия", // REVIEW: native speaker
  "onb.trigger.pm25": "PM2.5 / тұман", // REVIEW: native speaker
  "onb.trigger.smoke": "Түтін", // REVIEW: native speaker
  "onb.triggers.pickForMe": "Диагноз бойынша мен үшін таңда", // REVIEW: native speaker
  "onb.triggers.none": "Ешқайсысы", // REVIEW: native speaker

  // S4 — district
  "onb.s4.title": "Сіздің ауданыңыз", // REVIEW: native speaker
  "onb.s4.hint": "Алматы — сегіз аудан", // REVIEW: native speaker
  "onb.district.geo": "Геолокациямен табу", // REVIEW: native speaker
  "onb.geo.denied": "Геолокация қолжетімсіз — ауданды қолмен таңдаңыз", // REVIEW: native speaker
  "onb.geo.locating": "Анықтап жатырмыз…", // REVIEW: native speaker

  // Dev-only tap counter overlay (PROMPTS §6.5)
  "taps.label": "Тап: {n} / 7", // REVIEW: native speaker
  "taps.pass": "7 тапқа сыяды ✅", // REVIEW: native speaker
  "taps.over": "7 таптан астық", // REVIEW: native speaker

  // Map screen (§5.3)
  "map.open": "Ашу", // REVIEW: native speaker
  "map.locate": "Менің орналасуым", // REVIEW: native speaker
  "map.geo.denied": "Геолокация қолжетімсіз", // REVIEW: native speaker
  "map.geo.locating": "Анықтап жатырмыз…", // REVIEW: native speaker
  "map.sheetUnit": "/10", // REVIEW: native speaker

  // Map search overlay (§5.3 / PROMPTS §9.3) — Nominatim address search
  "map.search.placeholder": "Алматыдағы мекенжай", // REVIEW: native speaker
  "map.search.aria.open": "Мекенжайды іздеу", // REVIEW: native speaker
  "map.search.aria.clear": "Тазалау", // REVIEW: native speaker
  "map.search.aria.close": "Жабу", // REVIEW: native speaker
  "map.search.empty": "Ештеңе табылмады", // REVIEW: native speaker
  "map.search.offline": "Іздеу офлайн қолжетімсіз", // REVIEW: native speaker
  "map.search.outOfCoverage": "Мекенжай қамту аймағынан тыс", // REVIEW: native speaker

  // Landing — pre-onboarding (§5.5)
  "landing.h1": "Ауа сапасы мен тозаң деңгейінің жеке болжамы", // REVIEW: native speaker
  "landing.sub":
    "DemAI ауа мен тозаң деректерін бір түсінікті 1–10 қауіп деңгейіне және ертеңге 3 әрекетке айналдырады — сіздің диагнозыңыз бен ауданыңыз бойынша", // REVIEW: native speaker
  "landing.start": "Бастау", // REVIEW: native speaker
  "landing.ctaCaption": "Тіркелусіз · 30 секунд ішінде", // REVIEW: native speaker
  "landing.feature.risk": "Бүгінге және ертеңге арналған 1–10 қауіп деңгейі", // REVIEW: native speaker
  "landing.feature.pollen": "Қазақстандағы тұңғыш тозаң күнтізбесі", // REVIEW: native speaker
  "landing.feature.threshold": "7 күндік күнделік негізіндегі жеке сезімталдық шегі", // REVIEW: native speaker
  "landing.locale.kk": "KZ", // REVIEW: native speaker
  "landing.locale.ru": "RU", // REVIEW: native speaker
  "landing.logoAria": "DemAI — басты бет", // REVIEW: native speaker
  "landing.localeAria": "Тілді таңдау", // REVIEW: native speaker

  // Settings screen (§5.6)
  "settings.title": "Параметрлер", // REVIEW: native speaker
  "settings.done": "Дайын", // REVIEW: native speaker
  "settings.saved": "Сақталды", // REVIEW: native speaker
  "settings.language": "Тіл", // REVIEW: native speaker
  "settings.who": "Кімсіз", // REVIEW: native speaker
  "settings.who.self": "Өзім", // REVIEW: native speaker
  "settings.who.parent": "Баланың ата-анасы", // REVIEW: native speaker
  "settings.diagnosis": "Диагноз", // REVIEW: native speaker
  "settings.triggers": "Триггерлер", // REVIEW: native speaker
  "settings.district": "Аудан", // REVIEW: native speaker
  "settings.childAge": "Баланың жасы", // REVIEW: native speaker
  "settings.reset": "Қалпына келтіру", // REVIEW: native speaker
  "settings.resetButton": "Профильді қалпына келтіру", // REVIEW: native speaker
  "settings.resetConfirmTitle": "Шынында қалпына келтіреміз бе?", // REVIEW: native speaker
  "settings.resetConfirmBody": "Профиль мен параметрлер жойылады", // REVIEW: native speaker
  "settings.resetConfirmCancel": "Бас тарту", // REVIEW: native speaker
  "settings.resetConfirmOk": "Қалпына келтіру", // REVIEW: native speaker
  "settings.lang.kk": "KZ", // REVIEW: native speaker
  "settings.lang.ru": "RU", // REVIEW: native speaker
  "settings.backAria": "Артқа", // REVIEW: native speaker
} satisfies Dict;
