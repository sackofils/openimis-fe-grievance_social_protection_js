/* eslint-disable react/destructuring-assignment */
/* eslint-disable no-underscore-dangle */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/no-did-update-set-state */
import React, { Component, Fragment } from 'react';
import { injectIntl, FormattedMessage } from 'react-intl';
import { connect } from 'react-redux';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import {
  Form,
  formatMessageWithValues,
  journalize,
  ProgressOrError,
  withModulesManager,
  formatMessage,
} from '@openimis/fe-core';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
  Checkbox,
  Typography,
  Button,
  Card,
  CardContent,
  CardHeader,
} from '@material-ui/core';
import { bindActionCreators } from 'redux';
import {
  clearTicket,
  fetchComments,
  fetchGrievanceConfiguration,
  fetchTicket,
  reopenTicket,
  fetchDeathDossier,
  updateDeathDossier,
} from '../actions';
import { ticketLabel } from '../utils/utils';
import EditTicketPage from '../pages/EditTicketPage';
import AddTicketPage from '../pages/AddTicketPage';
import TicketCommentPanel from './TicketCommentsPanel';
import { MODULE_NAME, TICKET_STATUSES } from '../constants';

class TicketForm extends Component {
  constructor(props) {
    super(props);
    this.state = {
      lockNew: false,
      reset: 0,
      ticketUuid: null,
      ticket: this._newTicket(),
    };
  }

  componentDidMount() {
    this.props.fetchGrievanceConfiguration();
    if (this.props.ticketUuid) {
      this.setState({ ticketUuid: this.props.ticketUuid });
    }
  }

  componentWillUnmount() {
    this.props.clearTicket();
  }

