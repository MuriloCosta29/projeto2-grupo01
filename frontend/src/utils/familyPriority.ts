import type { Family } from "../types";

export function formatDate(value: string) {
  const date = value.includes("T")
    ? new Date(value)
    : new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR").format(date);
}

export function getLatestDelivery(family: Family) {
  return family.deliveries?.[0] ?? null;
}

export function getWaitingDays(family: Family) {
  const latestDelivery = getLatestDelivery(family);

  if (!latestDelivery) {
    return 999;
  }

  const deliveryDate = new Date(`${latestDelivery.delivery_date}T00:00:00`);
  const today = new Date();
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  deliveryDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return Math.max(
    0,
    Math.floor((today.getTime() - deliveryDate.getTime()) / millisecondsPerDay),
  );
}

export function getWaitingLabel(family: Family) {
  if (!getLatestDelivery(family)) {
    return "Sem entrega";
  }

  return `${getWaitingDays(family)}d`;
}

export function isSameDate(value: string, date: Date) {
  const formattedDate = date.toISOString().slice(0, 10);

  return value === formattedDate;
}
