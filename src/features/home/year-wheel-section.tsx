"use client";

import React from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  yearWheelEvents,
  type YearWheelEvent,
  type YearWheelSeason,
} from "@/features/home/year-wheel-data";

const TOTAL_DAYS = 365;
const SVG_WIDTH = 1000;
const SVG_HEIGHT = 560;
const CENTER_X = SVG_WIDTH / 2;
const CENTER_Y = 470;
const VISIBLE_ARC_DEG = 78;
const TICK_INNER_RADIUS = 300;
const TICK_OUTER_RADIUS = 348;
const MARKER_RADIUS = 304;
const SPAN_RADIUS = 326;
const MONTH_LABEL_RADIUS = 386;
const MONTH_STARTS = [1, 32, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
const MONTH_LABELS = ["Jan", "Feb", "Mrz", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
const CATEGORY_LABELS = {
  pflanzung: "Pflanzung",
  ernte: "Ernte",
  pflege: "Pflege",
  boden: "Boden",
  planung: "Planung",
  wasser: "Wasser",
} as const;
const SEASON_LABELS = {
  winter: "Winter",
  spring: "Frühling",
  summer: "Sommer",
  autumn: "Herbst",
} as const;

function wrapDay(day: number) {
  const normalized = ((Math.round(day) - 1) % TOTAL_DAYS + TOTAL_DAYS) % TOTAL_DAYS;
  return normalized + 1;
}

function dayToAngle(day: number) {
  return ((day - 1) / TOTAL_DAYS) * 360;
}

function normalizeAngle(angle: number) {
  if (angle > 180) {
    return angle - 360;
  }
  if (angle < -180) {
    return angle + 360;
  }
  return angle;
}

function dayDistance(a: number, b: number) {
  const diff = Math.abs(a - b);
  return Math.min(diff, TOTAL_DAYS - diff);
}

function getSeasonForDay(day: number): YearWheelSeason {
  if (day >= 335 || day < 60) {
    return "winter";
  }
  if (day < 152) {
    return "spring";
  }
  if (day < 244) {
    return "summer";
  }
  return "autumn";
}

function formatDay(day: number) {
  const date = new Date(Date.UTC(2025, 0, day));
  return new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "long" }).format(date);
}

function polarToCartesian(angle: number, radius: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return {
    x: CENTER_X + radius * Math.cos(radians),
    y: CENTER_Y + radius * Math.sin(radians),
  };
}

