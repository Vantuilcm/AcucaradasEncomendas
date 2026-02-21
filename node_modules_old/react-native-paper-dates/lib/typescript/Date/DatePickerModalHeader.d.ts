import * as React from 'react';
export interface DatePickerModalHeaderProps {
    disableSafeTop?: boolean;
    saveLabel?: string;
    saveLabelDisabled?: boolean;
    uppercase?: boolean;
    onDismiss: () => void;
    onSave: () => void;
    locale: string | undefined;
    closeIcon?: string;
}
export default function DatePickerModalHeader(props: DatePickerModalHeaderProps): React.JSX.Element;
//# sourceMappingURL=DatePickerModalHeader.d.ts.map