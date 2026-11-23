"use client";

import { useEffect, useRef, useState } from "react";
import { CATEGORIES, inCategory, type FeedCategory, type FeedItem } from "@/lib/feed-types";
import { Icon } from "@/components/shared/Icon";
import styles from "./Randomizer.module.css";

type Phase = "menu" | "spinning-category" | "category-selected" | "spinning-item";
type Mode = "category" | "item";
type WheelOption = { id: string; label: string };

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

  const categories = CATEGORIES.map((candidate) => ({ id: candidate.id, label: candidate.label }));
  const itemCategories = categories.filter((candidate) =>
    items.some((item) => inCategory(item, candidate.id)),
  );
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
              <button type="button" onClick={() => start("category")}>
                <Icon name="dice" />
                Flokkur
              </button>
              <button type="button" onClick={() => start("item")} disabled={!itemCategories.length}>
                <Icon name="dice" />
                Hlutur
              </button>
            </div>
            {itemCategories.length === 0 && <p className={styles.hint}>Ekkert passar við núverandi val.</p>}
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
          const label = fitWheelLabel(segment.option.label, (slice * Math.PI) / 180, labelRadius, 30);
          return (
            <g key={segment.option.id}>
              <path d={segment.path} fill={segment.color} stroke="white" strokeWidth="2" />
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
        <circle cx="200" cy="200" r="20" className={styles.hub} />
      </svg>
    </div>
  );
}

const COLORS = ["#ef6a62", "#f7c858", "#61b99c", "#62a7d8", "#a57ac8", "#eb82a2", "#e8914f"];

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
          ? "M 200 200 m -190 0 a 190 190 0 1 0 380 0 a 190 190 0 1 0 -380 0"
          : `M 200 200 L ${startPoint.x} ${startPoint.y} A 190 190 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`,
    };
  });
}

function pointAt(angle: number) {
  const radians = (angle * Math.PI) / 180;
  return { x: 200 + Math.cos(radians) * 190, y: 200 + Math.sin(radians) * 190 };
}

function fitWheelLabel(text: string, angle: number, outerRadius: number, innerRadius: number) {
  const maxFontSize = 32;
  const minFontSize = 5;
  const availableLength = outerRadius - innerRadius;
  const fontSizeFor = (candidate: string) => {
    const width = estimateTextWidth(candidate);
    const radialLimit = availableLength / width;
    const safety = 0.78;
    const sliceLimit = (outerRadius * angle * safety) / (1 + width * angle * safety);
    return Math.min(maxFontSize, radialLimit, sliceLimit);
  };

  let fittedText = text;
  let fontSize = fontSizeFor(fittedText);
  if (fontSize < minFontSize) {
    for (let length = text.length - 1; length > 0; length--) {
      const candidate = `${text.slice(0, length).trimEnd()}…`;
      const candidateSize = fontSizeFor(candidate);
      if (candidateSize >= minFontSize) {
        fittedText = candidate;
        fontSize = candidateSize;
        break;
      }
    }
  }

  return { text: fittedText, fontSize: Math.max(3, fontSize) };
}

function estimateTextWidth(text: string): number {
  return [...text].reduce((width, character) => {
    if (/\s/.test(character)) return width + 0.3;
    if (/[ilIíìïÍ!.,:;'|]/.test(character)) return width + 0.32;
    if (/[mwMW@%&]/.test(character)) return width + 0.82;
    if (/[A-ZÁÉÍÓÚÝÞÆÖÐ]/.test(character)) return width + 0.68;
    if (character === "…") return width + 0.78;
    return width + 0.56;
  }, 0);
}
