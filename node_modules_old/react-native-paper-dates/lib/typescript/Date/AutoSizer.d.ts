import * as React from 'react';
type WidthAndHeight = {
    width: number;
    height: number;
};
export default function AutoSizer({ children, }: {
    children: ({ width, height }: WidthAndHeight) => any;
}): React.JSX.Element;
export {};
//# sourceMappingURL=AutoSizer.d.ts.map