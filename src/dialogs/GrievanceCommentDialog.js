import React, { useState } from 'react';
import { Grid } from '@material-ui/core';
import { injectIntl } from 'react-intl';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogTitle from '@material-ui/core/DialogTitle';
import {
  PublishedComponent,
  TextInput,
  useTranslations,
  useModulesManager,
} from '@openimis/fe-core';
import { withTheme, withStyles } from '@material-ui/core/styles';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import GrievantTypePicker from '../pickers/GrievantTypePicker';
import { MODULE_NAME } from '../constants';

const styles = (theme) => ({
  item: theme.paper.item,
});

function GrievanceCommentDialog({
  classes,
  handleComment,
  openCommentModal,
  handleOpenModal,
  updateCommentAttribute,
  comment,
  updateCommenterType,
  commenterType,
  disabled,
}) {
  const modulesManager = useModulesManager();
  const { formatMessage } = useTranslations(MODULE_NAME, modulesManager);
  const [benefitPlan, setBenefitPlan] = useState(null);
  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="outlined"
        color="#DFEDEF"
        className={classes.button}
        disabled={disabled}
        style={{
          border: '0px',
          marginTop: '6px',
        }}
      >
       Ajouter un commentaire à la réclamation
      </Button>
      <Dialog
        open={openCommentModal}
        onClose={handleOpenModal}
        PaperProps={{
          style: {
            width: 1200,
            maxWidth: 1200,
            maxHeight: 900,
          },
        }}
      >
        <form noValidate>
          <DialogTitle
            style={{
              marginTop: '10px',
            }}
          >
            Ajouter un commentaire à la réclamation
          </DialogTitle>
          <DialogContent>
            <div
              style={{ backgroundColor: '#DFEDEF', paddingLeft: '10px', paddingBottom: '10px' }}
            >
              <Grid item xs={3} className={classes.item}>
                <GrievantTypePicker
                  module={MODULE_NAME}
                  label="type"
                  withNull
                  required
                  value={commenterType?.replace(/\s+/g, '') ?? ''}
                  onChange={(v) => updateCommenterType('commenterType', v)}
                  withLabel
                />
              </Grid>
              {commenterType === 'user' && (
                <Grid item xs={6} className={classes.item}>
                  <PublishedComponent
                    pubRef="admin.UserPicker"
                    value={comment.commenter}
                    module={MODULE_NAME}
                    label={formatMessage('ticket.commenter')}
                    onChange={(v) => updateCommentAttribute('commenter', v)}
                  />
                </Grid>
              )}
              {commenterType === 'individual' && (
                <Grid item xs={3} className={classes.item}>
                  <PublishedComponent
                    pubRef="individual.IndividualPicker"
                    value={comment.reporter}
                    label="ticket.commenter"
                    onChange={(v) => updateCommentAttribute('commenter', v)}
                    required
                    benefitPlan={null}
                  />
                </Grid>
              )}
              {commenterType === 'beneficiary' && (
              <>
                <Grid item xs={3} className={classes.item}>
                  <PublishedComponent
                    pubRef="socialProtection.BenefitPlanPicker"
                    withNull
                    label="socialProtection.benefitPlan"
                    value={benefitPlan}
                    onChange={(v) => setBenefitPlan(v)}
                  />
                </Grid>
                {benefitPlan && (
                <Grid item xs={3} className={classes.item}>
                  <PublishedComponent
                    pubRef="socialProtection.BeneficiaryPicker"
                    value={comment.reporter}
                    label="ticket.commenter"
                    onChange={(v) => updateCommentAttribute('commenter', v)}
                    benefitPlan={benefitPlan}
                  />
                </Grid>
                )}
              </>
              )}
              <Grid item xs={12} className={classes.item}>
                <TextInput
                  label="ticket.comment"
                  value={comment.comment}
                  onChange={(v) => updateCommentAttribute('comment', v)}
                  required
                />
              </Grid>
            </div>
          </DialogContent>
          <DialogActions
            style={{
              display: 'inline',
              paddingLeft: '10px',
              marginTop: '25px',
              marginBottom: '15px',
            }}
          >
            <div style={{ maxWidth: '1200px' }}>
              <div style={{ float: 'left' }}>
                <Button
                  onClick={handleOpenModal}
                  variant="outlined"
                  autoFocus
                  style={{
                    margin: '0 16px',
                    marginBottom: '15px',
                  }}
                >
                  Annuler
                </Button>
              </div>
              <div style={{ float: 'right', paddingRight: '16px' }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={(e) => handleComment(e)}
                  disabled={
                    !(
                      comment?.comment
                    )
                  }
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

const mapStateToProps = (state) => ({
  rights: !!state.core && !!state.core.user && !!state.core.user.i_user ? state.core.user.i_user.rights : [],
});

const mapDispatchToProps = (dispatch) => bindActionCreators({
}, dispatch);

export default injectIntl(
  withTheme(
    withStyles(styles)(
      connect(mapStateToProps, mapDispatchToProps)(GrievanceCommentDialog),
    ),
  ),
);
