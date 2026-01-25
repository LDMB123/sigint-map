---
title: Output, Meter, and Progress Elements
category: html
description: Using <output>, <meter>, and <progress> for calculated values, gauges, and progress indicators
tags: [html5, forms, output, meter, progress, accessibility, aria]
---

# Output, Meter, and Progress Skill

## When to Use

- **`<output>`**: Displaying calculation results (price totals, form calculations)
- **`<meter>`**: Showing values within a known range (disk usage, scores, ratings)
- **`<progress>`**: Indicating task completion (file uploads, loading states)
- Form calculations and live updates
- Data visualization without JavaScript libraries
- Accessible progress indicators for assistive technologies

## Required Inputs

- **Element type**: output, meter, or progress
- **Value**: Current value to display
- **Range** (meter/progress): min, max, and optional optimum/low/high
- **Labels**: Visible text and ARIA labels for context
- **Update mechanism**: How value changes (form input, API call, etc.)

## Steps

### Step 1: Use `<output>` for Calculation Results

The `<output>` element displays the result of a calculation or user action:

```html
<form oninput="result.value = parseInt(a.value) + parseInt(b.value)">
  <label>
    First number:
    <input type="number" id="a" name="a" value="0">
  </label>

  <label>
    Second number:
    <input type="number" id="b" name="b" value="0">
  </label>

  <p>
    Result:
    <output name="result" for="a b">0</output>
  </p>
</form>
```

**Key attributes**:
- `for`: Space-separated IDs of elements used in calculation
- `name`: Form submission name (output values can be submitted)
- `form`: Associates output with a form (if not nested)

**More examples**:

```html
<!-- Price calculator -->
<form oninput="total.value = (quantity.value * price.value).toFixed(2)">
  <label>
    Quantity:
    <input type="number" id="quantity" name="quantity" value="1" min="1">
  </label>

  <label>
    Price per unit: $
    <input type="number" id="price" name="price" value="10" step="0.01">
  </label>

  <p>
    Total: $<output name="total" for="quantity price">10.00</output>
  </p>
</form>

<!-- Range slider with output -->
<label>
  Volume:
  <input
    type="range"
    id="volume"
    min="0"
    max="100"
    value="50"
    oninput="volumeOutput.value = this.value"
  >
  <output id="volumeOutput">50</output>%
</label>
```

### Step 2: Use `<meter>` for Values in a Known Range

The `<meter>` element represents a scalar measurement within a known range:

```html
<!-- Basic meter -->
<label>
  Disk usage:
  <meter value="75" min="0" max="100">75%</meter>
</label>

<!-- Meter with low, high, and optimum -->
<label>
  Battery level:
  <meter
    value="60"
    min="0"
    max="100"
    low="20"
    high="80"
    optimum="90"
  >60%</meter>
</label>
```

**Attributes**:
- `value`: Current value (required)
- `min`: Minimum value (default: 0)
- `max`: Maximum value (default: 1)
- `low`: Upper bound of low range
- `high`: Lower bound of high range
- `optimum`: Optimal value (determines coloring)

**Color indicators** (browser-rendered):
- **Green**: Value is in optimal range
- **Yellow**: Value is suboptimal but acceptable
- **Red**: Value is in critical range

```html
<!-- Different meter states -->

<!-- Good: value near optimum -->
<meter value="90" min="0" max="100" optimum="100">90%</meter>

<!-- Warning: value in medium range -->
<meter value="50" min="0" max="100" low="30" high="70" optimum="100">50%</meter>

<!-- Critical: value in low range -->
<meter value="15" min="0" max="100" low="30" optimum="100">15%</meter>
```

**Real-world examples**:

