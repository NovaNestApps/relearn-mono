export function Progress({ value }: { value: number }) {
    const clamped = Math.max(0, Math.min(100, Math.round(value)));
    return (
        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
                className="h-2 bg-gradient-to-r from-primary to-secondary transition-all"
                style={{ width: `${clamped}%` }}
            />
        </div>
    );
}
