/**
 * What the machine can tell us, and nothing it cannot.
 *
 * `null` is a first-class answer: Firefox has neither the Battery Status API nor
 * the Network Information API, and a Chrome service worker cannot see the
 * battery at all — which is why this is measured in the *page* that hosts the
 * engine and handed to the background, not read where the policy runs.
 *
 * Every path swallows its own failure. A browser that refuses to answer must not
 * be mistaken for "on battery, nearly empty".
 */

export type DeviceState = {
  onBattery: boolean;
  batteryLevel: number | null;
  metered: boolean | null;
};

type BatteryLike = { charging: boolean; level: number };
type ConnectionLike = { type?: string; saveData?: boolean; effectiveType?: string };

export async function readDevice(): Promise<DeviceState> {
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<BatteryLike>;
    connection?: ConnectionLike;
  };

  let onBattery = false;
  let batteryLevel: number | null = null;
  let metered: boolean | null = null;

  try {
    const battery = await nav.getBattery?.();
    if (battery) {
      onBattery = !battery.charging;
      batteryLevel = Math.round(battery.level * 100);
    }
  } catch {
    // No Battery API (Firefox, and any service worker): leave `null`.
  }

  const connection = nav.connection;
  if (connection) {
    metered =
      connection.saveData === true ||
      connection.type === 'cellular' ||
      connection.effectiveType === 'slow-2g' ||
      connection.effectiveType === '2g';
  }

  return { onBattery, batteryLevel, metered };
}
