"use client";

import * as THREE from "three";

/** Small canvas-drawn textures (labels, deck covers, drum pattern) so the 3D board needs no image files. */

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d")!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
}

const FONT = '"Arial Black", "Segoe UI Black", system-ui, sans-serif';

/** Coloured strip with a label, e.g. the orange "ION" band on a tile. */
export function stripTexture(label: string, color: string, textColor = "#ffffff") {
  return make(`strip:${label}:${color}`, 512, 96, (g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.fillStyle = textColor;
    g.font = `900 58px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, w / 2, h / 2 + 3);
  });
}

/** Text only, transparent background (corner tile names, the title). */
export function textTexture(lines: { text: string; size: number; color: string }[], w = 1024, h = 256) {
  return make(`text:${lines.map((l) => l.text + l.size + l.color).join("|")}`, w, h, (g) => {
    const total = lines.reduce((a, l) => a + l.size * 1.15, 0);
    let y = (h - total) / 2;
    g.textAlign = "center";
    g.textBaseline = "top";
    for (const l of lines) {
      g.font = `900 ${l.size}px ${FONT}`;
      g.lineWidth = l.size / 7;
      g.strokeStyle = "rgba(20, 8, 60, 0.9)";
      g.strokeText(l.text, w / 2, y);
      g.fillStyle = l.color;
      g.fillText(l.text, w / 2, y);
      y += l.size * 1.15;
    }
  });
}

/** Top of a card deck: deck colour, a little atom emblem and the deck name. */
export function deckTexture(label: string, color: string, textColor: string) {
  return make(`deck:${label}`, 512, 360, (g, w, h) => {
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, color);
    grad.addColorStop(1, shade(color, -0.25));
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(255,255,255,0.7)";
    g.lineWidth = 10;
    g.strokeRect(18, 18, w - 36, h - 36);
    // atom emblem
    g.save();
    g.translate(w / 2, h * 0.38);
    g.strokeStyle = textColor;
    g.lineWidth = 6;
    for (let i = 0; i < 3; i++) {
      g.save();
      g.rotate((i * Math.PI) / 3);
      g.beginPath();
      g.ellipse(0, 0, 70, 24, 0, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
    g.fillStyle = textColor;
    g.beginPath();
    g.arc(0, 0, 14, 0, Math.PI * 2);
    g.fill();
    g.restore();
    g.fillStyle = textColor;
    g.font = `900 64px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText(label, w / 2, h * 0.78);
  });
}

/** The back of a drawn card (what you see as it flips). */
export function cardFaceTexture(color: string) {
  return make(`face:${color}`, 256, 180, (g, w, h) => {
    g.fillStyle = "#fdfbff";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = color;
    g.lineWidth = 14;
    g.strokeRect(10, 10, w - 20, h - 20);
    g.fillStyle = color;
    g.font = `900 80px ${FONT}`;
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("?", w / 2, h / 2 + 4);
  });
}

/** Zig-zag band around the drum. */
export function drumTexture() {
  return make("drum", 512, 128, (g, w, h) => {
    g.fillStyle = "#e8402a";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#ffd21f";
    g.fillRect(0, 0, w, 14);
    g.fillRect(0, h - 14, w, 14);
    const n = 8;
    for (let i = 0; i < n; i++) {
      const x = (i * w) / n;
      g.fillStyle = i % 2 ? "#2fa84f" : "#ffd21f";
      g.beginPath();
      g.moveTo(x, h - 14);
      g.lineTo(x + w / n / 2, 14);
      g.lineTo(x + w / n, h - 14);
      g.closePath();
      g.fill();
    }
  });
}

/** Radiation sign for the GANGGUAN tile. */
export function radiationTexture() {
  return make("radiation", 256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#ffd21f";
    g.beginPath();
    g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a1a1a";
    for (let i = 0; i < 3; i++) {
      const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
      g.beginPath();
      g.moveTo(w / 2, h / 2);
      g.arc(w / 2, h / 2, w * 0.42, a - 0.5, a + 0.5);
      g.closePath();
      g.fill();
    }
    g.fillStyle = "#ffd21f";
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.13, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1a1a1a";
    g.beginPath();
    g.arc(w / 2, h / 2, w * 0.08, 0, Math.PI * 2);
    g.fill();
  });
}

/** Clapperboard stripes for REAKSI. */
export function clapperTexture() {
  return make("clapper", 256, 64, (g, w, h) => {
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#1a1a1a";
    for (let x = -h; x < w; x += 44) {
      g.beginPath();
      g.moveTo(x, h);
      g.lineTo(x + 22, h);
      g.lineTo(x + 22 + h, 0);
      g.lineTo(x + h, 0);
      g.closePath();
      g.fill();
    }
  });
}

/** Soft purple-blue glow for the middle of the board. */
export function centerTexture() {
  return make("center", 512, 320, (g, w, h) => {
    const grad = g.createRadialGradient(w / 2, h * 0.4, 10, w / 2, h / 2, w * 0.6);
    grad.addColorStop(0, "#6f7bff");
    grad.addColorStop(0.5, "#4a3fc0");
    grad.addColorStop(1, "#2a1a78");
    g.fillStyle = grad;
    g.fillRect(0, 0, w, h);
    // a few stars
    for (let i = 0; i < 70; i++) {
      g.fillStyle = `rgba(255,255,255,${Math.random() * 0.6 + 0.2})`;
      g.beginPath();
      g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.6 + 0.4, 0, Math.PI * 2);
      g.fill();
    }
  });
}

function shade(hex: string, amt: number) {
  const n = parseInt(hex.slice(1), 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + c * amt)));
  return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
}
