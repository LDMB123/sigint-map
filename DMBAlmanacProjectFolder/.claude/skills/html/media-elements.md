---
name: media-elements
description: Implement native HTML5 video, audio, and responsive image elements
trigger: /media
used_by: [full-stack-developer, senior-frontend-engineer, performance-engineer]
tags: [html5, media, images, video, audio, performance, responsive]
---

# Native HTML5 Media Elements

Implement native `<video>`, `<audio>`, and `<picture>` elements for accessible, performant media delivery.

## When to Use

### Video (`<video>`)
- Video content, tutorials, demos
- Background videos
- Video players (no external library needed)
- Replacing YouTube embeds (self-hosted)

### Audio (`<audio>`)
- Podcasts, music players
- Sound effects, ambient audio
- Voiceovers, narration

### Picture (`<picture>` + `<img>`)
- Art direction (different crops for mobile/desktop)
- Format fallbacks (WebP → JPEG)
- Responsive images (different sizes for different screens)

## Browser Support

All modern browsers support:
- `<video>`: Chrome, Safari, Firefox, Edge
- `<audio>`: Chrome, Safari, Firefox, Edge
- `<picture>`: Chrome 38+, Safari 9.1+, Firefox 38+, Edge 13+
- `srcset`/`sizes`: Universal support

## Video Element

### Basic Video Implementation

```html
<video
  src="video.mp4"
  controls
  poster="thumbnail.jpg"
  width="640"
  height="360"
  preload="metadata"
>
  <track
    kind="subtitles"
    src="subtitles-en.vtt"
    srclang="en"
    label="English"
    default
  />
  <p>Your browser doesn't support HTML5 video. <a href="video.mp4">Download the video</a>.</p>
</video>
```

### Video with Multiple Formats

```html
<video
  controls
  poster="poster.jpg"
  width="1920"
  height="1080"
  preload="metadata"
  playsinline
  muted
  loop
>
  <!-- MP4 (most compatible) -->
  <source src="video.mp4" type="video/mp4" />

  <!-- WebM (better compression) -->
  <source src="video.webm" type="video/webm" />

  <!-- Subtitles -->
  <track
    kind="subtitles"
    src="subtitles-en.vtt"
    srclang="en"
    label="English"
    default
  />
  <track
    kind="subtitles"
    src="subtitles-es.vtt"
    srclang="es"
    label="Español"
  />

  <!-- Fallback for old browsers -->
  <p>Your browser doesn't support HTML5 video. <a href="video.mp4">Download the video</a>.</p>
</video>
```

### Video Attributes

| Attribute | Purpose | Example |
|-----------|---------|---------|
| `controls` | Show playback controls | `<video controls>` |
| `autoplay` | Auto-play (muted required for most browsers) | `<video autoplay muted>` |
| `loop` | Loop video | `<video loop>` |
| `muted` | Mute audio | `<video muted>` |
| `poster` | Thumbnail before play | `poster="thumb.jpg"` |
| `preload` | Preload strategy | `preload="metadata"` |
| `playsinline` | Play inline on iOS (no fullscreen) | `<video playsinline>` |
| `width` / `height` | Dimensions (prevents layout shift) | `width="640" height="360"` |

### Preload Options

- `preload="none"`: Don't preload anything (save bandwidth)
- `preload="metadata"`: Preload metadata only (duration, dimensions)
- `preload="auto"`: Preload entire video (use sparingly)

### Background Video Example

```html
<section class="hero">
  <video
    class="hero-video"
    autoplay
    muted
    loop
    playsinline
    poster="hero-poster.jpg"
  >
    <source src="hero-video.mp4" type="video/mp4" />
    <source src="hero-video.webm" type="video/webm" />
  </video>
  <div class="hero-content">
    <h1>Welcome</h1>
  </div>
</section>

<style>
  .hero {
    position: relative;
    width: 100%;
    height: 100vh;
    overflow: hidden;
  }

  .hero-video {
    position: absolute;
    top: 50%;
    left: 50%;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    transform: translate(-50%, -50%);
    z-index: -1;
    object-fit: cover;
  }

  .hero-content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: white;
    text-align: center;
  }
</style>
```

## Audio Element

### Basic Audio Implementation

```html
<audio controls preload="metadata">
  <source src="podcast.mp3" type="audio/mpeg" />
  <source src="podcast.ogg" type="audio/ogg" />
  <p>Your browser doesn't support HTML5 audio. <a href="podcast.mp3">Download the audio</a>.</p>
</audio>
```

### Audio with Custom Controls

