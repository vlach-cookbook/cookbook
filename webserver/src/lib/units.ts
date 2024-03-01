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
  },
  L: {
    system: 'metric',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, number, ::unit/liter @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/liter @# unit-width-narrow}", "en-US"),
    synonyms: ['L', 'liter', 'litre', 'liters', 'litres'],
  },
  oz: {
    system: 'US',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/ounce @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/ounce @# unit-width-narrow}", "en-US"),
    synonyms: ['oz', 'ounce', 'ounces'],
  },
  tsp: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 teaspoon} other {# teaspoons}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} tsp", "en-US"),
    synonyms: ['tsp', 'teaspoon', 'teaspoons'],
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
    amountForOne: { num: .001, unit: baseUnits['g'] },
  },
  kg: {
    system: 'metric',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/kilogram @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/kilogram @# unit-width-narrow}", "en-US"),
    synonyms: ['kg', 'kilogram', 'kilograms'],
    amountForOne: { num: 1000, unit: baseUnits['g'] },
  },
  mL: {
    system: 'metric',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, number, ::unit/milliliter @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/milliliter @# unit-width-narrow}", "en-US"),
    synonyms: ['mL', 'ml', 'milliliter', 'milliliters'],
    amountForOne: { num: .001, unit: baseUnits['L'] },
  },
  lb: {
    system: 'US',
    dimension: 'mass',
    longname: new IntlMessageFormat("{num, number, ::unit/pound @# unit-width-full-name}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number, ::unit/pound @# unit-width-narrow}", "en-US"),
    synonyms: ['lb', 'pound', 'pounds'],
    amountForOne: { num: 16, unit: baseUnits['oz'] },
  },
  Tbsp: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 tablespoon} other {# tablespoons}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} Tbsp", "en-US"),
    synonyms: ['tbsp', 'tablespoon', 'tablespoons'],
    amountForOne: { num: 3, unit: baseUnits['tsp'] },
  },
  cup: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 cup} other {# cups}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} C", "en-US"),
    synonyms: ['C', 'cup', 'cups'],
    amountForOne: { num: 16 * 3, unit: baseUnits['tsp'] },
  },
  pint: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 pint} other {# pints}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} pt", "en-US"),
    synonyms: ['pt', 'pint', 'pints'],
    amountForOne: { num: 2 * 16 * 3, unit: baseUnits['tsp'] },
  },
  quart: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 quart} other {# quarts}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} qt}", "en-US"),
    synonyms: ['qt', 'quart', 'quarts'],
    amountForOne: { num: 4 * 16 * 3, unit: baseUnits['tsp'] },
  },
  gallon: {
    system: 'US',
    dimension: 'volume',
    longname: new IntlMessageFormat("{num, plural, =1 {1 gallon} other {# gallons}}", "en-US"),
    abbreviation: new IntlMessageFormat("{num, number} gal}", "en-US"),
    synonyms: ['gal', 'gallon', 'gallons'],
    amountForOne: { num: 4 * 4 * 16 * 3, unit: baseUnits['tsp'] },
  },
} as const satisfies { [name: string]: Unit };

const unitSynonyms: Map<string, Unit> = new Map(Object.values(units).flatMap(unit =>
  unit.synonyms.map(synonym => [synonym, unit])
));

export function getUnit(name: string): Unit | undefined {
  const exact = unitSynonyms.get(name);
  if (exact) return exact;
  return unitSynonyms.get(name.toLowerCase());
}

export function scale({num, unit}: Amount, multiple: number): Amount {
  let result = num * multiple;
  if (unit.min && result < unit.min) {

  }
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
