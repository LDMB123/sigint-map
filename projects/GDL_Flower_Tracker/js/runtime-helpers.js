(function attachRuntimeHelpers(globalScope) {
  const root = globalScope.GDLTrackerModules || (globalScope.GDLTrackerModules = {});

  function isFiniteNumber(value) {
    if (typeof value === "number") return Number.isFinite(value);
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return false;
      return Number.isFinite(Number(trimmed));
    }
    return false;
  }

  function toNumber(value) {
    if (value == null) return null;
    if (!isFiniteNumber(value)) return null;
    return Number(value);
  }

  function sizeToGrams(size) {
    const value = parseFloat(String(size || "").replace(/[^\d.]/g, ""));
    return Number.isFinite(value) ? value : null;
  }

  function average(values) {
    if (!values.length) return null;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function getUnitPrice(row) {
    const grams = sizeToGrams(row?.size);
    const price = toNumber(row?.price);
    if (grams == null || grams <= 0 || price == null) return null;
    return price / grams;
  }

  root.runtime = {
    average,
    getUnitPrice,
    isFiniteNumber,
    sizeToGrams,
    toNumber,
  };
})(window);
