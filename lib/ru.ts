/**
 * ru.ts — Russian UI dictionary (DESIGN §6 + onboarding copy §5.4).
 * Canonical locale: these strings are final. The KK dictionary mirrors
 * this key set 1:1 (the lint:design rule in PROMPTS §12.3 enforces that
 * ru and kk have identical key sets).
 */

export const ru = {
  // App / city
  "app.name": "DemAI",
  "app.city": "Алматы",

  // Badges
  "badge.now": "Сейчас",
  "badge.live": "Live",

  // Home screen (§5.2)
  "home.title": "Твой риск и воздух",
  "home.places": "Мои места ⌄",

  // Places
  "place.home": "Дом",
  "place.school": "Школа",
  "place.section": "Секция",
  "place.add": "+ Добавить место",

  // Detail screen (§5.1)
  "detail.forecast": "Прогноз риска",
  "detail.forecastTooltip": "{risk}/10 · {day} {time}",
  "detail.why": "Почему {risk}/10",
  "detail.actionsTitle": "3 действия на завтра",
  "detail.pollenSubtitle": "Пыльца",
  "detail.airSubtitle": "Воздух",
  "detail.disclaimer":
    "Информационный сервис, не медицинская рекомендация. Действия согласуй с врачом",
  "detail.botText": "Утренний прогноз — в Telegram к 7:30",
  "detail.botConnect": "Подключить",
  "detail.botLater": "Позже",
  "detail.botLaterReminder": "Напомнить позже",
  "detail.sparse": "В вашем районе мало датчиков — показываем город",
  "detail.diaryLink": "Отметить самочувствие",
  "detail.diaryQuestion": "Как ты сегодня?",
  "detail.diaryGood": "Хорошо",
  "detail.diaryMeh": "Так себе",
  "detail.diaryBad": "Плохо",
  "detail.diarySaved": "Записал ✅",
  "detail.personalThreshold": "Личный порог: {pm} мкг/м³ — найден по твоему дневнику за {n} дней",

  // Units
  "unit.risk": "/10",
  "unit.pm": "мкг/м³",
  "unit.pollen": "/5",

  // Pollen level words (MetricCard word mode)
  "level.none": "нет",
  "level.low": "низкий",
  "level.moderate": "умеренный",
  "level.high": "высокий",

  // Risk chips (§6 verdict table)
  "risk.low": "Низкий риск",
  "risk.mid": "Средний риск",
  "risk.high": "Высокий риск",
  "risk.severe": "Очень высокий",

  // Verdicts (§6 verdict table) — text to the right of the blob
  "verdict.low": "Хороший день — гуляй спокойно",
  "verdict.mid": "Умеренно — прислушивайся к себе",
  "verdict.high": "Высокий риск — смотри действия ниже",
  "verdict.severe": "Очень высокий — лучше день дома",

  // Actions (§5.1.3) — reminders, never prescriptions (§8)
  "action.ventilate": "Проветри до 7:00, потом окна закрой",
  "action.indoorSport": "Тренировку сегодня — в зал",
  "action.inhaler": "Проверь, что ингалятор с собой",
  "action.mask": "На улице — маска или дистанция",
  "action.window": "Держи окна закрытыми до вечера",
  "action.outdoor": "После дождя воздух чище — гуляй",

  // Onboarding — shared
  "onb.continue": "Продолжить",
  "onb.start": "Поехали",
  "onb.back": "Назад",
  "onb.skip": "Пропустить",

  // S0 — language
  "onb.s0.title": "Выбери язык",
  "onb.s0.hint": "Можно сменить позже",
  "onb.lang.kk": "ҚАЗ",
  "onb.lang.ru": "РУС",

  // S1 — who
  "onb.s1.title": "Кто ты?",
  "onb.s1.hint": "Это поможет подобрать формулировки",
  "onb.who.self": "Я сам",
  "onb.who.parent": "Родитель ребёнка",

  // S2 — diagnosis
  "onb.s2.title": "Диагноз",
  "onb.s2.hint": "Всё хранится только на этом телефоне",
  "onb.diag.asthma": "Астма",
  "onb.diag.pollinosis": "Поллиноз",
  "onb.diag.both": "Оба",
  "onb.diag.unknown": "Не знаю",
  "onb.childAge.label": "Возраст ребёнка",
  "onb.childAge.suffix": "лет",
  "onb.sensitive.copy":
    "Тогда используем осторожные пороги — дневник за 7 дней найдёт твой личный",

  // S3 — triggers
  "onb.s3.title": "Что ухудшает самочувствие?",
  "onb.s3.hint": "Можно выбрать несколько",
  "onb.group.pollen": "Пыльца",
  "onb.group.air": "Воздух",
  "onb.trigger.wormwood": "Полынь",
  "onb.trigger.birch": "Берёза",
  "onb.trigger.ragweed": "Амброзия",
  "onb.trigger.pm25": "PM2.5 / смог",
  "onb.trigger.smoke": "Дым",
  "onb.triggers.pickForMe": "Выбрать за меня по диагнозу",
  "onb.triggers.none": "Ничего из этого",

  // S4 — district
  "onb.s4.title": "Твой район",
  "onb.s4.hint": "Алматы — восемь районов",
  "onb.district.geo": "Найти по геолокации",
  "onb.geo.denied": "Геолокация недоступна — выбери район вручную",
  "onb.geo.locating": "Определяем…",

  // Dev-only tap counter overlay (PROMPTS §6.5)
  "taps.label": "Тапов: {n} / 7",
  "taps.pass": "Уложились в 7 тапов ✅",
  "taps.over": "Превысили 7 тапов",
};

export type DictKey = keyof typeof ru;
