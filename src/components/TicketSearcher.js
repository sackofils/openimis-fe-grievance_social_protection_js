/* eslint-disable no-nested-ternary */
/* eslint-disable no-undef */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable class-methods-use-this */
import React, { Component, Fragment } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { injectIntl } from 'react-intl';
import { IconButton, Tooltip } from '@material-ui/core';
import { withStyles, withTheme } from '@material-ui/core/styles';
import {
  coreConfirm,
  formatMessageWithValues,
  journalize,
  Searcher,
  withHistory,
  withModulesManager,
  PublishedComponent,
  formatMessage,
  historyPush,
  decodeId,
} from '@openimis/fe-core';
import EditIcon from '@material-ui/icons/Edit';
// import AddIcon from '@material-ui/icons/Add';
import { MODULE_NAME, RIGHT_TICKET_EDIT } from '../constants';
import { fetchTicketSummaries, resolveTicket } from '../actions';
import { isEmptyObject } from '../utils/utils';

import TicketFilter from './TicketFilter';
import EnquiryDialog from './EnquiryDialog';

const styles = (theme) => ({
  paper: {
    ...theme.paper.paper,
    margin: 0,
  },
  paperHeader: {
    ...theme.paper.header,
    padding: 10,
  },
  tableTitle: theme.table.title,
  fab: theme.fab,
  button: {
    margin: theme.spacing(1),
  },
  item: {
    padding: theme.spacing(1),
  },
});

