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
  "app.country": "Казахстан",

  // Badges
  "badge.now": "Real-time",
  "badge.live": "Live",

  // Home screen (§5.2)
  "home.title": "Риски и качество воздуха",
  "home.places": "Мои места",
  "home.addTitle": "Добавить место",
  "home.addHint": "Выберите название и район",
  "home.addLabel": "Название",
  "home.addDistrict": "Район",
  "home.addConfirm": "Добавить",
  "home.addCancel": "Отмена",

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
    "Информационный сервис, не медицинская рекомендация. Действия согласуйте с врачом",
  "detail.botText": "Утренний прогноз — в Telegram к 7:30",
  "detail.botConnect": "Подключить",
  "detail.botUnavailable": "Бот временно недоступен — попробуй позже",
  "detail.botLinkFailed": "Не удалось связаться с ботом (код {status})",
  "detail.botPopupBlocked": "Разреши всплывающие окна и попробуй снова",
  "detail.botDebug": "bot: {bot} · api: {status}",
  "detail.botLater": "Позже",
  "detail.botLaterReminder": "Напомнить позже",
  "detail.sparse": "В вашем районе мало датчиков — показываем город",
  "detail.stale": "Данные задерживаются — показываем последний снимок",
  "detail.diaryLink": "Отметить самочувствие",
  "detail.diaryQuestion": "Как ты сегодня?",
  "detail.diaryGood": "Хорошо",
  "detail.diaryMeh": "Так себе",
  "detail.diaryBad": "Плохо",
  "detail.diarySaved": "Записал ✅",
  "detail.diarySavedOk": "Записано ✓",
  "detail.diaryUpdatedOk": "Обновлено ✓",
  "detail.diaryLearning": "Дневник учится: {n}/7 дней до личного порога",
  "detail.diaryError": "Не удалось сохранить — попробуй ещё раз",
  "detail.diaryToday": "Сегодня: отмечено ✓",
  "detail.diaryInfo":
    "Отмечай самочувствие раз в день. Через 7 дней DemAI найдёт твой личный порог PM2.5 — и прогноз риска станет считаться именно под тебя, а не по общей шкале.",
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
  "verdict.low": "Сегодня дышится легко",
  "verdict.mid": "Фон умеренный — слушайте себя",
  "verdict.high": "День непростой — лучше поберечься",
  "verdict.severe": "Воздух тяжёлый — сегодня лучше остаться дома",

  // Actions (§5.1.3) — reminders, never prescriptions (§8)
  "action.ventilate": "Проветрите до 7:00, потом закройте окна",
  "action.indoorSport": "Тренировку сегодня — в зал",
  "action.inhaler": "Проверьте, что ингалятор с собой",
  "action.mask": "На улице — маска или дистанция",
  "action.window": "Держите окна закрытыми до вечера",
  "action.outdoor": "После дождя воздух чище — можете гулять",

  // Onboarding — shared
  "onb.continue": "Продолжить",
  "onb.start": "Поехали",
  "onb.back": "Назад",
  "onb.skip": "Пропустить",

  // S0 — language
  "onb.s0.title": "Выбери язык",
  "onb.s0.hint": "Можно сменить позже",
  "onb.lang.kk": "Қазақша",
  "onb.lang.ru": "Русский",

  // S1 — who
  "onb.s1.title": "Для кого прогноз?",
  "onb.s1.hint": "Это поможет подобрать формулировки",
  "onb.who.self": "Для меня",
  "onb.who.parent": "Для моего ребёнка",

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
    "Тогда используем осторожные пороги — дневник за 7 дней найдёт ваш личный",

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
  "onb.s4.title": "Ваш район",
  "onb.s4.hint": "Алматы — восемь районов",
  "onb.district.geo": "Найти по геолокации",
  "onb.geo.denied": "Геолокация недоступна — выберите район вручную",
  "onb.geo.locating": "Определяем…",

  // Dev-only tap counter overlay (PROMPTS §6.5)
  "taps.label": "Тапов: {n} / 7",
  "taps.pass": "Уложитесь в 7 тапов ✅",
  "taps.over": "Превысили 7 тапов",

  // Map screen (§5.3)
  "map.open": "Открыть",
  "map.locate": "Моё местоположение",
  "map.geo.denied": "Геолокация недоступна",
  "map.geo.locating": "Определяем…",
  "map.sheetUnit": "/10",

  // Landing — pre-onboarding (§5.5)
  "landing.h1": "Твой личный прогноз воздуха и пыльцы",
  "landing.sub":
    "DemAI переводит данные о воздухе и пыльце в один понятный риск 1–10 и три действия на завтра — под твой диагноз и твой район",
  "landing.start": "Начать",
  "landing.ctaCaption": "Без регистрации · 30 секунд",
  "landing.feature.risk": "Риск 1–10 на сегодня и завтра",
  "landing.feature.pollen": "Первый календарь пыльцы Казахстана",
  "landing.feature.threshold": "Личный порог — из дневника за 7 дней",
  "landing.locale.kk": "KZ",
  "landing.locale.ru": "RU",
  "landing.logoAria": "DemAI — на главную",
  "landing.localeAria": "Выбрать язык",
};

export type DictKey = keyof typeof ru;
