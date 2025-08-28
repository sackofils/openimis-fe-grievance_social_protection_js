import React, { useState } from 'react';
import { useTranslations, Autocomplete, useGraphqlQuery } from '@openimis/fe-core';

function SubCategoryPicker(props) {
  const {
    onChange,
    readOnly,
    required,
    withLabel = true,
    withPlaceholder,
    value,
    label,
    filterOptions,
    filterSelectedOptions,
    placeholder,
    multiple,
  } = props;
  const [searchString, setSearchString] = useState(null);
  const { formatMessage } = useTranslations('ticket');

  const { isLoading, data, error } = useGraphqlQuery(
    `query SubCategoryPicker {
        grievanceConfig{
          grievanceCategories{type, categories}
        }
    }`,
    { searchString, first: 20 },
    { skip: true },
  );
    console.log('props', props);
  return (
    <Autocomplete
      multiple={multiple}
      required={required}
      placeholder={placeholder ?? formatMessage('SubCategoryPicker.placeholder')}
      label={label ?? formatMessage('SubCategoryPicker.label')}
      error={error}
      withLabel={withLabel}
      withPlaceholder={withPlaceholder}
      readOnly={readOnly}
      options={data?.grievanceConfig?.grievanceCategories?.find((t) => t.type === props.category)?.categories ?? []}
      isLoading={isLoading}
      value={value}
      getOptionLabel={(option) => `${option}`}
      onChange={(v) => onChange(v ?? null)}
      filterOptions={filterOptions}
      filterSelectedOptions={filterSelectedOptions}
      onInputChange={setSearchString}
    />
  );
}

export default SubCategoryPicker;
