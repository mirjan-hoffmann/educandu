import React from 'react';
import Page from '../page';
import autoBind from 'auto-bind';
import PropTypes from 'prop-types';
import urls from '../../utils/urls';
import ElmuLogo from '../elmu-logo';
import Logger from '../../common/logger';
import { Form, Input, Button } from 'antd';
import { inject } from '../container-context';
import errorHelper from '../../ui/error-helper';
import { withRequest } from '../request-context';
import UserApiClient from '../../services/user-api-client';
import { requestProps } from '../../ui/default-prop-types';

const logger = new Logger(__filename);

const FormItem = Form.Item;

const GENERIC_LOGIN_ERROR = 'Die Anmeldung ist fehlgeschlagen. Bitte überprüfen Sie Ihre Eingabe.';

class Login extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
    this.formRef = React.createRef();
    this.state = {
      loginError: null
    };
  }

  async login({ username, password }) {
    try {
      const { userApiClient } = this.props;
      const { user } = await userApiClient.login({ username, password });

      if (user) {
        this.redirectAfterLogin();
      } else {
        this.formRef.current.resetFields();
        this.showLoginError();
      }
    } catch (error) {
      errorHelper.handleApiError(error, logger);
    }
  }

  redirectAfterLogin() {
    const { request } = this.props;
    window.location = request.query.redirect || urls.getDefaultLoginRedirectUrl();
  }

  clearLoginError() {
    this.setState({ loginError: null });
  }

  showLoginError() {
    this.setState({ loginError: GENERIC_LOGIN_ERROR });
  }

  handleFinish(values) {
    this.clearLoginError();
    const { username, password } = values;
    this.login({ username, password });
  }

  render() {
    const { loginError } = this.state;

    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 8 }
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 16 }
      }
    };

    const tailFormItemLayout = {
      wrapperCol: {
        xs: {
          span: 24,
          offset: 0
        },
        sm: {
          span: 16,
          offset: 8
        }
      }
    };

    const usernameValidationRules = [
      {
        required: true,
        message: 'Bitte geben Sie Ihren Benutzernamen an',
        whitespace: true
      }
    ];

    const passwordValidationRules = [
      {
        required: true,
        message: 'Bitte geben Sie Ihr Kennwort an'
      }
    ];

    const errorMessage = loginError
      ? <div className="LoginPage-errorMessage">{loginError}</div>
      : null;

    const loginForm = (
      <Form ref={this.formRef} onFinish={this.handleFinish} scrollToFirstError>
        <FormItem {...formItemLayout} label="Benutzername" name="username" rules={usernameValidationRules}>
          <Input />
        </FormItem>
        <FormItem {...formItemLayout} label="Kennwort" name="password" rules={passwordValidationRules}>
          <Input type="password" />
        </FormItem>
        <FormItem {...tailFormItemLayout}>
          {errorMessage}
        </FormItem>
        <FormItem {...tailFormItemLayout}>
          <a href={urls.getResetPasswordUrl()}>Kennwort vergessen?</a>
        </FormItem>
        <FormItem {...tailFormItemLayout}>
          <Button type="primary" htmlType="submit">Anmelden</Button>
        </FormItem>
      </Form>
    );

    return (
      <Page fullScreen>
        <div className="LoginPage">
          <div className="LoginPage-title">
            <ElmuLogo size="big" readonly />
          </div>
          <div className="LoginPage-form">
            {loginForm}
          </div>
        </div>
      </Page>
    );
  }
}

Login.propTypes = {
  ...requestProps,
  userApiClient: PropTypes.instanceOf(UserApiClient).isRequired
};

export default withRequest(inject({
  userApiClient: UserApiClient
}, Login));