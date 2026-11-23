"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, inCategory, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { Icon } from "@/components/shared/Icon";
import styles from "./Randomizer.module.css";

type Phase = "menu" | "spinning-category" | "category-selected" | "spinning-item";
type Mode = "category" | "item";
type WheelOption = { id: string; label: string };
type WheelLabel = { text: string; fontSize: number };
type TextMetricsRatio = { width: number; height: number };

interface RandomizerProps {
  open: boolean;
  items: FeedItem[];
  onClose: () => void;
  onChooseCategory: (category: FeedCategory) => void;
  onChooseItem: (item: FeedItem) => void;
}

const SPIN_MS = 4000;
const CATEGORY_PAUSE_MS = 900;

/** A two-step category/item picker, opened from any "Veldu fyrir mig" entry point. */
export function Randomizer({ open, items, onClose, onChooseCategory, onChooseItem }: RandomizerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [phase, setPhase] = useState<Phase>("menu");
  const [mode, setMode] = useState<Mode>("category");
  const [category, setCategory] = useState<FeedCategory | null>(null);

  const categories = CATEGORIES.filter((candidate) =>
    items.some((item) => inCategory(item, candidate.id)),
  ).map((candidate) => ({ id: candidate.id, label: candidate.label }));
  const itemCategories = categories;
  const categoryLabel = CATEGORIES.find((candidate) => candidate.id === category)?.label;
  const categoryItems = category ? items.filter((item) => inCategory(item, category)) : [];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(
    () => () => {
      if (pauseRef.current) clearTimeout(pauseRef.current);
    },
    [],
  );

  function start(modeToStart: Mode) {
    if (modeToStart === "item" && itemCategories.length === 0) return;
    setMode(modeToStart);
    setCategory(null);
    setPhase("spinning-category");
  }

  function closePicker() {
    if (pauseRef.current) clearTimeout(pauseRef.current);
    setPhase("menu");
    setCategory(null);
    onClose();
  }

  function categoryChosen(option: WheelOption) {
    const chosen = CATEGORIES.find((candidate) => candidate.id === option.id)?.id;
    if (!chosen) return;
    if (mode === "category") {
      closePicker();
      onChooseCategory(chosen);
      return;
    }

    setCategory(chosen);
    setPhase("category-selected");
    pauseRef.current = setTimeout(() => setPhase("spinning-item"), CATEGORY_PAUSE_MS);
  }

  function itemChosen(option: WheelOption) {
    const chosen = categoryItems.find((item) => item.id === option.id);
    if (chosen) {
      closePicker();
      onChooseItem(chosen);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-label="Veldu af handahófi"
      onClose={closePicker}
      onCancel={closePicker}
      onClick={(event) => {
        if (event.target === event.currentTarget) closePicker();
      }}
    >
      <section className={styles.panel} aria-live="polite">
        <button className={styles.close} type="button" onClick={closePicker} aria-label="Loka">
          <Icon name="close" />
        </button>

        {phase === "menu" ? (
          <>
            <p className={styles.eyebrow}>Komdu mér á óvart</p>
            <h2>Hvað eigum við að velja?</h2>
            <p className={styles.hint}>Hlutaval tekur mið af aldri og dagavali.</p>
            <div className={styles.choices}>
              <button type="button" onClick={() => start("category")} disabled={!categories.length}>
                <Icon name="dice" />
                Flokkur
              </button>
              <button type="button" onClick={() => start("item")} disabled={!itemCategories.length}>
                <Icon name="dice" />
                Hlutur
              </button>
            </div>
            {categories.length === 0 && <p className={styles.hint}>Ekkert passar við núverandi val.</p>}
          </>
        ) : phase === "category-selected" ? (
          <div className={styles.reveal}>
            <p className={styles.eyebrow}>Flokkurinn varð</p>
            <h2>{categoryLabel}</h2>
            <span className={styles.revealDice}>
              <Icon name="dice" />
            </span>
          </div>
        ) : (
          <>
            <p className={styles.eyebrow}>{phase === "spinning-category" ? "Snýst…" : `${categoryLabel} · hlutur`}</p>
            <h2>{phase === "spinning-category" ? "Veljum flokk" : "Veljum eitthvað fyrir þig"}</h2>
            <Wheel
              key={phase}
              options={
                phase === "spinning-category"
                  ? mode === "item"
                    ? itemCategories
                    : categories
                  : categoryItems.map((item) => ({ id: item.id, label: item.title }))
              }
              onDone={phase === "spinning-category" ? categoryChosen : itemChosen}
            />
          </>
        )}
      </section>
    </dialog>
  );
}

function Wheel({ options, onDone }: { options: WheelOption[]; onDone: (option: WheelOption) => void }) {
  const [rotation, setRotation] = useState(0);
  const [labelLayouts, setLabelLayouts] = useState<Record<string, WheelLabel>>({});
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    document.fonts.ready.then(() => {
      const svg = svgRef.current;
      const context = document.createElement("canvas").getContext("2d");
      if (cancelled || !svg || !context) return;

      context.font = `700 100px ${window.getComputedStyle(svg).fontFamily}`;
      const layouts = Object.fromEntries(
        options.map((option) => {
          const angle = (360 / options.length) * (Math.PI / 180);
          const label = fitWheelLabel(option.label, angle, 176, 30, (text) => {
            const metrics = context.measureText(text);
            return {
              width: metrics.width / 100,
              height: (metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent) / 100,
            };
          });
          return [option.id, label];
        }),
      );
      setLabelLayouts(layouts);
    });
    return () => {
      cancelled = true;
    };
  }, [options]);

  useEffect(() => {
    if (options.length === 0) return;
    const selectedIndex = Math.floor(Math.random() * options.length);
    const slice = 360 / options.length;
    const middle = -90 + (selectedIndex + 0.5) * slice;
    const landing = ((-90 - middle) % 360 + 360) % 360;
    const target = 360 * 5 + landing;
    const selected = options[selectedIndex];
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = requestAnimationFrame(() => setRotation(target));
    const timer = setTimeout(() => onDone(selected), reducedMotion ? 0 : SPIN_MS);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [options, onDone]);

  return (
    <div className={styles.wheelWrap}>
      <span className={styles.pointer} aria-hidden="true" />
      <svg
        ref={svgRef}
        className={styles.wheel}
        viewBox="0 0 400 400"
        role="img"
        aria-label={`Spunihjól með ${options.length} valmöguleikum`}
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {wheelSegments(options).map((segment, index) => {
          const slice = 360 / options.length;
          const middle = -90 + (index + 0.5) * slice;
          const radians = (middle * Math.PI) / 180;
          const labelRadius = 176;
          const x = 200 + Math.cos(radians) * labelRadius;
          const y = 200 + Math.sin(radians) * labelRadius;
          const textRotation = middle;
          const label =
            labelLayouts[segment.option.id] ??
            fitWheelLabel(segment.option.label, (slice * Math.PI) / 180, labelRadius, 30, estimateTextMetrics);
          return (
            <g key={segment.option.id}>
              <path d={segment.path} fill={segment.color} />
              <text
                x={x}
                y={y}
                transform={`rotate(${textRotation} ${x} ${y})`}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={label.fontSize}
                fontWeight="700"
              >
                {label.text}
              </text>
            </g>
          );
        })}
        {options.length > 1 &&
          options.map((_, index) => {
            const point = pointAt(-90 + (index * 360) / options.length);
            return (
              <line
                key={`separator-${index}`}
                x1="200"
                y1="200"
                x2={point.x}
                y2={point.y}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        <circle cx="200" cy="200" r={WHEEL_RADIUS} fill="none" stroke="white" strokeWidth="6" />
        <circle cx="200" cy="200" r="20" className={styles.hub} />
      </svg>
    </div>
  );
}

const COLORS = ["#ef6a62", "#f7c858", "#61b99c", "#62a7d8", "#a57ac8", "#eb82a2", "#e8914f"];
const WHEEL_RADIUS = 199;

function wheelSegments(options: WheelOption[]) {
  const slice = 360 / options.length;
  return options.map((option, index) => {
    const start = -90 + index * slice;
    const end = start + slice;
    const startPoint = pointAt(start);
    const endPoint = pointAt(end);
    const largeArc = slice > 180 ? 1 : 0;
    let colorIndex = index % COLORS.length;
    if (options.length > 1 && index === options.length - 1 && colorIndex === 0) colorIndex = 1;
    return {
      option,
      color: COLORS[colorIndex],
      path:
        options.length === 1
          ? `M 200 200 m -${WHEEL_RADIUS} 0 a ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 1 0 ${WHEEL_RADIUS * 2} 0 a ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 1 0 -${WHEEL_RADIUS * 2} 0`
          : `M 200 200 L ${startPoint.x} ${startPoint.y} A ${WHEEL_RADIUS} ${WHEEL_RADIUS} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`,
    };
  });
}

function pointAt(angle: number, radius = WHEEL_RADIUS) {
  const radians = (angle * Math.PI) / 180;
  return { x: 200 + Math.cos(radians) * radius, y: 200 + Math.sin(radians) * radius };
}

function fitWheelLabel(
  text: string,
  angle: number,
  outerRadius: number,
  innerRadius: number,
  measure: (text: string) => TextMetricsRatio,
): WheelLabel {
  const minFontSize = 5;
  const maxFontSizeFor = (candidate: string) => {
    const metrics = measure(candidate);
    let low = 0;
    let high = (outerRadius - innerRadius) / metrics.width;
    for (let i = 0; i < 24; i++) {
      const fontSize = (low + high) / 2;
      const textWidth = metrics.width * fontSize + 2;
      const startRadius = outerRadius - textWidth;
      const glyphHeight = metrics.height * fontSize + 2;
      const sliceWidth = angle >= Math.PI * 2 - 0.001 ? Infinity : 2 * startRadius * Math.sin(angle / 2);
      if (startRadius >= innerRadius && glyphHeight <= sliceWidth) low = fontSize;
      else high = fontSize;
    }
    return low;
  };

  let fittedText = text;
  let fontSize = maxFontSizeFor(fittedText);
  if (fontSize < minFontSize) {
    for (let length = text.length - 1; length > 0; length--) {
      const candidate = `${text.slice(0, length).trimEnd()}…`;
      const candidateSize = maxFontSizeFor(candidate);
      if (candidateSize >= minFontSize) {
        fittedText = candidate;
        fontSize = candidateSize;
        break;
      }
    }
  }

  return { text: fittedText, fontSize: Math.max(3, fontSize * 0.9) };
}

function estimateTextMetrics(text: string): TextMetricsRatio {
  const width = [...text].reduce((total, character) => {
    if (/\s/.test(character)) return total + 0.3;
    if (/[ilIíìïÍ!.,:;'|]/.test(character)) return total + 0.32;
    if (/[mwMW@%&]/.test(character)) return total + 0.82;
    if (/[A-ZÁÉÍÓÚÝÞÆÖÐ]/.test(character)) return total + 0.68;
    if (character === "…") return total + 0.78;
    return total + 0.56;
  }, 0);
  return { width, height: 0.8 };
}
