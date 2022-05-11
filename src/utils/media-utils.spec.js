import { FILE_TYPE } from '../domain/constants.js';
import { analyzeMediaUrl, formatMillisecondsAsDuration } from './media-utils.js';

describe('media-utils', () => {

  describe('analyzeMediaUrl', () => {
    const testCases = [
      { url: null, expectedError: 'Invalid URL', expectedResult: null },
      { url: '', expectedError: 'Invalid URL', expectedResult: null },
      { url: 'not a URL', expectedError: 'Invalid URL', expectedResult: null },
      { url: 'https://', expectedError: 'Invalid URL', expectedResult: null },
      {
        url: 'https://a',
        expectedError: null,
        expectedResult: {
          sanitizedUrl: 'https://a/',
          isYoutube: false,
          startTimecode: null,
          stopTimecode: null,
          fileType: FILE_TYPE.none
        }
      },
      {
        url: 'https://a.com/abc.mp3',
        expectedError: null,
        expectedResult: {
          sanitizedUrl: 'https://a.com/abc.mp3',
          isYoutube: false,
          startTimecode: null,
          stopTimecode: null,
          fileType: FILE_TYPE.audio
        }
      },
      {
        url: 'https://www.youtube.com/watch?v=4cn8439c2',
        expectedError: null,
        expectedResult: {
          sanitizedUrl: 'https://www.youtube.com/watch?v=4cn8439c2',
          isYoutube: true,
          startTimecode: null,
          stopTimecode: null,
          fileType: FILE_TYPE.video
        }
      },
      {
        url: 'https://www.youtube.com/watch?v=4cn8439c2&start=5',
        expectedError: null,
        expectedResult: {
          sanitizedUrl: 'https://www.youtube.com/watch?v=4cn8439c2',
          isYoutube: true,
          startTimecode: 5000,
          stopTimecode: null,
          fileType: FILE_TYPE.video
        }
      },
      {
        url: 'https://www.youtube.com/watch?v=4cn8439c2&start=5&end=20',
        expectedError: null,
        expectedResult: {
          sanitizedUrl: 'https://www.youtube.com/watch?v=4cn8439c2',
          isYoutube: true,
          startTimecode: 5000,
          stopTimecode: 20000,
          fileType: FILE_TYPE.video
        }
      }
    ];

    testCases.forEach(({ url, expectedError, expectedResult }) => {
      describe(`called with url ${JSON.stringify(url)}`, () => {
        if (expectedError) {
          it('should throw the expected error', () => {
            expect(() => analyzeMediaUrl(url)).toThrowError(expectedError);
          });
        } else {
          it('should return the expected result', () => {
            expect(analyzeMediaUrl(url)).toStrictEqual(expectedResult);
          });
        }
      });
    });
  });

  describe('formatMillisecondsAsDuration', () => {
    const testCases = [
      { milliseconds: 0, expectedResult: '00:00' },
      { milliseconds: 1, expectedResult: '00:00' },
      { milliseconds: 10, expectedResult: '00:00' },
      { milliseconds: 100, expectedResult: '00:00' },
      { milliseconds: 1000, expectedResult: '00:01' },
      { milliseconds: 1001, expectedResult: '00:01' },
      { milliseconds: 503374, expectedResult: '08:23' },
      { milliseconds: 20547234, expectedResult: '05:42:27' },
      { milliseconds: 2349587234576232, expectedResult: '652663120:42:56' },
      { milliseconds: -100000, expectedResult: '00:00' },
      { milliseconds: Number.NaN, expectedResult: '00:00' },
      { milliseconds: Number.POSITIVE_INFINITY, expectedResult: '00:00' },
      { milliseconds: Number.NEGATIVE_INFINITY, expectedResult: '00:00' },
      { milliseconds: null, expectedResult: '00:00' }
    ];

    testCases.forEach(({ milliseconds, expectedResult }) => {
      describe(`called with milliseconds = ${milliseconds}`, () => {
        it(`should return '${expectedResult}'`, () => {
          expect(formatMillisecondsAsDuration(milliseconds)).toBe(expectedResult);
        });
      });
    });
  });

});
