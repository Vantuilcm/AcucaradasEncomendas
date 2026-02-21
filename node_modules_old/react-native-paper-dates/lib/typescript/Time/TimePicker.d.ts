import * as React from 'react';
import { PossibleClockTypes, PossibleInputTypes } from './timeUtils';
export declare const DisplayModeContext: React.Context<{
    mode: 'AM' | 'PM' | undefined;
    setMode: React.Dispatch<React.SetStateAction<'AM' | 'PM' | undefined>>;
}>;
type onChangeFunc = ({ hours, minutes, focused, }: {
    hours: number;
    minutes: number;
    focused?: undefined | PossibleClockTypes;
}) => any;
declare function TimePicker({ hours, minutes, onFocusInput, focused, inputType, onChange, locale, use24HourClock, inputFontSize, }: {
    locale?: undefined | string;
    inputType: PossibleInputTypes;
    focused: PossibleClockTypes;
    hours: number;
    minutes: number;
    onFocusInput: (type: PossibleClockTypes) => any;
    onChange: onChangeFunc;
    use24HourClock?: boolean;
    inputFontSize?: number;
}): React.JSX.Element;
declare const _default: React.MemoExoticComponent<typeof TimePicker>;
export default _default;
//# sourceMappingURL=TimePicker.d.ts.map