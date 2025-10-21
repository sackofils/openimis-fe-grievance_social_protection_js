/* eslint-disable react/destructuring-assignment */
import React, { Component } from "react";
import { connect } from "react-redux";
import { injectIntl } from "react-intl";
import { withTheme, withStyles } from "@material-ui/core/styles";
import {
  Fab,
  Menu,
  MenuItem,
  Typography,
  Grid,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@material-ui/core";
import AddIcon from "@material-ui/icons/Add";
import OpenInNewIcon from "@material-ui/icons/OpenInNew";
import DescriptionIcon from "@material-ui/icons/Description";
import {
  historyPush,
  withModulesManager,
  withHistory,
  decodeId,
  formatMessage,
} from "@openimis/fe-core";

import TicketSearcher from "../components/TicketSearcher";
import { MODULE_NAME, RIGHT_TICKET_ADD } from "../constants";

const styles = (theme) => ({
  page: {
    ...theme.page,
    padding: theme.spacing(2),
    [theme.breakpoints.down("sm")]: {
      padding: theme.spacing(1),
    },
  },
  fab: {
    position: "fixed",
    bottom: theme.spacing(3),
    right: theme.spacing(10),
    [theme.breakpoints.down("sm")]: {
      bottom: theme.spacing(2),
      right: theme.spacing(2),
    },
  },
  menuItemIcon: {
    marginRight: theme.spacing(1),
    color: theme.palette.primary.main,
  },
  header: {
    marginBottom: theme.spacing(2),
  },
});

class TicketsPage extends Component {
  state = {
    anchorEl: null,
    noKoboDialogOpen: false,
  };

  onDoubleClick = (ticket, newTab = false) => {
    const routeParams = ["grievanceSocialProtection.route.ticket", [decodeId(ticket.id)]];
    if (ticket?.isHistory) {
      routeParams[1].push(ticket.version);
    }
    historyPush(this.props.modulesManager, this.props.history, ...routeParams, newTab);
  };

  handleMenuOpen = (event) => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleMenuClose = () => {
    this.setState({ anchorEl: null });
  };

  handleNative = () => {
    this.handleMenuClose();
    historyPush(this.props.modulesManager, this.props.history, "grievanceSocialProtection.route.ticket");
  };

  handleKobo = () => {
    const { grievanceConfig } = this.props;
    const url = grievanceConfig?.koboTicketFormUrl;
    this.handleMenuClose();
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      this.setState({ noKoboDialogOpen: true });
    }
  };

  closeNoKoboDialog = () => {
    this.setState({ noKoboDialogOpen: false });
  };

  render() {
    const { intl, classes, rights } = this.props;
    const { anchorEl, noKoboDialogOpen } = this.state;

    return (
      <div className={classes.page}>
        <TicketSearcher
          cacheFiltersKey="ticketPageFiltersCache"
          onDoubleClick={this.onDoubleClick}
        />

        {rights.includes(RIGHT_TICKET_ADD) && (
          <>
            <Tooltip title={formatMessage(intl, MODULE_NAME, "addNewticketTooltip")}>
              <Fab color="primary" className={classes.fab} onClick={this.handleMenuOpen}>
                <AddIcon />
              </Fab>
            </Tooltip>

            <Menu
              anchorEl={anchorEl}
              keepMounted
              open={Boolean(anchorEl)}
              onClose={this.handleMenuClose}
            >
              <MenuItem onClick={this.handleNative}>
                <DescriptionIcon className={classes.menuItemIcon} />
                {formatMessage(intl, MODULE_NAME, "ticket.menu.createNative")}
              </MenuItem>
              <MenuItem onClick={this.handleKobo}>
                <OpenInNewIcon className={classes.menuItemIcon} />
                {formatMessage(intl, MODULE_NAME, "ticket.menu.openKobo")}
              </MenuItem>
            </Menu>
          </>
        )}

        {/* Dialog “Aucune URL Kobo configurée !” */}
        <Dialog
          open={noKoboDialogOpen}
          onClose={this.closeNoKoboDialog}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>
            {formatMessage(intl, MODULE_NAME, "ticket.menu.openKobo")}
          </DialogTitle>
          <DialogContent>
            <Typography>
              {formatMessage(intl, MODULE_NAME, "ticket.menu.openKobo.missing")}
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeNoKoboDialog} color="primary" autoFocus>
              OK
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: state?.core?.user?.i_user?.rights || [],
  grievanceConfig: state.grievanceSocialProtection?.grievanceConfig,
});

export default injectIntl(
  withModulesManager(
    withHistory(
      connect(mapStateToProps)(withTheme(withStyles(styles)(TicketsPage))),
    ),
  ),
);
