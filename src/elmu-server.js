const os = require('os');
const path = require('path');
const React = require('react');
const multer = require('multer');
const express = require('express');
const passport = require('passport');
const htmlescape = require('htmlescape');
const bodyParser = require('body-parser');
const Cdn = require('./repositories/cdn');
const parseBool = require('parseboolean');
const session = require('express-session');
const { Container } = require('./common/di');
const Root = require('./components/root.jsx');
const Database = require('./stores/database.js');
const Doc = require('./components/pages/doc.jsx');
const ReactDOMServer = require('react-dom/server');
const Docs = require('./components/pages/docs.jsx');
const Edit = require('./components/pages/edit.jsx');
const ApiFactory = require('./plugins/api-factory');
const MongoStore = require('connect-mongo')(session);
const Index = require('./components/pages/index.jsx');
const Login = require('./components/pages/login.jsx');
const UserService = require('./services/user-service');
const MailService = require('./services/mail-service');
const requestHelper = require('./utils/request-helper');
const LocalStrategy = require('passport-local').Strategy;
const Register = require('./components/pages/register.jsx');
const ClientSettings = require('./bootstrap/client-settings');
const ServerSettings = require('./bootstrap/server-settings');
const { resetServerContext } = require('react-beautiful-dnd');
const DocumentService = require('./services/document-service');
const ResetPassword = require('./components/pages/reset-password.jsx');
const sessionsStoreSpec = require('./stores/collection-specs/sessions');
const CompleteRegistration = require('./components/pages/complete-registration.jsx');
const CompletePasswordReset = require('./components/pages/complete-password-reset.jsx');

const LANGUAGE = 'de';

const renderPageTemplate = ({ bundleName, request, user, initialState, clientSettings, html }) => `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ELMU</title>
    <link rel="stylesheet" href="/main.css">
  </head>
  <body>
    <div id="root">${html}</div>
    <script>
      window.__user__ = ${htmlescape(user)};
      window.__request__ = ${htmlescape(request)};
      window.__language__ = ${htmlescape(LANGUAGE)};
      window.__settings__ = ${htmlescape(clientSettings)};
      window.__initalState__ = ${htmlescape(initialState)};
    </script>
    <script src="/commons.js"></script>
    <script src="/${bundleName}.js"></script>
  </body>
</html>
`;

function mapDocToInitialState({ doc }) {
  return {
    doc: {
      key: doc._id,
      title: doc.title,
      createdOn: doc.createdOn,
      updatedOn: doc.updatedOn,
      createdBy: doc.createdBy,
      updatedBy: doc.updatedBy
    },
    sections: doc.sections
  };
}

const jsonParser = bodyParser.json();
const multipartParser = multer({ dest: os.tmpdir() });

class ElmuServer {
  static get inject() { return [Container, ServerSettings, ClientSettings, ApiFactory, DocumentService, UserService, MailService, Cdn, Database]; }

  /* eslint-disable-next-line no-warning-comments */
  // TODO: Refactor!
  /* eslint-disable-next-line max-params */
  constructor(container, serverSettings, clientSettings, apiFactory, documentService, userService, mailService, cdn, database) {
    this.container = container;
    this.serverSettings = serverSettings;
    this.clientSettings = clientSettings;
    this.apiFactory = apiFactory;
    this.documentService = documentService;
    this.userService = userService;
    this.mailService = mailService;
    this.cdn = cdn;

    this.app = express();

    this.app.enable('trust proxy');

    ['../dist', '../static']
      .map(dir => path.join(__dirname, dir))
      .forEach(dir => this.app.use(express.static(dir)));

    this.app.use(session({
      name: 'SID',
      secret: this.serverSettings.sessionSecret,
      resave: false,
      saveUninitialized: false, // Don't create session until something stored
      store: new MongoStore({
        db: database._db,
        collection: sessionsStoreSpec.name,
        ttl: this.serverSettings.sessionDurationInMinutes * 60,
        autoRemove: 'disabled', // We use our own index
        stringify: false // Do not serialize session data
      })
    }));

    this.app.use(passport.initialize());
    this.app.use(passport.session());

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

    this.app.get('/register', (req, res) => {
      return this._sendPage(req, res, 'register', Register, {});
    });

    this.app.get('/reset-password', (req, res) => {
      return this._sendPage(req, res, 'reset-password', ResetPassword, {});
    });

    this.app.get('/complete-registration/:verificationCode', async (req, res) => {
      const user = await this.userService.verifyUser(req.params.verificationCode);
      if (!user) {
        return res.sendStatus(404);
      }

      return this._sendPage(req, res, 'complete-registration', CompleteRegistration, {});
    });

    this.registerPages();
    this.registerCoreApi();
    this.registerPluginApis();

    // Finally, log any errors
    this.app.use((err, req, res, next) => {
      /* eslint-disable-next-line no-console */
      console.error(err);
      next(err);
    });
  }

