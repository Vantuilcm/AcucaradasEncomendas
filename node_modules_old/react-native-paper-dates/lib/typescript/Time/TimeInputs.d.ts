import * as React from 'react';
import { PossibleClockTypes, PossibleInputTypes } from './timeUtils';
declare function TimeInputs({ hours, minutes, onFocusInput, focused, inputType, onChange, is24Hour, inputFontSize, }: {
    inputType: PossibleInputTypes;
    focused: PossibleClockTypes;
    hours: number;
    minutes: number;
    onFocusInput: (type: PossibleClockTypes) => any;
    onChange: (hoursMinutesAndFocused: {
        hours: number;
        minutes: number;
        focused?: undefined | PossibleClockTypes;
    }) => any;
    is24Hour: boolean;
    inputFontSize?: number;
}): React.JSX.Element;
declare const _default: React.MemoExoticComponent<typeof TimeInputs>;
export default _default;
//# sourceMappingURL=TimeInputs.d.ts.map