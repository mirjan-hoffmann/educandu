# educandu

[![codecov](https://codecov.io/gh/educandu/educandu/branch/main/graph/badge.svg?token=SM7ANNBT3A)](https://codecov.io/gh/educandu/educandu)

The educandu framework

## How to use

~~~
$ yarn add @educandu/educandu
~~~

Use it in code like this:

~~~
import educandu from '@educandu/educandu';

educandu({
  port: Number(process.env.PORT) || 3000,
  mongoConnectionString: 'mongodb://user:pwd@localhost:27017/my-db?replicaSet=myrs&authSource=admin',
  skipMongoMigrations: process.env.SKIP_MONGO_MIGRATIONS === 'true',
  skipMongoChecks: process.env.SKIP_MONGO_CHECKS === 'true',
  cdnEndpoint: 'http://localhost:9000',
  cdnRegion: 'eu-central-1',
  cdnAccessKey: 'KSHJFHKJHFSGDJVAJHD',
  cdnSecretKey: 'ZUUUHFJKJKHDJKHJKKJhdkjsdhku',
  cdnBucketName: 'my-cdn-bucket',
  cdnRootUrl: 'http://localhost:9000/my-cdn-url',
  sessionSecret: '49zcn238zt43zt7c8234nt8843t8',
  sessionDurationInMinutes: Number(process.env.SESSION_DURATION_IN_MINUTES) || 60,
  smtpOptions: {
    host: 'localhost',
    port: 8025,
    ignoreTLS: true
  },
  publicFolders: [path.resolve('./assets')],
  initialUser: {
    username: 'test',
    password: 'test',
    email: 'test@test.com'
  }
});
~~~

## How to run and develop locally

~~~
$ yarn
$ gulp
~~~

This will build and start up the TestApp (in watch mode), which is set up to use educandu.

## License

Educandu is released under the MIT License. See the bundled LICENSE file for details.
