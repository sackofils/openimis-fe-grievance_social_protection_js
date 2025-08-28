import React, { useState } from 'react';
import { useTranslations, Autocomplete, useGraphqlQuery } from '@openimis/fe-core';

function SubCategoryLevel1Picker(props) {
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
    `query SubCategoryLevel1Picker {
        grievanceConfig{
          grievanceSubCategories{category, subCategories}
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
      placeholder={placeholder ?? formatMessage('SubCategoryLevelPicker.placeholder')}
      label={label ?? formatMessage('SubCategoryLevel1Picker.label')}
      error={error}
      withLabel={withLabel}
      withPlaceholder={withPlaceholder}
      readOnly={readOnly}
      options={data?.grievanceConfig?.grievanceSubCategories?.find((t) => t.category === props.subCategory)?.subCategories ?? []}
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

export default SubCategoryLevel1Picker;