```html
<!-- Storage usage -->
<div class="storage-info">
  <p>
    <strong>Storage:</strong>
    <meter value="24" min="0" max="100" low="75" high="90" optimum="50">
      24 GB of 100 GB used
    </meter>
    24 GB of 100 GB
  </p>
</div>

<!-- Test score -->
<div class="score">
  <p>
    <strong>Score:</strong>
    <meter value="85" min="0" max="100" low="60" high="80" optimum="100">
      85 out of 100
    </meter>
    85/100
  </p>
</div>

<!-- CPU usage -->
<div class="cpu-monitor">
  <label>
    CPU Usage:
    <meter
      id="cpu"
      value="45"
      min="0"
      max="100"
      low="50"
      high="80"
      optimum="30"
    >45%</meter>
  </label>
</div>

<script>
  // Update meter dynamically
  setInterval(() => {
    const cpuMeter = document.getElementById('cpu');
    const newValue = Math.random() * 100;
    cpuMeter.value = newValue;
    cpuMeter.textContent = `${Math.round(newValue)}%`;
  }, 2000);
</script>
```

### Step 3: Use `<progress>` for Task Completion

The `<progress>` element shows completion of a task:

```html
<!-- Determinate progress (known total) -->
<label>
  Upload progress:
  <progress value="70" max="100">70%</progress>
</label>

<!-- Indeterminate progress (unknown total) -->
<label>
  Loading:
  <progress>Loading...</progress>
</label>
```

**Attributes**:
- `value`: Current progress (0 to max)
- `max`: Maximum value (default: 1)
- Omit `value` for indeterminate state (spinner)

**Examples**:

```html
<!-- File upload -->
<div class="upload">
  <label>
    Uploading file:
    <progress id="upload" value="0" max="100">0%</progress>
    <span id="upload-percent">0%</span>
  </label>
</div>

<script>
  let progress = 0;
  const progressBar = document.getElementById('upload');
  const percentText = document.getElementById('upload-percent');

  const interval = setInterval(() => {
    progress += 10;
    progressBar.value = progress;
    percentText.textContent = `${progress}%`;

    if (progress >= 100) {
      clearInterval(interval);
    }
  }, 500);
</script>

<!-- Indeterminate loading -->
<div class="loading">
  <p>
    <progress>Processing...</progress>
    <span>Processing your request...</span>
  </p>
</div>

<!-- Multi-step form progress -->
<div class="form-progress">
  <p>Step 2 of 5</p>
  <progress value="2" max="5">Step 2 of 5</progress>
</div>
```

### Step 4: Add ARIA Attributes for Accessibility

Enhance semantic elements with ARIA for better screen reader support:

```html
<!-- Output with ARIA -->
<form oninput="total.value = (price.value * quantity.value).toFixed(2)">
  <label for="price">Price:</label>
  <input type="number" id="price" value="10">

  <label for="quantity">Quantity:</label>
  <input type="number" id="quantity" value="1">

  <output
    name="total"
    for="price quantity"
    aria-live="polite"
    aria-atomic="true"
  >
    10.00
  </output>
</form>

<!-- Meter with ARIA label -->
<meter
  value="60"
  min="0"
  max="100"
  aria-label="Battery level"
  aria-valuenow="60"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuetext="60 percent battery remaining"
>
  60%
</meter>

<!-- Progress with ARIA -->
<div>
  <label id="upload-label">File upload</label>
  <progress
    value="45"
    max="100"
    aria-labelledby="upload-label"
    aria-valuenow="45"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-valuetext="45 percent complete"
  >
    45%
  </progress>
</div>
```

### Step 5: Style with CSS

Customize appearance while preserving semantics:

```css
/* Output styling */
output {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background: #f0f0f0;
  border-radius: 4px;
  font-weight: bold;
  font-family: monospace;
}

/* Meter styling (limited browser support) */
meter {
  width: 200px;
  height: 20px;
}

/* Webkit browsers (Chrome, Safari) */
meter::-webkit-meter-bar {
  background: #f0f0f0;
  border: 1px solid #ccc;
  border-radius: 4px;
}

meter::-webkit-meter-optimum-value {
  background: #4caf50; /* Green */
}

meter::-webkit-meter-suboptimum-value {
  background: #ff9800; /* Orange */
}

meter::-webkit-meter-even-less-good-value {
  background: #f44336; /* Red */
}

/* Firefox */
meter::-moz-meter-bar {
  background: #4caf50;
}

/* Progress bar styling */
progress {
  width: 100%;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}

/* Webkit (Chrome, Safari) */
progress::-webkit-progress-bar {
  background: #f0f0f0;
  border-radius: 4px;
}

progress::-webkit-progress-value {
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 4px;
  transition: width 0.3s ease;
}

/* Firefox */
progress::-moz-progress-bar {
  background: linear-gradient(90deg, #007bff, #0056b3);
  border-radius: 4px;
}

/* Indeterminate progress animation */
progress:indeterminate {
  background: linear-gradient(
    90deg,
    #f0f0f0 25%,
    #007bff 25%,
    #007bff 50%,
    #f0f0f0 50%,
    #f0f0f0 75%,
    #007bff 75%
  );
  background-size: 40px 100%;
  animation: progress-indeterminate 1s linear infinite;
}

@keyframes progress-indeterminate {
  0% {
    background-position: 0 0;
  }
  100% {
    background-position: 40px 0;
  }
}
```

