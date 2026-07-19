import { ChevronLeft, Home, LayoutGrid, LocateFixed, Search, Settings } from "lucide-react";
import { IconCircle } from "./IconCircle";

/**
 * TopBar — DESIGN §4.1, three variants: map · home · detail.
 * Pure presentational; callbacks come in as props, no routing inside.
 *
 * A fourth `settings` variant backs the /settings page (§5.6): a white
 * chevron-left circle on the left (→ /home), a centered white title, and a
 * white «Готово» text button on the right.
 */
export type TopBarVariant = "map" | "home" | "detail" | "settings";

export interface TopBarProps {
  variant: TopBarVariant;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  onHome?: () => void;
  onSearch?: () => void;
  onLocate?: () => void;
  onSettings?: () => void;
  onBack?: () => void;
  onDone?: () => void;
  doneLabel?: string;
  backAria?: string;
  /** Extra classes for the detail variant's grid icon circle (§7 tap states). */
  iconClassName?: string;
}

export function TopBar({
  variant,
  title,
  subtitle,
  avatarUrl,
  onHome,
  onSearch,
  onLocate,
  onSettings,
  onBack,
  onDone,
  doneLabel,
  backAria,
  iconClassName = "",
}: TopBarProps) {
  if (variant === "map") {
    return (
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          {/* Avatar pill (dark glass) — city + subtext */}
          <div
            className="flex min-w-0 items-center gap-3 rounded-full ps-1.5 pe-4 py-1.5"
            style={{
              background: "var(--glass-dark)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <span
              className="block h-10 w-10 shrink-0 overflow-hidden rounded-full bg-white/30"
              style={avatarUrl ? { backgroundImage: `url(${avatarUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              aria-label={title}
            />
            <div className="min-w-0 pe-1">
              <div className="text-body text-white truncate">{title}</div>
              {subtitle ? (
                <div className="text-caption truncate" style={{ color: "var(--white-70)" }}>
                  {subtitle}
                </div>
              ) : null}
            </div>
          </div>
          {/* Right column: search, then locate below */}
          <div className="flex flex-col items-end gap-3">
            <IconCircle icon={Search} variant="glassDark" aria-label="Поиск" onClick={onSearch} />
            <IconCircle icon={LocateFixed} variant="glassDark" aria-label="Моё местоположение" onClick={onLocate} />
          </div>
        </div>
      </div>
    );
  }

  if (variant === "home") {
    return (
      <div className="flex items-center justify-between gap-3">
        <IconCircle icon={Settings} variant="glassDark" aria-label="Настройки" onClick={onSettings} />
        <div className="text-body text-white truncate">{title}</div>
        <IconCircle icon={Search} variant="glassDark" aria-label="Поиск" onClick={onSearch} />
      </div>
    );
  }

  if (variant === "settings") {
    return (
      <SettingsTopBar
        title={title}
        onBack={onBack}
        onDone={onDone}
        doneLabel={doneLabel}
        backAria={backAria}
      />
    );
  }

  // detail — left grid button (→ Home) + centered location pill, nothing on the right.
  return (
    <div className="relative flex items-center gap-3">
      <IconCircle
        icon={LayoutGrid}
        variant="white"
        size={44}
        aria-label="Главная"
        onClick={onHome}
        className={`shadow-card ${iconClassName}`}
      />
      <div
        className="pointer-events-none absolute left-1/2 flex min-w-0 -translate-x-1/2 items-center gap-2.5 rounded-full bg-white px-1.5 py-1.5 shadow-card"
        style={{ height: 48 }}
      >
        <IconCircle icon={Home} variant="black" size={36} aria-label="Дом" />
        <div className="min-w-0 pe-3">
          <div className="text-body text-ink truncate leading-none">{title}</div>
          {subtitle ? (
            <div className="text-caption truncate leading-none mt-0.5" style={{ color: "var(--ink-60)" }}>
              {subtitle}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * settings — DESIGN §5.6. White chevron-left circle on the left (→ /home),
 * centered white title, white «Готово» text button on the right. The back
 * circle and the done button both carry --shadow-card so they read as the
 * same floating-control family as the detail TopBar.
 */
function SettingsTopBar({
  title,
  onBack,
  onDone,
  doneLabel,
  backAria,
}: {
  title: string;
  onBack?: () => void;
  onDone?: () => void;
  doneLabel?: string;
  backAria?: string;
}) {
  return (
    <div className="relative flex items-center justify-between gap-3">
      <IconCircle
        icon={ChevronLeft}
        variant="white"
        size={44}
        aria-label={backAria}
        onClick={onBack}
        className="shadow-card"
      />
      <div className="text-body text-white truncate">{title}</div>
      {onDone ? (
        <button
          type="button"
          onClick={onDone}
          className="tappable rounded-full px-4 text-chip text-white"
          style={{
            height: 44,
            background: "var(--glass-light)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {doneLabel}
        </button>
      ) : (
        <span style={{ width: 44 }} />
      )}
    </div>
  );
}
