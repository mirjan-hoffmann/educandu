export default {
  name: 'documentLocks',
  indexes: [
    {
      name: '_idx_expires_',
      key: { expires: 1 },
      expireAfterSeconds: 0
    }
  ]
};
