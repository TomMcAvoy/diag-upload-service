// payload-wrapper.cjs
(async () => {
  const config = await import('./payload_config.mjs');
  module.exports = config.default;
})();
