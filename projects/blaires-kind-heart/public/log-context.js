(function bootstrapBkhLogContext(globalScope) {
  if (!globalScope || globalScope.__BKH_LOGGING_PATCHED__) {
    return;
  }

  var LEVEL_VALUE = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    trace: 4,
  };

  var METHOD_LEVEL = {
    error: "error",
    warn: "warn",
    info: "info",
    log: "info",
    debug: "debug",
    trace: "trace",
  };

  var LEVEL_STORAGE_KEY = "bkh.log.level";
  var DEFAULT_LEVEL = "warn";

  function normalizeLevel(raw) {
    if (!raw) {
      return null;
    }

    var value = String(raw).toLowerCase();
    if (value === "warning") {
      value = "warn";
    }
    if (value === "information") {
      value = "info";
    }

    return Object.prototype.hasOwnProperty.call(LEVEL_VALUE, value)
      ? value
      : null;
  }

  function sanitizeToken(raw, maxLen) {
    if (!raw) {
      return null;
    }

    var token = String(raw).replace(/[^a-zA-Z0-9._-]/g, "");
    if (!token) {
      return null;
    }

    return token.slice(0, maxLen || 64);
  }

  function safeSearchParams() {
    try {
      if (!globalScope.location || !globalScope.location.href) {
        return new URLSearchParams();
      }
      return new URL(globalScope.location.href, "http://localhost").searchParams;
    } catch (_err) {
      return new URLSearchParams();
    }
  }

  function getStoredLevel() {
    try {
      if (!globalScope.localStorage) {
        return null;
      }
      return globalScope.localStorage.getItem(LEVEL_STORAGE_KEY);
    } catch (_err) {
      return null;
    }
  }

  function setStoredLevel(level) {
    try {
      if (globalScope.localStorage) {
        globalScope.localStorage.setItem(LEVEL_STORAGE_KEY, level);
      }
    } catch (_err) {
      // Ignore write failures in restricted contexts.
    }
  }

  function randomChunk() {
    try {
      if (globalScope.crypto && typeof globalScope.crypto.getRandomValues === "function") {
        var bytes = new Uint8Array(8);
        globalScope.crypto.getRandomValues(bytes);
        var token = "";
        for (var i = 0; i < bytes.length; i += 1) {
          token += bytes[i].toString(16).padStart(2, "0");
        }
        return token;
      }
    } catch (_err) {
      // Ignore and fall back to Math.random below.
    }

    return (
      Math.random().toString(36).slice(2, 10) +
      Math.random().toString(36).slice(2, 10)
    );
  }

  function buildSessionId(params) {
    var fromParam = sanitizeToken(params.get("sid"), 64);
    if (fromParam) {
      return fromParam;
    }

    var fromGlobal = sanitizeToken(globalScope.__BKH_LOG_SESSION_ID, 64);
    if (fromGlobal) {
      return fromGlobal;
    }

    return "ctx-" + Date.now().toString(36) + "-" + randomChunk().slice(0, 10);
  }

  var params = safeSearchParams();
  var diagnosticsMode =
    params.get("e2e") === "1" ||
    params.get("lite") === "1" ||
    params.get("force_sw") === "1";
  var defaultLevel = diagnosticsMode ? "info" : DEFAULT_LEVEL;

  var currentLevel =
    normalizeLevel(params.get("log")) ||
    normalizeLevel(getStoredLevel()) ||
    normalizeLevel(globalScope.__BKH_LOG_LEVEL) ||
    defaultLevel;

  var sessionId = buildSessionId(params);
  var sequence = 0;

  function nextEventId() {
    sequence += 1;
    return sessionId + "-" + String(sequence).padStart(6, "0");
  }

  function shouldEmit(method) {
    var levelKey = METHOD_LEVEL[method] || "info";
    var methodValue = LEVEL_VALUE[levelKey];
    var configuredValue = LEVEL_VALUE[currentLevel];

    if (typeof methodValue !== "number") {
      return true;
    }

    if (typeof configuredValue !== "number") {
      return true;
    }

    return methodValue <= configuredValue;
  }

  var rawConsole = globalScope.console || {};
  var original = {
    error:
      typeof rawConsole.error === "function"
        ? rawConsole.error.bind(rawConsole)
        : function noop() {},
    warn:
      typeof rawConsole.warn === "function"
        ? rawConsole.warn.bind(rawConsole)
        : function noop() {},
    info:
      typeof rawConsole.info === "function"
        ? rawConsole.info.bind(rawConsole)
        : function noop() {},
    log:
      typeof rawConsole.log === "function"
        ? rawConsole.log.bind(rawConsole)
        : function noop() {},
    debug:
      typeof rawConsole.debug === "function"
        ? rawConsole.debug.bind(rawConsole)
        : function noop() {},
    trace:
      typeof rawConsole.trace === "function"
        ? rawConsole.trace.bind(rawConsole)
        : function noop() {},
  };

  function wrapConsoleMethod(method) {
    var writer = original[method] || original.log;

    return function wrappedConsoleMethod() {
      if (!shouldEmit(method)) {
        return;
      }

      var eventId = nextEventId();
      var levelTag = (METHOD_LEVEL[method] || "info").toUpperCase();
      var args = Array.prototype.slice.call(arguments);
      args.unshift("[" + levelTag + "][sid:" + sessionId + "][eid:" + eventId + "]");
      writer.apply(null, args);
    };
  }

  if (globalScope.console) {
    globalScope.console.error = wrapConsoleMethod("error");
    globalScope.console.warn = wrapConsoleMethod("warn");
    globalScope.console.info = wrapConsoleMethod("info");
    globalScope.console.log = wrapConsoleMethod("log");
    globalScope.console.debug = wrapConsoleMethod("debug");
    globalScope.console.trace = wrapConsoleMethod("trace");
  }

  function setLevel(nextLevel, persist) {
    var normalized = normalizeLevel(nextLevel);
    if (!normalized) {
      return false;
    }

    currentLevel = normalized;
    globalScope.__BKH_LOG_LEVEL = currentLevel;

    if (persist) {
      setStoredLevel(currentLevel);
    }

    return true;
  }

  function setSession(nextSessionId) {
    var normalized = sanitizeToken(nextSessionId, 64);
    if (!normalized) {
      return false;
    }

    sessionId = normalized;
    sequence = 0;
    globalScope.__BKH_LOG_SESSION_ID = sessionId;
    return true;
  }

  globalScope.__BKH_LOG_CONTEXT = {
    get sessionId() {
      return sessionId;
    },
    get level() {
      return currentLevel;
    },
    nextEventId: nextEventId,
    setLevel: function setLogLevel(nextLevel) {
      return setLevel(nextLevel, true);
    },
    setSessionId: function setLogSessionId(nextSessionId) {
      return setSession(nextSessionId);
    },
    setContext: function setContext(partial) {
      if (!partial || typeof partial !== "object") {
        return false;
      }

      var changed = false;
      if (partial.level) {
        changed = setLevel(partial.level, false) || changed;
      }
      if (partial.sessionId || partial.sid) {
        changed = setSession(partial.sessionId || partial.sid) || changed;
      }
      return changed;
    },
    originalConsole: original,
  };

  globalScope.__BKH_LOG_LEVEL = currentLevel;
  globalScope.__BKH_LOG_SESSION_ID = sessionId;
  globalScope.__BKH_LOGGING_PATCHED__ = true;
})(typeof globalThis !== "undefined" ? globalThis : typeof self !== "undefined" ? self : window);
