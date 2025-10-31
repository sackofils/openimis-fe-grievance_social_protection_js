import React, { useState } from "react";
import {
  Grid,
  TextField,
  Button,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@material-ui/core";
import { useDispatch } from "react-redux";
import { FormattedMessage, useTranslations } from "@openimis/fe-core";
import { updateDeathDossier } from "../actions";
import { MODULE_NAME } from "../constants";

export default function DeathDossierBeneficiaryForm({ dossier, classes, onChange }) {
  const dispatch = useDispatch();
  const { formatMessage } = useTranslations(MODULE_NAME);

  const [formData, setFormData] = useState({
    code_beneficiaire: dossier?.deathDossier?.codeBeneficiaire || "",
    nom_beneficiaire: dossier?.deathDossier?.nomBeneficiaire || "",
    prenom_beneficiaire: dossier?.deathDossier?.prenomBeneficiaire || "",
    sexe_beneficiaire: dossier?.deathDossier?.sexeBeneficiaire || "",
  });

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (onChange) onChange({ ...dossier, [field]: value });
  };

  const handleSubmit = async () => {
    if (
      !formData.code_beneficiaire ||
      !formData.nom_beneficiaire ||
      !formData.prenom_beneficiaire ||
      !formData.sexe_beneficiaire
    ) {
      alert(formatMessage("deathDossier.beneficiaryForm.missingFields"));
      return;
    }

    setLoading(true);
    setSuccessMsg(null);
    try {
      console.log('Dossier:', dossier);
      await dispatch(
        updateDeathDossier(
          dossier.id,
          {
            ...dossier.deathDossier,
            codeBeneficiaire: formData.code_beneficiaire,
            nomBeneficiaire: formData.nom_beneficiaire,
            prenomBeneficiaire: formData.prenom_beneficiaire,
            sexeBeneficiaire: formData.sexe_beneficiaire,
          },
          {},
          formatMessage("deathDossier.beneficiaryForm.save")
        )
      );

      setSuccessMsg(formatMessage("deathDossier.beneficiaryForm.success"));
    } catch (err) {
      console.error(err);
      alert(formatMessage("deathDossier.beneficiaryForm.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Grid container spacing={2} className={classes.item} style={{ marginTop: 20 }}>
      <Grid item xs={12}>
        <Typography variant="h6" style={{ marginBottom: 10 }}>
          <FormattedMessage
            module={MODULE_NAME}
            id="deathDossier.beneficiaryForm.title"
          />
        </Typography>
      </Grid>

      <Grid item xs={3}>
        <TextField
          fullWidth
          label={
            <FormattedMessage
              module={MODULE_NAME}
              id="deathDossier.beneficiaryForm.code"
            />
          }
          variant="standard"
          size="small"
          value={formData.code_beneficiaire}
          onChange={(e) => handleChange("code_beneficiaire", e.target.value)}
        />
      </Grid>

      <Grid item xs={3}>
        <TextField
          fullWidth
          label={
            <FormattedMessage
              module={MODULE_NAME}
              id="deathDossier.beneficiaryForm.nom"
            />
          }
          variant="standard"
          size="small"
          value={formData.nom_beneficiaire}
          onChange={(e) => handleChange("nom_beneficiaire", e.target.value)}
        />
      </Grid>

      <Grid item xs={3}>
        <TextField
          fullWidth
          label={
            <FormattedMessage
              module={MODULE_NAME}
              id="deathDossier.beneficiaryForm.prenom"
            />
          }
          variant="standard"
          size="small"
          value={formData.prenom_beneficiaire}
          onChange={(e) => handleChange("prenom_beneficiaire", e.target.value)}
        />
      </Grid>

      <Grid item xs={3}>
        <FormControl variant="standard" size="small" fullWidth>
          <InputLabel>
            <FormattedMessage
              module={MODULE_NAME}
              id="deathDossier.beneficiaryForm.sexe"
            />
          </InputLabel>
          <Select
            value={formData.sexe_beneficiaire}
            onChange={(e) => handleChange("sexe_beneficiaire", e.target.value)}
            label="Sexe"
          >
            <MenuItem value="">
              <em>
                <FormattedMessage
                  module={MODULE_NAME}
                  id="deathDossier.beneficiaryForm.choisir"
                />
              </em>
            </MenuItem>
            <MenuItem value="M">
              <FormattedMessage
                module={MODULE_NAME}
                id="deathDossier.beneficiaryForm.masculin"
              />
            </MenuItem>
            <MenuItem value="F">
              <FormattedMessage
                module={MODULE_NAME}
                id="deathDossier.beneficiaryForm.feminin"
              />
            </MenuItem>
          </Select>
        </FormControl>
      </Grid>

      <Grid item xs={12} style={{ textAlign: "right", marginTop: 10 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={18} /> : null}
        >
          {loading ? (
            <FormattedMessage
              module={MODULE_NAME}
              id="deathDossier.beneficiaryForm.saving"
            />
          ) : (
            <FormattedMessage
              module={MODULE_NAME}
              id="deathDossier.beneficiaryForm.save"
            />
          )}
        </Button>

        {successMsg && (
          <Typography style={{ color: "green", marginTop: 8 }}>
            {successMsg}
          </Typography>
        )}
      </Grid>
    </Grid>
  );
}
