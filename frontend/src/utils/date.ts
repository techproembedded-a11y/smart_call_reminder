export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (diffDays === 0) {
      return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      return `Tomorrow, ${timeStr}`;
    } else if (diffDays === -1) {
      return `Yesterday, ${timeStr}`;
    } else {
      return `${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}, ${timeStr}`;
    }
  } catch {
    return isoString;
  }
}

export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatRelativeDeadline(isoString: string, completed: boolean = false): { text: string; isOverdue: boolean } {
  if (completed) {
    return { text: 'Completed', isOverdue: false };
  }

  try {
    const due = new Date(isoString);
    const now = new Date();
    const diffMs = due.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / (1000 * 60));
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      // Overdue
      const absHours = Math.abs(diffHours);
      if (absHours < 1) {
        return { text: `Overdue by ${Math.abs(diffMins)}m`, isOverdue: true };
      } else if (absHours < 24) {
        return { text: `Overdue by ${absHours}h`, isOverdue: true };
      } else {
        return { text: `Overdue by ${Math.abs(diffDays)}d`, isOverdue: true };
      }
    } else {
      // In future
      if (diffHours < 1) {
        return { text: `Due in ${diffMins}m`, isOverdue: false };
      } else if (diffHours < 24) {
        return { text: `Due in ${diffHours}h`, isOverdue: false };
      } else {
        return { text: `Due in ${diffDays}d`, isOverdue: false };
      }
    }
  } catch {
    return { text: '', isOverdue: false };
  }
}

export function getLocalIsoString(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
