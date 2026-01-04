module.exports = function createSystemConfig(pool) {
  let cache = {};
  let lastLoad = 0;
  const TTL = 300000; // 5 minutes

  async function loadAll() {
    try {
      const res = await pool.query('SELECT config_key, config_value FROM system_config');
      cache = {};
      for (const row of res.rows) {
        cache[row.config_key] = row.config_value;
      }
      lastLoad = Date.now();
    } catch (err) {
      console.error('Failed to load system_config:', err);
    }
  }

  async function get(key) {
    if (!cache || (Date.now() - lastLoad) > TTL) {
      await loadAll();
    }
    return cache[key];
  }

  return {
    getSystemConfig: get,
    refresh: loadAll
  };
};
