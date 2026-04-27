import React from 'react';
import { View } from 'react-native';

type TimePickerModalProps = {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: (payload: { hours: number; minutes: number }) => void;
};

export function TimePickerModal(_props: TimePickerModalProps) {
  return <View />;
}
