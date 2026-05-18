/* eslint-disable no-nested-ternary */
/* eslint-disable no-undef */
/* eslint-disable react/destructuring-assignment */
/* eslint-disable class-methods-use-this */
import React, { Component, Fragment } from "react";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import { injectIntl, FormattedMessage } from "react-intl";
import {
  IconButton,
  Tooltip,
  Button,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  CircularProgress,
  Box, Chip
} from "@material-ui/core";
import { withStyles, withTheme } from "@material-ui/core/styles";
import {
  coreConfirm,
  coreAlert,
  formatMessage,
  formatMessageWithValues,
  journalize,
  Searcher,
  withHistory,
  withModulesManager,
  PublishedComponent,
  historyPush,
  decodeId,
  graphql,
  baseApiUrl,
} from "@openimis/fe-core";
import SelectAllIcon from "@material-ui/icons/DoneAll";
import ClearAllIcon from "@material-ui/icons/ClearAll";
import GetAppIcon from "@material-ui/icons/GetApp";
import ArrowUpwardIcon from "@material-ui/icons/ArrowUpward";
import CheckCircleOutlineIcon from "@material-ui/icons/CheckCircleOutline";

import EditIcon from "@material-ui/icons/Edit";
import { MODULE_NAME, RIGHT_TICKET_EDIT } from "../constants";
import {
  fetchTicketSummaries,
  resolveTicket,
  escalateTicketsBulk,
  resolveTicketsBulk,
  exportSelectedTicketsBulk,
  exportSelectedTicketsREST,
} from "../actions";
import { isEmptyObject } from "../utils/utils";
import TicketFilter from "./TicketFilter";
import EnquiryDialog from "./EnquiryDialog";

const styles = (theme) => ({
  groupButtons: {
    marginBottom: theme.spacing(1),
    "& > *": { marginRight: theme.spacing(1) },
  },
});

const FULL_ACCESS_ROLES = ["CNGR", "DEVOPS", "SAUVEGARDES", "SAUVEGARDE"];
// Seuils SLA (personnalisables)
const DEFAULT_SLA_DAYS = 21;
const SPECIAL_SLA_DAYS = 60;
const WARN_WINDOW = 3;

