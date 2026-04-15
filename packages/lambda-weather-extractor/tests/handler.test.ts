import { handler } from '../src/handler';

describe('Weather Extractor Lambda', () => {
  it('should be defined', () => {
    expect(handler).toBeDefined();
  });
});
