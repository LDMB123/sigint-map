---
title: EyeDropper API
category: Web APIs
tags: [color, picker, ui, chromium143+]
description: Pick colors from screen with native eyedropper interface
version: 1.0
browser_support: "Chromium 143+ baseline"
---

# EyeDropper API

Enables web applications to access the browser's native color picker to sample colors from anywhere on the screen.

## When to Use

- **Color picker tools** — Design and image editing apps
- **Theme customization** — Pick colors from images
- **Accessibility tools** — Color analysis and contrast checkers
- **Photo editors** — Sample colors from images
- **Design systems** — Extract brand colors
- **Color blindness tools** — Color contrast verification

## Core Concepts

```typescript
interface EyeDropper {
  open(options?: EyeDropperOpenOptions): Promise<ColorSelectionResult>;
}

interface EyeDropperOpenOptions {
  signal?: AbortSignal;
}

interface ColorSelectionResult {
  sRGBHex: string;  // #RRGGBB format
}
```

## Basic Usage

### Open Color Picker

```typescript
async function pickColor(): Promise<string> {
  const eyeDropper = new EyeDropper();

  try {
    const result = await eyeDropper.open();
    console.log('Selected color:', result.sRGBHex);
    return result.sRGBHex;
  } catch (error) {
    console.error('Color picker error:', error);
    throw error;
  }
}

// Usage
const color = await pickColor();
console.log('Color hex:', color);  // e.g., "#ff5500"
```

### Set Input Value

```typescript
async function pickColorForInput(inputElement: HTMLInputElement): Promise<void> {
  const eyeDropper = new EyeDropper();

  try {
    const result = await eyeDropper.open();
    inputElement.value = result.sRGBHex;

    // Trigger input event for reactive forms
    inputElement.dispatchEvent(new Event('input', { bubbles: true }));
  } catch (error) {
    console.error('Color picker cancelled or error:', error);
  }
}

// Usage
const input = document.querySelector<HTMLInputElement>('input[type="color"]');
if (input) {
  await pickColorForInput(input);
}
```

## Real-World Examples

### Color Picker Component

```typescript
class ColorPickerComponent {
  private container: HTMLElement;
  private colorInput: HTMLInputElement;
  private eyeDropperButton: HTMLButtonElement;
  private colorPreview: HTMLElement;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId) as HTMLElement;

    // Create elements
    this.colorInput = document.createElement('input');
    this.colorInput.type = 'color';
    this.colorInput.value = '#000000';

    this.eyeDropperButton = document.createElement('button');
    this.eyeDropperButton.textContent = 'Pick Color';
    this.eyeDropperButton.type = 'button';

    this.colorPreview = document.createElement('div');
    this.colorPreview.style.width = '40px';
    this.colorPreview.style.height = '40px';
    this.colorPreview.style.borderRadius = '4px';
    this.colorPreview.style.border = '1px solid #ccc';
    this.colorPreview.style.backgroundColor = '#000000';

    // Assemble
    this.container.appendChild(this.colorInput);
    this.container.appendChild(this.eyeDropperButton);
    this.container.appendChild(this.colorPreview);

    // Setup event listeners
    this.colorInput.addEventListener('input', (e) => {
      const value = (e.target as HTMLInputElement).value;
      this.updatePreview(value);
    });

    this.eyeDropperButton.addEventListener('click', () => {
      this.pickFromScreen();
    });

    // Check if EyeDropper supported
    if (!('EyeDropper' in window)) {
      this.eyeDropperButton.disabled = true;
      this.eyeDropperButton.textContent = 'Pick Color (not supported)';
    }

    this.updatePreview('#000000');
  }

  private updatePreview(color: string): void {
    this.colorPreview.style.backgroundColor = color;
    this.colorInput.value = color;
  }

  private async pickFromScreen(): Promise<void> {
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      this.updatePreview(result.sRGBHex);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Color picker cancelled');
      } else {
        console.error('Color picker error:', error);
      }
    }
  }

  getColor(): string {
    return this.colorInput.value;
  }

  setColor(color: string): void {
    this.updatePreview(color);
  }
}

// Usage
const picker = new ColorPickerComponent('color-picker-container');
console.log('Selected color:', picker.getColor());
```

### Theme Customization

```typescript
class ThemeCustomizer {
  private themeColors: Map<string, string> = new Map();
  private previewElement: HTMLElement;

  constructor(previewSelector: string) {
    this.previewElement = document.querySelector(
      previewSelector
    ) as HTMLElement;
  }

  async pickThemeColor(role: 'primary' | 'secondary' | 'accent'): Promise<void> {
    try {
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();

      this.themeColors.set(role, result.sRGBHex);

      // Update CSS custom properties
      const cssVar = `--color-${role}`;
      document.documentElement.style.setProperty(cssVar, result.sRGBHex);

      console.log(`Set ${role} color to ${result.sRGBHex}`);

      this.updatePreview();
    } catch (error) {
      console.error('Color picker error:', error);
    }
  }

  private updatePreview(): void {
    // Update preview with new theme colors
    const html = this.themeColors.entries()
      .map(([role, color]) => `<div style="background: ${color}; padding: 10px;">${role}</div>`)
      .join('');

    this.previewElement.innerHTML = html;
  }

  exportTheme(): object {
    return Object.fromEntries(this.themeColors);
  }
}

// Usage
const customizer = new ThemeCustomizer('#theme-preview');

document.querySelector('button.pick-primary')?.addEventListener('click', () => {
  customizer.pickThemeColor('primary');
});

document.querySelector('button.pick-secondary')?.addEventListener('click', () => {
  customizer.pickThemeColor('secondary');
});

document.querySelector('button.export')?.addEventListener('click', () => {
  const theme = customizer.exportTheme();
  console.log('Exported theme:', theme);
});
```