function parseDate(d) {
  if (!d) return null;
  // Supporte "YYYY-MM-DD" ou ISO
  const dt = new Date(d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function diffDays(a, b) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

function getSlaConfig(ticket) {
  const category = String(ticket?.category || "").trim().toLowerCase();

  if (category.includes("cas sensibles")) {
    return { slaDays: null, label: "Sans limite" };
  }

  if (category.includes("speciaux") || category.includes("spéciaux")) {
    return { slaDays: SPECIAL_SLA_DAYS, label: `${SPECIAL_SLA_DAYS} j` };
  }

  return { slaDays: DEFAULT_SLA_DAYS, label: `${DEFAULT_SLA_DAYS} j` };
}

/**
 * Calcule les métriques SLA pour une ligne ticket.
 * Basé sur jsonExt.submitted_at + SLA selon la catégorie.
 */
function computeSla(ticket) {
  const now = new Date();
  const { slaDays, label: slaLabel } = getSlaConfig(ticket);

  // On récupère submitted_at depuis jsonExt
  let submittedAt = null;
  try {
    const json =
      typeof ticket.jsonExt === "string" ? JSON.parse(ticket.jsonExt) : ticket.jsonExt;
    if (json?.submitted_at) submittedAt = new Date(json.submitted_at);
  } catch (e) {
    console.warn("Erreur parse jsonExt", e);
  }

  // fallback si pas de submitted_at → on prend dateCreated
  if (!submittedAt || Number.isNaN(submittedAt.getTime())) {
    submittedAt = new Date(ticket.dateCreated);
  }

  // Calcule jours écoulés et restants
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  const daysOpen = Math.floor((now - submittedAt) / MS_PER_DAY);
  const dueAt =
    typeof slaDays === "number"
      ? new Date(submittedAt.getTime() + slaDays * MS_PER_DAY)
      : null;
  const daysToDue =
    dueAt ? Math.floor((dueAt.getTime() - now.getTime()) / MS_PER_DAY) : null;

  // Détermination de l’état
  let state = "ok";
  let reason = typeof slaDays === "number" ? "Dans les délais" : "Pas de limite SLA";

  const isResolved = ["RESOLVED", "CLOSED"].includes(ticket?.status);

  if (!isResolved && dueAt) {
    if (now > dueAt) {
      state = "overdue";
      reason = `Dépassement de ${Math.abs(daysToDue)} j`;
    } else if (daysToDue <= WARN_WINDOW) {
      state = "warning";
      reason = `Échéance dans ${daysToDue} j`;
    }
  }
  return {
    daysOpen,
    daysToDue,
    dueAt,
    state,
    reason,
    submittedAt,
    slaDays,
    slaLabel,
  };
}

/**
 * Affiche une pastille de SLA avec le nombre de jours écoulés/restants
 * et un tooltip avec l’échéance calculée localement.
 */
function SlaChip({ ticket, classes, intl }) {
  const {
    daysOpen,
    dueAt,
    state,
    reason,
    submittedAt,
    slaDays,
    slaLabel,
  } = computeSla(ticket);

  // Couleurs selon l’état
  let color = "default";
  let style = {};
  if (state === "overdue") {
    color = "secondary";
    style = { background: "#ffdddd", color: "#b00020" };
  } else if (state === "warning") {
    color = "default";
    style = { background: "#fff4e5", color: "#8a4b00" };
  } else {
    color = "primary";
    style = { background: "#e8f5e9", color: "#1b5e20" };
  }

  // Libellé du chip
  const label = (() => {
    const parts = [];
    if (typeof daysOpen === "number") {
      if (slaDays === null) parts.push(`${slaLabel}`);
      else {
        const displayedDays =
        typeof slaDays === "number" ? Math.min(daysOpen, slaDays) : daysOpen;
        parts.push(`${displayedDays} j`);
      }
    }
    if (!parts.length) parts.push("—");
    return parts.join(" · ");
  })();

  // Tooltip détaillé (avec échéance calculée)
  const tooltip = [
    reason,
    `SLA: ${slaLabel}`,
    dueAt ? `Échéance calculée: ${dueAt.toISOString().split("T")[0]}` : null,
    submittedAt ? `Soumis le: ${submittedAt.toISOString().split("T")[0]}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Tooltip title={tooltip} arrow>
      <Chip
        size="small"
        label={label}
        style={style}
        className={classes.chip}
        variant="default"
        color={color}
      />
    </Tooltip>
  );
}

class TicketSearcher extends Component {
  constructor(props) {
    super(props);
    this.state = {
      enquiryOpen: false,
      chfid: null,
      confirmedAction: null,
      reset: 0,
      showHistoryFilter: false,
      displayVersion: false,
      selectedIds: [],
      selectAllMode: false,
      groupDialogOpen: false,
      groupDialogType: null,
      message: "",
      exporting: false,
      escalating: false,
    };
    this.rowsPerPageOptions = props.modulesManager.getConf(
      MODULE_NAME,
      "ticketFilter.rowsPerPageOptions",
      [10, 20, 50, 100],
    );
    this.defaultPageSize = props.modulesManager.getConf(
      MODULE_NAME,
      "ticketFilter.defaultPageSize",
      10,
    );
    this.searcher = null;
    this.lastParameter = null;
  }

  componentDidUpdate(prevProps) {
    const { submittingMutation, mutation, journalize } = this.props;

    // Journalisation standard
    if (prevProps.submittingMutation && !submittingMutation) {
      journalize(mutation);
    }
  }

  fetch = (prms) => {
    const { showHistoryFilter } = this.state;
    this.setState({ displayVersion: showHistoryFilter });
    this.lastParameter = prms;
    this.props.fetchTicketSummaries(this.props.modulesManager, prms);
  };

  rowIdentifier = (r) => r.uuid;
  isShowHistory = () => this.state.displayVersion;

  filtersToQueryParams = (state) => {
    const prms = Object.keys(state.filters)
      .filter((f) => !!state.filters[f].filter)
      .map((f) => state.filters[f].filter);
    prms.push(`first: ${state.pageSize}`);
    if (state.afterCursor) prms.push(`after: "${state.afterCursor}"`);
    if (state.beforeCursor) prms.push(`before: "${state.beforeCursor}"`);
    if (state.orderBy) prms.push(`orderBy: ["${state.orderBy}"]`);
    return prms;
  };

  toggleSelectOne = (id) => {
    this.setState((prev) => ({
      selectedIds: prev.selectedIds.includes(id)
        ? prev.selectedIds.filter((x) => x !== id)
        : [...prev.selectedIds, id],
    }));
  };

  toggleSelectAllButton = () => {
    const { tickets = [] } = this.props;
    const { selectedIds, selectAllMode } = this.state;
    if (selectedIds.length < tickets.length) {
      // Sélectionner tout
      this.setState({
        selectedIds: tickets.map((t) => t.id),
        selectAllMode: !selectAllMode
      });
    } else {
      // Désélectionner tout
      this.setState({
        selectedIds: [],
        selectAllMode: !selectAllMode,
      });
    }
  };

  canEscalateSelected = () => {
    const { tickets = [] } = this.props;
    const { selectedIds } = this.state;

    // Récupère les rôles de l'utilisateur connecté
    const roles = (this.props.userRoles || []).map((r) => r.toUpperCase());
    const fullAccessRoles = FULL_ACCESS_ROLES;
    const isSuperAdmin =
      this.props.isSuperAdmin || roles.some((r) => fullAccessRoles.includes(r));

    // Les superadmins peuvent tout escalader
    if (isSuperAdmin) return true;

    // Liste des tickets sélectionnés
    const selectedTickets = tickets.filter((t) => selectedIds.includes(t.id));

    // Pour chaque ticket sélectionné, on vérifie le rôle du workflow
    return selectedTickets.every((t) => {
      let ticketRole = null;
      try {
        const json =
          typeof t.jsonExt === "string" ? JSON.parse(t.jsonExt) : t.jsonExt;
        ticketRole = json?.workflow?.assignee_role?.toUpperCase?.() || "";
      } catch (e) {
        console.warn("Erreur JSONExt ticket", t.id, e);
      }
      return roles.includes(ticketRole);
    });
  };

  canResolveSelected = () => {
    const { tickets = [] } = this.props;
    const { selectedIds } = this.state;

    const roles = (this.props.userRoles || []).map((r) => r.toUpperCase());
    const fullAccessRoles = FULL_ACCESS_ROLES;
    const isSuperAdmin =
      this.props.isSuperAdmin || roles.some((r) => fullAccessRoles.includes(r));

    if (isSuperAdmin) return true;

    const selectedTickets = tickets.filter((t) => selectedIds.includes(t.id));
    return selectedTickets.every((t) => {
      let ticketRole = null;
      try {
        const json =
          typeof t.jsonExt === "string" ? JSON.parse(t.jsonExt) : t.jsonExt;
        ticketRole = json?.workflow?.assignee_role?.toUpperCase?.() || "";
      } catch (e) {
        console.warn("Erreur JSONExt ticket", t.id, e);
      }
      return roles.includes(ticketRole);
    });
  };

  openGroupDialog = (type) => {
    this.setState({ groupDialogOpen: true, groupDialogType: type });
  };

  closeGroupDialog = () => {
    this.setState({
      groupDialogOpen: false,
      groupDialogType: null,
      message: "",
    });
  };

handleExport = async (arg = false) => {
  const dryRun = typeof arg === "boolean" ? arg : false;
  const { selectedIds, selectAllMode } = this.state;

  if (!selectAllMode && (!selectedIds || !selectedIds.length)) {
    coreAlert("Veuillez sélectionner au moins une plainte à exporter.", "warning");
    return;
  }

  this.setState({ exporting: true });

  try {
    let data;

    // MODE GLOBAL
    if (selectAllMode) {
      // Utiliser la vraie source des filtres
      const cleanFilters = (this.lastParameter || [])
        .filter((p) => typeof p === "string")   // sécurité
        .filter((p) => !p.startsWith("first"))  // on enlève pagination
        .filter((p) => !p.startsWith("after"))
        .filter((p) => !p.startsWith("before"))
        .filter((p) => !p.startsWith("orderBy"));

      console.log("Filters sent to backend:", cleanFilters);

      data = await exportSelectedTicketsREST(
        [],
        dryRun,
        true,
        cleanFilters
      );
    }

    // MODE SELECTION MANUELLE
    else {
      data = await exportSelectedTicketsREST(
        selectedIds,
        dryRun,
        false,
        []
      );
    }

    if (dryRun) {
      coreAlert(`Simulation OK — ${data.count} ticket(s) concernés`, "info");
      return;
    }

    if (data.success && data.files?.length) {
      const urlPart =
        "/grievance_social_protection/grievance/download/export/";

      data.files.forEach((f) => {
        const url = f.startsWith("http")
          ? f
          : `${window.location.origin}${baseApiUrl}${urlPart}${f}/`;

        const link = document.createElement("a");
        link.href = url;
        link.download = url.split("/").pop();
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      });

      coreAlert(`${data.count} ticket(s) exporté(s)`, "success");

      this.setState({
        selectedIds: [],
        selectAllMode: false,
      });
    }
  } catch (e) {
    console.error("Erreur export :", e);
    coreAlert(e.message || "Erreur pendant l’export", "error");
  } finally {
    this.setState({ exporting: false });
  }
};

  onEscalate = () => {
    if (!this.canEscalateSelected()) {
      coreAlert(
        "Vous ne pouvez pas escalader ces tickets (niveau différent).",
        "warning",
      );
      return;
    }
    this.openGroupDialog("ESCALATE");
  };

  onResolve = () => {
    if (!this.canResolveSelected()) {
      coreAlert(
        "Vous ne pouvez pas résoudre ces tickets (niveau différent).",
        "warning",
      );
      return;
    }
    this.openGroupDialog("RESOLVE");
  };

  handleGroupAction = async () => {
    const { selectedIds, message, groupDialogType } = this.state;
    if (!selectedIds.length || !message.trim()) return;

    let response,
      success = false;

    this.setState({ processing: true });
    console.log("searcher", this.searcher);

    try {
      if (groupDialogType === "ESCALATE") {
        response = await this.props.escalateTicketsBulk(selectedIds, message);
        console.log("Escalade response", response);

        if (response?.payload?.data?.escalateTickets?.internalId) {
          coreAlert("Escalade effectuée avec succès !", "success");
          success = true;
        } else {
          coreAlert("Échec de l’escalade des tickets.", "error");
        }
      } else if (groupDialogType === "RESOLVE") {
        response = await this.props.resolveTicketsBulk(selectedIds, message);
        console.log("Résolution response", response);

        if (response?.payload?.data?.resolveTickets?.internalId) {
          coreAlert("Tickets résolus avec succès !", "success");
          success = true;
        } else {
          coreAlert("Échec de la résolution des tickets.", "error");
        }
      }
    } catch (e) {
      console.error("Erreur mutation groupée", e);
      coreAlert("Une erreur s’est produite pendant l’opération.", "error");
    } finally {
      this.setState({ processing: false });
      this.closeGroupDialog();

      // Rafraîchissement du tableau (sans reload)
      if (success) {
        if (this.searcher && this.searcher.state) {
          const {
            filters = {},
            pageSize,
            orderBy,
            afterCursor,
            beforeCursor,
          } = this.searcher.state;

          const prms = Object.keys(filters)
            .filter((f) => !!filters[f].filter)
            .map((f) => filters[f].filter);

          prms.push(`first: ${pageSize}`);
          if (afterCursor) prms.push(`after: "${afterCursor}"`);
          if (beforeCursor) prms.push(`before: "${beforeCursor}"`);
          if (orderBy) prms.push(`orderBy: ["${orderBy}"]`);

          this.fetch(prms);
        } else {
          // fallback : recharge basique sans paramètres
          console.log("lastParameter", this.lastParameters);
          this.props.fetchTicketSummaries(
            this.props.modulesManager,
            this.lastParameter ?? [],
          );
        }
      }
    }
  };

  headers = () => [
    "",
    "tickets.code",
    "tickets.title",
    "tickets.level",
    "tickets.priority",
    "tickets.status",
    "tickets.category",
    "tickets.exportStatus",
    "tickets.sla",
    this.isShowHistory() ? "tickets.version" : "",
    this.props.rights.includes(RIGHT_TICKET_EDIT) ? "" : null,
  ];

  sorts = () => [
    ["code", true],
    ["title", true],
    ["level", true],
    ["priority", true],
    ["status", true],
    ["category", true],
    ["is_exported", true],
    ["sla", true],
    ["version", true],
  ];

  itemFormatters = () => {
    const { selectedIds } = this.state;
    const { intl } = this.props;
    const formatters = [
      (t) => (
        <Checkbox
          checked={selectedIds.includes(t.id)}
          onChange={() => this.toggleSelectOne(t.id)}
          color="primary"
        />
      ),
      (t) => t.code,
      (t) => t.title,
      (t) => JSON.parse(t.jsonExt).workflow.assignee_role,
      (t) => {
        const translated = formatMessage(
          this.props.intl,
          MODULE_NAME,
          `priority.${t.priority}`,
          null,
          t.priority,
        );
        const colors = {
          Low: "#1976d2",
          Normal: "#999",
          High: "#f9a825",
          Critical: "#616161",
        };
        return (
          <span
            style={{
              color: colors[t.priority] || "#999",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.8rem",
            }}
          >
            {translated}
          </span>
        );
      },
      (t) => {
        const translated = formatMessage(
          this.props.intl,
          MODULE_NAME,
          `status.${t.status}`,
          null,
          t.status,
        );
        const colors = {
          OPEN: "#1976d2",
          IN_PROGRESS: "#f9a825",
          RESOLVED: "#388e3c",
          CLOSED: "#616161",
          REJECTED: "#d32f2f",
        };
        return (
          <span
            style={{
              color: "#fff",
              color: colors[t.status] || "#999",
              padding: "2px 8px",
              borderRadius: "12px",
              fontSize: "0.8rem",
            }}
          >
            {translated}
          </span>
        );
      },
      (t) => t.category,
      (t) =>
        t.isExported ? (
          <span
            style={{
              backgroundColor: "#dff0d8",
              color: "#3c763d",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.75rem",
            }}
          >
            <FormattedMessage id="ticket.exported.yes" defaultMessage="Oui" />
          </span>
        ) : (
          <span
            style={{
              backgroundColor: "#f5f5f5",
              color: "#999",
              padding: "2px 6px",
              borderRadius: "4px",
              fontSize: "0.75rem",
            }}
          >
            <FormattedMessage id="ticket.exported.no" defaultMessage="Non" />
          </span>
        ),
      (t) => (
        <Box display="flex" alignItems="center">
          <SlaChip ticket={t} classes={this.props.classes} intl={this.props.intl} />
        </Box>
      ),
      (t) => (this.isShowHistory() ? t?.version : null),
    ];
    if (this.props.rights.includes(RIGHT_TICKET_EDIT)) {
      formatters.push((t) => (
        <Tooltip title={formatMessage(intl, MODULE_NAME, "editButtonTooltip")}>
          <IconButton
            disabled={t?.isHistory}
            onClick={() => {
              historyPush(
                this.props.modulesManager,
                this.props.history,
                "grievanceSocialProtection.route.ticket",
                [decodeId(t.id)],
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

  render() {
    const {
      intl,
      tickets,
      ticketsPageInfo,
      fetchingTickets,
      fetchedTickets,
      errorTickets,
      filterPaneContributionsKey,
      cacheFiltersKey,
      onDoubleClick,
      classes,
    } = this.props;
    const count = ticketsPageInfo.totalCount;

    return (
      <Fragment>
        {/* Tableau principal */}
        {this.state.exporting && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              backgroundColor: "rgba(255,255,255,0.8)",
              zIndex: 2000,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.2rem",
              color: "#1976d2",
            }}
          >
            <CircularProgress color="primary" />
            <div style={{ marginTop: "1rem" }}>
              <FormattedMessage
                id="ticket.exportingPleaseWait"
                defaultMessage="Veuillez patienter, génération du fichier..."
              />
            </div>
          </div>
        )}

        <Searcher
          ref={(ref) => (this.searcher = ref)}
          module={MODULE_NAME}
          cacheFiltersKey={cacheFiltersKey}
          FilterPane={({ filters, onChangeFilters }) => (
            <TicketFilter
              filters={filters}
              onChangeFilters={onChangeFilters}
              setShowHistoryFilter={(s) =>
                this.setState({ showHistoryFilter: s })
              }
            />
          )}
          filterPaneContributionsKey={filterPaneContributionsKey}
          items={tickets || []}
          exportable={false}
          itemsPageInfo={ticketsPageInfo}
          fetchingItems={fetchingTickets}
          fetchedItems={fetchedTickets}
          errorItems={errorTickets}
          tableTitle={formatMessageWithValues(
            intl,
            MODULE_NAME,
            "ticketSummaries",
            { count },
          )}
          rowsPerPageOptions={this.rowsPerPageOptions}
          defaultPageSize={this.defaultPageSize}
          fetch={this.fetch}
          rowIdentifier={this.rowIdentifier}
          filtersToQueryParams={this.filtersToQueryParams}
          defaultOrderBy="-dateCreated"
          headers={this.headers}
          itemFormatters={this.itemFormatters}
          sorts={this.sorts}
          reset={this.state.reset}
          onDoubleClick={(i) => !i.clientMutationId && onDoubleClick(i)}
          enableActionButtons={true}
          searcherActions={[
            {
              label:
                this.state.selectedIds.length <
                (this.props.tickets?.length || 0)
                  ? formatMessage(
                      intl,
                      MODULE_NAME,
                      "ticket.selectAll",
                      "Tout sélectionner",
                    )
                  : formatMessage(
                      intl,
                      MODULE_NAME,
                      "ticket.unselectAll",
                      "Tout désélectionner",
                    ),
              icon:
                this.state.selectedIds.length <
                (this.props.tickets?.length || 0) ? (
                  <SelectAllIcon />
                ) : (
                  <ClearAllIcon />
                ),
              authorized: true,
              onClick: this.toggleSelectAllButton,
              color:
                this.state.selectedIds.length <
                (this.props.tickets?.length || 0)
                  ? "primary"
                  : "default",
              variant:
                this.state.selectedIds.length <
                (this.props.tickets?.length || 0)
                  ? "contained"
                  : "outlined",
            },

            // Exporter (.xlsx)
            {
              label: formatMessage(
                intl,
                MODULE_NAME,
                "ticket.exportSelected",
                "Exporter (.xlsx)",
              ),
              icon: <GetAppIcon />,
              authorized: !!this.state.selectedIds.length,
              onClick: this.handleExport,
              color: "primary",
              variant: "outlined",
              style: { borderColor: "#1976d2", color: "#1976d2" },
            },

            // Escalader
            {
              label: formatMessage(
                intl,
                MODULE_NAME,
                "ticket.escalateSelected",
                "Escalader",
              ),
              icon: <ArrowUpwardIcon />,
              authorized:
                !!this.state.selectedIds.length && this.canEscalateSelected(),
              onClick: () => this.onEscalate(),
              style: {
                borderColor: this.canEscalateSelected() ? "#f57c00" : "#ccc",
                color: this.canEscalateSelected() ? "#f57c00" : "#aaa",
                opacity: this.canEscalateSelected() ? 1 : 0.5,
              },
              variant: "outlined",
            },

            // Résoudre
            {
              label: formatMessage(
                intl,
                MODULE_NAME,
                "ticket.resolveSelected",
                "Résoudre",
              ),
              icon: <CheckCircleOutlineIcon />,
              authorized:
                !!this.state.selectedIds.length && this.canResolveSelected(),
              onClick: () => this.onResolve(),
              style: {
                borderColor: this.canResolveSelected() ? "#388e3c" : "#ccc",
                color: this.canResolveSelected() ? "#388e3c" : "#aaa",
                opacity: this.canResolveSelected() ? 1 : 0.5,
              },
              variant: "outlined",
            },
          ]}
        />

        {/* Dialog groupée */}
        <Dialog
          open={this.state.groupDialogOpen}
          onClose={this.closeGroupDialog}
          fullWidth
        >
          <DialogTitle>
            {this.state.groupDialogType === "ESCALATE" ? (
              <FormattedMessage
                id="ticket.bulkDialogTitleEscalate"
                defaultMessage="Escalade groupée"
              />
            ) : (
              <FormattedMessage
                id="ticket.bulkDialogTitleResolve"
                defaultMessage="Résolution groupée"
              />
            )}
          </DialogTitle>

          <DialogContent>
            <TextField
              label={formatMessage(
                intl,
                MODULE_NAME,
                "ticket.bulkDialogMessageLabel",
                "Message",
              )}
              fullWidth
              multiline
              minRows={3}
              value={this.state.message}
              onChange={(e) => this.setState({ message: e.target.value })}
            />
          </DialogContent>

          <DialogActions>
            <Button
              onClick={this.closeGroupDialog}
              disabled={this.state.processing}
            >
              <FormattedMessage
                id="ticket.bulkDialogCancel"
                defaultMessage="Annuler"
              />
            </Button>

            <Button
              color="primary"
              variant="contained"
              onClick={this.handleGroupAction}
              disabled={!this.state.message.trim() || this.state.processing}
              startIcon={
                this.state.processing ? (
                  <CircularProgress size={20} color="inherit" />
                ) : null
              }
            >
              {this.state.processing ? (
                <FormattedMessage
                  id="ticket.bulkDialogInProgress"
                  defaultMessage="En cours..."
                />
              ) : (
                <FormattedMessage
                  id="ticket.bulkDialogConfirm"
                  defaultMessage="Confirmer"
                />
              )}
            </Button>
          </DialogActions>
        </Dialog>
      </Fragment>
    );
  }
}

const mapStateToProps = (state) => ({
  rights: state.core?.user?.i_user?.rights || [],
  tickets: state.grievanceSocialProtection.tickets,
  ticketsPageInfo: state.grievanceSocialProtection.ticketsPageInfo,
  fetchingTickets: state.grievanceSocialProtection.fetchingTickets,
  fetchedTickets: state.grievanceSocialProtection.fetchedTickets,
  successExport: state.grievanceSocialProtection.successExport,
  exportingTickets: state.grievanceSocialProtection.exportingTickets,
  exportFiles: state.grievanceSocialProtection.exportFiles,
  errorTickets: state.grievanceSocialProtection.errorTickets,
  submittingMutation: state.grievanceSocialProtection.submittingMutation,
  mutation: state.grievanceSocialProtection.mutation,
  userRoles: state.core.user?.i_user?.roles || [],
  isSuperAdmin: state.core.user?.i_user?.is_superuser || false,
});

const mapDispatchToProps = (dispatch) =>
  bindActionCreators(
    {
      fetchTicketSummaries,
      resolveTicket,
      exportSelectedTicketsBulk,
      escalateTicketsBulk,
      resolveTicketsBulk,
      journalize,
      coreConfirm,
    },
    dispatch,
  );

export default withModulesManager(
  withHistory(
    connect(
      mapStateToProps,
      mapDispatchToProps,
    )(injectIntl(withTheme(withStyles(styles)(TicketSearcher)))),
  ),
);
