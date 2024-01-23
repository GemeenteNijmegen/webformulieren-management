import {render } from '../../../src/webapp/util/render';

test('render default templates', async () => {
  const html = await render({
    text: 'hello world',
  }, '{{>header}} <span>{{text}}</span> {{>footer}}');
  expect(html).toContain('<!doctype html>');
  expect(html).toContain('<span>hello world</span>');
  expect(html).toContain('</html>');
})