  componentDidUpdate(prevProps, prevState) {
    const { intl } = this.props;

    if (prevState.ticket.ticketCode !== this.state.ticket.ticketCode) {
      document.title = formatMessageWithValues(intl, MODULE_NAME, 'ticket.title.bar', {
        label: ticketLabel(this.state.ticket),
      });
    }

    if (
      prevProps.fetchedTicket !== this.props.fetchedTicket &&
      this.props.fetchedTicket &&
      this.props.ticket
    ) {
      this.setState({ ticket: { ...this.props.ticket }, ticketUuid: this.props.ticket.id, lockNew: false });
      if (this.props.ticket?.id) this.props.fetchDeathDossier(this.props.ticket.id);
    } else if (prevState.ticketUuid !== this.state.ticketUuid) {
      const filters = [`id: "${this.state.ticketUuid}"`];
      if (this.props.ticketVersion) filters.push(`ticketVersion: ${this.props.ticketVersion}`);
      this.props.fetchTicket(this.props.modulesManager, filters);
    } else if (prevProps.ticketUuid && !this.props.ticketUuid) {
      this.setState({ ticket: this._newTicket(), lockNew: false, ticketUuid: null });
    } else if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      this.setState((state) => ({ reset: state.reset + 1 }));
      if (this.props.ticket?.id) {
        this.props.fetchTicket(this.props.modulesManager, [`id: "${this.state.ticketUuid}"`]);
        this.props.fetchDeathDossier(this.props.ticket.id);
      }
    }
  }

  _newTicket() {
    return {};
  }

  reload = () => {
    this.props.fetchComments(this.state.ticket);
  };

  canSave = () => {
    const { ticket } = this.state;
    if (!ticket.reporter || !ticket.category) return false;
    return true;
  };

  _save = (ticket) => {
    this.setState({ lockNew: !ticket.uuid }, () => this.props.save(ticket));
  };

  onEditedChanged = (ticket) => {
    this.setState({ ticket });
  };

  reopenTicket = () => {
    const { intl, ticket } = this.props;
    this.props.reopenTicket(ticket.id, formatMessage(intl, MODULE_NAME, 'reopenTicket.mutation.label'));
  };

  handleToggleDossier = (key) => {
    const { ticket, deathDossier } = this.props;
    if (!ticket?.id || !deathDossier) return;
    const updated = { ...deathDossier, [key]: !deathDossier[key] };
    this.props.updateDeathDossier(ticket.id, updated);
  };

  renderDeathDossierPanel() {
    const { intl, deathDossier, fetchingDeathDossier } = this.props;
    if (!deathDossier) return null;

    const docs = [
      {
        key: 'certificat_deces',
        label: formatMessage(intl, MODULE_NAME, 'deathDossier.certificatDeces'),
        url: deathDossier.file_certificat_deces_url,
      },
      {
        key: 'pv_remplacant',
        label: formatMessage(intl, MODULE_NAME, 'deathDossier.pvRemplacant'),
        url: deathDossier.file_pv_remplacant_url,
      },
      {
        key: 'id_nouveau_beneficiaire',
        label: formatMessage(intl, MODULE_NAME, 'deathDossier.idNouveauBeneficiaire'),
        url: deathDossier.file_id_nouveau_beneficiaire_url,
      },
      {
        key: 'fiche_engagement',
        label: formatMessage(intl, MODULE_NAME, 'deathDossier.ficheEngagement'),
        url: deathDossier.file_fiche_engagement_url,
      },
    ];

    const complete = deathDossier.complete || Object.values(deathDossier).every((v) => v === true);

    return (
      <Card style={{ marginBottom: 16 }}>
        <CardHeader
          title={formatMessage(intl, MODULE_NAME, 'deathDossier.title')}
          subheader={
            complete
              ? formatMessage(intl, MODULE_NAME, 'deathDossier.complete')
              : formatMessage(intl, MODULE_NAME, 'deathDossier.incomplete')
          }
          style={{
            backgroundColor: complete ? '#e8f5e9' : '#ffebee',
            color: complete ? '#388e3c' : '#d32f2f',
          }}
        />
        <CardContent>
          <Table>
            <TableBody>
              {docs.map((d) => (
                <TableRow key={d.key}>
                  <TableCell>{d.label}</TableCell>
                  <TableCell align="center">
                    <Checkbox
                      checked={!!deathDossier[d.key]}
                      onChange={() => this.handleToggleDossier(d.key)}
                      disabled={fetchingDeathDossier}
                      color="primary"
                    />
                  </TableCell>
                  <TableCell align="center">
                    {d.url ? (
                      <Button href={d.url} target="_blank" color="primary">
                        <FormattedMessage id="deathDossier.download" defaultMessage="Télécharger" />
                      </Button>
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        <FormattedMessage id="deathDossier.noFile" defaultMessage="Aucun fichier" />
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  render() {
    const { fetchingTicket, fetchedTicket, errorTicket, save, back, ticket } = this.props;
    const { lockNew, reset, update, overview, ticketUuid } = this.state;
    const readOnly = lockNew || !!ticket?.validityTo || this.props.readOnly;

    const actions = [
      {
        doIt: this.reopenTicket,
        icon: <LockOpenIcon />,
        onlyIfDirty: ticket?.status !== TICKET_STATUSES.CLOSED,
        disabled: ticket?.isHistory,
      },
    ];

    const isDeathCase =
      ticket?.category === 'Décès' || (ticket?.flags && ticket.flags.includes('DECES'));

    const panels = ticketUuid
      ? [EditTicketPage, ...(isDeathCase ? [() => this.renderDeathDossierPanel()] : []), TicketCommentPanel]
      : [AddTicketPage];

    return (
      <Fragment>
        <ProgressOrError progress={fetchingTicket} error={errorTicket} />
        {(!!fetchedTicket || !ticketUuid) && (
          <Form
            module={MODULE_NAME}
            edited_id={ticketUuid}
            edited={ticket}
            reset={reset}
            update={update}
            title="ticket.title.bar"
            titleParams={{ label: ticketLabel(this.state.ticket) }}
            back={back}
            save={save ? this._save : null}
            canSave={this.canSave}
            reload={(ticketUuid || readOnly) && this.reload}
            readOnly={readOnly}
            overview={overview}
            Panels={panels}
            onEditedChanged={this.onEditedChanged}
            actions={actions}
          />
        )}
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  fetchingTicket: state.grievanceSocialProtection.fetchingTicket,
  errorTicket: state.grievanceSocialProtection.errorTicket,
  fetchedTicket: state.grievanceSocialProtection.fetchedTicket,
  ticket: state.grievanceSocialProtection.ticket,
  submittingMutation: state.grievanceSocialProtection.submittingMutation,
  mutation: state.grievanceSocialProtection.mutation,
  grievanceConfig: state.grievanceSocialProtection.grievanceConfig,
  deathDossier: state.grievanceSocialProtection.deathDossier,
  fetchingDeathDossier: state.grievanceSocialProtection.fetchingDeathDossier,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      fetchTicket,
      fetchComments,
      reopenTicket,
      fetchGrievanceConfiguration,
      clearTicket,
      journalize,
      fetchDeathDossier,
      updateDeathDossier,
    },
    dispatch
  );

export default withModulesManager(connect(mapStateToProps, mapDispatchToProps)(injectIntl(TicketForm)));
