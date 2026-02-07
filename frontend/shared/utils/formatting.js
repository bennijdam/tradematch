export function truncate(value, max = 120) {
    const text = String(value || "");
    return text.length > max ? `${text.slice(0, max)}...` : text;
}