### Color Accessibility Analyzer

```typescript
class ColorAccessibilityAnalyzer {
  async analyzeScreenColor(): Promise<{
    color: string;
    luminance: number;
    contrastRatio: (background: string) => number;
  }> {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();
    const color = result.sRGBHex;

    const luminance = this.getLuminance(color);

    return {
      color,
      luminance,
      contrastRatio: (background: string) => {
        const bgLuminance = this.getLuminance(background);
        return this.getContrastRatio(luminance, bgLuminance);
      }
    };
  }

  private getLuminance(hexColor: string): number {
    const rgb = this.hexToRgb(hexColor);

    // sRGB to linear RGB
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    // Relative luminance
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  private getContrastRatio(lum1: number, lum2: number): number {
    const lighter = Math.max(lum1, lum2);
    const darker = Math.min(lum1, lum2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const cleanHex = hex.replace('#', '');
    return {
      r: parseInt(cleanHex.substr(0, 2), 16),
      g: parseInt(cleanHex.substr(2, 2), 16),
      b: parseInt(cleanHex.substr(4, 2), 16)
    };
  }

  isAccessible(contrastRatio: number, level: 'AA' | 'AAA' = 'AA'): boolean {
    const minimumRatio = level === 'AA' ? 4.5 : 7;
    return contrastRatio >= minimumRatio;
  }
}

// Usage
const analyzer = new ColorAccessibilityAnalyzer();

async function checkColorContrast(): Promise<void> {
  const analysis = await analyzer.analyzeScreenColor();

  const contrastWithWhite = analysis.contrastRatio('#ffffff');
  const contrastWithBlack = analysis.contrastRatio('#000000');

  console.log(`Color: ${analysis.color}`);
  console.log(`Contrast with white: ${contrastWithWhite.toFixed(2)}`);
  console.log(`Contrast with black: ${contrastWithBlack.toFixed(2)}`);

  console.log(`WCAG AA (4.5:1) with white: ${analyzer.isAccessible(contrastWithWhite, 'AA') ? 'PASS' : 'FAIL'}`);
  console.log(`WCAG AA (4.5:1) with black: ${analyzer.isAccessible(contrastWithBlack, 'AA') ? 'PASS' : 'FAIL'}`);
}

await checkColorContrast();
```

## With Abort Signal

```typescript
async function pickColorWithTimeout(): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);  // 10 second timeout

  try {
    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open({ signal: controller.signal });
    return result.sRGBHex;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.log('Color picker timeout or cancelled');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Usage
try {
  const color = await pickColorWithTimeout();
  console.log('Selected color:', color);
} catch {
  console.log('Failed to pick color');
}
```

## Feature Detection

```typescript
function isEyeDropperSupported(): boolean {
  return 'EyeDropper' in window;
}

async function pickColorWithFallback(): Promise<string> {
  if (!isEyeDropperSupported()) {
    // Fallback to standard color input
    const input = document.createElement('input');
    input.type = 'color';

    return new Promise((resolve) => {
      input.addEventListener('change', () => {
        resolve(input.value);
      });

      input.click();
    });
  }

  const eyeDropper = new EyeDropper();
  const result = await eyeDropper.open();
  return result.sRGBHex;
}

// Usage
const color = await pickColorWithFallback();
console.log('Selected color:', color);
```

## Error Handling

```typescript
async function robustColorPicker(): Promise<string | null> {
  try {
    if (!isEyeDropperSupported()) {
      console.log('EyeDropper not supported');
      return null;
    }

    const eyeDropper = new EyeDropper();
    const result = await eyeDropper.open();

    return result.sRGBHex;
  } catch (error) {
    if (error instanceof DOMException) {
      switch (error.name) {
        case 'AbortError':
          console.log('User cancelled color picker');
          break;
        case 'NotAllowedError':
          console.log('Permission denied');
          break;
        default:
          console.error('Color picker error:', error.message);
      }
    }
    return null;
  }
}

// Usage
const color = await robustColorPicker();
if (color) {
  console.log('Selected:', color);
}
```

## Browser Support

**Chromium 143+ baseline** — EyeDropper API is fully supported on all major platforms (Windows, macOS, Linux, ChromeOS, Android).

The API returns colors in sRGB hex format (#RRGGBB). For advanced color manipulation, convert to other formats:

```typescript
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = hex.replace('#', '');
  return {
    r: parseInt(cleanHex.substr(0, 2), 16),
    g: parseInt(cleanHex.substr(2, 2), 16),
    b: parseInt(cleanHex.substr(4, 2), 16)
  };
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const { r, g, b } = hexToRgb(hex);
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
    case gNorm: h = (bNorm - rNorm) / d + 2; break;
    case bNorm: h = (rNorm - gNorm) / d + 4; break;
  }
  h /= 6;

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
```

## Related APIs

- **Color Picker Input** — Standard HTML color input (comparison)
- **Canvas API** — Get pixel data programmatically
- **Web Accessibility API** — Color contrast checking
- **CSS Color Module** — Color manipulation
