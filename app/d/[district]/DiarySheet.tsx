"use client";

/**
 * DiarySheet — the in-app diary fallback (PROMPTS §11.5), built as a bottom
 * sheet using the EXACT same mechanic as `app/home/AddPlaceSheet.tsx`:
 *
 *   - always mounted, driven purely by CSS on the `open` prop (no effects);
 *   - the card slides translateY(100%)→0, 260ms cubic-bezier(.32,.72,.29,.99);
 *   - the backdrop fades in (opacity 0→1, same 260ms easing);
 *   - closing reverses — tap backdrop or the ✕ button;
 *   - `inert` + pointer-events:none make it non-interactive while closed.
 *
 * Content: «Как ты сегодня?» + three OptionCard buttons (Хорошо / Так себе /
 * Плохо) → the parent POSTs /api/diary and drives `status`. On success the body
 * swaps to a confirmation («Записано ✓» / «Обновлено ✓» + a learning caption);
 * on error it shows «Не удалось сохранить — попробуй ещё раз» and keeps the
 * buttons so the user can retry. No new page — a true overlay sheet.
 */
import {
  CheckCircle,
  Frown,
  Meh,
  Smile,
  X,
  type LucideIcon,
} from "lucide-react";
import { OptionCard } from "@/components/ui/Onboarding";
import type { Locale } from "@/lib/i18n";

const EASING = "cubic-bezier(.32,.72,.29,.99)";
const DURATION = 260;

export type DiaryStatus = "idle" | "saving" | "saved" | "updated" | "error";

type TFunc = (
  key:
    | "detail.diaryQuestion"
    | "detail.diaryGood"
    | "detail.diaryMeh"
    | "detail.diaryBad"
    | "detail.diarySavedOk"
    | "detail.diaryUpdatedOk"
    | "detail.diaryLearning"
    | "detail.diaryError",
  vars?: Record<string, string | number>,
) => string;

const FEELINGS: { feeling: 1 | 2 | 3; labelKey: "detail.diaryGood" | "detail.diaryMeh" | "detail.diaryBad"; icon: LucideIcon }[] = [
  { feeling: 1, labelKey: "detail.diaryGood", icon: Smile },
  { feeling: 2, labelKey: "detail.diaryMeh", icon: Meh },
  { feeling: 3, labelKey: "detail.diaryBad", icon: Frown },
];

export interface DiarySheetProps {
  open: boolean;
  status: DiaryStatus;
  /** Diary row count after the write — feeds the «N/7» learning caption. */
  diaryCount: number;
  tt: TFunc;
  onClose: () => void;
  onPick: (feeling: 1 | 2 | 3) => void;
}

export function DiarySheet({
  open,
  status,
  diaryCount,
  tt,
  onClose,
  onPick,
}: DiarySheetProps) {
  const busy = status === "saving";
  const done = status === "saved" || status === "updated";
  const errored = status === "error";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      aria-hidden={!open}
      inert={!open}
      data-testid="diary-sheet"
      style={{
        background: "rgba(33,33,33,.40)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        opacity: open ? 1 : 0,
        pointerEvents: open ? "auto" : "none",
        transition: `opacity ${DURATION}ms ${EASING}`,
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[430px]"
        style={{ padding: "0 16px 16px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex flex-col gap-4 bg-white shadow-float"
          style={{
            borderRadius: "var(--r-card)",
            padding: 20,
            transform: open ? "translateY(0)" : "translateY(100%)",
            transition: `transform ${DURATION}ms ${EASING}`,
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <h2 className="text-h2 text-ink">{tt("detail.diaryQuestion")}</h2>
            </div>
            <button
              type="button"
              aria-label="close"
              onClick={onClose}
              className="tappable inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink"
              style={{ background: "var(--icon-bg)", border: "none", cursor: "pointer" }}
            >
              <X size={18} strokeWidth={2} />
            </button>
          </div>

          {/* Body */}
          {done ? (
            <div
              data-testid="diary-sheet-confirm"
              className="flex flex-col items-center gap-3 text-center"
              style={{ padding: "12px 2px 4px" }}
            >
              <CheckCircle
                size={48}
                strokeWidth={2}
                style={{ color: "var(--lime)", flexShrink: 0 }}
              />
              <p className="text-h2 text-ink">
                {status === "updated"
                  ? tt("detail.diaryUpdatedOk")
                  : tt("detail.diarySavedOk")}
              </p>
              <p
                className="text-caption"
                style={{ color: "var(--ink-60)" }}
              >
                {tt("detail.diaryLearning", { n: Math.min(diaryCount, 7) })}
              </p>
            </div>
          ) : (
            <>
              {errored ? (
                <p
                  data-testid="diary-sheet-error"
                  className="text-body"
                  style={{ color: "var(--risk-severe)" }}
                >
                  {tt("detail.diaryError")}
                </p>
              ) : null}
              <div className="flex flex-col gap-2">
                {FEELINGS.map((f) => (
                  <OptionCard
                    key={f.feeling}
                    icon={f.icon}
                    onClick={() => onPick(f.feeling)}
                  >
                    {tt(f.labelKey)}
                  </OptionCard>
                ))}
              </div>
              {busy ? (
                <p className="text-caption" style={{ color: "var(--ink-60)" }}>
                  …
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
