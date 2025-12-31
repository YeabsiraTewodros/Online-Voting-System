module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: 'your_username',
      password: 'your_password',
      database: 'ethiopian_vote'
    },
    migrations: {
      directory: './migrations'
    }
  }
};