class TicketSearcher extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enquiryOpen: false,
      // open: false,
      chfid: null,
      confirmedAction: null,
      reset: 0,
      showHistoryFilter: false,
      displayVersion: false,
    };
    this.rowsPerPageOptions = props.modulesManager.getConf(
      'fe-grievance_social_protection',
      'ticketFilter.rowsPerPageOptions',
      [10, 20, 50, 100],
    );
    this.defaultPageSize = props.modulesManager.getConf(
      'fe-grievance_social_protection',
      'ticketFilter.defaultPageSize',
      10,
    );
  }

  // eslint-disable-next-line no-unused-vars
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ reset: prevState.reset + 1 });
    } else if (!prevProps.confirmed && this.props.confirmed) {
      this.state.confirmedAction();
    }
  }

  fetch = (prms) => {
    const { showHistoryFilter } = this.state;
    this.setState({ displayVersion: showHistoryFilter });
    this.props.fetchTicketSummaries(
      this.props.modulesManager,
      prms,
    );
  };

  rowIdentifier = (r) => r.uuid;

  isShowHistory = () => this.state.displayVersion;

  filtersToQueryParams = (state) => {
    const prms = Object.keys(state.filters)
      .filter((f) => !!state.filters[f].filter)
      .map((f) => state.filters[f].filter);
    prms.push(`first: ${state.pageSize}`);
    if (state.afterCursor) {
      prms.push(`after: "${state.afterCursor}"`);
    }
    if (state.beforeCursor) {
      prms.push(`before: "${state.beforeCursor}"`);
    }
    if (state.orderBy) {
      prms.push(`orderBy: ["${state.orderBy}"]`);
    }
    return prms;
  };

  headers = () => [
    'tickets.code',
    'tickets.title',
    'tickets.beneficary',
    'tickets.priority',
    'tickets.status',
    'tickets.category',
    this.isShowHistory() ? 'tickets.version' : '',
  ];

  sorts = () => [
    ['code', true],
    ['title', true],
    ['reporter_id', true],
    ['priority', true],
    ['status', true],
    ['category', true],
    ['version', true],
  ];

  itemFormatters = () => {
    const formatters = [
      (ticket) => ticket.code,
      (ticket) => ticket.title,
      (ticket) => {
        const reporter = typeof ticket.reporter === 'object'
          ? ticket.reporter : JSON.parse(JSON.parse(ticket.reporter || '{}') || '{}');
        let picker = '';
        if (ticket.reporterTypeName === 'individual') {
          picker = (
            <PublishedComponent
              pubRef="individual.IndividualPicker"
              readOnly
              withNull
              label="ticket.reporter"
              required
              value={
                reporter !== undefined
                && reporter !== null ? (isEmptyObject(reporter)
                    ? null : reporter) : null
              }
            />
          );
        }
        if (ticket.reporterTypeName === 'beneficiary') {
          picker = (
            <PublishedComponent
              pubRef="socialProtection.BeneficiaryPicker"
              readOnly
              withNull
              label="ticket.reporter"
              required
              value={
                {
                  individual: {
                    firstName: ticket.reporterFirstName,
                    lastName: ticket.reporterLastName,
                    dob: ticket.reporterDob,
                  },
                }
              }
            />
          );
        }
        if (ticket.reporterTypeName === 'user') {
          picker = (
            <PublishedComponent
              pubRef="admin.UserPicker"
              readOnly
              value={
                reporter !== undefined
                && reporter !== null ? (isEmptyObject(reporter)
                    ? null : reporter) : null
              }
              module="core"
              label="ticket.reporter"
            />
          );
        }
        if (ticket.reporterTypeName === null) {
          picker = `${formatMessage(this.props.intl, MODULE_NAME, 'anonymousUser')}`;
        }
        return picker;
      },
      (ticket) => ticket.priority,
      (ticket) => {
          const translated = formatMessage(this.props.intl, MODULE_NAME, `status.${ticket.status}`, null, ticket.status);
          const colors = {
            OPEN: '#1976d2',
            IN_PROGRESS: '#f9a825',
            RESOLVED: '#388e3c',
            CLOSED: '#616161',
            REJECTED: '#d32f2f',
          };
          return (
            <span style={{
              color: '#fff',
              backgroundColor: colors[ticket.status] || '#999',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
            }}>
              {translated}
            </span>
          );
      },
      (ticket) => ticket.category,
      (ticket) => (this.isShowHistory() ? ticket?.version : null),
    ];

    if (this.props.rights.includes(RIGHT_TICKET_EDIT)) {
      formatters.push((ticket) => (
        <Tooltip title={formatMessage(this.props.intl, MODULE_NAME, 'editButtonTooltip')}>
          <IconButton
            disabled={ticket?.isHistory}
            onClick={() => {
              historyPush(
                this.props.modulesManager,
                this.props.history,
                'grievanceSocialProtection.route.ticket',
                [decodeId(ticket.id)],
                false,
              );
            }}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      ));
    }
    return formatters;
  };

  rowDisabled = (selection, i) => !!i.validityTo;

  rowLocked = (selection, i) => !!i.clientMutationId;

  render() {
    const {
      intl,
      tickets, ticketsPageInfo, fetchingTickets, fetchedTickets, errorTickets,
      filterPaneContributionsKey, cacheFiltersKey, onDoubleClick,
    } = this.props;

    const count = ticketsPageInfo.totalCount;

    const filterPane = ({ filters, onChangeFilters }) => (
      <TicketFilter
        filters={filters}
        onChangeFilters={onChangeFilters}
        setShowHistoryFilter={(showHistoryFilter) => this.setState({ showHistoryFilter })}
      />
    );

    return (
      <>
        <EnquiryDialog
          open={this.state.enquiryOpen}
          chfid={this.state.chfid}
          onClose={() => {
            this.setState({ enquiryOpen: false, chfid: null });
          }}
        />
        <Searcher
          module={MODULE_NAME}
          cacheFiltersKey={cacheFiltersKey}
          FilterPane={filterPane}
          filterPaneContributionsKey={filterPaneContributionsKey}
          items={tickets}
          itemsPageInfo={ticketsPageInfo}
          fetchingItems={fetchingTickets}
          fetchedItems={fetchedTickets}
          errorItems={errorTickets}
          tableTitle={formatMessageWithValues(intl, MODULE_NAME, 'ticketSummaries', { count })}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          fetch={this.fetch}
          rowIdentifier={this.rowIdentifier}
          filtersToQueryParams={this.filtersToQueryParams}
          defaultOrderBy="-dateCreated"
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          sorts={this.sorts}
          rowDisabled={this.rowDisabled}
          rowLocked={this.rowLocked}
          onDoubleClick={(i) => !i.clientMutationId && onDoubleClick(i)}
          reset={this.state.reset}
        />
      </>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
  tickets: state.grievanceSocialProtection.tickets,
  ticketsPageInfo: state.grievanceSocialProtection.ticketsPageInfo,
  fetchingTickets: state.grievanceSocialProtection.fetchingTickets,
  fetchedTickets: state.grievanceSocialProtection.fetchedTickets,
  errorTickets: state.grievanceSocialProtection.errorTickets,
  submittingMutation: state.grievanceSocialProtection.submittingMutation,
  mutation: state.grievanceSocialProtection.mutation,
  confirmed: state.core.confirmed,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchTicketSummaries, resolveTicket, journalize, coreConfirm,
  },
  dispatch,
);

export default withModulesManager(
  withHistory(
    connect(mapStateToProps, mapDispatchToProps)(injectIntl(withTheme(withStyles(styles)(TicketSearcher)))),
  ),
);
