import IntlMessageFormat from 'intl-messageformat';

export type Dimension = 'mass' | 'volume';
// "US" instead of "imperial" because the liquid measurements are different
// (https://en.wikipedia.org/wiki/Cooking_weights_and_measures).
export type MeasurementSystem = 'US' | 'metric';
export type Amount = { num: number, unit: Unit };
export interface Unit {
  readonly system: MeasurementSystem,
  readonly dimension: Dimension,
  // For now, these are fixed to en-US for simplicity. We can translate later. All formats should
  // take "num" as the placeholder.
  readonly longname: IntlMessageFormat,
  readonly abbreviation: IntlMessageFormat,
  readonly synonyms: string[],
  // For non-base units, this is the amount of the base unit with the same dimension and
  // measurement system in 1 of this unit.
  readonly amountForOne?: Amount,

  // The smallest amount of this unit that should be used in a recipe. Any smaller should be
  // expressed in a smaller unit.
  readonly min?: number,
  // The largest amount of this unit that should be used in a recipe. Any larger should be
  // expressed in a smaller unit.
  readonly max?: number,
};

// pinch: about 1/16 - 1/8 tsp (https://learn.surlatable.com/how-much-is-a-pinch/)
// dash: just under 1/8 tsp (https://learn.surlatable.com/how-much-is-a-dash/)

const baseUnits = {
  g: {
    system: 'metric',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/gram @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/gram @# unit-width-narrow}", "en-US"),
    synonyms: ['g', 'gram', 'grams'],
    min: 1,
    max: 1000,
  },
  L: {
    system: 'metric',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, number, ::unit/liter @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/liter @# unit-width-narrow}", "en-US"),
    synonyms: ['L', 'liter', 'litre', 'liters', 'litres'],
    min: 1,
  },
  oz: {
    system: 'US',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/ounce @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/ounce @# unit-width-narrow}", "en-US"),
    synonyms: ['oz', 'ounce', 'ounces'],
    max: 16,
  },
  tsp: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 teaspoon} other {# teaspoons}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} tsp", "en-US"),
    synonyms: ['tsp', 'teaspoon', 'teaspoons'],
    max: 5,
  }
} as const satisfies { [name: string]: Unit };

export const units = {
  ...baseUnits,
  mg: {
    system: 'metric',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, plural, =1 {1 milligram} other {# milligrams}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} mg", "en-US"),
    synonyms: ['mg', 'milligram', 'milligrams'],
    amountForOne: { num: .001, unit: baseUnits.g },
    max: 1000,
  },
  kg: {
    system: 'metric',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/kilogram @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/kilogram @# unit-width-narrow}", "en-US"),
    synonyms: ['kg', 'kilogram', 'kilograms'],
    amountForOne: { num: 1000, unit: baseUnits.g },
    min: 1,
  },
  mL: {
    system: 'metric',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, number, ::unit/milliliter @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/milliliter @# unit-width-narrow}", "en-US"),
    synonyms: ['mL', 'ml', 'milliliter', 'milliliters'],
    amountForOne: { num: .001, unit: baseUnits.L },
    max: 1000,
  },
  lb: {
    system: 'US',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/pound @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/pound @# unit-width-narrow}", "en-US"),
    synonyms: ['lb', 'pound', 'pounds'],
    amountForOne: { num: 16, unit: baseUnits.oz },
    min: 1,
  },
  Tbsp: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 tablespoon} other {# tablespoons}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} Tbsp", "en-US"),
    synonyms: ['tbsp', 'tablespoon', 'tablespoons'],
    amountForOne: { num: 3, unit: baseUnits.tsp },
    min: 1,
  },
  C: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 cup} other {# cups}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} C", "en-US"),
    synonyms: ['C', 'cup', 'cups'],
    amountForOne: { num: 16 * 3, unit: baseUnits.tsp },
    min: 1 / 8,
  },
  pt: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 pint} other {# pints}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} pt", "en-US"),
    synonyms: ['pt', 'pint', 'pints'],
    amountForOne: { num: 2 * 16 * 3, unit: baseUnits.tsp },
    min: 1,
  },
  qt: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 quart} other {# quarts}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} qt}", "en-US"),
    synonyms: ['qt', 'quart', 'quarts'],
    amountForOne: { num: 4 * 16 * 3, unit: baseUnits.tsp },
    min: 1,
  },
  gal: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 gallon} other {# gallons}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} gal}", "en-US"),
    synonyms: ['gal', 'gallon', 'gallons'],
    amountForOne: { num: 4 * 4 * 16 * 3, unit: baseUnits.tsp },
    min: 1,
  },
} as const satisfies { [name: string]: Unit };

// Inspired by CLDR unit preferences:
// https://www.unicode.org/cldr/charts/45/supplemental/unit_preferences.html. The 'geq' field is the
// unit's 'min' field.
const unitPreference: Record<MeasurementSystem, Record<Dimension, Unit[]>> = {
  'US': {
    'mass': [units.lb, units.oz],
    // No pints or bigger because all our measuring devices are in cups.
    'volume': [units.C, units.Tbsp, units.tsp],
  },
  'metric': {
    'mass': [units.kg, units.g, units.mg],
    'volume': [units.L, units.mL],
  },
};

const unitSynonyms: Map<string, Unit> = new Map(Object.values(units).flatMap(unit =>
  unit.synonyms.map(synonym => [synonym, unit])
));

export function getUnit(name: string): Unit | undefined {
  const exact = unitSynonyms.get(name);
  if (exact) return exact;
  return unitSynonyms.get(name.toLowerCase());
}

export function scale({ num, unit }: Amount, multiple: number): Amount {
  let result = num * multiple;
  // Only search for a different unit if the original has scaled out of its reasonable range. Some
  // units (tsp, quarts, maybe "pinches") are sticky, and try to keep using that unit if it was the
  // unit the recipe originally chose.
  if ((unit.min && result < unit.min) || (unit.max && result > unit.max)) {
    const amountOfBase = result * (unit.amountForOne?.num ?? 1)
    let trialUnit = unit;
    let amountOfTrialUnit = num;
    for (trialUnit of unitPreference[unit.system][unit.dimension]) {
      amountOfTrialUnit = amountOfBase / (trialUnit.amountForOne?.num ?? 1);
      if (!trialUnit.min || amountOfTrialUnit >= trialUnit.min) {
        break;
      }
    }
    // If we run out of units to try, use the last one, which will be the smallest.
    return {num: amountOfTrialUnit, unit: trialUnit}
  }
  return { num: result, unit };
}

export function render({ num, unit, length }: Amount & { length: 'long' | 'abbrev' }): string {
  const format = unit[length === 'long' ? 'longname' : 'abbreviation'];
  const result = format.format({ num });
  if (typeof result !== 'string') {
    throw new Error(`Got a non-string when formatting ${JSON.stringify(format.getAst())}: ${JSON.stringify(result)}`,
      { cause: { num, unit, length } });
  }
  return result;
}
