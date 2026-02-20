import React from 'react';
import { View } from 'react-native';

export const TimePickerModal = ({ visible, onDismiss, onConfirm, hours, minutes, label, cancelLabel, confirmLabel }: any) => {
  if (!visible) return null;
  return (
    <View testID="modal">
      <mock-timepicker-modal
        visible={visible}
        onDismiss={onDismiss}
        onConfirm={onConfirm}
        hours={hours}
        minutes={minutes}
        label={label}
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
      />
    </View>
  );
};

export const DatePickerModal = ({ visible, onDismiss, onConfirm, date, startDate, endDate, locale, inputFormat, saveLabel, label, cancelLabel, dateRange }: any) => {
  if (!visible) return null;
  return (
    <View testID="modal">
      <mock-datepicker-modal
        visible={visible}
        onDismiss={onDismiss}
        onConfirm={onConfirm}
        date={date}
        startDate={startDate}
        endDate={endDate}
        locale={locale}
        inputFormat={inputFormat}
        saveLabel={saveLabel}
        label={label}
        cancelLabel={cancelLabel}
        dateRange={dateRange}
      />
    </View>
  );
};

export default { TimePickerModal, DatePickerModal };
