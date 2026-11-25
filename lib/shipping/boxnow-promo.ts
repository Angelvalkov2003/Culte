import { sofiaToDate } from "@/lib/time";

/**
 * Промоция: доставката до автомат BoxNow е напълно безплатна до края на януари 2027 (вкл.).
 * След този момент цената автоматично става BOXNOW_PRICE, а банерът изчезва — без cron
 * (страниците са force-dynamic и проверяват датата при всяка заявка).
 */
export const BOXNOW_FREE_UNTIL = sofiaToDate("2027-02-01", "00:00");
export const BOXNOW_FREE_LABEL = "31 януари";

export function boxnowFreeActive(now = new Date()): boolean {
  return now < BOXNOW_FREE_UNTIL;
}
