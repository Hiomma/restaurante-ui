'use client';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs from 'dayjs';

interface BrDateFieldProps {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  error?: boolean;
  helperText?: string;
  inputRef?: React.Ref<HTMLInputElement>;
  name?: string;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
}

export default function BrDateField({
  value,
  onChange,
  label,
  fullWidth = true,
  size = 'small',
  error,
  helperText,
  inputRef,
  name,
  onBlur,
}: BrDateFieldProps) {
  return (
    <DatePicker
      label={label}
      value={value ? dayjs(value) : null}
      onChange={(d) => onChange(d ? d.format('YYYY-MM-DD') : '')}
      slotProps={{
        textField: {
          fullWidth,
          size,
          error,
          helperText,
          inputRef,
          name,
          onBlur,
          sx: {
            '& .MuiOutlinedInput-root': {
              height: 44,
            },
          },
        },
      }}
    />
  );
}
