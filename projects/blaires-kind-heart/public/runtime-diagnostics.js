(function bootstrapBkhRuntimeDiagnostics(globalScope) {
  if (!globalScope || globalScope.__BKH_RUNTIME_DIAGNOSTICS__) {
    return;
  }

  var MAX_STORED_EVENTS = 250;
  var runtimeEvents = [];
  var installedScopes = Object.create(null);

  function toNumber(value, fallback) {
    var numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function toIsoTimestamp(timestampMs) {
    try {
      return new Date(timestampMs).toISOString();
    } catch (_error) {
      return null;
    }
  }

  function safeJson(value) {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(value);
    }
  }

  function describeError(value) {
    if (value instanceof Error) {
      return {
        name: value.name || "Error",
        message: value.message || String(value),
        stack: value.stack || null,
      };
    }

    if (typeof value === "string") {
      return {
        name: "Error",
        message: value,
        stack: null,
      };
    }

    var stringified = safeJson(value);
    return {
      name: "Error",
      message: stringified,
      stack: null,
    };
  }

  function describeTarget(target) {
    if (!target || typeof target !== "object") {
      return null;
    }

    var tagName = typeof target.tagName === "string" ? target.tagName.toLowerCase() : null;
    var id = typeof target.id === "string" && target.id.length > 0 ? target.id : null;
    var className = null;
    if (typeof target.className === "string" && target.className.length > 0) {
      className = target.className.split(/\s+/).filter(Boolean).slice(0, 4).join(".");
    }

    if (!tagName && !id && !className) {
      return null;
    }

    return {
      tagName: tagName,
      id: id,
      className: className,
    };
  }

  function getLocationHref() {
    try {
      return globalScope.location && globalScope.location.href
        ? String(globalScope.location.href)
        : null;
    } catch (_error) {
      return null;
    }
  }

  function collectNativeCapabilities() {
    try {
      var nav = globalScope.navigator || null;
      var storage = nav && nav.storage ? nav.storage : null;

      return {
        performanceObserver: typeof globalScope.PerformanceObserver === "function",
        performanceEvent: supportsObserverType("event"),
        performanceLoaf: supportsObserverType("long-animation-frame"),
        storageGetDirectory: !!storage && typeof storage.getDirectory === "function",
        fileSystemSyncAccessHandle:
          typeof globalScope.FileSystemSyncAccessHandle !== "undefined",
        serviceWorker: !!(nav && nav.serviceWorker),
        webLocks: !!(nav && nav.locks),
        webGpu: !!(nav && nav.gpu),
        trustedTypes: !!globalScope.trustedTypes,
        navigationApi: typeof globalScope.navigation !== "undefined",
      };
    } catch (_error) {
      return null;
    }
  }

  function nextEventId() {
    var logContext = globalScope.__BKH_LOG_CONTEXT;
    if (logContext && typeof logContext.nextEventId === "function") {
      try {
        return String(logContext.nextEventId());
      } catch (_error) {
        return null;
      }
    }
    return null;
  }

  function pushRuntimeEvent(event) {
    runtimeEvents.push(event);
    // Trim when 25% over capacity — single slice instead of frequent splice(0,N)
    if (runtimeEvents.length > MAX_STORED_EVENTS + (MAX_STORED_EVENTS >> 2)) {
      runtimeEvents = runtimeEvents.slice(-MAX_STORED_EVENTS);
    }
    return event;
  }

  function writeLog(level, text) {
    var consoleRef = globalScope.console;
    if (!consoleRef) {
      return;
    }

    var logger = consoleRef[level];
    if (typeof logger !== "function") {
      logger = consoleRef.log;
    }
    if (typeof logger !== "function") {
      return;
    }
    logger.call(consoleRef, text);
  }

  function createBaseEvent(scope, kind) {
    var timestampMs = Date.now();
    return {
      scope: scope,
      kind: kind,
      timestampMs: timestampMs,
      timestampIso: toIsoTimestamp(timestampMs),
      sessionId: globalScope.__BKH_LOG_SESSION_ID || null,
      eventId: nextEventId(),
      href: getLocationHref(),
    };
  }

  function record(scope, kind, details, level) {
    var payload = Object.assign(createBaseEvent(scope, kind), details || {});
    pushRuntimeEvent(payload);
    writeLog(level || "info", "[diag:" + scope + "] " + kind + " " + safeJson(payload));
    return payload;
  }

  function supportsObserverType(type) {
    if (typeof globalScope.PerformanceObserver !== "function") {
      return false;
    }
    var supported = globalScope.PerformanceObserver.supportedEntryTypes;
    return Array.isArray(supported) && supported.indexOf(type) >= 0;
  }

  function installErrorHandlers(scope) {
    globalScope.addEventListener("error", function onGlobalError(event) {
      var normalized = describeError(event && event.error ? event.error : event);
      var filename = event && event.filename ? String(event.filename) : null;
      var lineno = event && Number.isFinite(event.lineno) ? Number(event.lineno) : null;
      var colno = event && Number.isFinite(event.colno) ? Number(event.colno) : null;
      var location = filename ? filename + ":" + (lineno || 0) + ":" + (colno || 0) : "unknown";

      record(
        scope,
        "error",
        {
          message:
            event && typeof event.message === "string" && event.message.length > 0
              ? event.message
              : normalized.message,
          errorName: normalized.name,
          stack: normalized.stack,
          location: location,
          filename: filename,
          lineno: lineno,
          colno: colno,
        },
        "error",
      );
    });

    globalScope.addEventListener("unhandledrejection", function onUnhandledRejection(event) {
      var normalized = describeError(event ? event.reason : null);
      record(
        scope,
        "rejection",
        {
          message: normalized.message,
          errorName: normalized.name,
          stack: normalized.stack,
        },
        "error",
      );
    });
  }

  function installInpObserver(scope, options) {
    var thresholdMs = toNumber(options.inpDurationThresholdMs, 40);
    var severeMs = toNumber(options.severeInpMs, 200);
    var supported = supportsObserverType("event");

    record(
      scope,
      "inp-observer",
      {
        enabled: true,
        supported: supported,
        thresholdMs: thresholdMs,
        severeMs: severeMs,
      },
      supported ? "info" : "warn",
    );

    if (!supported) {
      return;
    }

    // Rate limiter: max 10 logged INP events per 10s window
    var INP_RATE_WINDOW_MS = 10000;
    var INP_RATE_MAX = 10;
    var inpLogTimestamps = [];
    var inpLogStart = 0; // index-based pruning avoids O(n) shift()
    var inpSuppressedCount = 0;

    try {
      var observer = new globalScope.PerformanceObserver(function onInpEntries(list) {
        var entries = typeof list.getEntries === "function" ? list.getEntries() : [];
        for (var i = 0; i < entries.length; i += 1) {
          var entry = entries[i] || {};
          var durationMs = toNumber(entry.duration, 0);
          if (durationMs < thresholdMs) {
            continue;
          }

          var startTime = toNumber(entry.startTime, 0);
          var processingStart = toNumber(entry.processingStart, startTime);
          var processingEnd = toNumber(entry.processingEnd, processingStart);
          if (processingEnd < processingStart) {
            processingEnd = processingStart;
          }

          var inputDelayMs = Math.max(0, processingStart - startTime);
          var processingDurationMs = Math.max(0, processingEnd - processingStart);
          var presentationDelayMs = Math.max(0, durationMs - (processingEnd - startTime));
          var level = durationMs >= severeMs ? "warn" : "info";

          var payload = Object.assign(createBaseEvent(scope, "inp"), {
            interactionType: typeof entry.name === "string" ? entry.name : "unknown",
            interactionId: Number.isFinite(entry.interactionId)
              ? Number(entry.interactionId)
              : null,
            durationMs: durationMs,
            inputDelayMs: inputDelayMs,
            processingDurationMs: processingDurationMs,
            presentationDelayMs: presentationDelayMs,
            target: describeTarget(entry.target),
          });
          pushRuntimeEvent(payload);

          // Rate-limited console logging (index-based pruning, no shift())
          var now = Date.now();
          while (inpLogStart < inpLogTimestamps.length && now - inpLogTimestamps[inpLogStart] > INP_RATE_WINDOW_MS) {
            inpLogStart++;
          }
          // Compact when half the array is dead entries
          if (inpLogStart > INP_RATE_MAX) {
            inpLogTimestamps = inpLogTimestamps.slice(inpLogStart);
            inpLogStart = 0;
          }
          if ((inpLogTimestamps.length - inpLogStart) < INP_RATE_MAX) {
            inpLogTimestamps.push(now);
            var suppMsg = inpSuppressedCount > 0 ? " (+" + inpSuppressedCount + " suppressed)" : "";
            inpSuppressedCount = 0;
            writeLog(level, "[diag:" + scope + "] inp " + Math.round(durationMs) + "ms " + (typeof entry.name === "string" ? entry.name : "unknown") + suppMsg);
          } else {
            inpSuppressedCount += 1;
          }
        }
      });

      observer.observe({
        type: "event",
        buffered: true,
        durationThreshold: thresholdMs,
      });
    } catch (error) {
      record(
        scope,
        "inp-observer-failed",
        {
          error: describeError(error),
        },
        "warn",
      );
    }
  }

  function installLongAnimationFrameObserver(scope, options) {
    var thresholdMs = toNumber(options.loafThresholdMs, 50);
    var severeMs = toNumber(options.severeLoafMs, 120);
    var supported = supportsObserverType("long-animation-frame");

    record(
      scope,
      "loaf-observer",
      {
        enabled: true,
        supported: supported,
        thresholdMs: thresholdMs,
        severeMs: severeMs,
      },
      supported ? "info" : "warn",
    );

    if (!supported) {
      return;
    }

    // Rate limiter: max 5 logged LoAF events per 10s window, only log severe (>= severeMs)
    var LOAF_RATE_WINDOW_MS = 10000;
    var LOAF_RATE_MAX = 5;
    var loafLogTimestamps = [];
    var loafLogStart = 0; // index-based pruning avoids O(n) shift()
    var loafSuppressedCount = 0;

    try {
      var observer = new globalScope.PerformanceObserver(function onLoafEntries(list) {
        var entries = typeof list.getEntries === "function" ? list.getEntries() : [];
        for (var i = 0; i < entries.length; i += 1) {
          var entry = entries[i] || {};
          var durationMs = toNumber(entry.duration, 0);
          if (durationMs < thresholdMs) {
            continue;
          }

          // Only log severe LoAF events to console; always store in event buffer
          var isSevere = durationMs >= severeMs;

          var scripts = Array.isArray(entry.scripts) ? entry.scripts : [];
          var topScripts = scripts
            .map(function mapScript(script) {
              var scriptDurationMs = toNumber(script && script.duration, 0);
              return {
                durationMs: scriptDurationMs,
                sourceURL:
                  script && typeof script.sourceURL === "string" ? script.sourceURL : null,
                sourceFunctionName:
                  script && typeof script.sourceFunctionName === "string"
                    ? script.sourceFunctionName
                    : null,
                invokerType:
                  script && typeof script.invokerType === "string" ? script.invokerType : null,
                forcedStyleAndLayoutDurationMs: toNumber(
                  script && script.forcedStyleAndLayoutDuration,
                  0,
                ),
              };
            })
            .filter(function filterSlowScripts(script) {
              return script.durationMs > 0;
            })
            .sort(function sortSlowestFirst(a, b) {
              return b.durationMs - a.durationMs;
            })
            .slice(0, 3);

          var payload = Object.assign(createBaseEvent(scope, "loaf"), {
            durationMs: durationMs,
            blockingDurationMs: toNumber(entry.blockingDuration, 0),
            scriptCount: scripts.length,
            topScripts: topScripts,
          });
          pushRuntimeEvent(payload);

          // Rate-limited console logging for severe frames only
          if (isSevere) {
            var now = Date.now();
            // Prune old timestamps outside the window (index-based, no shift())
            while (loafLogStart < loafLogTimestamps.length && now - loafLogTimestamps[loafLogStart] > LOAF_RATE_WINDOW_MS) {
              loafLogStart++;
            }
            if (loafLogStart > LOAF_RATE_MAX) {
              loafLogTimestamps = loafLogTimestamps.slice(loafLogStart);
              loafLogStart = 0;
            }
            if ((loafLogTimestamps.length - loafLogStart) < LOAF_RATE_MAX) {
              loafLogTimestamps.push(now);
              var suppMsg = loafSuppressedCount > 0 ? " (+" + loafSuppressedCount + " suppressed)" : "";
              loafSuppressedCount = 0;
              writeLog("warn", "[diag:" + scope + "] loaf " + Math.round(durationMs) + "ms" + suppMsg);
            } else {
              loafSuppressedCount += 1;
            }
          }
        }
      });

      observer.observe({
        type: "long-animation-frame",
        buffered: true,
      });
    } catch (error) {
      record(
        scope,
        "loaf-observer-failed",
        {
          error: describeError(error),
        },
        "warn",
      );
    }
  }

  function installRuntimeDiagnostics(options) {
    var opts = options && typeof options === "object" ? options : {};
    var scope =
      typeof opts.scope === "string" && opts.scope.length > 0 ? opts.scope : "runtime";

    if (installedScopes[scope]) {
      return {
        scope: scope,
        alreadyInstalled: true,
      };
    }

    installedScopes[scope] = true;
    installErrorHandlers(scope);

    record(
      scope,
      "install",
      {
        captureInp: Boolean(opts.captureInp),
        captureLoaf: Boolean(opts.captureLoaf),
        capabilities: collectNativeCapabilities(),
      },
      "info",
    );

    if (opts.captureInp) {
      installInpObserver(scope, opts);
    }
    if (opts.captureLoaf) {
      installLongAnimationFrameObserver(scope, opts);
    }

    return {
      scope: scope,
      alreadyInstalled: false,
    };
  }

  function getEvents(scope) {
    if (!scope) {
      return runtimeEvents.slice();
    }
    return runtimeEvents.filter(function byScope(event) {
      return event.scope === scope;
    });
  }

  function clearEvents(scope) {
    if (!scope) {
      runtimeEvents.length = 0;
      return;
    }

    for (var i = runtimeEvents.length - 1; i >= 0; i -= 1) {
      if (runtimeEvents[i] && runtimeEvents[i].scope === scope) {
        runtimeEvents.splice(i, 1);
      }
    }
  }

  globalScope.__BKH_RUNTIME_DIAGNOSTICS__ = {
    install: installRuntimeDiagnostics,
    events: getEvents,
    clear: clearEvents,
    record: function recordCustomEvent(scope, kind, details, level) {
      var normalizedScope =
        typeof scope === "string" && scope.length > 0 ? scope : "runtime";
      var normalizedKind = typeof kind === "string" && kind.length > 0 ? kind : "custom";
      return record(normalizedScope, normalizedKind, details || {}, level || "info");
    },
  };
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : window);