```html
<div class="audio-player">
  <audio id="my-audio" preload="metadata">
    <source src="song.mp3" type="audio/mpeg" />
  </audio>

  <button id="play-pause">Play</button>
  <input type="range" id="seek" min="0" max="100" value="0" />
  <span id="time">0:00 / 0:00</span>
  <input type="range" id="volume" min="0" max="100" value="100" />
</div>

<script>
  const audio = document.getElementById('my-audio');
  const playPauseBtn = document.getElementById('play-pause');
  const seekBar = document.getElementById('seek');
  const timeDisplay = document.getElementById('time');
  const volumeBar = document.getElementById('volume');

  // Play/Pause
  playPauseBtn.addEventListener('click', () => {
    if (audio.paused) {
      audio.play();
      playPauseBtn.textContent = 'Pause';
    } else {
      audio.pause();
      playPauseBtn.textContent = 'Play';
    }
  });

  // Update seek bar as audio plays
  audio.addEventListener('timeupdate', () => {
    const percent = (audio.currentTime / audio.duration) * 100;
    seekBar.value = percent;

    const current = formatTime(audio.currentTime);
    const total = formatTime(audio.duration);
    timeDisplay.textContent = `${current} / ${total}`;
  });

  // Seek when user drags
  seekBar.addEventListener('input', () => {
    const time = (seekBar.value / 100) * audio.duration;
    audio.currentTime = time;
  });

  // Volume control
  volumeBar.addEventListener('input', () => {
    audio.volume = volumeBar.value / 100;
  });

  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
</script>
```

## Responsive Images with `<picture>`

### Art Direction (Different Images for Different Screens)

```html
<picture>
  <!-- Mobile: Cropped portrait -->
  <source
    media="(max-width: 767px)"
    srcset="hero-mobile.jpg"
  />

  <!-- Tablet: Landscape crop -->
  <source
    media="(max-width: 1023px)"
    srcset="hero-tablet.jpg"
  />

  <!-- Desktop: Full landscape -->
  <source
    media="(min-width: 1024px)"
    srcset="hero-desktop.jpg"
  />

  <!-- Fallback image -->
  <img
    src="hero-desktop.jpg"
    alt="Hero image description"
    loading="lazy"
    width="1920"
    height="1080"
  />
</picture>
```

### Format Fallback (WebP → JPEG)

```html
<picture>
  <!-- Modern browsers: WebP -->
  <source srcset="image.webp" type="image/webp" />

  <!-- Fallback: JPEG -->
  <img
    src="image.jpg"
    alt="Image description"
    loading="lazy"
    width="800"
    height="600"
  />
</picture>
```

### Responsive Sizes with `srcset` and `sizes`

```html
<img
  src="image-800w.jpg"
  srcset="
    image-400w.jpg 400w,
    image-800w.jpg 800w,
    image-1200w.jpg 1200w,
    image-1600w.jpg 1600w
  "
  sizes="
    (max-width: 767px) 100vw,
    (max-width: 1023px) 50vw,
    800px
  "
  alt="Responsive image"
  loading="lazy"
  width="800"
  height="600"
/>
```

**How it works:**
- Browser picks the best image based on screen width and pixel density
- `srcset`: Available image sizes (400w = 400px wide)
- `sizes`: How wide the image will display
  - On mobile (max-width: 767px): full viewport width (100vw)
  - On tablet (max-width: 1023px): half viewport (50vw)
  - On desktop: fixed 800px

### Complete Responsive Picture Example

```html
<picture>
  <!-- High-DPI desktop: WebP -->
  <source
    media="(min-width: 1024px)"
    srcset="
      desktop-1x.webp 1x,
      desktop-2x.webp 2x
    "
    type="image/webp"
  />

  <!-- High-DPI desktop: JPEG fallback -->
  <source
    media="(min-width: 1024px)"
    srcset="
      desktop-1x.jpg 1x,
      desktop-2x.jpg 2x
    "
    type="image/jpeg"
  />

  <!-- Tablet: WebP -->
  <source
    media="(min-width: 768px)"
    srcset="
      tablet-1x.webp 1x,
      tablet-2x.webp 2x
    "
    type="image/webp"
  />

  <!-- Tablet: JPEG fallback -->
  <source
    media="(min-width: 768px)"
    srcset="
      tablet-1x.jpg 1x,
      tablet-2x.jpg 2x
    "
    type="image/jpeg"
  />

  <!-- Mobile: WebP -->
  <source
    srcset="
      mobile-1x.webp 1x,
      mobile-2x.webp 2x
    "
    type="image/webp"
  />

  <!-- Fallback for all scenarios -->
  <img
    src="mobile-1x.jpg"
    alt="Product image"
    loading="lazy"
    width="800"
    height="600"
  />
</picture>
```

## Performance Attributes

### Lazy Loading

```html
<!-- Lazy load images below the fold -->
<img src="image.jpg" alt="..." loading="lazy" />

<!-- Eager load above-the-fold images (default) -->
<img src="hero.jpg" alt="..." loading="eager" />

<!-- Auto: Let browser decide (default) -->
<img src="image.jpg" alt="..." loading="auto" />
```

### Priority Hints

```html
<!-- High priority (LCP image) -->
<img
  src="hero.jpg"
  alt="Hero image"
  fetchpriority="high"
  loading="eager"
/>

<!-- Low priority (below fold) -->
<img
  src="footer-logo.jpg"
  alt="Logo"
  fetchpriority="low"
  loading="lazy"
/>

<!-- Auto priority (default) -->
<img src="image.jpg" alt="..." fetchpriority="auto" />
```

