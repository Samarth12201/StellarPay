import { describe, it, expect } from 'vitest';
import { truncateAddress, formatXlm, isValidStellarAddress } from '../utils';

describe('Utility Functions', () => {
  const validAddress = 'GAJSRGJ72WX6NKW74L4JLJXG32GY2HNT7GR4QGIAPEKG3JC6ISVYUBIB';

  describe('truncateAddress', () => {
    it('should truncate a standard address with default character counts', () => {
      expect(truncateAddress(validAddress)).toBe('GAJSRG...VYUBIB');
    });

    it('should truncate with custom character counts', () => {
      expect(truncateAddress(validAddress, 4)).toBe('GAJS...UBIB');
    });
  });

  describe('formatXlm', () => {
    it('should format valid numeric balance strings correctly', () => {
      expect(formatXlm('100.5')).toBe('100.50');
      expect(formatXlm('1000')).toBe('1,000.00');
    });

    it('should default to 0.00 on empty or invalid inputs', () => {
      expect(formatXlm(null)).toBe('0.00');
      expect(formatXlm('')).toBe('0.00');
      expect(formatXlm('invalid')).toBe('0.00');
    });
  });

  describe('isValidStellarAddress', () => {
    it('should return true for valid Stellar public keys', () => {
      expect(isValidStellarAddress(validAddress)).toBe(true);
    });

    it('should return false for invalid Stellar public keys', () => {
      expect(isValidStellarAddress('invalid-key')).toBe(false);
      expect(isValidStellarAddress('GAJSRG')).toBe(false);
    });
  });
});
