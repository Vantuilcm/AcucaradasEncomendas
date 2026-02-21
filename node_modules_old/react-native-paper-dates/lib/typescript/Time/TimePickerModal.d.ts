import * as React from 'react';
export declare function TimePickerModal({ visible, onDismiss, onConfirm, hours, minutes, label, uppercase, cancelLabel, confirmLabel, animationType, locale, keyboardIcon, clockIcon, use24HourClock, inputFontSize, }: {
    locale?: undefined | string;
    label?: string;
    uppercase?: boolean;
    cancelLabel?: string;
    confirmLabel?: string;
    hours?: number | undefined;
    minutes?: number | undefined;
    visible: boolean | undefined;
    onDismiss: () => any;
    onConfirm: (hoursAndMinutes: {
        hours: number;
        minutes: number;
    }) => any;
    animationType?: 'slide' | 'fade' | 'none';
    keyboardIcon?: string;
    clockIcon?: string;
    use24HourClock?: boolean;
    inputFontSize?: number;
}): React.JSX.Element;
declare const _default: React.MemoExoticComponent<typeof TimePickerModal>;
export default _default;
//# sourceMappingURL=TimePickerModal.d.ts.map