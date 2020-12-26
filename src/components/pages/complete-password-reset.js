import React from 'react';
import Page from '../page';
import autoBind from 'auto-bind';
import PropTypes from 'prop-types';
import urls from '../../utils/urls';
import ElmuLogo from '../elmu-logo';
import Countdown from '../countdown';
import Logger from '../../common/logger';
import { Form, Input, Button } from 'antd';
import { inject } from '../container-context';
import errorHelper from '../../ui/error-helper';
import UserApiClient from '../../services/user-api-client';

const logger = new Logger(__filename);

const FormItem = Form.Item;

class CompletePasswordReset extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);
    this.state = {
      user: null
    };
  }

  async completePasswordReset(password) {
    try {
      const { userApiClient, initialState } = this.props;
      const { passwordResetRequestId } = initialState;
      const { user } = await userApiClient.completePasswordReset({ passwordResetRequestId, password });
      this.setState({ user });
    } catch (error) {
      errorHelper.handleApiError(error, logger);
    }
  }

  handleFinish(values) {
    const { password } = values;
    this.completePasswordReset(password);
  }


  render() {
    const { user } = this.state;

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

    const passwordValidationRules = [
      {
        required: true,
        message: 'Bitte geben Sie hier ein Kennwort an'
      }
    ];

    const passwordConfirmationValidationRules = [
      {
        required: true,
        message: 'Bitte bestätigen Sie Ihr Kennwort'
      },
      ({ getFieldValue }) => ({
        validator: (rule, value) => {
          const otherPassword = getFieldValue('password');
          return value && value !== otherPassword
            ? Promise.reject(new Error('Die Kennwörter stimmen nicht überein'))
            : Promise.resolve();
        }
      })
    ];

    const completionForm = (
      <div className="CompletePasswordResetPage-form">
        <Form onFinish={this.handleFinish} scrollToFirstError>
          <FormItem {...formItemLayout} label="Kennwort" name="password" rules={passwordValidationRules}>
            <Input type="password" />
          </FormItem>
          <FormItem {...formItemLayout} label="Kennwortbestätigung" name="confirm" rules={passwordConfirmationValidationRules} dependencies={['password']}>
            <Input type="password" />
          </FormItem>
          <FormItem {...tailFormItemLayout}>
            <Button type="primary" htmlType="submit">Passwort speichern</Button>
          </FormItem>
        </Form>
      </div>
    );

    const countdown = (
      <Countdown
        seconds={10}
        isRunning={!!user}
        onComplete={() => {
          window.location = urls.getLoginUrl();
        }}
        />
    );

    const completionConfirmation = (
      <div className="CompletePasswordResetPage-confirmation">
        <p>Ihr Kennwort wurde erfolgreich geändert.</p>
        <p>Sie werden in {countdown} auf die <a href={urls.getLoginUrl()}>Anmeldeseite</a> weitergeleitet.</p>
      </div>
    );

    return (
      <Page fullScreen>
        <div className="CompletePasswordResetPage">
          <div className="CompletePasswordResetPage-title">
            <ElmuLogo size="big" readonly />
          </div>
          {user ? completionConfirmation : completionForm}
        </div>
      </Page>
    );
  }
}

CompletePasswordReset.propTypes = {
  initialState: PropTypes.shape({
    passwordResetRequestId: PropTypes.string.isRequired
  }).isRequired,
  userApiClient: PropTypes.instanceOf(UserApiClient).isRequired
};

export default inject({
  userApiClient: UserApiClient
}, CompletePasswordReset);