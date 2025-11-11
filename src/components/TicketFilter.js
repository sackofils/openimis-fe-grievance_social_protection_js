/* eslint-disable react/destructuring-assignment */
/* eslint-disable no-underscore-dangle */
import React, { Component } from "react";
import _debounce from "lodash/debounce";
import { withTheme, withStyles } from "@material-ui/core/styles";
import { injectIntl } from "react-intl";
import { Grid, Checkbox, FormControlLabel } from "@material-ui/core";
import {
  withModulesManager,
  Contributions,
  ControlledField,
  TextInput,
  PublishedComponent,
  decodeId,
  formatMessage,
} from "@openimis/fe-core";
import { MODULE_NAME } from "../constants";

const styles = (theme) => ({
  form: {
    padding: 0,
  },
  item: {
    padding: theme.spacing(1),
  },
});

const TICKET_FILTER_CONTRIBUTION_KEY = "ticket.Filter";

class TicketFilter extends Component {
  debouncedOnChangeFilter = _debounce(
    this.props.onChangeFilters,
    this.props.modulesManager.getConf(
      MODULE_NAME,
      "debounceTime",
      800
    )
  );

  _filterValue = (k) => {
    const { filters } = this.props;
    return filters && filters[k] ? filters[k].value : null;
  };

  _onChangeReporter = (k, v) => {
    this.props.onChangeFilters([
      {
        id: k,
        value: v,
        filter: `${k}: "${decodeId(v?.id)}"`,
      },
    ]);
  };

  _onChangeCheckbox = (key, value) => {
    const filters = [
      {
        id: key,
        value,
        filter: `${key}: ${value}`,
      },
    ];
    this.props.onChangeFilters(filters);
    this.props.setShowHistoryFilter(value);
  };

  render() {
    const { classes, filters, onChangeFilters, intl } = this.props;

    return (
      <Grid container className={classes.form}>
        {/* --- Code --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticketFilter.ticketCode"
          field={
            <Grid item xs={3} className={classes.item}>
              <TextInput
                module={MODULE_NAME}
                label="ticket.ticketCode"
                value={this._filterValue("code")}
                onChange={(v) =>
                  this.debouncedOnChangeFilter([
                    {
                      id: "code",
                      value: v,
                      filter: `code_Icontains: "${v}"`,
                    },
                  ])
                }
              />
            </Grid>
          }
        />

        {/* --- Titre --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticketFilter.ticketTitle"
          field={
            <Grid item xs={3} className={classes.item}>
              <TextInput
                module={MODULE_NAME}
                label="ticket.ticketTitle"
                value={this._filterValue("title")}
                onChange={(v) =>
                  this.debouncedOnChangeFilter([
                    {
                      id: "title",
                      value: v,
                      filter: `title_Icontains: "${v}"`,
                    },
                  ])
                }
              />
            </Grid>
          }
        />

        {/* --- Plaignant --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticket.reporter"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="individual.IndividualPicker"
                withNull
                label="ticket.reporter"
                value={this._filterValue("reporterId")}
                onChange={(v) => this._onChangeReporter("reporterId", v || null)}
              />
            </Grid>
          }
        />

        {/* --- Priorité --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticket.priority"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="grievanceSocialProtection.TicketPriorityPicker"
                withNull
                label="ticket.ticketPriority"
                value={this._filterValue("priority")}
                onChange={(v) =>
                  this.debouncedOnChangeFilter([
                    {
                      id: "priority",
                      value: v,
                      filter: `priority_Icontains: "${v}"`,
                    },
                  ])
                }
              />
            </Grid>
          }
        />

        {/* --- Statut --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticket.status"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="grievanceSocialProtection.TicketStatusPicker"
                label="ticket.ticketStatus"
                withNull
                value={this._filterValue("status")}
                onChange={(v) => {
                    v = (!v || v === '') ? null : v;
                    this.debouncedOnChangeFilter([
                        {
                          id: "status",
                          value: v,
                          filter: `status_Iexact: ${v}`,
                        },
                      ])
                    }
                }
              />
            </Grid>
          }
        />

        {/* --- Type (catégorie principale) --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticket.category"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="grievanceSocialProtection.DropDownCategoryPicker"
                withNull
                value={this._filterValue("category")}
                onChange={(v) =>
                  this.debouncedOnChangeFilter([
                    {
                      id: "category",
                      value: v,
                      filter: `category_Icontains: "${v}"`,
                    },
                  ])
                }
              />
            </Grid>
          }
        />

        {/* --- Sous-type --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticket.subCategory"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="grievanceSocialProtection.DropDownSubCategoryPicker"
                withNull
                category={this._filterValue("category")}
                value={this._filterValue("subCategory")}
                onChange={(v) =>
                  this.debouncedOnChangeFilter([
                    {
                      id: "subCategory",
                      value: v,
                      filter: `subCategory_Icontains: "${v}"`,
                    },
                  ])
                }
              />
            </Grid>
          }
        />

        {/* --- Sous-type niveau 1 --- */}
        <ControlledField
          module={MODULE_NAME}
          id="ticket.subCategoryLevel1"
          field={
            <Grid item xs={3} className={classes.item}>
              <PublishedComponent
                pubRef="grievanceSocialProtection.DropDownSubCategoryLevel1Picker"
                withNull
                subCategory={this._filterValue("subCategory")}
                value={this._filterValue("subCategoryLevel1")}
                onChange={(v) =>
                  this.debouncedOnChangeFilter([
                    {
                      id: "subCategoryLevel1",
                      value: v,
                      filter: `subCategoryLevel1_Icontains: "${v}"`,
                    },
                  ])
                }
              />
            </Grid>
          }
        />

        {/* --- Afficher l’historique --- */}
        <Grid item xs={3} className={classes.item}>
          <FormControlLabel
            control={
              <Checkbox
                color="primary"
                checked={!!this._filterValue("showHistory")}
                onChange={(event) =>
                  this._onChangeCheckbox("showHistory", event.target.checked)
                }
              />
            }
            label={formatMessage(intl, MODULE_NAME, "showHistory")}
          />
        </Grid>

        <Grid item xs={4} className={classes.item}>
          <FormControlLabel
            control={
              <Checkbox
                color="primary"
                checked={!!this._filterValue("isExported")}
                onChange={(e) => {
                    this._onChangeCheckbox("isExported", event.target.checked)
                }}
              />
            }
            label={formatMessage(intl, MODULE_NAME, "ticket.filterNotExported", "Afficher uniquement les tickets non exportés")}
          />
        </Grid>

        {/* --- Contributions externes --- */}
        <Contributions
          filters={filters}
          onChangeFilters={onChangeFilters}
          contributionKey={TICKET_FILTER_CONTRIBUTION_KEY}
        />
      </Grid>
    );
  }
}

export default withModulesManager(
  injectIntl(withTheme(withStyles(styles)(TicketFilter)))
);
