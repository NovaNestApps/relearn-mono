import { ReactNode } from "react";
import clsx from "classnames";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={clsx("card p-5", className)}>{children}</div>;
}