### Step 6: Handle Dynamic Updates

Update values with JavaScript:

```html
<div class="demo">
  <h3>Download Progress</h3>
  <progress id="download" value="0" max="100">0%</progress>
  <output id="download-percent">0%</output>
  <button id="start-download">Start Download</button>
</div>

<script>
  const downloadProgress = document.getElementById('download');
  const downloadPercent = document.getElementById('download-percent');
  const startBtn = document.getElementById('start-download');

  startBtn.addEventListener('click', () => {
    let progress = 0;
    startBtn.disabled = true;

    const interval = setInterval(() => {
      progress += Math.random() * 15;

      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        startBtn.disabled = false;
      }

      downloadProgress.value = progress;
      downloadPercent.textContent = `${Math.round(progress)}%`;

      // Update ARIA
      downloadProgress.setAttribute('aria-valuenow', Math.round(progress));
      downloadProgress.setAttribute(
        'aria-valuetext',
        `${Math.round(progress)} percent complete`
      );
    }, 200);
  });
</script>
```

### Step 7: Create Accessible Complete Examples

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Form with Output, Meter, Progress</title>
  <style>
    body {
      font-family: system-ui, sans-serif;
      max-width: 600px;
      margin: 2rem auto;
      padding: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    label {
      display: block;
      margin-bottom: 0.25rem;
      font-weight: 500;
    }

    input[type="number"],
    input[type="range"] {
      width: 100%;
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
    }

    output {
      display: inline-block;
      padding: 0.25rem 0.5rem;
      background: #e3f2fd;
      border-radius: 4px;
      font-weight: bold;
    }

    meter,
    progress {
      width: 100%;
      height: 24px;
    }

    .info {
      display: flex;
      justify-content: space-between;
      margin-top: 0.25rem;
      font-size: 0.875rem;
      color: #666;
    }
  </style>
</head>
<body>

<h1>Order Form</h1>

<form>
  <div class="form-group">
    <label for="quantity">Quantity:</label>
    <input
      type="number"
      id="quantity"
      name="quantity"
      value="1"
      min="1"
      max="100"
      oninput="calculateTotal()"
    >
  </div>

  <div class="form-group">
    <label for="price">Price per item: $</label>
    <input
      type="number"
      id="price"
      name="price"
      value="29.99"
      step="0.01"
      min="0"
      oninput="calculateTotal()"
    >
  </div>

  <div class="form-group">
    <label>Total: $<output id="total" for="quantity price">29.99</output></label>
  </div>

  <div class="form-group">
    <label for="discount">Discount: <output id="discount-value">0</output>%</label>
    <input
      type="range"
      id="discount"
      min="0"
      max="50"
      value="0"
      oninput="discount-value.value = this.value; calculateTotal()"
    >
  </div>

  <div class="form-group">
    <label>Stock level:</label>
    <meter
      id="stock"
      value="75"
      min="0"
      max="100"
      low="20"
      high="80"
      optimum="100"
      aria-label="Stock level"
    >75%</meter>
    <div class="info">
      <span>75 units remaining</span>
      <span>Out of 100</span>
    </div>
  </div>

  <div class="form-group">
    <label>Order processing:</label>
    <progress
      id="processing"
      value="0"
      max="100"
      aria-label="Order processing progress"
    >0%</progress>
    <div class="info">
      <span id="status">Ready to submit</span>
      <span id="percent">0%</span>
    </div>
  </div>

  <button type="button" onclick="submitOrder()">Submit Order</button>
</form>

<script>
  function calculateTotal() {
    const quantity = parseFloat(document.getElementById('quantity').value);
    const price = parseFloat(document.getElementById('price').value);
    const discount = parseFloat(document.getElementById('discount').value);

    const subtotal = quantity * price;
    const discountAmount = subtotal * (discount / 100);
    const total = subtotal - discountAmount;

    document.getElementById('total').value = total.toFixed(2);

    // Update stock meter based on quantity
    const stock = document.getElementById('stock');
    const remaining = 100 - quantity;
    stock.value = remaining;
  }

  function submitOrder() {
    const progressBar = document.getElementById('processing');
    const status = document.getElementById('status');
    const percent = document.getElementById('percent');

    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      progressBar.value = progress;
      percent.textContent = `${progress}%`;

      if (progress === 30) {
        status.textContent = 'Validating...';
      } else if (progress === 60) {
        status.textContent = 'Processing payment...';
      } else if (progress === 90) {
        status.textContent = 'Confirming order...';
      } else if (progress === 100) {
        status.textContent = 'Complete!';
        clearInterval(interval);
      }
    }, 300);
  }