  registerPages() {
    this.app.get('/', (req, res) => {
      return this._sendPage(req, res, 'index', Index, {});
    });

    this.app.get('/login', (req, res) => {
      return this._sendPage(req, res, 'login', Login, {});
    });

    this.app.get('/logout', (req, res) => {
      req.logout();
      return res.redirect('/');
    });

    this.app.get('/complete-password-reset/:passwordResetRequestId', async (req, res) => {
      const resetRequest = await this.userService.getPasswordResetRequestById(req.params.passwordResetRequestId);
      if (!resetRequest) {
        return res.sendStatus(404);
      }

      const initialState = { passwordResetRequestId: resetRequest._id };
      return this._sendPage(req, res, 'complete-password-reset', CompletePasswordReset, initialState);
    });

    this.app.get('/docs', async (req, res) => {
      const initialState = await this.documentService.getLastUpdatedDocuments();
      return this._sendPage(req, res, 'docs', Docs, initialState);
    });

    this.app.get('/docs/:docId', async (req, res) => {
      const doc = await this.documentService.getDocumentById(req.params.docId);
      if (!doc) {
        return res.sendStatus(404);
      }

      const initialState = mapDocToInitialState({ doc });
      return this._sendPage(req, res, 'doc', Doc, initialState);
    });

    this.app.get('/edit/doc/:docId', async (req, res) => {
      const doc = await this.documentService.getDocumentById(req.params.docId);
      if (!doc) {
        return res.sendStatus(404);
      }

      const initialState = mapDocToInitialState({ doc });
      return this._sendPage(req, res, 'edit', Edit, initialState);
    });
  }

  registerCoreApi() {
    this.app.post('/api/v1/users', jsonParser, async (req, res) => {
      const { username, password, email } = req.body;
      const user = await this.userService.createUser(username, password, email);
      const { origin } = requestHelper.getHostInfo(req);
      const verificationLink = `${origin}/complete-registration/${user.verificationCode}`;
      await this.mailService.sendRegistrationVerificationLink(email, verificationLink);
      res.send({ user: this.userService.dbUserToClientUser(user) });
    });

    this.app.post('/api/v1/users/request-password-reset', jsonParser, async (req, res) => {
      const { email } = req.body;
      const user = await this.userService.getUserByEmailAddress(email);
      if (!user) {
        return res.send({});
      }

      const resetRequest = await this.userService.createPasswordResetRequest(user);
      const { origin } = requestHelper.getHostInfo(req);
      const resetCompletionLink = `${origin}/complete-password-reset/${resetRequest._id}`;
      await this.mailService.sendPasswordResetRequestCompletionLink(user.email, resetCompletionLink);
      return res.send({});
    });

    this.app.post('/api/v1/users/complete-password-reset', jsonParser, async (req, res) => {
      const { passwordResetRequestId, password } = req.body;
      const user = await this.userService.completePasswordResetRequest(passwordResetRequestId, password);
      return res.send({ user: user || null });
    });

    this.app.post('/api/v1/users/login', jsonParser, (req, res, next) => {
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

          return res.send({ user: this.userService.dbUserToClientUser(user) });
        });
      })(req, res, next);
    });

    this.app.post('/api/v1/docs', jsonParser, async (req, res) => {
      const { user } = req;
      const { doc, sections } = req.body;
      const docRevision = await this.documentService.createDocumentRevision({ doc, sections, user });
      const initialState = mapDocToInitialState({ doc: docRevision });
      return res.send(initialState);
    });

    this.app.get('/api/v1/cdn/objects', jsonParser, async (req, res) => {
      const prefix = req.query.prefix;
      const recursive = parseBool(req.query.recursive);
      const objects = await this.cdn.listObjects({ prefix, recursive });
      return res.send({ objects });
    });

    this.app.post('/api/v1/cdn/objects', multipartParser.array('files'), async (req, res) => {
      if (req.files && req.files.length) {
        const uploads = req.files.map(file => this.cdn.uploadObject(req.body.prefix + file.originalname, file.path, {}));
        await Promise.all(uploads);
      } else if (req.body.prefix && req.body.prefix[req.body.prefix.length - 1] === '/') {
        // Just create a folder
        this.cdn.uploadEmptyObject(req.body.prefix, {});
      }

      return res.send({});
    });
  }

  registerPluginApis() {
    this.apis = this.apiFactory.getRegisteredTypes().map(pluginType => {
      const router = express.Router();
      const pathPrefix = `/plugins/${pluginType}`;
      const api = this.apiFactory.createApi(pluginType, pathPrefix);
      api.registerRoutes(router);
      this.app.use(pathPrefix, router);
      return api;
    });
  }

  _sendPage(req, res, bundleName, PageComponent, initialState) {
    const language = LANGUAGE;
    const { container, clientSettings } = this;
    const request = requestHelper.expressReqToRequest(req);
    const user = this.userService.dbUserToClientUser(req.user);
    const props = { request, user, container, initialState, language, PageComponent };
    const elem = React.createElement(Root, props);
    resetServerContext();
    const html = ReactDOMServer.renderToString(elem);
    const pageHtml = renderPageTemplate({ bundleName, request, user, initialState, clientSettings, html });
    return res.type('html').send(pageHtml);
  }

  listen(cb) {
    return this.app.listen(this.serverSettings.port, err => err ? cb(err) : cb(null, this.serverSettings.port));
  }
}

module.exports = ElmuServer;