### Prevent Layout Shift

Always specify width and height:

```html
<!-- GOOD: Width and height prevent CLS -->
<img
  src="image.jpg"
  alt="..."
  width="800"
  height="600"
  loading="lazy"
/>

<!-- BAD: No dimensions = layout shift -->
<img src="image.jpg" alt="..." loading="lazy" />
```

CSS aspect ratio (modern approach):

```html
<img
  src="image.jpg"
  alt="..."
  style="aspect-ratio: 16 / 9; width: 100%; height: auto;"
  loading="lazy"
/>
```

## Accessibility

### Video Accessibility

```html
<video controls>
  <source src="video.mp4" type="video/mp4" />

  <!-- Subtitles for deaf/hard-of-hearing -->
  <track
    kind="subtitles"
    src="subtitles-en.vtt"
    srclang="en"
    label="English"
    default
  />

  <!-- Captions (includes sound effects, music cues) -->
  <track
    kind="captions"
    src="captions-en.vtt"
    srclang="en"
    label="English Captions"
  />

  <!-- Audio description for blind users -->
  <track
    kind="descriptions"
    src="descriptions-en.vtt"
    srclang="en"
    label="Audio Descriptions"
  />

  <!-- Fallback text -->
  <p>Video: Product demonstration. <a href="video.mp4">Download video</a>.</p>
</video>
```

### Image Accessibility

```html
<!-- Meaningful images: descriptive alt text -->
<img
  src="sunset.jpg"
  alt="Orange and pink sunset over mountain range"
/>

<!-- Decorative images: empty alt -->
<img src="decorative-border.svg" alt="" role="presentation" />

<!-- Complex images: use figure and figcaption -->
<figure>
  <img
    src="chart.png"
    alt="Bar chart showing sales growth"
    width="800"
    height="600"
  />
  <figcaption>
    Sales increased 35% in Q4 2025, from $2M to $2.7M.
  </figcaption>
</figure>
```

## WebVTT Subtitles Format

```
WEBVTT

00:00:00.000 --> 00:00:05.000
Welcome to our product demo.

00:00:05.000 --> 00:00:10.000
First, let's look at the main features.

00:00:10.000 --> 00:00:15.000
You can customize everything in the settings panel.
```

## React Implementation

```tsx
import * as React from "react";

export function ResponsiveImage({
  src,
  alt,
  width,
  height,
  sources = [],
  loading = "lazy",
  fetchpriority,
  className
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  sources?: Array<{ srcset: string; media?: string; type?: string }>;
  loading?: "lazy" | "eager";
  fetchpriority?: "high" | "low" | "auto";
  className?: string;
}) {
  return (
    <picture>
      {sources.map((source, i) => (
        <source
          key={i}
          srcSet={source.srcset}
          media={source.media}
          type={source.type}
        />
      ))}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        fetchpriority={fetchpriority}
        className={className}
      />
    </picture>
  );
}

// Usage
<ResponsiveImage
  src="image.jpg"
  alt="Product image"
  width={800}
  height={600}
  sources={[
    { srcset: "image.webp", type: "image/webp" },
    { srcset: "image-mobile.jpg", media: "(max-width: 767px)" }
  ]}
  loading="lazy"
  fetchpriority="low"
/>
```

## Performance Best Practices

1. **Use WebP** with JPEG/PNG fallback
2. **Lazy load** images below the fold
3. **Specify dimensions** to prevent layout shift
4. **Use `fetchpriority="high"`** for LCP images
5. **Compress videos** (use H.264/MP4 for compatibility)
6. **Use `poster`** for videos (visible before playback)
7. **Avoid autoplay** with sound (most browsers block it)
8. **Use `preload="metadata"`** for videos (not full video)

## Video Optimization Tips

```bash
# Convert to MP4 (H.264)
ffmpeg -i input.mov -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4

# Convert to WebM (VP9)
ffmpeg -i input.mov -c:v libvpx-vp9 -crf 30 -b:v 0 -c:a libopus output.webm

# Create poster image from video
ffmpeg -i video.mp4 -ss 00:00:01 -vframes 1 poster.jpg
```

## Success Criteria

- [ ] Video/audio has controls (or custom controls)
- [ ] Video has poster image
- [ ] Multiple formats provided (MP4 + WebM)
- [ ] Subtitles provided for videos
- [ ] Images have alt text
- [ ] Images have width/height to prevent CLS
- [ ] Below-fold images use `loading="lazy"`
- [ ] LCP image uses `fetchpriority="high"`
- [ ] Responsive images use `srcset`/`sizes` or `<picture>`
- [ ] WebP format used with fallback

## References

- [MDN: Video Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video)
- [MDN: Audio Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/audio)
- [MDN: Picture Element](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/picture)
- [MDN: Responsive Images](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images)
- [Web.dev: Optimize Images](https://web.dev/fast/#optimize-your-images)
- [WebVTT Format](https://developer.mozilla.org/en-US/docs/Web/API/WebVTT_API)
