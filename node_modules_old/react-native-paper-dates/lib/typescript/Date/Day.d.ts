import * as React from 'react';
import type { PaperTheme } from '../utils';
declare function EmptyDayPure(): React.JSX.Element;
export declare const EmptyDay: React.MemoExoticComponent<typeof EmptyDayPure>;
declare function Day(props: {
    theme: PaperTheme;
    textColorOnPrimary: string;
    day: number;
    month: number;
    year: number;
    selected: boolean;
    inRange: boolean;
    leftCrop: boolean;
    rightCrop: boolean;
    primaryColor: string;
    selectColor: string;
    isToday: boolean;
    disabled: boolean;
    onPressDate: (date: Date) => any;
}): React.JSX.Element;
declare const _default: React.MemoExoticComponent<typeof Day>;
export default _default;
//# sourceMappingURL=Day.d.ts.map