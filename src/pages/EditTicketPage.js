/* eslint-disable no-return-assign */
/* eslint-disable no-nested-ternary */
/* eslint-disable class-methods-use-this */
/* eslint-disable react/no-unused-state */
/* eslint-disable no-unused-vars */
/* eslint-disable react/destructuring-assignment */
import React, { Component } from 'react';
import ReactToPrint, { PrintContextConsumer } from 'react-to-print';
import PrintIcon from '@material-ui/icons/Print';
import TrendingUpIcon from '@material-ui/icons/TrendingUp';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import {
  Grid,
  Paper,
  Typography,
  Divider,
  IconButton,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@material-ui/core';
import {
  journalize,
  TextInput,
  PublishedComponent,
  FormattedMessage,
} from '@openimis/fe-core';
import _ from 'lodash';
import { Save } from '@material-ui/icons';
import { updateTicket, fetchTicket, createTicketComment, escalateTicket } from '../actions';
import { EMPTY_STRING, MODULE_NAME } from '../constants';
import TicketPrintTemplate from '../components/TicketPrintTemplate';

const styles = (theme) => ({
  paper: theme.paper.paper,
  tableTitle: theme.table.title,
  item: theme.paper.item,
  fullHeight: {
    height: '100%',
  },
});

const JSON_EXT_LABELS = {
  "_id": "Identifiant de soumission",
  "_status": "Statut (Kobo)",
  "anonyme": "Plainte anonyme",
  "household.code_confirme": "Code ménage confirmé",
  "household.autre_information": "Autres informations",
  "kobo_uuid": "UUID Kobo",
  "root_uuid": "UUID racine",
  "telephonePrenomReclamantExterne": "N° de téléphone du plaignant",
  "instance_id": "ID d’instance",
  "region_code": "Code région",
  "region_name": "Nom de la région",
  "form_version": "Version du formulaire",
  "formhub_uuid": "UUID Formhub",
  "submitted_at": "Soumise le",
  "submitted_by": "Soumise par",
  "district_code": "Code district/commune",
  "district_name": "Nom du district/commune",
  "other_problem": "Autre problème",
  "reporter_type": "Type de rapporteur",
  "personne_visee": "La plainte vise-t-elle une personne ?",
  "prefecture_code": "Code préfecture",
  "prefecture_name": "Nom de la préfecture",
  "_xform_id_string": "Identifiant du formulaire (texte)",
  "temoin_plaignant": "Le plaignant est-il témoin ?",
  "beneficiaire_type": "Type de bénéficiaire",
  "solution_proposee": "Solution proposée",
  "anonyme_preference": "Souhaite rester anonyme",
  "prefecture_cgp_code": "Code préfecture (CGP)",
  "responsable_plainte[]": "Responsables de traitement de la plainte",
  "sub_prefecture_code": "Code sous-préfecture",
  "sub_prefecture_name": "Nom de la sous-préfecture",
  "cgp_nom_confirmation": "Nom du CGP confirmé",
  "complainant_lastname": "Nom du plaignant",
  "complainant_firstname": "Prénom du plaignant",
  "cgp_contact_confirmation": "Contact du CGP confirmé",
  "sous_prefecture_cgp_code": "Code sous-préfecture (CGP)",
  "workflow.history[].at": "Horodatage de l’évènement (RFC 3339)"
};

class EditTicketPage extends Component {
  // ---------- Helpers parsing / labels ----------
  parseJsonSafe = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    if (typeof raw === 'string') {
      try {
        const once = JSON.parse(raw);
        if (typeof once === 'string') {
          try { return JSON.parse(once); } catch { return { value: once }; }
        }
        return once || {};
      } catch {
        return { value: raw };
      }
    }
    return {};
  };

   // Format date/heure ISO → lisible (locale navigateur)
  fmtDateTime = (val) => {
    if (!val) return '';
    try { return new Date(val).toLocaleString(); } catch { return String(val); }
  };

  humanize = (s) => {
    if (!s) return '';
    const t = String(s).replace(/[_-]+/g, ' ').trim();
    return t.charAt(0).toUpperCase() + t.slice(1);
  };

  labelForPath = (path) => {
    if (JSON_EXT_LABELS[path]) return JSON_EXT_LABELS[path];
    const parts = path.split('.');
    if (parts.length === 1) return this.humanize(parts[0]);
    return `${this.humanize(parts.slice(0, -1).join(' / '))} / ${this.humanize(parts.slice(-1)[0])}`;
  };

  // Aplatis json_ext -> [{path,label,value}] ; priorité au label de la donnée: title/label
  flattenJsonExt = (obj) => {
    if (typeof obj === 'string') obj = { value: obj };
    const out = [];
    const coerce = (v) => {
      if (Array.isArray(v)) return v.join(', ');
      if (typeof v === 'boolean') return v ? 'Oui' : 'Non';
      if (v === null || v === undefined) return '';
      return String(v);
    };
    const walk = (o, prefix = []) => {
      Object.entries(o || {}).forEach(([k, v]) => {
        const path = [...prefix, k];
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const hasTitleOrLabel = ('title' in v) || ('label' in v);
          const hasValueLike = ('value' in v) || ('val' in v) || ('text' in v);
          if (hasTitleOrLabel && hasValueLike) {
            const lbl = v.title ?? v.label ?? k;
            const rawVal = ('value' in v) ? v.value : (('val' in v) ? v.val : v.text);
            out.push({ path: path.join('.'), label: String(lbl), value: coerce(rawVal) });
          } else {
            walk(v, path);
          }
        } else {
          out.push({ path: path.join('.'), label: this.labelForPath(path.join('.')), value: coerce(v) });
        }
      });
    };
    walk(obj || {});
    if (!out.length) out.push({ path: '', label: 'Aucune donnée supplémentaire', value: '' });
    return out;
  };

  filterSensitiveJsonFields = (fields, isSensitive) => {
    if (!isSensitive) return fields;
    const sensitiveKeys = [
      "complainant_firstname",
      "complainant_lastname",
      "telephonePrenomReclamantExterne",
      "complainant_phone",
      "complainant_email",
      "cgp_contact_confirmation",
      "cgp_nom_confirmation",
    ];
    return fields.filter(f => !sensitiveKeys.some(k => f.path.includes(k)));
  };


  getJSONExtWithoutWorkflow = (ticket) => {
    const raw = ticket?.jsonExt ?? ticket?.json_ext ?? {};
    const parsed = this.parseJsonSafe(raw) || {};

    // On retire "workflow" sans muter l'objet source
    const { workflow, ...jsonExtWithoutWorkflow } = parsed;
    return jsonExtWithoutWorkflow;
  }

  constructor(props) {
    super(props);
    this.state = {
      stateEdited: props.ticket,
      comments: props.comments,
      reporter: {},
      grievanceConfig: {},
      jsonFields: this.flattenJsonExt(this.getJSONExtWithoutWorkflow(props.ticket)),
      showEscalateDialog: false,
      escalating: false,
    };
  }

  componentDidMount() {
    if (this.props.edited_id) {
      this.setState({ grievanceConfig: this.props.grievanceConfig });
      this.setState({ stateEdited: this.props.ticket });
      if (this.props.ticket.reporter) {
        this.setState({ reporter: JSON.parse(JSON.parse(this.props.ticket.reporter || '{}'), '{}') });
      }
      // const jsonObj = this.parseJsonSafe(this.props.ticket && (this.props.ticket.jsonExt || this.props.ticket.json_ext));
      const jsonObj = this.parseJsonSafe(this.getJSONExtWithoutWorkflow(this.props.ticket));
      this.setState({ jsonFields: this.flattenJsonExt(jsonObj) });
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.submittingMutation && !this.props.submittingMutation) {
      this.props.journalize(this.props.mutation);
    }
    if (!_.isEqual(prevProps.ticket, this.props.ticket)) {
      // const jsonObj = this.parseJsonSafe(this.props.ticket && (this.props.ticket.jsonExt || this.props.ticket.json_ext));
      const jsonObj = this.parseJsonSafe(this.getJSONExtWithoutWorkflow(this.props.ticket));
      this.setState({
        stateEdited: this.props.ticket,
        jsonFields: this.flattenJsonExt(jsonObj),
      });
    }
  }

  save = () => {
    this.props.updateTicket(
      this.state.stateEdited,
      `updated ticket ${this.state.stateEdited.code}`,
    );
  };

  updateAttribute = (k, v) => {
    this.setState((state) => ({
      stateEdited: { ...state.stateEdited, [k]: v },
    }));
  };

  extractFieldFromJsonExt = (reporter, field) => {
    if (reporter && reporter.jsonExt) return reporter.jsonExt[field] || '';
    return '';
  };

  doesTicketChange = () => {
    const { ticket } = this.props;
    const { stateEdited } = this.state;
    return !_.isEqual(ticket, stateEdited);
  };

  // ---------- Escalade ----------
  openEscalate = () => this.setState({ showEscalateDialog: true });
  closeEscalate = () => this.setState({ showEscalateDialog: false });

  confirmEscalate = async () => {
    const { stateEdited } = this.state;
    const { escalateTicket: doEscalate, fetchTicket: refetch } = this.props;
    this.setState({ escalating: true });
    try {
      await doEscalate(stateEdited.id, `escalated ticket ${stateEdited.code}`);
      // rechargement du ticket courant
      await refetch(null, [`id: "${stateEdited.id}"`]);
    } finally {
      window.location.reload();
      // this.setState({ escalating: false, showEscalateDialog: false });
    }
  };

  renderWorkflowSection = () => {
    const { classes } = this.props;
    // On récupère json_ext depuis le ticket de l'état ; fallback depuis props
    const jsonExtObj =
      this.parseJsonSafe(this.state?.stateEdited?.jsonExt || this.props?.ticket?.jsonExt || {});
    const wf = jsonExtObj.workflow || {};
    const history = Array.isArray(wf.history) ? wf.history : [];

    return (
      <Grid container>
        <Grid item xs={12}>
          <Paper className={classes.paper}>
            <Grid container className={classes.tableTitle}>
              <Grid item xs={12} className={classes.tableTitle}>
                <Typography>Historique du workflow</Typography>
              </Grid>
            </Grid>
            <Divider />

            {/* Résumé workflow en champs read-only */}
            <Grid container className={classes.item} spacing={2}>
              <Grid item xs={4} className={classes.item}>
                <TextField
                  fullWidth
                  size="small"
                  label="Rôle assigné"
                  value={wf.assignee_role || ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={4} className={classes.item}>
                <TextField
                  fullWidth
                  size="small"
                  label="Niveau d’escalade"
                  value={wf.escalation_level ?? ''}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid item xs={4} className={classes.item}>
                <TextField
                  fullWidth
                  size="small"
                  label="Dernière escalade"
                  value={this.fmtDateTime(wf.last_escalated_at)}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>

            <Divider style={{ marginTop: 8 }} />

            {/* Tableau historique */}
            <Grid container className={classes.item}>
              <Grid item xs={12}>
                {history.length === 0 ? (
                  <Typography variant="body2" color="textSecondary">
                    Aucun évènement d’escalade enregistré.
                  </Typography>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date / heure</TableCell>
                        <TableCell>Par</TableCell>
                        <TableCell>Source</TableCell>
                        <TableCell>Vers rôle</TableCell>
                        <TableCell align="right">Délai (j)</TableCell>
                        <TableCell align="right">Utilisateur cible (ID)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {history.map((h, idx) => (
                        <TableRow key={`wf-row-${idx}`}>
                          <TableCell>{this.fmtDateTime(h.at)}</TableCell>
                          <TableCell>{h.by ?? ''}</TableCell>
                          <TableCell>{h.source ?? ''}</TableCell>
                          <TableCell>{h.to_role ?? ''}</TableCell>
                          <TableCell align="right">{h.sla_days ?? ''}</TableCell>
                          <TableCell align="right">
                            {h.to_user_fullname === null || h.to_user_fullname === undefined ? '' : String(h.to_user_fullname)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    );
  };

  render() {
    const {
      classes,
      titleone = ' Ticket.ComplainantInformation',
      titletwo = ' Ticket.DescriptionOfEvents',
      titlethree = ' Ticket.Resolution',
      titleParams = { label: EMPTY_STRING },
    } = this.props;

    const propsReadOnly = this.props.readOnly;

    const {
      stateEdited, reporter, comments, jsonFields, showEscalateDialog, escalating,
    } = this.state;

    const isSensitive = stateEdited?.category === "Cas sensibles";
    const filteredJsonFields = this.filterSensitiveJsonFields(jsonFields, isSensitive);

    const escalateDisabled = propsReadOnly || !stateEdited?.id
      || ['RESOLVED', 'CLOSED'].includes(stateEdited?.status);

    console.log('stateEdited.district', stateEdited);

    return (
      <div className={classes.page}>
        <Grid container>
          <Grid item xs={12}>
            {!isSensitive && stateEdited?.reporter && (
            <Paper className={classes.paper}>
              <Grid container className={classes.tableTitle}>
                <Grid item xs={8} className={classes.tableTitle}>
                  <Typography>
                    <FormattedMessage module={MODULE_NAME} id={titleone} values={titleParams} />
                  </Typography>
                </Grid>
              </Grid>
              <Grid container className={classes.item}>
                {stateEdited.reporterTypeName === 'individual' && (
                <Grid item xs={3} className={classes.item}>
                  <PublishedComponent
                    pubRef="individual.IndividualPicker"
                    value={reporter}
                    onChange={(v) => this.updateAttribute('reporter', v)}
                    label="Complainant"
                    readOnly
                  />
                </Grid>
                )}
              </Grid>
              <Divider />
              <Grid container className={classes.item}>
                {stateEdited.reporterTypeName === 'individual' && (
                <>
                  <Grid item xs={4} className={classes.item}>
                    <TextInput
                      module={MODULE_NAME}
                      label="ticket.name"
                      value={reporter && reporter.individual
                        ? `${reporter.individual.firstName} ${reporter.individual.lastName} ${reporter.individual.dob}`
                        : reporter
                          ? `${reporter.firstName} ${reporter.lastName} ${reporter.dob}`
                          : EMPTY_STRING}
                      onChange={(v) => this.updateAttribute('name', v)}
                      required={false}
                      readOnly
                    />
                  </Grid>
                  <Grid item xs={4} className={classes.item}>
                    <TextInput
                      module={MODULE_NAME}
                      label="ticket.phone"
                      value={!!stateEdited && !!stateEdited.reporter
                        ? this.extractFieldFromJsonExt(reporter, 'phone')
                        : EMPTY_STRING}
                      onChange={(v) => this.updateAttribute('phone', v)}
                      required={false}
                      readOnly
                    />
                  </Grid>
                  <Grid item xs={4} className={classes.item}>
                    <TextInput
                      module={MODULE_NAME}
                      label="ticket.email"
                      value={!!stateEdited && !!stateEdited.reporter
                        ? this.extractFieldFromJsonExt(reporter, 'email')
                        : EMPTY_STRING}
                      onChange={(v) => this.updateAttribute('email', v)}
                      required={false}
                      readOnly
                    />
                  </Grid>
                </>
                )}
                {stateEdited.reporterTypeName === 'beneficiary' && (
                <PublishedComponent
                  pubRef="socialProtection.BeneficiaryPicker"
                  onChange={(v) => this.updateAttribute('reporter', v)}
                  readOnly
                  value={{
                    individual: {
                      firstName: stateEdited.reporterFirstName,
                      lastName: stateEdited.reporterLastName,
                      dob: stateEdited.reporterDob,
                    },
                  }}
                  module={MODULE_NAME}
                />
                )}
                {stateEdited.reporterTypeName === 'user' && (
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="admin.UserPicker"
                    value={reporter}
                    module="core"
                    onChange={(v) => this.updateAttribute('reporter', v)}
                    readOnly
                  />
                </Grid>
                )}
              </Grid>
            </Paper>
            )}
          </Grid>
        </Grid>

        <Grid container>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Grid container className={classes.tableTitle} alignItems="center">
                <Grid item xs={8} className={classes.tableTitle}>
                  <Typography>
                    <FormattedMessage
                      module={MODULE_NAME}
                      id={titletwo}
                      values={titleParams}
                    />
                  </Typography>
                </Grid>
                <Grid item xs={4} style={{ textAlign: 'right' }}>
                  <ReactToPrint content={() => this.componentRef}>
                    <PrintContextConsumer>
                      {({ handlePrint }) => (
                        <IconButton
                          variant="contained"
                          component="label"
                          onClick={handlePrint}
                        >
                          <PrintIcon />
                        </IconButton>
                      )}
                    </PrintContextConsumer>
                  </ReactToPrint>
                  <IconButton
                    variant="contained"
                    component="label"
                    onClick={this.openEscalate}
                    disabled={escalateDisabled}
                    title="Escalader"
                    style={{ marginLeft: 8 }}
                  >
                    <TrendingUpIcon />
                  </IconButton>
                </Grid>
              </Grid>
              <Divider />
              <Grid container className={classes.item}>
                <Grid item xs={6} className={classes.item}>
                  <TextInput
                    label="ticket.title"
                    value={stateEdited?.title}
                    onChange={(v) => this.updateAttribute('title', v)}
                    required
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="core.DatePicker"
                    label="ticket.dateOfIncident"
                    value={stateEdited?.dateOfIncident}
                    required={false}
                    onChange={(v) => this.updateAttribute('dateOfIncident', v)}
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.DropDownCategoryPicker"
                    value={stateEdited?.category}
                    onChange={(v) => this.updateAttribute('category', v)}
                    required
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.DropDownSubCategoryPicker"
                    category={stateEdited.category}
                    value={stateEdited.subCategory}
                    onChange={(v) => this.updateAttribute('subCategory', v)}
                    required
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.DropDownSubCategoryLevel1Picker"
                    subCategory={stateEdited.subCategory}
                    value={stateEdited.subCategoryLevel1}
                    onChange={(v) => this.updateAttribute('subCategoryLevel1', v)}
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.FlagPicker"
                    value={stateEdited?.flags}
                    onChange={(v) => this.updateAttribute('flags', v)}
                    required
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.ChannelPicker"
                    value={stateEdited?.channel}
                    onChange={(v) => this.updateAttribute('channel', v)}
                    required
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.TicketPriorityPicker"
                    value={stateEdited?.priority}
                    onChange={(v) => this.updateAttribute('priority', v)}
                    required={false}
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="admin.UserPicker"
                    value={stateEdited?.attendingStaff}
                    module="core"
                    onChange={(v) => this.updateAttribute('attendingStaff', v)}
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="grievanceSocialProtection.TicketStatusPicker"
                    value={stateEdited?.status}
                    onChange={(v) => this.updateAttribute('status', v)}
                    required={false}
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={12} className={classes.item}>
                  <TextInput
                    label="ticket.description"
                    value={stateEdited?.description}
                    onChange={(v) => this.updateAttribute('description', v)}
                    required={false}
                    readOnly={propsReadOnly}
                  />
                </Grid>
              </Grid>

              {/* === Localisation === */}
              <Divider style={{ marginTop: 10, marginBottom: 10 }} />
              <Grid item xs={12} className={classes.item}>
                <Typography variant="subtitle1" style={{ marginBottom: 8 }}>
                    Localisation
                </Typography>
                <PublishedComponent
                    pubRef="location.DetailedLocation"
                    withNull
                    required
                    readOnly={propsReadOnly}
                    filterLabels={false}
                    value={stateEdited?.location}
                    onChange={(locations) => this.updateAttribute('location', locations)}
                />
              </Grid>

              {/* ----- json_ext : chaque élément = 1 champ, lecture seule ----- */}
              <Divider />
              <Grid container className={classes.item}>
                <Grid item xs={12} className={classes.item}>
                  <Typography variant="subtitle1" style={{ marginBottom: 8 }}>
                    Données supplémentaires (json_ext)
                  </Typography>
                </Grid>
                {filteredJsonFields.map((f, idx) => (
                  <Grid item xs={6} className={classes.item} key={`jsonext-field-${idx}`}>
                    <TextField
                      fullWidth
                      label={f.label}
                      value={f.value}
                      disabled
                    />
                  </Grid>
                ))}
              </Grid>
              {/* ------------------------------------------------------------ */}
              {/* ---------- Section Workflow / Historique (read-only) ---------- */}
              {this.renderWorkflowSection()}
            </Paper>
          </Grid>
        </Grid>

        <Grid container>
          <Grid item xs={12}>
            <Paper className={classes.paper}>
              <Grid container className={classes.tableTitle}>
                <Grid item xs={12} className={classes.tableTitle}>
                  <Typography>
                    <FormattedMessage
                      module={MODULE_NAME}
                      id={titlethree}
                      values={titleParams}
                    />
                  </Typography>
                </Grid>
              </Grid>
              <Divider />
              <Grid container className={classes.item}>
                <Grid item xs={10} className={classes.item}>
                  <TextInput
                    label="ticket.resolution"
                    value={stateEdited?.resolution}
                    onChange={(v) => this.updateAttribute('resolution', v)}
                    required={false}
                    readOnly={propsReadOnly}
                  />
                </Grid>
                <Grid item xs={11} className={classes.item} />
                <Grid item xs={1} className={classes.item}>
                  <IconButton
                    variant="contained"
                    component="label"
                    color="primary"
                    onClick={this.save}
                    disabled={propsReadOnly || !this.doesTicketChange()}
                  >
                    <Save />
                  </IconButton>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>

        {/* Impression */}
        <div style={{ display: 'none' }}>
          <TicketPrintTemplate
            ref={(el) => (this.componentRef = el)}
            ticket={stateEdited}
            reporter={reporter}
            comments={comments}
          />
        </div>

        {/* Dialog de confirmation d'escalade */}
        <Dialog open={showEscalateDialog} onClose={this.closeEscalate} maxWidth="xs" fullWidth>
          <DialogTitle>Confirmer l’escalade</DialogTitle>
          <DialogContent>
            <Typography variant="body2">
              Voulez-vous escalader cette plainte au niveau supérieur ?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.closeEscalate} disabled={escalating}>Annuler</Button>
            <Button onClick={this.confirmEscalate} color="primary" variant="contained" disabled={escalating}>
              {escalating ? 'En cours…' : 'Escalader'}
            </Button>
          </DialogActions>
        </Dialog>
      </div>
    );
  }
}

const mapStateToProps = (state, props) => ({
  submittingMutation: state.grievanceSocialProtection.submittingMutation,
  mutation: state.grievanceSocialProtection.mutation,
  fetchingTicket: state.grievanceSocialProtection.fetchingTicket,
  errorTicket: state.grievanceSocialProtection.errorTicket,
  fetchedTicket: state.grievanceSocialProtection.fetchedTicket,
  ticket: state.grievanceSocialProtection.ticket,
  grievanceConfig: state.grievanceSocialProtection.grievanceConfig,
  comments: state.grievanceSocialProtection.ticketComments,
  edited_id: state.grievanceSocialProtection.ticket?.id,
});

const mapDispatchToProps = (dispatch) => bindActionCreators(
  {
    fetchTicket, updateTicket, createTicketComment, journalize, escalateTicket,
  },
  dispatch,
);

export default withTheme(
  withStyles(styles)(
    connect(mapStateToProps, mapDispatchToProps)(EditTicketPage),
  ),
);
