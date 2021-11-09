import joi from 'joi';
import uniqueId from '../utils/unique-id.js';
import { validate } from '../domain/validation.js';

const configSchema = joi.object({
  env: joi.string().required(),
  port: joi.number().min(1).required(),
  mongoConnectionString: joi.string().required(),
  skipMongoMigrations: joi.boolean().required(),
  skipMongoChecks: joi.boolean().required(),
  cdnEndpoint: joi.string().required(),
  cdnRegion: joi.string().required(),
  cdnAccessKey: joi.string().required(),
  cdnSecretKey: joi.string().required(),
  cdnBucketName: joi.string().required(),
  cdnRootUrl: joi.string().required(),
  sessionSecret: joi.string(),
  sessionDurationInMinutes: joi.number().min(1),
  smtpOptions: joi.any(),
  publicFolders: joi.array().items(joi.string()),
  resources: joi.array().items(joi.string()),
  initialUser: joi.object({
    username: joi.string().required(),
    password: joi.string().required(),
    email: joi.string().required()
  }).allow(null)
});

const configDefaults = {
  env: 'dev',
  port: 3000,
  mongoConnectionString: null,
  skipMongoMigrations: false,
  skipMongoChecks: false,
  cdnEndpoint: null,
  cdnRegion: null,
  cdnAccessKey: null,
  cdnSecretKey: null,
  cdnBucketName: null,
  cdnRootUrl: null,
  sessionSecret: uniqueId.create(),
  sessionDurationInMinutes: 60,
  smtpOptions: null,
  publicFolders: [],
  resources: [],
  initialUser: null
};

class ServerConfig {
  constructor(values = {}) {
    const mergedConfig = { ...configDefaults, ...values };
    validate(mergedConfig, configSchema);
    Object.assign(this, mergedConfig);
  }

  exportClientConfigValues() {
    return {
      env: this.env,
      cdnRootUrl: this.cdnRootUrl
    };
  }
}

export default ServerConfig;
