const passport = require('passport');
const urls = require('../utils/urls');
const bodyParser = require('body-parser');
const session = require('express-session');
const { NotFound } = require('http-errors');
const connectMongo = require('connect-mongo');
const PageRenderer = require('./page-renderer');
const passportLocal = require('passport-local');
const Database = require('../stores/database.js');
const permissions = require('../domain/permissions');
const UserService = require('../services/user-service');
const MailService = require('../services/mail-service');
const requestHelper = require('../utils/request-helper');
const ClientDataMapper = require('./client-data-mapper');
const ServerSettings = require('../bootstrap/server-settings');
const needsPermission = require('../domain/needs-permission-middleware');
const sessionsStoreSpec = require('../stores/collection-specs/sessions');
const { CREATE_USER_RESULT_SUCCESS } = require('../domain/user-management');
const needsAuthentication = require('../domain/needs-authentication-middleware');

const jsonParser = bodyParser.json();
const LocalStrategy = passportLocal.Strategy;
const MongoSessionStore = connectMongo(session);

class UserController {
  static get inject() { return [ServerSettings, Database, UserService, MailService, ClientDataMapper, PageRenderer]; }

  constructor(serverSettings, database, userService, mailService, clientDataMapper, pageRenderer) {
    this.serverSettings = serverSettings;
    this.database = database;
    this.userService = userService;
    this.mailService = mailService;
    this.clientDataMapper = clientDataMapper;
    this.pageRenderer = pageRenderer;
  }

  registerMiddleware(router) {
    router.use(session({
      name: 'SID',
      secret: this.serverSettings.sessionSecret,
      resave: false,
      saveUninitialized: false, // Don't create session until something stored
      store: new MongoSessionStore({
        db: this.database._db,
        collection: sessionsStoreSpec.name,
        ttl: this.serverSettings.sessionDurationInMinutes * 60,
        autoRemove: 'disabled', // We use our own index
        stringify: false // Do not serialize session data
      })
    }));

    router.use(passport.initialize());
    router.use(passport.session());

    passport.use(new LocalStrategy((username, password, cb) => {
      this.userService.authenticateUser(username, password)
        .then(user => cb(null, user || false))
        .catch(err => cb(err));
    }));

    passport.serializeUser((user, cb) => {
      cb(null, { _id: user._id });
    });

    passport.deserializeUser(async (input, cb) => {
      try {
        const user = await this.userService.getUserById(input._id);
        return cb(null, user);
      } catch (err) {
        return cb(err);
      }
    });
  }

  registerPages(router) {
    router.get('/register', (req, res) => {
      return this.pageRenderer.sendPage(req, res, 'settings-bundle', 'register', {});
    });

    router.get('/reset-password', (req, res) => {
      return this.pageRenderer.sendPage(req, res, 'settings-bundle', 'reset-password', {});
    });

    router.get('/complete-registration/:verificationCode', async (req, res) => {
      const user = await this.userService.verifyUser(req.params.verificationCode);
      if (!user) {
        throw new NotFound();
      }

      return this.pageRenderer.sendPage(req, res, 'settings-bundle', 'complete-registration', {});
    });

    router.get('/login', (req, res) => {
      return this.pageRenderer.sendPage(req, res, 'settings-bundle', 'login', {});
    });

    router.get('/logout', (req, res) => {
      req.logout();
      return res.redirect(urls.getDefaultLogoutRedirectUrl());
    });

    router.get('/profile', needsAuthentication(), (req, res) => {
      return this.pageRenderer.sendPage(req, res, 'settings-bundle', 'profile', {}, ['country-names']);
    });

    router.get('/complete-password-reset/:passwordResetRequestId', async (req, res) => {
      const resetRequest = await this.userService.getPasswordResetRequestById(req.params.passwordResetRequestId);
      if (!resetRequest) {
        throw new NotFound();
      }

      const initialState = { passwordResetRequestId: resetRequest._id };
      return this.pageRenderer.sendPage(req, res, 'settings-bundle', 'complete-password-reset', initialState);
    });

    router.get('/users', needsPermission(permissions.EDIT_USERS), async (req, res) => {
      const initialState = await this.userService.getAllUsers();
      return this.pageRenderer.sendPage(req, res, 'edit-bundle', 'users', initialState, ['country-names']);
    });
  }

  registerApi(router) {
    router.get('/api/v1/users', needsPermission(permissions.EDIT_USERS), async (req, res) => {
      const result = await this.userService.getAllUsers();
      res.send({ users: result });
    });

    router.post('/api/v1/users', jsonParser, async (req, res) => {
      const { username, password, email } = req.body;
      const { result, user } = await this.userService.createUser(username, password, email);

      if (result === CREATE_USER_RESULT_SUCCESS) {
        const { origin } = requestHelper.getHostInfo(req);
        const verificationLink = urls.concatParts(origin, urls.getCompleteRegistrationUrl(user.verificationCode));
        await this.mailService.sendRegistrationVerificationLink(email, verificationLink);
      }

      res.send({ result: result, user: user ? this.clientDataMapper.dbUserToClientUser(user) : null });
    });

    router.post('/api/v1/users/request-password-reset', jsonParser, async (req, res) => {
      const { email } = req.body;
      const user = await this.userService.getUserByEmailAddress(email);

      if (user) {
        const resetRequest = await this.userService.createPasswordResetRequest(user);
        const { origin } = requestHelper.getHostInfo(req);
        const resetCompletionLink = urls.concatParts(origin, urls.getCompletePasswordResetUrl(resetRequest._id));
        await this.mailService.sendPasswordResetRequestCompletionLink(user.email, resetCompletionLink);
      }

      return res.send({});
    });

    router.post('/api/v1/users/complete-password-reset', jsonParser, async (req, res) => {
      const { passwordResetRequestId, password } = req.body;
      const user = await this.userService.completePasswordResetRequest(passwordResetRequestId, password);
      if (!user) {
        throw new NotFound();
      }

      return res.send({ user });
    });

    router.post('/api/v1/users/profile', [needsAuthentication(), jsonParser], async (req, res) => {
      const userId = req.user._id;
      const { profile } = req.body;
      const savedProfile = await this.userService.updateUserProfile(userId, profile);
      if (!savedProfile) {
        throw new NotFound();
      }

      return res.send({ profile: savedProfile });
    });

    router.post('/api/v1/users/login', jsonParser, (req, res, next) => {
      passport.authenticate('local', (err, user) => {
        if (err) {
          return next(err);
        }

        if (!user) {
          return res.send({ user: null });
        }

        return req.login(user, loginError => {
          if (loginError) {
            return next(loginError);
          }

          return res.send({ user: this.clientDataMapper.dbUserToClientUser(user) });
        });
      })(req, res, next);
    });

    router.post('/api/v1/users/:userId/roles', [needsPermission(permissions.EDIT_USERS), jsonParser], async (req, res) => {
      const { userId } = req.params;
      const { roles } = req.body;
      const newRoles = await this.userService.updateUserRoles(userId, roles);
      return res.send({ roles: newRoles });
    });

    router.post('/api/v1/users/:userId/lockedOut', [needsPermission(permissions.EDIT_USERS), jsonParser], async (req, res) => {
      const { userId } = req.params;
      const { lockedOut } = req.body;
      const newLockedOutState = await this.userService.updateUserLockedOutState(userId, lockedOut);
      return res.send({ lockedOut: newLockedOutState });
    });
  }
}

module.exports = UserController;