function describeArc(startAngle: number, endAngle: number, radius: number) {
  const start = polarToCartesian(endAngle, radius);
  const end = polarToCartesian(startAngle, radius);
  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? 0 : 1;
  const sweepFlag = endAngle >= startAngle ? 0 : 1;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} ${sweepFlag} ${end.x} ${end.y}`;
}

function eventContainsDay(event: YearWheelEvent, day: number) {
  if (event.kind === "point" || !event.endDay) {
    return event.startDay === day;
  }
  return day >= event.startDay && day <= event.endDay;
}

function getPrimaryEvent(day: number) {
  const containingEvent = yearWheelEvents.find((event) => eventContainsDay(event, day));
  if (containingEvent) {
    return containingEvent;
  }

  return [...yearWheelEvents].sort(
    (left, right) => dayDistance(left.startDay, day) - dayDistance(right.startDay, day),
  )[0];
}

function getEventAnchorDay(event: YearWheelEvent) {
  if (event.kind === "span" && event.endDay) {
    return Math.round((event.startDay + event.endDay) / 2);
  }

  return event.startDay;
}

function getRelativeAngle(day: number, selectedDay: number) {
  return normalizeAngle(dayToAngle(day) - dayToAngle(selectedDay));
}

function isVisibleAngle(angle: number) {
  return Math.abs(angle) <= VISIBLE_ARC_DEG;
}

function getVisibleSpan(event: YearWheelEvent, selectedDay: number) {
  if (event.kind !== "span" || !event.endDay) {
    return null;
  }

  const startAngle = getRelativeAngle(event.startDay, selectedDay);
  const endAngle = getRelativeAngle(event.endDay, selectedDay);
  const minVisible = -VISIBLE_ARC_DEG;
  const maxVisible = VISIBLE_ARC_DEG;

  if (endAngle < minVisible || startAngle > maxVisible) {
    return null;
  }

  return {
    startAngle: Math.max(startAngle, minVisible),
    endAngle: Math.min(endAngle, maxVisible),
  };
}

export function YearWheelSection() {
  const today = React.useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const diff = now.getTime() - start.getTime();
    return Math.min(TOTAL_DAYS, Math.max(1, Math.floor(diff / 86_400_000)));
  }, []);
  const [selectedDay, setSelectedDay] = React.useState(today);
  const [isAutoTurning, setIsAutoTurning] = React.useState(false);
  const [hoveredEventId, setHoveredEventId] = React.useState<string | null>(null);
  const dragState = React.useRef<{ pointerId: number; startX: number; startDay: number } | null>(null);

  React.useEffect(() => {
    if (!isAutoTurning) {
      return;
    }

    const interval = window.setInterval(() => {
      setSelectedDay((current) => wrapDay(current + 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isAutoTurning]);

  const selectedSeason = getSeasonForDay(selectedDay);
  const primaryEvent = React.useMemo(() => getPrimaryEvent(selectedDay), [selectedDay]);
  const activeAnchorDay = React.useMemo(() => getEventAnchorDay(primaryEvent), [primaryEvent]);
  const nearbyEvents = React.useMemo(() => {
    return [...yearWheelEvents]
      .filter((event) => event.id !== primaryEvent.id)
      .sort(
        (left, right) =>
          dayDistance(left.startDay, selectedDay) - dayDistance(right.startDay, selectedDay),
      )
      .slice(0, 2);
  }, [primaryEvent.id, selectedDay]);

  function moveBy(days: number) {
    setIsAutoTurning(false);
    setSelectedDay((current) => wrapDay(current + days));
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    dragState.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startDay: selectedDay,
    };
    setIsAutoTurning(false);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!dragState.current || dragState.current.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - dragState.current.startX;
    setSelectedDay(wrapDay(dragState.current.startDay - deltaX / 10));
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (dragState.current?.pointerId === event.pointerId) {
      dragState.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function closeHoveredEvent(eventId: string) {
    window.setTimeout(() => {
      setHoveredEventId((current) => (current === eventId ? null : current));
    }, 40);
  }

  return (
    <section
      className={`landing-reveal year-wheel-section year-wheel-section-${selectedSeason} relative overflow-hidden rounded-[2.2rem] px-5 py-7 sm:px-8 sm:py-9 lg:px-10`}
    >
      <div className="relative z-10 flex flex-col gap-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="max-w-3xl">
            <h2 className="max-w-4xl font-display text-[2.2rem] leading-[0.94] tracking-[-0.04em] text-white sm:text-[3rem]">
              Unser 2026
            </h2>
            <p className="mt-2 max-w-2xl text-base leading-7 text-white/74">
              Arbeiten und Ernten im Jahreslauf.
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            <Badge className="year-wheel-badge">{SEASON_LABELS[selectedSeason]}</Badge>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div className="year-wheel-stage">
            <div className="year-wheel-date-anchor">
              <span className="year-wheel-date-chip">{formatDay(selectedDay)}</span>
              <span className="year-wheel-date-needle" aria-hidden="true" />
            </div>

            <div
              className="year-wheel-drag-layer"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="year-wheel-svg"
                aria-label="Jahresrad mit 365 Tagen und markierten Hofereignissen"
                role="img"
              >
                <defs>
                  <radialGradient id="year-wheel-core-glow" cx="50%" cy="15%" r="70%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.08)" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0)" />
                  </radialGradient>
                </defs>

                <rect x="0" y="0" width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#year-wheel-core-glow)" />

                {yearWheelEvents
                  .map((event) => ({ event, span: getVisibleSpan(event, selectedDay) }))
                  .filter((entry) => entry.span)
                  .map(({ event, span }) => (
                    <path
                      key={event.id}
                      d={describeArc(span!.startAngle, span!.endAngle, SPAN_RADIUS)}
                      className="year-wheel-span"
                    />
                  ))}

                {Array.from({ length: TOTAL_DAYS }, (_, index) => index + 1).map((day) => {
                  const angle = getRelativeAngle(day, selectedDay);
                  if (!isVisibleAngle(angle)) {
                    return null;
                  }

                  const isMonthStart = MONTH_STARTS.includes(day);
                  const start = polarToCartesian(angle, isMonthStart ? TICK_INNER_RADIUS - 16 : TICK_INNER_RADIUS);
                  const end = polarToCartesian(angle, isMonthStart ? TICK_OUTER_RADIUS + 12 : TICK_OUTER_RADIUS);

                  return (
                    <line
                      key={day}
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      className={isMonthStart ? "year-wheel-tick year-wheel-tick-month" : "year-wheel-tick"}
                    />
                  );
                })}

                {MONTH_STARTS.map((day, index) => {
                  const angle = getRelativeAngle(day, selectedDay);
                  if (!isVisibleAngle(angle)) {
                    return null;
                  }

                  const point = polarToCartesian(angle, MONTH_LABEL_RADIUS);
                  return (
                    <text
                      key={day}
                      x={point.x}
                      y={point.y}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="year-wheel-month-label"
                    >
                      {MONTH_LABELS[index]}
                    </text>
                  );
                })}

                {yearWheelEvents.map((event) => {
                  const markerDay = event.id === primaryEvent.id ? activeAnchorDay : event.startDay;
                  const angle = getRelativeAngle(markerDay, selectedDay);
                  if (!isVisibleAngle(angle)) {
                    return null;
                  }

                  const point = polarToCartesian(angle, MARKER_RADIUS);
                  const isSelected = primaryEvent.id === event.id;

                  return (
                    <g key={event.id}>
                      <circle
                        cx={point.x}
                        cy={point.y}
                        r={isSelected ? 10 : 6}
                        className={isSelected ? "year-wheel-marker year-wheel-marker-active" : "year-wheel-marker"}
                      />
                      {isSelected ? (
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="16"
                          className="year-wheel-marker-ring"
                        />
                      ) : null}
                    </g>
                  );
                })}
              </svg>

              <div className="year-wheel-marker-overlay" aria-hidden="true">
                {yearWheelEvents.map((event) => {
                  const markerDay = event.id === primaryEvent.id ? activeAnchorDay : event.startDay;
                  const angle = getRelativeAngle(markerDay, selectedDay);
                  if (!isVisibleAngle(angle)) {
                    return null;
                  }

                  const point = polarToCartesian(angle, MARKER_RADIUS);
                  return (
                    <div
                      key={`${event.id}-hover`}
                      className="year-wheel-marker-hitbox"
                      style={{
                        left: `${(point.x / SVG_WIDTH) * 100}%`,
                        top: `${(point.y / SVG_HEIGHT) * 100}%`,
                      }}
                    >
                      <Popover open={hoveredEventId === event.id}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="year-wheel-marker-button"
                            onMouseEnter={() => setHoveredEventId(event.id)}
                            onMouseLeave={() => closeHoveredEvent(event.id)}
                            onFocus={() => setHoveredEventId(event.id)}
                            onBlur={() => closeHoveredEvent(event.id)}
                            onClick={() => {
                              setIsAutoTurning(false);
                              setSelectedDay(event.startDay);
                            }}
                            aria-label={`${event.title} am ${formatDay(markerDay)}`}
                          />
                        </PopoverTrigger>
                        <PopoverContent
                          side="top"
                          sideOffset={10}
                          className="year-wheel-popover w-64"
                          onMouseEnter={() => setHoveredEventId(event.id)}
                          onMouseLeave={() => closeHoveredEvent(event.id)}
                        >
                          <PopoverHeader>
                            <PopoverTitle className="text-white">{event.title}</PopoverTitle>
                            <PopoverDescription className="text-white/70">
                              {event.kind === "span" && event.endDay
                                ? `${formatDay(event.startDay)} bis ${formatDay(event.endDay)}`
                                : formatDay(event.startDay)}
                            </PopoverDescription>
                          </PopoverHeader>
                          <p className="text-sm leading-6 text-white/82">{event.summary}</p>
                        </PopoverContent>
                      </Popover>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="year-wheel-controls">
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="year-wheel-control-button"
                onClick={() => moveBy(-7)}
                aria-label="Eine Woche zurück"
              >
                <ArrowLeft />
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="year-wheel-control-button year-wheel-control-button-wide"
                onClick={() => setIsAutoTurning((current) => !current)}
              >
                {isAutoTurning ? <Pause /> : <Play />}
                {isAutoTurning ? "Drehen pausieren" : "Langsam drehen"}
              </Button>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="year-wheel-control-button"
                onClick={() => moveBy(7)}
                aria-label="Eine Woche vor"
              >
                <ArrowRight />
              </Button>
            </div>
          </div>

          <div className="year-wheel-info-panel">
            <div className="year-wheel-info-block">
              <p className="font-accent text-[0.72rem] uppercase tracking-[0.2em] text-[var(--year-wheel-muted)]">
                Aktiv am {formatDay(selectedDay)}
              </p>
              <h3 className="mt-2 font-display text-[1.8rem] leading-[0.96] tracking-[-0.03em] text-white">
                {primaryEvent.title}
              </h3>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Badge className="year-wheel-badge year-wheel-badge-soft">
                  {CATEGORY_LABELS[primaryEvent.category]}
                </Badge>
                <Badge className="year-wheel-badge year-wheel-badge-soft">{primaryEvent.crop}</Badge>
                <Badge className="year-wheel-badge year-wheel-badge-soft">
                  {primaryEvent.kind === "span" && primaryEvent.endDay
                    ? `${formatDay(primaryEvent.startDay)} bis ${formatDay(primaryEvent.endDay)}`
                    : formatDay(primaryEvent.startDay)}
                </Badge>
              </div>

              <p className="mt-5 mx-auto max-w-2xl text-base leading-7 text-white/78">
                {primaryEvent.summary}
              </p>
            </div>

            <div className="year-wheel-info-block">
              <p className="font-accent text-[0.72rem] uppercase tracking-[0.2em] text-[var(--year-wheel-muted)]">
                In der Nähe
              </p>
              <div className="mt-4 flex flex-col gap-2">
                {nearbyEvents.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    className="year-wheel-nearby-button"
                    onClick={() => {
                      setIsAutoTurning(false);
                      setSelectedDay(event.startDay);
                    }}
                  >
                    <span className="year-wheel-nearby-date">{formatDay(event.startDay)}</span>
                    <span className="year-wheel-nearby-title">{event.title}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="year-wheel-legend">
              {Object.values(CATEGORY_LABELS).map((label) => (
                <span key={label} className="year-wheel-legend-item">
                  <span className="year-wheel-legend-dot" />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
