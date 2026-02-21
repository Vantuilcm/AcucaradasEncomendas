import * as React from 'react';
import type { ModeType } from './Calendar';
import type { LocalState } from './DatePickerModalContent';
export interface HeaderPickProps {
    moreLabel?: string;
    label?: string;
    emptyLabel?: string;
    saveLabel?: string;
    uppercase?: boolean;
    headerSeparator?: string;
    startLabel?: string;
    endLabel?: string;
    editIcon?: string;
    calendarIcon?: string;
    closeIcon?: string;
    allowEditing?: boolean;
}
export interface HeaderContentProps extends HeaderPickProps {
    state: LocalState;
    mode: ModeType;
    collapsed: boolean;
    onToggle: () => any;
    locale: string | undefined;
}
export default function DatePickerModalContentHeader(props: HeaderContentProps): React.JSX.Element;
export declare function HeaderContentSingle({ state, emptyLabel, color, locale, }: HeaderContentProps & {
    color: string;
}): React.JSX.Element;
export declare function HeaderContentMulti({ state, emptyLabel, moreLabel, color, locale, }: HeaderContentProps & {
    color: string;
    moreLabel: string | undefined;
}): React.JSX.Element;
export declare function HeaderContentRange({ locale, state, headerSeparator, startLabel, endLabel, color, }: HeaderContentProps & {
    color: string;
}): React.JSX.Element;
//# sourceMappingURL=DatePickerModalContentHeader.d.ts.map