import { ChevronLeft, Grip, Home, LocateFixed, Search, Settings } from "lucide-react";
import { IconCircle } from "./IconCircle";

/**
 * TopBar — DESIGN §4.1, three variants: map · home · detail.
 * Pure presentational; callbacks come in as props, no routing inside.
 */
export type TopBarVariant = "map" | "home" | "detail";

export interface TopBarProps {
  variant: TopBarVariant;
  title: string;
  subtitle?: string;
  avatarUrl?: string;
  onBack?: () => void;
  onMenu?: () => void;
  onSearch?: () => void;
  onLocate?: () => void;
  onSettings?: () => void;
}

export function TopBar({
  variant,
  title,
  subtitle,
  avatarUrl,
  onBack,
  onMenu,
  onSearch,
  onLocate,
  onSettings,
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

  // detail
  return (
    <div className="flex items-center justify-between gap-3">
      <IconCircle icon={ChevronLeft} variant="white" size={44} aria-label="Назад" onClick={onBack} className="shadow-card" />
      <div
        className="flex min-w-0 items-center gap-2.5 rounded-full bg-white px-1.5 py-1.5 shadow-card"
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
      <IconCircle icon={Grip} variant="white" size={44} aria-label="Меню" onClick={onMenu} className="shadow-card" />
    </div>
  );
}