</script>

</body>
</html>
```

## Expected Output

- **`<output>`**: Displays live calculation results, updates on input change
- **`<meter>`**: Visual gauge with color indicators (green/yellow/red)
- **`<progress>`**: Progress bar (determinate or indeterminate)
- Screen readers announce values and changes (with ARIA)
- Semantic HTML improves accessibility and SEO
- Browser-native styling with CSS customization options

## Common Mistakes to Avoid

- **Using `<progress>` for meters**: Use `<meter>` for scalar values, `<progress>` for tasks
- **Missing `for` attribute on `<output>`**: Links output to input elements
- **Not providing fallback text**: Content inside element is fallback for old browsers
- **Forgetting `aria-live` on `<output>`**: Screen readers may not announce updates
- **Using wrong `optimum` value on `<meter>`**: Affects color indication
- **Not updating ARIA attributes**: Keep `aria-valuenow` in sync with `value`
- **Excessive CSS customization**: Can break accessibility; test with screen readers

## Comparison Table

| Element | Purpose | Attributes | Color Coding | State |
|---------|---------|------------|--------------|-------|
| `<output>` | Calculation result | `for`, `name` | No | N/A |
| `<meter>` | Scalar measurement | `value`, `min`, `max`, `low`, `high`, `optimum` | Yes (auto) | Determinate |
| `<progress>` | Task completion | `value`, `max` | No | Determinate or indeterminate |

## Browser Support

| Element | Chrome | Edge | Safari | Firefox |
|---------|--------|------|--------|---------|
| `<output>` | ✅ 10+ | ✅ 12+ | ✅ 5.1+ | ✅ 4+ |
| `<meter>` | ✅ 8+ | ✅ 13+ | ✅ 6+ | ✅ 16+ |
| `<progress>` | ✅ 8+ | ✅ 10+ | ✅ 6+ | ✅ 16+ |

## Testing Checklist

- [ ] `<output>` updates when linked inputs change
- [ ] `<meter>` shows correct color for value range
- [ ] `<progress>` animates when indeterminate (no value)
- [ ] Screen reader announces output changes (aria-live)
- [ ] Meter values are within min/max range
- [ ] Progress value is between 0 and max
- [ ] Fallback text is provided inside elements
- [ ] ARIA attributes match current values
- [ ] Visual styling doesn't break accessibility
- [ ] Keyboard users can interact with form controls

## Success Criteria

- Correct semantic element used for each use case
- Values update dynamically with proper ARIA announcements
- Visual indicators match data (color, width)
- Screen readers announce values and changes
- WCAG 2.1 AA: 1.3.1 Info and Relationships (semantic HTML)
- WCAG 2.1 AA: 4.1.2 Name, Role, Value (proper ARIA)
- Native browser rendering with optional CSS customization
