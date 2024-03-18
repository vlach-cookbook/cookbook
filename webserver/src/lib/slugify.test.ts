import { expect, test } from 'vitest';
import slugify from './slugify';

test('handles English titles', function() {
  expect.soft(slugify('Grape Pudding')).toBe('grape-pudding');
  expect.soft(slugify('Rice & Beans')).toBe('rice-beans');
});

test('handles non-English titles badly', function() {
  expect.soft(slugify('Créme')).toBe('cr-me');
  expect.soft(slugify('Ντολμάς')).toBe('-');
})
