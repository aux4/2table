/**
 * Value formatting strategies (Strategy + Factory pattern).
 *
 * A column can declare a `{format:...}` modifier that renders its raw values as
 * numbers, currency, percentages, dates, times or datetimes. Each format type is
 * a self-contained strategy class exposing:
 *
 *   - format(value)        -> the display value (string), or the original value on
 *                             empty/un-parseable input (never "NaN"/"Invalid Date")
 *   - rightAligned(value)  -> whether the column should auto right-align
 *
 * There is NO switch/if dispatch on the format type: `ValueFormatterFactory` maps
 * the type string to a strategy via a lookup registry. When no `format` key is
 * present the factory returns `IdentityFormatter`, which leaves values untouched
 * so all existing behavior is preserved.
 */

const FALLBACK_LOCALE = "en-US";

const HOST_LOCALE = (() => {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
    return resolved || FALLBACK_LOCALE;
  } catch (e) {
    return FALLBACK_LOCALE;
  }
})();

function isEmpty(value) {
  return value === null || value === undefined || value === "";
}

/**
 * Coerce a value that may be a JS number or a numeric string into a number.
 * Returns NaN for anything that is not a clean numeric value.
 */
function toNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return NaN;
}

function resolveLocale(options) {
  return options.locale || HOST_LOCALE || FALLBACK_LOCALE;
}

/**
 * Normalize an option to a usable string, treating empty/blank as absent so the
 * `??` precedence chain falls through to the next candidate. This keeps the
 * temporal style resolution as a flat "explicit override ?? style ?? default"
 * expression instead of nested if-chains.
 */
function optionValue(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return undefined;
  }
  return value;
}

/**
 * Resolve the effective style for a temporal part. Precedence:
 * explicit part style (dateStyle/timeStyle) > unified `style` > built-in default.
 */
function resolveTemporalStyle(explicit, style, fallback) {
  return optionValue(explicit) ?? optionValue(style) ?? fallback;
}

/**
 * Apply fixed fraction digits when `decimals` is provided. `decimals` is expected
 * to already be an integer (StructureParser/Structure parse it), but we coerce
 * defensively so a stray string cannot corrupt the Intl options.
 */
function applyDecimals(intlOptions, options) {
  if (options.decimals === undefined || options.decimals === null || options.decimals === "") {
    return intlOptions;
  }
  const decimals = parseInt(options.decimals, 10);
  if (Number.isNaN(decimals)) {
    return intlOptions;
  }
  intlOptions.minimumFractionDigits = decimals;
  intlOptions.maximumFractionDigits = decimals;
  return intlOptions;
}

/**
 * Default strategy: returns the value unchanged. Preserves the historical
 * behavior where plain JS numbers auto right-align and everything else is left
 * as-is for the downstream cell formatter.
 */
export class IdentityFormatter {
  constructor(options = {}) {
    this.options = options;
  }

  format(value) {
    return value;
  }

  rightAligned(value) {
    return typeof value === "number";
  }
}

/**
 * Shared base for numeric strategies. Handles empty/NaN guarding and delegates
 * the actual rendering to `renderNumber`, so subclasses only build an Intl
 * formatter. Numeric columns always request right alignment.
 */
class NumericFormatter extends IdentityFormatter {
  format(value) {
    if (isEmpty(value)) {
      return "";
    }
    const num = toNumber(value);
    if (Number.isNaN(num)) {
      return value;
    }
    return this.renderNumber(num);
  }

  rightAligned() {
    return true;
  }

  renderNumber(num) {
    return String(num);
  }
}

export class NumberFormatter extends NumericFormatter {
  constructor(options = {}) {
    super(options);
    const intlOptions = applyDecimals({ useGrouping: true }, options);
    this.formatter = new Intl.NumberFormat(resolveLocale(options), intlOptions);
  }

  renderNumber(num) {
    return this.formatter.format(num);
  }
}

export class CurrencyFormatter extends NumericFormatter {
  constructor(options = {}) {
    super(options);
    const intlOptions = applyDecimals(
      { style: "currency", currency: options.currency || "USD" },
      options
    );
    this.formatter = new Intl.NumberFormat(resolveLocale(options), intlOptions);
  }

  renderNumber(num) {
    return this.formatter.format(num);
  }
}

export class PercentFormatter extends NumericFormatter {
  constructor(options = {}) {
    super(options);
    const intlOptions = applyDecimals({ style: "percent" }, options);
    this.formatter = new Intl.NumberFormat(resolveLocale(options), intlOptions);
  }

  renderNumber(num) {
    // Intl percent style multiplies by 100, so the raw value is treated as a ratio.
    return this.formatter.format(num);
  }
}

/**
 * Shared base for temporal strategies. Handles empty/Invalid-Date guarding and
 * delegates rendering to an Intl.DateTimeFormat built by the subclass. Temporal
 * columns keep the default (left) alignment.
 */
class TemporalFormatter extends IdentityFormatter {
  format(value) {
    if (isEmpty(value)) {
      return "";
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return this.formatter.format(date);
  }

  rightAligned() {
    return false;
  }
}

export class DateFormatter extends TemporalFormatter {
  constructor(options = {}) {
    super(options);
    this.formatter = new Intl.DateTimeFormat(resolveLocale(options), {
      dateStyle: resolveTemporalStyle(options.dateStyle, options.style, "medium")
    });
  }
}

export class TimeFormatter extends TemporalFormatter {
  constructor(options = {}) {
    super(options);
    this.formatter = new Intl.DateTimeFormat(resolveLocale(options), {
      timeStyle: resolveTemporalStyle(options.timeStyle, options.style, "medium")
    });
  }
}

export class DateTimeFormatter extends TemporalFormatter {
  constructor(options = {}) {
    super(options);
    this.formatter = new Intl.DateTimeFormat(resolveLocale(options), {
      dateStyle: resolveTemporalStyle(options.dateStyle, options.style, "medium"),
      timeStyle: resolveTemporalStyle(options.timeStyle, options.style, "short")
    });
  }
}

/**
 * Registry mapping a `format` type string to its strategy class. Adding a new
 * format type means adding one entry here plus its class above — never a switch.
 */
const FORMATTER_REGISTRY = {
  number: NumberFormatter,
  currency: CurrencyFormatter,
  percent: PercentFormatter,
  date: DateFormatter,
  time: TimeFormatter,
  datetime: DateTimeFormatter
};

export class ValueFormatterFactory {
  /**
   * Create a formatter strategy from a column's parsed format object.
   * The object is the column's format/properties (e.g. { format: "currency",
   * currency: "USD", decimals: 2, width: 10, align: "right" }). When no `format`
   * key is present, an IdentityFormatter is returned so behavior is unchanged.
   */
  static create(format) {
    const options = format || {};
    const Strategy = FORMATTER_REGISTRY[options.format] || IdentityFormatter;
    return new Strategy(options);
  }
}
