import { escapeHtml, kebabCaseToCamelCase } from './string-utils.js';

describe('string-utils', () => {

  describe('escapeHtml', () => {
    it('escapes all necessary characters', () => {
      const result = escapeHtml('if i > 0 && i < 10 then print "Hello World!"');
      expect(result).toBe('if i &gt; 0 &amp;&amp; i &lt; 10 then print &quot;Hello World!&quot;');
    });
  });

  describe('kebabCaseToCamelCase', () => {
    it('converts kebab to camel case', () => {
      const result = kebabCaseToCamelCase('just-my-2-cents');
      expect(result).toBe('justMy2Cents');
    });
  });

});
