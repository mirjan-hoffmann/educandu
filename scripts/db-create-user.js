import { MongoClient } from 'mongodb';

(async function createUser() {

  const client = await MongoClient.connect('mongodb://root:rootpw@localhost:27017?replicaSet=elmurs', { useUnifiedTopology: true });
  const existingUser = await client.db('admin').collection('system.users').findOne({ user: 'elmu' });
  if (existingUser) {
    await client.db('admin').removeUser('elmu');
  }

  await client.db('admin').addUser('elmu', 'elmu', { roles: ['root'] });
  await client.close();

})();